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
type TxType = 'kirim' | 'chiqim';
type PayMethod = 'bank_transfer' | 'naqd' | 'payme_click';

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

const CATEGORIES_KIRIM = [
  'Buyurtma to‘lovi',
  'Avans / Oldindan to‘lov',
  'Hamkor investitsiyasi',
  'Qoldiq to‘lov',
  'Boshqa daromad',
];
const CATEGORIES_CHIQIM = [
  'Mahsulot ishlab chiqarish',
  'Materiallar xaridi',
  'Ish haqi (FOT)',
  'Transport va yetkazib berish',
  'Ijara va kommunal',
  'Reklama va marketing',
  'Soliq va yig‘imlar',
  'Jihoz va texnika',
  'Dizayn va bosma',
  'Boshqa xarajatlar',
];

type SelectOption = { value: string; label: string; color?: string };
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
    // @ts-ignore
    <button type="button" onClick={openPicker} style={btnStyle} title="Kalendardan tanlang">
      <span style={{ pointerEvents: 'none' }}>📅</span>
      {/* @ts-ignore */}
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

type Period = 'all' | 'month' | 'year';
type TypeFilter = 'all' | TxType;

export const FinanceScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [transactions, setTransactions] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [filterMonth, setFilterMonth] = useState(currentYm());
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'kirim' as TxType,
    category: CATEGORIES_KIRIM[0],
    amount: '',
    payment_method: 'bank_transfer' as PayMethod,
    date: todayIso(),
    description: '',
    related_client: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.transactions.list();
      setTransactions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tranzaksiyalar yuklanmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const baseFiltered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && str(t, 'type') !== filterType) return false;
      const d = str(t, 'date');
      if (period === 'month' && !d.startsWith(filterMonth)) return false;
      if (period === 'year' && !d.startsWith(filterYear)) return false;
      return true;
    });
  }, [transactions, filterType, period, filterMonth, filterYear]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseFiltered;
    return baseFiltered.filter((t) =>
      str(t, 'category').toLowerCase().includes(q) ||
      str(t, 'description').toLowerCase().includes(q) ||
      str(t, 'related_client').toLowerCase().includes(q),
    );
  }, [baseFiltered, searchQuery]);

  const totalIncome = useMemo(
    () => baseFiltered.filter((t) => str(t, 'type') === 'kirim').reduce((s, t) => s + num(t.amount), 0),
    [baseFiltered],
  );
  const totalExpense = useMemo(
    () => baseFiltered.filter((t) => str(t, 'type') === 'chiqim').reduce((s, t) => s + num(t.amount), 0),
    [baseFiltered],
  );
  const netBalance = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0';

  const bankBalance = useMemo(
    () =>
      baseFiltered.reduce((sum, t) => {
        if (str(t, 'payment_method') === 'bank_transfer') {
          return sum + (str(t, 'type') === 'kirim' ? num(t.amount) : -num(t.amount));
        }
        return sum;
      }, 0),
    [baseFiltered],
  );
  const cashBalance = useMemo(
    () =>
      baseFiltered.reduce((sum, t) => {
        if (str(t, 'payment_method') === 'naqd') {
          return sum + (str(t, 'type') === 'kirim' ? num(t.amount) : -num(t.amount));
        }
        return sum;
      }, 0),
    [baseFiltered],
  );
  const paymeBalance = useMemo(
    () =>
      baseFiltered.reduce((sum, t) => {
        if (str(t, 'payment_method') === 'payme_click') {
          return sum + (str(t, 'type') === 'kirim' ? num(t.amount) : -num(t.amount));
        }
        return sum;
      }, 0),
    [baseFiltered],
  );

  const openAdd = (type: TxType) => {
    setForm({
      type,
      category: type === 'kirim' ? CATEGORIES_KIRIM[0] : CATEGORIES_CHIQIM[0],
      amount: '',
      payment_method: 'bank_transfer',
      date: todayIso(),
      description: '',
      related_client: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async () => {
    setFormError('');
    const amount = Number(form.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setFormError('Summani kiriting.');
      return;
    }
    const body: Rec = {
      type: form.type,
      category: form.category,
      amount,
      payment_method: form.payment_method,
      date: form.date,
      description: form.description.trim() || `${form.category} (${form.type === 'kirim' ? 'kirim' : 'chiqim'})`,
    };
    if (form.related_client.trim()) body.related_client = form.related_client.trim();
    setSaving(true);
    try {
      await api.transactions.create(body);
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (t: Rec) => {
    Alert.alert(
      "O'chirish",
      `${str(t, 'category')} (${fmtMoney(num(t.amount))}) o'chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.transactions.remove(idOf(t));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  const handleExportExcel = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Eslatma', 'Excel yuklab olish web versiyasida ishlaydi.');
      return;
    }
    const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const header = ['№', 'Sana', 'Turi', 'Kategoriya', 'Summa', "To'lov usuli", 'Tavsif', 'Mijoz'];
    const rows = filtered.map((t, i) => [
      String(i + 1),
      str(t, 'date'),
      str(t, 'type') === 'kirim' ? 'Kirim' : 'Chiqim',
      str(t, 'category'),
      String(num(t.amount)),
      str(t, 'payment_method') === 'bank_transfer'
        ? 'Bank'
        : str(t, 'payment_method') === 'naqd'
        ? 'Naqd'
        : 'Payme/Click',
      str(t, 'description'),
      str(t, 'related_client') || '—',
    ]);
    const bom = '﻿';
    const csv = bom + [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const periodTag = period === 'month' ? filterMonth : period === 'year' ? filterYear : 'barcha';
    a.download = `moliya_${periodTag}_${filterType}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader />;

  const payMethodLabel = (m: string) =>
    m === 'bank_transfer' ? 'Bank' : m === 'naqd' ? 'Naqd' : m === 'payme_click' ? 'Payme/Click' : '—';
  const payMethodIcon = (m: string) => (m === 'bank_transfer' ? '🏦' : m === 'naqd' ? '💵' : '💳');

  const categoryOptions: SelectOption[] =
    form.type === 'kirim'
      ? CATEGORIES_KIRIM.map((c) => ({ value: c, label: c }))
      : CATEGORIES_CHIQIM.map((c) => ({ value: c, label: c }));
  const payMethodOptions: SelectOption[] = [
    { value: 'bank_transfer', label: '🏦 Bank hisobi' },
    { value: 'naqd', label: '💵 Naqd kassa' },
    { value: 'payme_click', label: '💳 Payme / Click' },
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
        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Summary cards */}
        <View style={s.summary3}>
          <View style={[s.summaryCard, { borderColor: colors.green + '55' }]}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLbl, { color: colors.green }]}>UMUMIY KIRIM</Text>
              <Text style={{ color: colors.green }}>↗</Text>
            </View>
            <Text style={s.summaryVal}>+{fmtMoney(totalIncome)}</Text>
            <Muted>Barcha tushumlar va avanslar</Muted>
          </View>
          <View style={[s.summaryCard, { borderColor: colors.red + '55' }]}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLbl, { color: colors.red }]}>UMUMIY CHIQIM</Text>
              <Text style={{ color: colors.red }}>↘</Text>
            </View>
            <Text style={s.summaryVal}>-{fmtMoney(totalExpense)}</Text>
            <Muted>Materiallar, ish haqi va xarajatlar</Muted>
          </View>
          <View style={[s.summaryCard, { borderColor: colors.gold + '66' }]}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLbl, { color: colors.gold }]}>KASSA QOLDIG‘I</Text>
              <Text style={{ color: colors.gold }}>💰</Text>
            </View>
            <Text style={[s.summaryVal, { color: colors.gold }]}>
              {fmtMoney(netBalance)}
            </Text>
            <Muted>
              Foydalilik marjasi:{' '}
              <Text style={{ color: colors.gold, fontWeight: '800' }}>{margin}%</Text>
            </Muted>
          </View>
        </View>

        {/* Payment methods */}
        <View style={s.methodsRow}>
          <View style={s.methodCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.methodIcon, { backgroundColor: colors.blue + '22' }]}>
                <Text style={{ fontSize: 16 }}>🏦</Text>
              </View>
              <View>
                <Muted>Bank hisob raqami</Muted>
                <Text style={s.methodVal}>{fmtMoney(bankBalance)}</Text>
              </View>
            </View>
            <Text style={s.methodTag}>H/R</Text>
          </View>
          <View style={s.methodCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.methodIcon, { backgroundColor: colors.green + '22' }]}>
                <Text style={{ fontSize: 16 }}>💵</Text>
              </View>
              <View>
                <Muted>Naqd kassa</Muted>
                <Text style={s.methodVal}>{fmtMoney(cashBalance)}</Text>
              </View>
            </View>
            <Text style={s.methodTag}>NAQD</Text>
          </View>
          <View style={s.methodCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.methodIcon, { backgroundColor: '#22D3EE22' }]}>
                <Text style={{ fontSize: 16 }}>💳</Text>
              </View>
              <View>
                <Muted>Payme / Click</Muted>
                <Text style={s.methodVal}>{fmtMoney(paymeBalance)}</Text>
              </View>
            </View>
            <Text style={s.methodTag}>KARTA</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={s.controlCard}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Mijoz nomi, kategoriya yoki tavsif bo‘yicha qidirish..."
            placeholderTextColor={colors.faint}
            style={s.search}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {(['all', 'kirim', 'chiqim'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setFilterType(t)}
                style={[
                  s.chip,
                  filterType === t && {
                    backgroundColor:
                      t === 'kirim'
                        ? colors.green + '22'
                        : t === 'chiqim'
                        ? colors.red + '22'
                        : colors.gold + '22',
                    borderColor:
                      t === 'kirim' ? colors.green : t === 'chiqim' ? colors.red : colors.gold,
                  },
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    filterType === t && {
                      color: t === 'kirim' ? colors.green : t === 'chiqim' ? colors.red : colors.gold,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {t === 'all' ? 'Barchasi' : t === 'kirim' ? 'Kirim' : 'Chiqim'}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 10 }} />
            {(['all', 'month', 'year'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  s.chip,
                  period === p && { backgroundColor: colors.gold + '22', borderColor: colors.gold },
                ]}
              >
                <Text style={[s.chipText, period === p && { color: colors.gold, fontWeight: '800' }]}>
                  {p === 'all' ? 'Barcha davr' : p === 'month' ? 'Oylik' : 'Yillik'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {period !== 'all' && (
            <View style={{ marginTop: 6 }}>
              {period === 'month' && (
                <DateFilter value={filterMonth} onChange={setFilterMonth} type="month" colors={colors} />
              )}
              {period === 'year' && (
                <DateFilter value={filterYear} onChange={setFilterYear} type="year" colors={colors} />
              )}
            </View>
          )}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.green }]}
              onPress={() => openAdd('kirim')}
            >
              <Text style={s.actionBtnText}>+ Kirim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.red }]}
              onPress={() => openAdd('chiqim')}
            >
              <Text style={s.actionBtnText}>+ Chiqim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.green, flex: 0.5 }]}
              onPress={handleExportExcel}
            >
              <Text style={s.actionBtnText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table header */}
        <View style={s.tableHead}>
          <Text style={s.tableHeadTitle}>Tranzaksiyalar · {filtered.length}</Text>
          <Text style={s.tableHeadCols}>№ · Turi · Sana · Kategoriya · Mijoz · To'lov · Summa</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 28, textAlign: 'center' }}>💰</Text>
            <Text style={s.emptyTitle}>Tranzaksiyalar topilmadi</Text>
            <Text style={s.emptySub}>+ Kirim yoki + Chiqim tugmalari bilan qoʻshing.</Text>
          </View>
        ) : (
          filtered.map((t, idx) => {
            const isIncome = str(t, 'type') === 'kirim';
            return (
              <View key={idOf(t)} style={s.rowCard}>
                <View style={s.rowTop}>
                  <View style={s.rowNo}>
                    <Text style={s.rowNoText}>{idx + 1}</Text>
                  </View>
                  <View
                    style={[
                      s.typeBadge,
                      {
                        backgroundColor: (isIncome ? colors.green : colors.red) + '18',
                        borderColor: (isIncome ? colors.green : colors.red) + '55',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isIncome ? colors.green : colors.red,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {isIncome ? '↗ Kirim' : '↘ Chiqim'}
                    </Text>
                  </View>
                  <Text style={s.rowDate}>{str(t, 'date')}</Text>
                  <Text
                    style={[
                      s.rowAmount,
                      { color: isIncome ? colors.green : colors.red },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {fmtMoney(num(t.amount))}
                  </Text>
                </View>
                <Text style={s.rowCat}>{str(t, 'category')}</Text>
                {!!str(t, 'description') && (
                  <Text style={s.rowDesc} numberOfLines={2}>
                    {str(t, 'description')}
                  </Text>
                )}
                <View style={s.rowBottom}>
                  <View style={s.payTag}>
                    <Text style={s.payTagText}>
                      {payMethodIcon(str(t, 'payment_method'))} {payMethodLabel(str(t, 'payment_method'))}
                    </Text>
                  </View>
                  {!!str(t, 'related_client') && (
                    <Text style={s.rowClient}>👤 {str(t, 'related_client')}</Text>
                  )}
                  <TouchableOpacity
                    style={s.delBtn}
                    onPress={() => confirmDelete(t)}
                  >
                    <Text style={{ color: colors.red, fontSize: 14, fontWeight: '800' }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Yangi tranzaksiya</Text>
                <Muted>Kirim yoki chiqimni qayd eting</Muted>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type toggle */}
              <View style={s.typeToggle}>
                <TouchableOpacity
                  onPress={() =>
                    setForm((f) => ({ ...f, type: 'kirim', category: CATEGORIES_KIRIM[0] }))
                  }
                  style={[
                    s.typeToggleBtn,
                    form.type === 'kirim' && { backgroundColor: colors.green },
                  ]}
                >
                  <Text
                    style={[
                      s.typeToggleText,
                      form.type === 'kirim' && { color: '#fff' },
                    ]}
                  >
                    Kirim (Daromad)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setForm((f) => ({ ...f, type: 'chiqim', category: CATEGORIES_CHIQIM[0] }))
                  }
                  style={[
                    s.typeToggleBtn,
                    form.type === 'chiqim' && { backgroundColor: colors.red },
                  ]}
                >
                  <Text
                    style={[
                      s.typeToggleText,
                      form.type === 'chiqim' && { color: '#fff' },
                    ]}
                  >
                    Chiqim (Xarajat)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={s.lbl}>Summa (so'm) *</Text>
              <TextInput
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="0"
                placeholderTextColor={colors.faint}
                style={s.input}
                keyboardType="numeric"
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>Kategoriya *</Text>
              <Select
                value={form.category}
                options={categoryOptions}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                colors={colors}
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>Kontragent / Mijoz</Text>
              <TextInput
                value={form.related_client}
                onChangeText={(v) => setForm((f) => ({ ...f, related_client: v }))}
                placeholder="Masalan: Yevro teks mchj"
                placeholderTextColor={colors.faint}
                style={s.input}
              />
              <View style={{ height: 10 }} />

              <Text style={s.lbl}>To'lov usuli *</Text>
              <Select
                value={form.payment_method}
                options={payMethodOptions}
                onChange={(v) => setForm((f) => ({ ...f, payment_method: v as PayMethod }))}
                colors={colors}
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

              <Text style={s.lbl}>Tavsif</Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Qisqa izoh"
                placeholderTextColor={colors.faint}
                style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
                multiline
              />
              {!!formError && <Text style={[s.error, { marginTop: 10 }]}>{formError}</Text>}

              <View style={{ height: 12 }} />
              <Btn title={'Saqlash'} onPress={submit} busy={saving} />
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
    error: { color: c.red, fontSize: 13, textAlign: 'center', marginBottom: 8 },

    summary3: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    summaryCard: {
      flex: 1,
      padding: 10,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1.5,
      gap: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLbl: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    summaryVal: { color: c.text, fontSize: 14, fontWeight: '900' },

    methodsRow: { gap: 8, marginBottom: 12 },
    methodCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    methodIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    methodVal: { color: c.text, fontSize: 14, fontWeight: '800', marginTop: 1 },
    methodTag: {
      color: c.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    controlCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 14,
      padding: 10,
      marginBottom: 12,
      gap: 8,
    },
    search: {
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      fontSize: 14,
    },
    chipRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
    },
    chipText: { color: c.muted, fontSize: 12, fontWeight: '700' },

    actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    actionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },

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
      padding: 10,
      marginBottom: 10,
      gap: 6,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowNo: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: c.gold + '22',
      borderWidth: 1.5,
      borderColor: c.gold + '66',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowNoText: { color: c.text, fontSize: 11, fontWeight: '900' },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    rowDate: {
      color: c.muted,
      fontSize: 11,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      flex: 1,
    },
    rowAmount: { fontSize: 14, fontWeight: '900' },
    rowCat: { color: c.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
    rowDesc: { color: c.muted, fontSize: 11 },
    rowBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 4,
    },
    payTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    payTagText: { color: c.text, fontSize: 11, fontWeight: '700' },
    rowClient: { color: c.muted, fontSize: 11, flex: 1 },
    delBtn: {
      padding: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.red + '55',
    },

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
    typeToggle: {
      flexDirection: 'row',
      backgroundColor: c.input,
      borderRadius: 10,
      padding: 3,
      marginBottom: 10,
      gap: 2,
    },
    typeToggleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    typeToggleText: { color: c.muted, fontSize: 13, fontWeight: '800' },

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
