import React, { useState } from 'react';
import { 
  Award, Plus, Search, Filter, CheckCircle2, Clock, 
  Sparkles, User, Calendar, X, FileText
} from 'lucide-react';
import { BonusRecord, Employee } from '../../types/erp';
import { TablePagination } from './TablePagination';
import { useLanguage } from '../../context/LanguageContext';

interface HrBonusesTabProps {
  bonuses: BonusRecord[];
  employees: Employee[];
  onAddBonus: (bonus: Omit<BonusRecord, 'id'>) => void;
  onApproveBonus: (id: string) => void;
}

export const HrBonusesTab: React.FC<HrBonusesTabProps> = ({
  bonuses,
  employees,
  onAddBonus,
  onApproveBonus
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Davr filtri: barchasi / kunlik (sana) / oylik / yillik
  const [periodFilter, setPeriodFilter] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Nofaol xodimlarga bonus yozilmaydi — faqat faol xodimlar ro'yxatda
  const activeEmployees = employees.filter(e => e.status !== 'nofaol');

  // New Bonus Form State
  const [formData, setFormData] = useState({
    employeeId: activeEmployees[0]?.id || '',
    kpiType: 'Rejani ortigʻi bilan bajarish' as BonusRecord['kpiType'],
    amount: 1000000,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const periodFilteredBonuses = bonuses.filter(b => {
    const d = b.date || '';
    if (periodFilter === 'day' && d !== filterDate) return false;
    if (periodFilter === 'month' && !d.startsWith(filterMonth)) return false;
    if (periodFilter === 'year' && !d.startsWith(filterYear)) return false;
    return true;
  });

  const filteredBonuses = periodFilteredBonuses.filter(b =>
    b.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.kpiType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredBonuses.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedBonuses = filteredBonuses.slice((validPage - 1) * pageSize, validPage * pageSize);

  const totalBonusesSum = periodFilteredBonuses.reduce((sum, b) => sum + b.amount, 0);
  const approvedSum = periodFilteredBonuses.filter(b => b.status === 'tasdiqlangan').reduce((sum, b) => sum + b.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEmp = employees.find(e => e.id === formData.employeeId);
    if (!selectedEmp || !formData.amount || selectedEmp.status === 'nofaol') return;

    onAddBonus({
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.fullName,
      kpiType: formData.kpiType,
      amount: formData.amount,
      date: formData.date,
      status: 'tasdiqlangan',
      notes: formData.notes || t.dash.bonus.modal.defaultNotes
    });

    setIsAddModalOpen(false);
    setFormData({
      employeeId: activeEmployees[0]?.id || '',
      kpiType: 'Rejani ortigʻi bilan bajarish',
      amount: 1000000,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
            {t.dash.bonus.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.bonus.header.sub}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <Award className="w-4 h-4" />
          <span>{t.dash.bonus.header.addBtn}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.bonus.cards.total}</span>
          <div className="text-xl font-bold text-amber-600 dark:text-[#D4AF37] mt-1">
            {formatUzbekSum(totalBonusesSum)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.bonus.cards.approved}</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{formatUzbekSum(approvedSum)}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.bonus.cards.rewarded}</span>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {periodFilteredBonuses.length} {t.dash.bonus.cards.records}
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t.dash.bonus.searchPh}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-stone-100 dark:bg-[#251E18] rounded-xl p-1">
              {(['all', 'day', 'month', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriodFilter(p);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                    periodFilter === p
                      ? 'bg-amber-500/20 text-[#C59B27] dark:text-[#D4AF37] border border-amber-500/30'
                      : 'text-[#7A6F62] dark:text-[#A69C8E]'
                  }`}
                >
                  {p === 'all' ? t.dash.bonus.period.all : p === 'day' ? t.dash.bonus.period.day : p === 'month' ? t.dash.bonus.period.month : t.dash.bonus.period.year}
                </button>
              ))}
            </div>
            {periodFilter === 'day' && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setFilterDate(e.target.value);
                    setCurrentPage(1);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono"
              />
            )}
            {periodFilter === 'month' && (
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setFilterMonth(e.target.value);
                    setCurrentPage(1);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono"
              />
            )}
            {periodFilter === 'year' && (
              <input
                type="number"
                min={2020}
                max={2100}
                value={filterYear}
                onChange={(e) => {
                  if (e.target.value) {
                    setFilterYear(e.target.value);
                    setCurrentPage(1);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono w-24"
              />
            )}
          </div>
        </div>
      </div>

      {/* Yagona jadval */}
      <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-[#141210] text-[#7A6F62] dark:text-[#A69C8E] border-b border-stone-200 dark:border-[#2D251D]">
              <tr>
                <th className="py-3 px-4 font-black text-sm uppercase tracking-wider w-16 text-center text-amber-700 dark:text-[#E6C774]">№</th>
                <th className="py-3 px-4 font-semibold">{t.dash.bonus.table.emp}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.bonus.table.kpi}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.bonus.table.sum}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.bonus.table.date}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.bonus.table.note}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.bonus.table.status}</th>
                <th className="py-3 px-4 font-semibold text-right">{t.dash.bonus.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#241E18] text-[#1A1715] dark:text-[#FAF7F2]">
              {paginatedBonuses.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">
                    <Award className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">{t.dash.bonus.empty.title}</p>
                    <p className="text-xs mt-1">{t.dash.bonus.empty.sub}</p>
                  </td>
                </tr>
              )}
              {paginatedBonuses.map((bonus, idx) => (
                <tr key={bonus.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors">
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs">
                      {(validPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold whitespace-nowrap">{bonus.employeeName}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-[#D4AF37] border border-amber-500/20 text-[11px] font-semibold whitespace-nowrap">
                      {bonus.kpiType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +{formatUzbekSum(bonus.amount)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {bonus.date}
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300 max-w-[220px] truncate" title={bonus.notes}>
                    {bonus.notes || '—'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {bonus.status === 'tasdiqlangan' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.dash.bonus.statusApproved}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>{t.dash.bonus.statusPending}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {bonus.status !== 'tasdiqlangan' && (
                      <button
                        onClick={() => onApproveBonus(bonus.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {t.dash.bonus.approveBtn}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={validPage}
          totalItems={filteredBonuses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal: Yangi Bonus Belgilash */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border border-[#E2DBD1] dark:border-[#382F26] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-[#2D251D] mb-4">
              <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.bonus.modal.title}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.bonus.modal.empLabel}
                </label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} — {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.bonus.modal.kpiLabel}
                </label>
                <select
                  value={formData.kpiType}
                  onChange={(e) => setFormData({ ...formData, kpiType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                >
                  <option value="Rejani ortigʻi bilan bajarish">{t.dash.bonus.kpi.plan}</option>
                  <option value="Brak foizini kamaytirish">{t.dash.bonus.kpi.quality}</option>
                  <option value="Tezkor sifatli yetkazish">{t.dash.bonus.kpi.delivery}</option>
                  <option value="Mehnat intizomi va tashabbus">{t.dash.bonus.kpi.discipline}</option>
                  <option value="Mijoz topgani uchun">{t.dash.bonus.kpi.client}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.bonus.modal.amountLabel}
                </label>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.bonus.modal.notesLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t.dash.bonus.modal.notesPh}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 dark:border-[#2D251D] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-[#382F26] text-stone-600 dark:text-stone-300"
                >
                  {t.dash.bonus.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold shadow-md"
                >
                  {t.dash.bonus.modal.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
