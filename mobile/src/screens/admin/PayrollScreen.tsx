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
import { Btn, Card, Empty, Field, H1, Loader, Muted } from '../../components';
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;

const PAYROLL_STATUSES = ['hisoblangan', 'tasdiqlangan', 'tolangan'] as const;

const STATUS_LABEL: Record<string, string> = {
  hisoblangan: 'Hisoblangan',
  tasdiqlangan: 'Tasdiqlangan',
  tolangan: "To'langan",
  kutilmoqda: 'Kutilmoqda',
};

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const idOf = (o: Rec): string => str(o.id);
const money = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(str(v));
  return fmtMoney(Number.isNaN(n) ? 0 : n);
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  employee_id: '',
  employee_name: '',
  month: currentMonth(),
  base_salary: '',
  bonus_amount: '',
  deductions: '',
  status: 'hisoblangan',
};

export const PayrollScreen: React.FC = () => {
  const [month, setMonth] = useState(currentMonth());
  const [payrolls, setPayrolls] = useState<Rec[]>([]);
  const [payments, setPayments] = useState<Rec[]>([]);
  const [employees, setEmployees] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [pr, pay, emp] = await Promise.all([
          api.payroll.list(),
          api.salaryPayments.list(month.trim() || undefined),
          api.employees.list().catch(() => [] as Rec[]),
        ]);
        setPayrolls(pr);
        setPayments(pay);
        setEmployees(emp);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Oyliklar yuklanmadi.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month],
  );

  useEffect(() => {
    load();
  }, []);

  const filteredPayrolls = useMemo(() => {
    const m = month.trim();
    if (!m) return payrolls;
    return payrolls.filter((p) => str(p.month).slice(0, 7) === m);
  }, [payrolls, month]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, month: month.trim() || currentMonth() });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (p: Rec) => {
    setEditing(p);
    setForm({
      employee_id: str(p.employee_id),
      employee_name: str(p.employee_name),
      month: str(p.month).slice(0, 7) || currentMonth(),
      base_salary: str(p.base_salary),
      bonus_amount: str(p.bonus_amount),
      deductions: str(p.deductions),
      status: str(p.status) || 'hisoblangan',
    });
    setFormError('');
    setModalOpen(true);
  };

  const pickEmployee = (e: Rec) => {
    setForm((f) => ({
      ...f,
      employee_id: str(e.id),
      employee_name: str(e.full_name) || str(e.name),
    }));
  };

  const submit = async () => {
    setFormError('');
    if (!form.employee_name.trim()) {
      setFormError('Xodim ismini kiriting yoki tanlang.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.month.trim())) {
      setFormError('Oy formati YYYY-MM bo‘lishi kerak.');
      return;
    }
    const base = form.base_salary.trim() === '' ? 0 : Number(form.base_salary);
    const bonus = form.bonus_amount.trim() === '' ? 0 : Number(form.bonus_amount);
    const ded = form.deductions.trim() === '' ? 0 : Number(form.deductions);
    if (Number.isNaN(base) || Number.isNaN(bonus) || Number.isNaN(ded)) {
      setFormError('Summa maydonlari raqam bo‘lishi kerak.');
      return;
    }
    const body: Record<string, unknown> = {
      employee_name: form.employee_name.trim(),
      month: form.month.trim(),
      base_salary: base,
      bonus_amount: bonus,
      deductions: ded,
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
        await api.payroll.update(idOf(editing), body);
      } else {
        await api.payroll.create(body);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (p: Rec) => {
    Alert.alert(
      "O'chirish",
      `${str(p.employee_name)} (${str(p.month).slice(0, 7)}) yozuvi o'chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.payroll.remove(idOf(p));
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

  const renderPayroll = ({ item }: { item: Rec }) => {
    const st = str(item.status) || 'hisoblangan';
    return (
      <Card>
        <View style={s.row}>
          <Text style={s.name}>{str(item.employee_name) || '—'}</Text>
          <Text style={s.status}>{STATUS_LABEL[st] ?? st}</Text>
        </View>
        <Text style={s.sub}>
          {str(item.position) ? `${str(item.position)} • ` : ''}{str(item.month).slice(0, 7)}
        </Text>
        <Text style={s.sub}>Asosiy: {money(item.base_salary)}</Text>
        <Text style={s.sub}>Bonus: {money(item.bonus_amount)}</Text>
        <Text style={s.sub}>Ushlanma: {money(item.deductions)}</Text>
        <Text style={s.net}>Sof: {money(item.net_salary)}</Text>
        {str(item.payment_date) ? (
          <Text style={s.date}>{str(item.payment_date).slice(0, 10)}</Text>
        ) : null}
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

  const header = (
    <>
      <View style={s.monthRow}>
        <View style={s.monthInput}>
          <Field
            label="Oy (YYYY-MM)"
            value={month}
            onChange={setMonth}
            placeholder="2026-10"
          />
        </View>
        <TouchableOpacity
          style={s.nowBtn}
          onPress={() => setMonth(currentMonth())}
        >
          <Text style={s.nowText}>Hozirgi oy</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={s.applyBtn} onPress={() => load(true)}>
        <Text style={s.applyText}>Yuklash</Text>
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Text style={s.section}>To'lovlar ({month.trim() || 'barchasi'})</Text>
      {payments.length === 0 ? (
        <Muted>Bu oy uchun to'lovlar topilmadi.</Muted>
      ) : (
        payments.map((p, i) => (
          <Card key={str(p.id) || `pay-${i}`}>
            <View style={s.row}>
              <Text style={s.name}>{str(p.employee_name) || '—'}</Text>
              <Text style={s.net}>{money(p.amount)}</Text>
            </View>
            <Text style={s.sub}>
              {str(p.month).slice(0, 7)} • {STATUS_LABEL[str(p.status)] ?? str(p.status) ?? '—'}
            </Text>
          </Card>
        ))
      )}
      <View style={s.sectionRow}>
        <Text style={s.section}>Hisob-kitoblar</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addText}>+ Qo'shish</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={s.wrap}>
      <H1>Oyliklar</H1>
      <FlatList
        data={filteredPayrolls}
        keyExtractor={(item, i) => idOf(item) || String(i)}
        renderItem={renderPayroll}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={<Empty text="Hisob-kitoblar topilmadi." />}
      />
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>
                {editing ? 'Hisobni tahrirlash' : 'Yangi hisob'}
              </Text>
              {employees.length > 0 ? (
                <>
                  <Text style={s.label}>Xodimni tanlash</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.empRow}>
                    {employees.map((e, i) => {
                      const selected = form.employee_id === str(e.id);
                      return (
                        <TouchableOpacity
                          key={str(e.id) || `emp-${i}`}
                          style={[s.chip, selected && s.chipActive]}
                          onPress={() => pickEmployee(e)}
                        >
                          <Text style={[s.chipText, selected && s.chipTextActive]}>
                            {str(e.full_name) || str(e.name) || `#${str(e.id)}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
              <Field label="Xodim ID" value={form.employee_id} onChange={setF('employee_id')} placeholder="1" keyboard="numeric" />
              <Field label="Xodim ismi" value={form.employee_name} onChange={setF('employee_name')} placeholder="F.I.Sh." />
              <Field label="Oy (YYYY-MM)" value={form.month} onChange={setF('month')} placeholder="2026-10" />
              <Field label="Asosiy oylik" value={form.base_salary} onChange={setF('base_salary')} placeholder="0" keyboard="numeric" />
              <Field label="Bonus" value={form.bonus_amount} onChange={setF('bonus_amount')} placeholder="0" keyboard="numeric" />
              <Field label="Ushlanmalar" value={form.deductions} onChange={setF('deductions')} placeholder="0" keyboard="numeric" />
              <Text style={s.label}>Holat</Text>
              <View style={s.statusPick}>
                {PAYROLL_STATUSES.map((name) => (
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
  monthRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  monthInput: { flex: 1 },
  nowBtn: {
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  nowText: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  applyBtn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  applyText: { color: '#000', fontWeight: '800', fontSize: 15 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  section: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addBtn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 8,
  },
  addText: { color: '#000', fontWeight: '800', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  status: { color: colors.gold, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  net: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  date: { color: colors.faint, fontSize: 12, marginTop: 2 },
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
  empRow: { marginBottom: 8, flexGrow: 0 },
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
