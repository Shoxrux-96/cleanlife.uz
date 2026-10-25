import React, { useState, useMemo } from 'react';
import { 
  Building2, AlertTriangle, CheckCircle2, Search, Filter, 
  ArrowDownLeft, ArrowUpRight, MapPin, Layers, Package, RefreshCw, Plus,
  Image as ImageIcon, Upload, Link as LinkIcon, X, Calendar, Clock, Trash2, Check, Sparkles,
  FileSpreadsheet, Edit
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RawMaterial, ErpProduct, BomItem, CompanyInfo, FinancialTransaction } from '../../types/erp';
import {
  PRODUCTION_CATEGORY,
  formatProductionDescription,
  parseProductionDescription,
} from '../../lib/production';
import { TablePagination } from './TablePagination';
import { MaterialReceiptModal, MaterialPurchasePayload } from './MaterialReceiptModal';
import { useLanguage } from '../../context/LanguageContext';

export interface DailyProductionRecord {
  id: string;
  txId: string;
  productId: string;
  productName: string;
  productSku: string;
  imageUrl?: string;
  quantity: number;          // Miqdori (kiritilgan partiya miqdori, dona)
  remainingStock: number;    // Zaxira (ombordagi umumiy qoldiq, dona)
  dateTime: string;          // Sana va vaqti (masalan: 2026-10-04 14:30)
  sellingPrice: number;      // Sotuv Narxi (so'm)
  totalAmount: number;       // Jami summa (Miqdori * Sotuv Narxi)
  note?: string;             // Smena / Izoh
}

interface ProductionWarehouseTabProps {
  materials: RawMaterial[];
  products: ErpProduct[];
  transactions?: FinancialTransaction[];
  onRecordReceipt?: (payload: {
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    date: string;
  }) => void;
  onDeleteReceipt?: (txId: string, productId: string, quantity: number) => void;
  onUpdateMaterial: (material: RawMaterial) => void;
  onUpdateProduct: (product: ErpProduct) => void;
  onAddProduct?: (product: Omit<ErpProduct, 'id'>) => void;
  onAddMaterial?: (material: Omit<RawMaterial, 'id'>) => void;
  onDeleteMaterial?: (id: string) => void;
  onRecordPurchase?: (payload: MaterialPurchasePayload) => void;
  companyInfo?: CompanyInfo | null;
}

export const ProductionWarehouseTab: React.FC<ProductionWarehouseTabProps> = ({
  materials,
  products,
  transactions,
  onRecordReceipt,
  onDeleteReceipt,
  onUpdateMaterial,
  onUpdateProduct,
  onAddProduct,
  onAddMaterial,
  onDeleteMaterial,
  onRecordPurchase
}) => {
  const { t } = useLanguage();
  // Tayyor mahsulot ombori darhol ochilishi uchun standart 'products' qilib belgilandi
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'products'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');
  
  // Har kunlik / oylik filtrlash
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Daily Production Records — API dan (FinancialTransaction, category = 'Mahsulot ishlab chiqarish')
  const productionRecords: DailyProductionRecord[] = useMemo(() => {
    const list = (transactions ?? [])
      .filter(tx => tx.category === PRODUCTION_CATEGORY)
      .map(tx => {
        const info = parseProductionDescription(tx.description);
        if (!info) return null;
        const product =
          products.find(p => p.sku === info.sku) ??
          products.find(p => p.name === info.name) ??
          null;
        const time = (tx.createdAt ?? '').slice(11, 16);
        return {
          id: tx.id,
          txId: tx.id,
          productId: product?.id ?? '',
          productName: product?.name ?? info.name,
          productSku: info.sku || product?.sku || '',
          imageUrl: product?.imageUrl,
          quantity: info.quantity,
          remainingStock: product?.stockCount ?? 0,
          dateTime: `${tx.date} ${time}`.trim(),
          sellingPrice: info.unitPrice,
          totalAmount: tx.amount,
          note: info.note,
        } as DailyProductionRecord;
      })
      .filter(Boolean) as DailyProductionRecord[];
    return list.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [transactions, products]);

  // Modal State for Products
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [modalProductSearch, setModalProductSearch] = useState('');

  // Modal State for Material Kirimi (Kirim materiallari sahifasi bilan YAGONA modal oyna)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Helper for current Uzbekistan datetime string (Asia/Tashkent UTC+5)
  const getUzbekistanDateTime = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  // Bugungi oy / hafta chegarasi (O'zbekiston vaqti)
  const getUzbekistanDate = (daysAgo = 0) => {
    const now = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  };
  const getUzbekistanMonth = () => getUzbekistanDate().slice(0, 7);

  // Form for receiving daily/monthly production to warehouse
  const [receiptForm, setReceiptForm] = useState({
    productId: products[0]?.id || 'prod-2',
    quantity: 50,
    sellingPrice: products[0]?.sellingPrice || 115000,
    note: ''
  });

  // Quick Stock Adjustment for Materials
  const [adjustItem, setAdjustItem] = useState<{
    type: 'material' | 'product';
    id: string;
    name: string;
    currentQuantity: number;
    unit: string;
  } | null>(null);

  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(10);
  const [adjustmentAction, setAdjustmentAction] = useState<'kirim' | 'chiqim'>('kirim');

  // Handle changing selected product in production receipt form
  const handleSelectProduct = (pId: string) => {
    const selected = products.find(p => p.id === pId);
    if (selected) {
      setReceiptForm(prev => ({
        ...prev,
        productId: pId,
        sellingPrice: selected.sellingPrice
      }));
    }
  };

  // Save production receipt
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProduct = products.find(p => p.id === receiptForm.productId) || products[0];
    if (!selectedProduct) return;

    const qty = Math.max(1, Number(receiptForm.quantity) || 1);
    const price = Math.max(0, Number(receiptForm.sellingPrice) || selectedProduct.sellingPrice);
    const total = qty * price;
    const newStock = (selectedProduct.stockCount || 0) + qty;
    const currentUzbekistanTime = getUzbekistanDateTime();

    // Moliyada chiqim (ishlab chiqarish tannarxi) + ombordagi zaxira yangilanadi
    onRecordReceipt?.({
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      quantity: qty,
      unitPrice: price,
      amount: total,
      date: currentUzbekistanTime.split(' ')[0]
    });

    // Update product stock count in ERP store
    onUpdateProduct({
      ...selectedProduct,
      stockCount: newStock
    });

    setIsAddProductModalOpen(false);
  };

  const handleDeleteRecord = (rec: DailyProductionRecord) => {
    onDeleteReceipt?.(rec.txId, rec.productId, rec.quantity);
  };

  // Materials filter
  const criticalMaterials = materials.filter(m => m.quantity <= m.minThreshold);
  const warningMaterials = materials.filter(m => m.quantity > m.minThreshold && m.quantity <= m.minThreshold * 1.5);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.storageLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'critical') return matchesSearch && m.quantity <= m.minThreshold;
    if (filterStatus === 'warning') return matchesSearch && m.quantity > m.minThreshold && m.quantity <= m.minThreshold * 1.5;
    if (filterStatus === 'ok') return matchesSearch && m.quantity > m.minThreshold * 1.5;
    return matchesSearch;
  });

  // Filtered Production Records (Har kunlik / oylik)
  const filteredProductionRecords = productionRecords.filter(rec => {
    const matchesSearch = 
      rec.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.dateTime.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.note && rec.note.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (customDate) {
      return rec.dateTime.startsWith(customDate);
    }

    const todayStr = getUzbekistanDate();
    const thisMonthStr = getUzbekistanMonth();
    const weekAgoStr = getUzbekistanDate(6);

    if (periodFilter === 'today') {
      return rec.dateTime.startsWith(todayStr);
    }
    if (periodFilter === 'month') {
      return rec.dateTime.startsWith(thisMonthStr);
    }
    if (periodFilter === 'week') {
      return rec.dateTime >= weekAgoStr;
    }

    return true;
  });

  // Summary statistics for products
  const todayRecords = productionRecords.filter(r => r.dateTime.startsWith(getUzbekistanDate()));
  const todayTotalQty = todayRecords.reduce((acc, r) => acc + r.quantity, 0);
  const todayTotalAmount = todayRecords.reduce((acc, r) => acc + r.totalAmount, 0);

  const monthRecords = productionRecords.filter(r => r.dateTime.startsWith(getUzbekistanMonth()));
  const monthTotalQty = monthRecords.reduce((acc, r) => acc + r.quantity, 0);
  const monthTotalAmount = monthRecords.reduce((acc, r) => acc + r.totalAmount, 0);

  const totalStockCount = products.reduce((acc, p) => acc + p.stockCount, 0);
  const totalStockWorth = products.reduce((acc, p) => acc + (p.stockCount * p.sellingPrice), 0);

  const totalMaterialsCount = materials.length;
  const totalMaterialsQty = materials.reduce((acc, m) => acc + m.quantity, 0);
  const totalMaterialsWorth = materials.reduce((acc, m) => acc + (m.quantity * m.unitCost), 0);

  // Pagination States for Products and Materials
  const [productsPage, setProductsPage] = useState(1);
  const [productsPageSize, setProductsPageSize] = useState(10);

  const [materialsPage, setMaterialsPage] = useState(1);
  const [materialsPageSize, setMaterialsPageSize] = useState(10);

  const paginatedProductionRecords = useMemo(() => {
    const start = (productsPage - 1) * productsPageSize;
    return filteredProductionRecords.slice(start, start + productsPageSize);
  }, [filteredProductionRecords, productsPage, productsPageSize]);

  const paginatedMaterials = useMemo(() => {
    const start = (materialsPage - 1) * materialsPageSize;
    return filteredMaterials.slice(start, start + materialsPageSize);
  }, [filteredMaterials, materialsPage, materialsPageSize]);

  const handleApplyAdjustment = () => {
    if (!adjustItem) return;

    if (adjustItem.type === 'material') {
      const targetMat = materials.find(m => m.id === adjustItem.id);
      if (!targetMat) return;

      const newQty = adjustmentAction === 'kirim' 
        ? targetMat.quantity + adjustmentAmount 
        : Math.max(0, targetMat.quantity - adjustmentAmount);

      const status: RawMaterial['status'] = 
        newQty <= targetMat.minThreshold ? 'kritik' :
        newQty <= targetMat.minThreshold * 1.5 ? 'ogohlantirish' : 'yetarli';

      onUpdateMaterial({
        ...targetMat,
        quantity: newQty,
        status,
        lastRestocked: new Date().toISOString().split('T')[0]
      });
    }

    setAdjustItem(null);
  };

  const handleExportToExcel = () => {
    if (activeSubTab === 'products') {
      const dataToExport = filteredProductionRecords.map((rec, idx) => ({
        '№': idx + 1,
        [t.dash.warehouse.export.colName]: rec.productName,
        [t.dash.warehouse.export.colQty]: rec.quantity,
        [t.dash.warehouse.export.colStock]: rec.remainingStock,
        [t.dash.warehouse.export.colDatetime]: rec.dateTime,
        [t.dash.warehouse.export.colPrice]: rec.sellingPrice,
        [t.dash.warehouse.export.colTotal]: rec.totalAmount
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 35 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t.dash.warehouse.export.sheetProducts);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Mahsulot_Ombori_${dateStr}.xlsx`);
    } else {
      const dataToExport = filteredMaterials.map((mat, idx) => ({
        '№': idx + 1,
        [t.dash.warehouse.export.colName]: cleanMaterialName(mat.name),
        [t.dash.warehouse.export.colQtyUnit]: `${new Intl.NumberFormat('uz-UZ').format(mat.quantity)} ${mat.unit}`,
        [t.dash.warehouse.export.colStockRel]: `${new Intl.NumberFormat('uz-UZ').format(mat.quantity)} ${mat.unit}`,
        [t.dash.warehouse.export.colReceivedAt]: formatReceiptTime(mat.lastRestocked),
        [t.dash.warehouse.export.colUnitPrice]: mat.unitCost,
        [t.dash.warehouse.export.colTotalValue]: mat.quantity * mat.unitCost
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t.dash.warehouse.export.sheetMaterials);

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Materiallar_Ombori_${dateStr}.xlsx`);
    }
  };

  const cleanMaterialName = (name: string) => {
    return name
      .replace(/\(Qora\s*\/\s*Oq\s*\/\s*To‘?q ko‘?k\)/gi, '')
      .replace(/\(Qora.*?\)/gi, '')
      .replace(/qora va to‘q ko‘k /gi, '')
      .trim();
  };

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.warehouse.currencySuffix;
  };

  // Kirilgan vaqtni DD.MM.YYYY HH:MM ko'rinishida (masalan: 29.09.2026 16:30)
  const formatReceiptTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const clean = dateStr.replace('T', ' ');
    const [datePart, timePart] = clean.split(' ');
    const [y, m, d] = (datePart || '').split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}.${m}.${y} ${(timePart || '00:00').slice(0, 5)}`;
  };

  const selectedProductPreview = products.find(p => p.id === receiptForm.productId) || products[0];

  const modalFilteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(modalProductSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(modalProductSearch.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(modalProductSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
            {t.dash.warehouse.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.warehouse.header.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sub-tab Switcher: Mahsulot Ombori vs Materiallar Ombori */}
          <div className="inline-flex p-1 bg-stone-100 dark:bg-[#1C1814] rounded-xl border border-stone-200 dark:border-[#382F26]">
            <button
              onClick={() => setActiveSubTab('products')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'products'
                  ? 'bg-white dark:bg-[#2C241D] text-black dark:text-[#D4AF37] shadow-sm'
                  : 'text-[#7A6F62] dark:text-[#A69C8E]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t.dash.warehouse.header.productsTab}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('materials')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'materials'
                  ? 'bg-white dark:bg-[#2C241D] text-black dark:text-[#D4AF37] shadow-sm'
                  : 'text-[#7A6F62] dark:text-[#A69C8E]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.dash.warehouse.header.materialsTab}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {activeSubTab === 'products' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>{t.dash.warehouse.summary.todayTitle}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
              +{new Intl.NumberFormat('uz-UZ').format(todayTotalQty)} {t.dash.warehouse.summary.dona}
            </div>
            <div className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
              {t.dash.warehouse.summary.totalPrefix} {formatUzbekSum(todayTotalAmount)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <span className="text-xs text-stone-500 dark:text-stone-400">{t.dash.warehouse.summary.monthTitle}</span>
            <div className="text-xl font-black text-amber-600 dark:text-[#D4AF37] mt-1.5 font-mono">
              +{new Intl.NumberFormat('uz-UZ').format(monthTotalQty)} {t.dash.warehouse.summary.dona}
            </div>
            <div className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
              {t.dash.warehouse.summary.totalPrefix} {formatUzbekSum(monthTotalAmount)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <span className="text-xs text-stone-500 dark:text-stone-400">{t.dash.warehouse.summary.stockTitle}</span>
            <div className="text-xl font-black text-stone-900 dark:text-white mt-1.5 font-mono">
              {new Intl.NumberFormat('uz-UZ').format(totalStockCount)} {t.dash.warehouse.summary.dona}
            </div>
            <div className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
              {t.dash.warehouse.summary.worthPrefix} {formatUzbekSum(totalStockWorth)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <span className="text-xs text-stone-500 dark:text-stone-400">{t.dash.warehouse.summary.nomTitle}</span>
            <div className="text-xl font-black text-[#1A1715] dark:text-[#FAF7F2] mt-1.5">
              {products.length} {t.dash.warehouse.summary.modelsSuffix}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {productionRecords.length} {t.dash.warehouse.summary.batchesSuffix}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <span className="text-xs text-stone-500 dark:text-stone-400">{t.dash.warehouse.summary.matCountTitle}</span>
            <div className="text-xl font-black text-[#1A1715] dark:text-[#FAF7F2] mt-1.5 font-mono">
              {totalMaterialsCount} {t.dash.warehouse.summary.typesSuffix}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {t.dash.warehouse.summary.matActiveSub}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <span className="text-xs text-stone-500 dark:text-stone-400">{t.dash.warehouse.summary.matQtyTitle}</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
              {new Intl.NumberFormat('uz-UZ').format(totalMaterialsQty)} {t.dash.warehouse.summary.unitsSuffix}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {t.dash.warehouse.summary.matQtySub}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
            <span className="text-xs text-stone-500 dark:text-stone-400">{t.dash.warehouse.summary.matWorthTitle}</span>
            <div className="text-xl font-black text-amber-700 dark:text-[#D4AF37] mt-1.5 font-mono">
              {formatUzbekSum(totalMaterialsWorth)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              {materials.length - criticalMaterials.length - warningMaterials.length} {t.dash.warehouse.summary.enoughSuffix}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{t.dash.warehouse.summary.criticalTitle}</span>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>{criticalMaterials.length} {t.dash.warehouse.summary.criticalSuffixA} {warningMaterials.length} {t.dash.warehouse.summary.criticalSuffixB}</span>
            </div>
            <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
              {t.dash.warehouse.summary.urgent}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t.dash.warehouse.filter.searchPh}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Qo'shish tugmasi: Mahsulot yoki Material Kirimi */}
          {activeSubTab === 'products' ? (
            <button
              onClick={() => {
                setModalProductSearch('');
                setIsAddProductModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] hover:from-[#B3871C] hover:to-[#C59B27] text-black font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
              title={t.dash.warehouse.filter.addProductTitle}
            >
              <Plus className="w-4 h-4" />
              <span>{t.dash.warehouse.filter.addProduct}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] hover:from-[#B3871C] hover:to-[#C59B27] text-black font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
              title={t.dash.warehouse.filter.addMaterialTitle}
            >
              <Plus className="w-4 h-4" />
              <span>{t.dash.warehouse.filter.addMaterial}</span>
            </button>
          )}
        </div>

        {/* Sub-tab specific filters & Excel Export */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end w-full md:w-auto">
          {activeSubTab === 'products' ? (
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <div className="inline-flex p-1 bg-stone-100 dark:bg-[#251E18] rounded-xl text-xs font-semibold">
                <button
                  onClick={() => {
                    setPeriodFilter('all');
                    setCustomDate('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    periodFilter === 'all' && !customDate
                      ? 'bg-white dark:bg-[#1A1816] text-black dark:text-[#D4AF37] font-bold shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {t.dash.warehouse.filter.all}
                </button>
                <button
                  onClick={() => {
                    setPeriodFilter('today');
                    setCustomDate('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    periodFilter === 'today'
                      ? 'bg-white dark:bg-[#1A1816] text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {t.dash.warehouse.filter.today}
                </button>
                <button
                  onClick={() => {
                    setPeriodFilter('week');
                    setCustomDate('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    periodFilter === 'week'
                      ? 'bg-white dark:bg-[#1A1816] text-amber-600 dark:text-[#D4AF37] font-bold shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {t.dash.warehouse.filter.week}
                </button>
                <button
                  onClick={() => {
                    setPeriodFilter('month');
                    setCustomDate('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    periodFilter === 'month'
                      ? 'bg-white dark:bg-[#1A1816] text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {t.dash.warehouse.filter.month}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setPeriodFilter('all');
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-[#2E2720] bg-white dark:bg-[#12100E] text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  title={t.dash.warehouse.filter.dateTitle}
                />
                {customDate && (
                  <button
                    onClick={() => setCustomDate('')}
                    className="p-1 rounded-lg text-stone-400 hover:text-rose-500 text-xs"
                    title={t.dash.warehouse.filter.clearDate}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-black font-bold'
                    : 'bg-stone-100 dark:bg-[#251E18] text-stone-500'
                }`}
              >
                {t.dash.warehouse.filter.all}
              </button>
              <button
                onClick={() => setFilterStatus('critical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'critical'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{t.dash.warehouse.filter.criticalBtn} ({criticalMaterials.length})</span>
              </button>
              <button
                onClick={() => setFilterStatus('warning')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterStatus === 'warning'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}
              >
                {t.dash.warehouse.filter.decreasingBtn} ({warningMaterials.length})
              </button>
              <button
                onClick={() => setFilterStatus('ok')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterStatus === 'ok'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}
              >
                {t.dash.warehouse.filter.enoughBtn}
              </button>
            </div>
          )}

          {/* Excel ga yuklash tugmasi */}
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
            title={t.dash.warehouse.filter.excelTitle}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.dash.warehouse.filter.excel}</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {activeSubTab === 'products' ? (
        /* TABLE: MAHSULOT OMBORI (Har kunlik va oylik kiritilgan partiyalar jadvali) */
        <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-[#141210] text-[#7A6F62] dark:text-[#A69C8E] border-b border-stone-200 dark:border-[#2D251D]">
                <tr>
                  <th className="py-3.5 px-4 font-black text-xs uppercase tracking-wider w-14 text-center text-amber-700 dark:text-[#E6C774]">
                    №
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                    {t.dash.warehouse.table.name}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                    {t.dash.warehouse.table.qty}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                    {t.dash.warehouse.table.stock}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                    {t.dash.warehouse.table.datetime}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                    {t.dash.warehouse.table.price}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                    {t.dash.warehouse.table.total}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-right">
                    {t.dash.warehouse.table.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-[#241E18] text-[#1A1715] dark:text-[#FAF7F2]">
                {filteredProductionRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      <Package className="w-10 h-10 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                      <p className="font-semibold text-sm">{t.dash.warehouse.table.empty}</p>
                      <button
                        onClick={() => setIsAddProductModalOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t.dash.warehouse.table.emptyAdd}</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedProductionRecords.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors">
                      {/* 1. № */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs">
                          {(productsPage - 1) * productsPageSize + idx + 1}
                        </span>
                      </td>

                      {/* 2. Mahsulot Nomi (Rasmi, Nomi, SKU va izohi) */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-3">
                          {rec.imageUrl ? (
                            <img 
                              src={rec.imageUrl} 
                              alt={rec.productName} 
                              className="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-[#382F26] shrink-0 shadow-xs" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-[#D4AF37]">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2] block">{rec.productName}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Miqdori */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-black text-xs font-mono border border-emerald-500/30">
                          +{new Intl.NumberFormat('uz-UZ').format(rec.quantity)} {t.dash.warehouse.summary.dona}
                        </span>
                      </td>

                      {/* 4. Zaxira */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-black text-sm text-stone-900 dark:text-stone-100 font-mono">
                          {new Intl.NumberFormat('uz-UZ').format(rec.remainingStock)}
                        </span>{' '}
                        <span className="text-stone-400 text-xs">{t.dash.warehouse.summary.dona}</span>
                      </td>

                      {/* 5. Sana va vaqti */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 dark:text-stone-300 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{rec.dateTime}</span>
                        </div>
                      </td>

                      {/* 6. Sotuv Narxi */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-stone-800 dark:text-stone-200">
                        {formatUzbekSum(rec.sellingPrice)}
                      </td>

                      {/* 7. Jami summa */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-amber-700 dark:text-[#E6C774] text-sm">
                        {formatUzbekSum(rec.totalAmount)}
                      </td>

                      {/* 8. Amallar */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteRecord(rec)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title={t.dash.warehouse.table.deleteTitle}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={productsPage}
            totalItems={filteredProductionRecords.length}
            pageSize={productsPageSize}
            onPageChange={setProductsPage}
            onPageSizeChange={setProductsPageSize}
          />
        </div>
      ) : (
        /* TABLE: MATERIALLAR OMBORI */
        <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-[#141210] text-[#7A6F62] dark:text-[#A69C8E] border-b border-stone-200 dark:border-[#2D251D]">
                <tr>
                  <th className="py-3 px-4 font-black text-sm uppercase tracking-wider w-16 text-center text-amber-700 dark:text-[#E6C774]">№</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider">{t.dash.warehouse.matTable.name}</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider">{t.dash.warehouse.matTable.qtyUnit}</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider">{t.dash.warehouse.matTable.stockRel}</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider">{t.dash.warehouse.matTable.receivedAt}</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider">{t.dash.warehouse.matTable.unitPrice}</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider">{t.dash.warehouse.matTable.totalValue}</th>
                  <th className="py-3 px-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-right">{t.dash.warehouse.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-[#241E18] text-[#1A1715] dark:text-[#FAF7F2]">
                {paginatedMaterials.map((mat, idx) => {
                  const totalValue = mat.quantity * mat.unitCost;

                  return (
                    <tr key={mat.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors">
                      {/* 1. № */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs">
                          {(materialsPage - 1) * materialsPageSize + idx + 1}
                        </span>
                      </td>

                      {/* 2. Mahsulot Nomi */}
                      <td className="py-3.5 px-4 font-medium">
                        <span className="font-bold text-sm text-stone-950 dark:text-white block">
                          {cleanMaterialName(mat.name)}
                        </span>
                      </td>

                      {/* 3. Miqdori & Birligi */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold font-mono text-sm text-stone-900 dark:text-white block">
                          {new Intl.NumberFormat('uz-UZ').format(mat.quantity)} {mat.unit}
                        </span>
                      </td>

                      {/* 4. Zaxira (rel qiymati) */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-sm font-bold text-stone-900 dark:text-white block">
                          {new Intl.NumberFormat('uz-UZ').format(mat.quantity)} {mat.unit}
                        </span>
                      </td>

                      {/* 5. Kiritilgan Vaqti */}
                      <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-[#251E18] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[#2C241D]">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{formatReceiptTime(mat.lastRestocked)}</span>
                        </span>
                      </td>

                      {/* 6. Birlik Narxi */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-stone-900 dark:text-stone-200">
                        {formatUzbekSum(mat.unitCost)}
                      </td>

                      {/* 7. Jami Qiymat */}
                      <td className="py-3.5 px-4 font-mono text-sm font-black text-amber-700 dark:text-[#E6C774]">
                        {formatUzbekSum(totalValue)}
                      </td>

                      {/* 8. Amallar — zaxirani yangilash */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setAdjustItem({
                            type: 'material',
                            id: mat.id,
                            name: cleanMaterialName(mat.name),
                            currentQuantity: mat.quantity,
                            unit: mat.unit
                          })}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                          title={t.dash.warehouse.adjust.title}
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={materialsPage}
            totalItems={filteredMaterials.length}
            pageSize={materialsPageSize}
            onPageChange={setMaterialsPage}
            onPageSizeChange={setMaterialsPageSize}
          />
        </div>
      )}

      {/* Stock Adjustment Modal for Materials */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border border-[#E2DBD1] dark:border-[#382F26] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2] mb-1">
              {t.dash.warehouse.adjust.title} {adjustItem.name}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {t.dash.warehouse.adjust.current} <strong>{adjustItem.currentQuantity} {adjustItem.unit}</strong>
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentAction('kirim')}
                  className={`flex-1 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                    adjustmentAction === 'kirim'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-[#251E18] text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {t.dash.warehouse.adjust.inBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentAction('chiqim')}
                  className={`flex-1 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                    adjustmentAction === 'chiqim'
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-100 dark:bg-[#251E18] text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {t.dash.warehouse.adjust.outBtn}
                </button>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.warehouse.adjust.amount} ({adjustItem.unit}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] text-sm font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#28211A] text-xs flex justify-between">
                <span>{t.dash.warehouse.adjust.newBalance}</span>
                <span className="font-bold text-amber-600 dark:text-[#D4AF37]">
                  {adjustmentAction === 'kirim'
                    ? adjustItem.currentQuantity + adjustmentAmount
                    : Math.max(0, adjustItem.currentQuantity - adjustmentAmount)}{' '}
                  {adjustItem.unit}
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-[#382F26] text-stone-600 dark:text-stone-300"
                >
                  {t.dash.warehouse.adjust.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleApplyAdjustment}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold shadow-md"
                >
                  {t.dash.warehouse.adjust.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ishlab Chiqarilgan Mahsulotni Omborga Kiritish (Har kunlik va oylik) */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-950 dark:text-white">
                    {t.dash.warehouse.modal.title}
                  </h3>
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                    {t.dash.warehouse.modal.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-4 text-xs">
              {/* 1. Tayyor mahsulotlar ro'yxati va tanlash (Search + Option orqali) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide flex items-center gap-1.5">
                    <span>{t.dash.warehouse.modal.selectLabel}</span>
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    <span className="text-[11px] font-normal text-stone-400 lowercase">({products.length} {t.dash.warehouse.modal.availableSuffix})</span>
                  </label>
                  {selectedProductPreview && (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-[#D4AF37]">
                      {t.dash.warehouse.modal.selected} <strong className="text-stone-900 dark:text-white">{selectedProductPreview.name}</strong>
                    </span>
                  )}
                </div>

                {/* Tezkor Qidiruv (Search) */}
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder={t.dash.warehouse.modal.searchPh}
                    value={modalProductSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModalProductSearch(val);
                      const matched = products.filter(p =>
                        p.name.toLowerCase().includes(val.toLowerCase()) ||
                        p.sku.toLowerCase().includes(val.toLowerCase()) ||
                        (p.category && p.category.toLowerCase().includes(val.toLowerCase()))
                      );
                      if (matched.length > 0 && !matched.some(m => m.id === receiptForm.productId)) {
                        handleSelectProduct(matched[0].id);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border-2 border-stone-200 dark:border-[#2C241D] text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-medium"
                  />
                  {modalProductSearch && (
                    <button
                      type="button"
                      onClick={() => setModalProductSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                      title={t.dash.warehouse.modal.clearSearch}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mahsulotlar: <select> va <option> teglari orqali tanlash */}
                <div className="relative mb-2.5">
                  <select
                    required
                    value={receiptForm.productId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer transition-colors"
                  >
                    <option value="" disabled>
                      {modalFilteredProducts.length === 0
                        ? t.dash.warehouse.modal.notFound
                        : `-- ${t.dash.warehouse.modal.selectProduct} (${modalFilteredProducts.length} ${t.dash.warehouse.modal.availableSuffix}) --`}
                    </option>
                    {modalFilteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}] {t.dash.warehouse.modal.optStock} {p.stockCount} {t.dash.warehouse.summary.dona} {t.dash.warehouse.modal.optPrice} {formatUzbekSum(p.sellingPrice)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanlangan Mahsulot Vizual Kartasi (Preview) */}
                {selectedProductPreview && (
                  <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/[0.08] border-2 border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedProductPreview.imageUrl ? (
                        <img 
                          src={selectedProductPreview.imageUrl} 
                          alt={selectedProductPreview.name} 
                          className="w-12 h-12 rounded-lg object-cover border border-stone-200 dark:border-[#382F26] shrink-0 shadow-xs" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-700 dark:text-[#D4AF37]">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-[#D4AF37] bg-amber-500/20 px-1.5 py-0.5 rounded">
                            {selectedProductPreview.sku}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-[#251E18] text-stone-600 dark:text-stone-300 font-semibold capitalize">
                            {selectedProductPreview.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-stone-900 dark:text-white truncate mt-0.5" title={selectedProductPreview.name}>
                          {selectedProductPreview.name}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block">{t.dash.warehouse.modal.currentStock}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {selectedProductPreview.stockCount} {t.dash.warehouse.summary.dona}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2 & 3. Miqdori va Sotuv Narxi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.warehouse.modal.qtyLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiptForm.quantity}
                    onChange={(e) => setReceiptForm({ ...receiptForm, quantity: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.warehouse.modal.priceLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiptForm.sellingPrice}
                    onChange={(e) => setReceiptForm({ ...receiptForm, sellingPrice: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-amber-700 dark:text-[#E6C774] font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Qabul qilish vaqti: avtomatik O‘zbekiston vaqti */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border-2 border-stone-200 dark:border-[#2C241D] text-xs">
                <span className="text-stone-600 dark:text-stone-300 flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.dash.warehouse.modal.dateLabel}</span>
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {t.dash.warehouse.modal.autoPrefix} {getUzbekistanDateTime()})
                </span>
              </div>

              {/* 5. Jami Summa Hisobi */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 block">
                    {t.dash.warehouse.modal.calcTitle} ({receiptForm.quantity} {t.dash.warehouse.summary.dona} × {formatUzbekSum(receiptForm.sellingPrice)}):
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {t.dash.warehouse.modal.newStockLabel}{' '}
                    <strong className="text-stone-900 dark:text-white">
                      {selectedProductPreview ? (selectedProductPreview.stockCount + Number(receiptForm.quantity)) : 0} {t.dash.warehouse.summary.dona}
                    </strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-amber-700 dark:text-[#E6C774] font-mono">
                    {formatUzbekSum((Number(receiptForm.quantity) || 0) * (Number(receiptForm.sellingPrice) || 0))}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold text-xs hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  {t.dash.warehouse.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  {t.dash.warehouse.modal.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: yagona Material Kirimi oynasi (Kirim materiallari sahifasi bilan BIR XIL) */}
      <MaterialReceiptModal
        open={isReceiptModalOpen}
        materials={materials}
        onClose={() => setIsReceiptModalOpen(false)}
        onAddMaterial={onAddMaterial}
        onUpdateMaterial={onUpdateMaterial}
        onRecordPurchase={onRecordPurchase}
      />
    </div>
  );
};
