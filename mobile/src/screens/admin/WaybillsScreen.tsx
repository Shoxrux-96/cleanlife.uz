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

const str = (r: Rec, k: string): string => (r[k] == null ? '' : String(r[k]));
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};
const idOf = (r: Rec): number => Number(r.id);

const STATUS_LABELS: Record<string, string> = {
  kutilmoqda: 'Kutilmoqda',
  yo_lda: "Yo'lda",
  yetkazildi: 'Yetkazildi',
};

const PERIOD_CHIPS: Array<{ id: Period; label: string }> = [
  { id: 'all', label: 'Barcha davr' },
  { id: 'daily', label: 'Kunlik' },
  { id: 'monthly', label: 'Oylik' },
  { id: 'yearly', label: 'Yillik' },
];

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'sotuv', label: 'Sotuv' },
  { id: 'xarid', label: 'Xarid' },
];

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const genTTN = (): string => {
  const n = 10000 + Math.floor(Math.random() * 90000);
  return `TTN-${n}`;
};

const statusColor = (st: string, c: Palette): string => {
  if (st === 'yetkazildi') return c.green;
  if (st === 'yo_lda') return c.blue;
  return c.muted;
};

type Item = {
  key: string;
  product_id: number | null;
  product_name: string;
  measure: string;
  quantity: string;
  unit_price: string;
  stock: number;
};

const makeKey = (): string => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const emptyItem = (): Item => ({
  key: makeKey(),
  product_id: null,
  product_name: '',
  measure: 'Dona',
  quantity: '',
  unit_price: '',
  stock: 0,
});

const nowHM = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const emptyForm = () => ({
  // Buyurtmaga bogʻlash
  order_number: '',
  custom_order_id: '',
  // Rekvizitlar
  ttn_number: '',
  category: 'sotuv',
  issue_date: todayISO(),
  issue_time: nowHM(),
  // Jo'natuvchi
  sender_company: '',
  sender_phone: '',
  // Qabul qiluvchi
  receiver_company: '',
  receiver_phone: '',
  // Mahsulotlar
  items: [emptyItem()] as Item[],
  // Status
  status: 'kutilmoqda' as string,
});

// --- StatusSelect ---
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
                  style={[s.selectOption, active && { backgroundColor: tint + '15' }]}
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

export const WaybillsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Rec[]>([]);
  const [orders, setOrders] = useState<Rec[]>([]);
  const [clients, setClients] = useState<Rec[]>([]);
  const [products, setProducts] = useState<Rec[]>([]);
  const [company, setCompany] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Ko'rish/Chop etish uchun
  const [viewing, setViewing] = useState<Rec | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [wb, od, cl, pr, co] = await Promise.all([
        api.waybills.list(),
        api.orders.list().catch(() => [] as Rec[]),
        api.clients.list().catch(() => [] as Rec[]),
        api.products.list().catch(() => [] as Rec[]),
        api.company.get().catch(() => null),
      ]);
      setItems(wb);
      setOrders(od);
      setClients(cl);
      setProducts(pr);
      setCompany(co);
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

  // Davr bo'yicha filter (KPI uchun)
  const periodItems = useMemo(() => {
    if (period === 'all') return items;
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    if (period === 'daily') return items.filter((o) => str(o, 'issue_date').startsWith(`${yy}-${mm}-${dd}`));
    if (period === 'monthly') return items.filter((o) => str(o, 'issue_date').startsWith(`${yy}-${mm}`));
    return items.filter((o) => str(o, 'issue_date').startsWith(String(yy)));
  }, [items, period]);

  const periodLabel = PERIOD_CHIPS.find((p) => p.id === period)?.label ?? 'Barcha davr';

  const salesTurnover = useMemo(
    () =>
      periodItems
        .filter((w) => str(w, 'category') === 'sotuv')
        .reduce((sum, w) => sum + num(w.total_sum), 0),
    [periodItems],
  );

  const salesCount = useMemo(
    () => periodItems.filter((w) => str(w, 'category') === 'sotuv').length,
    [periodItems],
  );

  const completedOrdersCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          str(o, 'status') === 'yetkazildi' ||
          (num(o.delivered_quantity) >= num(o.quantity) && num(o.quantity) > 0),
      ).length,
    [orders],
  );

  // Qidirish + status filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodItems.filter((w) => {
      if (statusFilter !== 'all' && str(w, 'status') !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        str(w, 'ttn_number'),
        str(w, 'order_number'),
        str(w, 'custom_order_id'),
        str(w, 'receiver_company'),
        str(w, 'sender_company'),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [periodItems, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    const senderName = company ? str(company, 'name') : '';
    const senderPhone = company ? str(company, 'phone') : '';
    setForm({
      ...emptyForm(),
      ttn_number: genTTN(),
      sender_company: senderName,
      sender_phone: senderPhone,
    });
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setForm({
      ttn_number: str(r, 'ttn_number'),
      order_number: str(r, 'order_number'),
      custom_order_id: str(r, 'custom_order_id'),
      category: str(r, 'category') || 'sotuv',
      sender_company: str(r, 'sender_company'),
      sender_phone: str(r, 'sender_phone'),
      receiver_company: str(r, 'receiver_company'),
      receiver_phone: str(r, 'receiver_phone'),
      issue_date: str(r, 'issue_date') || todayISO(),
      issue_time: str(r, 'issue_time') || nowHM(),
      status: str(r, 'status') || 'kutilmoqda',
      items: [emptyItem()],
    });
    setModalVisible(true);
  };

  // Jami hisob-kitob
  const itemsTotalQty = form.items.reduce((sum, it) => sum + num(it.quantity), 0);
  const itemsTotalSum = form.items.reduce(
    (sum, it) => sum + num(it.quantity) * num(it.unit_price),
    0,
  );

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (key: string) =>
    setForm({ ...form, items: form.items.filter((i) => i.key !== key) });
  const updateItem = (key: string, patch: Partial<Item>) =>
    setForm({
      ...form,
      items: form.items.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    });

  const bindOrder = (orderNumber: string) => {
    if (!orderNumber) {
      setForm({ ...form, order_number: '' });
      return;
    }
    const o = orders.find((x) => str(x, 'order_number') === orderNumber);
    if (!o) {
      setForm({ ...form, order_number: orderNumber });
      return;
    }
    setForm({
      ...form,
      order_number: orderNumber,
      receiver_company: str(o, 'company') || str(o, 'client_name'),
      receiver_phone: str(o, 'phone'),
    });
  };

  const pickClient = (clientId: string) => {
    const c = clients.find((x) => String(x.id) === clientId);
    if (!c) return;
    setForm({
      ...form,
      receiver_company: str(c, 'company') || str(c, 'name'),
      receiver_phone: str(c, 'phone'),
    });
  };

  const pickProduct = (itemKey: string, productId: string) => {
    const p = products.find((x) => String(x.id) === productId);
    if (!p) return;
    updateItem(itemKey, {
      product_id: Number(p.id),
      product_name: str(p, 'name'),
      unit_price: str(p, 'selling_price'),
      stock: num(p.stock_count),
    });
  };

  const save = async () => {
    if (!form.ttn_number.trim()) {
      Alert.alert('Xatolik', 'TTN raqamini kiriting.');
      return;
    }
    if (!form.sender_company.trim()) {
      Alert.alert('Xatolik', 'Joʻnatuvchi korxona nomini kiriting.');
      return;
    }
    if (!form.receiver_company.trim()) {
      Alert.alert('Xatolik', 'Qabul qiluvchi korxona nomini kiriting.');
      return;
    }
    const validItems = form.items.filter((i) => i.product_name && num(i.quantity) > 0);
    if (!editing && validItems.length === 0) {
      Alert.alert('Xatolik', 'Kamida bitta mahsulot qoʻshing.');
      return;
    }
    setSaving(true);
    const body: Rec = {
      ttn_number: form.ttn_number.trim(),
      order_number: form.order_number.trim(),
      custom_order_id: form.custom_order_id.trim() || null,
      category: form.category,
      sender_company: form.sender_company.trim(),
      sender_phone: form.sender_phone.trim() || null,
      receiver_company: form.receiver_company.trim(),
      receiver_phone: form.receiver_phone.trim() || null,
      total_sum: itemsTotalSum,
      issue_date: form.issue_date,
      issue_time: form.issue_time || null,
      status: form.status,
    };
    try {
      if (editing) await api.waybills.update(idOf(editing), body);
      else await api.waybills.create(body);
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
      `"${str(r, 'ttn_number')}" yuk xatini o'chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.waybills.remove(idOf(r));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  // --- Yuk xatini HTML/matn ko'rinishida yaratish (chop etish / ulashish uchun) ---
  const waybillHtml = (w: Rec): string => {
    const comp = company ? str(company, 'name') : 'KORXONA';
    const esc = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(str(w, 'ttn_number'))}</title>
<style>
body{font-family:Arial,sans-serif;max-width:720px;margin:20px auto;color:#1a1715;padding:0 16px}
h1{text-align:center;font-size:20px;margin:0 0 4px;letter-spacing:1px}
.sub{text-align:center;color:#8c6207;font-size:12px;margin-bottom:20px;font-weight:700}
.row{display:flex;gap:16px;margin-bottom:14px}
.col{flex:1}
.lbl{font-size:10px;color:#8a7e70;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:3px}
.val{font-size:13px;font-weight:600;border-bottom:1px dashed #ccc;padding-bottom:3px}
.section{border:1px solid #d4af37;border-radius:8px;padding:12px;margin-bottom:12px}
.section-title{font-size:11px;color:#8c6207;text-transform:uppercase;letter-spacing:1px;font-weight:900;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:12px}
th{background:#f3eee4;font-weight:800}
.total{text-align:right;font-size:14px;font-weight:900;color:#8c6207;margin-top:10px}
.sign-row{display:flex;justify-content:space-between;margin-top:30px;padding-top:20px;border-top:1px dashed #999}
.sign{font-size:11px}
.sign-line{border-bottom:1px solid #333;width:160px;margin-bottom:4px;height:24px}
</style></head><body>
<h1>YUK XATI (TTN) № ${esc(str(w, 'ttn_number'))}</h1>
<div class="sub">${esc(comp)} • ${esc(str(w, 'issue_date'))} ${esc(str(w, 'issue_time'))}</div>

<div class="section">
  <div class="section-title">Hujjat ma'lumotlari</div>
  <div class="row">
    <div class="col"><div class="lbl">Kategoriya</div><div class="val">${str(w, 'category') === 'xarid' ? 'Xarid' : 'Sotuv'}</div></div>
    <div class="col"><div class="lbl">Holat</div><div class="val">${esc(STATUS_LABELS[str(w, 'status')] || str(w, 'status'))}</div></div>
  </div>
  <div class="row">
    <div class="col"><div class="lbl">Buyurtma raqami</div><div class="val">${esc(str(w, 'order_number') || '—')}</div></div>
    <div class="col"><div class="lbl">Maxsus Buyurtma ID</div><div class="val">${esc(str(w, 'custom_order_id') || '—')}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Yuk Jo'natuvchi</div>
  <div class="row">
    <div class="col"><div class="lbl">Korxona</div><div class="val">${esc(str(w, 'sender_company'))}</div></div>
    <div class="col"><div class="lbl">Telefon</div><div class="val">${esc(str(w, 'sender_phone'))}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Yuk Qabul Qiluvchi</div>
  <div class="row">
    <div class="col"><div class="lbl">Korxona</div><div class="val">${esc(str(w, 'receiver_company'))}</div></div>
    <div class="col"><div class="lbl">Telefon</div><div class="val">${esc(str(w, 'receiver_phone'))}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Yuk Mahsulotlari</div>
  <table>
    <tr><th>№</th><th>Mahsulot</th><th>Miqdor</th><th>Narx</th><th>Jami</th></tr>
    <tr>
      <td>1</td>
      <td>${esc(str(w, 'product_name') || '—')}</td>
      <td>${str(w, 'quantity') || '—'} dona</td>
      <td>—</td>
      <td>${num(w.total_sum).toLocaleString('uz-UZ')} so'm</td>
    </tr>
  </table>
  <div class="total">JAMI SUMMA: ${num(w.total_sum).toLocaleString('uz-UZ')} so'm</div>
</div>

<div class="sign-row">
  <div class="sign">
    <div class="sign-line"></div>
    <div>Jo'natuvchi imzosi</div>
  </div>
  <div class="sign">
    <div class="sign-line"></div>
    <div>Qabul qiluvchi imzosi</div>
  </div>
</div>
</body></html>`;
  };

  const waybillText = (w: Rec): string => {
    const lines = [
      `YUK XATI (TTN) № ${str(w, 'ttn_number')}`,
      `Chiqarilgan: ${str(w, 'issue_date')} ${str(w, 'issue_time')}`,
      '',
      `Kategoriya: ${str(w, 'category') === 'xarid' ? 'Xarid' : 'Sotuv'}`,
      `Holat: ${STATUS_LABELS[str(w, 'status')] || str(w, 'status')}`,
      `Buyurtma: ${str(w, 'order_number') || '—'}`,
      '',
      '─── JO\'NATUVCHI ───',
      `  Korxona: ${str(w, 'sender_company')}`,
      `  Telefon: ${str(w, 'sender_phone')}`,
      '',
      '─── QABUL QILUVCHI ───',
      `  Korxona: ${str(w, 'receiver_company')}`,
      `  Telefon: ${str(w, 'receiver_phone')}`,
      '',
      '─── MAHSULOT ───',
      `  ${str(w, 'product_name') || '—'}`,
      `  Miqdor: ${str(w, 'quantity') || '—'} dona`,
      '',
      `JAMI: ${num(w.total_sum).toLocaleString('uz-UZ')} so'm`,
    ];
    return lines.join('\n');
  };

  const sharePrint = async (w: Rec) => {
    try {
      // HTML'ni Share orqali yuborish — Gmail/Drive/Chrome bosib chop etish yoki PDF saqlash mumkin
      await Share.share({
        title: `Yuk xati ${str(w, 'ttn_number')}`,
        message: waybillHtml(w),
      });
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Chop etishda xatolik.');
    }
  };

  const shareText = async (w: Rec) => {
    try {
      await Share.share({
        title: `Yuk xati ${str(w, 'ttn_number')}`,
        message: waybillText(w),
      });
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Ulashishda xatolik.');
    }
  };

  const exportExcel = async () => {
    if (filtered.length === 0) {
      Alert.alert('Diqqat', 'Eksport uchun yuk xati yoʻq.');
      return;
    }
    const headers = [
      'TTN',
      'Buyurtma №',
      'Kategoriya',
      "Chiqaruvchi",
      'Oluvchi',
      'Haydovchi',
      'Avtomobil',
      'Yoʻnalish',
      'Jami summa',
      'Holat',
      'Chiqarilish sanasi',
      'Vaqti',
    ];
    const esc = (v: string): string => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = filtered.map((w) =>
      [
        str(w, 'ttn_number'),
        str(w, 'order_number') || str(w, 'custom_order_id'),
        str(w, 'category'),
        str(w, 'sender_company'),
        str(w, 'receiver_company'),
        str(w, 'driver_name'),
        `${str(w, 'vehicle_model')} ${str(w, 'vehicle_plate')}`.trim(),
        `${str(w, 'route_from')} → ${str(w, 'route_to')}`,
        str(w, 'total_sum'),
        STATUS_LABELS[str(w, 'status')] || str(w, 'status'),
        str(w, 'issue_date'),
        str(w, 'issue_time'),
      ].map(esc).join(';'),
    );
    const csv = ['﻿' + headers.join(';'), ...rows].join('\n');
    try {
      await Share.share({ title: 'Yuk xatlari hisoboti', message: csv });
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Eksportda xatolik.');
    }
  };

  const renderItem = ({ item }: { item: Rec }) => {
    const stat = str(item, 'status');
    const cat = str(item, 'category');
    const catColor = cat === 'xarid' ? colors.blue : colors.gold;
    return (
      <Card>
        <View style={s.cardHead}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.ttnNo}>{str(item, 'ttn_number')}</Text>
              <View style={[s.catChip, { backgroundColor: catColor + '22', borderColor: catColor + '66' }]}>
                <Text style={[s.catChipText, { color: catColor }]}>
                  {cat === 'xarid' ? 'Xarid' : 'Sotuv'}
                </Text>
              </View>
            </View>
            <Text style={s.company} numberOfLines={1}>
              {str(item, 'receiver_company') || str(item, 'sender_company') || '—'}
            </Text>
          </View>
          <View style={{ width: 130 }}>
            <StatusSelect
              compact
              value={stat || 'kutilmoqda'}
              options={Object.entries(STATUS_LABELS).map(([id, label]) => ({
                id,
                label,
                color: statusColor(id, colors),
              }))}
              onChange={async (newStatus) => {
                try {
                  await api.waybills.changeStatus(idOf(item), newStatus);
                  await load();
                } catch (e) {
                  Alert.alert('Xatolik', e instanceof Error ? e.message : 'Xatolik.');
                }
              }}
              title="Holatni oʻzgartirish"
            />
          </View>
        </View>

        {str(item, 'order_number') ? (
          <Muted>📦 Buyurtma: {str(item, 'order_number')}</Muted>
        ) : null}

        {str(item, 'driver_name') ? (
          <Text style={s.driverLine} numberOfLines={1}>
            🚛 {str(item, 'driver_name')}
            {str(item, 'vehicle_plate') ? ` • ${str(item, 'vehicle_plate')}` : ''}
          </Text>
        ) : null}

        {(str(item, 'route_from') || str(item, 'route_to')) ? (
          <Muted>
            📍 {str(item, 'route_from') || '—'} → {str(item, 'route_to') || '—'}
          </Muted>
        ) : null}

        <View style={s.amountRow}>
          <View style={s.amountBox}>
            <Text style={s.amountLabel}>Jami summa</Text>
            <Text style={[s.amountVal, { color: colors.gold }]}>
              {fmtMoney(num(item.total_sum))}
            </Text>
          </View>
          <View style={s.amountBox}>
            <Text style={s.amountLabel}>Sana</Text>
            <Text style={s.amountVal}>
              {str(item, 'issue_date') || '—'}
            </Text>
          </View>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.smallBtn, { borderColor: colors.blue + '66', backgroundColor: colors.blue + '11' }]}
            onPress={() => setViewing(item)}
          >
            <Text style={[s.smallBtnText, { color: colors.blue }]}>👁 Koʻrish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.smallBtn} onPress={() => openEdit(item)}>
            <Text style={s.smallBtnText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.smallBtn, { borderColor: colors.red + '66' }]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[s.smallBtnText, { color: colors.red }]}>Oʻchirish</Text>
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
        ListEmptyComponent={loading ? null : <Empty text="Yuk xatlari topilmadi." />}
        ListHeaderComponent={
          <>
            {/* Sarlavha matni */}
            <Text style={s.pageHint}>
              Rasmiy yuk xatlari, yetkazib berish nazorati va toʻliq hisob-kitoblar
            </Text>

            {/* Harakat tugmalari */}
            <View style={s.actionButtons}>
              <TouchableOpacity style={s.excelBtn} onPress={exportExcel} activeOpacity={0.85}>
                <Text style={{ fontSize: 16 }}>📊</Text>
                <Text style={s.excelBtnText}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
                <Text style={s.addBtnPlus}>+</Text>
                <Text style={s.addBtnText}>Yuk xati yaratish</Text>
              </TouchableOpacity>
            </View>

            {/* Davr tanlash */}
            <Text style={s.sectionLabel}>Davr</Text>
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
            <Text style={s.hintUnderPeriod}>
              Yuk xatlarini sana, oy va yillar kesimida tahlil qilish
            </Text>
            <Text style={s.foundText}>Topildi: {filtered.length} ta yuk xati</Text>

            {/* 3 KPI */}
            <View style={s.kpiRow}>
              <View style={s.kpiBig}>
                <Text style={s.kpiLabel}>Yuk Xatlari Soni</Text>
                <Text style={[s.kpiValueBig, { color: colors.gold }]}>
                  {salesCount} ta
                </Text>
                <Text style={s.kpiNote}>
                  {salesCount} ta sotuv yuk xati ({periodLabel})
                </Text>
              </View>
              <View style={s.kpiBig}>
                <Text style={s.kpiLabel}>Bajarilgan Buyurtmalar</Text>
                <Text style={[s.kpiValueBig, { color: colors.green }]}>
                  {completedOrdersCount} ta
                </Text>
                <Text style={s.kpiNote}>
                  Jami {orders.length} ta buyurtmadan
                </Text>
              </View>
            </View>
            <View style={s.kpiFull}>
              <Text style={s.kpiLabel}>Savdo Aylanmasi Summasi</Text>
              <Text style={[s.kpiValueBig, { color: colors.gold }]}>
                {fmtMoney(salesTurnover)}
              </Text>
              <Text style={s.kpiNote}>
                Yuk xatlari boʻyicha jami savdo ({periodLabel})
              </Text>
            </View>

            {/* Qidirish + Status filter */}
            <View style={s.filterRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Yuk xati raqami, mijoz yoki buyurtma ID..."
                placeholderTextColor={colors.faint}
                style={s.searchInline}
              />
              <View style={{ width: 140 }}>
                <StatusSelect
                  value={statusFilter}
                  options={[
                    { id: 'all', label: 'Barchasi', color: colors.muted },
                    { id: 'kutilmoqda', label: 'Kutilmoqda', color: colors.muted },
                    { id: 'yo_lda', label: "Yo'lda", color: colors.blue },
                    { id: 'yetkazildi', label: 'Yetkazildi', color: colors.green },
                  ]}
                  onChange={setStatusFilter}
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

      {/* === Yuk xati modali === */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>
                {editing ? 'Yuk xatini tahrirlash' : 'Yangi yuk xati'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* === 1. Buyurtmaga bogʻlash & Maxsus ID === */}
              <View style={s.sectionBox}>
                <Text style={s.sectionBoxTitle}>Buyurtmaga bogʻlash & Maxsus ID</Text>
                <Text style={s.sectionBoxHint}>Chekkada koʻrinadigan buyurtma kodi</Text>

                <Text style={s.selectLabel}>Mavjud buyurtmalardan tanlang:</Text>
                <StatusSelect
                  value={form.order_number || 'none'}
                  options={[
                    { id: 'none', label: '— Alohida yuk xati (Buyurtmasiz) —', color: colors.muted },
                    ...orders.map((o) => ({
                      id: str(o, 'order_number'),
                      label: `${str(o, 'order_number')} • ${str(o, 'company') || str(o, 'client_name')}`,
                      color: colors.gold,
                    })),
                  ]}
                  onChange={(v) => bindOrder(v === 'none' ? '' : v)}
                  title="Buyurtma tanlang"
                />

                <View style={{ height: 10 }} />
                <Field
                  label="Maxsus Buyurtma ID (yozish mumkin)"
                  value={form.custom_order_id}
                  onChange={(v) => setForm({ ...form, custom_order_id: v })}
                  placeholder="Masalan: ORD-1083 yoki maxsus kod"
                />
              </View>

              {/* === 2. Yuk Xati Rekvizitlari === */}
              <View style={s.sectionBox}>
                <View style={s.sectionBoxTitleRow}>
                  <Text style={s.sectionBoxTitle}>Yuk Xati Rekvizitlari</Text>
                  <View style={s.autoBadge}>
                    <Text style={s.autoBadgeText}>✓ Sana va vaqt avtomatik</Text>
                  </View>
                </View>

                <Text style={s.selectLabel}>Yuk Xati Kategoriyasi *</Text>
                <View style={s.statusChipsRow}>
                  {CATEGORIES.map((c) => {
                    const active = form.category === c.id;
                    const tint = c.id === 'xarid' ? colors.blue : colors.gold;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[s.statusChip, active && { backgroundColor: tint + '22', borderColor: tint }]}
                        onPress={() => setForm({ ...form, category: c.id })}
                      >
                        <Text style={[s.statusChipText, active && { color: tint, fontWeight: '900' }]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Field
                  label="Yuk Xati Raqami *"
                  value={form.ttn_number}
                  onChange={(v) => setForm({ ...form, ttn_number: v })}
                  placeholder="TTN-XXXXX"
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={s.autoFieldRow}>
                      <Text style={s.autoFieldLabel}>Sanasi *</Text>
                      <Text style={s.autoFieldHint}>✓ Avtomatik</Text>
                    </View>
                    <Field
                      label=""
                      value={form.issue_date}
                      onChange={(v) => setForm({ ...form, issue_date: v })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.autoFieldRow}>
                      <Text style={s.autoFieldLabel}>Vaqti *</Text>
                      <Text style={s.autoFieldHint}>✓ Avtomatik</Text>
                    </View>
                    <Field
                      label=""
                      value={form.issue_time}
                      onChange={(v) => setForm({ ...form, issue_time: v })}
                      placeholder="HH:MM"
                    />
                  </View>
                </View>
              </View>

              {/* === 3. Yuk Joʻnatuvchi === */}
              <View style={s.sectionBox}>
                <Text style={s.sectionBoxTitle}>Yuk Joʻnatuvchi</Text>

                {company ? (
                  <>
                    <Text style={s.selectLabel}>Tezkor tanlash:</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={s.quickPickBtn}
                      onPress={() =>
                        setForm({
                          ...form,
                          sender_company: str(company, 'name'),
                          sender_phone: str(company, 'phone'),
                        })
                      }
                    >
                      <Text style={s.quickPickText}>🏢 {str(company, 'name')}</Text>
                    </TouchableOpacity>
                    <View style={{ height: 8 }} />
                  </>
                ) : null}

                <Field
                  label="Korxona nomi (yozish mumkin) *"
                  value={form.sender_company}
                  onChange={(v) => setForm({ ...form, sender_company: v })}
                  placeholder="Masalan: Clean Life"
                />
                <Field
                  label="Telefon raqami (yozish mumkin) *"
                  value={form.sender_phone}
                  onChange={(v) => setForm({ ...form, sender_phone: v })}
                  placeholder="+998 ..."
                  keyboard="phone-pad"
                />
              </View>

              {/* === 4. Yuk Qabul Qiluvchi === */}
              <View style={s.sectionBox}>
                <Text style={s.sectionBoxTitle}>Yuk Qabul Qiluvchi</Text>

                <Text style={s.selectLabel}>Mijozlar bazasidan:</Text>
                <StatusSelect
                  value="none"
                  options={[
                    { id: 'none', label: '— Tanlang —', color: colors.muted },
                    ...clients.map((c) => ({
                      id: String(c.id),
                      label: `${str(c, 'company') || str(c, 'name')} • ${str(c, 'phone')}`,
                      color: colors.blue,
                    })),
                  ]}
                  onChange={(v) => v !== 'none' && pickClient(v)}
                  title="Mijozni tanlang"
                />

                <View style={{ height: 10 }} />
                <Field
                  label="Mijoz korxona nomi (yozish mumkin) *"
                  value={form.receiver_company}
                  onChange={(v) => setForm({ ...form, receiver_company: v })}
                  placeholder="Masalan: Caravan Group"
                />
                <Field
                  label="Telefon raqami (yozish mumkin) *"
                  value={form.receiver_phone}
                  onChange={(v) => setForm({ ...form, receiver_phone: v })}
                  placeholder="+998 ..."
                  keyboard="phone-pad"
                />
              </View>

              {/* === 5. Yuk Mahsulotlari === */}
              <View style={s.sectionBox}>
                <View style={s.sectionBoxTitleRow}>
                  <Text style={s.sectionBoxTitle}>Yuk Mahsulotlari</Text>
                  <TouchableOpacity
                    style={s.addItemBtn}
                    onPress={addItem}
                    activeOpacity={0.85}
                  >
                    <Text style={s.addItemBtnText}>+ Qator qoʻshish</Text>
                  </TouchableOpacity>
                </View>

                {form.items.map((it, idx) => (
                  <View key={it.key} style={s.itemBox}>
                    <View style={s.itemHead}>
                      <Text style={s.itemNo}>{idx + 1}</Text>
                      {form.items.length > 1 ? (
                        <TouchableOpacity
                          onPress={() => removeItem(it.key)}
                          style={s.itemRemove}
                        >
                          <Text style={s.itemRemoveText}>✕</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <Text style={s.selectLabel}>Tayyor mahsulotni tanlang *</Text>
                    <StatusSelect
                      value={it.product_id ? String(it.product_id) : 'none'}
                      options={[
                        { id: 'none', label: '— Mahsulot tanlang —', color: colors.muted },
                        ...products.map((p) => ({
                          id: String(p.id),
                          label: `${str(p, 'name')} • Omborda: ${num(p.stock_count)} dona`,
                          color: num(p.stock_count) > 0 ? colors.green : colors.red,
                        })),
                      ]}
                      onChange={(v) => v !== 'none' && pickProduct(it.key, v)}
                      title="Mahsulotni tanlang"
                    />

                    {it.product_name ? (
                      <Text style={s.stockHint}>Omborda: {it.stock} dona</Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Oʻlchov"
                          value={it.measure}
                          onChange={(v) => updateItem(it.key, { measure: v })}
                          placeholder="Dona"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Miqdori"
                          value={it.quantity}
                          onChange={(v) => updateItem(it.key, { quantity: v })}
                          placeholder="0"
                          keyboard="numeric"
                        />
                      </View>
                      <View style={{ flex: 1.3 }}>
                        <Field
                          label="Narxi (soʻm)"
                          value={it.unit_price}
                          onChange={(v) => updateItem(it.key, { unit_price: v })}
                          placeholder="0"
                          keyboard="numeric"
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Jami */}
                <View style={s.totalBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.totalLabel}>Jami:</Text>
                    <Text style={s.totalQty}>{itemsTotalQty} dona</Text>
                  </View>
                  <Text style={s.totalSum}>{fmtMoney(itemsTotalSum)}</Text>
                </View>
              </View>

              {/* Pastki tugmalar */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Btn title="Bekor qilish" onPress={() => setModalVisible(false)} ghost />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Btn
                    title={editing ? 'Yangilash' : 'Yuk xatini saqlash'}
                    onPress={save}
                    busy={saving}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* === Yuk xati ko'rish modali — Rasmiy hujjat ko'rinishi === */}
      <Modal visible={!!viewing} animationType="slide" transparent>
        {viewing ? (
          <View style={s.overlay}>
            <View style={s.modal}>
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>Rasmiy yuk xati</Text>
                <TouchableOpacity onPress={() => setViewing(null)}>
                  <Text style={s.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* === Rasmiy hujjat qogʻozi (oq fon) === */}
                <View style={s.docSheet}>
                  {/* Header: Markaz sarlavhasi + o'ngda Order ID */}
                  <View style={s.docHeader}>
                    <View style={s.docHeaderCenter}>
                      <Text style={s.docTitle}>YUK XATI</Text>
                      <Text style={s.docSubtitle}>
                        №{' '}
                        {str(viewing, 'ttn_number').startsWith('TTN') ||
                        str(viewing, 'ttn_number').startsWith('№')
                          ? str(viewing, 'ttn_number')
                          : str(viewing, 'ttn_number')}{' '}
                        dan {str(viewing, 'issue_date')}
                      </Text>
                    </View>
                    <View style={s.docOrderBox}>
                      <Text style={s.docOrderLabel}>Buyurtma ID:</Text>
                      <Text style={s.docOrderValue}>
                        {str(viewing, 'custom_order_id') ||
                          str(viewing, 'order_number') ||
                          'Alohida'}
                      </Text>
                    </View>
                  </View>

                  {/* Chiqaruvchi/Qabul qiluvchi (ikki qora chiziq orasida) */}
                  <View style={s.docPartiesWrap}>
                    <View style={s.docPartyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.docPartyLabel}>Yuk joʻnatuvchi:</Text>
                        <Text style={s.docPartyValue}>
                          {str(viewing, 'sender_company') || '—'}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={s.docPartyLabel}>Tel:</Text>
                        <Text style={s.docPartyValue}>
                          {str(viewing, 'sender_phone') ||
                            (company ? str(company, 'phone') : '—')}
                        </Text>
                      </View>
                    </View>
                    <View style={[s.docPartyRow, { marginTop: 6 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.docPartyLabel}>Yuk qabul qiluvchi:</Text>
                        <Text style={s.docPartyValue}>
                          {str(viewing, 'receiver_company') || '—'}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={s.docPartyLabel}>Tel:</Text>
                        <Text style={s.docPartyValue}>
                          {str(viewing, 'receiver_phone') || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Jadval */}
                  <View style={s.docTable}>
                    {/* Jadval sarlavhasi */}
                    <View style={[s.docTableRow, s.docTableHeader]}>
                      <Text style={[s.docTableTh, { flex: 0.4 }]}>№</Text>
                      <Text style={[s.docTableTh, { flex: 2.5, textAlign: 'left' }]}>
                        Mahsulot nomi
                      </Text>
                      <Text style={[s.docTableTh, { flex: 0.9 }]}>Oʻlchov</Text>
                      <Text style={[s.docTableTh, { flex: 0.9, textAlign: 'right' }]}>
                        Miqdori
                      </Text>
                      <Text style={[s.docTableTh, { flex: 1.2, textAlign: 'right' }]}>
                        Narxi
                      </Text>
                      <Text style={[s.docTableTh, { flex: 1.4, textAlign: 'right' }]}>
                        Summasi
                      </Text>
                    </View>

                    {/* Mahsulot qatori — backend bitta satr qaytaradi */}
                    {(() => {
                      const qty = num(viewing.quantity);
                      const sum = num(viewing.total_sum);
                      const price = qty > 0 ? sum / qty : 0;
                      return (
                        <View style={s.docTableRow}>
                          <Text style={[s.docTableTd, { flex: 0.4 }]}>1</Text>
                          <Text
                            style={[s.docTableTd, { flex: 2.5, textAlign: 'left' }]}
                            numberOfLines={3}
                          >
                            {str(viewing, 'product_name') || '—'}
                          </Text>
                          <Text style={[s.docTableTd, { flex: 0.9 }]}>dona</Text>
                          <Text
                            style={[s.docTableTd, { flex: 0.9, textAlign: 'right', fontWeight: '800' }]}
                          >
                            {qty.toLocaleString('uz-UZ')}
                          </Text>
                          <Text
                            style={[s.docTableTd, { flex: 1.2, textAlign: 'right' }]}
                          >
                            {price.toLocaleString('uz-UZ', { maximumFractionDigits: 2 })}
                          </Text>
                          <Text
                            style={[s.docTableTd, { flex: 1.4, textAlign: 'right', fontWeight: '800' }]}
                          >
                            {sum.toLocaleString('uz-UZ')}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* Jami qator */}
                    <View style={[s.docTableRow, s.docTableTotal]}>
                      <Text
                        style={[s.docTableTd, { flex: 3.8, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }]}
                      >
                        JAMI
                      </Text>
                      <Text
                        style={[s.docTableTd, { flex: 0.9, textAlign: 'right', fontWeight: '900' }]}
                      >
                        {num(viewing.quantity).toLocaleString('uz-UZ')}
                      </Text>
                      <Text
                        style={[s.docTableTd, { flex: 1.2, textAlign: 'center', color: '#999' }]}
                      >
                        —
                      </Text>
                      <Text
                        style={[s.docTableTd, { flex: 1.4, textAlign: 'right', fontWeight: '900' }]}
                      >
                        {num(viewing.total_sum).toLocaleString('uz-UZ')}
                      </Text>
                    </View>
                  </View>

                  {/* Imzo joylari */}
                  <View style={s.docSignatures}>
                    <View style={s.docSignCol}>
                      <View style={s.docSignLine}>
                        <Text style={s.docSignLabel}>Berdim / Topshirdi:</Text>
                      </View>
                      <Text style={s.docSignHint}>Imzo: _____________</Text>
                    </View>
                    <View style={s.docSignCol}>
                      <View style={s.docSignLine}>
                        <Text style={s.docSignLabel}>Oldim / Qabul qildi:</Text>
                      </View>
                      <Text style={s.docSignHint}>Imzo: _____________</Text>
                    </View>
                  </View>
                </View>

                {/* === Harakat tugmalari === */}
                <View style={s.viewActions}>
                  <TouchableOpacity
                    style={s.printBtn}
                    onPress={() => viewing && sharePrint(viewing)}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 18 }}>🖨</Text>
                    <Text style={s.printBtnText}>Chop etish</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.downloadBtn}
                    onPress={() => viewing && shareText(viewing)}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 18 }}>📥</Text>
                    <Text style={s.downloadBtnText}>Yuklab olish</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 10, marginBottom: 20 }}>
                  <Btn title="Yopish" onPress={() => setViewing(null)} ghost />
                </View>
              </ScrollView>
            </View>
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
};


const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pageHint: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 12,
      lineHeight: 17,
    },
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
    chipActive: { backgroundColor: colors.gold + '22', borderColor: colors.gold },
    chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: colors.gold, fontWeight: '800' },
    hintUnderPeriod: {
      color: colors.faint,
      fontSize: 11,
      marginTop: 8,
      lineHeight: 16,
    },
    foundText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 10,
      marginBottom: 10,
      fontWeight: '700',
    },

    kpiRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    kpiBig: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    kpiFull: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
    },
    kpiLabel: {
      color: colors.muted,
      fontSize: 11,
      marginBottom: 6,
      fontWeight: '700',
    },
    kpiValueBig: { fontSize: 18, fontWeight: '900' },
    kpiNote: { color: colors.faint, fontSize: 10, marginTop: 5 },

    filterRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'stretch',
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

    // Status select
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

    // Yuk xati kartasi
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    ttnNo: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    catChip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
    },
    catChipText: { fontSize: 10, fontWeight: '800' },
    company: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 2,
    },
    driverLine: { color: colors.text, fontSize: 12, marginTop: 4 },

    amountRow: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 10 },
    amountBox: {
      flex: 1,
      backgroundColor: colors.bg,
      borderRadius: 10,
      padding: 10,
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
      marginBottom: 4,
    },
    amountVal: { color: colors.text, fontSize: 12, fontWeight: '900' },

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

    // Modal
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
    // Rasmiy hujjat (OfficialWaybillSheet) — web dagi aniq nusxasi
    docSheet: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#000000',
      paddingTop: 16,
      paddingBottom: 20,
      paddingLeft: 12,
      paddingRight: 10,
      marginBottom: 14,
    },
    docHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    docHeaderCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 60,
    },
    docTitle: {
      color: '#000000',
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: 2,
    },
    docSubtitle: {
      color: '#000000',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
      textAlign: 'center',
    },
    docOrderBox: {
      borderWidth: 1,
      borderColor: '#000000',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: '#FAFAF7',
      position: 'absolute',
      right: 0,
      top: 0,
      minWidth: 85,
      alignItems: 'flex-end',
    },
    docOrderLabel: {
      fontSize: 8,
      color: '#666',
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    docOrderValue: {
      fontSize: 11,
      color: '#000',
      fontWeight: '900',
      marginTop: 2,
    },
    docPartiesWrap: {
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderColor: '#000',
      paddingVertical: 8,
      marginBottom: 12,
    },
    docPartyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    docPartyLabel: {
      fontSize: 10,
      color: '#000',
      fontWeight: '900',
      marginBottom: 2,
    },
    docPartyValue: {
      fontSize: 12,
      color: '#000',
      fontWeight: '600',
    },
    docTable: {
      borderWidth: 1,
      borderColor: '#000',
      marginBottom: 24,
    },
    docTableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: '#000',
    },
    docTableHeader: { backgroundColor: '#F3EEE4' },
    docTableTh: {
      fontSize: 9,
      fontWeight: '900',
      color: '#000',
      textAlign: 'center',
      paddingVertical: 6,
      paddingHorizontal: 3,
      borderRightWidth: 1,
      borderColor: '#000',
    },
    docTableTd: {
      fontSize: 11,
      color: '#000',
      textAlign: 'center',
      paddingVertical: 6,
      paddingHorizontal: 3,
      borderRightWidth: 1,
      borderColor: '#000',
    },
    docTableTotal: { backgroundColor: '#FAFAF4', borderTopWidth: 2 },
    docSignatures: {
      flexDirection: 'row',
      gap: 20,
      marginTop: 10,
    },
    docSignCol: { flex: 1 },
    docSignLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: '#000',
      paddingBottom: 6,
    },
    docSignLabel: { fontSize: 10, color: '#000', fontWeight: '900' },
    docSignHint: {
      fontSize: 9,
      color: '#666',
      fontStyle: 'italic',
      marginTop: 4,
    },

    viewActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 4,
    },
    printBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.blue + '22',
      borderWidth: 1,
      borderColor: colors.blue + '66',
      paddingVertical: 12,
      borderRadius: 12,
    },
    printBtnText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
    downloadBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.green + '22',
      borderWidth: 1,
      borderColor: colors.green + '66',
      paddingVertical: 12,
      borderRadius: 12,
    },
    downloadBtnText: { color: colors.green, fontSize: 13, fontWeight: '800' },

    // Modal section box'lari
    sectionBox: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
    },
    sectionBoxTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    sectionBoxTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionBoxHint: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 2,
      marginBottom: 10,
    },
    selectLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 6,
    },
    autoBadge: {
      backgroundColor: colors.green + '22',
      borderWidth: 1,
      borderColor: colors.green + '66',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    autoBadgeText: { color: colors.green, fontSize: 10, fontWeight: '800' },
    autoFieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    autoFieldLabel: {
      color: colors.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '800',
    },
    autoFieldHint: { color: colors.green, fontSize: 10, fontWeight: '800' },
    quickPickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gold + '22',
      borderWidth: 1,
      borderColor: colors.gold + '66',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    quickPickText: { color: colors.gold, fontSize: 13, fontWeight: '800' },
    addItemBtn: {
      backgroundColor: colors.gold + '22',
      borderWidth: 1,
      borderColor: colors.gold + '66',
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    addItemBtnText: { color: colors.gold, fontSize: 11, fontWeight: '800' },

    itemBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    itemHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    itemNo: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.gold + '22',
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: 24,
    },
    itemRemove: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.red + '22',
      borderWidth: 1,
      borderColor: colors.red + '66',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemRemoveText: { color: colors.red, fontSize: 14, fontWeight: '900' },
    stockHint: {
      color: colors.green,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 6,
    },
    totalBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gold + '22',
      borderWidth: 1,
      borderColor: colors.gold + '66',
      borderRadius: 12,
      padding: 12,
      marginTop: 4,
    },
    totalLabel: {
      color: colors.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '800',
    },
    totalQty: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      marginTop: 2,
    },
    totalSum: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: '900',
    },
    subGroup: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 10,
      marginBottom: 6,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
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
