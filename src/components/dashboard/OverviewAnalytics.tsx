import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart,
  Layers, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle,
  CheckCircle2, Sparkles, Filter, Calendar, ChevronRight, BarChart3, Factory
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
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

export const OverviewAnalytics: React.FC<OverviewAnalyticsProps> = ({
  transactions,
  orders,
  materials,
  products,
  onNavigateTab,
  onOpenNewOrderModal,
  onOpenCashFlowModal
}) => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'haftalik' | 'oylik' | 'yillik'>('oylik');

  // Calculate Key Financial Metrics
  const totalIncome = transactions
    .filter(t => t.type === 'kirim')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'chiqim')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  // Total warehouse inventory value
  const totalInventoryValue = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);

  // Total finished products produced
  const totalProductionCount = products.reduce((sum, p) => sum + p.stockCount + p.soldCount, 0);

  // Active orders (jarayonda or tayyorlandi)
  const activeOrdersCount = orders.filter(o => o.status === 'jarayonda' || o.status === 'tayyorlandi').length;

  // Critical materials count
  const criticalMaterials = materials.filter(m => m.quantity <= m.minThreshold);

  // Interactive dynamic chart datasets based on timeRange
  const financialChartData = {
    haftalik: [
      { name: t.dash.overview.weekdays.dush, daromad: 3200000, xarajat: 1800000, sofFoyda: 1400000 },
      { name: t.dash.overview.weekdays.sesh, daromad: 4800000, xarajat: 2100000, sofFoyda: 2700000 },
      { name: t.dash.overview.weekdays.chor, daromad: 5600000, xarajat: 3200000, sofFoyda: 2400000 },
      { name: t.dash.overview.weekdays.pay, daromad: 7200000, xarajat: 2900000, sofFoyda: 4300000 },
      { name: t.dash.overview.weekdays.jum, daromad: 9100000, xarajat: 4100000, sofFoyda: 5000000 },
      { name: t.dash.overview.weekdays.shan, daromad: 6400000, xarajat: 2200000, sofFoyda: 4200000 },
      { name: t.dash.overview.weekdays.yak, daromad: 3900000, xarajat: 1400000, sofFoyda: 2500000 }
    ],
    oylik: [
      { name: t.dash.overview.weeks.w1, daromad: 24500000, xarajat: 14200000, sofFoyda: 10300000 },
      { name: t.dash.overview.weeks.w2, daromad: 32800000, xarajat: 18400000, sofFoyda: 14400000 },
      { name: t.dash.overview.weeks.w3, daromad: 41200000, xarajat: 21600000, sofFoyda: 19600000 },
      { name: t.dash.overview.weeks.w4, daromad: 48900000, xarajat: 26100000, sofFoyda: 22800000 }
    ],
    yillik: [
      { name: t.dash.overview.months.yan, daromad: 82000000, xarajat: 52000000, sofFoyda: 30000000 },
      { name: t.dash.overview.months.fev, daromad: 94000000, xarajat: 58000000, sofFoyda: 36000000 },
      { name: t.dash.overview.months.mar, daromad: 110000000, xarajat: 64000000, sofFoyda: 46000000 },
      { name: t.dash.overview.months.apr, daromad: 125000000, xarajat: 71000000, sofFoyda: 54000000 },
      { name: t.dash.overview.months.may, daromad: 138000000, xarajat: 76000000, sofFoyda: 62000000 },
      { name: t.dash.overview.months.iyun, daromad: 145000000, xarajat: 81000000, sofFoyda: 64000000 },
      { name: t.dash.overview.months.iyul, daromad: 152000000, xarajat: 85000000, sofFoyda: 67000000 },
      { name: t.dash.overview.months.avg, daromad: 161000000, xarajat: 89000000, sofFoyda: 72000000 },
      { name: t.dash.overview.months.sen, daromad: 174000000, xarajat: 94000000, sofFoyda: 80000000 }
    ]
  };

  // Production Volume Over Time Data
  const productionChartData = [
    { period: t.dash.overview.periods.p1, polo: 120, fartuk: 60, salfetka: 8500, quti: 600 },
    { period: t.dash.overview.periods.p2, polo: 180, fartuk: 95, salfetka: 12000, quti: 900 },
    { period: t.dash.overview.periods.p3, polo: 240, fartuk: 130, salfetka: 16500, quti: 1400 },
    { period: t.dash.overview.periods.p4, polo: 310, fartuk: 175, salfetka: 22000, quti: 1950 },
    { period: t.dash.overview.periods.p5, polo: 390, fartuk: 220, salfetka: 29000, quti: 2400 }
  ];

  // Material Resource Allocation Donut Data
  const resourceAllocationData = [
    { name: t.dash.overview.donut.allocation.fabric, value: 44, color: '#D4AF37' },
    { name: t.dash.overview.donut.allocation.paint, value: 22, color: '#0EA5E9' },
    { name: t.dash.overview.donut.allocation.thread, value: 16, color: '#10B981' },
    { name: t.dash.overview.donut.allocation.pack, value: 18, color: '#F59E0B' }
  ];

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
  };

  return (
    <div className="space-y-6">
      {/* Critical Stock Alert Banner if any material is below threshold */}
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
                {criticalMaterials.map(m => m.name).join(', ')} {t.dash.overview.alert.descSuffix}
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

      {/* 1. ASOSIY METRIC KPI KARTALARI (4 TA KARTA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Jami Oylik Daromad */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow">
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
              {formatUzbekSum(totalIncome)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.5%</span>
              <span className="text-[#8A8175] dark:text-[#8C8377] font-normal">{t.dash.overview.kpi.incomeDelta}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Ishlab Chiqarilgan Mahsulotlar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow">
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
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8.2%</span>
              <span className="text-[#8A8175] dark:text-[#8C8377] font-normal">{t.dash.overview.kpi.productionDelta}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Faol Buyurtmalar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow">
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
              <span>{t.dash.overview.kpi.ordersNote}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Ombor Xom-ashyo Qiymati */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow">
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
              {formatUzbekSum(totalInventoryValue)}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs text-[#8A8175] dark:text-[#8C8377]">
              <span>{materials.length} {t.dash.overview.kpi.stockTypesSuffix}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t.dash.overview.kpi.stockFull}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VIZUAL GRAFIKLAR (CHARTS & DIAGRAMS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Daromad va Xarajat Dinamikasi (AreaChart) - 8 cols */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.overview.finance.title}
              </h3>
              <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
                {t.dash.overview.finance.subtitle}
              </p>
            </div>

            {/* Oylik / Haftalik / Yillik Segmented Control */}
            <div className="inline-flex p-1 bg-stone-100 dark:bg-[#12100E] rounded-xl border border-stone-200 dark:border-[#2D251D]">
              <button
                onClick={() => setTimeRange('haftalik')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === 'haftalik'
                    ? 'bg-white dark:bg-[#2A241E] text-black dark:text-[#D4AF37] shadow-sm'
                    : 'text-[#8A8175] dark:text-[#8E8578] hover:text-black dark:hover:text-white'
                }`}
              >
                {t.dash.overview.finance.weekly}
              </button>
              <button
                onClick={() => setTimeRange('oylik')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === 'oylik'
                    ? 'bg-white dark:bg-[#2A241E] text-black dark:text-[#D4AF37] shadow-sm'
                    : 'text-[#8A8175] dark:text-[#8E8578] hover:text-black dark:hover:text-white'
                }`}
              >
                {t.dash.overview.finance.monthly}
              </button>
              <button
                onClick={() => setTimeRange('yillik')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === 'yillik'
                    ? 'bg-white dark:bg-[#2A241E] text-black dark:text-[#D4AF37] shadow-sm'
                    : 'text-[#8A8175] dark:text-[#8E8578] hover:text-black dark:hover:text-white'
                }`}
              >
                {t.dash.overview.finance.yearly}
              </button>
            </div>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2A241E] mb-6">
            <div>
              <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578] block">{t.dash.overview.finance.periodIncome}</span>
              <span className="text-sm font-bold text-amber-600 dark:text-[#D4AF37]">
                {formatUzbekSum(financialChartData[timeRange].reduce((a, b) => a + b.daromad, 0))}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578] block">{t.dash.overview.finance.periodExpense}</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {formatUzbekSum(financialChartData[timeRange].reduce((a, b) => a + b.xarajat, 0))}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578] block">{t.dash.overview.finance.netMargin}</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatUzbekSum(financialChartData[timeRange].reduce((a, b) => a + b.sofFoyda, 0))}
              </span>
            </div>
          </div>

          {/* AreaChart */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialChartData[timeRange]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(val: any) => [formatUzbekSum(Number(val)), '']}
                  contentStyle={{ backgroundColor: '#1A1816', borderColor: '#3E342B', borderRadius: '12px', color: '#FAF7F2' }}
                />
                <Area type="monotone" dataKey="daromad" name={t.dash.overview.finance.legendIncome} stroke="#D4AF37" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="xarajat" name={t.dash.overview.finance.legendExpense} stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="sofFoyda" name={t.dash.overview.finance.legendProfit} stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Xom-ashyo Sarfi vs Chiqish (Donut PieChart) - 4 cols */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.overview.donut.title}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-[#C59B27] dark:text-[#D4AF37] font-semibold">
                {t.dash.overview.donut.badge}
              </span>
            </div>
            <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">
              {t.dash.overview.donut.subtitle}
            </p>
          </div>

          <div className="h-56 my-2 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourceAllocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {resourceAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value}%`, t.dash.overview.finance.share]}
                  contentStyle={{ backgroundColor: '#1A1816', borderColor: '#3E342B', borderRadius: '8px', color: '#FAF7F2' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">100%</span>
              <span className="text-[10px] text-[#8A8175] dark:text-[#8E8578] uppercase">{t.dash.overview.donut.centerSuffix}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-[#29221C]">
            {resourceAllocationData.map((res, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: res.color }} />
                  <span className="text-[#4A4035] dark:text-[#D5CDBD]">{res.name}</span>
                </div>
                <span className="font-bold text-[#1A1715] dark:text-[#FAF7F2]">{res.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHART 3: Ishlab chiqarish unumdorligi (LineChart) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
              {t.dash.overview.production.title}
            </h3>
            <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
              {t.dash.overview.production.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {t.dash.overview.production.legendPolo}
            </span>
            <span className="flex items-center gap-1.5 text-cyan-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> {t.dash.overview.production.legendFartuk}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {t.dash.overview.production.legendSalfetka}
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productionChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" />
              <XAxis dataKey="period" stroke="#888888" fontSize={11} tickLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1816', borderColor: '#3E342B', borderRadius: '12px', color: '#FAF7F2' }}
              />
              <Line type="monotone" dataKey="polo" name={t.dash.overview.production.linePolo} stroke="#D4AF37" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="fartuk" name={t.dash.overview.production.lineFartuk} stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="salfetka" name={t.dash.overview.production.lineSalfetka} stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. SO‘NGGI AMALLAR & BUYURTMALAR (RECENT ACTIVITY & ORDERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Oxirgi qabul qilingan buyurtmalar (7 cols) */}
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
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-amber-600 dark:text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t.dash.overview.recent.viewAll}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => {
              const statusColors: Record<string, string> = {
                yangi: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
                jarayonda: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
                bosmada: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
                tayyor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                jonatilgan: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
                yetkazildi: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
                bekor_qilingan: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              };

              return (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-[#2C241D] bg-stone-50/50 dark:bg-[#141210] flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-[#C59B27] dark:text-[#D4AF37] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                      {order.orderNumber.replace('ORD-', '#')}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                        {order.clientName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
                        <span>{order.productName}</span>
                        <span>•</span>
                        <span>{order.quantity} {t.dash.overview.recent.quantityUnit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-[#1A1715] dark:text-[#FAF7F2]">
                      {formatUzbekSum(order.totalAmount)}
                    </div>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 capitalize ${statusColors[order.status] || ''}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Tsex va Ombor Harakatlari (5 cols) */}
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
              <div className="flex items-start gap-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#1A1715] dark:text-[#FAF7F2]">
                    {t.dash.overview.recent.feed[0].text}
                  </p>
                  <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578]">{t.dash.overview.recent.feed[0].time}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#1A1715] dark:text-[#FAF7F2]">
                    {t.dash.overview.recent.feed[1].text}
                  </p>
                  <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578]">{t.dash.overview.recent.feed[1].time}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#1A1715] dark:text-[#FAF7F2]">
                    {t.dash.overview.recent.feed[2].text}
                  </p>
                  <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578]">{t.dash.overview.recent.feed[2].time}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#1A1715] dark:text-[#FAF7F2]">
                    {t.dash.overview.recent.feed[3].text}
                  </p>
                  <span className="text-[11px] text-[#8A8175] dark:text-[#8E8578]">{t.dash.overview.recent.feed[3].time}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="pt-4 border-t border-stone-100 dark:border-[#29221C] grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => onNavigateTab('production_materials')}
              className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-[#251E18] hover:bg-stone-200 dark:hover:bg-[#312820] text-xs font-semibold text-[#1A1715] dark:text-[#FAF7F2] transition-colors cursor-pointer text-center"
            >
              {t.dash.overview.recent.quickAdd}
            </button>
            <button
              onClick={() => onNavigateTab('delivery_waybill')}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-[#D4AF37] transition-colors cursor-pointer text-center"
            >
              {t.dash.overview.recent.waybills}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
