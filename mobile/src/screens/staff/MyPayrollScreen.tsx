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
  if (t === 'to_langan' || t === 'tolangan') return 'green';
  if (t === 'jarayonda' || t === 'kutilmoqda') return 'gold';
  return 'muted';
};
const labelForStatus = (status: string): string => {
  const t = status.toLowerCase();
  if (t === 'to_langan' || t === 'tolangan') return "To'langan";
  if (t === 'jarayonda') return 'Jarayonda';
  if (t === 'kutilmoqda') return 'Kutilmoqda';
  return status || '—';
};

export const MyPayrollScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const myId = session?.employeeId;
  const myName = session?.name;

  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const all = await api.payroll.list();
      // Faqat shu xodimnikini filter qilamiz — backend ham tekshiradi,
      // lekin ortiqcha ma'lumot yuklamaslik uchun UI'da kesamiz.
      const mine = (all as Rec[]).filter((r) => {
        const empId = Number(r.employee);
        if (myId && empId === myId) return true;
        const name = str(r, 'employee_name');
        return myName ? name === myName : false;
      });
      // Oxirgi oydan boshlab
      mine.sort((a, b) => String(b.month ?? '').localeCompare(String(a.month ?? '')));
      setRecords(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myId, myName]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    let net = 0, paid = 0, pending = 0;
    for (const r of records) {
      const amt = num(r.net_salary);
      net += amt;
      const st = str(r, 'status').toLowerCase();
      if (st === 'to_langan' || st === 'tolangan') paid += amt;
      else pending += amt;
    }
    return { net, paid, pending };
  }, [records]);

  if (loading) return <Loader />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
      >
        <View style={s.hero}>
          <Text style={s.heroTitle}>Mening ish haqim</Text>
          <Muted style={{ marginTop: 4 }}>{myName ? `${myName}` : ''}</Muted>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={s.statRow}>
          <View style={[s.stat, { borderColor: colors.gold + '55', backgroundColor: colors.gold + '14' }]}>
            <Text style={[s.statVal, { color: colors.gold }]}>{fmtMoney(totals.net)}</Text>
            <Text style={s.statLbl}>Jami hisoblangan</Text>
          </View>
          <View style={[s.stat, { borderColor: colors.green + '55', backgroundColor: colors.green + '14' }]}>
            <Text style={[s.statVal, { color: colors.green }]}>{fmtMoney(totals.paid)}</Text>
            <Text style={s.statLbl}>To'langan</Text>
          </View>
        </View>
        <View style={[s.statBig, { borderColor: colors.red + '55', backgroundColor: colors.red + '14' }]}>
          <Text style={[s.statVal, { color: colors.red }]}>{fmtMoney(totals.pending)}</Text>
          <Text style={s.statLbl}>Qoldiq (to'lanmagan)</Text>
        </View>

        <Text style={s.sectionTitle}>Oylik tarixi</Text>

        {records.length === 0 ? (
          <Empty text="Hali oylik yozuvi yo'q" />
        ) : (
          records.map((r) => (
            <View key={String(r.id)} style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.month}>{str(r, 'month') || '—'}</Text>
                <Pill tone={toneForStatus(str(r, 'status'))} label={labelForStatus(str(r, 'status'))} />
              </View>
              <View style={s.amtRow}>
                <Text style={s.amt}>{fmtMoney(num(r.net_salary))}</Text>
                {num(r.bonus) > 0 && <Text style={s.sub}>+ bonus {fmtMoney(num(r.bonus))}</Text>}
              </View>
              {!!str(r, 'payment_date') && (
                <Text style={s.date}>To'lov sanasi: {str(r, 'payment_date')}</Text>
              )}
              {num(r.deduction) !== 0 && (
                <Text style={[s.date, { color: colors.red }]}>Ushlanma: {fmtMoney(num(r.deduction))}</Text>
              )}
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
  statBig: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
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
  month: { color: c.text, fontSize: 14, fontWeight: '800' },
  amtRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  amt: { color: c.gold, fontSize: 18, fontWeight: '900' },
  sub: { color: c.muted, fontSize: 12, fontWeight: '600' },
  date: { color: c.muted, fontSize: 12, marginTop: 4 },
});
