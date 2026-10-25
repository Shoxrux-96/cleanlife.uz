import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Card, Empty, Loader, Screen } from '../../components';
import { DialogModal, OptionsModal } from '../../components/dialogs';
import { MaterialReceiptModal, UNITS, UNIT_LABELS } from '../../material-receipt';
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

// --- Web sahifasi bilan BIR XIL variantlar ---
const SORTS = [
  { value: 'date_desc', label: 'Eng yangi kirimlar' },
  { value: 'date_asc', label: 'Eng eski kirimlar' },
  { value: 'qty_desc', label: 'Miqdor: Ko‘pdan kamga' },
  { value: 'qty_asc', label: 'Miqdor: Kamdan ko‘pga' },
  { value: 'name_asc', label: 'Nomi bo‘yicha (A-Z)' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Barcha holatlar' },
  { value: 'yetarli', label: '🧱 Yetarli' },
  { value: 'ogohlantirish', label: '🧸 Ogohlantirish' },
  { value: 'kritik', label: '🔴 Kritik kam' },
];

const PAGE_SIZES = [10, 30, 50];
type SortKey = 'date_desc' | 'date_asc' | 'qty_desc' | 'qty_asc' | 'name_asc';

// --- Vaqt (O'zbekiston vaqti, web bilan bir xil) ---
const tashkent = () => {
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
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour'), mi: g('minute') };
};
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '—';
  const parts = dateStr.replace('T', ' ').split(' ');
  const [y, m, d] = parts[0].split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y} ${(parts[1] || '09:00').slice(0, 5)}`;
};
const todayIso = () => {
  const { y, m, d } = tashkent();
  return `${y}-${m}-${d}`;
};

const computeStatus = (qty: number, min: number): string =>
  qty <= min ? 'kritik' : qty <= min * 1.5 ? 'ogohlantirish' : 'yetarli';

const fmtQty = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

export const MaterialIntakeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [materials, setMaterials] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filtrlar
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [unitOpen, setUnitOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [exported, setExported] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirm?: { label: string; run: () => void };
  } | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const rows = await api.materials.list();
      setMaterials(rows);
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
    api.materials
      .list()
      .then((rows) => {
        if (alive) {
          setMaterials(rows);
          setError('');
        }
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

  // --- Web bilan bir xil filtr + saralash ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = materials.filter((r) => {
      const matchesSearch =
        !q ||
        [
          str(r, 'name'),
          str(r, 'batch_number'),
          str(r, 'supplier'),
          str(r, 'counterparty'),
          str(r, 'payment_method'),
          str(r, 'storage_location'),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      const matchesUnit = unitFilter === 'all' || str(r, 'unit') === unitFilter;
      const matchesStatus = statusFilter === 'all' || str(r, 'status') === statusFilter;
      return matchesSearch && matchesUnit && matchesStatus;
    });
    const sorted = [...rows];
    if (sortBy === 'date_desc') sorted.sort((a, b) => str(b, 'last_restocked').localeCompare(str(a, 'last_restocked')));
    else if (sortBy === 'date_asc') sorted.sort((a, b) => str(a, 'last_restocked').localeCompare(str(b, 'last_restocked')));
    else if (sortBy === 'qty_desc') sorted.sort((a, b) => num(b, 'quantity') - num(a, 'quantity'));
    else if (sortBy === 'qty_asc') sorted.sort((a, b) => num(a, 'quantity') - num(b, 'quantity'));
    else sorted.sort((a, b) => str(a, 'name').localeCompare(str(b, 'name')));
    return sorted;
  }, [materials, search, unitFilter, statusFilter, sortBy]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((validPage - 1) * pageSize, (validPage - 1) * pageSize + pageSize),
    [filtered, validPage, pageSize],
  );

  const totalValue = materials.reduce((acc, m) => acc + num(m, 'quantity') * num(m, 'unit_cost'), 0);
  const lowStockCount = materials.filter((m) => num(m, 'quantity') <= num(m, 'min_threshold')).length;
  const isFiltered = search !== '' || unitFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setUnitFilter('all');
    setStatusFilter('all');
    setSortBy('date_desc');
    setPage(1);
  };

  // --- Modal boshqaruvi (web MaterialReceiptModal bilan bir xil) ---
  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setModalOpen(true);
  };

  const remove = (r: Rec) => {
    const name = str(r, 'name') || 'material';
    setDialog({
      title: 'O‘chirish',
      message: `"${name}" o‘chirilsinmi?`,
      confirm: {
        label: 'O‘chirish',
        run: async () => {
          setDialog(null);
          try {
            await api.materials.remove(idOf(r));
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

  // --- Excel (CSV) eksport ---
  const exportCsv = async () => {
    try {
      const headers = [
        '№',
        'Material / Mahsulot Nomi',
        'Kontragent / Mijoz',
        'To‘lov Usuli',
        'O‘lchov Birligi',
        'Miqdori',
        'Kiritilgan Sana va Vaqt',
        'Birlik Narxi (so‘m)',
        'Jami Qiymati (so‘m)',
        'Zaxira Holati',
      ];
      const rows = filtered.map((m, i) => [
        i + 1,
        `"${str(m, 'name').replace(/"/g, '""')}"`,
        `"${(str(m, 'counterparty') || str(m, 'supplier') || '—').replace(/"/g, '""')}"`,
        `"${(str(m, 'payment_method') || 'Bank hisob raqami').replace(/"/g, '""')}"`,
        `"${str(m, 'unit')}"`,
        num(m, 'quantity'),
        `"${formatDateTime(str(m, 'last_restocked'))}"`,
        num(m, 'unit_cost'),
        num(m, 'quantity') * num(m, 'unit_cost'),
        `"${
          computeStatus(num(m, 'quantity'), num(m, 'min_threshold')) === 'yetarli'
            ? 'Yetarli'
            : computeStatus(num(m, 'quantity'), num(m, 'min_threshold')) === 'ogohlantirish'
              ? 'Ogohlantirish'
              : 'Kritik kam'
        }"`,
      ]);
      const csv =
        '\uFEFF' +
        [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
      const filename = `Kirim_Materiallari_Xom_Ashyo_${todayIso()}.csv`;

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
      setDialog({ title: 'Xatolik', message: e instanceof Error ? e.message : 'Eksport qilinmadi.' });
    }
  };

  const statusBadge = (m: Rec) => {
    const st = computeStatus(num(m, 'quantity'), num(m, 'min_threshold'));
    if (st === 'kritik') return { text: 'Kritik kam', color: colors.red };
    if (st === 'ogohlantirish') return { text: 'Kam qoldi', color: colors.gold };
    return { text: 'Yetarli', color: colors.green };
  };

  const dotColor = (m: Rec) => {
    const st = computeStatus(num(m, 'quantity'), num(m, 'min_threshold'));
    if (st === 'kritik') return colors.red;
    if (st === 'ogohlantirish') return colors.gold;
    return colors.green;
  };

  const renderRow = ({ item, index }: { item: Rec; index: number }) => {
    const critical = num(item, 'quantity') <= num(item, 'min_threshold');
    const badge = statusBadge(item);
    return (
      <Card>
        <View style={s.rowBetween}>
          <View style={s.rowCenter}>
            <View style={s.indexBadge}>
              <Text style={s.indexText}>{(validPage - 1) * pageSize + index + 1}</Text>
            </View>
            <View style={[s.dot, { backgroundColor: dotColor(item) }]} />
            <Text style={s.itemTitle} numberOfLines={2}>
              {str(item, 'name') || '—'}
            </Text>
          </View>
          <View style={s.rowCenter}>
            <TouchableOpacity style={[s.iconBtn, s.editBtn]} onPress={() => openEdit(item)}>
              <Text style={s.editText}>Tahrirlash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconBtn, s.delBtn]} onPress={() => remove(item)}>
              <Text style={s.delText}>O‘chirish</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.metaLine}>
          <Text style={s.metaLabel}>Kontragent: </Text>
          {str(item, 'counterparty') || str(item, 'supplier') || '—'}
        </Text>
        <Text style={s.chip}>
          {str(item, 'payment_method') || 'Bank hisob raqami'}
        </Text>

        <View style={s.rowBetween}>
          <View style={s.rowCenter}>
            <Text style={s.qty}>{fmtQty(num(item, 'quantity'))}</Text>
            <Text style={s.unitChip}>{str(item, 'unit')}</Text>
          </View>
          <Text style={s.clock}>{formatDateTime(str(item, 'last_restocked'))}</Text>
        </View>
        {critical ? (
          <Text style={s.minLine}>
            Min: {fmtQty(num(item, 'min_threshold'))} {str(item, 'unit')}
          </Text>
        ) : null}

        <View style={s.moneyRow}>
          <Text style={s.moneyLabel}>Birlik narxi</Text>
          <Text style={s.moneyValue}>{fmtMoney(num(item, 'unit_cost'))}</Text>
        </View>
        <View style={s.moneyRow}>
          <Text style={s.moneyLabel}>Jami qiymat</Text>
          <Text style={[s.moneyValue, { color: colors.gold }]}>
            {fmtMoney(num(item, 'quantity') * num(item, 'unit_cost'))}
          </Text>
        </View>

        <View style={[s.badge, { borderColor: badge.color + '55', backgroundColor: badge.color + '18' }]}>
          <Text style={[s.badgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </Card>
    );
  };

  if (loading && materials.length === 0) return <Loader />;

  return (
    <Screen>
      {/* Sarlavha + Excel / Kirim tugmalari */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Text style={s.headerIconText}>&#128230;</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kirim Materiallari (Xom-ashyo)</Text>
          <Text style={s.headerSub}>
            Xom-ashyo partiyalari kirimi, miqdori, o‘lchov birliklari, vaqt va ombor
            monitoringi
          </Text>
        </View>
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={s.excelBtn} onPress={exportCsv}>
          <Text style={s.excelBtnText}>▦ Excel{exported ? ' ✓' : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>＋ Material Kirim Qilish</Text>
        </TouchableOpacity>
      </View>

      {/* Statistika */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <View style={s.rowBetween}>
            <Text style={s.statLabel}>Jami Material Turlari</Text>
            <Text style={s.statIcon}>📦</Text>
          </View>
          <Text style={s.statValue}>
            {materials.length} <Text style={s.statUnit}>turda</Text>
          </Text>
        </View>
        <View style={s.statCard}>
          <View style={s.rowBetween}>
            <Text style={s.statLabel}>Jami Xom-ashyo Qiymati</Text>
            <Text style={s.statIcon}>💰</Text>
          </View>
          <Text style={[s.statValue, { color: colors.gold }]}>{fmtMoney(totalValue)}</Text>
        </View>
        <View style={s.statCard}>
          <View style={s.rowBetween}>
            <Text style={s.statLabel}>Minimal Zaxira / Ogohlantirish</Text>
            <Text style={s.statIcon}>⚠️</Text>
          </View>
          <View style={s.rowCenter}>
            <Text style={[s.statValue, { color: lowStockCount > 0 ? colors.red : colors.text }]}>
              {lowStockCount} ta
            </Text>
            <Text
              style={[
                s.pill,
                {
                  color: lowStockCount > 0 ? colors.red : colors.green,
                  borderColor: (lowStockCount > 0 ? colors.red : colors.green) + '55',
                  backgroundColor: (lowStockCount > 0 ? colors.red : colors.green) + '18',
                },
              ]}
            >
              {lowStockCount > 0 ? 'To‘ldirish talab etiladi' : 'Zaxira yetarli'}
            </Text>
          </View>
        </View>
      </View>

      {/* Filtrlar */}
      <View style={s.filterCard}>
        <View style={s.searchWrap}>
          <TextInput
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Material nomi, partiya raqami, yetkazib beruvchi yoki ombor joyi bo‘yicha qidirish..."
            placeholderTextColor={colors.faint}
            style={s.searchInput}
          />
          {search ? (
            <TouchableOpacity style={s.clearBtn} onPress={() => setSearch('')}>
              <Text style={s.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.filterRow}>
          <TouchableOpacity style={s.filterChip} onPress={() => setUnitOpen(true)}>
            <Text style={s.filterChipText}>
              Birlik: {unitFilter === 'all' ? 'Barcha birliklar' : unitFilter}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.filterChip} onPress={() => setStatusOpen(true)}>
            <Text style={s.filterChipText}>
              {statusFilter === 'all'
                ? 'Barcha holatlar'
                : STATUS_FILTERS.find((x) => x.value === statusFilter)?.label}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.filterChip} onPress={() => setSortOpen(true)}>
            <Text style={s.filterChipText}>
              ⇅ {SORTS.find((x) => x.value === sortBy)?.label}
            </Text>
          </TouchableOpacity>
          {isFiltered ? (
            <TouchableOpacity style={s.resetBtn} onPress={resetFilters}>
              <Text style={s.resetText}>↻ Tozalash</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <FlatList
        data={paged}
        keyExtractor={(item, i) => String(idOf(item) || i)}
        renderItem={renderRow}
        style={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          <Empty
            text={
              isFiltered
                ? 'Hech qanday material topilmadi. Qidiruv yoki filtrlash shartlarini o‘zgartiring.'
                : 'Materiallar hali kiritilmagan.'
            }
          />
        }
        ListFooterComponent={
          totalItems > 0 ? (
            <View style={s.pager}>
              <Text style={s.pagerText}>
                {(validPage - 1) * pageSize + 1}–
                {Math.min(validPage * pageSize, totalItems)} / {totalItems}
              </Text>
              <TouchableOpacity style={s.filterChip} onPress={() => setSizeOpen(true)}>
                <Text style={s.filterChipText}>{pageSize} qator</Text>
              </TouchableOpacity>
              <View style={s.rowCenter}>
                <TouchableOpacity
                  style={[s.pageBtn, validPage <= 1 && s.pageBtnDisabled]}
                  disabled={validPage <= 1}
                  onPress={() => setPage(validPage - 1)}
                >
                  <Text style={s.pageBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={s.pagerText}>
                  {validPage} / {totalPages}
                </Text>
                <TouchableOpacity
                  style={[s.pageBtn, validPage >= totalPages && s.pageBtnDisabled]}
                  disabled={validPage >= totalPages}
                  onPress={() => setPage(validPage + 1)}
                >
                  <Text style={s.pageBtnText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />

      {/* Kirim modal — web MaterialReceiptModal bilan bir xil (umumiy komponent) */}
      <MaterialReceiptModal
        visible={modalOpen}
        editing={editing}
        materials={materials}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          await load(true);
          setDialog({
            title: 'Muvaffaqiyatli',
            message: editing
              ? 'Material ma’lumotlari yangilandi.'
              : 'Xom-ashyo omborga muvaffaqiyatli kirim qilindi!',
          });
        }}
      />

      {/* Select oynalari */}
      <OptionsModal
        visible={unitOpen}
        title="O‘lchov birligi"
        value={unitFilter}
        options={[{ value: 'all', label: 'Barcha birliklar' }, ...UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))]}
        colors={colors}
        onClose={() => setUnitOpen(false)}
        onPick={(v) => {
          setUnitFilter(v);
          setPage(1);
        }}
      />
      <OptionsModal
        visible={statusOpen}
        title="Zaxira holati"
        value={statusFilter}
        options={STATUS_FILTERS}
        colors={colors}
        onClose={() => setStatusOpen(false)}
        onPick={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      />
      <OptionsModal
        visible={sortOpen}
        title="Saralash"
        value={sortBy}
        options={SORTS}
        colors={colors}
        onClose={() => setSortOpen(false)}
        onPick={(v) => setSortBy(v as SortKey)}
      />
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

      {/* Xabar / tasdiqlash */}
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
    headerTitle: { color: c.text, fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
    headerSub: { color: c.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },

    actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    excelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: '#059669',
    },
    excelBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.6 },
    addBtn: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: c.gold,
    },
    addBtnText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },

    statsRow: { gap: 8, marginBottom: 12 },
    statCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    statLabel: { color: c.muted, fontSize: 11, fontWeight: '700', flex: 1 },
    statIcon: { fontSize: 13 },
    statValue: { color: c.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
    statUnit: { color: c.muted, fontSize: 11, fontWeight: '600' },
    pill: {
      fontSize: 10,
      fontWeight: '800',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginLeft: 8,
      overflow: 'hidden',
    },

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
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    filterChipText: { color: c.text, fontSize: 12, fontWeight: '700' },
    resetBtn: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.red + '55',
      backgroundColor: c.red + '14',
    },
    resetText: { color: c.red, fontSize: 12, fontWeight: '800' },

    error: { color: c.red, fontSize: 13, marginBottom: 8 },
    list: { flexGrow: 0 },

    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    indexBadge: {
      minWidth: 30,
      paddingHorizontal: 6,
      height: 26,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gold + '26',
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    indexText: { color: c.text, fontSize: 12, fontWeight: '900' },
    dot: { width: 9, height: 9, borderRadius: 999 },
    itemTitle: { color: c.text, fontSize: 15, fontWeight: '800', flexShrink: 1 },
    iconBtn: {
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
    },
    editBtn: { borderColor: c.cardBorder, marginRight: 6 },
    editText: { color: c.gold, fontSize: 11, fontWeight: '800' },
    delBtn: { borderColor: c.red + '66' },
    delText: { color: c.red, fontSize: 11, fontWeight: '800' },

    metaLine: { color: c.text, fontSize: 12, marginTop: 8 },
    metaLabel: { color: c.muted, fontWeight: '700' },
    chip: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
      color: c.text,
      fontSize: 11,
      fontWeight: '700',
      overflow: 'hidden',
    },
    qty: { color: c.text, fontSize: 16, fontWeight: '900' },
    unitChip: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '4D',
      color: c.gold,
      fontSize: 11,
      fontWeight: '800',
      overflow: 'hidden',
    },
    clock: { color: c.muted, fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    minLine: { color: c.red, fontSize: 11, fontWeight: '800', marginTop: 4 },
    moneyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    moneyLabel: { color: c.muted, fontSize: 12 },
    moneyValue: { color: c.text, fontSize: 13, fontWeight: '800' },
    badge: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },

    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 12,
    },
    pagerText: { color: c.muted, fontSize: 12, fontWeight: '700' },
    pageBtn: {
      minWidth: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginHorizontal: 4,
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { color: c.text, fontSize: 18, fontWeight: '800' },

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
      marginBottom: 12,
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
    modalTitle: { color: c.text, fontSize: 16, fontWeight: '900' },
    modalSub: { color: c.muted, fontSize: 11, marginTop: 2 },
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
      marginTop: 10,
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
      marginBottom: 4,
    },
    inputText: { color: c.text, fontSize: 14, fontWeight: '700' },
    suggestBox: {
      backgroundColor: c.bg,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 6,
      overflow: 'hidden',
    },
    suggestItem: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    suggestText: { color: c.text, fontSize: 13, fontWeight: '700' },
    suggestHint: { color: c.muted, fontSize: 11, marginTop: 2 },
    amberBox: {
      backgroundColor: c.gold + '12',
      borderColor: c.gold + '40',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: 6,
    },
    qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unitSuffix: {
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: c.gold + '26',
      borderWidth: 1,
      borderColor: c.gold + '59',
    },
    unitSuffixText: { color: c.gold, fontSize: 12, fontWeight: '900' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    totalLabel: { color: c.muted, fontSize: 12, fontWeight: '700' },
    totalValue: { color: c.gold, fontSize: 15, fontWeight: '900' },
    hint: { color: c.muted, fontSize: 11, marginTop: 4 },
    timeBox: {
      backgroundColor: c.input,
      borderColor: c.gold + '59',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: 14,
    },
    timeTitle: {
      color: c.gold,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    timeValue: { color: c.text, fontSize: 14, fontWeight: '900' },
    autoBadge: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: c.green + '1F',
      borderWidth: 1,
      borderColor: c.green + '59',
      color: c.green,
      fontSize: 10,
      fontWeight: '900',
      overflow: 'hidden',
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
  });
