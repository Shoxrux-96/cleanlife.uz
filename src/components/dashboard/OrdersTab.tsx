import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Search, CheckCircle2, Clock, Truck, 
  AlertCircle, Phone, ArrowRight, UserCheck, Calendar, DollarSign,
  Building2, FileSpreadsheet, LayoutGrid, Table as TableIcon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Tag, Layers,
  Pencil, X, User, Trash2, Calculator, Filter, Lock, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ErpOrder, OrderStatus, ErpProduct, WaybillTTN } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface OrdersTabProps {
  orders: ErpOrder[];
  products: ErpProduct[];
  waybills?: WaybillTTN[];
  onAddOrder: (order: Omit<ErpOrder, 'id' | 'orderNumber'>) => void;
  onUpdateOrder?: (order: ErpOrder) => void;
  onDeleteOrder?: (id: string) => void;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  onNavigateToWaybill?: (order: ErpOrder) => void;
}

// Order item structure for multi-product orders
interface OrderProductItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

const UZ_MONTHS: Record<string, string> = {
  '01': 'Yanvar',
  '02': 'Fevral',
  '03': 'Mart',
  '04': 'Aprel',
  '05': 'May',
  '06': 'Iyun',
  '07': 'Iyul',
  '08': 'Avgust',
  '09': 'Sentabr',
  '10': 'Oktabr',
  '11': 'Noyabr',
  '12': 'Dekabr'
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  products,
  waybills = [],
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onUpdateOrderStatus,
  onNavigateToWaybill
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // 1. TOP CARDS PERIOD FILTER (Barchasi / Kunlik / Oylik / Yillik)
  const [metricsPeriod, setMetricsPeriod] = useState<'all' | 'daily' | 'monthly' | 'yearly'>('all');

  // Discover available dates from orders data
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.orderDate && o.orderDate.length >= 10) {
        set.add(o.orderDate.slice(0, 10));
      }
    });
    const nowStr = new Date().toISOString().split('T')[0];
    set.add(nowStr);
    return Array.from(set).sort().reverse();
  }, [orders]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return orders[0]?.orderDate?.slice(0, 10) || new Date().toISOString().split('T')[0];
  });

  // Discover available months & years from orders data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.orderDate && o.orderDate.length >= 7) {
        set.add(o.orderDate.slice(0, 7));
      }
    });
    // Add current month if empty
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    set.add('2026-09');
    return Array.from(set).sort().reverse();
  }, [orders]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.orderDate && o.orderDate.length >= 4) {
        set.add(o.orderDate.slice(0, 4));
      }
    });
    const now = new Date();
    set.add(String(now.getFullYear()));
    set.add('2026');
    return Array.from(set).sort().reverse();
  }, [orders]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to 2026-09 if present, or first available
    return '2026-09';
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return '2026';
  });

  // Calculate Key Metrics according to selected period
  const metricsOrders = useMemo(() => {
    if (metricsPeriod === 'all') {
      return orders;
    }
    if (metricsPeriod === 'daily') {
      return orders.filter(o => o.orderDate && o.orderDate.startsWith(selectedDate));
    }
    if (metricsPeriod === 'monthly') {
      return orders.filter(o => o.orderDate && o.orderDate.startsWith(selectedMonth));
    }
    if (metricsPeriod === 'yearly') {
      return orders.filter(o => o.orderDate && o.orderDate.startsWith(selectedYear));
    }
    return orders;
  }, [orders, metricsPeriod, selectedDate, selectedMonth, selectedYear]);

  const totalOrdersCount = metricsOrders.length;
  const totalOrdersAmount = metricsOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPaidAmount = metricsOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalDueAmount = Math.max(0, totalOrdersAmount - totalPaidAmount);

  // Period label for badge inside cards
  const getPeriodLabel = () => {
    if (metricsPeriod === 'all') return t.dash.orders.period.allPeriod;
    if (metricsPeriod === 'daily') {
      return `${t.dash.orders.period.dailyPrefix} ${selectedDate}`;
    }
    if (metricsPeriod === 'monthly') {
      const [y, m] = selectedMonth.split('-');
      const mName = (t.dash.orders.months as unknown as Record<string, string>)[m] || m;
      return `${t.dash.orders.period.monthlyPrefix} ${mName} ${y}`;
    }
    if (metricsPeriod === 'yearly') {
      return `${t.dash.orders.period.yearlyPrefix} ${selectedYear}${t.dash.orders.period.yearlySuffix}`;
    }
    return '';
  };

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit modal state (bu yerda Mas'ul shaxs ochiladi va to'liq ko'rinadi/tahrirlanadi)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ErpOrder | null>(null);

  // Delete modal state
  const [orderToDelete, setOrderToDelete] = useState<ErpOrder | null>(null);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Form State for new order (Notice: Faoliyat turi va Bosma usuli olib tashlangan!)
  const [formData, setFormData] = useState({
    company: '“SULTON SAROY” Restorani',
    clientName: 'Akbarali Usmonov',
    phone: '+998 90 123-45-67',
    paidAmount: 3000000,
    status: 'jarayonda' as OrderStatus,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  // Dynamic products list in the new order modal
  const [orderItems, setOrderItems] = useState<OrderProductItem[]>([
    {
      id: 'item-1',
      productName: products[0]?.name || 'Ofitsiant & Barista Polo ko‘ylagi',
      unitPrice: products[0]?.sellingPrice || 85000,
      quantity: 50,
      totalPrice: (products[0]?.sellingPrice || 85000) * 50
    }
  ]);

  // Real-time calculation of total order amount and quantity
  const calculatedTotalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [orderItems]);

  const calculatedTotalQuantity = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.orders.common.currencySuffix;
  };

  // Filter orders for table/cards list (Davriy filtr: Barchasi, Kunlik, Oylik, Yillik + Holat + Qidiruv)
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Davriy filtr (Kunlik, Oylik, Yillik, Barchasi)
      if (metricsPeriod === 'daily') {
        if (!o.orderDate || !o.orderDate.startsWith(selectedDate)) {
          return false;
        }
      } else if (metricsPeriod === 'monthly') {
        if (!o.orderDate || !o.orderDate.startsWith(selectedMonth)) {
          return false;
        }
      } else if (metricsPeriod === 'yearly') {
        if (!o.orderDate || !o.orderDate.startsWith(selectedYear)) {
          return false;
        }
      }

      // 2. Status filtri
      if (statusFilter !== 'all') {
        if (statusFilter === 'tayyorlandi' && (o.status === 'tayyorlandi' || (o.status as string) === 'tayyor')) {
          // match
        } else if (statusFilter === 'jonatildi' && (o.status === 'jonatildi' || (o.status as string) === 'jonatilgan')) {
          // match
        } else if (o.status !== statusFilter) {
          return false;
        }
      }

      // 3. Matnli qidiruv
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (o.company || '').toLowerCase();
        const client = o.clientName.toLowerCase();
        const num = o.orderNumber.toLowerCase();
        const prod = o.productName.toLowerCase();
        if (!comp.includes(q) && !client.includes(q) && !num.includes(q) && !prod.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, metricsPeriod, selectedDate, selectedMonth, selectedYear, statusFilter, searchQuery]);

  // Filtrlar o'zgarganda sahifani 1-sahifaga qaytarish
  useEffect(() => {
    setCurrentPage(1);
  }, [metricsPeriod, selectedDate, selectedMonth, selectedYear, statusFilter, searchQuery]);

  // Pagination calculations
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  const handleStatusFilterChange = (st: 'all' | OrderStatus) => {
    setStatusFilter(st);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  // Add item row
  const handleAddItem = () => {
    const def = products[0];
    const unitPrice = def ? def.sellingPrice : 50000;
    const qty = 10;
    const newItem: OrderProductItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      productName: def ? def.name : (t.dash.orders.common.newProduct as string),
      unitPrice,
      quantity: qty,
      totalPrice: unitPrice * qty
    };
    setOrderItems(prev => [...prev, newItem]);
  };

  // Remove item row
  const handleRemoveItem = (id: string) => {
    if (orderItems.length <= 1) return;
    setOrderItems(prev => prev.filter(i => i.id !== id));
  };

  // Update item field and recalculate total
  const handleItemChange = (
    id: string, 
    field: 'productName' | 'unitPrice' | 'quantity', 
    value: string | number
  ) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item };
      if (field === 'productName') {
        const prodName = String(value);
        updated.productName = prodName;
        const matched = products.find(p => p.name === prodName);
        if (matched) {
          updated.unitPrice = matched.sellingPrice;
          updated.totalPrice = matched.sellingPrice * updated.quantity;
        }
      } else if (field === 'unitPrice') {
        const price = Math.max(0, Number(value) || 0);
        updated.unitPrice = price;
        updated.totalPrice = price * updated.quantity;
      } else if (field === 'quantity') {
        const qty = Math.max(1, Number(value) || 1);
        updated.quantity = qty;
        updated.totalPrice = updated.unitPrice * qty;
      }
      return updated;
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim() || !formData.company.trim()) return;

    // Combine product names
    let productSummary = '';
    if (orderItems.length === 1) {
      productSummary = orderItems[0].productName;
    } else {
      productSummary = orderItems.map(i => `${i.productName} (${i.quantity} dona)`).join(' + ');
    }

    onAddOrder({
      company: formData.company.trim(),
      clientName: formData.clientName.trim(),
      phone: formData.phone.trim(),
      businessType: 'Restoran & B2B',
      productName: productSummary,
      items: orderItems.map(i => {
        const matched = products.find(p => p.name.trim().toLowerCase() === i.productName.trim().toLowerCase());
        return {
          id: i.id,
          productId: matched?.id,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice
        };
      }),
      quantity: calculatedTotalQuantity,
      totalAmount: calculatedTotalAmount,
      paidAmount: Number(formData.paidAmount) || 0,
      estimatedCost: Math.round(calculatedTotalAmount * 0.6),
      status: formData.status,
      orderDate: formData.orderDate,
      deliveryDate: formData.deliveryDate,
      technique: 'Maxsus bosma / kashta',
      notes: formData.notes
    });

    setIsAddModalOpen(false);
  };

  // Open Edit Modal for an order
  const handleStartEdit = (order: ErpOrder) => {
    setEditingOrder({ ...order });
    setIsEditModalOpen(true);
  };

  // Save Edit Order
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    if (editingOrder.status === 'yetkazildi') {
      const delivered = editingOrder.deliveredQuantity || 0;
      if (delivered < editingOrder.quantity) {
        alert(`${t.dash.orders.msg.incompleteA} ${delivered} / ${editingOrder.quantity} ${t.dash.orders.msg.incompleteB}`);
        return;
      }
    }

    if (onUpdateOrder) {
      onUpdateOrder(editingOrder);
    }
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  const handleDeleteClick = (order: ErpOrder) => {
    setOrderToDelete(order);
  };

  const handleConfirmDelete = () => {
    if (!orderToDelete) return;
    if (onDeleteOrder) {
      onDeleteOrder(orderToDelete.id);
    }
    setOrderToDelete(null);
  };

  // Excel Export Handler
  const handleExportOrdersToExcel = () => {
    const exportData = filteredOrders.map((o, idx) => ({
      '№': idx + 1,
      [t.dash.orders.excel.code]: o.orderNumber,
      [t.dash.orders.excel.company]: o.company || o.clientName,
      [t.dash.orders.excel.contact]: o.clientName,
      [t.dash.orders.excel.phone]: o.phone,
      [t.dash.orders.excel.product]: o.productName,
      [t.dash.orders.excel.qty]: o.quantity,
      [t.dash.orders.excel.date]: o.orderDate,
      [t.dash.orders.excel.deliveryDate]: o.deliveryDate,
      [t.dash.orders.excel.avans]: o.paidAmount,
      [t.dash.orders.excel.total]: o.totalAmount,
      [t.dash.orders.excel.due]: o.totalAmount - o.paidAmount,
      [t.dash.orders.excel.status]: o.status.toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t.dash.orders.excel.sheet);
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `cleanlife_buyurtmalar_${dateStr}.xlsx`);
  };

  const getStatusBadge = (status: OrderStatus | string) => {
    switch (status) {
      case 'jarayonda':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
            <Layers className="w-3 h-3" />
            <span>{t.dash.orders.status.jarayonda}</span>
          </span>
        );
      case 'tayyorlandi':
      case 'tayyor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t.dash.orders.status.tayyorlandi}</span>
          </span>
        );
      case 'jonatildi':
      case 'jonatilgan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap">
            <Truck className="w-3 h-3" />
            <span>{t.dash.orders.status.jonatildi}</span>
          </span>
        );
      case 'yetkazildi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t.dash.orders.status.yetkazildi}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            {t.dash.orders.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.orders.header.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Excel Export Button */}
          <button
            onClick={handleExportOrdersToExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            title={t.dash.orders.header.excelTitle}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.dash.orders.header.excel}</span>
          </button>

          {/* Add Order Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dash.orders.header.add}</span>
          </button>
        </div>
      </div>

      {/* 2. TOP SUMMARY KPI CARDS with OYLIK / YILLIK / BARCHASI Filter */}
      <div className="space-y-3">
        {/* Period Filter Bar for Cards */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              {t.dash.orders.period.label}
            </span>
            <span className="text-xs font-extrabold text-amber-700 dark:text-[#E6C774] px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
              {getPeriodLabel()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pill tabs: Barchasi | Kunlik | Oylik | Yillik */}
            <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720]">
              <button
                type="button"
                onClick={() => setMetricsPeriod('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricsPeriod === 'all'
                    ? 'bg-white dark:bg-[#251E18] text-amber-700 dark:text-[#E6C774] shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t.dash.orders.period.all}
              </button>

              <button
                type="button"
                onClick={() => setMetricsPeriod('daily')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricsPeriod === 'daily'
                    ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t.dash.orders.period.daily}
              </button>

              <button
                type="button"
                onClick={() => setMetricsPeriod('monthly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricsPeriod === 'monthly'
                    ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t.dash.orders.period.monthly}
              </button>

              <button
                type="button"
                onClick={() => setMetricsPeriod('yearly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricsPeriod === 'yearly'
                    ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t.dash.orders.period.yearly}
              </button>
            </div>

            {/* If Daily: Select Date */}
            {metricsPeriod === 'daily' && (
              <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-stone-900 dark:text-white outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-[#251E18] dark:hover:bg-[#322820] text-[11px] font-bold text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                >
                  {t.dash.orders.period.today}
                </button>
                {availableDates.slice(0, 3).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                      selectedDate === d
                        ? 'bg-amber-500/20 text-amber-800 dark:text-[#E6C774] font-bold border border-amber-500/40'
                        : 'bg-stone-100 dark:bg-[#1E1915] text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {/* If Monthly: Select Month */}
            {metricsPeriod === 'monthly' && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-stone-900 dark:text-white outline-none cursor-pointer"
                >
                  {availableMonths.map((m) => {
                    const [y, mm] = m.split('-');
                    const label = `${(t.dash.orders.months as unknown as Record<string, string>)[mm] || mm} ${y}`;
                    return (
                      <option key={m} value={m}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* If Yearly: Select Year */}
            {metricsPeriod === 'yearly' && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-stone-900 dark:text-white outline-none cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}{t.dash.orders.period.yearlySuffix}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Natijalar soni va tozalash */}
            <div className="flex items-center gap-2 ml-auto text-xs">
              <span className="text-stone-500 font-mono text-[11px]">
                {t.dash.orders.period.found} <strong className="text-amber-600 dark:text-[#E6C774]">{filteredOrders.length} {t.dash.orders.period.foundUnit}</strong>
              </span>
              {metricsPeriod !== 'all' && (
                <button
                  type="button"
                  onClick={() => setMetricsPeriod('all')}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                  title={t.dash.orders.period.resetTitle}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.dash.orders.period.reset}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 CARDS: Jami Buyurtmalar, Jami Summa, Avans, Qoldiq */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Jami Buyurtmalar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border-2 border-stone-200 dark:border-[#382F26] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t.dash.orders.cards.totalOrders}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-[#E6C774]">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-stone-900 dark:text-white">
              {totalOrdersCount} <span className="text-xs font-semibold text-stone-400">{t.dash.orders.cards.totalOrdersUnit}</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 truncate">{getPeriodLabel()}</p>
          </div>

          {/* Card 2: Jami Summa */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border-2 border-stone-200 dark:border-[#382F26] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t.dash.orders.cards.totalValue}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-black text-stone-900 dark:text-white truncate">
              {formatCurrency(totalOrdersAmount)}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 truncate">{getPeriodLabel()}</p>
          </div>

          {/* Card 3: Qabul qilingan Avans */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border-2 border-stone-200 dark:border-[#382F26] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t.dash.orders.cards.avansReceived}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400 truncate">
              {formatCurrency(totalPaidAmount)}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 truncate">{t.dash.orders.cards.avansDesc}</p>
          </div>

          {/* Card 4: Qoldiq To'lov */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border-2 border-stone-200 dark:border-[#382F26] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t.dash.orders.cards.due}
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-black text-amber-600 dark:text-[#E6C774] truncate">
              {formatCurrency(totalDueAmount)}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 truncate">{t.dash.orders.cards.dueDesc}</p>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & View Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={t.dash.orders.search.placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: t.dash.orders.status.all },
              { id: 'jarayonda', label: t.dash.orders.status.jarayonda },
              { id: 'tayyorlandi', label: t.dash.orders.status.tayyorlandi },
              { id: 'jonatildi', label: t.dash.orders.status.jonatildi },
              { id: 'yetkazildi', label: t.dash.orders.status.yetkazildi }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => handleStatusFilterChange(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                    : 'bg-stone-100 dark:bg-[#181513] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#251E18]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#251E18] text-amber-700 dark:text-[#E6C774] shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.orders.view.tableTitle}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.dash.orders.view.table}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-[#251E18] text-amber-700 dark:text-[#E6C774] shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.orders.view.cardsTitle}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.dash.orders.view.cards}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT: TABLE VIEW (Mas'ul shaxs jadvalda ko'rinmaydi, Tahrirlashda ochiladi) */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#1C1814] border-2 border-stone-200 dark:border-[#382F26] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-[#161310] border-b-2 border-stone-200 dark:border-[#2E261F] text-stone-700 dark:text-stone-300 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-3 text-center w-12">№</th>
                  <th className="py-3.5 px-4 min-w-[200px]">{t.dash.orders.table.company}</th>
                  <th className="py-3.5 px-4 min-w-[200px]">{t.dash.orders.table.product}</th>
                  <th className="py-3.5 px-4 text-center min-w-[90px]">{t.dash.orders.table.qty}</th>
                  <th className="py-3.5 px-4 text-center min-w-[110px]">{t.dash.orders.table.date}</th>
                  <th className="py-3.5 px-4 text-right min-w-[130px]">{t.dash.orders.table.avans}</th>
                  <th className="py-3.5 px-4 text-right min-w-[130px]">{t.dash.orders.table.total}</th>
                  <th className="py-3.5 px-3 text-center w-28">{t.dash.orders.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-[#2A231C]">
                {paginatedOrders.map((order, idx) => {
                  const globalIndex = startIndex + idx + 1;
                  const isFullyPaid = order.paidAmount >= order.totalAmount;
                  const companyName = order.company || order.clientName;
                  const delivered = order.deliveredQuantity || 0;
                  const isFullyDelivered = delivered >= order.quantity;
                  const remainingQty = Math.max(0, order.quantity - delivered);
                  const deliveryPercent = Math.min(100, Math.round((delivered / order.quantity) * 100));

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.03] transition-colors"
                    >
                      {/* № Badge & Code */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-lg bg-amber-500/15 text-stone-950 dark:text-[#FAF7F2] font-black text-xs font-mono border border-amber-500/30">
                            {globalIndex}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400 mt-0.5">
                            {order.orderNumber}
                          </span>
                        </div>
                      </td>

                      {/* 1. Korxona Nomi */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-sm text-stone-900 dark:text-white leading-tight flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{companyName}</span>
                        </div>
                        {order.ttnNumber && (
                          <div className="text-[10px] text-amber-600 dark:text-[#E6C774] font-mono mt-0.5">
                            TTN: {order.ttnNumber}
                          </div>
                        )}
                      </td>

                      {/* 2. Mahsulot Turi */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-white">
                          {order.productName}
                        </div>
                      </td>

                      {/* 3. Soni & Yetkazilish Progressi */}
                      <td className="py-3 px-4 text-center min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 font-mono">
                            {new Intl.NumberFormat('uz-UZ').format(order.quantity)} {t.dash.orders.row.dona}
                          </span>
                          <div className="w-full max-w-[100px] bg-stone-200 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${isFullyDelivered ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${deliveryPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-stone-500">
                            {isFullyDelivered ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> {t.dash.orders.row.deliveredFull}
                              </span>
                            ) : (
                              <span>{t.dash.orders.row.deliveredLabel} <strong className="text-amber-600 dark:text-amber-400">{delivered}</strong> / {order.quantity}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* 4. Sanasi */}
                      <td className="py-3 px-4 text-center">
                        <div className="font-mono font-bold text-stone-800 dark:text-stone-200 text-xs">
                          {order.orderDate}
                        </div>
                        {order.deliveryDate && (
                          <div className="text-[10px] text-amber-600 dark:text-[#E6C774] mt-0.5 font-medium">
                            {t.dash.orders.row.deadline} {order.deliveryDate}
                          </div>
                        )}
                      </td>

                      {/* 5. Avans */}
                      <td className="py-3 px-4 text-right">
                        <div className={`font-bold text-xs ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {formatCurrency(order.paidAmount)}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {isFullyPaid ? t.dash.orders.row.paidFull : `${t.dash.orders.row.remaining} ${formatCurrency(order.totalAmount - order.paidAmount)}`}
                        </div>
                      </td>

                      {/* 6. Jami Summa */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-amber-600 dark:text-[#E6C774] text-xs">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </td>

                      {/* 7. Amallar (Icon shaklida) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onNavigateToWaybill && (
                            <button
                              type="button"
                              onClick={() => onNavigateToWaybill(order)}
                              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#251E18] dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[#382F26] transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                              title={t.dash.orders.row.ttnTitle}
                            >
                              <Truck className="w-4 h-4 text-amber-500" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(order)}
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-[#E6C774] border border-amber-500/30 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                            title={t.dash.orders.row.editTitle}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(order)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                            title={t.dash.orders.row.deleteTitle}
                          >
                            <Trash2 className="w-4 h-4" />
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
          {paginatedOrders.map((order, idx) => {
            const globalIndex = startIndex + idx + 1;
            const companyName = order.company || order.clientName;
            const isFullyPaid = order.paidAmount >= order.totalAmount;
            const delivered = order.deliveredQuantity || 0;
            const isFullyDelivered = delivered >= order.quantity;
            const remainingQty = Math.max(0, order.quantity - delivered);
            const deliveryPercent = Math.min(100, Math.round((delivered / order.quantity) * 100));

            return (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-xs font-mono shadow-xs shrink-0">
                        {globalIndex}
                      </span>
                      <div>
                        <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2] leading-tight">
                          {companyName}
                        </h3>
                        <span className="text-xs text-stone-500">
                          {t.dash.orders.card.code} {order.orderNumber}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-stone-600 dark:text-stone-300">
                    <div className="flex items-start gap-2 pt-1 border-t border-stone-100 dark:border-[#28211A]">
                      <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-stone-900 dark:text-white">
                          {order.productName}
                        </span>
                        <span className="text-stone-500"> · {order.quantity} {t.dash.orders.card.dona}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100 dark:border-[#28211A]">
                      <span className="text-stone-400">{t.dash.orders.card.date}</span>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{order.orderDate}</span>
                    </div>

                    {/* Delivery Progress in Card */}
                    <div className="pt-2 border-t border-stone-100 dark:border-[#28211A] space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">{t.dash.orders.card.deliveryStatus}</span>
                        {isFullyDelivered ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {t.dash.orders.card.deliveredFull}
                          </span>
                        ) : (
                          <span className="font-semibold text-stone-700 dark:text-stone-300">
                            <strong className="text-amber-600 dark:text-amber-400">{delivered}</strong> / {order.quantity} {t.dash.orders.card.dona}
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isFullyDelivered ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${deliveryPercent}%` }}
                        />
                      </div>
                      {!isFullyDelivered && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 text-right">
                          {t.dash.orders.card.remaining} {remainingQty} {t.dash.orders.card.dona}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Box */}
                  <div className="mt-4 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2C241D] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-400 text-[11px] block">{t.dash.orders.card.avans}</span>
                      <span className={`font-bold ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {formatCurrency(order.paidAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px] block">{t.dash.orders.card.total}</span>
                      <span className="font-black text-amber-600 dark:text-[#D4AF37]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#28211A] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {onNavigateToWaybill && (
                      <button
                        type="button"
                        onClick={() => onNavigateToWaybill(order)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#251E18] dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[#382F26] transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                        title={t.dash.orders.row.ttnTitle}
                      >
                        <Truck className="w-4 h-4 text-amber-500" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(order)}
                      className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-[#E6C774] border border-amber-500/30 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      title={t.dash.orders.row.editTitle}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(order)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      title={t.dash.orders.row.deleteTitle}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isFullyDelivered ? (
                    <div 
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      title={t.dash.orders.card.lockedTitle}
                    >
                      <Lock className="w-3 h-3" />
                      <span>{t.dash.orders.card.locked}</span>
                    </div>
                  ) : (
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                      className="text-[11px] px-2 py-1 rounded-lg bg-stone-100 dark:bg-[#201B16] border border-stone-300 dark:border-[#382F26] text-stone-800 dark:text-stone-200 font-semibold cursor-pointer outline-none"
                    >
                      <option value="jarayonda">{t.dash.orders.status.jarayonda}</option>
                      <option value="tayyorlandi">{t.dash.orders.status.tayyorlandi}</option>
                      <option value="jonatildi">{t.dash.orders.status.jonatildi}</option>
                      <option value="yetkazildi" disabled>
                        {t.dash.orders.card.yetkazildiA}{remainingQty} {t.dash.orders.card.yetkazildiB}
                      </option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <ShoppingCart className="w-10 h-10 mx-auto text-stone-400 mb-2 opacity-50" />
          <h3 className="font-bold text-stone-700 dark:text-stone-200">{t.dash.orders.empty.title}</h3>
          <p className="text-xs text-stone-500 mt-1">{t.dash.orders.empty.desc}</p>
        </div>
      )}

      {/* 5. Pagination Controls (10, 30, 50) */}
      {filteredOrders.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Row count selection */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-stone-400 font-semibold">
              {t.dash.orders.pagination.perPage}
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
                  {size} {t.dash.orders.pagination.perPageUnit}
                </button>
              ))}
            </div>
            <span className="text-stone-400 ml-2 hidden sm:inline">|</span>
            <span className="text-stone-500 dark:text-stone-400 hidden sm:inline">
              {t.dash.orders.pagination.showing} <strong className="text-stone-900 dark:text-white">{startIndex + 1}–{endIndex}</strong> {t.dash.orders.pagination.totalOf} {totalItems} {t.dash.orders.pagination.totalUnit}
            </span>
          </div>

          {/* Right: Pagination Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.orders.pagination.first}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.orders.pagination.prev}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

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
              title={t.dash.orders.pagination.next}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={t.dash.orders.pagination.last}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL: YANGI BUYURTMA QABUL QILISH (+ Buyurtma) */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(15, 12, 10, 0.75)' }}
        >
          <div className="bg-white dark:bg-[#181512] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto text-stone-950 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-950 dark:text-white">
                    {t.dash.orders.addModal.title}
                  </h3>
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                    {t.dash.orders.addModal.desc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Row 1: Korxona & Mas'ul shaxs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.addModal.company} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.dash.orders.addModal.companyPh}
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.addModal.contact} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.dash.orders.addModal.contactPh}
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 2: Telefon Raqami va Status (yonma-yon bir qatorda) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.addModal.phone} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.addModal.status}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                  >
                    <option value="jarayonda">{t.dash.orders.status.jarayonda}</option>
                    <option value="tayyorlandi">{t.dash.orders.status.tayyorlandi}</option>
                    <option value="jonatildi">{t.dash.orders.status.jonatildi}</option>
                    <option value="yetkazildi">{t.dash.orders.status.yetkazildi}</option>
                  </select>
                </div>
              </div>

              {/* SPECIAL SECTION: MAHSULOTLAR RO'YXATI (Har birining summasi soniga qarab avtomatik hisoblanadi) */}
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/[0.06] border-2 border-amber-500/35 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-amber-500/25">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
                    <span className="font-black text-xs text-amber-950 dark:text-[#E6C774] uppercase tracking-wide">
                      {t.dash.orders.addModal.productsTitle}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.dash.orders.addModal.addProduct}</span>
                  </button>
                </div>

                {/* Items rows - scrollable when product count increases */}
                <div className="space-y-3 max-h-[300px] sm:max-h-[360px] overflow-y-auto pr-1.5">
                  {orderItems.map((item, idx) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-xl bg-white dark:bg-[#14110E] border border-amber-500/30 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                    >
                      {/* 1. Mahsulot Nomi / Turi */}
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                          #{idx + 1} {t.dash.orders.addModal.productType}
                        </label>
                        <select
                          value={item.productName}
                          onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#1D1814] border border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-xs outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({formatCurrency(p.sellingPrice)})
                            </option>
                          ))}
                          <option value="Maxsus buyurtma tovari">{t.dash.orders.addModal.otherProduct}</option>
                        </select>
                      </div>

                      {/* 2. Dona Narxi */}
                      <div className="w-full sm:w-36">
                        <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                          {t.dash.orders.addModal.unitPrice}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#1D1814] border border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-xs outline-none focus:ring-1 focus:ring-amber-500 text-right font-mono"
                        />
                      </div>

                      {/* 3. Soni */}
                      <div className="w-full sm:w-28">
                        <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                          {t.dash.orders.addModal.qty}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#1D1814] border border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-xs outline-none focus:ring-1 focus:ring-amber-500 text-center font-bold"
                        />
                      </div>

                      {/* 4. Hisoblangan Summa */}
                      <div className="w-full sm:w-40">
                        <label className="block text-[11px] font-bold text-amber-700 dark:text-[#E6C774] mb-1">
                          {t.dash.orders.addModal.sum}
                        </label>
                        <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-[#FAF7F2] font-black text-xs text-right truncate">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>

                      {/* Delete item button */}
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 rounded-xl hover:bg-rose-500/15 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0 self-center sm:self-end"
                          title={t.dash.orders.addModal.removeProductTitle}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotal Banner */}
                <div className="pt-2 border-t border-amber-500/25 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                    {t.dash.orders.addModal.totalItemsA} <strong className="text-stone-900 dark:text-white font-bold">{orderItems.length} {t.dash.orders.addModal.totalTypeUnit}</strong>{t.dash.orders.addModal.totalAnd} <strong className="text-stone-900 dark:text-white font-bold">{calculatedTotalQuantity} {t.dash.orders.addModal.totalDona}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      {t.dash.orders.addModal.totalValue}
                    </span>
                    <span className="text-sm font-black text-amber-700 dark:text-[#E6C774] px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40">
                      {formatCurrency(calculatedTotalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 4: Avans & Quick Fill Buttons */}
              <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-[#151210] border-2 border-stone-300 dark:border-[#382F26] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                    {t.dash.orders.addModal.avans} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  
                  {/* Quick percentage buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paidAmount: Math.round(calculatedTotalAmount * 0.3) })}
                      className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-[#251E18] hover:bg-amber-500/20 text-[11px] font-bold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                    >
                      {t.dash.orders.addModal.avans30}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paidAmount: Math.round(calculatedTotalAmount * 0.5) })}
                      className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-[#251E18] hover:bg-amber-500/20 text-[11px] font-bold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                    >
                      {t.dash.orders.addModal.avans50}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paidAmount: calculatedTotalAmount })}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {t.dash.orders.addModal.avans100}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-blue-400 dark:border-blue-600/60 text-blue-700 dark:text-blue-400 font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-200 dark:border-[#2D251D]">
                    <span className="text-stone-500 dark:text-stone-400">{t.dash.orders.addModal.remainingDue}</span>
                    <span className="font-black text-amber-600 dark:text-[#E6C774] text-sm">
                      {formatCurrency(Math.max(0, calculatedTotalAmount - formData.paidAmount))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 5: Sanasi va Topshirish sanasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.addModal.orderDate} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.addModal.deliveryDate} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Maxsus Izohlar */}
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                  {t.dash.orders.addModal.notes}
                </label>
                <input
                  type="text"
                  placeholder={t.dash.orders.addModal.notesPh}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="pt-4 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t.dash.orders.addModal.cancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  {t.dash.orders.addModal.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: BUYURTMANI TAHRIRLASH (Mas'ul Shaxs to'liq ko'rinadi va tahrirlanadi) */}
      {isEditModalOpen && editingOrder && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(15, 12, 10, 0.75)' }}
        >
          <div className="bg-white dark:bg-[#181512] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-6 text-stone-950 dark:text-white">
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-950 dark:text-white">
                    {t.dash.orders.editModal.title} ({editingOrder.orderNumber})
                  </h3>
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                    {t.dash.orders.editModal.desc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingOrder(null);
                }}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* SPECIAL SECTION: MAS'UL SHAXS MA'LUMOTLARI */}
              <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/[0.08] border-2 border-amber-500/35 space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-amber-500/25">
                  <UserCheck className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
                  <span className="font-black text-xs text-amber-950 dark:text-[#E6C774] uppercase tracking-wide">
                    {t.dash.orders.editModal.contactBox}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.orders.editModal.contactName} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder={t.dash.orders.editModal.contactPh}
                        value={editingOrder.clientName}
                        onChange={(e) => setEditingOrder({ ...editingOrder, clientName: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                      />
                      <User className="w-4 h-4 text-amber-600 dark:text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.orders.editModal.company} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingOrder.company || editingOrder.clientName}
                      onChange={(e) => setEditingOrder({ ...editingOrder, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Telefon Raqami va Status (yonma-yon bir qatorda) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                      {t.dash.orders.editModal.phone} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={editingOrder.phone}
                        onChange={(e) => setEditingOrder({ ...editingOrder, phone: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                      />
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                      <span>{t.dash.orders.addModal.status}</span>
                      {(editingOrder.deliveredQuantity || 0) >= editingOrder.quantity && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {t.dash.orders.editModal.locked}
                        </span>
                      )}
                    </label>
                    {(editingOrder.deliveredQuantity || 0) >= editingOrder.quantity ? (
                      <div 
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-sm"
                        title={t.dash.orders.editModal.lockedTitle}
                      >
                        <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{t.dash.orders.editModal.lockedFull}</span>
                      </div>
                    ) : (
                      <select
                        value={editingOrder.status}
                        onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as OrderStatus })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                      >
                        <option value="jarayonda">{t.dash.orders.status.jarayonda}</option>
                        <option value="tayyorlandi">{t.dash.orders.status.tayyorlandi}</option>
                        <option value="jonatildi">{t.dash.orders.status.jonatildi}</option>
                        <option value="yetkazildi" disabled>
                          {t.dash.orders.editModal.yetkazildiA}{Math.max(0, editingOrder.quantity - (editingOrder.deliveredQuantity || 0))} {t.dash.orders.editModal.yetkazildiB}
                        </option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Mahsulot Turi & Soni */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.editModal.productType} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingOrder.productName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, productName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.editModal.qty} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingOrder.quantity}
                    onChange={(e) => setEditingOrder({ ...editingOrder, quantity: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-center font-bold"
                  />
                </div>
              </div>

              {/* Avans & Jami Summa */}
              <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-[#151210] border-2 border-stone-300 dark:border-[#382F26] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                    <span>{t.dash.orders.editModal.avans}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{t.dash.orders.editModal.paid}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingOrder.paidAmount}
                    onChange={(e) => setEditingOrder({ ...editingOrder, paidAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                    <span>{t.dash.orders.editModal.total}</span>
                    <span className="text-amber-600 dark:text-[#E6C774] font-bold">{t.dash.orders.editModal.totalNote}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingOrder.totalAmount}
                    onChange={(e) => setEditingOrder({ ...editingOrder, totalAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-500/60 text-amber-700 dark:text-[#E6C774] font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>
              </div>

              {/* Sanasi va Topshirish muddati */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.editModal.orderDate} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingOrder.orderDate}
                    onChange={(e) => setEditingOrder({ ...editingOrder, orderDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.orders.editModal.deliveryDate} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingOrder.deliveryDate}
                    onChange={(e) => setEditingOrder({ ...editingOrder, deliveryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Maxsus Izohlar */}
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                  {t.dash.orders.editModal.notes}
                </label>
                <input
                  type="text"
                  value={editingOrder.notes || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="pt-4 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingOrder(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t.dash.orders.editModal.cancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  {t.dash.orders.editModal.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUYURTMANI O'CHIRISH TASDIQLASH */}
      {orderToDelete && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(15, 12, 10, 0.75)' }}
        >
          <div className="bg-white dark:bg-[#181512] border-2 border-rose-300 dark:border-rose-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-stone-950 dark:text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-stone-950 dark:text-white">
                  {t.dash.orders.deleteModal.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {t.dash.orders.deleteModal.code} <span className="font-mono font-bold text-amber-600 dark:text-[#D4AF37]">{orderToDelete.orderNumber}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#1E1915] border border-stone-200 dark:border-[#382F26] text-xs text-stone-700 dark:text-stone-300 mb-5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-400">{t.dash.orders.deleteModal.company}</span>
                <span className="font-bold text-stone-900 dark:text-white">{orderToDelete.company || orderToDelete.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{t.dash.orders.deleteModal.product}</span>
                <span className="font-medium">{orderToDelete.productName} ({orderToDelete.quantity} {t.dash.orders.common.dona})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{t.dash.orders.deleteModal.total}</span>
                <span className="font-mono font-bold text-amber-600 dark:text-[#D4AF37]">{formatCurrency(orderToDelete.totalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 mb-6 font-medium">
              {t.dash.orders.deleteModal.warn}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] text-xs font-bold transition-all cursor-pointer"
              >
                {t.dash.orders.deleteModal.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.dash.orders.deleteModal.confirm}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
