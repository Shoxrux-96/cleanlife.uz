import React, { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Layers, ChevronRight, AlertTriangle, Factory,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { FinancialTransaction, ErpOrder, RawMaterial, ErpProduct } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface OverviewAnalyticsProps {
  transactions: FinancialTransaction[];
  orders: ErpOrder[];
  materials: RawMaterial[];
  products: ErpProduct[];
  onNavigateTab: (tabId: string) => void;
  onOpenNewOrderModal?: () => void;
  onOpenCashFlowModal?: (type: 'kirim' | 'chiqim') => void;
}

const DONUT_COLORS = ['#D4AF37', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

const formatSum = (val: number) =>
  new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(val) + " so'm";

// --- Date helpers ---
const WEEKDAYS = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

const parseDate = (d: string): Date | null => {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
};

export const OverviewAnalytics: React.FC<OverviewAnalyticsProps> = ({
  transactions,
  orders,
  materials,
  products,
  onNavigateTab,
}) => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'haftalik' | 'oylik' | 'yillik'>('oylik');

  // ============================================================
  // KPI metrics — from current state (all time)
  // ============================================================
  const totalIncome = transactions.filter((x) => x.type === 'kirim').reduce((s, x) => s + x.amount, 0);
  const totalExpense = transactions.filter((x) => x.type === 'chiqim').reduce((s, x) => s + x.amount, 0);
  const totalInventoryValue = materials.reduce((s, m) => s + m.quantity * m.unitCost, 0);
  const totalProductionCount = products.reduce((s, p) => s + p.stockCount + p.soldCount, 0);
  const activeOrdersCount = orders.filter((o) => o.status === 'jarayonda' || o.status === 'tayyorlandi').length;
  const criticalMaterials = materials.filter((m) => m.quantity <= m.minThreshold);

  // ============================================================
  // Period-over-period growth (last 30d vs prev 30d) — from transactions
  // ============================================================
  const { incomeDelta, expenseDelta } = useMemo(() => {
    const now = Date.now();
    const D = 24 * 3600 * 1000;
    const cur = { in: 0, out: 0 };
    const prev = { in: 0, out: 0 };
    for (const tx of transactions) {
      const d = parseDate(tx.date);
      if (!d) continue;
      const age = now - d.getTime();
      if (age < 30 * D) {
        if (tx.type === 'kirim') cur.in += tx.amount;
        else cur.out += tx.amount;
      } else if (age < 60 * D) {
        if (tx.type === 'kirim') prev.in += tx.amount;
        else prev.out += tx.amount;
      }
    }
    const pct = (c: number, p: number) => {
      if (p <= 0) return c > 0 ? 100 : 0;
      return ((c - p) / p) * 100;
    };
    return { incomeDelta: pct(cur.in, prev.in), expenseDelta: pct(cur.out, prev.out) };
  }, [transactions]);

  // ============================================================
  // Financial chart — real transactions grouped by period
  // ============================================================
  const financialChartData = useMemo(() => {
    const now = new Date();
    const D = 24 * 3600 * 1000;
    const nowMs = now.getTime();

    // Weekly: last 7 days
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(nowMs - (6 - i) * D);
      return { key: d.toDateString(), name: WEEKDAYS[d.getDay()], daromad: 0, xarajat: 0, sofFoyda: 0 };
    });
    const weeklyIdx = Object.fromEntries(weekly.map((w, i) => [w.key, i]));

    // Monthly: last 4 weeks
    const monthly: Array<{ from: number; to: number; name: string; daromad: number; xarajat: number; sofFoyda: number }> = Array.from({ length: 4 }, (_, i) => ({
      from: nowMs - (3 - i + 1) * 7 * D,
      to: nowMs - (3 - i) * 7 * D,
      name: `H-${i + 1}`,
      daromad: 0,
      xarajat: 0,
      sofFoyda: 0,
    }));

    // Yearly: last 12 months
    const yearly = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTHS[d.getMonth()], daromad: 0, xarajat: 0, sofFoyda: 0 };
    });
    const yearlyIdx = Object.fromEntries(yearly.map((m, i) => [m.key, i]));

    for (const tx of transactions) {
      const d = parseDate(tx.date);
      if (!d) continue;
      const field = tx.type === 'kirim' ? 'daromad' : 'xarajat';
      // weekly
      const wi = weeklyIdx[d.toDateString()];
      if (wi !== undefined) weekly[wi][field] += tx.amount;
      // monthly
      const ms = d.getTime();
      for (const m of monthly) if (ms >= m.from && ms < m.to) { m[field] += tx.amount; break; }
      // yearly
      const yi = yearlyIdx[`${d.getFullYear()}-${d.getMonth()}`];
      if (yi !== undefined) yearly[yi][field] += tx.amount;
    }
    weekly.forEach((w) => { w.sofFoyda = w.daromad - w.xarajat; });
    monthly.forEach((m) => { m.sofFoyda = m.daromad - m.xarajat; });
    yearly.forEach((y) => { y.sofFoyda = y.daromad - y.xarajat; });

    return { haftalik: weekly, oylik: monthly, yillik: yearly };
  }, [transactions]);

  // ============================================================
  // Resource allocation — materials grouped by category
  // ============================================================
  const resourceAllocation = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const m of materials) {
      const key = (m.category || "Boshqa").trim() || "Boshqa";
      byCat[key] = (byCat[key] || 0) + m.quantity * m.unitCost;
    }
    const total = Object.values(byCat).reduce((a, b) => a + b, 0);
    return Object.entries(byCat)
      .map(([name, value], i) => ({
        name,
        value: total > 0 ? +(value / total * 100).toFixed(1) : 0,
        rawValue: value,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [materials]);

  // ============================================================
  // Production chart — real products with sold/stock counts
  // ============================================================
  const productionChartData = useMemo(
    () =>
      products
        .map((p) => ({
          name: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
          fullName: p.name,
          Sotilgan: p.soldCount,
          Omborda: p.stockCount,
        }))
        .sort((a, b) => (b.Sotilgan + b.Omborda) - (a.Sotilgan + a.Omborda))
        .slice(0, 10),
    [products]
  );

  // ============================================================
  // Recent activity — real events from transactions / orders / materials
  // ============================================================
  const recentEvents = useMemo(() => {
    const evs: Array<{ color: string; text: string; time: string; ts: number }> = [];
    for (const tx of transactions.slice(0, 20)) {
      const d = parseDate(tx.date) || parseDate(tx.createdAt || '');
      if (!d) continue;
      evs.push({
        color: tx.type === 'kirim' ? '#10B981' : '#EF4444',
        text: `${tx.type === 'kirim' ? '💰 Kirim' : '📤 Chiqim'}: ${tx.category || '—'} · ${formatSum(tx.amount)}`,
        time: d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ts: d.getTime(),
      });
    }
    for (const o of orders.slice(0, 10)) {
      const d = parseDate(o.orderDate);
      if (!d) continue;
      evs.push({
        color: '#D4AF37',
        text: `📦 Yangi buyurtma: ${o.clientName} · ${o.productName} (${o.quantity} ta)`,
        time: d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
        ts: d.getTime(),
      });
    }
    for (const m of materials.slice(0, 10)) {
      if (!m.lastRestocked) continue;
      const d = parseDate(m.lastRestocked);
      if (!d) continue;
      evs.push({
        color: '#0EA5E9',
        text: `🏭 Material yangilandi: ${m.name} · ${m.quantity} ${m.unit}`,
        time: d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
        ts: d.getTime(),
      });
    }
    return evs.sort((a, b) => b.ts - a.ts).slice(0, 4);
  }, [transactions, orders, materials]);

  // ============================================================
  // Recent orders (last 4)
  // ============================================================
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''))
        .slice(0, 4),
    [orders]
  );

  const chartData = financialChartData[timeRange];
  const periodIncome = chartData.reduce((a, b) => a + b.daromad, 0);
  const periodExpense = chartData.reduce((a, b) => a + b.xarajat, 0);
  const periodNet = periodIncome - periodExpense;

  const Delta: React.FC<{ pct: number }> = ({ pct }) => {
    const positive = pct >= 0;
    return (
      <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        <span>{positive ? '+' : ''}{pct.toFixed(1)}%</span>
        <span className="text-[#8A8175] dark:text-[#8C8377] font-normal">oldingi 30 kunga nisbatan</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Critical Stock Alert Banner */}
      {criticalMaterials.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-rose-200">
                {t.dash.overview.alert.titlePrefix} {criticalMaterials.length} {t.dash.overview.alert.titleSuffix}
              </h4>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {criticalMaterials.map((m) => m.name).join(', ')} {t.dash.overview.alert.descSuffix}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('production_warehouse')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            {t.dash.overview.alert.cta}
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jami Daromad */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6F62] dark:text-[#A69C8E]">
              {t.dash.overview.kpi.incomeTitle}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[#C59B27] dark:text-[#D4AF37] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight">
              {formatSum(totalIncome)}
            </h3>
            <Delta pct={incomeDelta} />
          </div>
        </div>

        {/* Ishlab chiqarilgan mahsulotlar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6F62] dark:text-[#A69C8E]">
              {t.dash.overview.kpi.productionTitle}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight">
              {new Intl.NumberFormat('uz-UZ').format(totalProductionCount)} {t.dash.overview.kpi.productionUnit}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#8A8175] dark:text-[#8C8377]">
              <span>{products.length} ta mahsulot turi</span>
            </div>
          </div>
        </div>

        {/* Faol buyurtmalar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6F62] dark:text-[#A69C8E]">
              {t.dash.overview.kpi.ordersTitle}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight">
              {activeOrdersCount} {t.dash.overview.kpi.ordersUnit}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#8A8175] dark:text-[#8C8377]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>jarayonda / tayyorlandi</span>
            </div>
          </div>
        </div>

        {/* Ombor qiymati */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6F62] dark:text-[#A69C8E]">
              {t.dash.overview.kpi.stockTitle}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight">
              {formatSum(totalInventoryValue)}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs text-[#8A8175] dark:text-[#8C8377]">
              <span>{materials.length} {t.dash.overview.kpi.stockTypesSuffix}</span>
              <span className={criticalMaterials.length > 0 ? 'text-rose-500 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                {criticalMaterials.length > 0 ? `${criticalMaterials.length} kritik` : t.dash.overview.kpi.stockFull}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FINANCE + ALLOCATION CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.overview.finance.title}
              </h3>
              <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
                Haqiqiy moliyaviy tranzaksiyalar bo'yicha
              </p>
            </div>
            <div className="inline-flex p-1 bg-stone-100 dark:bg-[#12100E] rounded-xl border border-stone-200 dark:border-[#2D251D]">
              {(['haftalik', 'oylik', 'yillik'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-white dark:bg-[#2A241E] text-black dark:text-[#D4AF37] shadow-sm'
                      : 'text-[#8A8175] dark:text-[#8E8578] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {r === 'haftalik' ? t.dash.overview.finance.weekly : r === 'oylik' ? t.dash.overview.finance.monthly : t.dash.overview.finance.yearly}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2A241E] mb-6">
            <div>
              <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578] block">{t.dash.overview.finance.periodIncome}</span>
              <span className="text-sm font-bold text-amber-600 dark:text-[#D4AF37]">{formatSum(periodIncome)}</span>
            </div>
            <div>
              <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578] block">{t.dash.overview.finance.periodExpense}</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatSum(periodExpense)}</span>
            </div>
            <div>
              <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578] block">{t.dash.overview.finance.netMargin}</span>
              <span className={`text-sm font-bold ${periodNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatSum(periodNet)}
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData as Array<{ name: string; daromad: number; xarajat: number; sofFoyda: number }>} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => [formatSum(Number(v)), '']} contentStyle={{ backgroundColor: '#1A1816', borderColor: '#3E342B', borderRadius: 12, color: '#FAF7F2' }} />
                <Area type="monotone" dataKey="daromad" name={t.dash.overview.finance.legendIncome} stroke="#D4AF37" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="xarajat" name={t.dash.overview.finance.legendExpense} stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="sofFoyda" name={t.dash.overview.finance.legendProfit} stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resource allocation donut */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                Xom-ashyo Taqsimoti
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-[#C59B27] dark:text-[#D4AF37] font-semibold">
                Omborxona
              </span>
            </div>
            <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">
              Toifa bo'yicha ombordagi material qiymati
            </p>
          </div>

          <div className="h-56 my-2 relative flex items-center justify-center">
            {resourceAllocation.length === 0 ? (
              <div className="text-center text-[#8A8175] dark:text-[#8E8578] text-sm">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Omborxona bo'sh
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={resourceAllocation} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                      {resourceAllocation.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, _n, p) => [`${v}%  (${formatSum((p.payload as { rawValue?: number })?.rawValue ?? 0)})`, (p.payload as { name?: string })?.name || '']} contentStyle={{ backgroundColor: '#1A1816', borderColor: '#3E342B', borderRadius: 8, color: '#FAF7F2' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">100%</span>
                  <span className="text-[10px] text-[#8A8175] dark:text-[#8E8578] uppercase">Jami</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-[#29221C]">
            {resourceAllocation.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-[#4A4035] dark:text-[#D5CDBD] truncate">{r.name}</span>
                </div>
                <span className="font-bold text-[#1A1715] dark:text-[#FAF7F2] ml-2 shrink-0">{r.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTION BAR CHART */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
              Mahsulotlar bo'yicha ishlab chiqarish
            </h3>
            <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
              Har bir mahsulot uchun sotilgan va omborda qolgan soni
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sotilgan
            </span>
            <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Omborda
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {productionChartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#8A8175] dark:text-[#8E8578]">
              <Factory className="w-10 h-10 opacity-30 mb-2" />
              <span className="text-sm">Mahsulot ro'yxati bo'sh</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionChartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  labelFormatter={(l, p) => (p?.[0]?.payload as { fullName?: string })?.fullName || l}
                  contentStyle={{ backgroundColor: '#1A1816', borderColor: '#3E342B', borderRadius: 12, color: '#FAF7F2' }}
                />
                <Bar dataKey="Sotilgan" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Omborda" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RECENT ORDERS + ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.overview.recent.ordersTitle}
              </h3>
              <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">
                {t.dash.overview.recent.ordersSubtitle}
              </p>
            </div>
            <button onClick={() => onNavigateTab('orders')} className="text-xs font-semibold text-amber-600 dark:text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer">
              <span>{t.dash.overview.recent.viewAll}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="py-10 text-center text-[#8A8175] dark:text-[#8E8578] text-sm">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Hali buyurtma yo'q
              </div>
            ) : (
              recentOrders.map((order) => {
                const statusColors: Record<string, string> = {
                  yangi: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
                  jarayonda: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
                  tayyorlandi: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
                  tayyor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                  jonatilgan: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
                  yetkazildi: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
                  bekor_qilingan: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
                };
                return (
                  <div key={order.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-[#2C241D] bg-stone-50/50 dark:bg-[#141210] flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-[#C59B27] dark:text-[#D4AF37] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                        {(order.orderNumber || '').replace('ORD-', '#') || `#${order.id}`}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-[#1A1715] dark:text-[#FAF7F2] truncate">
                          {order.clientName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5 truncate">
                          <span className="truncate">{order.productName}</span>
                          <span>•</span>
                          <span>{order.quantity} {t.dash.overview.recent.quantityUnit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#1A1715] dark:text-[#FAF7F2]">
                        {formatSum(order.totalAmount)}
                      </div>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 capitalize ${statusColors[order.status] || 'border-stone-300 dark:border-stone-700 text-stone-500'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.overview.recent.activityTitle}
              </h3>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                {t.dash.overview.recent.live}
              </span>
            </div>

            <div className="space-y-3.5">
              {recentEvents.length === 0 ? (
                <div className="py-6 text-center text-[#8A8175] dark:text-[#8E8578] text-sm">
                  <Clock8Icon />
                  Hali faoliyat yo'q
                </div>
              ) : (
                recentEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="min-w-0">
                      <p className="font-medium text-[#1A1715] dark:text-[#FAF7F2] truncate">{e.text}</p>
                      <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578]">{e.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-[#29221C] grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => onNavigateTab('production_materials')} className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-[#251E18] hover:bg-stone-200 dark:hover:bg-[#312820] text-xs font-semibold text-[#1A1715] dark:text-[#FAF7F2] transition-colors cursor-pointer text-center">
              {t.dash.overview.recent.quickAdd}
            </button>
            <button onClick={() => onNavigateTab('delivery_waybill')} className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-[#D4AF37] transition-colors cursor-pointer text-center">
              {t.dash.overview.recent.waybills}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Clock8Icon: React.FC = () => (
  <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
