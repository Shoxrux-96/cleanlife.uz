import React, { useState, useMemo } from 'react';
import { 
  Plus, TrendingUp, TrendingDown, DollarSign, Filter, Search, 
  Trash2, CreditCard, Banknote, Building, Calendar, ArrowUpRight, 
  ArrowDownRight, Check, X, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FinancialTransaction, TransactionType, PaymentMethod } from '../../types/erp';
import { TablePagination } from './TablePagination';
import { useLanguage } from '../../context/LanguageContext';

interface CashFlowTabProps {
  transactions: FinancialTransaction[];
  onAddTransaction: (transaction: Omit<FinancialTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  modalInitialType: TransactionType;
}

export const CashFlowTab: React.FC<CashFlowTabProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  isAddModalOpen,
  setIsAddModalOpen,
  modalInitialType
}) => {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<'all' | 'kirim' | 'chiqim'>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | PaymentMethod>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Davr filtri: barchasi / oylik / yillik
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'year'>('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));

  // Form State for new transaction
  const [formData, setFormData] = useState<{
    type: TransactionType;
    category: string;
    amount: string;
    paymentMethod: PaymentMethod;
    date: string;
    description: string;
    relatedClient: string;
  }>({
    type: modalInitialType,
    category: modalInitialType === 'kirim' ? t.dash.cashflow.categories.kirim1 : t.dash.cashflow.categories.chiqim1,
    amount: '',
    paymentMethod: 'bank_transfer',
    date: new Date().toISOString().split('T')[0],
    description: '',
    relatedClient: ''
  });

  const categoriesKirim = [
    t.dash.cashflow.categories.kirim1,
    t.dash.cashflow.categories.kirim2,
    t.dash.cashflow.categories.kirim3,
    t.dash.cashflow.categories.kirim4,
    t.dash.cashflow.categories.kirim5
  ];

  const categoriesChiqim = [
    t.dash.cashflow.categories.chiqim1,
    t.dash.cashflow.categories.chiqim2,
    t.dash.cashflow.categories.chiqim3,
    t.dash.cashflow.categories.chiqim4,
    t.dash.cashflow.categories.chiqim5,
    t.dash.cashflow.categories.chiqim6,
    t.dash.cashflow.categories.chiqim7,
    t.dash.cashflow.categories.chiqim8,
    t.dash.cashflow.categories.chiqim9,
    t.dash.cashflow.categories.chiqim10
  ];

  // Asosiy filtrlar (qidiruv matnidan tashqari) — jami summalar shunga ko'ra hisoblanadi
  const baseFilteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterMethod !== 'all' && t.paymentMethod !== filterMethod) return false;
      if (periodFilter === 'month' && !(t.date || '').startsWith(filterMonth)) return false;
      if (periodFilter === 'year' && !(t.date || '').startsWith(filterYear)) return false;
      return true;
    });
  }, [transactions, filterType, filterMethod, periodFilter, filterMonth, filterYear]);

  // Totals calculations
  const totalIncome = baseFilteredTransactions
    .filter(t => t.type === 'kirim')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = baseFilteredTransactions
    .filter(t => t.type === 'chiqim')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // By payment method
  const bankBalance = baseFilteredTransactions.reduce((sum, t) => {
    if (t.paymentMethod === 'bank_transfer') {
      return sum + (t.type === 'kirim' ? t.amount : -t.amount);
    }
    return sum;
  }, 0);

  const cashBalance = baseFilteredTransactions.reduce((sum, t) => {
    if (t.paymentMethod === 'naqd') {
      return sum + (t.type === 'kirim' ? t.amount : -t.amount);
    }
    return sum;
  }, 0);

  const paymeBalance = baseFilteredTransactions.reduce((sum, t) => {
    if (t.paymentMethod === 'payme_click') {
      return sum + (t.type === 'kirim' ? t.amount : -t.amount);
    }
    return sum;
  }, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.cashflow.common.currencySuffix;
  };

  const filteredTransactions = baseFilteredTransactions.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchClient = t.relatedClient?.toLowerCase().includes(q) || false;
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      if (!matchClient && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  // Pagination States (10, 30, 50)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Excel eksport (joriy filtrdagi barcha yozuvlar)
  const handleExportExcel = () => {
    const rows = filteredTransactions.map((tx, i) => ({
      '№': i + 1,
      [t.dash.cashflow.excel.date]: tx.date,
      [t.dash.cashflow.excel.type]: tx.type === 'kirim' ? t.dash.cashflow.excel.typeIncome : t.dash.cashflow.excel.typeExpense,
      [t.dash.cashflow.excel.category]: tx.category,
      [t.dash.cashflow.excel.amount]: tx.amount,
      [t.dash.cashflow.excel.method]: tx.paymentMethod === 'naqd' ? t.dash.cashflow.excel.payCash : tx.paymentMethod === 'bank_transfer' ? t.dash.cashflow.excel.payBank : t.dash.cashflow.excel.payPayme,
      [t.dash.cashflow.excel.description]: tx.description,
      [t.dash.cashflow.excel.client]: tx.relatedClient || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.dash.cashflow.excel.sheet);
    const period = periodFilter === 'month' ? filterMonth : periodFilter === 'year' ? filterYear : t.dash.cashflow.excel.allPeriods;
    XLSX.writeFile(wb, `${t.dash.cashflow.excel.filePrefix}_${period}_${filterType}.xlsx`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount.replace(/\D/g, ''));
    if (!numAmount || numAmount <= 0) return;

    onAddTransaction({
      type: formData.type,
      category: formData.category,
      amount: numAmount,
      paymentMethod: formData.paymentMethod,
      date: formData.date,
      description: formData.description || `${formData.category} ${t.dash.cashflow.modal.defaultDescSuffix}`,
      relatedClient: formData.relatedClient || undefined
    });

    setIsAddModalOpen(false);
    setFormData({
      type: 'kirim',
      category: categoriesKirim[0],
      amount: '',
      paymentMethod: 'bank_transfer',
      date: new Date().toISOString().split('T')[0],
      description: '',
      relatedClient: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-emerald-500/30 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mb-2">
            <span>{t.dash.cashflow.summary.income}</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[#1A1715] dark:text-[#FDFBF7]">
            +{formatCurrency(totalIncome)}
          </div>
          <p className="text-[11px] text-[#7A6F62] dark:text-[#A89F93] mt-1">{t.dash.cashflow.summary.incomeSub}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-rose-500/30 shadow-sm">
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider mb-2">
            <span>{t.dash.cashflow.summary.expense}</span>
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-[#1A1715] dark:text-[#FDFBF7]">
            -{formatCurrency(totalExpense)}
          </div>
          <p className="text-[11px] text-[#7A6F62] dark:text-[#A89F93] mt-1">{t.dash.cashflow.summary.expenseSub}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-amber-500/40 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">
            <span>{t.dash.cashflow.summary.balance}</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-[#FDFBF7]">
            {formatCurrency(netBalance)}
          </div>
          <p className="text-[11px] text-[#7A6F62] dark:text-[#A89F93] mt-1">
            {t.dash.cashflow.summary.marginLabel} <span className="text-amber-600 dark:text-[#D4AF37] font-semibold">{totalIncome > 0 ? ((netBalance/totalIncome)*100).toFixed(1) : 0}%</span>
          </p>
        </div>
      </div>

      {/* Payment methods mini badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#181513] border border-stone-200 dark:border-[#352D24] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#7A6F62] dark:text-[#8E8476]">{t.dash.cashflow.methods.bank}</p>
              <p className="text-sm font-bold text-[#1A1715] dark:text-[#FDFBF7]">{formatCurrency(bankBalance)}</p>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-[#8E8476] font-mono">H/R</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#181513] border border-stone-200 dark:border-[#352D24] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#7A6F62] dark:text-[#8E8476]">{t.dash.cashflow.methods.cash}</p>
              <p className="text-sm font-bold text-[#1A1715] dark:text-[#FDFBF7]">{formatCurrency(cashBalance)}</p>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-[#8E8476] font-mono">NAQD</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#181513] border border-stone-200 dark:border-[#352D24] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#7A6F62] dark:text-[#8E8476]">{t.dash.cashflow.methods.payme}</p>
              <p className="text-sm font-bold text-[#1A1715] dark:text-[#FDFBF7]">{formatCurrency(paymeBalance)}</p>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-[#8E8476] font-mono">KARTA</span>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Add buttons */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#181513] border border-stone-200 dark:border-[#352D24] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-[#8E8476]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dash.cashflow.search.placeholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 dark:bg-[#201B17] border border-stone-200 dark:border-[#382F25] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FDFBF7] placeholder-stone-400 outline-none"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center bg-stone-100 dark:bg-[#201B17] border border-stone-200 dark:border-[#382F25] rounded-xl p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-white dark:bg-[#2D241C] text-amber-800 dark:text-[#D4AF37] shadow-sm' : 'text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
              }`}
            >
              {t.dash.cashflow.filters.all}
            </button>
            <button
              onClick={() => setFilterType('kirim')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterType === 'kirim' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
              }`}
            >
              {t.dash.cashflow.filters.income}
            </button>
            <button
              onClick={() => setFilterType('chiqim')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterType === 'chiqim' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
              }`}
            >
              {t.dash.cashflow.filters.expense}
            </button>
          </div>

          {/* Period filter: barchasi / oylik / yillik */}
          <div className="flex items-center bg-stone-100 dark:bg-[#201B17] border border-stone-200 dark:border-[#382F25] rounded-xl p-1">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodFilter === 'all' ? 'bg-white dark:bg-[#2D241C] text-amber-800 dark:text-[#D4AF37] shadow-sm' : 'text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
              }`}
            >
              {t.dash.cashflow.filters.allPeriod}
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodFilter === 'month' ? 'bg-white dark:bg-[#2D241C] text-amber-800 dark:text-[#D4AF37] shadow-sm' : 'text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
              }`}
            >
              {t.dash.cashflow.filters.monthly}
            </button>
            <button
              onClick={() => setPeriodFilter('year')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodFilter === 'year' ? 'bg-white dark:bg-[#2D241C] text-amber-800 dark:text-[#D4AF37] shadow-sm' : 'text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
              }`}
            >
              {t.dash.cashflow.filters.yearly}
            </button>
          </div>
          {periodFilter === 'month' && (
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => e.target.value && setFilterMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-[#201B17] border border-stone-200 dark:border-[#382F25] text-xs font-mono text-[#1A1715] dark:text-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}
          {periodFilter === 'year' && (
            <input
              type="number"
              min={2020}
              max={2100}
              value={filterYear}
              onChange={(e) => e.target.value && setFilterYear(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-[#201B17] border border-stone-200 dark:border-[#382F25] text-xs font-mono w-24 text-[#1A1715] dark:text-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}

          {/* Add buttons */}
          <button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                type: 'kirim',
                category: categoriesKirim[0]
              }));
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dash.cashflow.buttons.addIncome}</span>
          </button>

          <button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                type: 'chiqim',
                category: categoriesChiqim[0]
              }));
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dash.cashflow.buttons.addExpense}</span>
          </button>

          {/* Excel yuklash (yagona yashil tugma) */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            title={t.dash.cashflow.buttons.excelTitle}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.dash.cashflow.buttons.excel}</span>
          </button>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="rounded-2xl bg-white dark:bg-[#181513] border border-stone-200 dark:border-[#352D24] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-[#201B17] text-[#7A6F62] dark:text-[#8E8476] uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-[#352D24]">
              <tr>
                <th className="py-3 px-4 font-black text-sm uppercase tracking-wider w-16 text-center text-amber-700 dark:text-[#E6C774]">№</th>
                <th className="py-3 px-4">{t.dash.cashflow.table.type}</th>
                <th className="py-3 px-4">{t.dash.cashflow.table.date}</th>
                <th className="py-3 px-4">{t.dash.cashflow.table.categoryDesc}</th>
                <th className="py-3 px-4">{t.dash.cashflow.table.client}</th>
                <th className="py-3 px-4">{t.dash.cashflow.table.method}</th>
                <th className="py-3 px-4 text-right">{t.dash.cashflow.table.amount}</th>
                <th className="py-3 px-4 text-center">{t.dash.cashflow.table.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-[#2B231B] text-[#383127] dark:text-[#DDD7CD]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#8E8476]">
                    {t.dash.cashflow.table.empty}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        tx.type === 'kirim' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {tx.type === 'kirim' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {tx.type === 'kirim' ? t.dash.cashflow.table.typeIncome : t.dash.cashflow.table.typeExpense}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#7A6F62] dark:text-[#8E8476]">
                      {tx.date}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1A1715] dark:text-[#FDFBF7]">{tx.category}</div>
                      <div className="text-[11px] text-[#7A6F62] dark:text-[#8E8476] max-w-xs truncate">{tx.description}</div>
                    </td>

                    <td className="py-3.5 px-4 text-[#5C5346] dark:text-[#C8C0B5]">
                      {tx.relatedClient || <span className="text-stone-300 dark:text-[#685E53]">—</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#7A6F62] dark:text-[#A89F93]">
                        {tx.paymentMethod === 'bank_transfer' && <Building className="w-3 h-3 text-blue-500" />}
                        {tx.paymentMethod === 'naqd' && <Banknote className="w-3 h-3 text-emerald-500" />}
                        {tx.paymentMethod === 'payme_click' && <CreditCard className="w-3 h-3 text-cyan-500" />}
                        {tx.paymentMethod === 'bank_transfer' ? t.dash.cashflow.table.payBank :
                         tx.paymentMethod === 'naqd' ? t.dash.cashflow.table.payCash : t.dash.cashflow.methods.payme}
                      </span>
                    </td>

                    <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                      tx.type === 'kirim' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'kirim' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={t.dash.cashflow.table.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modal: Add New Transaction */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#3E342B] p-6 shadow-2xl text-[#1A1715] dark:text-[#EFECE6] relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-black dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-[#1A1715] dark:text-[#FDFBF7] mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-[#D4AF37]" />
              {t.dash.cashflow.modal.title}
            </h3>
            <p className="text-xs text-[#7A6F62] dark:text-[#8E8476] mb-4">
              {t.dash.cashflow.modal.subtitle}
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-[#141210] rounded-xl border border-stone-200 dark:border-[#322920]">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    type: 'kirim',
                    category: categoriesKirim[0]
                  })}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.type === 'kirim' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-[#7A6F62] dark:text-[#8E8476] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {t.dash.cashflow.modal.typeIncome}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    type: 'chiqim',
                    category: categoriesChiqim[0]
                  })}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.type === 'chiqim' 
                      ? 'bg-rose-600 text-white shadow-md' 
                      : 'text-[#7A6F62] dark:text-[#8E8476] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {t.dash.cashflow.modal.typeExpense}
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1">
                  {t.dash.cashflow.modal.amount}
                </label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#322920] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1">
                  {t.dash.cashflow.modal.category}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none cursor-pointer"
                >
                  {(formData.type === 'kirim' ? categoriesKirim : categoriesChiqim).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Client / Counterparty */}
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1">
                  {t.dash.cashflow.modal.client}
                </label>
                <input
                  type="text"
                  value={formData.relatedClient}
                  onChange={(e) => setFormData({ ...formData, relatedClient: e.target.value })}
                  placeholder={t.dash.cashflow.modal.clientPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1">
                  {t.dash.cashflow.modal.method}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank_transfer', label: t.dash.cashflow.modal.methodBank },
                    { id: 'naqd', label: t.dash.cashflow.modal.methodCash },
                    { id: 'payme_click', label: t.dash.cashflow.modal.methodPayme }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m.id as PaymentMethod })}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                        formData.paymentMethod === m.id
                          ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-[#D4AF37]'
                          : 'border-stone-200 dark:border-[#382F25] bg-stone-50 dark:bg-[#141210] text-[#7A6F62] dark:text-[#8E8476]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1">
                  {t.dash.cashflow.modal.date}
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1">
                  {t.dash.cashflow.modal.description}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.dash.cashflow.modal.descriptionPlaceholder}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-[#241E19] text-[#7A6F62] dark:text-[#8E8476] hover:bg-stone-100 dark:hover:bg-[#201B16] text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t.dash.cashflow.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black text-xs font-bold shadow-md hover:shadow-lg cursor-pointer transition-all"
                >
                  {t.dash.cashflow.modal.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
