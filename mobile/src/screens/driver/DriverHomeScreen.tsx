import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Btn, Card, Screen, Loader } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
const str = (r: Rec, k: string): string => String(r[k] ?? '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};
const isMine = (r: Rec, name: string): boolean => {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return str(r, 'driver_name').toLowerCase().includes(n);
};

const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const MONTH_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(Math.round(n));
};

export const DriverHomeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const driverName = session?.name ?? 'Haydovchi';
  const position = session?.position ?? 'Haydovchi';
  const now = new Date();
  const year = now.getFullYear();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<Rec | null>(null);
  const [employee, setEmployee] = useState<Rec | null>(null);
  const [activeTrips, setActiveTrips] = useState<Rec[]>([]);
  const [stats, setStats] = useState<{
    day: { count: number; fee: number };
    month: { count: number; fee: number };
    year: { count: number; fee: number };
  }>({
    day: { count: 0, fee: 0 },
    month: { count: 0, fee: 0 },
    year: { count: 0, fee: 0 },
  });
  const [monthly, setMonthly] = useState<{ month: number; count: number; fee: number }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [comp, emp, actPage, statsRes, monthRes] = await Promise.all([
        api.company.get().catch(() => null),
        session?.employeeId ? api.employees.get(session.employeeId).catch(() => null) : Promise.resolve(null),
        api.deliveries.page({ driver: driverName, pageSize: 5 }).catch(() => ({ results: [] as Rec[] } as any)),
        api.deliveries.stats({ driver: driverName, onlyDelivered: true }),
        api.deliveries.monthly({ driver: driverName, year, onlyDelivered: true }),
      ]);
      setCompany(comp);
      setEmployee(emp);
      // Active trips — yolda yoki kutilmoqda
      setActiveTrips(((actPage as any).results || []).filter((r: Rec) => {
        const st = str(r, 'status').toLowerCase();
        return isMine(r, driverName) && st !== 'yetkazildi';
      }));
      setStats({
        day: { count: statsRes.day?.trip_count ?? 0, fee: statsRes.day?.total_delivery_fee ?? 0 },
        month: { count: statsRes.month?.trip_count ?? 0, fee: statsRes.month?.total_delivery_fee ?? 0 },
        year: { count: statsRes.year?.trip_count ?? 0, fee: statsRes.year?.total_delivery_fee ?? 0 },
      });
      setMonthly(monthRes.months ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xatolik.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverName, session?.employeeId, year]);

  useEffect(() => { load(false); }, [load]);

  const maxFee = useMemo(
    () => Math.max(1, ...monthly.map((m) => m.fee)),
    [monthly],
  );
  const maxCount = useMemo(
    () => Math.max(1, ...monthly.map((m) => m.count)),
    [monthly],
  );
  const sel = monthly[selectedMonth] ?? null;

  if (loading && !refreshing) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const companyName = String(company?.name ?? 'Korxona');
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
        <View style={s.banner}>
          <View style={s.bannerTop}>
            <View style={s.bannerTextCol}>
              <Text style={s.bannerLabel}>KORXONA</Text>
              <Text style={s.companyName} numberOfLines={2}>{companyName}</Text>
              <View style={s.staffChip}>
                <View style={s.staffDot} />
                <Text style={s.staffNameInBanner} numberOfLines={1}>
                  {driverName}
                  {position ? ` · ${position}` : ''}
                </Text>
              </View>
            </View>
            <View style={s.logoWrap}>
              {isLogoImage ? (
                <Image source={{ uri: companyLogo }} style={s.logoImg} />
              ) : (
                <Text style={s.logoText}>{companyLogo || 'B'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={s.content}>
          {error ? (
            <Card>
              <Text style={s.err}>{error}</Text>
              <Btn title="Qayta urinish" onPress={() => load(false)} ghost />
            </Card>
          ) : null}

          {/* === DAROMAD KARTALARI === */}
          <View style={s.incomeHead}>
            <Text style={{ fontSize: 20 }}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.incomeHeadTitle}>Yetkazilgan reyslardan daromad</Text>
              <Text style={s.incomeHeadHint}>Faqat yetkazilgan reyslar</Text>
            </View>
          </View>
          <View style={s.incomeRow}>
            <View style={[s.incomeCard, { borderColor: '#F59E0B55' }]}>
              <Text style={s.incomePeriod}>Bugun</Text>
              <Text style={[s.incomeAmount, { color: '#F59E0B' }]} numberOfLines={1}>
                {fmtMoney(stats.day.fee)}
              </Text>
              <Text style={s.incomeMeta}>{stats.day.count} reys</Text>
            </View>
            <View style={[s.incomeCard, { borderColor: '#3B82F655' }]}>
              <Text style={s.incomePeriod}>Shu oy</Text>
              <Text style={[s.incomeAmount, { color: '#3B82F6' }]} numberOfLines={1}>
                {fmtMoney(stats.month.fee)}
              </Text>
              <Text style={s.incomeMeta}>{stats.month.count} reys</Text>
            </View>
            <View style={[s.incomeCard, { borderColor: '#22C55E55' }]}>
              <Text style={s.incomePeriod}>Shu yil</Text>
              <Text style={[s.incomeAmount, { color: '#22C55E' }]} numberOfLines={1}>
                {fmtMoney(stats.year.fee)}
              </Text>
              <Text style={s.incomeMeta}>{stats.year.count} reys</Text>
            </View>
          </View>

          {/* === OYLIK DIAGRAMMA — DAROMAD === */}
          <Card>
            <View style={s.chartHead}>
              <View>
                <Text style={s.chartTitle}>Oyma-oy daromad</Text>
                <Text style={s.chartHint}>{year} yil</Text>
              </View>
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendBox, { backgroundColor: colors.gold }]} />
                  <Text style={s.legendText}>Daromad</Text>
                </View>
              </View>
            </View>
            <View style={s.chartArea}>
              {monthly.map((m) => {
                const h = (m.fee / maxFee) * 140;
                const isSel = selectedMonth === m.month - 1;
                const isCur = m.month - 1 === now.getMonth();
                return (
                  <TouchableOpacity
                    key={m.month}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMonth(m.month - 1)}
                    style={s.barWrap}
                  >
                    <View style={s.barCol}>
                      {m.fee > 0 ? (
                        <View style={[s.bar, {
                          height: Math.max(4, h),
                          backgroundColor: colors.gold,
                          opacity: isSel ? 1 : 0.75,
                        }]} />
                      ) : (
                        <View style={[s.barEmpty, { backgroundColor: colors.cardBorder }]} />
                      )}
                    </View>
                    <Text style={[
                      s.barLabel,
                      isCur && { color: colors.gold, fontWeight: '900' },
                      isSel && !isCur && { color: colors.blue, fontWeight: '900' },
                    ]}>
                      {MONTH_SHORT[m.month - 1]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* === OYLIK DIAGRAMMA — REYSLAR SONI === */}
          <Card>
            <View style={s.chartHead}>
              <View>
                <Text style={s.chartTitle}>Oyma-oy reyslar soni</Text>
                <Text style={s.chartHint}>{year} yil</Text>
              </View>
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendBox, { backgroundColor: colors.green }]} />
                  <Text style={s.legendText}>Reyslar</Text>
                </View>
              </View>
            </View>
            <View style={s.chartArea}>
              {monthly.map((m) => {
                const h = (m.count / maxCount) * 140;
                const isSel = selectedMonth === m.month - 1;
                const isCur = m.month - 1 === now.getMonth();
                return (
                  <TouchableOpacity
                    key={m.month}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMonth(m.month - 1)}
                    style={s.barWrap}
                  >
                    <View style={s.barCol}>
                      {m.count > 0 ? (
                        <View style={[s.bar, {
                          height: Math.max(4, h),
                          backgroundColor: colors.green,
                          opacity: isSel ? 1 : 0.75,
                        }]} />
                      ) : (
                        <View style={[s.barEmpty, { backgroundColor: colors.cardBorder }]} />
                      )}
                    </View>
                    <Text style={[
                      s.barLabel,
                      isCur && { color: colors.gold, fontWeight: '900' },
                      isSel && !isCur && { color: colors.blue, fontWeight: '900' },
                    ]}>
                      {MONTH_SHORT[m.month - 1]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {sel ? (
              <View style={s.selBox}>
                <Text style={s.selTitle}>{MONTH_FULL[sel.month - 1]} {year}</Text>
                <View style={s.selRow}>
                  <View style={s.selItem}>
                    <View style={[s.dot, { backgroundColor: colors.green }]} />
                    <Text style={s.selLabel}>Reyslar</Text>
                    <Text style={s.selValue}>{sel.count}</Text>
                  </View>
                  <View style={s.selItem}>
                    <View style={[s.dot, { backgroundColor: colors.gold }]} />
                    <Text style={s.selLabel}>Daromad</Text>
                    <Text style={[s.selValue, { color: colors.gold }]}>
                      {fmtShort(sel.fee)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </Card>

          {/* === FAOL REYSLAR === */}
          {activeTrips.length > 0 ? (
            <Card>
              <Text style={s.sectionTitle}>Faol reyslar ({activeTrips.length})</Text>
              {activeTrips.map((t, i) => (
                <View key={String(t.id ?? i)} style={s.activeRow}>
                  <View style={[s.activeNum, { backgroundColor: colors.gold }]}>
                    <Text style={s.activeNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activeClient} numberOfLines={1}>
                      {str(t, 'client_name') || '—'}
                    </Text>
                    <Text style={s.activeAddr} numberOfLines={1}>
                      📍 {str(t, 'destination_address') || '—'}
                    </Text>
                  </View>
                  <Text style={[s.activeFee, { color: colors.gold }]}>
                    {fmtShort(num(t.delivery_fee))}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    banner: {
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
    bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bannerTextCol: { flex: 1 },
    bannerLabel: {
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
    staffDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
    staffNameInBanner: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', flexShrink: 1 },
    logoWrap: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 3, borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    logoImg: { width: 90, height: 90, borderRadius: 45, resizeMode: 'cover' },
    logoText: { color: c.goldDark, fontSize: 46, fontWeight: '900' },

    content: { padding: 16 },

    incomeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    incomeHeadTitle: { color: c.text, fontSize: 14, fontWeight: '900' },
    incomeHeadHint: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },

    incomeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    incomeCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
    },
    incomePeriod: {
      color: c.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    incomeAmount: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
    incomeMeta: { color: c.muted, fontSize: 11, fontWeight: '700', marginTop: 4 },

    chartHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    chartTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    chartHint: { color: c.muted, fontSize: 11, marginTop: 1, fontWeight: '600' },
    legendRow: { flexDirection: 'row', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
    barCol: {
      width: '70%',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    bar: { width: '100%', borderRadius: 4 },
    barEmpty: { width: '100%', height: 2, borderRadius: 2 },
    barLabel: { color: c.muted, fontSize: 10, marginTop: 6, fontWeight: '700' },

    selBox: {
      marginTop: 12,
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
    selValue: { color: c.text, fontSize: 13, fontWeight: '800', marginLeft: 'auto' },
    dot: { width: 8, height: 8, borderRadius: 4 },

    sectionTitle: { color: c.text, fontSize: 14, fontWeight: '900', marginBottom: 10 },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
    },
    activeNum: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    activeNumText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
    activeClient: { color: c.text, fontSize: 13, fontWeight: '800' },
    activeAddr: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },
    activeFee: { fontSize: 13, fontWeight: '900' },

    err: { color: c.red, fontSize: 13, marginBottom: 8 },
  });
