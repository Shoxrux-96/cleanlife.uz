import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { DialogModal, OptionsModal } from '../../components/dialogs';
import { Empty, Loader, Screen } from '../../components';
import { Palette, fmtMoney } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';

// --- Web sahifasi (ProductionProductsTab) bilan BIR XIL variantlar ---
const PAGE_SIZES = [10, 30, 50];

const CATEGORY_LABELS: Record<string, string> = {
  kiyimlar: 'Kiyimlar',
  stol: 'Stol',
  qadoq: 'Qadoq',
  aksessuar: 'Aksessuar',
  toqimachilik: 'Toqimachilik',
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80';

const fmtQty = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

const tashkent = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return { y: g('year'), m: g('month'), d: g('day') };
};
const todayIso = () => {
  const { y, m, d } = tashkent();
  return `${y}-${m}-${d}`;
};

type FormState = {
  name: string;
  imageUrl: string;
  baseCost: string;
  sellingPrice: string;
  stockCount: string;
  specification: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  imageUrl: '',
  baseCost: '35000',
  sellingPrice: '85000',
  stockCount: '150',
  specification:
    '100% paxta kanvas, yuqori sifatli korporativ bichim, mashina kashtasi',
};

const totalCostOf = (p: Rec) =>
  num(p, 'base_cost') +
  num(p, 'branding_cost') +
  num(p, 'packaging_cost') +
  num(p, 'labor_cost');

export const ReadyProductsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [products, setProducts] = useState<Rec[]>([]);
  const [materials, setMaterials] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sizeOpen, setSizeOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirm?: { label: string; run: () => void };
  } | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const rows = await api.products.list();
      setProducts(rows);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([api.products.list(), api.materials.list()])
      .then(([rows, mats]) => {
        if (!alive) return;
        setProducts(rows);
        setMaterials(mats);
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

  // --- Web bilan bir xil qidiruv (ism, SKU, toifa, texnika) ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [str(p, 'name'), str(p, 'sku'), str(p, 'category'), str(p, 'technique')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [products, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(page, totalPages);
  const paged = useMemo(
    () =>
      filtered.slice(
        (validPage - 1) * pageSize,
        (validPage - 1) * pageSize + pageSize,
      ),
    [filtered, validPage, pageSize],
  );

  const totalStock = products.reduce((acc, p) => acc + num(p, 'stock_count'), 0);
  const totalStockWorth = products.reduce(
    (acc, p) => acc + num(p, 'stock_count') * num(p, 'selling_price'),
    0,
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (p: Rec) => {
    setEditing(p);
    setForm({
      name: str(p, 'name'),
      imageUrl: str(p, 'image_url'),
      baseCost: String(num(p, 'base_cost')),
      sellingPrice: String(num(p, 'selling_price')),
      stockCount: String(num(p, 'stock_count')),
      specification: str(p, 'specification') || str(p, 'technique'),
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setFormError('');
  };

  const pickImageFile = () => {
    // Fayl tanlash faqat brauzerda (web) ishlaydi
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () =>
        setForm((f) => ({ ...f, imageUrl: String(reader.result || '') }));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError('Mahsulot nomini kiriting.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const baseCost = Number(form.baseCost) || 0;
      const sellingPrice = Number(form.sellingPrice) || 0;
      const stockCount = Number(form.stockCount) || 0;
      const spec = form.specification.trim();

      if (editing) {
        await api.products.update(idOf(editing), {
          name,
          image_url: form.imageUrl || str(editing, 'image_url'),
          base_cost: baseCost,
          selling_price: sellingPrice,
          stock_count: stockCount,
          specification: spec,
          technique: spec,
        });
        closeModal();
        await load(true);
        setDialog({
          title: 'Muvaffaqiyatli',
          message: 'Tayyor mahsulot yangilandi.',
        });
      } else {
        const sku = `HRC-${Math.floor(100 + Math.random() * 900)}`;
        const batchNumber = `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`;
        const defaultBom = materials.slice(0, 2).map((m) => ({
          material_id: idOf(m),
          material_name: str(m, 'name'),
          quantity_needed: 1,
          unit: str(m, 'unit') || 'dona',
          unit_cost: num(m, 'unit_cost'),
          total_cost: num(m, 'unit_cost'),
        }));

        await api.products.create({
          name,
          image_url: form.imageUrl || DEFAULT_IMAGE,
          category: 'kiyimlar',
          sku,
          base_cost: baseCost,
          branding_cost: 0,
          packaging_cost: 0,
          labor_cost: 0,
          selling_price: sellingPrice,
          min_order: 1,
          stock_count: stockCount,
          sold_count: 0,
          technique: spec || 'Mashina kashtasi yoki UV bosma',
          specification: spec || 'Yuqori sifatli korporativ tayyor mahsulot',
          ready_date: todayIso(),
          batch_number: batchNumber,
          bom: defaultBom,
        });

        // Moliyaviy hisobga CHIQIM yozish (web bilan bir xil)
        const amount = Math.round(baseCost * stockCount);
        try {
          await api.transactions.create({
            type: 'chiqim',
            category: 'Mahsulot ishlab chiqarish',
            amount: amount > 0 ? amount : baseCost,
            payment_method: 'bank_transfer',
            date: todayIso(),
            description: `Tayyor mahsulot: ${name} — ${stockCount} dona × ${Math.round(
              baseCost,
            )} so'm (SKU: ${sku})`,
          });
        } catch {
          /* moliyaviy yozuv yarata olmasa ham mahsulot saqlanadi */
        }

        closeModal();
        await load(true);
        setDialog({
          title: 'Muvaffaqiyatli',
          message: 'Yangi tayyor mahsulot katalogga qo‘shildi!',
        });
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (p: Rec) => {
    const name = str(p, 'name') || 'mahsulot';
    setDialog({
      title: 'O‘chirish',
      message: `"${name}" katalogdan o‘chirilsinmi?`,
      confirm: {
        label: 'O‘chirish',
        run: async () => {
          setDialog(null);
          try {
            await api.products.remove(idOf(p));
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

  const renderRow = (p: Rec, idx: number) => {
    const cost = totalCostOf(p);
    const price = num(p, 'selling_price');
    const profit = price - cost;
    const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0.0';
    const img = str(p, 'image_url');
    const cat = str(p, 'category');

    if (view === 'cards') {
      return (
        <View key={String(idOf(p))} style={s.card}>
          <View style={s.cardTop}>
            {img ? (
              <Image source={{ uri: img }} style={s.cardImg} />
            ) : (
              <View style={s.cardImgPh}>
                <Text style={s.cardImgPhText}>📦</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={s.cardSkuRow}>
                <Text style={s.sku}>{str(p, 'sku')}</Text>
                <Text style={s.catChip}>
                  {CATEGORY_LABELS[cat] || cat || '—'}
                </Text>
              </View>
              <Text style={s.itemTitle} numberOfLines={2}>
                {str(p, 'name')}
              </Text>
            </View>
          </View>

          {str(p, 'specification') ? (
            <Text style={s.spec} numberOfLines={3}>
              {str(p, 'specification')}
            </Text>
          ) : null}

          <View style={s.miniBox}>
            <View style={s.miniRow}>
              <Text style={s.miniLabel}>Material Xarajati:</Text>
              <Text style={s.miniValue}>{fmtMoney(num(p, 'base_cost'))}</Text>
            </View>
            <View style={s.miniRow}>
              <Text style={s.miniLabel}>Sotuv Narxi:</Text>
              <Text style={[s.miniValue, { color: colors.gold }]}>
                {fmtMoney(price)}
              </Text>
            </View>
            <View style={[s.miniRow, s.miniRowLast]}>
              <Text style={s.miniLabel}>Sof Marja (Foyda):</Text>
              <Text style={[s.miniValue, { color: colors.green }]}>
                +{fmtMoney(profit)} ({margin}%)
              </Text>
            </View>
          </View>

          <View style={s.stockRow}>
            <Text style={s.miniLabel}>Ombordagi Zaxira:</Text>
            <Text style={s.stockValue}>
              {fmtQty(num(p, 'stock_count'))} dona
            </Text>
          </View>

          <View style={s.cardActions}>
            <TouchableOpacity
              style={s.smallBtn}
              onPress={() =>
                navigation.navigate('Calculator', { productId: idOf(p) })
              }
            >
              <Text style={s.smallBtnText}>🧮 Kalkulyator</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.smallBtn, s.editBtn]} onPress={() => openEdit(p)}>
              <Text style={[s.smallBtnText, { color: colors.gold }]}>✏️ Tahrirlash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.smallBtn, s.delBtn]} onPress={() => remove(p)}>
              <Text style={[s.smallBtnText, { color: colors.red }]}>🗑️ O‘chirish</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Jadval ko'rinishi
    return (
      <View key={String(idOf(p))} style={s.tRow}>
        <Text style={[s.tCell, s.tNum]}>{idx + 1}</Text>
        <View style={s.tCellImg}>
          {img ? (
            <Image source={{ uri: img }} style={s.thumb} />
          ) : (
            <View style={s.thumbPh}>
              <Text style={s.thumbPhText}>📦</Text>
            </View>
          )}
        </View>
        <View style={[s.tCell, s.tName]}>
          <Text style={s.itemTitle} numberOfLines={1}>
            {str(p, 'name')}
          </Text>
          <Text style={s.sku} numberOfLines={1}>
            {str(p, 'sku')}
          </Text>
        </View>
        <Text style={[s.tCell, s.tCat]} numberOfLines={1}>
          {CATEGORY_LABELS[cat] || cat || '—'}
        </Text>
        <Text style={[s.tCell, s.tMoney]} numberOfLines={1}>
          {fmtMoney(cost)}
        </Text>
        <Text style={[s.tCell, s.tMoney, { color: colors.gold }]} numberOfLines={1}>
          {fmtMoney(price)}
        </Text>
        <Text style={[s.tCell, s.tMargin, { color: colors.green }]} numberOfLines={1}>
          +{margin}%
        </Text>
        <Text style={[s.tCell, s.tStock]} numberOfLines={1}>
          {fmtQty(num(p, 'stock_count'))} dona
        </Text>
        <View style={[s.tCell, s.tActions]}>
          <TouchableOpacity style={s.tActBtn} onPress={() => openEdit(p)}>
            <Text style={s.tActText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tActBtn, s.tActDel]} onPress={() => remove(p)}>
            <Text style={s.tActDelText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem = Math.min(validPage * pageSize, totalItems);
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
        {/* Sarlavha */}
        <View style={s.header}>
          <View style={s.headerIcon}>
            <Text style={s.headerIconText}>🏷️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Tayyor Mahsulotlar</Text>
            <Text style={s.headerSub}>
              Materiallardan ishlab chiqarilgan tayyor mahsulotlar ro‘yxati va
              tannarx hisob-kitobi
            </Text>
          </View>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>＋ Mahsulot Qo‘shish</Text>
        </TouchableOpacity>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* 3 ta statistik karta */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Tayyor Mahsulot Modellari</Text>
            <Text style={s.statValue}>{products.length}</Text>
            <Text style={s.statUnit}>xil nomenklatura</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Ombordagi Tayyor Mahsulot</Text>
            <Text style={[s.statValue, { color: colors.green }]}>
              {fmtQty(totalStock)}
            </Text>
            <Text style={s.statUnit}>dona</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Tayyor Zaxira Savdo Qiymati</Text>
            <Text style={[s.statValue, s.statMoney, { color: colors.gold }]}>
              {fmtMoney(totalStockWorth)}
            </Text>
            <Text style={s.statUnit}>savdo qiymati</Text>
          </View>
        </View>

        {/* Qidirish + ko'rinish */}
        <View style={s.filterCard}>
          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              placeholder="Mahsulot nomi, SKU yoki toifa bo‘yicha qidirish..."
              placeholderTextColor={colors.faint}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity style={s.clearBtn} onPress={() => setSearch('')}>
                <Text style={s.clearText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, view === 'table' && s.toggleActive]}
              onPress={() => setView('table')}
            >
              <Text
                style={[s.toggleText, view === 'table' && s.toggleTextActive]}
              >
                Jadval
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, view === 'cards' && s.toggleActive]}
              onPress={() => setView('cards')}
            >
              <Text
                style={[s.toggleText, view === 'cards' && s.toggleTextActive]}
              >
                Kartochka
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ro'yxat */}
        {totalItems === 0 ? (
          <Empty text="Mahsulot topilmadi" />
        ) : view === 'table' ? (
          <View style={s.tableWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={s.tHead}>
                  <Text style={[s.tCell, s.tNum]}>#</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Rasm</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Mahsulot</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Toifa</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Tannarx</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Sotuv Narxi</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Marja</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Zaxira</Text>
                  <Text style={[s.tCell, s.tHeadCell]}>Amallar</Text>
                </View>
                {paged.map((p, i) => renderRow(p, (validPage - 1) * pageSize + i))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View>{paged.map((p, i) => renderRow(p, (validPage - 1) * pageSize + i))}</View>
        )}

        {/* Sahifalash */}
        {totalItems > 0 ? (
          <View style={s.pager}>
            <Text style={s.pagerText}>
              Ko‘rsatilmoqda:{' '}
              <Text style={s.pagerStrong}>
                {startItem}-{endItem}
              </Text>{' '}
              / Jami:{' '}
              <Text style={s.pagerStrong}>{totalItems}</Text> ta qator
            </Text>
            <TouchableOpacity
              style={s.sizeChip}
              onPress={() => setSizeOpen(true)}
            >
              <Text style={s.sizeChipText}>{pageSize} qator</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {totalItems > 0 ? (
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
              style={[
                s.pageBtn,
                validPage === totalPages && s.pageBtnDisabled,
              ]}
              onPress={() => setPage(Math.min(totalPages, validPage + 1))}
            >
              <Text style={s.pageBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Qo'shish / Tahrirlash oynasi */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View style={s.modalIcon}>
                <Text style={s.modalIconText}>🏷️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>
                  {editing
                    ? 'Tayyor Mahsulotni Tahrirlash'
                    : 'Yangi Tayyor Mahsulot Qo‘shish'}
                </Text>
                <Text style={s.modalSub}>
                  Mahsulot nomi, xarajat, sotuv narxi, ombor zaxirasi va
                  spetsifikatsiyasi
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={closeModal}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.label}>
                Mahsulot Nomi <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                placeholder="Masalan: Restoran Kanvas Fartugi (Charm tasmali)"
                placeholderTextColor={colors.faint}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />

              <Text style={s.label}>Mahsulot Logosi yoki Rasmi</Text>
              <View style={s.imgBox}>
                {form.imageUrl ? (
                  <Image
                    source={{ uri: form.imageUrl }}
                    style={s.imgPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={s.imgPlaceholder}>
                    <Text style={s.imgPhText}>🖼️</Text>
                    <Text style={s.imgPhLabel}>Rasm yo‘q</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={s.imgBtnRow}>
                    {Platform.OS === 'web' ? (
                      <TouchableOpacity style={s.imgBtn} onPress={pickImageFile}>
                        <Text style={s.imgBtnText}>📁 Fayldan rasm yuklash</Text>
                      </TouchableOpacity>
                    ) : null}
                    {form.imageUrl ? (
                      <TouchableOpacity
                        style={s.imgBtn}
                        onPress={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                      >
                        <Text style={s.imgBtnText}>Tozalash</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TextInput
                    style={[s.input, s.urlInput]}
                    placeholder="yoki rasm / logo URL manzilini kiriting..."
                    placeholderTextColor={colors.faint}
                    value={form.imageUrl}
                    onChangeText={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
                  />
                </View>
              </View>

              <Text style={s.label}>Material Xarajati (so‘m)</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="35000"
                placeholderTextColor={colors.faint}
                value={form.baseCost}
                onChangeText={(v) => setForm((f) => ({ ...f, baseCost: v }))}
              />

              <Text style={s.label}>
                Sotuv Narxi (so‘m) <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="85000"
                placeholderTextColor={colors.faint}
                value={form.sellingPrice}
                onChangeText={(v) => setForm((f) => ({ ...f, sellingPrice: v }))}
              />

              <Text style={s.label}>Ombordagi Zaxira (dona)</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                placeholder="150"
                placeholderTextColor={colors.faint}
                value={form.stockCount}
                onChangeText={(v) => setForm((f) => ({ ...f, stockCount: v }))}
              />

              <Text style={s.label}>
                Spetsifikatsiya va Ishlab chiqarish texnikasi
              </Text>
              <TextInput
                style={[s.input, s.textarea]}
                multiline
                placeholder="Masalan: 100% paxta kanvas, yuqori sifatli korporativ bichim, mashina kashtasi yoki UV bosma"
                placeholderTextColor={colors.faint}
                value={form.specification}
                onChangeText={(v) => setForm((f) => ({ ...f, specification: v }))}
              />

              {formError ? <Text style={s.error}>{formError}</Text> : null}

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, s.modalBtnGhost]}
                  onPress={closeModal}
                >
                  <Text style={s.modalBtnGhostText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, s.modalBtnGold, saving && { opacity: 0.6 }]}
                  onPress={saving ? undefined : save}
                >
                  <Text style={s.modalBtnGoldText}>
                    {saving
                      ? 'Saqlanmoqda...'
                      : editing
                        ? 'O‘zgarishlarni Saqlash'
                        : 'Mahsulotni Saqlash'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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

      <DialogModal
        data={dialog}
        colors={colors}
        onClose={() => setDialog(null)}
      />
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
    headerTitle: { color: c.text, fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
    headerSub: { color: c.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },

    addBtn: {
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.gold,
      marginBottom: 12,
    },
    addBtnText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },

    error: { color: c.red, fontSize: 13, marginBottom: 8 },

    statsRow: { gap: 8, marginBottom: 12 },
    statCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    statLabel: { color: c.muted, fontSize: 11, fontWeight: '700' },
    statValue: { color: c.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
    statMoney: { fontSize: 17 },
    statUnit: { color: c.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },

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
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    toggleActive: { backgroundColor: c.gold, borderColor: c.gold },
    toggleText: { color: c.text, fontSize: 12, fontWeight: '800' },
    toggleTextActive: { color: '#000', fontWeight: '900' },

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
    tHeadCell: { color: c.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
    tRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
      paddingVertical: 10,
    },
    tCell: {
      color: c.text,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 6,
    },
    tNum: { width: 30, color: c.muted, fontWeight: '800' },
    tCellImg: { width: 46, alignItems: 'center', justifyContent: 'center' },
    tName: { width: 150 },
    tCat: { width: 86, color: c.muted },
    tMoney: { width: 104, fontWeight: '800' },
    tMargin: { width: 56, fontWeight: '900' },
    tStock: { width: 74, fontWeight: '800' },
    tActions: { width: 84, flexDirection: 'row', gap: 6 },
    thumb: {
      width: 34,
      height: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
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
    catChip: {
      color: c.text,
      fontSize: 10,
      fontWeight: '700',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
      marginLeft: 6,
    },
    tActBtn: {
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tActDel: { borderColor: c.red + '66' },
    tActText: { fontSize: 12 },
    tActDelText: { fontSize: 12 },

    card: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', gap: 12 },
    cardImg: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    cardImgPh: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.gold + '55',
      backgroundColor: c.gold + '1A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardImgPhText: { fontSize: 22 },
    cardSkuRow: { flexDirection: 'row', alignItems: 'center' },
    spec: { color: c.muted, fontSize: 12, lineHeight: 17, marginTop: 10 },
    miniBox: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      gap: 6,
    },
    miniRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    miniRowLast: { borderTopWidth: 1, borderTopColor: c.cardBorder, paddingTop: 6 },
    miniLabel: { color: c.muted, fontSize: 12 },
    miniValue: { color: c.text, fontSize: 12, fontWeight: '800', flexShrink: 1 },
    stockRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    stockValue: { color: c.text, fontSize: 13, fontWeight: '900' },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    smallBtn: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    smallBtnText: { color: c.text, fontSize: 11, fontWeight: '800' },
    editBtn: { borderColor: c.gold + '55' },
    delBtn: { borderColor: c.red + '55' },

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
    textarea: { minHeight: 84, textAlignVertical: 'top' },
    urlInput: { marginTop: 8, fontSize: 12 },
    imgBox: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      gap: 12,
    },
    imgPreview: {
      width: 64,
      height: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    imgPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imgPhText: { fontSize: 20 },
    imgPhLabel: { color: c.muted, fontSize: 9, fontWeight: '800', marginTop: 2 },
    imgBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    imgBtn: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.gold + '4D',
      backgroundColor: c.gold + '1A',
    },
    imgBtnText: { color: c.gold, fontSize: 11, fontWeight: '800' },

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
