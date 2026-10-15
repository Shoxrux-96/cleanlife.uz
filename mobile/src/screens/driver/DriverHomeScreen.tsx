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
import { useAuth } from '../../auth';
import { Btn, Card, Empty, H1, Loader, Muted, Screen } from '../../components';
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};
const idOf = (r: Rec): number | string => (r.id as number | string) ?? '';

const pad = (n: number): string => String(n).padStart(2, '0');
const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayOf = (r: Rec): string => String(r.created_at ?? '').slice(0, 10);

const isMine = (r: Rec, name: string): boolean => {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return str(r, 'driver_name').toLowerCase().includes(n);
};

const statusLabel = (st: string): string => {
  if (st === 'kutilmoqda') return 'Kutilmoqda';
  if (st === 'yolda') return "Yo'lda";
  if (st === 'yetkazildi') return 'Yetkazildi';
  return st || '—';
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
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const DriverHomeScreen: React.FC = () => {
  const { session } = useAuth();
  const name = session?.name ?? '';

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = (await api.deliveries.list()) as Rec[];
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

  const today = useMemo(() => localToday(), []);

  const myToday = useMemo(
    () => items.filter((r) => isMine(r, name) && dayOf(r) === today),
    [items, name, today],
  );

  const todayCount = myToday.length;
  const todayIncome = useMemo(
    () => myToday.reduce((a, r) => a + num(r.delivery_fee), 0),
    [myToday],
  );
  const activeCount = useMemo(
    () => myToday.filter((r) => str(r, 'status') === 'yolda').length,
    [myToday],
  );

  const activeTrip = useMemo(
    () =>
      myToday.find((r) => str(r, 'status') === 'yolda') ??
      myToday.find((r) => str(r, 'status') === 'kutilmoqda') ??
      null,
    [myToday],
  );

  const changeStatus = async (r: Rec, next: 'yolda' | 'yetkazildi') => {
    setBusyId(idOf(r));
    try {
      await api.deliveries.changeStatus(idOf(r), next);
      await load(true);
    } catch (e) {
      Alert.alert(
        'Xatolik',
        e instanceof Error ? e.message : 'Holatni o‘zgartirishda xatolik.',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <Screen>
        <H1>Xush kelibsiz{ name ? `, ${name}` : ''}!</H1>
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={myToday}
        keyExtractor={(r) => String(r.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListHeaderComponent={
          <View>
            <H1>Xush kelibsiz{ name ? `, ${name}` : ''}!</H1>
            <Muted>Bugungi reyslaringiz — {today}</Muted>

            {error ? (
              <Card>
                <Text style={s.error}>{error}</Text>
                <Btn title="Qayta urinish" onPress={() => load()} ghost />
              </Card>
            ) : (
              <>
                <View style={s.stats}>
                  <View style={s.stat}>
                    <Text style={s.statNum}>{todayCount}</Text>
                    <Text style={s.statLabel}>Bugungi reyslar</Text>
                  </View>
                  <View style={s.stat}>
                    <Text style={s.statNum}>{activeCount}</Text>
                    <Text style={s.statLabel}>Faol (yo‘lda)</Text>
                  </View>
                </View>
                <Card>
                  <Text style={s.cardTitle}>Bugungi daromad</Text>
                  <Text style={s.income}>{fmtMoney(todayIncome)}</Text>
                </Card>

                {activeTrip ? (
                  <Card>
                    <View style={s.head}>
                      <Text style={s.code}>
                        {str(activeTrip, 'trip_code') || 'Faol reys'}
                      </Text>
                      <View
                        style={[
                          s.badge,
                          {
                            borderColor: statusColor(
                              str(activeTrip, 'status'),
                            ),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.badgeText,
                            {
                              color: statusColor(str(activeTrip, 'status')),
                            },
                          ]}
                        >
                          {statusLabel(str(activeTrip, 'status'))}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.line}>
                      Mijoz: {str(activeTrip, 'client_name') || '—'}
                    </Text>
                    {str(activeTrip, 'destination_address') ? (
                      <Muted>
                        {str(activeTrip, 'destination_address')}
                      </Muted>
                    ) : null}
                    <Text style={s.fee}>
                      {fmtMoney(num(activeTrip.delivery_fee))}
                    </Text>
                    <View style={s.row}>
                      <TouchableOpacity
                        style={s.smallBtn}
                        disabled={busyId === idOf(activeTrip)}
                        onPress={() => changeStatus(activeTrip, 'yolda')}
                      >
                        <Text style={s.smallBtnText}>
                          {busyId === idOf(activeTrip)
                            ? 'Kuting...'
                            : "Yo'lda"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.smallBtn}
                        disabled={busyId === idOf(activeTrip)}
                        onPress={() => changeStatus(activeTrip, 'yetkazildi')}
                      >
                        <Text style={s.smallBtnText}>
                          {busyId === idOf(activeTrip)
                            ? 'Kuting...'
                            : 'Yetkazildi'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ) : (
                  <Card>
                    <Muted>Faol reys yo‘q. Bugun uchun topshiriq kutilmoqda.</Muted>
                  </Card>
                )}

                <Text style={s.section}>Bugungi reyslar ({myToday.length})</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const st = str(item, 'status');
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
              <Text style={s.line}>
                Mijoz: {str(item, 'client_name') || '—'}
              </Text>
              {str(item, 'destination_address') ? (
                <Muted>{str(item, 'destination_address')}</Muted>
              ) : null}
              <View style={s.meta}>
                <Text style={s.fee}>{fmtMoney(num(item.delivery_fee))}</Text>
                <Text style={s.date}>{fmtDate(item.created_at)}</Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          error ? null : !loading ? (
            <Empty text="Bugun sizga biriktirilgan reyslar yo‘q." />
          ) : null
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNum: { color: colors.gold, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  cardTitle: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  income: { color: colors.gold, fontSize: 26, fontWeight: '900' },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 8,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  line: { color: colors.text, fontSize: 14, marginTop: 4 },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fee: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 6 },
  date: { color: colors.faint, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },
});
