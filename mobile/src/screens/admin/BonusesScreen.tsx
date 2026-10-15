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

type Bonus = Record<string, unknown>;

const BONUS_STATUSES = ['kutilmoqda', 'tasdiqlangan', 'tolangan'] as const;

const STATUS_LABEL: Record<string, string> = {
  kutilmoqda: 'Kutilmoqda',
  tasdiqlangan: 'Tasdiqlangan',
  tolangan: "To'langan",
  bekor_qilindi: 'Bekor qilingan',
};

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const idOf = (o: Bonus): string => str(o.id);
const money = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(str(v));
  return fmtMoney(Number.isNaN(n) ? 0 : n);
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  employee_id: '',
  employee_name: '',
  amount: '',
  reason: '',
  month: currentMonth(),
  status: 'kutilmoqda',
};

export const BonusesScreen: React.FC = () => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bonus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.bonuses.list();
      setBonuses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bonuslar yuklanmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const m = monthFilter.trim();
    if (!m) return bonuses;
    return bonuses.filter((b) => str(b.month).slice(0, 7) === m);
  }, [bonuses, monthFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, month: monthFilter.trim() || currentMonth() });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (b: Bonus) => {
    setEditing(b);
    setForm({
      employee_id: str(b.employee_id),
      employee_name: str(b.employee_name),
      amount: str(b.amount),
      reason: str(b.reason) || str(b.category),
      month: str(b.month).slice(0, 7) || currentMonth(),
      status: str(b.status) || 'kutilmoqda',
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.employee_name.trim()) {
      setFormError('Xodim ismini kiriting.');
      return;
    }
    const amount = form.amount.trim() === '' ? NaN : Number(form.amount);
    if (Number.isNaN(amount)) {
      setFormError('Summa raqam bo‘lishi kerak.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.month.trim())) {
      setFormError('Oy formati YYYY-MM bo‘lishi kerak.');
      return;
    }
    if (!form.reason.trim()) {
      setFormError('Sababni kiriting.');
      return;
    }
    const body: Record<string, unknown> = {
      employee_name: form.employee_name.trim(),
      amount,
      reason: form.reason.trim(),
      month: form.month.trim(),
      status: form.status,
    };
    if (form.employee_id.trim() !== '') {
      const eid = Number(form.employee_id);
      if (Number.isNaN(eid)) {
        setFormError('Xodim ID raqam bo‘lishi kerak.');
        return;
      }
      body.employee_id = eid;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.bonuses.update(idOf(editing), body);
      } else {
        await api.bonuses.create(body);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (b: Bonus) => {
    Alert.alert(
      "O'chirish",
      `${str(b.employee_name)} bonusi (${money(b.amount)}) o'chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.bonuses.remove(idOf(b));
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

  const setF = (k: keyof typeof emptyForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <Loader />;

  const renderItem = ({ item }: { item: Bonus }) => {
    const st = str(item.status) || 'kutilmoqda';
    return (
      <Card>
        <View style={s.row}>
          <Text style={s.name}>{str(item.employee_name) || '—'}</Text>
          <Text style={s.amount}>{money(item.amount)}</Text>
        </View>
        <Text style={s.reason}>{str(item.reason) || str(item.category) || '—'}</Text>
        <Text style={s.sub}>
          {str(item.month).slice(0, 7) || '—'} • {STATUS_LABEL[st] ?? st}
        </Text>
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
        <H1>Bonuslar</H1>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addText}>+ Qo'shish</Text>
        </TouchableOpacity>
      </View>
      <Field
        label="Oy filtri (YYYY-MM)"
        value={monthFilter}
        onChange={setMonthFilter}
        placeholder="Bo'sh = barchasi"
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
        ListEmptyComponent={<Empty text="Bonuslar topilmadi." />}
      />
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>
                {editing ? 'Bonusni tahrirlash' : 'Yangi bonus'}
              </Text>
              <Field label="Xodim ID" value={form.employee_id} onChange={setF('employee_id')} placeholder="1" keyboard="numeric" />
              <Field label="Xodim ismi" value={form.employee_name} onChange={setF('employee_name')} placeholder="F.I.Sh." />
              <Field label="Summa" value={form.amount} onChange={setF('amount')} placeholder="0" keyboard="numeric" />
              <Field label="Sabab / kategoriya" value={form.reason} onChange={setF('reason')} placeholder="Sabab" multiline />
              <Field label="Oy (YYYY-MM)" value={form.month} onChange={setF('month')} placeholder="2026-10" />
              <Text style={s.label}>Holat</Text>
              <View style={s.statusPick}>
                {BONUS_STATUSES.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[s.chip, form.status === name && s.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, status: name }))}
                  >
                    <Text style={[s.chipText, form.status === name && s.chipTextActive]}>
                      {STATUS_LABEL[name]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  amount: { color: colors.gold, fontSize: 15, fontWeight: '800', marginLeft: 8 },
  reason: { color: colors.text, fontSize: 14, marginTop: 4 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
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
  statusPick: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
});
