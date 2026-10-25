import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Layers, AlertTriangle, CheckCircle2,
  Calendar, Building2, Package, X, Edit2, Trash2,
  Download, Clock, RotateCcw, ChevronLeft, ChevronRight,
  Boxes, FileSpreadsheet, Eye, ArrowUpDown, ShieldAlert,
  Hash, DollarSign, MapPin, CreditCard, Wallet
} from 'lucide-react';
import { RawMaterial, CompanyInfo } from '../../types/erp';
import { TablePagination } from './TablePagination';
import { MaterialReceiptModal, MaterialPurchasePayload } from './MaterialReceiptModal';
import { BomAnalysisCard } from './BomAnalysisCard';
import { useLanguage } from '../../context/LanguageContext';

interface ProductionMaterialsTabProps {
  materials: RawMaterial[];
  onAddMaterial: (material: Omit<RawMaterial, 'id'>) => void;
  onUpdateMaterial: (material: RawMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onRecordPurchase?: (payload: MaterialPurchasePayload) => void;
  companyInfo?: CompanyInfo | null;
}

export const ProductionMaterialsTab: React.FC<ProductionMaterialsTabProps> = ({
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onRecordPurchase
}) => {
  const { t } = useLanguage();
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'qty_desc' | 'qty_asc' | 'name_asc'>('date_desc');

  // Pagination States (10, 30, 50 rows per page)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  // Notification / Feedback State
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Open modal for Adding new
  const handleOpenAddModal = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  // Open modal for Editing existing
  const handleOpenEditModal = (material: RawMaterial) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  // Filtered & Sorted Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(item => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(search) ||
        item.batchNumber.toLowerCase().includes(search) ||
        item.supplier.toLowerCase().includes(search) ||
        (item.counterparty && item.counterparty.toLowerCase().includes(search)) ||
        (item.paymentMethod && item.paymentMethod.toLowerCase().includes(search)) ||
        item.storageLocation.toLowerCase().includes(search);

      const matchesUnit = selectedUnit === 'all' || item.unit === selectedUnit;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

      return matchesSearch && matchesUnit && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return (b.lastRestocked || '').localeCompare(a.lastRestocked || '');
      } else if (sortBy === 'date_asc') {
        return (a.lastRestocked || '').localeCompare(b.lastRestocked || '');
      } else if (sortBy === 'qty_desc') {
        return b.quantity - a.quantity;
      } else if (sortBy === 'qty_asc') {
        return a.quantity - b.quantity;
      } else if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [materials, searchTerm, selectedUnit, selectedStatus, sortBy]);

  // Pagination calculation
  const totalItems = filteredMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset current page if total pages reduced
  const validCurrentPage = Math.min(currentPage, totalPages);
  if (validCurrentPage !== currentPage && totalPages > 0) {
    setCurrentPage(validCurrentPage);
  }

  const paginatedMaterials = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredMaterials.slice(startIndex, startIndex + pageSize);
  }, [filteredMaterials, validCurrentPage, pageSize]);

  // Overall Stats
  const totalValue = materials.reduce((acc, m) => acc + (m.quantity * m.unitCost), 0);
  const lowStockCount = materials.filter(m => m.quantity <= m.minThreshold).length;

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const clean = dateStr.replace('T', ' ');
    const parts = clean.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '09:00';
    const [y, m, d] = datePart.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}.${m}.${y} ${timePart.slice(0, 5)}`;
  };

  // Excel (CSV with UTF-8 BOM) Export function
  const handleExportExcel = () => {
    const headers = [
      '№',
      t.dash.prodMaterials.excel.hName,
      t.dash.prodMaterials.excel.hCounterparty,
      t.dash.prodMaterials.excel.hPayment,
      t.dash.prodMaterials.excel.hUnit,
      t.dash.prodMaterials.excel.hQty,
      t.dash.prodMaterials.excel.hDate,
      t.dash.prodMaterials.excel.hUnitPrice,
      t.dash.prodMaterials.excel.hTotal,
      t.dash.prodMaterials.excel.hStatus
    ];

    const rows = filteredMaterials.map((mat, index) => [
      index + 1,
      `"${mat.name.replace(/"/g, '""')}"`,
      `"${(mat.counterparty || mat.supplier || '—').replace(/"/g, '""')}"`,
      `"${(mat.paymentMethod || t.dash.prodMaterials.table.defaultPayment).replace(/"/g, '""')}"`,
      `"${mat.unit}"`,
      mat.quantity,
      `"${formatDateTime(mat.lastRestocked)}"`,
      mat.unitCost,
      mat.quantity * mat.unitCost,
      `"${mat.status === 'yetarli' ? t.dash.prodMaterials.excel.statusOk : mat.status === 'ogohlantirish' ? t.dash.prodMaterials.excel.statusWarning : t.dash.prodMaterials.excel.statusCritical}"`
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `Kirim_Materiallari_Xom_Ashyo_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedUnit('all');
    setSelectedStatus('all');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm !== '' || selectedUnit !== 'all' || selectedStatus !== 'all';

  return (
    <div className="space-y-6">
      {/* BOM Tahlili — xom-ashyo sarfi strukturasi */}
      <BomAnalysisCard />

      {/* Top Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-[#D4AF37]">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#1A1715] dark:text-[#FAF7F2] tracking-tight">
                {t.dash.prodMaterials.header.title}
              </h2>
              <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">
                {t.dash.prodMaterials.header.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Excel Export & Add Material */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            title={t.dash.prodMaterials.header.exportTitle}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.dash.prodMaterials.header.exportLabel}</span>
            {downloadSuccess && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">✓</span>
            )}
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dash.prodMaterials.header.add}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#1A1714] border border-[#E2DBD1] dark:border-[#2C241D] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.prodMaterials.stats.typesTitle}</span>
            <Package className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-[#1A1715] dark:text-[#FAF7F2] mt-1.5">
            {materials.length} <span className="text-xs font-normal text-stone-400">{t.dash.prodMaterials.stats.typesUnit}</span>
          </div>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#1A1714] border border-[#E2DBD1] dark:border-[#2C241D] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.prodMaterials.stats.valueTitle}</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-[#D4AF37] mt-1.5">
            {formatUzbekSum(totalValue)}
          </div>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#1A1714] border border-[#E2DBD1] dark:border-[#2C241D] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.prodMaterials.stats.lowTitle}</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-500' : 'text-stone-400'}`} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-2">
            <span>{lowStockCount} {t.dash.prodMaterials.stats.countUnit}</span>
            {lowStockCount > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {t.dash.prodMaterials.stats.refillNeeded}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {t.dash.prodMaterials.stats.stockOk}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A1714] border border-[#E2DBD1] dark:border-[#2C241D] shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t.dash.prodMaterials.filters.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Unit & Status & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* O'lchov birligi filtri */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#7A6F62] dark:text-[#A69C8E] font-medium hidden sm:inline">{t.dash.prodMaterials.filters.unitLabel}</span>
              <select
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">{t.dash.prodMaterials.filters.allUnits}</option>
                <option value="dona">dona</option>
                <option value="kg">kg</option>
                <option value="gr">gr</option>
                <option value="litr">litr</option>
                <option value="m">m (metr)</option>
                <option value="pachka">pachka</option>
                <option value="blok">blok</option>
              </select>
            </div>

            {/* Zaxira holati filtri */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">{t.dash.prodMaterials.filters.allStatuses}</option>
              <option value="yetarli">{t.dash.prodMaterials.filters.sufficient}</option>
              <option value="ogohlantirish">{t.dash.prodMaterials.filters.warning}</option>
              <option value="kritik">{t.dash.prodMaterials.filters.critical}</option>
            </select>

            {/* Saralash */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="date_desc">{t.dash.prodMaterials.filters.sortNewest}</option>
                <option value="date_asc">{t.dash.prodMaterials.filters.sortOldest}</option>
                <option value="qty_desc">{t.dash.prodMaterials.filters.sortQtyDesc}</option>
                <option value="qty_asc">{t.dash.prodMaterials.filters.sortQtyAsc}</option>
                <option value="name_asc">{t.dash.prodMaterials.filters.sortName}</option>
              </select>
            </div>

            {/* Reset Filters */}
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-2 rounded-xl border border-stone-200 dark:border-[#2E2720] text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-1 cursor-pointer"
                title={t.dash.prodMaterials.filters.resetTitle}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.dash.prodMaterials.filters.reset}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Materials Table Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1A1714] border border-[#E2DBD1] dark:border-[#2C241D] shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/90 dark:bg-[#141210] text-[#7A6F62] dark:text-[#A69C8E] border-b border-stone-200 dark:border-[#2D251D]">
              <tr>
                <th className="py-3.5 px-4 font-black text-sm uppercase tracking-wider w-16 text-center text-amber-700 dark:text-[#E6C774]">№</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.productName}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.counterparty}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.payment}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.qtyUnit}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.receivedAt}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.unitPrice}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.totalValue}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">{t.dash.prodMaterials.table.status}</th>
                <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider text-right">{t.dash.prodMaterials.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#241E18] text-[#1A1715] dark:text-[#FAF7F2]">
              {paginatedMaterials.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">{t.dash.prodMaterials.table.emptyTitle}</p>
                    <p className="text-xs mt-1 text-stone-500">{t.dash.prodMaterials.table.emptyHint}</p>
                  </td>
                </tr>
              ) : (
                paginatedMaterials.map((mat, index) => {
                  const globalIndex = (validCurrentPage - 1) * pageSize + index + 1;
                  const isCritical = mat.quantity <= mat.minThreshold;
                  const isWarning = mat.quantity <= mat.minThreshold * 1.5 && !isCritical;

                  return (
                    <tr
                      key={mat.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-[#221C16] transition-colors"
                    >
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs">
                          {globalIndex}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isCritical ? 'bg-rose-500 ring-2 ring-rose-500/30' :
                            isWarning ? 'bg-amber-500 ring-2 ring-amber-500/30' : 'bg-emerald-500 ring-2 ring-emerald-500/30'
                          }`} />
                          <span className="font-bold text-[#1A1715] dark:text-[#FAF7F2] text-sm">{mat.name}</span>
                        </div>
                      </td>

                      {/* Kontragent / Mijoz */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900 dark:text-stone-100">
                          <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-[#D4AF37] shrink-0" />
                          <span>{mat.counterparty || mat.supplier || '—'}</span>
                        </div>
                      </td>

                      {/* To‘lov Usuli */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2D251D] text-stone-800 dark:text-stone-200">
                          {mat.paymentMethod || t.dash.prodMaterials.table.defaultPayment}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-extrabold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                            {new Intl.NumberFormat('uz-UZ').format(mat.quantity)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] border border-amber-500/30">
                            {mat.unit}
                          </span>
                        </div>
                        {isCritical && (
                          <span className="block text-[10px] text-rose-500 font-bold mt-0.5">
                            {t.dash.prodMaterials.table.minPrefix} {mat.minThreshold} {mat.unit}
                          </span>
                        )}
                      </td>
                      {/* Qachon va qaysi vaqtda kiritilgani */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{formatDateTime(mat.lastRestocked)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                        {formatUzbekSum(mat.unitCost)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-[#D4AF37] whitespace-nowrap">
                        {formatUzbekSum(mat.quantity * mat.unitCost)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCritical ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            {t.dash.prodMaterials.table.criticalBadge}
                          </span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {t.dash.prodMaterials.table.lowBadge}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {t.dash.prodMaterials.table.okBadge}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(mat)}
                            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                            title={t.dash.prodMaterials.table.editTitle}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMaterial(mat.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title={t.dash.prodMaterials.table.deleteTitle}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR (10, 30, 50 qatorlar) */}
        <TablePagination
          currentPage={validCurrentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* MODAL: yagona Material Kirimi oynasi (Omborxona sahifasi bilan BIR XIL) */}
      <MaterialReceiptModal
        open={isModalOpen}
        materials={materials}
        editingMaterial={editingMaterial}
        onClose={handleCloseModal}
        onAddMaterial={onAddMaterial}
        onUpdateMaterial={onUpdateMaterial}
        onRecordPurchase={onRecordPurchase}
      />
    </div>
  );
};
