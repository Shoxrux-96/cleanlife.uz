import React, { useState } from 'react';
import { 
  Users, UserPlus, Search, Phone, Mail, 
  MapPin, ShoppingCart, DollarSign, Building2, CheckCircle2, X, Trash2,
  Navigation, Compass, ExternalLink, Globe, Map as MapIcon, UserCheck,
  Download, FileSpreadsheet, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Award, TrendingUp, Layers, LayoutGrid, Table as TableIcon,
  Activity, Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, ErpClient } from '../../types/erp';
import { OsmMapPicker } from './OsmMapPicker';
import { useLanguage } from '../../context/LanguageContext';

interface CrmClientsTabProps {
  clients: ErpClient[];
  employees?: Employee[];
  onAddClient: (client: Omit<ErpClient, 'id'>) => void;
  onUpdateClient?: (client: ErpClient) => void;
  onDeleteClient: (id: string) => void;
}

const REGION_OPTIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand viloyati',
  'Andijon viloyati',
  'Farg‘ona viloyati',
  'Namangan viloyati',
  'Buxoro viloyati',
  'Qashqadaryo viloyati',
  'Surxondaryo viloyati',
  'Xorazm viloyati',
  'Navoiy viloyati',
  'Jizzax viloyati',
  'Sirdaryo viloyati',
  'Qoraqalpog‘iston Respublikasi'
];

// Yangilangan manba kategoriyalari (Hodimlar boshqa dan oldinda)

export const CrmClientsTab: React.FC<CrmClientsTabProps> = ({
  clients,
  employees = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient
}) => {
  const { t } = useLanguage();

  const SOURCE_CATEGORIES = [
    { id: 'instagram', label: t.dash.crm.sources.instagram },
    { id: 'telegram', label: t.dash.crm.sources.telegram },
    { id: 'sayt orqali', label: t.dash.crm.sources.site },
    { id: 'ko‘rgazma/tadbir', label: t.dash.crm.sources.exhibition },
    { id: 'hodimlar', label: t.dash.crm.sources.employees },
    { id: 'boshqa', label: t.dash.crm.sources.other },
  ];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Add Client Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Edit Client Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<ErpClient | null>(null);
  const [isEditMapOpen, setIsEditMapOpen] = useState(false);

  // Pagination states: 10, 30, 50 rows per page
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // New Client Form State
  const initialFormState = {
    name: '',
    company: '',
    phone: '+998 ',
    email: '',
    source: 'instagram',
    employeeName: '',
    region: 'Toshkent shahri',
    district: '',
    address: '',
    location: '',
    totalOrders: 1,
    totalSpent: 0,
    lastOrderDate: new Date().toISOString().split('T')[0],
    status: 'faol' as ErpClient['status']
  };

  const [formData, setFormData] = useState(initialFormState);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      c.company.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.employeeName && c.employeeName.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.district && c.district.toLowerCase().includes(term)) ||
      (c.region && c.region.toLowerCase().includes(term)) ||
      (c.source && c.source.toLowerCase().includes(term));

    const matchesRegion = selectedRegion === 'all' || c.region === selectedRegion;
    const matchesSource = selectedSource === 'all' || 
      (c.source && c.source.toLowerCase() === selectedSource.toLowerCase());

    return matchesSearch && matchesRegion && matchesSource;
  });

  // Pagination Calculations
  const totalItems = filteredClients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Handle filter changes with page reset
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleRegionChange = (val: string) => {
    setSelectedRegion(val);
    setCurrentPage(1);
  };

  const handleSourceChange = (val: string) => {
    setSelectedSource(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Excel Export Handler
  const handleExportToExcel = () => {
    const exportData = filteredClients.map((c, idx) => ({
      '№': idx + 1,
      [t.dash.crm.export.cCompany]: c.company,
      [t.dash.crm.export.cPerson]: c.name,
      [t.dash.crm.export.cPhone]: c.phone,
      [t.dash.crm.export.cEmail]: c.email || '',
      [t.dash.crm.export.cSource]: c.source || '',
      [t.dash.crm.export.cEmployee]: c.employeeName || '',
      [t.dash.crm.export.cRegion]: c.region || '',
      [t.dash.crm.export.cDistrict]: c.district || '',
      [t.dash.crm.export.cAddress]: c.address,
      [t.dash.crm.export.cLocation]: c.location || '',
      [t.dash.crm.export.cStatus]: c.status === 'faol' ? t.dash.crm.export.stActive : t.dash.crm.export.stInactive
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto column widths
    worksheet['!cols'] = [
      { wch: 6 },   // №
      { wch: 28 },  // Korxona
      { wch: 22 },  // Mas'ul
      { wch: 18 },  // Telefon
      { wch: 24 },  // Email
      { wch: 18 },  // Manba
      { wch: 22 },  // Hodim
      { wch: 20 },  // Viloyat
      { wch: 18 },  // Tuman
      { wch: 32 },  // Manzil
      { wch: 32 },  // Lokatsiya
      { wch: 14 },  // Holat
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t.dash.crm.export.sheet);

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `cleanlife_crm_mijozlar_${dateStr}.xlsx`);
  };

  // Add Client Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company.trim()) return;

    const sourceFormatted = formData.source;
    const employeeFinalName = formData.source === 'hodimlar' ? formData.employeeName.trim() : undefined;

    onAddClient({
      name: formData.name.trim(),
      company: formData.company.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      source: sourceFormatted,
      employeeName: employeeFinalName,
      region: formData.region,
      district: formData.district.trim(),
      address: formData.address.trim(),
      location: formData.location.trim(),
      totalOrders: Number(formData.totalOrders) || 1,
      totalSpent: Number(formData.totalSpent) || 0,
      lastOrderDate: formData.lastOrderDate,
      status: formData.status
    });

    setIsAddModalOpen(false);
    setIsMapOpen(false);
    setFormData(initialFormState);
  };

  // Start Edit Client
  const handleStartEdit = (client: ErpClient) => {
    setEditFormData({ ...client });
    setIsEditMapOpen(false);
    setIsEditModalOpen(true);
  };

  // Save Edit Client Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.name.trim() || !editFormData.company.trim()) return;

    const employeeFinalName = editFormData.source === 'hodimlar' ? editFormData.employeeName?.trim() : undefined;

    const updated: ErpClient = {
      ...editFormData,
      name: editFormData.name.trim(),
      company: editFormData.company.trim(),
      phone: editFormData.phone.trim(),
      email: editFormData.email?.trim() || '',
      source: editFormData.source,
      employeeName: employeeFinalName,
      region: editFormData.region,
      district: editFormData.district?.trim() || '',
      address: editFormData.address.trim(),
      location: editFormData.location?.trim() || '',
      status: editFormData.status
    };

    if (onUpdateClient) {
      onUpdateClient(updated);
    }
    setIsEditModalOpen(false);
    setEditFormData(null);
    setIsEditMapOpen(false);
  };

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.crm.currency.suffix;
  };

  const getSourceBadge = (client: ErpClient) => {
    if (!client.source) return <span className="text-stone-400">—</span>;
    const isEmp = client.source.toLowerCase().includes('hodim');
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-[#E6C774] border border-amber-500/30 whitespace-nowrap">
        {isEmp ? (
          <UserCheck className="w-3 h-3 text-amber-600 dark:text-[#D4AF37]" />
        ) : (
          <Compass className="w-3 h-3 text-amber-600 dark:text-[#D4AF37]" />
        )}
        <span>
          {isEmp && client.employeeName ? t.dash.crm.badge.empPrefix + ' ' + client.employeeName : client.source}
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
            {t.dash.crm.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.crm.header.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Excel Export Button */}
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            title={t.dash.crm.header.excelTitle}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.dash.crm.header.excel}</span>
          </button>

          {/* Add New Client Button */}
          <button
            onClick={() => {
              setFormData(initialFormState);
              setIsMapOpen(false);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.dash.crm.header.add}</span>
          </button>
        </div>
      </div>

      {/* 2. Search, Filters, and View Switcher Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={t.dash.crm.search.placeholder}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Viloyat Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] outline-none cursor-pointer"
            >
              <option value="all">{t.dash.crm.filter.allRegions}</option>
              {REGION_OPTIONS.map((reg) => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Manba Filter */}
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] outline-none cursor-pointer"
            >
              <option value="all">{t.dash.crm.filter.allSources}</option>
              {SOURCE_CATEGORIES.map((src) => (
                <option key={src.id} value={src.id}>{src.label}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle (Table / Cards) */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#251E18] text-amber-700 dark:text-[#E6C774] shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.crm.filter.tableTitle}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.dash.crm.filter.table}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-[#251E18] text-amber-700 dark:text-[#E6C774] shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.crm.filter.cardsTitle}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.dash.crm.filter.cards}</span>
            </button>
          </div>

          {(searchTerm || selectedRegion !== 'all' || selectedSource !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRegion('all');
                setSelectedSource('all');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-stone-200 dark:border-[#2E2720] hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
            >
              {t.dash.crm.filter.clear}
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN CONTENT: TABLE VIEW (Primary) or CARDS VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#1C1814] border-2 border-stone-200 dark:border-[#382F26] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-[#161310] border-b-2 border-stone-200 dark:border-[#2E261F] text-stone-700 dark:text-stone-300 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-3 text-center w-12">№</th>
                  <th className="py-3.5 px-4 min-w-[200px]">{t.dash.crm.table.companyResp}</th>
                  <th className="py-3.5 px-4 min-w-[160px]">{t.dash.crm.table.contact}</th>
                  <th className="py-3.5 px-4 min-w-[150px]">{t.dash.crm.table.source}</th>
                  <th className="py-3.5 px-4 min-w-[220px]">{t.dash.crm.table.regionAddress}</th>
                  <th className="py-3.5 px-4 text-center min-w-[120px]">{t.dash.crm.table.location}</th>
                  <th className="py-3.5 px-4 text-center w-24">{t.dash.crm.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-[#2A231C]">
                {paginatedClients.map((client, idx) => {
                  const globalIndex = startIndex + idx + 1;
                  return (
                    <tr 
                      key={client.id}
                      className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.03] transition-colors"
                    >
                      {/* № Badge */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-lg bg-amber-500/15 text-stone-950 dark:text-[#FAF7F2] font-black text-xs font-mono border border-amber-500/30">
                          {globalIndex}
                        </span>
                      </td>

                      {/* Korxona & Mas'ul */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-sm text-stone-900 dark:text-white leading-tight">
                          {client.company}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          {t.dash.crm.table.responsibleA} <span className="font-semibold text-stone-700 dark:text-stone-300">{client.name}</span>
                        </div>
                      </td>

                      {/* Aloqa */}
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="font-mono font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="text-[11px] text-stone-500 truncate flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate max-w-[140px]" title={client.email}>{client.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Murojaat Manbasi */}
                      <td className="py-3 px-4">
                        {getSourceBadge(client)}
                      </td>

                      {/* Viloyat & Manzil */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1">
                          <Globe className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{client.region || 'Toshkent shahri'}</span>
                          {client.district && (
                            <span className="text-stone-500 font-normal">({client.district})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1" title={client.address}>
                          {client.address}
                        </div>
                      </td>

                      {/* Lokatsiya */}
                      <td className="py-3 px-4 text-center">
                        {client.location ? (
                          client.location.startsWith('http') ? (
                            <a
                              href={client.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold text-[11px] border border-cyan-500/25 transition-colors"
                              title={t.dash.crm.table.mapOpenTitle}
                            >
                              <Navigation className="w-3 h-3" />
                              <span>{t.dash.crm.table.map}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold" title={client.location}>
                              {client.location.slice(0, 16)}...
                            </span>
                          )
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Amallar (Tahrirlash va O'chirish) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(client)}
                            className="p-1.5 rounded-lg hover:bg-amber-500/15 text-stone-400 hover:text-amber-600 dark:hover:text-[#D4AF37] transition-colors cursor-pointer"
                            title={t.dash.crm.table.editTitle}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteClient(client.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title={t.dash.crm.table.deleteTitle}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedClients.map((client, idx) => {
            const globalIndex = startIndex + idx + 1;
            return (
              <div
                key={client.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Index Badge & Company & Source */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs shrink-0">
                        {globalIndex}
                      </span>

                      <div>
                        <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2] leading-tight">
                          {client.company}
                        </h3>
                        <span className="text-xs text-stone-500">
                          {t.dash.crm.cards.responsibleB} <strong className="text-stone-700 dark:text-stone-300 font-semibold">{client.name}</strong>
                        </span>
                      </div>
                    </div>

                    {getSourceBadge(client)}
                  </div>

                  {/* Contact and Geographical Details */}
                  <div className="mt-4 space-y-2 text-xs text-stone-600 dark:text-stone-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{client.phone}</span>
                    </div>

                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 pt-1 border-t border-stone-100 dark:border-[#28211A]">
                      <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-stone-900 dark:text-white">
                          {client.region || 'Toshkent shahri'}
                        </span>
                        {client.district && (
                          <span className="text-stone-500 dark:text-stone-400">, {client.district}</span>
                        )}
                      </div>
                    </div>

                    {client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{client.address}</span>
                      </div>
                    )}

                    {client.location && (
                      <div className="flex items-center gap-2 pt-1">
                        <Navigation className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        {client.location.startsWith('http') ? (
                          <a
                            href={client.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            <span>{t.dash.crm.cards.mapOpenFull}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
                            {client.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#28211A] flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{client.status === 'faol' ? t.dash.crm.cards.active : t.dash.crm.cards.inactive}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(client)}
                      className="p-1.5 rounded-lg hover:bg-amber-500/15 text-stone-400 hover:text-amber-600 dark:hover:text-[#D4AF37] transition-colors cursor-pointer"
                      title={t.dash.crm.cards.editTitle}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteClient(client.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title={t.dash.crm.cards.deleteTitle}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <Building2 className="w-10 h-10 mx-auto text-stone-400 mb-2 opacity-50" />
          <h3 className="font-bold text-stone-700 dark:text-stone-200">{t.dash.crm.empty.title}</h3>
          <p className="text-xs text-stone-500 mt-1">{t.dash.crm.empty.desc}</p>
        </div>
      )}

      {/* 5. Pagination Bar (10, 30, 50 sahifali) */}
      {filteredClients.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Row count selection (10, 30, 50) */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-stone-400 font-semibold">
              {t.dash.crm.pagination.perPage}
            </span>
            <div className="flex items-center gap-1">
              {[10, 30, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'bg-stone-100 dark:bg-[#251E18] text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#2F2720]'
                  }`}
                >
                  {size} {t.dash.crm.pagination.unit}
                </button>
              ))}
            </div>
            <span className="text-stone-400 ml-2 hidden sm:inline">|</span>
            <span className="text-stone-500 dark:text-stone-400 hidden sm:inline">
              {t.dash.crm.pagination.showingA} <strong className="text-stone-900 dark:text-white">{startIndex + 1}–{endIndex}</strong> {t.dash.crm.pagination.showingB} {totalItems} {t.dash.crm.pagination.unit}
            </span>
          </div>

          {/* Right: Pagination Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.crm.pagination.first}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.crm.pagination.prev}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && pageNum - prev > 1;

                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && (
                        <span className="px-1 text-stone-400 font-bold">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[2rem] h-8 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                          safeCurrentPage === pageNum
                            ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                            : 'bg-stone-100 dark:bg-[#201B16] text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#2B241C]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.crm.pagination.next}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.crm.pagination.last}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. ADD CLIENT MODAL with OpenStreetMap Side Panel */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(15, 12, 10, 0.75)' }}
        >
          <div className={`material-modal-card bg-white dark:bg-[#181512] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full ${isMapOpen ? 'max-w-5xl' : 'max-w-xl'} p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-6 text-stone-950 dark:text-white transition-all`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-950 dark:text-white">
                    {t.dash.crm.form.addTitle}
                  </h3>
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                    {t.dash.crm.form.addDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsMapOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                title={t.dash.crm.form.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid: Left side Form, Right side OpenStreetMap */}
            <div className={`grid grid-cols-1 ${isMapOpen ? 'lg:grid-cols-2 gap-6' : 'gap-4'} items-start`}>
              {/* Form Side */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* 1. Korxona & Mas'ul shaxs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.company} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.dash.crm.form.companyPh}
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.person} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.dash.crm.form.personPh}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 2. Telefon & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.phone} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.email}
                    </label>
                    <input
                      type="email"
                      placeholder={t.dash.crm.form.emailPh}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 3. MANBA va HODIM ISMI */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/[0.05] border-2 border-amber-500/30 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.source} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <select
                      required
                      value={formData.source}
                      onChange={(e) => {
                        const newSource = e.target.value;
                        setFormData({ 
                          ...formData, 
                          source: newSource,
                          employeeName: newSource === 'hodimlar' && employees.length > 0 ? employees[0].fullName : formData.employeeName
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer"
                    >
                      {SOURCE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white font-semibold">
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.source === 'hodimlar' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-1">
                      <label className="block text-xs font-bold text-amber-900 dark:text-[#E6C774] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{t.dash.crm.form.employee} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span></span>
                      </label>

                      {employees.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            value={formData.employeeName}
                            onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-400 dark:border-amber-600/60 text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                          >
                            <option value="">{t.dash.crm.form.selectEmployee}</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.fullName} className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white">
                                {emp.fullName} ({emp.position})
                              </option>
                            ))}
                            <option value="custom">{t.dash.crm.form.manualOther}</option>
                          </select>

                          {(!formData.employeeName || formData.employeeName === 'custom' || !employees.some(e => e.fullName === formData.employeeName)) && (
                            <input
                              type="text"
                              required
                              placeholder={t.dash.crm.form.employeePhLong}
                              value={formData.employeeName === 'custom' ? '' : formData.employeeName}
                              onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-400 dark:border-amber-600/60 text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-stone-400"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder={t.dash.crm.form.employeePhAlt}
                          value={formData.employeeName}
                          onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-400 dark:border-amber-600/60 text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      )}
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        {t.dash.crm.form.employeeHint}
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. VILOYAT va TUMAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.region} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <select
                      required
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer"
                    >
                      {REGION_OPTIONS.map((reg) => (
                        <option key={reg} value={reg} className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white font-semibold">
                          {reg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.district} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.dash.crm.form.districtPh}
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 5. MANZIL */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.crm.form.address} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.dash.crm.form.addressPh}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>

                {/* 6. LOKATSIYA + MAP TUGMASI */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                    <span>{t.dash.crm.form.location}</span>
                    <span className="text-[10px] font-normal text-stone-500">{t.dash.crm.form.locationHint}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder={t.dash.crm.form.locationPh}
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                      />
                      <Navigation className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMapOpen(!isMapOpen)}
                      className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                        isMapOpen 
                          ? 'bg-amber-500 text-stone-950 border-2 border-amber-600 ring-2 ring-amber-500/30'
                          : 'bg-stone-100 dark:bg-[#221C16] hover:bg-amber-500/20 text-amber-800 dark:text-[#E6C774] border-2 border-amber-500/40'
                      }`}
                      title={t.dash.crm.form.mapTitle}
                    >
                      <MapIcon className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
                      <span>{isMapOpen ? t.dash.crm.form.mapHide : t.dash.crm.form.mapShow}</span>
                    </button>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="pt-4 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsMapOpen(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t.dash.crm.form.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {t.dash.crm.form.saveAdd}
                  </button>
                </div>
              </form>

              {/* Right Side: OpenStreetMap Panel */}
              {isMapOpen && (
                <div className="h-full min-h-[420px] lg:min-h-[500px]">
                  <OsmMapPicker
                    initialLocation={formData.location}
                    onSelectLocation={(locStr, details) => {
                      setFormData(prev => ({
                        ...prev,
                        location: locStr,
                        address: prev.address || (details?.address ? details.address.split(',').slice(0, 2).join(',') : prev.address)
                      }));
                    }}
                    onClose={() => setIsMapOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. EDIT CLIENT MODAL with OpenStreetMap Side Panel */}
      {isEditModalOpen && editFormData && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(15, 12, 10, 0.75)' }}
        >
          <div className={`material-modal-card bg-white dark:bg-[#181512] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full ${isEditMapOpen ? 'max-w-5xl' : 'max-w-xl'} p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-6 text-stone-950 dark:text-white transition-all`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
                  <Pencil className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-950 dark:text-white">
                    {t.dash.crm.form.editTitle}
                  </h3>
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                    {editFormData.company} · ID: {editFormData.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsEditMapOpen(false);
                  setEditFormData(null);
                }}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                title={t.dash.crm.form.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid: Left side Form, Right side OpenStreetMap */}
            <div className={`grid grid-cols-1 ${isEditMapOpen ? 'lg:grid-cols-2 gap-6' : 'gap-4'} items-start`}>
              {/* Form Side */}
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                {/* 1. Korxona & Mas'ul shaxs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.company} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.company}
                      onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.person} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 2. Telefon & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.phone} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.email}
                    </label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 3. MANBA va HODIM ISMI */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/[0.05] border-2 border-amber-500/30 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.source} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <select
                      required
                      value={editFormData.source || 'instagram'}
                      onChange={(e) => {
                        const newSource = e.target.value;
                        setEditFormData({ 
                          ...editFormData, 
                          source: newSource,
                          employeeName: newSource === 'hodimlar' && employees.length > 0 && !editFormData.employeeName 
                            ? employees[0].fullName 
                            : editFormData.employeeName
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer"
                    >
                      {SOURCE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white font-semibold">
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editFormData.source === 'hodimlar' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-1">
                      <label className="block text-xs font-bold text-amber-900 dark:text-[#E6C774] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{t.dash.crm.form.employee} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span></span>
                      </label>

                      {employees.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            value={editFormData.employeeName || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, employeeName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-400 dark:border-amber-600/60 text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                          >
                            <option value="">{t.dash.crm.form.selectEmployee}</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.fullName} className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white">
                                {emp.fullName} ({emp.position})
                              </option>
                            ))}
                            <option value="custom">{t.dash.crm.form.manualOther}</option>
                          </select>

                          {(!editFormData.employeeName || editFormData.employeeName === 'custom' || !employees.some(e => e.fullName === editFormData.employeeName)) && (
                            <input
                              type="text"
                              required
                              placeholder={t.dash.crm.form.employeePhShort}
                              value={editFormData.employeeName === 'custom' ? '' : (editFormData.employeeName || '')}
                              onChange={(e) => setEditFormData({ ...editFormData, employeeName: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-400 dark:border-amber-600/60 text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-stone-400"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder={t.dash.crm.form.employeePhSingle}
                          value={editFormData.employeeName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, employeeName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-400 dark:border-amber-600/60 text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* 4. VILOYAT va TUMAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.region} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <select
                      required
                      value={editFormData.region || 'Toshkent shahri'}
                      onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer"
                    >
                      {REGION_OPTIONS.map((reg) => (
                        <option key={reg} value={reg} className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white font-semibold">
                          {reg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.crm.form.district} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.dash.crm.form.districtPh}
                      value={editFormData.district || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 5. MANZIL */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.crm.form.address} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>

                {/* 6. LOKATSIYA + MAP TUGMASI */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                    <span>{t.dash.crm.form.location}</span>
                    <span className="text-[10px] font-normal text-stone-500">{t.dash.crm.form.locationHintEdit}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder={t.dash.crm.form.locationPh}
                        value={editFormData.location || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                      />
                      <Navigation className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditMapOpen(!isEditMapOpen)}
                      className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                        isEditMapOpen 
                          ? 'bg-amber-500 text-stone-950 border-2 border-amber-600 ring-2 ring-amber-500/30'
                          : 'bg-stone-100 dark:bg-[#221C16] hover:bg-amber-500/20 text-amber-800 dark:text-[#E6C774] border-2 border-amber-500/40'
                      }`}
                      title={t.dash.crm.form.mapTitle}
                    >
                      <MapIcon className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
                      <span>{isEditMapOpen ? t.dash.crm.form.mapHide : t.dash.crm.form.mapShowShort}</span>
                    </button>
                  </div>
                </div>

                {/* 7. HAMKORLIK HOLATI */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.crm.form.status}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, status: 'faol' })}
                      className={`py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        editFormData.status === 'faol'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                          : 'bg-stone-50 dark:bg-[#141210] border-stone-200 dark:border-[#2C241D] text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.dash.crm.cards.active}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, status: 'nofaol' })}
                      className={`py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        editFormData.status === 'nofaol'
                          ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20'
                          : 'bg-stone-50 dark:bg-[#141210] border-stone-200 dark:border-[#2C241D] text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>{t.dash.crm.cards.inactive}</span>
                    </button>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="pt-4 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setIsEditMapOpen(false);
                      setEditFormData(null);
                    }}
                    className="px-5 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t.dash.crm.form.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {t.dash.crm.form.saveEdit}
                  </button>
                </div>
              </form>

              {/* Right Side: OpenStreetMap Panel */}
              {isEditMapOpen && (
                <div className="h-full min-h-[420px] lg:min-h-[500px]">
                  <OsmMapPicker
                    initialLocation={editFormData.location}
                    onSelectLocation={(locStr, details) => {
                      setEditFormData(prev => prev ? ({
                        ...prev,
                        location: locStr,
                        address: prev.address || (details?.address ? details.address.split(',').slice(0, 2).join(',') : prev.address)
                      }) : null);
                    }}
                    onClose={() => setIsEditMapOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
