import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Screen, Card, H1, Muted, Btn, Empty, Loader } from '../../components';
import { colors, fmtMoney } from '../../theme';

type Period = 'day' | 'month' | 'year';

const pad = (n: number): string => String(n).padStart(2, '0');

const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toMonth = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};

const bonusDateOf = (r: Record<string, unknown>): string =>
  String(r.date ?? r.month ?? r.created_at ?? '');

const statusColor = (status: string): string => {
  const t = status.toLowerCase();
  if (
    t.includes('present') ||
    t.includes('keldi') ||
    t.includes('kelgan') ||
    t === 'ok'
  )
    return colors.green;
  if (t.includes('late') || t.includes('kech')) return colors.gold;
  if (
    t.includes('absent') ||
    t.includes('kelmadi') ||
    t.includes('yo‘q') ||
    t.includes("yo'q")
  )
    return colors.red;
  return colors.blue;
};

export const StatsScreen: React.FC = () => {
  const { session } = useAuth();
  const employeeName = session?.name ?? '';

  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salaries, setSalaries] = useState<Record<string, unknown>[]>([]);
  const [bonuses, setBonuses] = useState<Record<string, unknown>[]>([]);
  const [attendance, setAttendance] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const month = toMonth(now);
        const year = String(now.getFullYear());
        const today = toLocalDate(now);

        const salRaw =
          period === 'year'
            ? await api.salaryPayments.list()
            : await api.salaryPayments.list(month);
        const salMine = (
          salRaw as Record<string, unknown>[]
        ).filter((r) => String(r.employee_name ?? '') === employeeName);
        const sal =
          period === 'year'
            ? salMine.filter((r) => String(r.month ?? '').startsWith(year))
            : salMine;

        const bonusRaw = (await api.bonuses.list()) as Record<
          string,
          unknown
        >[];
        const bon = bonusRaw.filter((r) => {
          const owner = r.employee_name ?? r.employee ?? null;
          if (owner != null && String(owner) !== employeeName) return false;
          const d = bonusDateOf(r);
          if (!d) return true;
          if (period === 'day') return d.startsWith(today) || d === month;
          if (period === 'month') return d.startsWith(month);
          return d.startsWith(year);
        });

        const attRaw =
          period === 'year'
            ? await api.attendance.list({ year })
            : await api.attendance.list({ month });
        let att = (attRaw as Record<string, unknown>[]).filter(
          (r) => String(r.employee_name ?? '') === employeeName,
        );
        if (period === 'day') {
          att = att.filter((r) => String(r.date ?? '') === today);
        }

        setSalaries(sal);
        setBonuses(bon);
        setAttendance(att);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Ma’lumot yuklanmadi.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, employeeName],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const salarySum = useMemo(
    () => salaries.reduce((a, r) => a + num(r.amount), 0),
    [salaries],
  );
  const bonusSum = useMemo(
    () =>
      bonuses.reduce((a, r) => a + num(r.amount ?? r.sum ?? 0), 0),
    [bonuses],
  );
  const total = salarySum + bonusSum;

  const periodLabel =
    period === 'day' ? 'Bugun' : period === 'month' ? 'Shu oy' : 'Shu yil';

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
        data={attendance}
        keyExtractor={(_, i) => String(i)}
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
                <Text style={s.errorText}>{error}</Text>
                <Btn title="Qayta urinish" onPress={() => load(false)} ghost />
              </Card>
            ) : (
              <Card>
                <Text style={s.cardTitle}>{periodLabel} — jami</Text>
                <Text style={s.total}>{fmtMoney(total)}</Text>
                <View style={s.row}>
                  <Text style={s.body}>Oylik: </Text>
                  <Text style={s.bodyBold}>{fmtMoney(salarySum)}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.body}>Mukofot: </Text>
                  <Text style={s.bodyBold}>{fmtMoney(bonusSum)}</Text>
                </View>
                <Muted>
                  {salaries.length} oylik yozuv • {bonuses.length} mukofot
                </Muted>
              </Card>
            )}

            <Text style={s.sectionTitle}>
              Davomat ({attendance.length})
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = String(item.status ?? '—');
          const c = statusColor(status);
          return (
            <View style={s.attRow}>
              <View>
                <Text style={s.attDate}>{String(item.date ?? '—')}</Text>
                <Text style={s.attTime}>
                  Kirish: {String(item.check_in ?? '—')}
                </Text>
              </View>
              <View style={[s.badge, { borderColor: c }]}>
                <Text style={[s.badgeText, { color: c }]}>{status}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          error ? null : (
            <Empty text="Bu davrda davomat yozuvlari topilmadi." />
          )
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
    marginBottom: 8,
  },
  total: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', marginBottom: 2 },
  body: { color: colors.text, fontSize: 14 },
  bodyBold: { color: colors.text, fontSize: 14, fontWeight: '800' },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
  },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  attDate: { color: colors.text, fontSize: 15, fontWeight: '700' },
  attTime: { color: colors.muted, fontSize: 13, marginTop: 2 },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  errorText: { color: colors.red, fontSize: 14, marginBottom: 8 },
});
