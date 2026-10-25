import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { H1, Muted, Screen } from '../../components';
import { colors, fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};
const sec = (r: Rec, k: string): Rec => (r[k] as Rec) ?? {};
const str = (r: Rec, k: string): string => String(r[k] ?? '');

type FeatureCard = {
  route: string;
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
};

const UZ_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

type Range = 'haftalik' | 'oylik' | 'yillik';

export const HomeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { session } = useAuth();
  const navigation = useNavigation<any>();

  const [overview, setOverview] = useState<Rec | null>(null);
  const [transactions, setTransactions] = useState<Rec[]>([]);
  const [orders, setOrders] = useState<Rec[]>([]);
  const [materials, setMaterials] = useState<Rec[]>([]);
  const [products, setProducts] = useState<Rec[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<Range>('oylik');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [ov, tx, od, mt, pd] = await Promise.all([
        api.overview().catch(() => ({} as Rec)),
        api.transactions.list().catch(() => [] as Rec[]),
        api.orders.list().catch(() => [] as Rec[]),
        api.materials.list().catch(() => [] as Rec[]),
        api.products.list().catch(() => [] as Rec[]),
      ]);
      setOverview(ov);
      setTransactions(tx);
      setOrders(od);
      setMaterials(mt);
      setProducts(pd);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Maʼlumot yuklanmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // --- Hisoblangan metriklar ---
  const totalIncome = useMemo(
    () => transactions.filter((t) => str(t, 'type') === 'kirim').reduce((s, t) => s + num(t.amount), 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter((t) => str(t, 'type') === 'chiqim').reduce((s, t) => s + num(t.amount), 0),
    [transactions],
  );
  const netProfit = totalIncome - totalExpense;

  const totalInventoryValue = useMemo(
    () =>
      materials.reduce(
        (s, m) => s + num(m.quantity ?? m.stock_count) * num(m.unit_cost ?? m.unitCost),
        0,
      ),
    [materials],
  );
  const totalProductionCount = useMemo(
    () =>
      products.reduce(
        (s, p) => s + num(p.stock_count ?? p.stockCount) + num(p.sold_count ?? p.soldCount),
        0,
      ),
    [products],
  );
  const activeOrdersCount = useMemo(
    () =>
      orders.filter((o) => ['jarayonda', 'tayyorlandi'].includes(str(o, 'status')))
        .length,
    [orders],
  );
  const criticalMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          num(m.quantity ?? m.stock_count) <= num(m.min_threshold ?? m.minThreshold),
      ),
    [materials],
  );
  const tripsMonth = sec(sec(overview ?? {}, 'trips'), 'month');

  // --- Chart ma'lumotlari: tanlangan davrdagi haqiqiy tranzaksiyalar ---
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; income: number; expense: number }[] = [];
    if (range === 'haftalik') {
      const days = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
      for (let i = 0; i < 7; i++) buckets.push({ label: days[i], income: 0, expense: 0 });
      const monday = new Date(now);
      const weekday = (now.getDay() + 6) % 7;
      monday.setDate(now.getDate() - weekday);
      transactions.forEach((t) => {
        const d = new Date(str(t, 'date'));
        if (Number.isNaN(d.getTime())) return;
        const diff = Math.floor((d.getTime() - monday.setHours(0, 0, 0, 0)) / 86400000);
        if (diff < 0 || diff > 6) return;
        const amt = num(t.amount);
        if (str(t, 'type') === 'kirim') buckets[diff].income += amt;
        else if (str(t, 'type') === 'chiqim') buckets[diff].expense += amt;
      });
    } else if (range === 'oylik') {
      for (let i = 1; i <= 4; i++) buckets.push({ label: `H${i}`, income: 0, expense: 0 });
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      transactions.forEach((t) => {
        const ds = str(t, 'date');
        if (!ds.startsWith(ym)) return;
        const day = Number(ds.slice(8, 10));
        const idx = Math.min(3, Math.floor((day - 1) / 7));
        const amt = num(t.amount);
        if (str(t, 'type') === 'kirim') buckets[idx].income += amt;
        else if (str(t, 'type') === 'chiqim') buckets[idx].expense += amt;
      });
    } else {
      for (let i = 0; i < 12; i++) buckets.push({ label: UZ_MONTHS[i], income: 0, expense: 0 });
      const yr = String(now.getFullYear());
      transactions.forEach((t) => {
        const ds = str(t, 'date');
        if (!ds.startsWith(yr)) return;
        const m = Number(ds.slice(5, 7)) - 1;
        if (m < 0 || m > 11) return;
        const amt = num(t.amount);
        if (str(t, 'type') === 'kirim') buckets[m].income += amt;
        else if (str(t, 'type') === 'chiqim') buckets[m].expense += amt;
      });
    }
    return buckets;
  }, [transactions, range]);

  const chartMax = useMemo(
    () => Math.max(1, ...chartData.map((d) => Math.max(d.income, d.expense))),
    [chartData],
  );

  // --- Resurs taqsimoti (donut ko'rinishini bar bilan taqlid qilamiz) ---
  const resourceAllocation = useMemo(() => {
    if (materials.length === 0) {
      return [
        { name: 'Mato', value: 44, color: '#D4AF37' },
        { name: 'Boʻyoq', value: 22, color: '#0EA5E9' },
        { name: 'Ip', value: 16, color: '#10B981' },
        { name: 'Qadoqlash', value: 18, color: '#F59E0B' },
      ];
    }
    const palette = ['#D4AF37', '#0EA5E9', '#10B981', '#F59E0B', '#A78BFA', '#F87171'];
    const totals = materials
      .slice(0, 6)
      .map((m, i) => ({
        name: str(m, 'name') || `Material ${i + 1}`,
        value: num(m.quantity ?? m.stock_count) * num(m.unit_cost ?? m.unitCost),
        color: palette[i % palette.length],
      }))
      .filter((r) => r.value > 0);
    const sum = totals.reduce((a, b) => a + b.value, 0) || 1;
    return totals.map((r) => ({ ...r, value: Math.round((r.value / sum) * 100) }));
  }, [materials]);

  const features: FeatureCard[] = [
    {
      route: 'Clients',
      title: 'Mijozlar Bazasi',
      subtitle: 'CRM',
      icon: '🏢',
      tint: '#F59E0B',
    },
    {
      route: 'Orders',
      title: 'Buyurtmalar',
      subtitle: 'Barcha buyurtmalar',
      icon: '🛒',
      tint: '#34D399',
    },
    {
      route: 'Waybills',
      title: 'Yuk Xatlari',
      subtitle: 'TTN',
      icon: '📄',
      tint: '#D4AF37',
    },
    {
      route: 'Deliveries',
      title: 'Yetkazib berish',
      subtitle: 'Haydovchi reyslari',
      icon: '🚚',
      tint: '#22D3EE',
    },
  ];

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        {/* Sarlavha */}
        <Muted>
          {session?.name ? `Xush kelibsiz, ${session.name}` : 'Clean Life ERP'}
        </Muted>
        {error ? <Text style={s.errorInline}>{error}</Text> : null}

        {/* Kritik material ogohlantirishi */}
        {criticalMaterials.length > 0 ? (
          <View style={s.alert}>
            <Text style={s.alertTitle}>
              ⚠️ {criticalMaterials.length} ta xom-ashyo kam
            </Text>
            <Text style={s.alertDesc} numberOfLines={2}>
              {criticalMaterials.map((m) => str(m, 'name')).filter(Boolean).join(', ')}
            </Text>
          </View>
        ) : null}

        {/* 5 ta feature kard — 2 ustun, markazlashtirilgan */}
        <View style={s.cardsGrid}>
          {features.map((f) => (
            <TouchableOpacity
              key={f.route}
              activeOpacity={0.85}
              style={s.featureCard}
              onPress={() => navigation.navigate(f.route)}
            >
              <View
                style={[
                  s.featureIcon,
                  { backgroundColor: f.tint + '22', borderColor: f.tint + '55' },
                ]}
              >
                <Text style={s.featureIconText}>{f.icon}</Text>
              </View>
              <Text style={s.featureTitle} numberOfLines={2}>
                {f.title}
              </Text>
              <Text style={s.featureSub} numberOfLines={1}>
                {f.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 💰 Moliya — toʻliq qator egallab turadigan katta card */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.moliyaCard}
          onPress={() => navigation.navigate('Finance')}
        >
          <View style={s.moliyaLeft}>
            <View style={s.moliyaIcon}>
              <Text style={s.moliyaIconText}>💰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.moliyaTitle}>Moliya</Text>
              <Text style={s.moliyaSub}>Kirim / Chiqim · Kassa qoldigʻi</Text>
            </View>
          </View>
          <View style={s.moliyaRight}>
            <Text style={s.moliyaBalanceLbl}>Sof balans</Text>
            <Text style={s.moliyaBalanceVal}>{fmtMoney(totalIncome)}</Text>
          </View>
        </TouchableOpacity>

        {/* === DASHBOARD KO'RSATKICHLARI === */}
        <Text style={s.sectionTitle}>Asosiy koʻrsatkichlar</Text>

        {/* KPI 4 ta katta (web dashboard'dagi kabi) */}
        <View style={s.kpiGrid}>
          <KpiCard
            title="Jami Daromad"
            value={fmtMoney(totalIncome)}
            delta="+12.5%"
            icon="💵"
            tint="#D4AF37"
          />
          <KpiCard
            title="Ishlab chiqarilgan"
            value={`${totalProductionCount.toLocaleString('uz-UZ')} dona`}
            delta="+8.2%"
            icon="🏭"
            tint="#22D3EE"
          />
          <KpiCard
            title="Faol Buyurtmalar"
            value={`${activeOrdersCount} ta`}
            delta={`${orders.length} jami`}
            icon="🛒"
            tint="#34D399"
          />
          <KpiCard
            title="Ombor qiymati"
            value={fmtMoney(totalInventoryValue)}
            delta={`${materials.length} tur`}
            icon="📦"
            tint="#A78BFA"
          />
        </View>

        {/* Daromad/Xarajat/Sof foyda summar kartasi */}
        <View style={s.summaryRow}>
          <View style={[s.summaryItem, { borderColor: colors.green + '55' }]}>
            <Text style={s.summaryLabel}>Daromad</Text>
            <Text style={[s.summaryValue, { color: colors.green }]}>
              {fmtMoney(totalIncome)}
            </Text>
          </View>
          <View style={[s.summaryItem, { borderColor: colors.red + '55' }]}>
            <Text style={s.summaryLabel}>Xarajat</Text>
            <Text style={[s.summaryValue, { color: colors.red }]}>
              {fmtMoney(totalExpense)}
            </Text>
          </View>
          <View
            style={[
              s.summaryItem,
              { borderColor: (netProfit >= 0 ? colors.gold : colors.red) + '55' },
            ]}
          >
            <Text style={s.summaryLabel}>Sof foyda</Text>
            <Text
              style={[
                s.summaryValue,
                { color: netProfit >= 0 ? colors.gold : colors.red },
              ]}
            >
              {fmtMoney(netProfit)}
            </Text>
          </View>
        </View>

        {/* Finance Chart */}
        <View style={s.chartCard}>
          <View style={s.chartHead}>
            <View>
              <Text style={s.chartTitle}>Daromad va Xarajat</Text>
              <Text style={s.chartSub}>Jonli tranzaksiyalar diagrammasi</Text>
            </View>
            <View style={s.segmented}>
              {(['haftalik', 'oylik', 'yillik'] as Range[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRange(r)}
                  style={[s.segBtn, range === r && s.segBtnActive]}
                >
                  <Text
                    style={[s.segText, range === r && s.segTextActive]}
                  >
                    {r === 'haftalik' ? 'Hafta' : r === 'oylik' ? 'Oy' : 'Yil'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading && !overview ? (
            <View style={s.chartSkel} />
          ) : (
            <View style={s.chartBody}>
              {chartData.map((d, i) => {
                const hIn = Math.round((d.income / chartMax) * 120);
                const hEx = Math.round((d.expense / chartMax) * 120);
                return (
                  <View key={i} style={s.chartCol}>
                    <View style={s.chartBars}>
                      <View style={[s.bar, { height: Math.max(2, hIn), backgroundColor: colors.green }]} />
                      <View style={[s.bar, { height: Math.max(2, hEx), backgroundColor: colors.red }]} />
                    </View>
                    <Text style={s.chartLabel} numberOfLines={1}>
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.green }]} />
              <Text style={s.legendText}>Daromad</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.red }]} />
              <Text style={s.legendText}>Xarajat</Text>
            </View>
          </View>
        </View>

        {/* Resurs taqsimoti */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Xom-ashyo taqsimoti</Text>
          <Text style={s.chartSub}>Ombor qiymati boʻyicha ulush</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {resourceAllocation.map((r) => (
              <View key={r.name}>
                <View style={s.allocHead}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.allocDot, { backgroundColor: r.color }]} />
                    <Text style={s.allocLabel} numberOfLines={1}>{r.name}</Text>
                  </View>
                  <Text style={[s.allocValue, { color: r.color }]}>{r.value}%</Text>
                </View>
                <View style={s.allocTrack}>
                  <View
                    style={[s.allocFill, { width: `${r.value}%`, backgroundColor: r.color }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Oxirgi buyurtmalar */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Oxirgi buyurtmalar</Text>
          {recentOrders.length === 0 ? (
            <Muted>Hali buyurtma yoʻq.</Muted>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              {recentOrders.map((o) => (
                <View key={String(o.id)} style={s.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderTitle} numberOfLines={1}>
                      {str(o, 'client_name') || `Buyurtma #${str(o, 'id')}`}
                    </Text>
                    <Text style={s.orderSub} numberOfLines={1}>
                      {str(o, 'status') || '—'}
                    </Text>
                  </View>
                  <Text style={s.orderAmount}>
                    {fmtMoney(num(o.total_amount ?? o.amount))}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={s.ghostBtn}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={s.ghostBtnText}>Barcha buyurtmalar →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </Screen>
  );
};

// --- Kichik KPI komponenti (markazlashtirilgan) ---
const KpiCard: React.FC<{
  title: string;
  value: string;
  delta: string;
  icon: string;
  tint: string;
}> = ({ title, value, delta, icon, tint }) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.kpiCard}>
      <View style={s.kpiTop}>
        <View
          style={[
            s.kpiIcon,
            { backgroundColor: tint + '22', borderColor: tint + '55' },
          ]}
        >
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <Text style={s.kpiTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={s.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[s.kpiDelta, { color: tint }]} numberOfLines={1}>
        {delta}
      </Text>
    </View>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  errorInline: { color: colors.red, fontSize: 12, marginTop: 6 },
  alert: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red + '55',
    backgroundColor: colors.red + '12',
  },
  alertTitle: { color: colors.red, fontWeight: '800', fontSize: 13 },
  alertDesc: { color: colors.red + 'CC', fontSize: 12, marginTop: 2 },

  // 5 feature kard — 2 ustun, markazlashtirilgan,
  // chap va o'ng chekkadan bir xil uzoqlikda (Screen padding: 16)
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    rowGap: 12,
  },
  featureCard: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureIconText: { fontSize: 26 },
  moliyaCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.gold + '55',
  },
  moliyaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  moliyaIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.gold + '22',
    borderWidth: 1,
    borderColor: colors.gold + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moliyaIconText: { fontSize: 26 },
  moliyaTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  moliyaSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  moliyaRight: { alignItems: 'flex-end' },
  moliyaBalanceLbl: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moliyaBalanceVal: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  featureSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  // KPI 4 ta — markazlashtirilgan
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  kpiTop: {
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  kpiDelta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },

  // Daromad/Xarajat/Foyda summary
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: { fontSize: 13, fontWeight: '900' },

  // Chart card umumiy
  chartCard: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chartHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  chartSub: { color: colors.muted, fontSize: 11, marginTop: 2 },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  segBtnActive: { backgroundColor: colors.gold + '22' },
  segText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  segTextActive: { color: colors.gold },

  chartSkel: { height: 160, borderRadius: 10, backgroundColor: colors.bg },
  chartBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 120,
  },
  bar: { width: 8, borderRadius: 2 },
  chartLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 6,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.muted, fontSize: 11 },

  // Allocation
  allocHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  allocDot: { width: 10, height: 10, borderRadius: 5 },
  allocLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  allocValue: { fontSize: 12, fontWeight: '800' },
  allocTrack: {
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocFill: { height: 8, borderRadius: 4 },

  // Buyurtmalar ro'yxati
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder + '66',
  },
  orderTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  orderSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  orderAmount: { color: colors.gold, fontSize: 12, fontWeight: '800' },

  ghostBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold + '55',
  },
  ghostBtnText: { color: colors.gold, fontWeight: '800', fontSize: 13 },
});
