import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Loader, Muted, Screen } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const idOf = (o: Rec): string => str(o, 'id');
const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const currentYm = (): string => todayIso().slice(0, 7);

// ----- KPI types / statuses -----
const KPI_TYPES = [
  'Rejani ortigʻi bilan bajarish',
  'Brak foizini kamaytirish',
  'Tezkor sifatli yetkazish',
  'Mehnat intizomi va tashabbus',
  'Mijoz topgani uchun',
] as const;

type SelectOption = { value: string; label: string; color?: string };

// ----- Reusable Select -----
const Select: React.FC<{
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  colors: Palette;
  disabled?: boolean;
}> = ({ value, options, onChange, placeholder, colors, disabled }) => {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  const tint = cur?.color || colors.text;
  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: cur?.color ? cur.color + '66' : colors.cardBorder,
          backgroundColor: cur?.color ? cur.color + '18' : colors.input,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text style={{ color: tint, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {cur?.label || placeholder || 'Tanlang'}
        </Text>
        <Text style={{ color: tint, fontSize: 10 }}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 6,
              maxHeight: '80%',
            }}
          >
            <ScrollView>
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={{
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: selected ? (opt.color || colors.gold) + '22' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: opt.color || colors.text,
                        fontSize: 14,
                        fontWeight: selected ? '800' : '600',
                      }}
                    >
                      {selected ? '✓ ' : ''}
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// ----- Native date input (web only) -----
const WebDateIcon: React.FC<{
  value: string;
  onChange: (v: string) => void;
  type: 'date' | 'month' | 'year';
  tint: string;
}> = ({ value, onChange, type, tint }) => {
  const inputRef = React.useRef<any>(null);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ color: tint, fontSize: 18 }}>📅</Text>
      </View>
    );
  }
  const inputType = type === 'month' ? 'month' : type === 'year' ? 'number' : 'date';
  const openPicker = (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      /* fallback */
    }
    el.focus();
    el.click();
  };
  const btnStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    color: tint,
    fontSize: 18,
    userSelect: 'none',
    minWidth: 44,
    border: 0,
    background: 'transparent',
    outline: 'none',
  };
  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    border: 0,
    padding: 0,
    margin: 0,
    background: 'transparent',
  };
  return (
    // @ts-ignore - web-only
    <button type="button" onClick={openPicker} style={btnStyle} title="Kalendardan tanlang">
      <span style={{ pointerEvents: 'none' }}>📅</span>
      {/* @ts-ignore - web-only */}
      <input
        ref={inputRef}
        type={inputType}
        value={value}
        min={type === 'year' ? 2020 : undefined}
        max={type === 'year' ? 2100 : undefined}
        onChange={(e: any) => onChange(e.target.value)}
        onClick={(e: any) => e.stopPropagation()}
        style={inputStyle}
      />
    </button>
  );
};

const DateFilter: React.FC<{
  value: string;
  onChange: (v: string) => void;
  type: 'date' | 'month' | 'year';
  colors: Palette;
}> = ({ value, onChange, type, colors }) => {
  const ph = type === 'date' ? 'YYYY-MM-DD' : type === 'month' ? 'YYYY-MM' : 'YYYY';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.input,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 10,
        flex: 1,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={ph}
        placeholderTextColor={colors.faint}
        style={{
          flex: 1,
          color: colors.text,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        }}
        keyboardType={type === 'year' ? 'number-pad' : 'default'}
      />
      <View style={{ borderLeftWidth: 1, borderLeftColor: colors.cardBorder }}>
        <WebDateIcon value={value} onChange={onChange} type={type} tint={colors.gold} />
      </View>
    </View>
  );
};

type Period = 'all' | 'day' | 'month' | 'year';
const PERIOD_LABEL: Record<Period, string> = {
  all: 'Barchasi',
  day: 'Kunlik',
  month: 'Oylik',
  year: 'Yillik',
};

export const BonusesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [bonuses, setBonuses] = useState<Rec[]>([]);
  const [employees, setEmployees] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [filterDate, setFilterDate] = useState(todayIso());
  const [filterMonth, setFilterMonth] = useState(currentYm());
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    kpi_type: KPI_TYPES[0] as string,
    amount: '1000000',
    date: todayIso(),
    notes: '',
    status: 'tasdiqlangan',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [bs, emps] = await Promise.all([
        api.bonuses.list(),
        api.employees.list().catch(() => [] as Rec[]),
      ]);
      setBonuses(bs);
      setEmployees(emps);
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

  const activeEmployees = useMemo(
    () => employees.filter((e) => str(e, 'status') !== 'nofaol'),
    [employees],
  );

  const periodFiltered = useMemo(() => {
    return bonuses.filter((b) => {
      const d = str(b, 'date');
      if (period === 'day' && d !== filterDate) return false;
      if (period === 'month' && !d.startsWith(filterMonth)) return false;
      if (period === 'year' && !d.startsWith(filterYear)) return false;
      return true;
    });
  }, [bonuses, period, filterDate, filterMonth, filterYear]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return periodFiltered;
    return periodFiltered.filter(
      (b) =>
        str(b, 'employee_name').toLowerCase().includes(q) ||
        str(b, 'kpi_type').toLowerCase().includes(q) ||
        str(b, 'notes').toLowerCase().includes(q),
    );
  }, [periodFiltered, searchTerm]);

  const totalSum = useMemo(
    () => periodFiltered.reduce((sum, b) => sum + num(b.amount), 0),
    [periodFiltered],
  );
  const approvedSum = useMemo(
    () =>
      periodFiltered
        .filter((b) => str(b, 'status') === 'tasdiqlangan')
        .reduce((sum, b) => sum + num(b.amount), 0),
    [periodFiltered],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      employee_id: activeEmployees[0] ? String(activeEmployees[0].id) : '',
      kpi_type: KPI_TYPES[0],
      amount: '1000000',
      date: todayIso(),
      notes: '',
      status: 'tasdiqlangan',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (b: Rec) => {
    setEditing(b);
    setForm({
      employee_id: str(b, 'employee_id'),
      kpi_type: str(b, 'kpi_type') || KPI_TYPES[0],
      amount: String(num(b.amount)),
      date: str(b, 'date') || todayIso(),
      notes: str(b, 'notes'),
      status: str(b, 'status') || 'tasdiqlangan',
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async () => {
    setFormError('');
    const emp = activeEmployees.find((e) => String(e.id) === form.employee_id);
    if (!emp) {
      setFormError('Xodimni tanlang.');
      return;
    }
    const amount = Number(form.amount);
    if (!amount || Number.isNaN(amount)) {
      setFormError('Summani kiriting.');
      return;
    }
    if (!form.notes.trim()) {
      setFormError('Izohni kiriting.');
      return;
    }
    const body: Rec = {
      employee_id: Number(emp.id),
      employee_name: str(emp, 'full_name'),
      kpi_type: form.kpi_type,
      amount,
      date: form.date,
      status: form.status,
      notes: form.notes.trim(),
    };
    setSaving(true);
    try {
      if (editing) await api.bonuses.update(idOf(editing), body);
      else await api.bonuses.create(body);
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (b: Rec) => {
    try {
      await api.bonuses.update(idOf(b), { status: 'tasdiqlangan' });
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Tasdiqlashda xatolik.');
    }
  };

  const confirmDelete = (b: Rec) => {
    Alert.alert(
      "O'chirish",
      `${str(b, 'employee_name')} bonusini (${fmtMoney(num(b.amount))}) o'chirasizmi?`,
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
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  if (loading) return <Loader />;

  const empOptions: SelectOption[] = activeEmployees.map((e) => ({
    value: String(e.id),
    label: `${str(e, 'full_name')}${str(e, 'position') ? ' — ' + str(e, 'position') : ''}`,
  }));
  const kpiOptions: SelectOption[] = KPI_TYPES.map((k) => ({ value: k, label: k, color: colors.gold }));
  const statusOptions: SelectOption[] = [
    { value: 'kutilmoqda', label: 'Kutilmoqda', color: colors.gold },
    { value: 'tasdiqlangan', label: 'Tasdiqlangan', color: colors.green },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>HR: Bonuslar va KPI</Text>
            <Muted>
              Xodimlar reja bajarishi, brak kamaytirishi, tashabbus uchun ustamalar
            </Muted>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Text style={s.addBtnText}>🏆 Yangi Bonus</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* KPI Cards */}
        <View style={s.kpi3}>
          <View style={[s.kpiBox, { backgroundColor: colors.gold + '18' }]}>
            <Text style={[s.kpiVal, { color: colors.gold }]}>{fmtMoney(totalSum)}</Text>
            <Text style={s.kpiLbl}>Jami Belgilangan Bonuslar</Text>
          </View>
          <View style={[s.kpiBox, { backgroundColor: colors.green + '18' }]}>
            <Text style={[s.kpiVal, { color: colors.green }]}>✓ {fmtMoney(approvedSum)}</Text>
            <Text style={s.kpiLbl}>Tasdiqlangan va To‘langan</Text>
          </View>
          <View style={[s.kpiBox, { backgroundColor: colors.blue + '18' }]}>
            <Text style={[s.kpiVal, { color: colors.blue }]}>{periodFiltered.length} ta</Text>
            <Text style={s.kpiLbl}>Mukofotlangan Yutuqlar</Text>
          </View>
        </View>

        {/* Search + Period */}
        <View style={s.filterCard}>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Xodim ismi yoki KPI turi bo‘yicha qidiruv..."
            placeholderTextColor={colors.faint}
            style={s.searchInput}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.periodRow}
          >
            {(['all', 'day', 'month', 'year'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  s.periodBtn,
                  period === p && {
                    backgroundColor: colors.gold + '22',
                    borderColor: colors.gold + '55',
                  },
                ]}
              >
                <Text
                  style={[
                    s.periodBtnText,
                    period === p && { color: colors.gold },
                  ]}
                >
                  {PERIOD_LABEL[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {period !== 'all' && (
            <View style={{ marginTop: 8 }}>
              {period === 'day' && (
                <DateFilter value={filterDate} onChange={setFilterDate} type="date" colors={colors} />
              )}
              {period === 'month' && (
                <DateFilter value={filterMonth} onChange={setFilterMonth} type="month" colors={colors} />
              )}
              {period === 'year' && (
                <DateFilter value={filterYear} onChange={setFilterYear} type="year" colors={colors} />
              )}
            </View>
          )}
        </View>

        {/* Table-like list */}
        <View style={s.tableHead}>
          <Text style={s.tableHeadTitle}>Bonuslar roʻyxati · {filtered.length}</Text>
          <Text style={s.tableHeadCols}>№ · Xodim · KPI · Summa · Sana · Izoh · Holat · Amallar</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 28, textAlign: 'center' }}>🏆</Text>
            <Text style={s.emptyTitle}>Bonuslar topilmadi</Text>
            <Text style={s.emptySub}>
              Yangi bonus qoʻshish uchun yuqoridagi tugmani bosing.
            </Text>
          </View>
        ) : (
          filtered.map((b, idx) => (
            <View key={idOf(b)} style={s.rowCard}>
              <View style={s.rowHead}>
                <View style={s.rowNo}>
                  <Text style={s.rowNoText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{str(b, 'employee_name') || '—'}</Text>
                  <View style={s.kpiPill}>
                    <Text style={s.kpiPillText}>{str(b, 'kpi_type')}</Text>
                  </View>
                </View>
                <Text style={s.rowAmount}>+{fmtMoney(num(b.amount))}</Text>
              </View>
              <View style={s.rowMeta}>
                <Text style={s.rowDate}>📅 {str(b, 'date')}</Text>
                {str(b, 'status') === 'tasdiqlangan' ? (
                  <View style={[s.statusPill, { borderColor: colors.green + '55', backgroundColor: colors.green + '18' }]}>
                    <Text style={{ color: colors.green, fontSize: 11, fontWeight: '800' }}>
                      ✓ Tasdiqlangan
                    </Text>
                  </View>
                ) : (
                  <View style={[s.statusPill, { borderColor: colors.gold + '55', backgroundColor: colors.gold + '18' }]}>
                    <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>
                      ⏳ Kutilmoqda
                    </Text>
                  </View>
                )}
              </View>
              {!!str(b, 'notes') && (
                <Text style={s.rowNotes} numberOfLines={2}>
                  {str(b, 'notes')}
                </Text>
              )}
              <View style={s.actions}>
                {str(b, 'status') !== 'tasdiqlangan' && (
                  <TouchableOpacity
                    style={[s.actBtn, { backgroundColor: colors.gold, borderColor: colors.gold }]}
                    onPress={() => approve(b)}
                  >
                    <Text style={[s.actBtnText, { color: '#000' }]}>Tasdiqlash</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.actBtn} onPress={() => openEdit(b)}>
                  <Text style={[s.actBtnText, { color: colors.gold }]}>Tahrirlash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actBtn, { borderColor: colors.red + '55' }]}
                  onPress={() => confirmDelete(b)}
                >
                  <Text style={[s.actBtnText, { color: colors.red }]}>O'chirish</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>
                {editing ? 'Bonusni tahrirlash' : 'Yangi Bonus Belgilash'}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.lbl}>Xodim *</Text>
              <Select
                value={form.employee_id}
                options={empOptions}
                onChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}
                placeholder="Xodimni tanlang"
                colors={colors}
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>KPI / Mukofot toifasi *</Text>
              <Select
                value={form.kpi_type}
                options={kpiOptions}
                onChange={(v) => setForm((f) => ({ ...f, kpi_type: v }))}
                colors={colors}
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>Summa (so'm) *</Text>
              <TextInput
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="1000000"
                placeholderTextColor={colors.faint}
                style={s.input}
                keyboardType="numeric"
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>Sana *</Text>
              <DateFilter
                value={form.date}
                onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                type="date"
                colors={colors}
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>Holat</Text>
              <Select
                value={form.status}
                options={statusOptions}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                colors={colors}
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>Izoh *</Text>
              <TextInput
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Qanday yutuq uchun bonus belgilanmoqda?"
                placeholderTextColor={colors.faint}
                style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                multiline
              />
              {!!formError && <Text style={[s.error, { marginTop: 10 }]}>{formError}</Text>}
              <View style={{ height: 12 }} />

              <Btn title={editing ? 'Saqlash' : 'Bonusni belgilash'} onPress={submit} busy={saving} />
              <Btn title="Bekor qilish" onPress={() => setModalOpen(false)} ghost />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    title: { color: c.text, fontSize: 20, fontWeight: '900' },
    addBtn: {
      backgroundColor: c.gold,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },

    error: { color: c.red, fontSize: 13, textAlign: 'center', marginBottom: 8 },

    kpi3: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    kpiBox: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    kpiVal: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
    kpiLbl: { color: c.muted, fontSize: 10, marginTop: 4, fontWeight: '700', textAlign: 'center' },

    filterCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 14,
      padding: 10,
      marginBottom: 12,
      gap: 8,
    },
    searchInput: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    periodRow: { flexDirection: 'row', gap: 6 },
    periodBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
    },
    periodBtnText: { color: c.muted, fontSize: 12, fontWeight: '700' },

    tableHead: {
      backgroundColor: c.input,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tableHeadTitle: {
      color: c.gold,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableHeadCols: { color: c.muted, fontSize: 10, marginTop: 2 },

    emptyCard: {
      padding: 30,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.cardBorder,
      alignItems: 'center',
    },
    emptyTitle: { color: c.text, fontSize: 15, fontWeight: '800', marginTop: 8 },
    emptySub: { color: c.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },

    rowCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      gap: 8,
    },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowNo: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.gold + '22',
      borderWidth: 1.5,
      borderColor: c.gold + '66',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowNoText: { color: c.text, fontSize: 13, fontWeight: '900' },
    rowName: { color: c.text, fontSize: 15, fontWeight: '800' },
    rowAmount: { color: c.green, fontSize: 15, fontWeight: '900' },
    kpiPill: {
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: c.gold + '18',
      borderWidth: 1,
      borderColor: c.gold + '44',
    },
    kpiPillText: { color: c.gold, fontSize: 10, fontWeight: '700' },
    rowMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowDate: {
      color: c.muted,
      fontSize: 12,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    rowNotes: {
      color: c.text,
      fontSize: 13,
      backgroundColor: c.input,
      padding: 8,
      borderRadius: 8,
    },
    actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    actBtn: {
      flex: 1,
      minWidth: 90,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
      backgroundColor: c.input,
    },
    actBtnText: { fontSize: 12, fontWeight: '800' },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 16,
      maxHeight: '92%',
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    sheetTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    closeX: { color: c.muted, fontSize: 20, paddingHorizontal: 6 },

    lbl: {
      color: c.muted,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
    },
  });
