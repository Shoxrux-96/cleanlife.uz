import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Card, Empty, Field, H1, Loader } from '../../components';
import { colors, fmtMoney } from '../../theme';

type Order = Record<string, unknown>;

const STATUSES = ['yangi', 'jarayonda', 'tayyor', 'yetkazildi', 'bekor_qilindi'] as const;

const STATUS_LABEL: Record<string, string> = {
  yangi: 'Yangi',
  jarayonda: 'Jarayonda',
  tayyor: 'Tayyor',
  yetkazildi: 'Yetkazildi',
  bekor_qilindi: 'Bekor qilingan',
};

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const idOf = (o: Order): string => str(o.id);
const statusOf = (o: Order): string => str(o.status) || 'yangi';

const emptyForm = {
  client_name: '',
  phone: '',
  product_name: '',
  quantity: '',
  total_amount: '',
  status: 'yangi',
};

export const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusBusyId, setStatusBusyId] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.orders.list();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Buyurtmalar yuklanmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => str(o.client_name).toLowerCase().includes(q));
  }, [orders, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditing(o);
    setForm({
      client_name: str(o.client_name),
      phone: str(o.phone),
      product_name: str(o.product_name),
      quantity: str(o.quantity),
      total_amount: str(o.total_amount),
      status: statusOf(o),
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.client_name.trim()) {
      setFormError('Mijoz ismini kiriting.');
      return;
    }
    if (!form.product_name.trim()) {
      setFormError('Mahsulot nomini kiriting.');
      return;
    }
    const quantity = form.quantity.trim() === '' ? 0 : Number(form.quantity);
    const total = form.total_amount.trim() === '' ? 0 : Number(form.total_amount);
    if (Number.isNaN(quantity) || Number.isNaN(total)) {
      setFormError('Miqdor va summa raqam bo‘lishi kerak.');
      return;
    }
    const body: Record<string, unknown> = {
      client_name: form.client_name.trim(),
      phone: form.phone.trim(),
      product_name: form.product_name.trim(),
      quantity,
      total_amount: total,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.orders.update(idOf(editing), body);
      } else {
        await api.orders.create(body);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (o: Order) => {
    Alert.alert(
      'O‘chirish',
      `${str(o.client_name)} buyurtmasi o‘chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O‘chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.orders.remove(idOf(o));
              await load();
            } catch (e) {
              Alert.alert(
                'Xatolik',
                e instanceof Error ? e.message : 'O‘chirishda xatolik.',
              );
            }
          },
        },
      ],
    );
  };

  const quickStatus = async (o: Order, next: string) => {
    const oid = idOf(o);
    setStatusBusyId(oid + next);
    try {
      await api.orders.changeStatus(oid, next);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Status o‘zgarmadi.');
    } finally {
      setStatusBusyId('');
    }
  };

  const setF = (k: keyof typeof emptyForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <Loader />;

  const renderItem = ({ item }: { item: Order }) => {
    const st = statusOf(item);
    return (
      <Card>
        <View style={s.row}>
          <Text style={s.client}>{str(item.client_name) || '—'}</Text>
          <Text style={s.status}>{STATUS_LABEL[st] ?? st}</Text>
        </View>
        <Text style={s.product}>
          {str(item.product_name) || '—'} • {str(item.quantity) || '0'} dona
        </Text>
        <Text style={s.money}>{fmtMoney(str(item.total_amount) || 0)}</Text>
        {str(item.order_date) ? (
          <Text style={s.date}>{str(item.order_date)}</Text>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statusRow}>
          {STATUSES.map((stName) => (
            <TouchableOpacity
              key={stName}
              style={[s.chip, st === stName && s.chipActive]}
              onPress={() => quickStatus(item, stName)}
              disabled={statusBusyId === idOf(item) + stName}
            >
              <Text style={[s.chipText, st === stName && s.chipTextActive]}>
                {STATUS_LABEL[stName]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.actions}>
          <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
            <Text style={s.editText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(item)}>
            <Text style={s.delText}>O‘chirish</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <H1>Buyurtmalar</H1>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addText}>+ Qo‘shish</Text>
        </TouchableOpacity>
      </View>
      <Field
        label="Qidiruv"
        value={search}
        onChange={setSearch}
        placeholder="Mijoz ismi bo‘yicha..."
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => idOf(item) || String(i)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={<Empty text="Buyurtmalar topilmadi." />}
      />
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {editing ? 'Buyurtmani tahrirlash' : 'Yangi buyurtma'}
            </Text>
            <Field label="Mijoz ismi" value={form.client_name} onChange={setF('client_name')} placeholder="Mijoz F.I.Sh." />
            <Field label="Telefon" value={form.phone} onChange={setF('phone')} placeholder="+998 ..." keyboard="phone-pad" />
            <Field label="Mahsulot" value={form.product_name} onChange={setF('product_name')} placeholder="Mahsulot nomi" />
            <Field label="Miqdori" value={form.quantity} onChange={setF('quantity')} placeholder="0" keyboard="numeric" />
            <Field label="Jami summa" value={form.total_amount} onChange={setF('total_amount')} placeholder="0" keyboard="numeric" />
            <Text style={s.label}>Holat</Text>
            <View style={s.statusPick}>
              {STATUSES.map((stName) => (
                <TouchableOpacity
                  key={stName}
                  style={[s.chip, form.status === stName && s.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, status: stName }))}
                >
                  <Text style={[s.chipText, form.status === stName && s.chipTextActive]}>
                    {STATUS_LABEL[stName]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {formError ? <Text style={s.error}>{formError}</Text> : null}
            <Btn title={editing ? 'Saqlash' : 'Qo‘shish'} onPress={submit} busy={saving} />
            <Btn title="Bekor qilish" onPress={() => setModalOpen(false)} ghost />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 12,
  },
  addText: { color: '#000', fontWeight: '800', fontSize: 14 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  client: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  status: { color: colors.gold, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  product: { color: colors.muted, fontSize: 13, marginTop: 4 },
  money: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  date: { color: colors.faint, fontSize: 12, marginTop: 2 },
  statusRow: { marginTop: 10 },
  chip: {
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#000' },
  actions: { flexDirection: 'row', marginTop: 10, gap: 10 },
  editBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editText: { color: colors.gold, fontWeight: '700' },
  delBtn: {
    flex: 1,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  delText: { color: colors.red, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '92%',
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusPick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
