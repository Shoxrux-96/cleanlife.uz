import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { DialogModal, OptionsModal } from '../../components/dialogs';
import { MaterialReceiptModal } from '../../material-receipt';
import { Loader, Screen } from '../../components';
import { Palette, fmtMoney } from '../../theme';
import { useAppTheme } from '../../theme-context';
import {
  PRODUCTION_CATEGORY,
  formatProductionDescription,
  parseProductionDescription,
} from '../../production';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';

const fmtQty = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

const PAGE_SIZES = [10, 30, 50];

// --- Sana va vaqt (O'zbekiston vaqti) ---
const tashkentParts = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return {
    y: g('year'),
    m: g('month'),
    d: g('day'),
    h: g('hour'),
    mi: g('minute'),
  };
};
const todayIso = () => {
  const { y, m, d } = tashkentParts();
  return `${y}-${m}-${d}`;
};
const nowTashkent = () => {
  const { y, m, d, h, mi } = tashkentParts();
  return `${y}-${m}-${d} ${h}:${mi}`;
};
const monthPrefix = () => {
  const { y, m } = tashkentParts();
  return `${y}-${m}`;
};
const weekAgoIso = () => {
  const { y, m, d } = tashkentParts();
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) - 6));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '—';
  const clean = dateStr.replace('T', ' ');
  const [datePart, timePart] = clean.split(' ');
  const [y, m, d] = (datePart || '').split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y} ${(timePart || '00:00').slice(0, 5)}`;
};

type Period = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'critical' | 'warning' | 'ok';

type Receipt = {
  txId: string | number;
  productId: string | number;
  productName: string;
  productSku: string;
  imageUrl?: string;
  quantity: number;
  remainingStock: number;
  dateTime: string;
  sellingPrice: number;
  totalAmount: number;
  note?: string;
};

export const WarehouseScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<'products' | 'materials'>('products');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [products, setProducts] = useState<Rec[]>([]);
  const [materials, setMaterials] = useState<Rec[]>([]);
  const [transactions, setTransactions] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sizeOpen, setSizeOpen] = useState(false);

  // Omborga kiritish modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [receiptProductId, setReceiptProductId] = useState<string | number>('');
  const [receiptQty, setReceiptQty] = useState('50');
  const [receiptPrice, setReceiptPrice] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Zaxirani yangilash modal
  const [adjust, setAdjust] = useState<{
    id: string | number;
    name: string;
    quantity: number;
    unit: string;
  } | null>(null);
  const [adjustAction, setAdjustAction] = useState<'kirim' | 'chiqim'>('kirim');
  const [adjustAmount, setAdjustAmount] = useState('10');

  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirm?: { label: string; run: () => void };
  } | null>(null);
  const [exported, setExported] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [p, m, t] = await Promise.all([
        api.products.list(),
        api.materials.list(),
        api.transactions.list(),
      ]);
      setProducts(p);
      setMaterials(m);
      setTransactions(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.products.list(),
      api.materials.list(),
      api.transactions.list(),
    ])
      .then(([p, m, t]) => {
        if (!alive) return;
        setProducts(p);
        setMaterials(m);
        setTransactions(t);
        setError('');
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // --- Omborga kiritilgan partiyalar (API dan) ---
  const receipts = useMemo<Receipt[]>(() => {
    const out: Receipt[] = [];
    for (const tx of transactions) {
      if (str(tx, 'category') !== PRODUCTION_CATEGORY) continue;
      const info = parseProductionDescription(str(tx, 'description'));
      if (!info) continue;
      const product =
        products.find((p) => str(p, 'sku') === info.sku) ??
        products.find((p) => str(p, 'name') === info.name) ??
        null;
      const date = str(tx, 'date');
      const created = str(tx, 'created_at');
      const time = created ? created.slice(11, 16) : '00:00';
      out.push({
        txId: idOf(tx),
        productId: product ? idOf(product) : '',
        productName: product ? str(product, 'name') : info.name,
        productSku: info.sku || (product ? str(product, 'sku') : ''),
        imageUrl: product ? str(product, 'image_url') : undefined,
        quantity: info.quantity,
        remainingStock: product ? num(product, 'stock_count') : 0,
        dateTime: `${date} ${time}`,
        sellingPrice: info.unitPrice,
        totalAmount: num(tx, 'amount'),
        note: info.note,
      });
    }
    return out.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [transactions, products]);

  const todayStr = todayIso();
  const monthStr = monthPrefix();
  const weekStr = weekAgoIso();

  const filteredReceipts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return receipts.filter((r) => {
      const matchesSearch =
        !q ||
        [r.productName, r.productSku, r.dateTime, r.note || '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      if (!matchesSearch) return false;
      if (customDate) return r.dateTime.startsWith(customDate);
      if (period === 'today') return r.dateTime.startsWith(todayStr);
      if (period === 'month') return r.dateTime.startsWith(monthStr);
      if (period === 'week') return r.dateTime >= weekStr;
      return true;
    });
  }, [receipts, search, period, customDate, todayStr, monthStr, weekStr]);

  const criticalMaterials = useMemo(
    () => materials.filter((m) => num(m, 'quantity') <= num(m, 'min_threshold')),
    [materials],
  );
  const warningMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          num(m, 'quantity') > num(m, 'min_threshold') &&
          num(m, 'quantity') <= num(m, 'min_threshold') * 1.5,
      ),
    [materials],
  );

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      const matchesSearch =
        !q ||
        [str(m, 'name'), str(m, 'storage_location'), str(m, 'batch_number')]
          .join(' ')
          .toLowerCase()
          .includes(q);
      if (statusFilter === 'critical') return matchesSearch && num(m, 'quantity') <= num(m, 'min_threshold');
      if (statusFilter === 'warning')
        return (
          matchesSearch &&
          num(m, 'quantity') > num(m, 'min_threshold') &&
          num(m, 'quantity') <= num(m, 'min_threshold') * 1.5
        );
      if (statusFilter === 'ok') return matchesSearch && num(m, 'quantity') > num(m, 'min_threshold') * 1.5;
      return matchesSearch;
    });
  }, [materials, search, statusFilter]);

  const totalItems = tab === 'products' ? filteredReceipts.length : filteredMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(page, totalPages);
  const pagedReceipts = useMemo(
    () => filteredReceipts.slice((validPage - 1) * pageSize, (validPage - 1) * pageSize + pageSize),
    [filteredReceipts, validPage, pageSize],
  );
  const pagedMaterials = useMemo(
    () => filteredMaterials.slice((validPage - 1) * pageSize, (validPage - 1) * pageSize + pageSize),
    [filteredMaterials, validPage, pageSize],
  );

  // --- Statistika ---
  const todayReceipts = receipts.filter((r) => r.dateTime.startsWith(todayStr));
  const todayQty = todayReceipts.reduce((a, r) => a + r.quantity, 0);
  const todayAmount = todayReceipts.reduce((a, r) => a + r.totalAmount, 0);
  const monthReceipts = receipts.filter((r) => r.dateTime.startsWith(monthStr));
  const monthQty = monthReceipts.reduce((a, r) => a + r.quantity, 0);
  const monthAmount = monthReceipts.reduce((a, r) => a + r.totalAmount, 0);
  const totalStock = products.reduce((a, p) => a + num(p, 'stock_count'), 0);
  const totalStockWorth = products.reduce(
    (a, p) => a + num(p, 'stock_count') * num(p, 'selling_price'),
    0,
  );
  const totalMatQty = materials.reduce((a, m) => a + num(m, 'quantity'), 0);
  const totalMatWorth = materials.reduce(
    (a, m) => a + num(m, 'quantity') * num(m, 'unit_cost'),
    0,
  );

  // --- Omborga kiritish ---
  const selectedProduct = useMemo(
    () => products.find((p) => idOf(p) === receiptProductId) ?? products[0] ?? null,
    [products, receiptProductId],
  );

  const openReceipt = () => {
    const first = products[0];
    setReceiptProductId(first ? idOf(first) : '');
    setReceiptQty('50');
    setReceiptPrice(first ? String(num(first, 'selling_price')) : '0');
    setFormError('');
    setReceiptOpen(true);
  };

  const pickProduct = (p: Rec) => {
    setReceiptProductId(idOf(p));
    setReceiptPrice(String(num(p, 'selling_price')));
  };

  const saveReceipt = async () => {
    if (!selectedProduct) {
      setFormError('Tayyor mahsulot tanlanmagan.');
      return;
    }
    const qty = Math.max(1, Number(receiptQty) || 1);
    const price = Math.max(0, Number(receiptPrice) || 0);
    const total = qty * price;
    const name = str(selectedProduct, 'name');
    const sku = str(selectedProduct, 'sku');

    setSaving(true);
    setFormError('');
    try {
      await api.transactions.create({
        type: 'chiqim',
        category: PRODUCTION_CATEGORY,
        amount: total,
        payment_method: 'bank_transfer',
        date: todayIso(),
        description: formatProductionDescription({
          name,
          sku,
          quantity: qty,
          unitPrice: price,
        }),
      });
      await api.products.update(idOf(selectedProduct), {
        stock_count: num(selectedProduct, 'stock_count') + qty,
      });
      setReceiptOpen(false);
      await load(true);
      setDialog({
        title: 'Muvaffaqiyatli',
        message: `"${name}" omborga kiritildi. Yangi zaxira: ${fmtQty(
          num(selectedProduct, 'stock_count') + qty,
        )} dona`,
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const removeReceipt = (r: Receipt) => {
    setDialog({
      title: 'O‘chirish',
      message: `"${r.productName}" (${fmtQty(r.quantity)} dona) yozuvi o‘chirilsinmi?`,
      confirm: {
        label: 'O‘chirish',
        run: async () => {
          setDialog(null);
          try {
            await api.transactions.remove(r.txId);
            if (r.productId !== '') {
              const product = products.find((p) => idOf(p) === r.productId);
              if (product) {
                await api.products.update(r.productId, {
                  stock_count: Math.max(0, num(product, 'stock_count') - r.quantity),
                });
              }
            }
            await load(true);
          } catch (e) {
            setDialog({
              title: 'Xatolik',
              message: e instanceof Error ? e.message : 'O‘chirishda xatolik.',
            });
          }
        },
      },
    });
  };

  // --- Zaxirani yangilash (materiallar) ---
  const openAdjust = (m: Rec) => {
    setAdjust({
      id: idOf(m),
      name: str(m, 'name'),
      quantity: num(m, 'quantity'),
      unit: str(m, 'unit'),
    });
    setAdjustAction('kirim');
    setAdjustAmount('10');
  };

  const applyAdjust = async () => {
    if (!adjust) return;
    const material = materials.find((m) => idOf(m) === adjust.id);
    if (!material) return;
    const amount = Math.max(1, Number(adjustAmount) || 1);
    const newQty =
      adjustAction === 'kirim'
        ? num(material, 'quantity') + amount
        : Math.max(0, num(material, 'quantity') - amount);
    const min = num(material, 'min_threshold');
    const status = newQty <= min ? 'kritik' : newQty <= min * 1.5 ? 'ogohlantirish' : 'yetarli';
    try {
      await api.materials.update(adjust.id, {
        quantity: newQty,
        status,
        last_restocked: todayIso(),
      });
      setAdjust(null);
      await load(true);
    } catch (e) {
      setDialog({
        title: 'Xatolik',
        message: e instanceof Error ? e.message : 'Saqlashda xatolik.',
      });
    }
  };

  // --- Excel (CSV) eksport ---
  const exportCsv = async () => {
    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = '';
      if (tab === 'products') {
        headers = [
          '№',
          'Mahsulot Nomi',
          'Miqdori (dona)',
          'Zaxira (dona)',
          'Sana va vaqti',
          'Sotuv Narxi (so‘m)',
          'Jami summa (so‘m)',
        ];
        rows = filteredReceipts.map((r, i) => [
          String(i + 1),
          r.productName,
          String(r.quantity),
          String(r.remainingStock),
          r.dateTime,
          String(r.sellingPrice),
          String(r.totalAmount),
        ]);
        filename = `Mahsulot_Ombori_${todayIso()}.csv`;
      } else {
        headers = [
          '№',
          'Mahsulot Nomi',
          'Miqdori & Birligi',
          'Zaxira (rel qiymati)',
          'Kiritilgan Vaqti',
          'Birlik Narxi',
          'Jami Qiymat',
        ];
        rows = filteredMaterials.map((m, i) => [
          String(i + 1),
          str(m, 'name'),
          `${fmtQty(num(m, 'quantity'))} ${str(m, 'unit')}`,
          `${fmtQty(num(m, 'quantity'))} ${str(m, 'unit')}`,
          formatDateTime(str(m, 'last_restocked')),
          String(num(m, 'unit_cost')),
          String(num(m, 'quantity') * num(m, 'unit_cost')),
        ]);
        filename = `Materiallar_Ombori_${todayIso()}.csv`;
      }
      const csv =
        '\uFEFF' +
        [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: filename, message: csv });
      }
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (e) {
      setDialog({
        title: 'Xatolik',
        message: e instanceof Error ? e.message : 'Eksport qilinmadi.',
      });
    }
  };

  const pageNumbers: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - validPage) <= 1) pageNumbers.push(i);
    else if (pageNumbers[pageNumbers.length - 1] !== '...') pageNumbers.push('...');
  }

  if (loading && products.length === 0) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        {/* Sarlavha + sub-tab */}
        <View style={s.header}>
          <View style={s.headerIcon}>
            <Text style={s.headerIconText}>🏬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Omborxona &amp; Zaxira Monitoringi</Text>
            <Text style={s.headerSub}>
              Har kunlik va oylik ishlab chiqarilgan mahsulotlarni omborga kiritish
              va zaxira nazorati
            </Text>
          </View>
        </View>

        <View style={s.subTabs}>
          <TouchableOpacity
            style={[s.subTab, tab === 'products' && s.subTabActive]}
            onPress={() => {
              setTab('products');
              setPage(1);
            }}
          >
            <Text style={[s.subTabText, tab === 'products' && s.subTabTextActive]}>
              📦 Mahsulot Ombori
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.subTab, tab === 'materials' && s.subTabActive]}
            onPress={() => {
              setTab('materials');
              setPage(1);
            }}
          >
            <Text style={[s.subTabText, tab === 'materials' && s.subTabTextActive]}>
              🧱 Materiallar Ombori
            </Text>
          </TouchableOpacity>
        </View>

        {/* Statistikika */}
        {tab === 'products' ? (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <View style={s.rowBetween}>
                <Text style={s.statLabel}>Bugungi Ishlab Chiqarish (Kunlik)</Text>
                <Text style={s.statIcon}>🟢</Text>
              </View>
              <Text style={[s.statValue, { color: colors.green }]}>
                +{fmtQty(todayQty)} <Text style={s.statUnit}>dona</Text>
              </Text>
              <Text style={s.statSub}>Jami: {fmtMoney(todayAmount)}</Text>
            </View>
            <View style={s.statCard}>
              <View style={s.rowBetween}>
                <Text style={s.statLabel}>Shu Oylik Ishlab Chiqarish (Oylik)</Text>
                <Text style={s.statIcon}>🟡</Text>
              </View>
              <Text style={[s.statValue, { color: colors.gold }]}>
                +{fmtQty(monthQty)} <Text style={s.statUnit}>dona</Text>
              </Text>
              <Text style={s.statSub}>Jami: {fmtMoney(monthAmount)}</Text>
            </View>
            <View style={s.statCard}>
              <View style={s.rowBetween}>
                <Text style={s.statLabel}>Ombordagi Jami Zaxira</Text>
                <Text style={s.statIcon}>📦</Text>
              </View>
              <Text style={s.statValue}>
                {fmtQty(totalStock)} <Text style={s.statUnit}>dona</Text>
              </Text>
              <Text style={s.statSub}>Qiymati: {fmtMoney(totalStockWorth)}</Text>
            </View>
            <View style={s.statCard}>
              <View style={s.rowBetween}>
                <Text style={s.statLabel}>Mahsulot Nomenklaturasi</Text>
                <Text style={s.statIcon}>🏷️</Text>
              </View>
              <Text style={s.statValue}>
                {products.length} <Text style={s.statUnit}>xil model</Text>
              </Text>
              <Text style={s.statSub}>{receipts.length} ta partiya kiritilgan</Text>
            </View>
          </View>
        ) : (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Kirim Qilingan Materiallar Soni</Text>
              <Text style={s.statValue}>
                {materials.length} <Text style={s.statUnit}>xil tur</Text>
              </Text>
              <Text style={s.statSub}>Faol xom-ashyo nomenklaturasi</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Kirim Qilingan Jami Miqdori</Text>
              <Text style={[s.statValue, { color: colors.green }]}>
                {fmtQty(totalMatQty)} <Text style={s.statUnit}>birlik</Text>
              </Text>
              <Text style={s.statSub}>Ombordagi umumiy qoldiq</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Ombordagi Jami Qiymat</Text>
              <Text style={[s.statValue, s.statMoney, { color: colors.gold }]}>
                {fmtMoney(totalMatWorth)}
              </Text>
              <Text style={s.statSub}>
                {materials.length - criticalMaterials.length - warningMaterials.length} ta
                yetarli zaxirada
              </Text>
            </View>
            <View style={[s.statCard, s.dangerCard]}>
              <Text style={[s.statLabel, { color: colors.red }]}>
                Kritik &amp; Kamaygan Zaxira
              </Text>
              <Text style={[s.statValue, { color: colors.red }]}>
                ⚠️ {criticalMaterials.length} ta kritik, {warningMaterials.length} ta kam
              </Text>
              <Text style={[s.statSub, { color: colors.red }]}>
                Zudlik bilan xarid qilish kerak
              </Text>
            </View>
          </View>
        )}

        {/* Filtr bar */}
        <View style={s.filterCard}>
          <View style={s.searchWrap}>
            <TextInput
              value={search}
              onChangeText={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Mahsulot nomi, artikul, sana yoki izoh..."
              placeholderTextColor={colors.faint}
              style={s.searchInput}
            />
            {search ? (
              <TouchableOpacity style={s.clearBtn} onPress={() => setSearch('')}>
                <Text style={s.clearText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={s.addBtn}
            onPress={tab === 'products' ? openReceipt : () => setMaterialOpen(true)}
          >
            <Text style={s.addBtnText}>
              ＋ {tab === 'products' ? 'Mahsulot' : 'Material Kirimi'}
            </Text>
          </TouchableOpacity>

          {tab === 'products' ? (
            <>
              <View style={s.chipRow}>
                {(
                  [
                    { key: 'all', label: 'Barchasi' },
                    { key: 'today', label: 'Bugun (Kunlik)' },
                    { key: 'week', label: 'Shu hafta' },
                    { key: 'month', label: 'Shu oy (Oylik)' },
                  ] as { key: Period; label: string }[]
                ).map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.chip, period === f.key && !customDate && s.chipActive]}
                    onPress={() => {
                      setPeriod(f.key);
                      setCustomDate('');
                      setPage(1);
                    }}
                  >
                    <Text
                      style={[
                        s.chipText,
                        period === f.key && !customDate && s.chipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.dateRow}>
                <TextInput
                  value={customDate}
                  onChangeText={(v) => {
                    setCustomDate(v.trim());
                    setPeriod('all');
                    setPage(1);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.faint}
                  style={[s.dateInput, s.mono]}
                />
                {customDate ? (
                  <TouchableOpacity
                    style={s.clearDateBtn}
                    onPress={() => setCustomDate('')}
                  >
                    <Text style={s.clearText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : (
            <View style={s.chipRow}>
              {(
                [
                  { key: 'all', label: 'Barchasi' },
                  { key: 'critical', label: `Kritik qoldiqlar (${criticalMaterials.length})` },
                  { key: 'warning', label: `Kamaymoqda (${warningMaterials.length})` },
                  { key: 'ok', label: 'Yetarli' },
                ] as { key: StatusFilter; label: string }[]
              ).map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.chip, statusFilter === f.key && s.chipActive]}
                  onPress={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                >
                  <Text
                    style={[
                      s.chipText,
                      statusFilter === f.key && s.chipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={s.excelBtn} onPress={exportCsv}>
            <Text style={s.excelBtnText}>▦ Excel{exported ? ' ✓' : ''}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Jadval */}
        {totalItems === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>
              {tab === 'products'
                ? 'Ushbu parametrlar bo‘yicha mahsulot topilmadi'
                : 'Materiallar topilmadi'}
            </Text>
            {tab === 'products' ? (
              <TouchableOpacity style={s.emptyBtn} onPress={openReceipt}>
                <Text style={s.emptyBtnText}>＋ Birinchi mahsulotni kiritish</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={s.tableWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {tab === 'products' ? (
                  <>
                    <View style={s.tHead}>
                      <Text style={[s.tCell, s.tNum]}>№</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Mahsulot Nomi</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Miqdori</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Zaxira</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Sana va vaqti</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Sotuv Narxi</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Jami summa</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Amallar</Text>
                    </View>
                    {pagedReceipts.map((r, i) => (
                      <View key={String(r.txId)} style={s.tRow}>
                        <Text style={[s.tCell, s.tNum]}>
                          {(validPage - 1) * pageSize + i + 1}
                        </Text>
                        <View style={[s.tCell, s.tName]}>
                          <View style={s.nameWrap}>
                            {r.imageUrl ? (
                              <Image source={{ uri: r.imageUrl }} style={s.thumb} />
                            ) : (
                              <View style={s.thumbPh}>
                                <Text style={s.thumbPhText}>📦</Text>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={s.itemTitle} numberOfLines={1}>
                                {r.productName}
                              </Text>
                              <Text style={s.sku} numberOfLines={1}>
                                {r.productSku}
                              </Text>
                              {r.note ? (
                                <Text style={s.note} numberOfLines={1}>
                                  {r.note}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                        <Text style={[s.tCell, s.tQty]}>
                          +{fmtQty(r.quantity)} dona
                        </Text>
                        <Text style={[s.tCell, s.tStock]}>
                          {fmtQty(r.remainingStock)} dona
                        </Text>
                        <Text style={[s.tCell, s.tDate]} numberOfLines={1}>
                          {r.dateTime}
                        </Text>
                        <Text style={[s.tCell, s.tMoney]} numberOfLines={1}>
                          {fmtMoney(r.sellingPrice)}
                        </Text>
                        <Text style={[s.tCell, s.tMoney, { color: colors.gold }]} numberOfLines={1}>
                          {fmtMoney(r.totalAmount)}
                        </Text>
                        <View style={[s.tCell, s.tActions]}>
                          <TouchableOpacity
                            style={s.tActDel}
                            onPress={() => removeReceipt(r as Receipt)}
                          >
                            <Text style={s.tActDelText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <>
                    <View style={s.tHead}>
                      <Text style={[s.tCell, s.tNum]}>№</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Mahsulot Nomi</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Miqdori &amp; Birligi</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Zaxira (rel qiymati)</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Kiritilgan Vaqti</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Birlik Narxi</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Jami Qiymat</Text>
                      <Text style={[s.tCell, s.tHeadCell]}>Amallar</Text>
                    </View>
                    {pagedMaterials.map((m, i) => (
                      <View key={String(idOf(m))} style={s.tRow}>
                        <Text style={[s.tCell, s.tNum]}>
                          {(validPage - 1) * pageSize + i + 1}
                        </Text>
                        <Text style={[s.tCell, s.tName, s.itemTitle]} numberOfLines={2}>
                          {str(m, 'name')}
                        </Text>
                        <Text style={[s.tCell, s.tQty]}>
                          {fmtQty(num(m, 'quantity'))} {str(m, 'unit')}
                        </Text>
                        <Text style={[s.tCell, s.tStock]}>
                          {fmtQty(num(m, 'quantity'))} {str(m, 'unit')}
                        </Text>
                        <Text style={[s.tCell, s.tDate]} numberOfLines={1}>
                          {formatDateTime(str(m, 'last_restocked'))}
                        </Text>
                        <Text style={[s.tCell, s.tMoney]} numberOfLines={1}>
                          {fmtMoney(num(m, 'unit_cost'))}
                        </Text>
                        <Text style={[s.tCell, s.tMoney, { color: colors.gold }]} numberOfLines={1}>
                          {fmtMoney(num(m, 'quantity') * num(m, 'unit_cost'))}
                        </Text>
                        <View style={[s.tCell, s.tActions]}>
                          <TouchableOpacity
                            style={s.tActEdit}
                            onPress={() => openAdjust(m)}
                          >
                            <Text style={s.tActEditText}>✏️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Sahifalash */}
        {totalItems > 0 ? (
          <>
            <View style={s.pager}>
              <Text style={s.pagerText}>
                Ko‘rsatilmoqda:{' '}
                <Text style={s.pagerStrong}>
                  {(validPage - 1) * pageSize + 1}–
                  {Math.min(validPage * pageSize, totalItems)}
                </Text>{' '}
                / Jami: <Text style={s.pagerStrong}>{totalItems}</Text> ta qator
              </Text>
              <TouchableOpacity style={s.sizeChip} onPress={() => setSizeOpen(true)}>
                <Text style={s.sizeChipText}>{pageSize} qator</Text>
              </TouchableOpacity>
            </View>
            <View style={s.pagerNav}>
              <TouchableOpacity
                style={[s.pageBtn, validPage === 1 && s.pageBtnDisabled]}
                onPress={() => setPage(Math.max(1, validPage - 1))}
              >
                <Text style={s.pageBtnText}>‹</Text>
              </TouchableOpacity>
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <Text key={`e${i}`} style={s.pageEllipsis}>
                    ...
                  </Text>
                ) : (
                  <TouchableOpacity
                    key={p}
                    style={[s.pageBtn, p === validPage && s.pageBtnActive]}
                    onPress={() => setPage(p)}
                  >
                    <Text
                      style={[s.pageBtnText, p === validPage && s.pageBtnTextActive]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
              <TouchableOpacity
                style={[s.pageBtn, validPage === totalPages && s.pageBtnDisabled]}
                onPress={() => setPage(Math.min(totalPages, validPage + 1))}
              >
                <Text style={s.pageBtnText}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Omborga kiritish modal */}
      <Modal visible={receiptOpen} transparent animationType="slide" onRequestClose={() => setReceiptOpen(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View style={s.modalIcon}>
                <Text style={s.modalIconText}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Tayyor Mahsulotni Omborga Kiritish</Text>
                <Text style={s.modalSub}>
                  «Tayyor mahsulotlar» ro‘yxatidagi mahsulotlardan birini tanlang va
                  miqdorni kiriting
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setReceiptOpen(false)}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.label}>
                Tayyor mahsulotni tanlang <Text style={s.req}>*</Text>{' '}
                <Text style={s.hintInline}>({products.length} ta mavjud)</Text>
              </Text>

              <TouchableOpacity style={s.selectBox} onPress={() => setProductOpen(true)}>
                <Text style={s.selectText} numberOfLines={1}>
                  {selectedProduct
                    ? `${str(selectedProduct, 'name')} [${str(selectedProduct, 'sku')}]`
                    : 'Bunday mahsulot topilmadi'}
                </Text>
                <Text style={s.selectArrow}>▾</Text>
              </TouchableOpacity>

              {selectedProduct ? (
                <View style={s.previewBox}>
                  {str(selectedProduct, 'image_url') ? (
                    <Image
                      source={{ uri: str(selectedProduct, 'image_url') }}
                      style={s.previewImg}
                    />
                  ) : (
                    <View style={s.previewImgPh}>
                      <Text style={s.thumbPhText}>📦</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.sku}>{str(selectedProduct, 'sku')}</Text>
                    <Text style={s.itemTitle} numberOfLines={2}>
                      {str(selectedProduct, 'name')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.miniLabel}>Hozirgi ombor zaxirasi:</Text>
                    <Text style={[s.previewStock, { color: colors.green }]}>
                      {fmtQty(num(selectedProduct, 'stock_count'))} dona
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={s.label}>
                Ishlab Chiqarilgan Miqdor (dona) <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                style={[s.input, s.mono]}
                keyboardType="numeric"
                value={receiptQty}
                onChangeText={setReceiptQty}
                placeholder="0"
                placeholderTextColor={colors.faint}
              />

              <Text style={s.label}>
                Sotuv Narxi (so‘m) <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                style={[s.input, s.mono]}
                keyboardType="numeric"
                value={receiptPrice}
                onChangeText={setReceiptPrice}
                placeholder="0"
                placeholderTextColor={colors.faint}
              />

              <View style={s.timeBox}>
                <Text style={s.miniLabel}>Sana va vaqti:</Text>
                <Text style={[s.timeValue, { color: colors.green }]}>
                  Avtomatik (O‘zbekiston vaqti: {nowTashkent()})
                </Text>
              </View>

              <View style={s.totalBox}>
                <View style={{ flex: 1 }}>
                  <Text style={s.miniLabel}>
                    Hisoblangan Jami Summa ({receiptQty} dona ×{' '}
                    {fmtMoney(Number(receiptPrice) || 0)}):
                  </Text>
                  <Text style={s.miniLabel}>
                    Ombordagi yangi natijaviy zaxira:{' '}
                    <Text style={s.totalStrong}>
                      {fmtQty(
                        (selectedProduct ? num(selectedProduct, 'stock_count') : 0) +
                          (Number(receiptQty) || 0),
                      )}{' '}
                      dona
                    </Text>
                  </Text>
                </View>
                <Text style={[s.totalValue, { color: colors.gold }]}>
                  {fmtMoney(
                    (Number(receiptQty) || 0) * (Number(receiptPrice) || 0),
                  )}
                </Text>
              </View>

              {formError ? <Text style={s.error}>{formError}</Text> : null}

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, s.modalBtnGhost]}
                  onPress={() => setReceiptOpen(false)}
                >
                  <Text style={s.modalBtnGhostText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, s.modalBtnGold, saving && { opacity: 0.6 }]}
                  onPress={saving ? undefined : saveReceipt}
                >
                  <Text style={s.modalBtnGoldText}>
                    {saving ? 'Saqlanmoqda...' : '+ Omborga Kiritish'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mahsulot tanlash */}
      <OptionsModal
        visible={productOpen}
        title="Tayyor mahsulotni tanlang"
        value={String(receiptProductId)}
        options={products.map((p) => ({
          value: String(idOf(p)),
          label: `${str(p, 'name')} [${str(p, 'sku')}] — Ombordagi qoldiq: ${fmtQty(
            num(p, 'stock_count'),
          )} dona — Narxi: ${fmtMoney(num(p, 'selling_price'))}`,
        }))}
        colors={colors}
        onClose={() => setProductOpen(false)}
        onPick={(v) => {
          const p = products.find((x) => String(idOf(x)) === v);
          if (p) pickProduct(p);
        }}
      />

      {/* Zaxirani yangilash modal */}
      <Modal visible={!!adjust} transparent animationType="fade" onRequestClose={() => setAdjust(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View style={s.modalIcon}>
                <Text style={s.modalIconText}>📉</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Zaxirani Yangilash:</Text>
                <Text style={s.modalSub}>{adjust?.name}</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setAdjust(null)}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.modalSub}>
              Hozirgi mavjud qoldiq:{' '}
              <Text style={s.totalStrong}>
                {fmtQty(adjust?.quantity ?? 0)} {adjust?.unit}
              </Text>
            </Text>

            <View style={s.chipRow}>
              <TouchableOpacity
                style={[s.chip, adjustAction === 'kirim' && s.chipSuccess]}
                onPress={() => setAdjustAction('kirim')}
              >
                <Text
                  style={[
                    s.chipText,
                    adjustAction === 'kirim' && s.chipTextActive,
                  ]}
                >
                  + Omborga Kirim
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chip, adjustAction === 'chiqim' && s.chipDanger]}
                onPress={() => setAdjustAction('chiqim')}
              >
                <Text
                  style={[
                    s.chipText,
                    adjustAction === 'chiqim' && s.chipTextActive,
                  ]}
                >
                  - Ishlab chiqarishga Chiqim
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Miqdor ({adjust?.unit}):</Text>
            <TextInput
              style={[s.input, s.mono]}
              keyboardType="numeric"
              value={adjustAmount}
              onChangeText={setAdjustAmount}
              placeholder="1"
              placeholderTextColor={colors.faint}
            />

            <View style={s.totalBox}>
              <Text style={s.miniLabel}>Yangi natijaviy qoldiq:</Text>
              <Text style={[s.totalValue, { color: colors.gold }]}>
                {fmtQty(
                  adjustAction === 'kirim'
                    ? (adjust?.quantity ?? 0) + (Number(adjustAmount) || 0)
                    : Math.max(0, (adjust?.quantity ?? 0) - (Number(adjustAmount) || 0)),
                )}{' '}
                {adjust?.unit}
              </Text>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnGhost]}
                onPress={() => setAdjust(null)}
              >
                <Text style={s.modalBtnGhostText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnGold]} onPress={applyAdjust}>
                <Text style={s.modalBtnGoldText}>Qoldiqni Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <OptionsModal
        visible={sizeOpen}
        title="Sahifadagi qatorlar"
        value={String(pageSize)}
        options={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} qator` }))}
        colors={colors}
        onClose={() => setSizeOpen(false)}
        onPick={(v) => {
          setPageSize(Number(v));
          setPage(1);
        }}
      />

      {/* Material Kirimi — Kirim Materiallari sahifasi bilan bir xil oyna */}
      <MaterialReceiptModal
        visible={materialOpen}
        materials={materials}
        onClose={() => setMaterialOpen(false)}
        onSaved={async () => {
          await load(true);
          setDialog({
            title: 'Muvaffaqiyatli',
            message: 'Xom-ashyo omborga muvaffaqiyatli kirim qilindi!',
          });
        }}
      />

      <DialogModal data={dialog} colors={colors} onClose={() => setDialog(null)} />
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gold + '1F',
      borderWidth: 1,
      borderColor: c.gold + '44',
    },
    headerIconText: { fontSize: 20 },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
    headerSub: { color: c.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },

    subTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 4,
    },
    subTab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 9,
    },
    subTabActive: { backgroundColor: c.gold },
    subTabText: { color: c.muted, fontSize: 12, fontWeight: '800' },
    subTabTextActive: { color: '#000', fontWeight: '900' },

    statsRow: { gap: 8, marginBottom: 12 },
    statCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    dangerCard: { backgroundColor: c.red + '12', borderColor: c.red + '44' },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    statLabel: { color: c.muted, fontSize: 11, fontWeight: '700', flex: 1 },
    statIcon: { fontSize: 13 },
    statValue: { color: c.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
    statMoney: { fontSize: 16 },
    statUnit: { color: c.muted, fontSize: 11, fontWeight: '700' },
    statSub: { color: c.text, fontSize: 11, fontWeight: '700', marginTop: 2 },

    filterCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
      gap: 10,
    },
    searchWrap: { flexDirection: 'row', alignItems: 'center' },
    searchInput: {
      flex: 1,
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    clearBtn: { position: 'absolute', right: 10, padding: 6 },
    clearText: { color: c.muted, fontSize: 13, fontWeight: '700' },
    addBtn: {
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: c.gold,
    },
    addBtnText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chipActive: { backgroundColor: c.gold, borderColor: c.gold },
    chipSuccess: { backgroundColor: c.green, borderColor: c.green },
    chipDanger: { backgroundColor: c.red, borderColor: c.red },
    chipText: { color: c.text, fontSize: 11, fontWeight: '800' },
    chipTextActive: { color: '#000', fontWeight: '900' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateInput: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 12,
    },
    clearDateBtn: { padding: 6 },
    excelBtn: {
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: c.green,
    },
    excelBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },

    error: { color: c.red, fontSize: 13, marginBottom: 8 },

    emptyBox: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    emptyIcon: { fontSize: 30 },
    emptyTitle: { color: c.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    emptyBtn: {
      marginTop: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 11,
      backgroundColor: c.gold,
    },
    emptyBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },

    tableWrap: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
    },
    tHead: {
      flexDirection: 'row',
      backgroundColor: c.input,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
      paddingVertical: 10,
    },
    tHeadCell: { color: c.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    tRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
      paddingVertical: 10,
    },
    tCell: { color: c.text, fontSize: 11, fontWeight: '700', paddingHorizontal: 6 },
    tNum: { width: 30, color: c.muted, fontWeight: '800' },
    tName: { width: 190 },
    nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tQty: { width: 92, color: c.green, fontWeight: '900' },
    tStock: { width: 82, fontWeight: '800' },
    tDate: { width: 118, color: c.muted, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    tMoney: { width: 104, fontWeight: '800' },
    tActions: { width: 54, flexDirection: 'row' },
    thumb: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: c.cardBorder },
    thumbPh: {
      width: 34,
      height: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.gold + '55',
      backgroundColor: c.gold + '1A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbPhText: { fontSize: 15 },
    itemTitle: { color: c.text, fontSize: 13, fontWeight: '800' },
    sku: { color: c.gold, fontSize: 10, fontWeight: '800', marginTop: 2 },
    note: { color: c.muted, fontSize: 10, marginTop: 2 },
    tActDel: {
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.red + '66',
    },
    tActDelText: { fontSize: 12 },
    tActEdit: {
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tActEditText: { fontSize: 12 },

    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 10,
    },
    pagerText: { color: c.muted, fontSize: 12, fontWeight: '700' },
    pagerStrong: { color: c.text, fontWeight: '900' },
    sizeChip: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    sizeChipText: { color: c.text, fontSize: 11, fontWeight: '800' },
    pagerNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    pageBtn: {
      minWidth: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    pageBtnActive: { backgroundColor: c.gold, borderColor: c.gold },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { color: c.text, fontSize: 15, fontWeight: '800' },
    pageBtnTextActive: { color: '#000', fontWeight: '900' },
    pageEllipsis: { color: c.muted, fontSize: 13, paddingHorizontal: 4 },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: c.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderColor: c.cardBorder,
      borderWidth: 1,
      padding: 16,
      maxHeight: '92%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 12,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    modalIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '4D',
    },
    modalIconText: { fontSize: 18 },
    modalTitle: { color: c.text, fontSize: 16, fontWeight: '900' },
    modalSub: { color: c.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    closeText: { color: c.text, fontSize: 14, fontWeight: '800' },

    label: {
      color: c.muted,
      fontSize: 11,
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    hintInline: { color: c.faint, fontSize: 10, textTransform: 'none', letterSpacing: 0 },
    req: { color: c.red, fontWeight: '900' },
    input: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
    },
    mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    selectBox: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectText: { color: c.text, fontSize: 13, fontWeight: '700', flex: 1 },
    selectArrow: { color: c.muted, fontSize: 13 },
    previewBox: {
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      backgroundColor: c.gold + '12',
      borderWidth: 1,
      borderColor: c.gold + '44',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    previewImg: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder },
    previewImgPh: {
      width: 48,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.gold + '55',
      backgroundColor: c.gold + '1A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewStock: { fontSize: 12, fontWeight: '900' },
    miniLabel: { color: c.muted, fontSize: 11, lineHeight: 17 },
    timeBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    timeValue: { fontSize: 12, fontWeight: '900', marginTop: 2 },
    totalBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.gold + '12',
      borderWidth: 1,
      borderColor: c.gold + '44',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    totalStrong: { color: c.text, fontWeight: '900' },
    totalValue: { fontSize: 15, fontWeight: '900' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
    modalBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    modalBtnGhost: { borderColor: c.cardBorder },
    modalBtnGhostText: { color: c.text, fontSize: 13, fontWeight: '800' },
    modalBtnGold: { backgroundColor: c.gold, borderColor: c.gold },
    modalBtnGoldText: { color: '#000', fontSize: 13, fontWeight: '900' },
  });
