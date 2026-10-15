import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import {
  Btn,
  Card,
  Empty,
  Field,
  H1,
  Loader,
  Muted,
  Screen,
} from '../../components';
import { colors } from '../../theme';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): string | number => (r.id as string | number) ?? '';

const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isValidMonth = (v: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

const resolveEmployeeId = (r: Rec): number | null => {
  const direct = r.employee_id;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  if (typeof direct === 'string' && direct.trim() !== '' && !Number.isNaN(Number(direct)))
    return Number(direct);
  const emp = r.employee;
  if (typeof emp === 'number' && Number.isFinite(emp)) return emp;
  if (typeof emp === 'string' && emp.trim() !== '' && !Number.isNaN(Number(emp)))
    return Number(emp);
  if (emp && typeof emp === 'object') {
    const o = emp as Rec;
    const cand = o.id ?? o.employee_id ?? o.pk;
    if (typeof cand === 'number' && Number.isFinite(cand)) return cand;
    if (typeof cand === 'string' && cand.trim() !== '' && !Number.isNaN(Number(cand)))
      return Number(cand);
  }
  return null;
};

const statusColor = (status: string): string => {
  const v = status.toLowerCase();
  if (v.includes('kelgan') || v.includes('present') || v.includes('keldi'))
    return colors.green;
  if (v.includes('kech') || v.includes('late')) return colors.gold;
  if (
    v.includes('kelmadi') ||
    v.includes('absent') ||
    v.includes('yo‘q') ||
    v.includes("yo'q")
  )
    return colors.red;
  return colors.blue;
};

export const AttendanceScreen: React.FC = () => {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const load = useCallback(
    async (isRefresh = false, monthArg?: string) => {
      const m = (monthArg ?? month).trim();
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await api.attendance.list({ month: m });
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
        setItems([]);
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

  const onLoadPress = () => {
    const m = month.trim();
    if (!isValidMonth(m)) {
      Alert.alert('Xatolik', 'Oy formati YYYY-MM bo‘lishi kerak (masalan: 2026-10).');
      return;
    }
    load(false, m);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      str(r, 'employee_name').toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleMark = async (rec: Rec, status: string) => {
    const eid = resolveEmployeeId(rec);
    const date = str(rec, 'date');
    if (eid === null) {
      Alert.alert(
        'Xatolik',
        'Bu yozuvda xodim ID topilmadi (employee / employee_id maydoni yo‘q). Belgilash uchun xodimlar ro‘yxatidan sana va holatni kiriting.',
      );
      return;
    }
    if (!date) {
      Alert.alert('Xatolik', 'Sana topilmadi.');
      return;
    }
    const key = `${String(idOf(rec))}-${status}`;
    setBusyKey(key);
    try {
      await api.attendance.mark({ employee_id: eid, date, status });
      await load(false);
    } catch (e) {
      Alert.alert(
        'Xatolik',
        e instanceof Error ? e.message : 'Belgilashda xatolik.',
      );
    } finally {
      setBusyKey('');
    }
  };

  const confirmDelete = (rec: Rec) => {
    const label = str(rec, 'employee_name') || 'yozuv';
    const date = str(rec, 'date');
    Alert.alert(
      'O‘chirish',
      `"${label}" (${date}) yozuvini o‘chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O‘chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.attendance.remove(idOf(rec));
              await load(false);
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

  const renderItem = ({ item }: { item: Rec }) => {
    const status = str(item, 'status') || '—';
    const hasEid = resolveEmployeeId(item) !== null;
    return (
      <Card>
        <Text style={s.name}>{str(item, 'employee_name') || 'Nomsiz'}</Text>
        <Text style={s.line}>Sana: {str(item, 'date') || '—'}</Text>
        <Text style={s.line}>Kirish: {str(item, 'check_in') || '—'}</Text>
        <View style={s.badgeWrap}>
          <Text style={[s.badge, { backgroundColor: statusColor(status) }]}>
            {status}
          </Text>
        </View>
        {!hasEid ? (
          <Muted>Izoh: xodim ID topilmadi — belgilash imkonsiz.</Muted>
        ) : null}
        <View style={s.row}>
          <TouchableOpacity
            style={s.smallBtn}
            disabled={busyKey !== ''}
            onPress={() => handleMark(item, 'kelgan')}
          >
            <Text style={s.smallBtnText}>
              {busyKey.endsWith('-kelgan') &&
              String(idOf(item)) === busyKey.split('-')[0]
                ? '...'
                : 'Kelgan'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.smallBtn}
            disabled={busyKey !== ''}
            onPress={() => handleMark(item, 'kechikkan')}
          >
            <Text style={s.smallBtnText}>
              {busyKey.endsWith('-kechikkan') &&
              String(idOf(item)) === busyKey.split('-')[0]
                ? '...'
                : 'Kechikkan'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.smallBtn, s.smallBtnDanger]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[s.smallBtnText, { color: colors.red }]}>
              O‘chirish
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <H1>Davomat boshqaruvi</H1>
      <Field
        label="Oy (YYYY-MM)"
        value={month}
        onChange={setMonth}
        placeholder="2026-10"
      />
      <Btn title="Yuklash" onPress={onLoadPress} />
      <View style={{ height: 8 }} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Xodim ismi bo‘yicha qidirish..."
        placeholderTextColor={colors.faint}
        style={s.search}
      />
      {loading ? (
        <Loader />
      ) : error ? (
        <View style={s.center}>
          <Text style={s.error}>{error}</Text>
          <Btn title="Qayta urinish" onPress={() => load()} ghost />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r, i) => String(r.id ?? `${str(r, 'employee_name')}-${str(r, 'date')}-${i}`)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={<Empty text="Davomat yozuvlari topilmadi." />}
        />
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  search: {
    backgroundColor: colors.input,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  line: { color: colors.text, fontSize: 14, marginTop: 2 },
  badgeWrap: { alignSelf: 'flex-start', marginTop: 8 },
  badge: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  smallBtnDanger: { borderColor: colors.red },
  smallBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});
