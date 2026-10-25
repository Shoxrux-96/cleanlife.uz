import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
import { Btn, Card, Empty, Field, Loader, Muted, Screen } from '../../components';
import { Palette, fmtMoney } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
type Period = 'all' | 'daily' | 'monthly' | 'yearly';
type StatusKey = 'all' | 'jarayonda' | 'tayyorlandi' | 'jonatildi' | 'yetkazildi';

const str = (r: Rec, k: string): string => (r[k] == null ? '' : String(r[k]));
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};
const idOf = (r: Rec): number => Number(r.id);

const STATUS_LABELS: Record<string, string> = {
  jarayonda: 'Jarayonda',
  tayyorlandi: 'Tayyorlandi',
  jonatildi: "Jo'natildi",
  yetkazildi: 'Yetkazildi',
};

const STATUS_CHIPS: Array<{ id: StatusKey; label: string }> = [
  { id: 'all', label: 'Barchasi' },
  { id: 'jarayonda', label: 'Jarayonda' },
  { id: 'tayyorlandi', label: 'Tayyorlandi' },
  { id: 'jonatildi', label: "Jo'natildi" },
  { id: 'yetkazildi', label: 'Yetkazildi' },
];

const PERIOD_CHIPS: Array<{ id: Period; label: string }> = [
  { id: 'all', label: 'Barcha davr' },
  { id: 'daily', label: 'Kunlik' },
  { id: 'monthly', label: 'Oylik' },
  { id: 'yearly', label: 'Yillik' },
];

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = () => ({
  order_number: '',
  company: '',
  client_name: '',
  phone: '',
  business_type: '',
  product_name: '',
  quantity: '',
  total_amount: '',
  paid_amount: '',
  estimated_cost: '',
  status: 'jarayonda' as string,
  order_date: todayISO(),
  delivery_date: '',
  technique: '',
  notes: '',
});

const genOrderNumber = (): string => {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `ORD-${n}`;
};

// --- Status Select (web <select> ga oʻxshash dropdown) ---
type StatusOption = { id: string; label: string; color?: string };

const StatusSelect: React.FC<{
  value: string;
  options: StatusOption[];
  onChange: (id: string) => void;
  title?: string;
  compact?: boolean;
}> = ({ value, options, onChange, title, compact }) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  const curColor = current?.color || colors.gold;
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          compact ? s.selectCompact : s.selectBtn,
          { borderColor: curColor + (compact ? '66' : '55'), backgroundColor: curColor + '15' },
        ]}
        onPress={() => setOpen(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View style={[s.selectDot, { backgroundColor: curColor }]} />
          <Text style={[s.selectText, { color: curColor }]} numberOfLines={1}>
            {current?.label ?? 'Tanlang'}
          </Text>
        </View>
        <Text style={[s.selectCaret, { color: curColor }]}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} animationType="fade" transparent>
        <TouchableOpacity
          style={s.selectOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={s.selectSheet}>
            {title ? <Text style={s.selectSheetTitle}>{title}</Text> : null}
            {options.map((opt) => {
              const tint = opt.color || colors.gold;
              const active = value === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    s.selectOption,
                    active && { backgroundColor: tint + '15' },
                  ]}
                  onPress={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <View style={[s.selectDot, { backgroundColor: tint }]} />
                  <Text style={[s.selectOptionText, { color: active ? tint : colors.text }]}>
                    {opt.label}
                  </Text>
                  {active ? <Text style={{ color: tint, fontWeight: '900' }}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const statusColor = (st: string, c: Palette): string => {
  if (st === 'yetkazildi') return c.green;
  if (st === 'jonatildi') return c.blue;
  if (st === 'tayyorlandi') return c.gold;
  return c.muted;
};

export const OrdersScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.orders.list();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metricsOrders = useMemo(() => {
    if (period === 'all') return items;
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    if (period === 'daily') return items.filter((o) => str(o, 'order_date').startsWith(`${yy}-${mm}-${dd}`));
    if (period === 'monthly') return items.filter((o) => str(o, 'order_date').startsWith(`${yy}-${mm}`));
    return items.filter((o) => str(o, 'order_date').startsWith(String(yy)));
  }, [items, period]);

  const totalOrdersCount = metricsOrders.length;
  const totalAmount = useMemo(
    () => metricsOrders.reduce((sum, o) => sum + num(o.total_amount), 0),
    [metricsOrders],
  );
  const totalPaid = useMemo(
    () => metricsOrders.reduce((sum, o) => sum + num(o.paid_amount), 0),
    [metricsOrders],
  );
  const totalDue = Math.max(0, totalAmount - totalPaid);

  const periodLabel = PERIOD_CHIPS.find((p) => p.id === period)?.label ?? 'Barcha davr';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return metricsOrders.filter((o) => {
      if (statusFilter !== 'all' && str(o, 'status') !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        str(o, 'order_number'),
        str(o, 'company'),
        str(o, 'client_name'),
        str(o, 'product_name'),
        str(o, 'business_type'),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [metricsOrders, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), order_number: genOrderNumber() });
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setForm({
      order_number: str(r, 'order_number'),
      company: str(r, 'company'),
      client_name: str(r, 'client_name'),
      phone: str(r, 'phone'),
      business_type: str(r, 'business_type'),
      product_name: str(r, 'product_name'),
      quantity: str(r, 'quantity'),
      total_amount: str(r, 'total_amount'),
      paid_amount: str(r, 'paid_amount'),
      estimated_cost: str(r, 'estimated_cost'),
      status: str(r, 'status') || 'jarayonda',
      order_date: str(r, 'order_date') || todayISO(),
      delivery_date: str(r, 'delivery_date'),
      technique: str(r, 'technique'),
      notes: str(r, 'notes'),
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.order_number.trim()) {
      Alert.alert('Xatolik', 'Buyurtma raqamini kiriting.');
      return;
    }
    if (!form.client_name.trim()) {
      Alert.alert('Xatolik', 'Mijoz nomini kiriting.');
      return;
    }
    if (!form.order_date) {
      Alert.alert('Xatolik', 'Buyurtma sanasini kiriting.');
      return;
    }
    setSaving(true);
    const body: Rec = {
      order_number: form.order_number.trim(),
      company: form.company.trim() || null,
      client_name: form.client_name.trim(),
      phone: form.phone.trim(),
      business_type: form.business_type.trim(),
      product_name: form.product_name.trim(),
      quantity: num(form.quantity),
      total_amount: num(form.total_amount),
      paid_amount: num(form.paid_amount),
      estimated_cost: num(form.estimated_cost),
      status: form.status,
      order_date: form.order_date,
      delivery_date: form.delivery_date || null,
      technique: form.technique.trim(),
      notes: form.notes.trim(),
    };
    try {
      if (editing) await api.orders.update(idOf(editing), body);
      else await api.orders.create(body);
      setModalVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (r: Rec) => {
    Alert.alert(
      "O'chirish",
      `"${str(r, 'order_number')}" buyurtmasini o'chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.orders.remove(idOf(r));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  const exportExcel = async () => {
    if (filtered.length === 0) {
      Alert.alert('Diqqat', 'Eksport uchun buyurtma yoʻq.');
      return;
    }
    const headers = [
      'Buyurtma №',
      'Korxona',
      'Mijoz',
      'Telefon',
      'Mahsulot',
      'Soni',
      'Jami summa',
      "To'langan",
      'Qoldiq',
      'Holat',
      'Buyurtma sanasi',
      'Yetkazish sanasi',
      'Texnika',
    ];
    const esc = (v: string): string => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = filtered.map((o) =>
      [
        str(o, 'order_number'),
        str(o, 'company'),
        str(o, 'client_name'),
        str(o, 'phone'),
        str(o, 'product_name'),
        str(o, 'quantity'),
        str(o, 'total_amount'),
        str(o, 'paid_amount'),
        String(num(o.total_amount) - num(o.paid_amount)),
        STATUS_LABELS[str(o, 'status')] || str(o, 'status'),
        str(o, 'order_date'),
        str(o, 'delivery_date'),
        str(o, 'technique'),
      ].map(esc).join(';'),
    );
    const csv = ['﻿' + headers.join(';'), ...rows].join('\n');
    try {
      await Share.share({ title: 'Buyurtmalar hisoboti', message: csv });
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Eksportda xatolik.');
    }
  };

  const renderItem = ({ item }: { item: Rec }) => {
    const stat = str(item, 'status');
    const paid = num(item.paid_amount);
    const total = num(item.total_amount);
    const due = Math.max(0, total - paid);
    return (
      <Card>
        <View style={s.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.orderNo}>{str(item, 'order_number')}</Text>
            <Text style={s.company} numberOfLines={1}>
              {str(item, 'company') || str(item, 'client_name') || '—'}
            </Text>
            {str(item, 'client_name') && str(item, 'company') ? (
              <Muted>{str(item, 'client_name')}</Muted>
            ) : null}
          </View>
          <View style={{ width: 130 }}>
            <StatusSelect
              compact
              value={stat || 'jarayonda'}
              options={Object.entries(STATUS_LABELS).map(([id, label]) => ({
                id,
                label,
                color: statusColor(id, colors),
              }))}
              onChange={async (newStatus) => {
                try {
                  await api.orders.changeStatus(idOf(item), newStatus);
                  await load();
                } catch (e) {
                  Alert.alert('Xatolik', e instanceof Error ? e.message : 'Xatolik.');
                }
              }}
              title="Holatni oʻzgartirish"
            />
          </View>
        </View>

        {str(item, 'product_name') ? (
          <Text style={s.product} numberOfLines={2}>
            📦 {str(item, 'product_name')}
            {num(item.quantity) > 0 ? ` × ${num(item.quantity)}` : ''}
          </Text>
        ) : null}

        <View style={s.amountsRow}>
          <View style={s.amountBox}>
            <Text style={s.amountLabel}>Jami</Text>
            <Text style={s.amountVal}>{fmtMoney(total)}</Text>
          </View>
          <View style={s.amountBox}>
            <Text style={s.amountLabel}>Avans</Text>
            <Text style={[s.amountVal, { color: colors.green }]}>{fmtMoney(paid)}</Text>
          </View>
          <View style={s.amountBox}>
            <Text style={s.amountLabel}>Qoldiq</Text>
            <Text style={[s.amountVal, { color: due > 0 ? colors.red : colors.muted }]}>
              {fmtMoney(due)}
            </Text>
          </View>
        </View>

        <View style={s.datesRow}>
          <Text style={s.dateItem}>📅 Buyurtma: {str(item, 'order_date') || '—'}</Text>
          {str(item, 'delivery_date') ? (
            <Text style={s.dateItem}>🚚 Yetkazish: {str(item, 'delivery_date')}</Text>
          ) : null}
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity style={s.smallBtn} onPress={() => openEdit(item)}>
            <Text style={s.smallBtnText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.smallBtn, { borderColor: colors.red + '66' }]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[s.smallBtnText, { color: colors.red }]}>O'chirish</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={loading ? null : <Empty text="Buyurtmalar topilmadi." />}
        ListHeaderComponent={
          <>
            <View style={s.actionButtons}>
              <TouchableOpacity style={s.excelBtn} onPress={exportExcel} activeOpacity={0.85}>
                <Text style={{ fontSize: 16 }}>📊</Text>
                <Text style={s.excelBtnText}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
                <Text style={s.addBtnPlus}>+</Text>
                <Text style={s.addBtnText}>Buyurtma</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>Statistika davri</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              {PERIOD_CHIPS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.chip, period === p.id && s.chipActive]}
                  onPress={() => setPeriod(p.id)}
                >
                  <Text style={[s.chipText, period === p.id && s.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.foundText}>Topildi: {filtered.length} ta</Text>

            <View style={s.kpiGrid}>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>Jami Buyurtmalar</Text>
                <Text style={[s.kpiValue, { color: colors.gold }]}>{totalOrdersCount} ta</Text>
                <Text style={s.kpiNote}>{periodLabel}</Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>Jami Shartnoma</Text>
                <Text style={[s.kpiValue, { color: colors.gold }]}>{fmtMoney(totalAmount)}</Text>
                <Text style={s.kpiNote}>{periodLabel}</Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>Qabul Qilingan Avans</Text>
                <Text style={[s.kpiValue, { color: colors.green }]}>{fmtMoney(totalPaid)}</Text>
                <Text style={s.kpiNote}>Toʻlangan avanslar</Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>Qoldiq Toʻlov</Text>
                <Text style={[s.kpiValue, { color: colors.red }]}>{fmtMoney(totalDue)}</Text>
                <Text style={s.kpiNote}>Kutilayotgan tushum</Text>
              </View>
            </View>

            <View style={s.filterRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Korxona yoki mahsulot nomi..."
                placeholderTextColor={colors.faint}
                style={s.searchInline}
              />
              <View style={{ width: 140 }}>
                <StatusSelect
                  value={statusFilter}
                  options={STATUS_CHIPS.map((c) => ({
                    id: c.id,
                    label: c.label,
                    color: c.id === 'all' ? colors.muted : statusColor(c.id, colors),
                  }))}
                  onChange={(id) => setStatusFilter(id as StatusKey)}
                  title="Holat boʻyicha filtr"
                />
              </View>
            </View>

            <View style={{ height: 12 }} />

            {loading ? <Loader /> : null}
            {error ? (
              <View style={s.center}>
                <Text style={s.error}>{error}</Text>
                <Btn title="Qayta urinish" onPress={() => load()} ghost />
              </View>
            ) : null}
          </>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>
                {editing ? 'Buyurtmani tahrirlash' : 'Yangi buyurtma'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Buyurtma raqami *" value={form.order_number} onChange={(v) => setForm({ ...form, order_number: v })} placeholder="ORD-1234" />
              <Field label="Korxona nomi" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Masalan: Caravan Group" />
              <Field label="Mijoz (vakil) *" value={form.client_name} onChange={(v) => setForm({ ...form, client_name: v })} placeholder="Ism Familiya" />
              <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+998 ..." keyboard="phone-pad" />
              <Field label="Biznes turi" value={form.business_type} onChange={(v) => setForm({ ...form, business_type: v })} placeholder="Masalan: Choyxona" />
              <Field label="Mahsulot nomi" value={form.product_name} onChange={(v) => setForm({ ...form, product_name: v })} placeholder="Mahsulot" />
              <Field label="Soni" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} placeholder="0" keyboard="numeric" />
              <Field label="Jami summa (so'm)" value={form.total_amount} onChange={(v) => setForm({ ...form, total_amount: v })} placeholder="0" keyboard="numeric" />
              <Field label="To'langan avans (so'm)" value={form.paid_amount} onChange={(v) => setForm({ ...form, paid_amount: v })} placeholder="0" keyboard="numeric" />
              <Field label="Taxminiy xarajat (so'm)" value={form.estimated_cost} onChange={(v) => setForm({ ...form, estimated_cost: v })} placeholder="0" keyboard="numeric" />

              <Text style={s.statusLabel}>Holat</Text>
              <View style={s.statusChipsRow}>
                {Object.entries(STATUS_LABELS).map(([id, label]) => {
                  const active = form.status === id;
                  const tint = statusColor(id, colors);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[s.statusChip, active && { backgroundColor: tint + '22', borderColor: tint }]}
                      onPress={() => setForm({ ...form, status: id })}
                    >
                      <Text style={[s.statusChipText, active && { color: tint }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Field label="Buyurtma sanasi (YYYY-MM-DD) *" value={form.order_date} onChange={(v) => setForm({ ...form, order_date: v })} placeholder="2026-10-20" />
              <Field label="Yetkazish sanasi (YYYY-MM-DD)" value={form.delivery_date} onChange={(v) => setForm({ ...form, delivery_date: v })} placeholder="2026-10-27" />
              <Field label="Texnika" value={form.technique} onChange={(v) => setForm({ ...form, technique: v })} placeholder="Masalan: Kashta, Chop etish" />
              <Field label="Izohlar" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Qoʻshimcha maʼlumot" multiline />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Btn title="Bekor qilish" onPress={() => setModalVisible(false)} ghost />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Btn title={editing ? 'Yangilash' : 'Qoʻshish'} onPress={save} busy={saving} />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    excelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.green + '22',
      borderWidth: 1,
      borderColor: colors.green + '66',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    excelBtnText: { color: colors.green, fontWeight: '800', fontSize: 13 },
    addBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.gold,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    addBtnPlus: { color: '#000', fontSize: 20, fontWeight: '900' },
    addBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

    sectionLabel: {
      color: colors.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
      marginBottom: 6,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    chipActive: {
      backgroundColor: colors.gold + '22',
      borderColor: colors.gold,
    },
    chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: colors.gold, fontWeight: '800' },
    foundText: { color: colors.muted, fontSize: 12, marginTop: 10, marginBottom: 8 },

    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
      marginBottom: 12,
    },
    kpi: {
      width: '48.5%',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    kpiLabel: {
      color: colors.muted,
      fontSize: 11,
      marginBottom: 6,
      fontWeight: '700',
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: '900',
    },
    kpiNote: {
      color: colors.faint,
      fontSize: 10,
      marginTop: 4,
    },

    filterRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'stretch',
      marginTop: 4,
      marginBottom: 4,
    },
    searchInline: {
      flex: 1,
      backgroundColor: colors.input,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 13,
    },
    // --- StatusSelect ---
    selectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 11,
    },
    selectCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    selectDot: { width: 8, height: 8, borderRadius: 4 },
    selectText: { fontSize: 12, fontWeight: '800', flex: 1 },
    selectCaret: { fontSize: 12, fontWeight: '900' },
    selectOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    selectSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      paddingBottom: 24,
    },
    selectSheetTitle: {
      color: colors.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '800',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    selectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 13,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    selectOptionText: { fontSize: 14, fontWeight: '700', flex: 1 },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },

    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    orderNo: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    company: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusText: { fontSize: 11, fontWeight: '800' },
    product: { color: colors.text, fontSize: 13, marginBottom: 10 },
    amountsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    amountBox: {
      flex: 1,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    amountLabel: {
      color: colors.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '700',
    },
    amountVal: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
      marginTop: 3,
    },
    datesRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      marginBottom: 10,
    },
    dateItem: { color: colors.muted, fontSize: 11 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    smallBtn: {
      flex: 1,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    smallBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      padding: 16,
      maxHeight: '92%',
    },
    modalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    modalClose: {
      color: colors.muted,
      fontSize: 22,
      fontWeight: '800',
      paddingHorizontal: 6,
    },
    statusLabel: {
      color: colors.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 4,
    },
    statusChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statusChipText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  });
