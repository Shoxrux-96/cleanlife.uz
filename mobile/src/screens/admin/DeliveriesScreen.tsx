import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Card, Empty, H1, Loader, Muted, Screen } from '../../components';
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): number => Number(r.id);

const STATUSES = ['kutilmoqda', 'yolda', 'yetkazildi'] as const;
type TripStatus = (typeof STATUSES)[number];

const statusLabel = (st: string): string => {
  if (st === 'kutilmoqda') return 'Kutilmoqda';
  if (st === 'yolda') return "Yo'lda";
  if (st === 'yetkazildi') return 'Yetkazildi';
  return st;
};

const statusColor = (st: string): string => {
  if (st === 'yetkazildi') return colors.green;
  if (st === 'yolda') return colors.blue;
  return colors.gold;
};

const fmtDate = (v: unknown): string => {
  if (!v) return '';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtFee = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  if (Number.isNaN(n)) return fmtMoney(0);
  return fmtMoney(n);
};

export const DeliveriesScreen: React.FC = () => {
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | TripStatus>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.deliveries.list();
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

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((r) => str(r, 'status') === filter);
  }, [items, filter]);

  const changeStatus = async (r: Rec, next: TripStatus) => {
    setBusyId(idOf(r));
    try {
      await api.deliveries.changeStatus(idOf(r), next);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Holatni o‘zgartirishda xatolik.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (r: Rec) => {
    Alert.alert(
      "O'chirish",
      `"${str(r, 'trip_code') || 'Yetkazma'}" yozuvini o'chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deliveries.remove(idOf(r));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Rec }) => {
    const st = str(item, 'status');
    const busy = busyId === idOf(item);
    return (
      <Card>
        <View style={s.head}>
          <Text style={s.code}>{str(item, 'trip_code') || '—'}</Text>
          <View style={[s.badge, { borderColor: statusColor(st) }]}>
            <Text style={[s.badgeText, { color: statusColor(st) }]}>
              {statusLabel(st)}
            </Text>
          </View>
        </View>
        <Text style={s.line}>Haydovchi: {str(item, 'driver_name') || '—'}</Text>
        <Text style={s.line}>Mijoz: {str(item, 'client_name') || '—'}</Text>
        {str(item, 'destination_address') ? (
          <Muted>{str(item, 'destination_address')}</Muted>
        ) : null}
        <View style={s.meta}>
          <Text style={s.fee}>{fmtFee(item.delivery_fee)}</Text>
          <Text style={s.date}>{fmtDate(item.created_at)}</Text>
        </View>
        <View style={s.row}>
          {st !== 'yolda' && st !== 'yetkazildi' ? (
            <TouchableOpacity
              style={s.smallBtn}
              disabled={busy}
              onPress={() => changeStatus(item, 'yolda')}
            >
              <Text style={s.smallBtnText}>Yo'lda</Text>
            </TouchableOpacity>
          ) : null}
          {st !== 'yetkazildi' ? (
            <TouchableOpacity
              style={s.smallBtn}
              disabled={busy}
              onPress={() => changeStatus(item, 'yetkazildi')}
            >
              <Text style={s.smallBtnText}>Yetkazildi</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[s.smallBtn, s.smallBtnDanger]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[s.smallBtnText, { color: colors.red }]}>O'chirish</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const filters: Array<'all' | TripStatus> = ['all', ...STATUSES];

  return (
    <Screen>
      <H1>Yetkazmalar</H1>
      <Muted>Yetkazmalar yuk xatlaridan keladi — bu yerda faqat holat va o'chirish.</Muted>
      <View style={s.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f === 'all' ? 'Barchasi' : statusLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={<Empty text="Yetkazmalar topilmadi." />}
        />
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  line: { color: colors.text, fontSize: 14, marginTop: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  fee: { color: colors.text, fontSize: 15, fontWeight: '800' },
  date: { color: colors.faint, fontSize: 12 },
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
