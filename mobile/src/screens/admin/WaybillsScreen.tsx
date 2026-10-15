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
import { colors } from '../../theme';

type Waybill = Record<string, unknown>;

const QUICK_STATUSES = ['kutilmoqda', 'yo_lda', 'yetkazildi'] as const;

const STATUS_LABEL: Record<string, string> = {
  kutilmoqda: 'Kutilmoqda',
  yo_lda: "Yo'lda",
  yetkazildi: 'Yetkazildi',
};

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const idOf = (o: Waybill): string => str(o.id);
const numOf = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

const emptyForm = {
  ttn_number: '',
  order_number: '',
  category: 'sotuv',
  sender_company: '',
  sender_phone: '',
  sender_address: '',
  receiver_company: '',
  receiver_phone: '',
  receiver_address: '',
  driver_name: '',
  vehicle_plate: '',
  vehicle_model: '',
};

export const WaybillsScreen: React.FC = () => {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Waybill | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusBusy, setStatusBusy] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.waybills.list();
      setWaybills(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuk xatlari yuklanmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const presentStatuses = useMemo(() => {
    const set = new Set<string>();
    waybills.forEach((w) => {
      const st = str(w.status);
      if (st) set.add(st);
    });
    QUICK_STATUSES.forEach((s) => {
      if (!set.has(s)) set.add(s);
    });
    return Array.from(set);
  }, [waybills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return waybills.filter((w) => {
      if (statusFilter !== 'all' && str(w.status) !== statusFilter) return false;
      if (!q) return true;
      return (
        str(w.ttn_number).toLowerCase().includes(q) ||
        str(w.receiver_company).toLowerCase().includes(q)
      );
    });
  }, [waybills, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (w: Waybill) => {
    setEditing(w);
    setForm({
      ttn_number: str(w.ttn_number),
      order_number: str(w.order_number),
      category: str(w.category) === 'xarid' ? 'xarid' : 'sotuv',
      sender_company: str(w.sender_company),
      sender_phone: str(w.sender_phone),
      sender_address: str(w.sender_address),
      receiver_company: str(w.receiver_company),
      receiver_phone: str(w.receiver_phone),
      receiver_address: str(w.receiver_address),
      driver_name: str(w.driver_name),
      vehicle_plate: str(w.vehicle_plate),
      vehicle_model: str(w.vehicle_model),
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.ttn_number.trim()) {
      setFormError('TTN raqamini kiriting.');
      return;
    }
    const body: Record<string, unknown> = {
      ttn_number: form.ttn_number.trim(),
      category: form.category,
      sender_company: form.sender_company.trim(),
      sender_phone: form.sender_phone.trim(),
      sender_address: form.sender_address.trim(),
      receiver_company: form.receiver_company.trim(),
      receiver_phone: form.receiver_phone.trim(),
      receiver_address: form.receiver_address.trim(),
      driver_name: form.driver_name.trim(),
      vehicle_plate: form.vehicle_plate.trim(),
      vehicle_model: form.vehicle_model.trim(),
    };
    if (form.order_number.trim()) body.order_number = form.order_number.trim();
    setSaving(true);
    try {
      if (editing) {
        await api.waybills.update(idOf(editing), body);
      } else {
        await api.waybills.create(body);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (w: Waybill) => {
    Alert.alert(
      "O'chirish",
      `${str(w.ttn_number)} yuk xati o'chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.waybills.remove(idOf(w));
              await load();
            } catch (e) {
              Alert.alert(
                'Xatolik',
                e instanceof Error ? e.message : "O'chirishda xatolik.",
              );
            }
          },
        },
      ],
    );
  };

  const quickStatus = async (w: Waybill, next: string) => {
    const wid = idOf(w);
    setStatusBusy(wid + next);
    try {
      await api.waybills.changeStatus(wid, next);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : "Status o'zgarmadi.");
    } finally {
      setStatusBusy('');
    }
  };

  const setF = (k: keyof typeof emptyForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <Loader />;

  const renderItem = ({ item }: { item: Waybill }) => {
    const st = str(item.status) || 'kutilmoqda';
    const wid = idOf(item);
    return (
      <Card>
        <View style={s.row}>
          <Text style={s.ttn}>{str(item.ttn_number) || '—'}</Text>
          <Text style={s.badge}>{STATUS_LABEL[st] ?? st}</Text>
        </View>
        {str(item.order_number) ? (
          <Text style={s.order}>Buyurtma: {str(item.order_number)}</Text>
        ) : null}
        <Text style={s.route}>
          {str(item.sender_company) || '—'} → {str(item.receiver_company) || '—'}
        </Text>
        <Text style={s.sub}>
          Haydovchi: {str(item.driver_name) || '—'}
          {str(item.vehicle_plate) ? ` • ${str(item.vehicle_plate)}` : ''}
        </Text>
        <Text style={s.sub}>
          {str(item.category) === 'xarid' ? 'Xarid' : 'Sotuv'} • Mahsulotlar: {numOf(item.items)}
        </Text>
        {str(item.created_at) ? (
          <Text style={s.date}>{str(item.created_at).slice(0, 10)}</Text>
        ) : null}
        <View style={s.statusBtns}>
          {QUICK_STATUSES.map((name) => (
            <TouchableOpacity
              key={name}
              style={[s.chip, st === name && s.chipActive]}
              onPress={() => quickStatus(item, name)}
              disabled={statusBusy === wid + name}
            >
              <Text style={[s.chipText, st === name && s.chipTextActive]}>
                {STATUS_LABEL[name]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
            <Text style={s.editText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(item)}>
            <Text style={s.delText}>O'chirish</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <H1>Yuk xatlari</H1>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addText}>+ Qo'shish</Text>
        </TouchableOpacity>
      </View>
      <Field
        label="Qidiruv"
        value={search}
        onChange={setSearch}
        placeholder="TTN yoki qabul qiluvchi..."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        <TouchableOpacity
          style={[s.chip, statusFilter === 'all' && s.chipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[s.chipText, statusFilter === 'all' && s.chipTextActive]}>
            Barchasi
          </Text>
        </TouchableOpacity>
        {presentStatuses.map((name) => (
          <TouchableOpacity
            key={name}
            style={[s.chip, statusFilter === name && s.chipActive]}
            onPress={() => setStatusFilter(name)}
          >
            <Text style={[s.chipText, statusFilter === name && s.chipTextActive]}>
              {STATUS_LABEL[name] ?? name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
        ListEmptyComponent={<Empty text="Yuk xatlari topilmadi." />}
      />
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>
                {editing ? 'Yuk xatini tahrirlash' : 'Yangi yuk xati'}
              </Text>
              <Field label="TTN raqami" value={form.ttn_number} onChange={setF('ttn_number')} placeholder="TTN-001" />
              <Field label="Buyurtma raqami" value={form.order_number} onChange={setF('order_number')} placeholder="ORD-001" />
              <Text style={s.label}>Kategoriya</Text>
              <View style={s.catRow}>
                {(['sotuv', 'xarid'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, form.category === c && s.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, category: c }))}
                  >
                    <Text style={[s.chipText, form.category === c && s.chipTextActive]}>
                      {c === 'sotuv' ? 'Sotuv' : 'Xarid'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Jo'natuvchi kompaniya" value={form.sender_company} onChange={setF('sender_company')} placeholder="Jo'natuvchi" />
              <Field label="Jo'natuvchi telefoni" value={form.sender_phone} onChange={setF('sender_phone')} placeholder="+998 ..." keyboard="phone-pad" />
              <Field label="Jo'natuvchi manzili" value={form.sender_address} onChange={setF('sender_address')} placeholder="Manzil" multiline />
              <Field label="Qabul qiluvchi kompaniya" value={form.receiver_company} onChange={setF('receiver_company')} placeholder="Qabul qiluvchi" />
              <Field label="Qabul qiluvchi telefoni" value={form.receiver_phone} onChange={setF('receiver_phone')} placeholder="+998 ..." keyboard="phone-pad" />
              <Field label="Qabul qiluvchi manzili" value={form.receiver_address} onChange={setF('receiver_address')} placeholder="Manzil" multiline />
              <Field label="Haydovchi" value={form.driver_name} onChange={setF('driver_name')} placeholder="F.I.Sh." />
              <Field label="Avto raqami" value={form.vehicle_plate} onChange={setF('vehicle_plate')} placeholder="01 A 123 AA" />
              <Field label="Avto modeli" value={form.vehicle_model} onChange={setF('vehicle_model')} placeholder="Model" />
              {formError ? <Text style={s.error}>{formError}</Text> : null}
              <Btn title={editing ? 'Saqlash' : "Qo'shish"} onPress={submit} busy={saving} />
              <Btn title="Bekor qilish" onPress={() => setModalOpen(false)} ghost />
            </ScrollView>
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
  filterRow: { marginBottom: 8, flexGrow: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ttn: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  badge: { color: colors.gold, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  order: { color: colors.muted, fontSize: 13, marginTop: 4 },
  route: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  date: { color: colors.faint, fontSize: 12, marginTop: 2 },
  chip: {
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#000' },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
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
  catRow: { flexDirection: 'row', marginBottom: 4 },
});
