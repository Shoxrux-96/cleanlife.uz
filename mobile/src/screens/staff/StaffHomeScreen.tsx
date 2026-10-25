import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Btn, Card, Screen, Loader } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const pad = (n: number): string => String(n).padStart(2, '0');
const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMonth = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};

const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const MONTH_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(Math.round(n));
};

export const StaffHomeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();

  const employeeName = session?.name ?? 'Xodim';
  const employeeId = session?.employeeId;
  const position = session?.position ?? '';

  const now = new Date();
  const today = toLocalDate(now);
  const curMonth = toMonth(now);
  const curYear = String(now.getFullYear());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bonuses, setBonuses] = useState<Rec[]>([]);
  const [salaries, setSalaries] = useState<Rec[]>([]);
  const [employee, setEmployee] = useState<Rec | null>(null);
  const [company, setCompany] = useState<Rec | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [bon, sal, emp, comp] = await Promise.all([
        api.bonuses.list(),
        api.salaryPayments.list(),
        employeeId ? api.employees.get(employeeId).catch(() => null) : Promise.resolve(null),
        api.company.get().catch(() => null),
      ]);
      const mineBonus = (bon as Rec[]).filter((r) => {
        const owner = r.employee_name ?? r.employee ?? '';
        if (owner && String(owner) === employeeName) return true;
        if (r.employee_id && employeeId && Number(r.employee_id) === Number(employeeId)) return true;
        return false;
      });
      const mineSalary = (sal as Rec[]).filter(
        (r) => String(r.employee_name ?? '') === employeeName,
      );
      setBonuses(mineBonus);
      setSalaries(mineSalary);
      setEmployee(emp);
      setCompany(comp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumot yuklanmadi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, employeeName]);

  useEffect(() => { load(false); }, [load]);

  // === Hisoblar ===
  const bonusDate = (r: Rec): string => String(r.date ?? r.month ?? r.created_at ?? '');
  const salaryMonth = (r: Rec): string => String(r.month ?? '').slice(0, 7);

  // Kunlik (bugun)
  const dayBonus = useMemo(
    () => bonuses.reduce((a, r) => a + (bonusDate(r).startsWith(today) ? num(r.amount ?? r.sum) : 0), 0),
    [bonuses, today],
  );
  const dailyBase = useMemo(() => {
    const monthRec = salaries.find((r) => salaryMonth(r) === curMonth);
    const base = num(monthRec?.amount ?? employee?.salary);
    return base ? base / 30 : 0;
  }, [salaries, employee, curMonth]);
  const dayTotal = dailyBase + dayBonus;

  // Oylik (shu oy)
  const monthBonus = useMemo(
    () => bonuses.reduce((a, r) => a + (bonusDate(r).startsWith(curMonth) ? num(r.amount ?? r.sum) : 0), 0),
    [bonuses, curMonth],
  );
  const monthSalary = useMemo(
    () => salaries.reduce((a, r) => a + (salaryMonth(r) === curMonth ? num(r.amount) : 0), 0),
    [salaries, curMonth],
  );
  const monthTotal = monthSalary + monthBonus;

  // Yillik
  const yearBonus = useMemo(
    () => bonuses.reduce((a, r) => a + (bonusDate(r).startsWith(curYear) ? num(r.amount ?? r.sum) : 0), 0),
    [bonuses, curYear],
  );
  const yearSalary = useMemo(
    () => salaries.reduce((a, r) => a + (salaryMonth(r).startsWith(curYear) ? num(r.amount) : 0), 0),
    [salaries, curYear],
  );
  const yearTotal = yearSalary + yearBonus;

  // Oyma-oy diagramma uchun ma'lumot (joriy yil)
  const chartData = useMemo(() => {
    const arr: { m: number; salary: number; bonus: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const key = `${curYear}-${pad(m + 1)}`;
      const sal = salaries.reduce((a, r) => a + (salaryMonth(r) === key ? num(r.amount) : 0), 0);
      const bon = bonuses.reduce((a, r) => a + (bonusDate(r).startsWith(key) ? num(r.amount ?? r.sum) : 0), 0);
      arr.push({ m, salary: sal, bonus: bon });
    }
    return arr;
  }, [salaries, bonuses, curYear]);

  const maxBar = useMemo(
    () => Math.max(1, ...chartData.map((d) => d.salary + d.bonus)),
    [chartData],
  );

  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth());

  if (loading && !refreshing) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const sel = selectedMonth != null ? chartData[selectedMonth] : null;

  const companyName = String(company?.name ?? '');
  const companyAddr = String(company?.address ?? company?.location ?? '');
  const companyLogo = String(company?.logo ?? '');
  const isLogoImage = companyLogo.startsWith('data:') || companyLogo.startsWith('http');

  return (
    <Screen style={{ padding: 0 }}>
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
        {/* === KORXONA BANNER === */}
        <View style={s.companyBanner}>
          <View style={s.companyTopRow}>
            <View style={s.companyTextCol}>
              <Text style={s.companyLabel}>KORXONA</Text>
              <Text style={s.companyName} numberOfLines={2}>
                {companyName || 'Korxona'}
              </Text>
              <View style={s.staffChip}>
                <View style={s.staffDot} />
                <Text style={s.staffNameInBanner} numberOfLines={1}>
                  {employeeName}
                  {position ? ` · ${position}` : ''}
                </Text>
              </View>
            </View>
            <View style={s.companyLogoWrap}>
              {isLogoImage ? (
                <Image source={{ uri: companyLogo }} style={s.companyLogoImg} />
              ) : (
                <Text style={s.companyLogoText}>{companyLogo || 'B'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={s.contentWrap}>

        {/* === ASOSIY SUMMA (BUGUN) === */}
        <View style={s.todayCard}>
          <Text style={s.todayLabel}>BUGUNGI DAROMAD</Text>
          <Text style={s.todayAmount}>{fmtMoney(dayTotal)}</Text>
          <View style={s.todayRow}>
            <View style={s.todayDotRow}>
              <View style={[s.dot, { backgroundColor: colors.gold }]} />
              <Text style={s.todaySubText}>Oylik: {fmtMoney(dailyBase)}</Text>
            </View>
            <View style={s.todayDotRow}>
              <View style={[s.dot, { backgroundColor: colors.green }]} />
              <Text style={s.todaySubText}>Bonus: {fmtMoney(dayBonus)}</Text>
            </View>
          </View>
        </View>

        {error ? (
          <Card>
            <Text style={s.errText}>{error}</Text>
            <Btn title="Qayta urinish" onPress={() => load(false)} ghost />
          </Card>
        ) : null}

        {/* === OY + YIL KARTALARI === */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { borderColor: colors.gold + '55' }]}>
            <Text style={s.statLabel}>Shu oy</Text>
            <Text style={[s.statValue, { color: colors.gold }]}>{fmtMoney(monthTotal)}</Text>
            <View style={s.statBreak}>
              <Text style={s.breakText}>Oylik</Text>
              <Text style={[s.breakVal, { color: colors.text }]}>{fmtShort(monthSalary)}</Text>
            </View>
            <View style={s.statBreak}>
              <Text style={s.breakText}>Bonus</Text>
              <Text style={[s.breakVal, { color: colors.green }]}>+ {fmtShort(monthBonus)}</Text>
            </View>
          </View>
          <View style={[s.statCard, { borderColor: colors.green + '55' }]}>
            <Text style={s.statLabel}>Shu yil</Text>
            <Text style={[s.statValue, { color: colors.green }]}>{fmtMoney(yearTotal)}</Text>
            <View style={s.statBreak}>
              <Text style={s.breakText}>Oylik</Text>
              <Text style={[s.breakVal, { color: colors.text }]}>{fmtShort(yearSalary)}</Text>
            </View>
            <View style={s.statBreak}>
              <Text style={s.breakText}>Bonus</Text>
              <Text style={[s.breakVal, { color: colors.green }]}>+ {fmtShort(yearBonus)}</Text>
            </View>
          </View>
        </View>

        {/* === DIAGRAMMA === */}
        <Card>
          <View style={s.chartHead}>
            <View>
              <Text style={s.chartTitle}>Oyma-oy daromad</Text>
              <Text style={s.chartHint}>{curYear} yil</Text>
            </View>
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendBox, { backgroundColor: colors.gold }]} />
                <Text style={s.legendText}>Oylik</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendBox, { backgroundColor: colors.green }]} />
                <Text style={s.legendText}>Bonus</Text>
              </View>
            </View>
          </View>

          <View style={s.chartArea}>
            {chartData.map((d) => {
              const total = d.salary + d.bonus;
              const totalH = (total / maxBar) * 140;
              const salH = total > 0 ? (d.salary / total) * totalH : 0;
              const bonH = total > 0 ? (d.bonus / total) * totalH : 0;
              const isSel = selectedMonth === d.m;
              const isCur = d.m === now.getMonth();
              return (
                <TouchableOpacity
                  key={d.m}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMonth(d.m)}
                  style={s.barWrap}
                >
                  <View style={s.barColumn}>
                    {total > 0 ? (
                      <>
                        <View style={[s.barBonus, {
                          height: bonH,
                          backgroundColor: colors.green,
                          opacity: isSel ? 1 : 0.85,
                        }]} />
                        <View style={[s.barSalary, {
                          height: salH,
                          backgroundColor: colors.gold,
                          opacity: isSel ? 1 : 0.85,
                        }]} />
                      </>
                    ) : (
                      <View style={[s.barEmpty, { backgroundColor: colors.cardBorder }]} />
                    )}
                  </View>
                  <Text style={[
                    s.barLabel,
                    isCur && { color: colors.gold, fontWeight: '900' },
                    isSel && !isCur && { color: colors.blue, fontWeight: '900' },
                  ]}>
                    {MONTH_SHORT[d.m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {sel ? (
            <View style={s.selBox}>
              <Text style={s.selTitle}>
                {MONTH_FULL[sel.m]} {curYear}
              </Text>
              <View style={s.selRow}>
                <View style={s.selItem}>
                  <View style={[s.dot, { backgroundColor: colors.gold }]} />
                  <Text style={s.selLabel}>Oylik</Text>
                  <Text style={s.selValue}>{fmtMoney(sel.salary)}</Text>
                </View>
                <View style={s.selItem}>
                  <View style={[s.dot, { backgroundColor: colors.green }]} />
                  <Text style={s.selLabel}>Bonus</Text>
                  <Text style={[s.selValue, { color: colors.green }]}>+ {fmtMoney(sel.bonus)}</Text>
                </View>
              </View>
              <View style={s.selTotalRow}>
                <Text style={s.selTotalLabel}>Jami</Text>
                <Text style={s.selTotalValue}>{fmtMoney(sel.salary + sel.bonus)}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* === OXIRGI BONUSLAR === */}
        {bonuses.length > 0 ? (
          <Card>
            <Text style={s.chartTitle}>So'nggi bonuslar</Text>
            <View style={{ marginTop: 8 }}>
              {bonuses
                .slice()
                .sort((a, b) => bonusDate(b).localeCompare(bonusDate(a)))
                .slice(0, 5)
                .map((r, i) => (
                  <View key={i} style={s.bonusRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bonusDate}>{bonusDate(r)}</Text>
                      <Text style={s.bonusNote} numberOfLines={1}>
                        {String(r.notes ?? r.kpi_type ?? r.reason ?? '—')}
                      </Text>
                    </View>
                    <Text style={[s.bonusAmount, { color: colors.green }]}>
                      + {fmtMoney(num(r.amount ?? r.sum))}
                    </Text>
                  </View>
                ))}
            </View>
          </Card>
        ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    companyBanner: {
      backgroundColor: c.gold,
      paddingTop: 9,
      paddingBottom: 14,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: c.gold,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    companyTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    companyTextCol: {
      flex: 1,
      justifyContent: 'center',
    },
    companyLogoWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    companyLogoImg: { width: 90, height: 90, borderRadius: 45, resizeMode: 'cover' },
    companyLogoText: { color: c.goldDark, fontSize: 46, fontWeight: '900' },
    companyLabel: {
      color: '#1A171599',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 2,
    },
    companyName: {
      color: '#1A1715',
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 0.3,
      lineHeight: 26,
    },
    staffChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: '#1A1715',
      maxWidth: '100%',
    },
    staffDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    staffNameInBanner: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 1,
    },

    contentWrap: { padding: 16 },

    hero: { marginBottom: 0 },
    hello: { color: c.muted, fontSize: 13, fontWeight: '600' },
    name: { color: c.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.3, marginTop: 2 },
    position: { color: c.muted, fontSize: 13, marginTop: 2, fontWeight: '600' },

    todayCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: c.gold + '55',
      marginBottom: 14,
    },
    todayLabel: {
      color: c.gold,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.5,
    },
    todayAmount: {
      color: c.text,
      fontSize: 32,
      fontWeight: '900',
      marginTop: 4,
      letterSpacing: 0.5,
    },
    todayRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 10,
      flexWrap: 'wrap',
    },
    todayDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    todaySubText: { color: c.muted, fontSize: 12, fontWeight: '700' },
    dot: { width: 8, height: 8, borderRadius: 4 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
    },
    statLabel: {
      color: c.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '900',
      marginTop: 4,
      marginBottom: 8,
    },
    statBreak: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    breakText: { color: c.muted, fontSize: 11, fontWeight: '600' },
    breakVal: { fontSize: 12, fontWeight: '800' },

    chartHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    chartTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    chartHint: { color: c.muted, fontSize: 11, marginTop: 1, fontWeight: '600' },
    legendRow: { flexDirection: 'row', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendBox: { width: 10, height: 10, borderRadius: 3 },
    legendText: { color: c.muted, fontSize: 11, fontWeight: '700' },

    chartArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 170,
      paddingVertical: 4,
      gap: 4,
    },
    barWrap: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    barColumn: {
      width: '70%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexDirection: 'column',
    },
    barSalary: {
      width: '100%',
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
      minHeight: 2,
    },
    barBonus: {
      width: '100%',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      minHeight: 1,
    },
    barEmpty: {
      width: '100%',
      height: 2,
      borderRadius: 2,
    },
    barLabel: { color: c.muted, fontSize: 10, marginTop: 6, fontWeight: '700' },

    selBox: {
      marginTop: 14,
      padding: 12,
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    selTitle: { color: c.text, fontSize: 14, fontWeight: '900', marginBottom: 10 },
    selRow: { flexDirection: 'row', gap: 10 },
    selItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    selLabel: { color: c.muted, fontSize: 11, fontWeight: '700' },
    selValue: { color: c.text, fontSize: 12, fontWeight: '800', marginLeft: 'auto' },
    selTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
    },
    selTotalLabel: { color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    selTotalValue: { color: c.gold, fontSize: 16, fontWeight: '900' },

    bonusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
    },
    bonusDate: { color: c.muted, fontSize: 11, fontWeight: '700' },
    bonusNote: { color: c.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
    bonusAmount: { fontSize: 14, fontWeight: '900' },

    errText: { color: c.red, fontSize: 13, marginBottom: 8 },
  });
