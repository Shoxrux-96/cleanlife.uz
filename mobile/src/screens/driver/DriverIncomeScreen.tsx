import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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

const pad = (n: number): string => String(n).padStart(2, '0');
const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const localMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const localYear = (): string => String(new Date().getFullYear());

type Period = 'day' | 'month' | 'year';

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
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const DriverIncomeScreen: React.FC = () => {
  const { session } = useAuth();
  const name = session?.name ?? '';

  const [period, setPeriod] = useState<Period>('day');
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const refs = useMemo(
    () => ({ today: localToday(), month: localMonth(), year: localYear() }),
    [],
  );

  const filtered = useMemo(() => {
    const mine = items.filter((r) => isMine(r, name));
    if (period === 'day')
      return mine.filter(
        (r) => String(r.created_at ?? '').slice(0, 10) === refs.today,
      );
    if (period === 'month')
      return mine.filter(
        (r) => String(r.created_at ?? '').slice(0, 7) === refs.month,
      );
    return mine.filter(
      (r) => String(r.created_at ?? '').slice(0, 4) === refs.year,
    );
  }, [items, name, period, refs]);

  const total = useMemo(
    () => filtered.reduce((a, r) => a + num(r.delivery_fee), 0),
    [filtered],
  );

  const periodHint =
    period === 'day'
      ? refs.today
      : period === 'month'
        ? refs.month
        : refs.year;

  const tabs: { key: Period; label: string }[] = [
    { key: 'day', label: 'Kun' },
    { key: 'month', label: 'Oy' },
    { key: 'year', label: 'Yil' },
  ];

  if (loading && !refreshing) {
    return (
      <Screen>
        <H1>Daromad</H1>
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={filtered}
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
            <H1>Daromad</H1>
            <Muted>
              {session?.name ? `${session.name} — ` : ''}{periodHint}
            </Muted>
            <View style={s.tabs}>
              {tabs.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setPeriod(t.key)}
                  style={[s.tab, period === t.key && s.tabActive]}
                >
                  <Text
                    style={[
                      s.tabText,
                      period === t.key && s.tabTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? (
              <Card>
                <Text style={s.error}>{error}</Text>
                <Btn title="Qayta urinish" onPress={() => load()} ghost />
              </Card>
            ) : (
              <Card>
                <Text style={s.cardTitle}>Jami daromad</Text>
                <Text style={s.total}>{fmtMoney(total)}</Text>
                <Muted>Reyslar soni: {filtered.length}</Muted>
              </Card>
            )}
            <Text style={s.section}>Reyslar ({filtered.length})</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = str(item, 'status');
          return (
            <View style={s.row1}>
              <View style={{ flex: 1 }}>
                <Text style={s.code}>
                  {str(item, 'trip_code') || '—'}
                </Text>
                <Text style={s.client}>
                  {str(item, 'client_name') || '—'}
                </Text>
                <Text style={s.date}>{fmtDate(item.created_at)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={s.fee}>{fmtMoney(num(item.delivery_fee))}</Text>
                <View style={[s.badge, { borderColor: statusColor(st) }]}>
                  <Text style={[s.badgeText, { color: statusColor(st) }]}>
                    {statusLabel(st)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          error ? null : (
            <Empty text="Bu davrda reyslar topilmadi." />
          )
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  cardTitle: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  total: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 8,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  code: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  client: { color: colors.text, fontSize: 14, marginTop: 2 },
  date: { color: colors.faint, fontSize: 12, marginTop: 2 },
  fee: { color: colors.text, fontSize: 15, fontWeight: '800' },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },
});
