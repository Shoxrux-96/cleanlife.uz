import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Empty, Loader, Muted, Screen } from '../../components';
import { Pill } from '../../ui';
import { radius, spacing } from '../../design';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};
const str = (r: Rec, k: string): string => String(r[k] ?? '');

const toneForStatus = (status: string): 'green' | 'gold' | 'muted' => {
  const t = status.toLowerCase();
  if (t === 'tasdiqlangan') return 'green';
  if (t === 'kutilmoqda') return 'gold';
  return 'muted';
};

export const MyBonusesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const myId = session?.employeeId;
  const myName = session?.name;

  const [bonuses, setBonuses] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const all = await api.bonuses.list();
      const mine = (all as Rec[]).filter((b) => {
        const empId = Number(b.employee);
        if (myId && empId === myId) return true;
        const name = str(b, 'employee_name');
        return myName ? name === myName : false;
      });
      mine.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
      setBonuses(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myId, myName]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    let total = 0, approved = 0;
    for (const b of bonuses) {
      const amt = num(b.amount);
      total += amt;
      if (str(b, 'status').toLowerCase() === 'tasdiqlangan') approved += amt;
    }
    return { total, approved };
  }, [bonuses]);

  if (loading) return <Loader />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
      >
        <View style={s.hero}>
          <Text style={s.heroTitle}>Mening bonuslarim</Text>
          <Muted style={{ marginTop: 4 }}>{myName ? `${myName}` : ''}</Muted>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={s.statRow}>
          <View style={[s.stat, { borderColor: colors.gold + '55', backgroundColor: colors.gold + '14' }]}>
            <Text style={[s.statVal, { color: colors.gold }]}>{fmtMoney(totals.total)}</Text>
            <Text style={s.statLbl}>Jami</Text>
          </View>
          <View style={[s.stat, { borderColor: colors.green + '55', backgroundColor: colors.green + '14' }]}>
            <Text style={[s.statVal, { color: colors.green }]}>{fmtMoney(totals.approved)}</Text>
            <Text style={s.statLbl}>Tasdiqlangan</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Bonus tarixi ({bonuses.length})</Text>

        {bonuses.length === 0 ? (
          <Empty text="Hali bonus yozuvi yo'q" />
        ) : (
          bonuses.map((b) => (
            <View key={String(b.id)} style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.date}>{str(b, 'date') || '—'}</Text>
                <Pill tone={toneForStatus(str(b, 'status'))} label={str(b, 'status') || '—'} />
              </View>
              <Text style={s.amt}>{fmtMoney(num(b.amount))}</Text>
              {!!str(b, 'kpi_type') && <Text style={s.sub}>KPI: {str(b, 'kpi_type')}</Text>}
              {!!str(b, 'reason') && <Text style={s.reason}>{str(b, 'reason')}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) => StyleSheet.create({
  hero: {
    backgroundColor: c.gold + '10',
    borderWidth: 1,
    borderColor: c.gold + '33',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroTitle: { color: c.gold, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  error: { color: c.red, fontSize: 13 },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { color: c.muted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  sectionTitle: { color: c.text, fontSize: 15, fontWeight: '900', marginTop: spacing.sm },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { color: c.muted, fontSize: 13, fontWeight: '700' },
  amt: { color: c.gold, fontSize: 20, fontWeight: '900' },
  sub: { color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  reason: { color: c.text, fontSize: 13, marginTop: 4 },
});
