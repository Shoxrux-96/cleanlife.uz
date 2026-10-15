import React from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Package, Layers, ShoppingCart,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, Plus, Calculator,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import { FinancialTransaction, ErpProduct, RawMaterial, ErpOrder } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface OverviewTabProps {
  transactions: FinancialTransaction[];
  products: ErpProduct[];
  materials: RawMaterial[];
  orders: ErpOrder[];
  onNavigateTab: (tab: 'overview' | 'cashflow' | 'products' | 'materials' | 'orders' | 'calculator') => void;
  onOpenNewTransaction: (type: 'kirim' | 'chiqim') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  transactions,
  products,
  materials,
  orders,
  onNavigateTab,
  onOpenNewTransaction
}) => {
  const { t } = useLanguage();
  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'kirim')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'chiqim')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  const totalInventoryValue = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
  const lowStockCount = materials.filter(m => m.quantity <= m.minThreshold).length;

  const activeOrders = orders.filter(o => o.status !== 'yetkazildi');
  const activeOrdersValue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#211B15] via-[#1A1613] to-[#141210] border border-[#3C3227] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37] tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {t.dash.overviewTab.banner.live}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#FDFBF7]">
            {t.dash.overviewTab.banner.welcome}
          </h2>
          <p className="text-xs sm:text-sm text-[#A89F93] mt-0.5">
            {t.dash.overviewTab.banner.summaryPrefix} {activeOrders.length} {t.dash.overviewTab.banner.summaryMiddle} {lowStockCount} {t.dash.overviewTab.banner.summarySuffix}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => onOpenNewTransaction('kirim')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dash.overviewTab.banner.addIncome}</span>
          </button>

          <button
            onClick={() => onOpenNewTransaction('chiqim')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dash.overviewTab.banner.addExpense}</span>
          </button>

          <button
            onClick={() => onNavigateTab('calculator')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E2BE46] text-black text-xs font-bold transition-all shadow-sm"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{t.dash.overviewTab.banner.calc}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jami Kirim */}
        <div className="p-5 rounded-xl bg-[#1C1815] border border-[#382F25] shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all">
          <div className="flex items-center justify-between text-[#8E8476] mb-2 text-xs font-medium uppercase tracking-wider">
            <span>{t.dash.overviewTab.kpi.incomeTitle}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#FDFBF7]">
            {formatCurrency(totalIncome)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <ArrowUpRight className="w-3 h-3" />
            <span>{t.dash.overviewTab.kpi.incomeNote}</span>
          </div>
        </div>

        {/* Jami Chiqim */}
        <div className="p-5 rounded-xl bg-[#1C1815] border border-[#382F25] shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all">
          <div className="flex items-center justify-between text-[#8E8476] mb-2 text-xs font-medium uppercase tracking-wider">
            <span>{t.dash.overviewTab.kpi.expenseTitle}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#FDFBF7]">
            {formatCurrency(totalExpense)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-rose-400 font-medium">
            <ArrowDownRight className="w-3 h-3" />
            <span>{t.dash.overviewTab.kpi.expenseNote}</span>
          </div>
        </div>

        {/* Sof Foyda */}
        <div className="p-5 rounded-xl bg-[#1C1815] border border-[#D4AF37]/40 shadow-lg relative overflow-hidden group hover:border-[#D4AF37] transition-all bg-gradient-to-b from-[#241F1A] to-[#1C1815]">
          <div className="flex items-center justify-between text-[#D4AF37] mb-2 text-xs font-semibold uppercase tracking-wider">
            <span>{t.dash.overviewTab.kpi.profitTitle}</span>
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center font-bold text-xs">
              {profitMargin}%
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#FDFBF7]">
            {formatCurrency(netProfit)}
          </div>
          <div className="mt-2 text-[11px] text-[#A89F93]">
            {t.dash.overviewTab.kpi.marginPrefix} <span className="text-[#D4AF37] font-semibold">{profitMargin}%</span>
          </div>
        </div>

        {/* Ombor Qoldig'i */}
        <div className="p-5 rounded-xl bg-[#1C1815] border border-[#382F25] shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all">
          <div className="flex items-center justify-between text-[#8E8476] mb-2 text-xs font-medium uppercase tracking-wider">
            <span>{t.dash.overviewTab.kpi.stockTitle}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#FDFBF7]">
            {formatCurrency(totalInventoryValue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#8E8476]">{materials.length} {t.dash.overviewTab.kpi.stockTypesSuffix}</span>
            {lowStockCount > 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {lowStockCount} {t.dash.overviewTab.kpi.stockLowSuffix}
              </span>
            ) : (
              <span className="text-emerald-400">{t.dash.overviewTab.kpi.stockOk}</span>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Orders & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Orders in Production */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181513] border border-[#352D24] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#FDFBF7] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
                {t.dash.overviewTab.orders.title}
              </h3>
              <p className="text-xs text-[#8E8476] mt-0.5">
                {t.dash.overviewTab.orders.subtitlePrefix} {formatCurrency(activeOrdersValue)}{t.dash.overviewTab.orders.subtitleSuffix}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-medium"
            >
              <span>{t.dash.overviewTab.orders.viewAll}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {activeOrders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-xl bg-[#201B17] border border-[#3A3025] hover:border-[#D4AF37]/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#FDFBF7] truncate">{order.clientName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#2D241C] text-[#D4AF37] border border-[#483B2C] font-mono">
                      {order.orderNumber}
                    </span>
                  </div>
                  <div className="text-xs text-[#A89F93] mt-0.5 truncate">
                    {order.productName} · <span className="text-[#DDD6CC] font-medium">{order.quantity} {t.dash.overviewTab.orders.unit}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-[#FDFBF7]">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${
                    order.status === 'jarayonda' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    order.status === 'tayyorlandi' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                    order.status === 'jonatildi' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {order.status === 'jarayonda' ? t.dash.overviewTab.orders.stProcessing :
                     order.status === 'tayyorlandi' ? t.dash.overviewTab.orders.stReady :
                     order.status === 'jonatildi' ? t.dash.overviewTab.orders.stSent : t.dash.overviewTab.orders.stDelivered}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Cash Flow / Kirim-Chiqim */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181513] border border-[#352D24] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#FDFBF7] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                {t.dash.overviewTab.finance.title}
              </h3>
              <p className="text-xs text-[#8E8476] mt-0.5">
                {t.dash.overviewTab.finance.subtitle}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('cashflow')}
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-medium"
            >
              <span>{t.dash.overviewTab.finance.fullCash}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-[#201B17] border border-[#3A3025] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'kirim'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {tx.type === 'kirim' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#FDFBF7] truncate">
                      {tx.category}
                      {tx.relatedClient && <span className="text-[#8E8476] font-normal"> · {tx.relatedClient}</span>}
                    </p>
                    <p className="text-[11px] text-[#A89F93] truncate">{tx.description}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-bold ${
                    tx.type === 'kirim' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'kirim' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                  <div className="text-[10px] text-[#8E8476] mt-0.5">{tx.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Inventory Alert & Quick Calculator Teaser */}
      <div className="p-5 rounded-2xl bg-[#1C1815] border border-[#382F25] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#FDFBF7]">
              {t.dash.overviewTab.calcTeaser.title}
            </h4>
            <p className="text-xs text-[#A89F93]">
              {t.dash.overviewTab.calcTeaser.desc}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('calculator')}
          className="px-4 py-2 rounded-lg bg-[#2A231C] hover:bg-[#342C23] border border-[#4D3F30] text-[#D4AF37] hover:text-[#E2BE46] text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>{t.dash.overviewTab.calcTeaser.open}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
