import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, Printer, Plus, Search, Filter, CheckCircle2, 
  Truck, Building2, User, Calendar, MapPin, X, ArrowRight,
  Package, Link as LinkIcon, Info, Lock, Phone, Trash2, Edit3,
  Eye, Download, FileSpreadsheet, Sparkles, Clock,
  ArrowDownLeft, ArrowUpRight, Tag, TrendingUp, TrendingDown,
  CalendarDays, CalendarRange, RotateCcw, ChevronLeft, ChevronRight,
  PackageCheck, ShieldAlert
} from 'lucide-react';
import { WaybillTTN, WaybillItem, ErpOrder, ErpClient, WaybillCategory, ErpProduct, CompanyInfo } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface DeliveryWaybillTabProps {
  waybills: WaybillTTN[];
  orders?: ErpOrder[];
  products?: ErpProduct[];
  clients?: ErpClient[];
  initialSelectedOrder?: ErpOrder | null;
  onClearInitialOrder?: () => void;
  onAddWaybill: (waybill: Omit<WaybillTTN, 'id'>) => void;
  onUpdateWaybillStatus: (id: string, newStatus: WaybillTTN['status']) => void;
  companyInfo?: CompanyInfo | null;
}

interface FormItem {
  id: string;
  productId?: string;
  name: string;
  format: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderProductOption {
  productId?: string;
  name: string;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
}

export const getOrderProductOptions = (order: ErpOrder, allProducts: ErpProduct[] = []): OrderProductOption[] => {
  if (order.items && order.items.length > 0) {
    return order.items.map(it => {
      const matched = allProducts.find(p => 
        (it.productId && p.id === it.productId) || 
        p.name.trim().toLowerCase() === it.productName.trim().toLowerCase() ||
        p.name.toLowerCase().includes(it.productName.toLowerCase()) ||
        it.productName.toLowerCase().includes(p.name.toLowerCase())
      );
      return {
        productId: matched?.id || it.productId,
        name: matched?.name || it.productName,
        quantity: it.quantity,
        remainingQuantity: it.quantity,
        unitPrice: it.unitPrice || matched?.sellingPrice || 3500
      };
    });
  }

  // Parse if composite product name (e.g. "Polo (50 dona) + Fartuk (20 dona)")
  if (order.productName && order.productName.includes(' + ')) {
    const parts = order.productName.split(' + ');
    return parts.map(part => {
      const match = part.match(/^(.*?)(?:\s*\(([0-9]+)\s*dona\))?$/);
      const rawName = match ? match[1].trim() : part.trim();
      const qty = match && match[2] ? parseInt(match[2], 10) : Math.max(1, Math.round(order.quantity / parts.length));
      const matched = allProducts.find(p => 
        p.name.trim().toLowerCase() === rawName.toLowerCase() ||
        p.name.toLowerCase().includes(rawName.toLowerCase()) ||
        rawName.toLowerCase().includes(p.name.toLowerCase())
      );
      const price = matched?.sellingPrice || Math.round(order.totalAmount / (order.quantity || 1)) || 3500;
      return {
        productId: matched?.id,
        name: matched?.name || rawName,
        quantity: qty,
        remainingQuantity: qty,
        unitPrice: price
      };
    });
  }

  // Single product order
  const matched = allProducts.find(p => 
    p.name.trim().toLowerCase() === order.productName.trim().toLowerCase() ||
    p.name.toLowerCase().includes(order.productName.toLowerCase()) ||
    order.productName.toLowerCase().includes(p.name.toLowerCase())
  );
  const delivered = order.deliveredQuantity || 0;
  const remaining = Math.max(0, order.quantity - delivered);
  const unitPrice = Math.round(order.totalAmount / (order.quantity || 1)) || matched?.sellingPrice || 3500;

  return [{
    productId: matched?.id,
    name: matched?.name || order.productName,
    quantity: order.quantity,
    remainingQuantity: remaining > 0 ? remaining : order.quantity,
    unitPrice: unitPrice
  }];
};

export const getNextTtnNumber = (waybillList: WaybillTTN[]): string => {
  const startNumber = 924;
  let maxSeq = startNumber - 1;

  waybillList.forEach(w => {
    if (w.ttnNumber) {
      const match = w.ttnNumber.match(/TTN-(?:\d{4}-)?(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = Math.max(startNumber, maxSeq + 1);
  return `TTN-2026-${String(nextSeq).padStart(4, '0')}`;
};

// Uzbek date formatter
export const formatUzbekDateFull = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      const uzbekMonths = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentabr', 'Oktyabr', 'Noyabr', 'Dekabr'
      ];

      const monthName = uzbekMonths[monthNum - 1] || parts[1];
      return `"${day}" ${monthName} ${year} y.`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

// Official Uzbek Standard Waybill Blank Component (Used for Screen Preview, PDF generation, and Print)
export const OfficialWaybillSheet: React.FC<{ waybill: WaybillTTN; id?: string; companyInfo?: CompanyInfo | null }> = ({ waybill, id, companyInfo }) => {
  const { t } = useLanguage();
  const formatNum = (val: number) => new Intl.NumberFormat('uz-UZ').format(val);

  return (
    <div id={id} className="bg-white text-black pl-4 sm:pl-7 pr-[5mm] pt-6 pb-8 space-y-6 font-sans border border-black/40 print:border-none print:p-0">
      {/* Header: Center Title and Right Corner Order ID */}
      <div className="relative text-center pb-2">
        <div className="absolute right-0 top-0 text-right">
          <div className="inline-block border border-black px-2.5 py-1 text-xs font-mono font-bold bg-stone-50">
            <span className="text-[10px] text-stone-500 block uppercase font-sans font-semibold">{t.dash.waybill.sheet.orderId}</span>
            <span className="text-black text-xs font-black">
              {waybill.customOrderId || waybill.orderNumber || t.dash.waybill.sheet.separate}
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-black">
          {t.dash.waybill.sheet.title}
        </h1>
        <div className="text-xs sm:text-sm font-semibold text-black mt-1">
          {waybill.ttnNumber.startsWith('TTN') || waybill.ttnNumber.startsWith('№') ? waybill.ttnNumber : `№ ${waybill.ttnNumber}`} {t.dash.waybill.sheet.fromDate} {formatUzbekDateFull(waybill.issueDate)}
        </div>
      </div>

      {/* Shipper & Consignee Lines (Two horizontal black divider lines) */}
      <div className="border-t-2 border-b-2 border-black py-2.5 space-y-1.5 text-xs sm:text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <span className="font-extrabold text-black">{t.dash.waybill.sheet.sender} </span>
            <span className="font-normal text-black">{waybill.senderCompany}</span>
          </div>
          <div>
            <span className="font-extrabold text-black">{t.dash.waybill.sheet.phone} </span>
            <span className="font-mono font-bold text-black">{waybill.senderPhone || companyInfo?.phone || '+998 99 505 40 04'}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <span className="font-extrabold text-black">{t.dash.waybill.sheet.receiver} </span>
            <span className="font-normal text-black">{waybill.receiverCompany}</span>
          </div>
          <div>
            <span className="font-extrabold text-black">{t.dash.waybill.sheet.phone} </span>
            <span className="font-mono font-bold text-black">{waybill.receiverPhone || '+998 99 964 96 95'}</span>
          </div>
        </div>
      </div>

      {/* Table with Exact Columns from Screenshot */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse border border-black text-xs sm:text-sm text-left table-auto">
          <thead>
            <tr className="border-b border-black text-center font-bold bg-stone-50">
              <th className="border border-black py-2 px-1 w-9 sm:w-10 text-center">№</th>
              <th className="border border-black py-2 px-3 text-left w-auto min-w-[240px]">{t.dash.waybill.sheet.colProduct}</th>
              <th className="border border-black py-2 px-1.5 text-center w-16 sm:w-20 whitespace-nowrap">{t.dash.waybill.sheet.colUnit}</th>
              <th className="border border-black py-2 px-2 text-right w-20 sm:w-24 whitespace-nowrap">{t.dash.waybill.sheet.colQty}</th>
              <th className="border border-black py-2 px-2 text-right w-24 sm:w-28 whitespace-nowrap">{t.dash.waybill.sheet.colPrice}</th>
              <th className="border border-black py-2 px-2 text-right w-28 sm:w-32 whitespace-nowrap">{t.dash.waybill.sheet.colSum}</th>
            </tr>
          </thead>
          <tbody>
            {waybill.items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border border-black py-2 px-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black py-2 px-3 font-semibold break-words">{item.name}</td>
                <td className="border border-black py-2 px-1.5 text-center">{item.unit === 'Ta' ? 'dona' : (item.unit || 'dona')}</td>
                <td className="border border-black py-2 px-2 text-right font-mono font-semibold whitespace-nowrap">
                  {formatNum(item.quantity)}
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono whitespace-nowrap">
                  {new Intl.NumberFormat('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.unitPrice)}
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono font-bold whitespace-nowrap">
                  {formatNum(item.totalPrice)}
                </td>
              </tr>
            ))}
            {/* Jami (Total) row */}
            <tr className="border-t-2 border-black font-bold bg-stone-50/40">
              <td colSpan={3} className="border border-black py-2 px-3 text-center uppercase tracking-wide font-black">
                {t.dash.waybill.sheet.total}
              </td>
              <td className="border border-black py-2 px-2 text-right font-mono font-black text-sm whitespace-nowrap">
                {formatNum(waybill.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0))}
              </td>
              <td className="border border-black py-2 px-2 text-center text-stone-400">
                —
              </td>
              <td className="border border-black py-2 px-2 text-right font-mono font-black text-sm whitespace-nowrap">
                {formatNum(waybill.totalSum)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures Bottom */}
      <div className="pt-8 sm:pt-12 grid grid-cols-2 gap-8 text-xs sm:text-sm font-sans">
        <div className="flex items-center justify-between border-b border-black pb-1.5">
          <span className="font-extrabold text-black">{t.dash.waybill.sheet.giver}</span>
          <span className="text-xs text-stone-600 italic">{t.dash.waybill.sheet.sign}</span>
        </div>
        <div className="flex items-center justify-between border-b border-black pb-1.5">
          <span className="font-extrabold text-black">{t.dash.waybill.sheet.receiverSign}</span>
          <span className="text-xs text-stone-600 italic">{t.dash.waybill.sheet.sign}</span>
        </div>
      </div>
    </div>
  );
};

export type TimeFilterPeriod = 'all' | 'daily' | 'monthly' | 'yearly';

export const DeliveryWaybillTab: React.FC<DeliveryWaybillTabProps> = ({
  waybills,
  orders = [],
  products = [],
  clients = [],
  initialSelectedOrder,
  onClearInitialOrder,
  onAddWaybill,
  onUpdateWaybillStatus,
  companyInfo
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWaybillForPrint, setSelectedWaybillForPrint] = useState<WaybillTTN | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selected Order for Waybill
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Tanlangan buyurtmaga tegishli mahsulotlar (xatoliklarni oldini olish uchun)
  const availableOrderProducts = useMemo(() => {
    if (!selectedOrder) return [];
    return getOrderProductOptions(selectedOrder, products);
  }, [selectedOrder, products]);

  // Sender Presets (birinchi — korxona kartasidagi yagona ma'lumotlar)
  const senderPresets = [
    ...(companyInfo ? [{
      name: companyInfo.name || 'Korxona',
      phone: companyInfo.phone || '',
      address: companyInfo.address || companyInfo.location || ''
    }] : []),
    { name: 'Shovot Carton', phone: '+998 99 505 40 04', address: 'Xorazm viloyati, Shovot tumani, Sanoat hududi' },
    { name: '“CLEAN LIFE” MCHJ', phone: '+998 71 200 44 88', address: 'Toshkent sh., Chilonzor tumani, 2-Sanoat hududi, 14-bino' }
  ];

  // Faqat sotuv yuk xatlari (xaridlar olib tashlangan)
  const sotuvWaybills = useMemo(() => {
    return waybills.filter(w => (w.category || 'sotuv') !== 'xarid');
  }, [waybills]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfTargetWaybill, setPdfTargetWaybill] = useState<WaybillTTN | null>(null);
  const [timeFilterType, setTimeFilterType] = useState<TimeFilterPeriod>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return waybills[0]?.issueDate || new Date().toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = waybills[0]?.issueDate || new Date().toISOString().split('T')[0];
    return d.slice(0, 7);
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const d = waybills[0]?.issueDate || new Date().toISOString().split('T')[0];
    return d.slice(0, 4);
  });

  const availableDays = Array.from(new Set(waybills.map(w => w.issueDate).filter(Boolean))).sort().reverse();
  const availableYears = Array.from(
    new Set(
      waybills
        .map(w => w.issueDate?.slice(0, 4))
        .filter(Boolean)
        .concat([new Date().getFullYear().toString(), '2026', '2025'])
    )
  ).sort().reverse();

  const UZBEK_MONTH_NAMES: Record<string, string> = {
    '01': 'Yanvar',
    '02': 'Fevral',
    '03': 'Mart',
    '04': 'Aprel',
    '05': 'May',
    '06': 'Iyun',
    '07': 'Iyul',
    '08': 'Avgust',
    '09': 'Sentyabr',
    '10': 'Oktyabr',
    '11': 'Noyabr',
    '12': 'Dekabr'
  };

  const getPeriodLabel = () => {
    if (timeFilterType === 'daily') {
      return <>{t.dash.waybill.period.daily} {selectedDate}</>;
    }
    if (timeFilterType === 'monthly') {
      const parts = selectedMonth.split('-');
      const mName = UZBEK_MONTH_NAMES[parts[1]] || parts[1];
      return <>{t.dash.waybill.period.monthly} {mName} {parts[0]}</>;
    }
    if (timeFilterType === 'yearly') {
      return <>{t.dash.waybill.period.yearly} {selectedYear}{t.dash.waybill.period.yearSuffix}</>;
    }
    return <>{t.dash.waybill.period.all}</>;
  };

  // Pagination State (10, 30, 50 qatorlar)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Form State (jo'natuvchi — korxona kartasidagi yagona ma'lumotlardan)
  const [formData, setFormData] = useState({
    ttnNumber: getNextTtnNumber(waybills),
    category: 'sotuv' as WaybillCategory,
    customOrderId: '',
    issueDate: new Date().toISOString().split('T')[0],
    issueTime: new Date().toTimeString().slice(0, 5),
    senderCompany: companyInfo?.name || 'Shovot Carton',
    senderPhone: companyInfo?.phone || '+998 99 505 40 04',
    senderAddress: companyInfo?.address || companyInfo?.location || 'Xorazm viloyati, Shovot tumani, Sanoat hududi',
    receiverCompany: 'Yevro teks mchj',
    receiverPhone: '+998 99 964 96 95',
    receiverAddress: 'Toshkent sh., Chilonzor tumani',
    driverName: 'Rustam Boltayev',
    driverLicense: 'AF 382910',
    vehiclePlate: '01 774 AAB',
    vehicleModel: 'Labo Max',
    responsibleShipper: 'Ombor mudiri'
  });

  // Korxona kartasi yuklanganda/yangilanganda jo'natuvchi maydonlarini sinxronlash
  useEffect(() => {
    if (!companyInfo) return;
    setFormData(prev => ({
      ...prev,
      senderCompany: companyInfo.name || prev.senderCompany,
      senderPhone: companyInfo.phone || prev.senderPhone,
      senderAddress: companyInfo.address || companyInfo.location || prev.senderAddress
    }));
  }, [companyInfo]);

  // Items State in Form
  const [items, setItems] = useState<FormItem[]>([
    {
      id: 'item-1',
      name: 'Godra',
      format: '',
      unit: 'dona',
      quantity: 7700,
      unitPrice: 3523.30,
      totalPrice: 27129410
    }
  ]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setFormData(prev => ({
        ...prev,
        customOrderId: '',
        receiverCompany: '',
        receiverPhone: ''
      }));
      if (products.length > 0) {
        const firstProd = products[0];
        setItems([
          {
            id: `item-${Date.now()}`,
            productId: firstProd.id,
            name: firstProd.name,
            format: '',
            unit: 'dona',
            quantity: Math.min(100, firstProd.stockCount || 100),
            unitPrice: firstProd.sellingPrice || 3500,
            totalPrice: (firstProd.sellingPrice || 3500) * Math.min(100, firstProd.stockCount || 100)
          }
        ]);
      }
      return;
    }

    const order = orders.find(o => o.id === orderId);
    if (order) {
      setFormData(prev => ({
        ...prev,
        customOrderId: order.orderNumber,
        receiverCompany: order.company || order.clientName,
        receiverPhone: order.phone || '+998 ',
        receiverAddress: `Toshkent sh., ${order.company || order.clientName} qabul punkti`
      }));

      const options = getOrderProductOptions(order, products);
      setItems(options.map((opt, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        productId: opt.productId || '',
        name: opt.name,
        format: '',
        unit: 'dona',
        quantity: opt.remainingQuantity > 0 ? opt.remainingQuantity : opt.quantity,
        unitPrice: opt.unitPrice,
        totalPrice: Math.round(opt.unitPrice * (opt.remainingQuantity > 0 ? opt.remainingQuantity : opt.quantity))
      })));
    }
  };

  const handleSelectSenderPreset = (presetName: string) => {
    const matched = senderPresets.find(p => p.name === presetName);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        senderCompany: matched.name,
        senderPhone: matched.phone,
        senderAddress: matched.address
      }));
    } else {
      setFormData(prev => ({ ...prev, senderCompany: presetName }));
    }
  };

  const handleSelectReceiverClient = (clientName: string) => {
    const matchedClient = clients.find(c => (c.company || c.name) === clientName);
    if (matchedClient) {
      setFormData(prev => ({
        ...prev,
        receiverCompany: matchedClient.company || matchedClient.name,
        receiverPhone: matchedClient.phone,
        receiverAddress: matchedClient.address || prev.receiverAddress
      }));
      return;
    }

    const matchedOrder = orders.find(o => (o.company || o.clientName) === clientName);
    if (matchedOrder) {
      setFormData(prev => ({
        ...prev,
        receiverCompany: matchedOrder.company || matchedOrder.clientName,
        receiverPhone: matchedOrder.phone,
        receiverAddress: `Toshkent sh., ${matchedOrder.company || matchedOrder.clientName} qabul punkti`
      }));
      return;
    }

    setFormData(prev => ({ ...prev, receiverCompany: clientName }));
  };

  useEffect(() => {
    if (initialSelectedOrder) {
      handleSelectOrder(initialSelectedOrder.id);
      setIsAddModalOpen(true);
      if (onClearInitialOrder) onClearInitialOrder();
    }
  }, [initialSelectedOrder]);

  // Set next auto-incremented TTN number and auto date/time on modal open
  useEffect(() => {
    if (isAddModalOpen) {
      const now = new Date();
      setFormData(prev => ({
        ...prev,
        ttnNumber: getNextTtnNumber(waybills),
        category: 'sotuv',
        issueDate: now.toISOString().split('T')[0],
        issueTime: now.toTimeString().slice(0, 5)
      }));

      if (!selectedOrderId && products.length > 0 && items.length === 1 && items[0].name === 'Godra') {
        const firstProd = products[0];
        setItems([
          {
            id: `item-${Date.now()}`,
            productId: firstProd.id,
            name: firstProd.name,
            format: '',
            unit: 'dona',
            quantity: Math.min(100, firstProd.stockCount || 100),
            unitPrice: firstProd.sellingPrice || 3500,
            totalPrice: (firstProd.sellingPrice || 3500) * Math.min(100, firstProd.stockCount || 100)
          }
        ]);
      }
    }
  }, [isAddModalOpen, waybills, selectedOrderId, products]);

  // Handle Item Row Changes
  const handleItemChange = (
    id: string,
    field: keyof FormItem,
    value: string | number
  ) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) || 0 : item.quantity;
        const p = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
        updated.totalPrice = Math.round(q * p);
      }
      return updated;
    }));
  };

  const handleSelectProductForItem = (itemId: string, selectedVal: string) => {
    if (selectedOrder && availableOrderProducts.length > 0) {
      const opt = availableOrderProducts.find(p => 
        (p.productId && p.productId === selectedVal) || 
        p.name.trim().toLowerCase() === selectedVal.trim().toLowerCase()
      );
      if (!opt) return;
      setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        const q = item.quantity || opt.remainingQuantity || 1;
        const p = opt.unitPrice;
        return {
          ...item,
          productId: opt.productId || '',
          name: opt.name,
          unit: 'dona',
          unitPrice: p,
          totalPrice: Math.round(q * p)
        };
      }));
      return;
    }

    const prod = products.find(p => p.id === selectedVal || p.name.trim().toLowerCase() === selectedVal.trim().toLowerCase());
    if (!prod) return;
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const q = item.quantity || 1;
      const p = prod.sellingPrice || item.unitPrice || 3500;
      return {
        ...item,
        productId: prod.id,
        name: prod.name,
        unit: 'dona',
        unitPrice: p,
        totalPrice: Math.round(q * p)
      };
    }));
  };

  const handleAddItemRow = () => {
    if (selectedOrder && availableOrderProducts.length > 0) {
      // Buyurtmadagi hali qo'shilmagan mahsulotni topish yoki birinchisini olish
      const unadded = availableOrderProducts.find(opt => 
        !items.some(i => i.name.trim().toLowerCase() === opt.name.trim().toLowerCase())
      );
      const targetOpt = unadded || availableOrderProducts[0];
      setItems(prev => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          productId: targetOpt.productId || '',
          name: targetOpt.name,
          format: '',
          unit: 'dona',
          quantity: targetOpt.remainingQuantity || 1,
          unitPrice: targetOpt.unitPrice,
          totalPrice: Math.round(targetOpt.unitPrice * (targetOpt.remainingQuantity || 1))
        }
      ]);
      return;
    }

    const prod = products[0];
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: prod?.id || '',
        name: prod?.name || t.dash.waybill.form.newProduct,
        format: '',
        unit: 'dona',
        quantity: 100,
        unitPrice: prod?.sellingPrice || 3500,
        totalPrice: (prod?.sellingPrice || 3500) * 100
      }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalCalculatedQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const totalCalculatedAmount = items.reduce((sum, i) => sum + (Number(i.totalPrice) || 0), 0);

  const timeFilteredWaybills = sotuvWaybills.filter(w => {
    if (timeFilterType === 'all') return true;
    if (!w.issueDate) return false;
    if (timeFilterType === 'daily') {
      return w.issueDate === selectedDate;
    }
    if (timeFilterType === 'monthly') {
      return w.issueDate.startsWith(selectedMonth);
    }
    if (timeFilterType === 'yearly') {
      return w.issueDate.startsWith(selectedYear);
    }
    return true;
  });

  const filteredWaybills = timeFilteredWaybills.filter(w => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      w.ttnNumber.toLowerCase().includes(term) ||
      w.receiverCompany.toLowerCase().includes(term) ||
      w.senderCompany.toLowerCase().includes(term) ||
      (w.customOrderId && w.customOrderId.toLowerCase().includes(term)) ||
      (w.orderNumber && w.orderNumber.toLowerCase().includes(term))
    );
  });

  // Savdo aylanmasi summasi va bajarilgan buyurtmalar soni
  const totalSalesTurnover = timeFilteredWaybills.reduce((sum, w) => sum + (Number(w.totalSum) || 0), 0);
  const completedOrdersCount = orders.filter(o => 
    o.status === 'yetkazildi' || 
    (o.deliveredQuantity && o.quantity && o.deliveredQuantity >= o.quantity)
  ).length;

  // Pagination hisob-kitoblari (10, 30, 50 qator)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timeFilterType, selectedDate, selectedMonth, selectedYear, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredWaybills.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredWaybills.length);
  const paginatedWaybills = filteredWaybills.slice(startIndex, endIndex);

  // Excel (CSV) faylga yuklab olish
  const handleExportToExcel = () => {
    if (filteredWaybills.length === 0) {
      alert(t.dash.waybill.msg.exportEmpty);
      return;
    }

    const headers = [
      '№',
      t.dash.waybill.export.ttn,
      t.dash.waybill.export.orderId,
      t.dash.waybill.export.date,
      t.dash.waybill.export.time,
      t.dash.waybill.export.receiver,
      t.dash.waybill.export.receiverPhone,
      t.dash.waybill.export.sender,
      t.dash.waybill.export.senderPhone,
      t.dash.waybill.export.products,
      t.dash.waybill.export.totalQty,
      t.dash.waybill.export.totalSum,
      t.dash.waybill.export.status,
      t.dash.waybill.export.driver,
      t.dash.waybill.export.plate
    ];

    const rows = filteredWaybills.map((w, idx) => {
      const itemsSummary = w.items
        .map(i => `${i.name}${i.format ? ` (${i.format})` : ''}: ${i.quantity} ${i.unit || 'dona'}`)
        .join('; ');
      const totalQty = w.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const statusName =
        w.status === 'yetkazildi' ? t.dash.waybill.export.delivered : w.status === 'yo_lda' ? t.dash.waybill.export.onWay : t.dash.waybill.export.waiting;

      return [
        idx + 1,
        `"${w.ttnNumber}"`,
        `"${w.customOrderId || w.orderNumber || ''}"`,
        `"${w.issueDate}"`,
        `"${w.issueTime || '10:00'}"`,
        `"${(w.receiverCompany || '').replace(/"/g, '""')}"`,
        `"${w.receiverPhone || ''}"`,
        `"${(w.senderCompany || '').replace(/"/g, '""')}"`,
        `"${w.senderPhone || ''}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        totalQty,
        w.totalSum,
        `"${statusName}"`,
        `"${(w.driverName || '').replace(/"/g, '""')}"`,
        `"${w.vehiclePlate || ''}"`
      ];
    });

    const csvContent =
      '\uFEFF' +
      headers.join(';') +
      '\n' +
      rows.map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodStr = timeFilterType !== 'all' ? `_${timeFilterType}` : '';
    link.download = `Yuk_Xatlari_${new Date().toISOString().split('T')[0]}${periodStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const handlePrintWaybill = (waybill: WaybillTTN) => {
    setSelectedWaybillForPrint(waybill);
    setTimeout(() => {
      window.focus();
      window.print();
    }, 250);
  };

  // PDF hujjat sifatida yuklab olish (Yuklash)
  const handleDownloadPdf = async (waybill: WaybillTTN) => {
    setIsGeneratingPdf(true);
    try {
      setPdfTargetWaybill(waybill);
      // DOM da render qilinishini kutish
      await new Promise(r => setTimeout(r, 200));

      const captureElem = document.getElementById('ttn-pdf-capture-view') || document.getElementById('printable-ttn-modal');
      if (!captureElem) {
        setSelectedWaybillForPrint(waybill);
        setTimeout(() => window.print(), 300);
        return;
      }

      const canvas = await html2canvas(captureElem, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
      pdf.save(`${waybill.ttnNumber || 'Yuk_Xati'}.pdf`);
    } catch (err) {
      console.error('PDF yaratishda xatolik:', err);
      setSelectedWaybillForPrint(waybill);
      setTimeout(() => window.print(), 300);
    } finally {
      setIsGeneratingPdf(false);
      setPdfTargetWaybill(null);
    }
  };

  const handleCreateWaybill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.receiverCompany || !formData.receiverPhone) {
      alert(t.dash.waybill.msg.receiverRequired);
      return;
    }

    if (totalCalculatedQuantity <= 0) {
      alert(t.dash.waybill.msg.qtyPositive);
      return;
    }

    if (selectedOrder) {
      const delivered = selectedOrder.deliveredQuantity || 0;
      const remaining = Math.max(0, selectedOrder.quantity - delivered);
      if (totalCalculatedQuantity > remaining) {
        alert(`${t.dash.waybill.msg.exceedA}${totalCalculatedQuantity} ${t.dash.waybill.msg.exceedB}${remaining} ${t.dash.waybill.msg.exceedC}`);
        return;
      }
    }

    // Tayyor mahsulotlar omboridagi qoldiq miqdorini tekshirish
    for (const item of items) {
      if (!item.name || !item.name.trim()) {
        alert(t.dash.waybill.msg.rowRequired);
        return;
      }
      const matchedProd = products.find(p => 
        (item.productId && p.id === item.productId) || 
        p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
      if (matchedProd) {
        const itemQty = Number(item.quantity) || 0;
        if (itemQty > matchedProd.stockCount) {
          alert(`«${item.name}${t.dash.waybill.msg.stockAfterName}\n\n${t.dash.waybill.msg.stockRemain} ${new Intl.NumberFormat('uz-UZ').format(matchedProd.stockCount)} ${t.dash.waybill.msg.stockUnit}\n${t.dash.waybill.msg.stockEntered} ${new Intl.NumberFormat('uz-UZ').format(itemQty)} ${t.dash.waybill.msg.stockUnit}\n\n${t.dash.waybill.msg.stockNoCreate}`);
          return;
        }
      }
    }

    const waybillItems: WaybillItem[] = items.map(i => ({
      name: i.name,
      format: i.format,
      unit: i.unit,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      totalPrice: Number(i.totalPrice) || 0
    }));

    onAddWaybill({
      orderId: selectedOrderId || undefined,
      orderNumber: selectedOrder?.orderNumber || formData.customOrderId || undefined,
      customOrderId: formData.customOrderId || selectedOrder?.orderNumber || undefined,
      ttnNumber: formData.ttnNumber,
      category: formData.category,
      senderCompany: formData.senderCompany,
      senderPhone: formData.senderPhone,
      senderAddress: formData.senderAddress,
      receiverCompany: formData.receiverCompany,
      receiverPhone: formData.receiverPhone,
      receiverAddress: formData.receiverAddress,
      driverName: formData.driverName,
      driverLicense: formData.driverLicense,
      vehiclePlate: formData.vehiclePlate,
      vehicleModel: formData.vehicleModel,
      items: waybillItems,
      totalSum: totalCalculatedAmount,
      issueDate: formData.issueDate,
      issueTime: formData.issueTime || new Date().toTimeString().slice(0, 5),
      status: 'kutilmoqda',
      responsibleShipper: formData.responsibleShipper
    });

    setIsAddModalOpen(false);
    setSelectedOrderId('');
    setFormData(prev => ({
      ...prev,
      ttnNumber: getNextTtnNumber([...waybills, { ttnNumber: formData.ttnNumber } as WaybillTTN]),
      category: 'sotuv',
      customOrderId: '',
      issueTime: new Date().toTimeString().slice(0, 5)
    }));
  };

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.waybill.table.sumSuffix;
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  return (
    <div className="space-y-6">
      {/* Print Style Injector */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm 8mm 6mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-ttn-modal, #printable-ttn-modal * {
            visibility: visible;
          }
          #printable-ttn-modal {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
          }
          .print\:hidden, header, nav, aside, .no-print, button {
            display: none !important;
          }
        }
      `}</style>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
            {t.dash.waybill.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.waybill.header.sub}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setSelectedOrderId('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dash.waybill.header.create}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
          {/* Birlashgan Qidiruv va Davriy Filtr Kartasi */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs space-y-4">
            {/* Yuqori qator: Qidiruv qatori va Davr tanlash tugmalari */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Qidiruv inputi va Jami hisoblagich */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-xl">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder={t.dash.waybill.search.placeholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <span className="text-xs text-stone-500 font-mono whitespace-nowrap shrink-0">
                  {t.dash.waybill.search.total} <strong className="text-stone-800 dark:text-stone-200 font-bold">{sotuvWaybills.length}</strong> {t.dash.waybill.search.waybills}
                </span>
              </div>

              {/* Davriy Filtr pill tugmalari: Barcha davr, Kunlik, Oylik, Yillik */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2C241D] text-xs font-bold self-start lg:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setTimeFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeFilterType === 'all'
                      ? 'bg-white dark:bg-[#251E18] text-stone-900 dark:text-white shadow-xs font-black'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {t.dash.waybill.filter.all}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilterType('daily')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    timeFilterType === 'daily'
                      ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t.dash.waybill.filter.daily}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilterType('monthly')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    timeFilterType === 'monthly'
                      ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>{t.dash.waybill.filter.monthly}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilterType('yearly')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    timeFilterType === 'yearly'
                      ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.dash.waybill.filter.yearly}</span>
                </button>
              </div>
            </div>

            {/* Pastki qator: Davriy filtr tavsifi va faol bo'lgandagi interaktiv boshqaruv */}
            <div className="pt-3 border-t border-stone-200/60 dark:border-[#2C241D] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-[11px]">
                <CalendarDays className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-semibold text-stone-700 dark:text-stone-300">{t.dash.waybill.filter.period}</span>
                <span className="font-mono font-bold text-amber-700 dark:text-[#E6C774] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {getPeriodLabel()}
                </span>
                <span className="hidden sm:inline text-stone-300 dark:text-stone-700">·</span>
                <span className="hidden sm:inline">{t.dash.waybill.filter.hint}</span>
              </div>

              {/* 1. KUNLIK FILTR */}
              {timeFilterType === 'daily' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{t.dash.waybill.filter.day}</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-300 dark:border-[#382F26] text-stone-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-[#251E18] hover:bg-stone-200 dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 font-semibold cursor-pointer border border-stone-200 dark:border-[#382F26]"
                  >
                    {t.dash.waybill.filter.today}
                  </button>
                  <div className="flex items-center gap-1 pl-2 border-l border-stone-200 dark:border-[#382F26]">
                    <span className="text-[11px] text-stone-400">{t.dash.waybill.filter.dates}</span>
                    {availableDays.slice(0, 4).map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                          selectedDate === day
                            ? 'bg-amber-500/20 text-amber-700 dark:text-[#E6C774] font-bold border border-amber-500/40'
                            : 'bg-stone-100 dark:bg-[#1C1814] text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. OYLIK FILTR */}
              {timeFilterType === 'monthly' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{t.dash.waybill.filter.month}</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-300 dark:border-[#382F26] text-stone-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-[#251E18] hover:bg-stone-200 dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 font-semibold cursor-pointer border border-stone-200 dark:border-[#382F26]"
                  >
                    {t.dash.waybill.filter.currentMonth}
                  </button>
                </div>
              )}

              {/* 3. YILLIK FILTR */}
              {timeFilterType === 'yearly' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{t.dash.waybill.filter.year}</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-300 dark:border-[#382F26] text-stone-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}{t.dash.waybill.filter.yearSuffix}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSelectedYear(new Date().getFullYear().toString())}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-[#251E18] hover:bg-stone-200 dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 font-semibold cursor-pointer border border-stone-200 dark:border-[#382F26]"
                  >
                    {t.dash.waybill.filter.currentYear}
                  </button>
                </div>
              )}

              {/* Natijalar soni va tozalash */}
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-stone-500 font-mono text-[11px]">
                  {t.dash.waybill.filter.found} <strong className="text-amber-600 dark:text-[#E6C774]">{filteredWaybills.length} {t.dash.waybill.filter.foundUnit}</strong> {t.dash.waybill.filter.foundSuffix}
                </span>
                {timeFilterType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTimeFilterType('all')}
                    className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t.dash.waybill.filter.showAll}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3 ta Asosiy KPI Kartasi (Yuk xatlari soni, Bajarilgan buyurtmalar, Savdo aylanmasi) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Yuk Xatlari Soni */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
                  {t.dash.waybill.kpi.count}
                </span>
                <span className="text-2xl font-black font-mono text-stone-900 dark:text-white mt-1 block">
                  {filteredWaybills.length} <span className="text-xs font-sans font-bold text-stone-400">{t.dash.waybill.kpi.unit}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {timeFilteredWaybills.length} {t.dash.waybill.kpi.salesSuffix} ({getPeriodLabel()})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-[#D4AF37]">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Bajarilgan Buyurtmalar Soni */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
                  {t.dash.waybill.kpi.done}
                </span>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {completedOrdersCount} <span className="text-xs font-sans font-bold text-stone-400">{t.dash.waybill.kpi.unit}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {t.dash.waybill.kpi.ordersA} {orders.length} {t.dash.waybill.kpi.ordersB}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Savdo Aylanmasi Summasi */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
                  {t.dash.waybill.kpi.turnover}
                </span>
                <span className="text-xl font-black font-mono text-stone-900 dark:text-white mt-1 block">
                  {formatUzbekSum(totalSalesTurnover)}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {t.dash.waybill.kpi.turnoverNote} ({getPeriodLabel()})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-[#D4AF37]">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Waybills Table (Ro‘yxat ko‘rinishi to‘liq jadval) */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs">
            <div className="p-4 border-b border-[#E2DBD1] dark:border-[#382F26] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50 dark:bg-[#181411]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                  {t.dash.waybill.table.title}
                </h3>
              </div>

              {/* Excelga yuklash va status bildirish */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.dash.waybill.table.badge}</span>
                </div>

                {/* Excelga yuklash tugmasi */}
                <button
                  type="button"
                  onClick={handleExportToExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
                  title={t.dash.waybill.table.excelTitle}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{t.dash.waybill.table.excel}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2DBD1] dark:border-[#382F26] bg-stone-50/75 dark:bg-[#151210] text-[#7A6F62] dark:text-[#A69C8E] font-bold">
                    <th className="py-3 px-3 text-center w-10">№</th>
                    <th className="py-3 px-3">{t.dash.waybill.table.colTtnOrder}</th>
                    <th className="py-3 px-3">{t.dash.waybill.table.colDate}</th>
                    <th className="py-3 px-4">{t.dash.waybill.table.colReceiver}</th>
                    <th className="py-3 px-4">{t.dash.waybill.table.colSender}</th>
                    <th className="py-3 px-3 text-right">{t.dash.waybill.table.colVolume}</th>
                    <th className="py-3 px-3 text-right font-black">{t.dash.waybill.table.colSum}</th>
                    <th className="py-3 px-3 text-center">{t.dash.waybill.table.colStatus}</th>
                    <th className="py-3 px-3 text-center w-36">{t.dash.waybill.table.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DBD1]/60 dark:divide-[#382F26]/60 text-stone-800 dark:text-stone-200">
                  {paginatedWaybills.map((ttn, pIdx) => {
                    const idx = startIndex + pIdx;
                    return (
                      <tr
                        key={ttn.id}
                        className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-colors"
                      >
                        {/* № */}
                        <td className="py-3 px-3 text-center font-mono text-stone-400 font-semibold">
                          {idx + 1}
                        </td>

                        {/* TTN raqami & Buyurtma ID */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono font-black text-amber-600 dark:text-[#D4AF37] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-xs whitespace-nowrap">
                              {ttn.ttnNumber}
                            </span>
                            {(ttn.customOrderId || ttn.orderNumber) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-[#251E18] px-1.5 py-0.5 rounded border border-stone-200 dark:border-[#382F26] whitespace-nowrap">
                                <Package className="w-2.5 h-2.5 text-amber-500" />
                                {ttn.customOrderId || ttn.orderNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sana va Vaqt */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col font-mono text-xs">
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {ttn.issueDate}
                            </span>
                            <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-amber-500" />
                              {ttn.issueTime || '10:00'}
                            </span>
                          </div>
                        </td>

                        {/* Qabul qiluvchi */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                            {ttn.receiverCompany}
                          </div>
                          <div className="font-mono text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                            {ttn.receiverPhone}
                          </div>
                        </td>

                        {/* Jo'natuvchi */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
                            {ttn.senderCompany}
                          </div>
                          <div className="font-mono text-[10px] text-stone-400 mt-0.5">
                            {ttn.senderPhone || companyInfo?.phone || '+998 99 505 40 04'}
                          </div>
                        </td>

                        {/* Jami hajm */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs whitespace-nowrap">
                          {formatNumber(ttn.items.reduce((a, b) => a + b.quantity, 0))} {t.dash.waybill.table.pcs}
                        </td>

                        {/* Summa */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                            +{formatUzbekSum(ttn.totalSum)}
                          </span>
                        </td>

                        {/* Holati */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {ttn.status === 'yo_lda' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                              {t.dash.waybill.export.onWay}
                            </span>
                          ) : ttn.status === 'yetkazildi' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold">
                              {t.dash.waybill.export.delivered}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30 text-[10px] font-bold">
                              {t.dash.waybill.export.waiting}
                            </span>
                          )}
                        </td>

                        {/* Amallar: Ko'rish, PDF yuklash, Chop etish */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. Hujjatni ko'rish */}
                            <button
                              type="button"
                              onClick={() => setSelectedWaybillForPrint(ttn)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#251E18] dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[#382F26] transition-colors cursor-pointer"
                              title={t.dash.waybill.table.viewTitle}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* 2. PDF yuklab olish */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(ttn)}
                              disabled={isGeneratingPdf}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
                              title={t.dash.waybill.table.pdfTitle}
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* 3. Chop etish */}
                            <button
                              type="button"
                              onClick={() => handlePrintWaybill(ttn)}
                              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                              title={t.dash.waybill.table.printTitle}
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {ttn.status !== 'yetkazildi' && (
                              <button
                                type="button"
                                onClick={() => onUpdateWaybillStatus(ttn.id, 'yetkazildi')}
                                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                                title={t.dash.waybill.table.markTitle}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWaybills.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-xs text-stone-500">
                        {t.dash.waybill.table.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10, 30, 50 qatorlar) */}
            <div className="p-4 border-t border-[#E2DBD1] dark:border-[#382F26] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-stone-50/40 dark:bg-[#161311]">
              <div className="flex flex-wrap items-center gap-3 text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.dash.waybill.pg.rows}</span>
                  <div className="inline-flex rounded-xl border border-stone-200 dark:border-[#382F26] p-0.5 bg-white dark:bg-[#201A15] shadow-2xs">
                    {[10, 30, 50].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pageSize === size
                            ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                            : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="font-mono text-stone-500">
                  {filteredWaybills.length > 0 ? (
                    <>
                      {t.dash.waybill.pg.total} <strong>{filteredWaybills.length}</strong> {t.dash.waybill.pg.of}{' '}
                      <strong className="text-amber-600 dark:text-[#E6C774]">
                        {startIndex + 1}–{Math.min(startIndex + pageSize, filteredWaybills.length)}
                      </strong> {t.dash.waybill.pg.showing}
                    </>
                  ) : (
                    t.dash.waybill.pg.empty
                  )}
                </span>
              </div>

              {/* Sahifalar navigatsiyasi */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#201A15] text-stone-700 dark:text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-[#2C241D] cursor-pointer"
                    title={t.dash.waybill.pg.prev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, pIdx, arr) => {
                        const prevPage = arr[pIdx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="px-1 text-stone-400 font-mono">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-colors cursor-pointer ${
                                currentPage === page
                                  ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                                  : 'bg-white dark:bg-[#201A15] border border-stone-200 dark:border-[#382F26] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#2C241D]'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#201A15] text-stone-700 dark:text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-[#2C241D] cursor-pointer"
                    title={t.dash.waybill.pg.next}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MODAL PRINT PREVIEW (Agar alohida oynada ochilsa)           */}
      {/* ------------------------------------------------------------- */}
      {selectedWaybillForPrint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white text-black rounded-2xl w-full max-w-4xl p-4 sm:p-8 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Top Control Bar (Never Printed) */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-sm text-stone-800">
                  {t.dash.waybill.print.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedWaybillForPrint)}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md disabled:opacity-50"
                  title={t.dash.waybill.print.pdfTitle}
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? t.dash.waybill.print.pdfBusy : t.dash.waybill.print.pdf}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                  title={t.dash.waybill.print.printTitle}
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.dash.waybill.print.print}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWaybillForPrint(null)}
                  className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer"
                  title={t.dash.waybill.print.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE OFFICIAL BLANK AREA (Exact match to User's Uploaded PDF/Screenshot) */}
            <OfficialWaybillSheet waybill={selectedWaybillForPrint} id="printable-ttn-modal" companyInfo={companyInfo} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: YANGI YUK XATI RASMIYLASHTIRISH                     */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-[#1C1814] text-[#1A1715] dark:text-[#FAF7F2] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden">
            
            {/* Modal Sarlavhasi (Tepada qotirilgan) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 dark:border-[#2C241D] shrink-0 bg-stone-50/70 dark:bg-[#181411]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-[#E6C774]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2]">
                    {t.dash.waybill.form.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-[#251E18] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Formasi (Tepa-pastni bemalol ko'rish uchun scroll qo'shildi) */}
            <form onSubmit={handleCreateWaybill} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs flex-1 max-h-[calc(90vh-130px)]">
                
                {/* 1. BUYURTMANI TANLASH VA CHEKKADAGI MAXSUS ID SI */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-950 dark:text-[#E6C774] flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{t.dash.waybill.form.link}</span>
                    </label>
                    <span className="text-[10px] text-stone-500">
                      {t.dash.waybill.form.linkHint}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-600 dark:text-stone-300 font-semibold mb-1 text-[11px]">
                        {t.dash.waybill.form.chooseOrder}
                      </label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => handleSelectOrder(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#12100E] border-2 border-amber-500/40 text-[#1A1715] dark:text-[#FAF7F2] font-semibold text-xs cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">{t.dash.waybill.form.separate}</option>
                        {orders.map(o => {
                          const delivered = o.deliveredQuantity || 0;
                          const remaining = Math.max(0, o.quantity - delivered);
                          const isCompleted = remaining === 0;
                          return (
                            <option key={o.id} value={o.id} disabled={isCompleted}>
                              {o.orderNumber} — {o.company || o.clientName} ({o.productName} | {t.dash.waybill.form.remain} {new Intl.NumberFormat('uz-UZ').format(remaining)} {t.dash.waybill.form.pcs}) {isCompleted ? t.dash.waybill.form.done100 : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-stone-600 dark:text-stone-300 font-semibold mb-1 text-[11px]">
                        {t.dash.waybill.form.customId}
                      </label>
                      <input
                        type="text"
                        placeholder={t.dash.waybill.form.customIdPh}
                        value={formData.customOrderId}
                        onChange={(e) => setFormData({ ...formData, customOrderId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-[#1A1715] dark:text-[#FAF7F2] font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {selectedOrder && (
                    <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 text-[11px] space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-700 dark:text-stone-300">
                        <div className="p-2 rounded-lg bg-stone-100/70 dark:bg-[#1C1814] border border-stone-200/60 dark:border-[#2C241D]">
                          <span className="text-stone-500 block text-[10px]">{t.dash.waybill.form.totalOrder}</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-xs">{new Intl.NumberFormat('uz-UZ').format(selectedOrder.quantity)} {t.dash.waybill.form.pcs}</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-stone-100/70 dark:bg-[#1C1814] border border-stone-200/60 dark:border-[#2C241D]">
                          <span className="text-stone-500 block text-[10px]">{t.dash.waybill.form.deliveredBefore}</span>
                          <strong className="text-blue-600 dark:text-blue-400 font-mono text-xs">{new Intl.NumberFormat('uz-UZ').format(selectedOrder.deliveredQuantity || 0)} {t.dash.waybill.form.pcs}</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-stone-100/70 dark:bg-[#1C1814] border border-stone-200/60 dark:border-[#2C241D]">
                          <span className="text-stone-500 block text-[10px]">{t.dash.waybill.form.currentRemain}</span>
                          <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-xs">{new Intl.NumberFormat('uz-UZ').format(Math.max(0, selectedOrder.quantity - (selectedOrder.deliveredQuantity || 0)))} {t.dash.waybill.form.pcs}</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30">
                          <span className="text-amber-700 dark:text-amber-400 block text-[10px] font-bold">{t.dash.waybill.form.inThis}</span>
                          <strong className="text-amber-800 dark:text-[#E6C774] font-mono text-xs font-black">{new Intl.NumberFormat('uz-UZ').format(totalCalculatedQuantity)} {t.dash.waybill.form.pcs}</strong>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-[#E6C774] flex items-center gap-2 text-[10px]">
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          <strong>{t.dash.waybill.form.lockTitle}</strong> {t.dash.waybill.form.lockA} <strong>{t.dash.waybill.form.lockB}</strong> {t.dash.waybill.form.lockC}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. HUJJAT REKVIZITLARI (Kategoriya, TTN raqami, Sana va Vaqt birlashtirildi) */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-800 dark:text-stone-200">
                    <span className="flex items-center gap-1.5 uppercase tracking-wide">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t.dash.waybill.form.req}</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{t.dash.waybill.form.autoDate}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
                    {/* Kategoriya */}
                    <div>
                      <label className="block text-stone-500 dark:text-stone-400 mb-1 text-[11px] font-semibold">
                        {t.dash.waybill.form.category}
                      </label>
                      <div className="h-[38px] px-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs flex items-center justify-between select-none shadow-xs">
                        <span className="flex items-center gap-1.5">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t.dash.waybill.form.incoming}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">{t.dash.waybill.form.sales}</span>
                      </div>
                    </div>

                    {/* Yuk Xati Raqami */}
                    <div>
                      <label className="block text-stone-500 dark:text-stone-400 mb-1 text-[11px] font-semibold">
                        {t.dash.waybill.form.ttn}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.ttnNumber}
                        onChange={(e) => setFormData({ ...formData, ttnNumber: e.target.value })}
                        className="h-[38px] w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1915] border border-stone-300 dark:border-[#382F26] font-mono font-bold text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                      />
                    </div>

                    {/* Sanasi */}
                    <div>
                      <label className="block text-stone-500 dark:text-stone-400 mb-1 text-[11px] font-semibold flex items-center justify-between">
                        <span>{t.dash.waybill.form.date}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{t.dash.waybill.form.auto}</span>
                      </label>
                      <div className="h-[38px] w-full px-3 rounded-xl bg-stone-100 dark:bg-[#181411] border border-stone-200 dark:border-[#2C241D] text-stone-800 dark:text-stone-200 font-mono font-bold text-xs flex items-center gap-2 select-none shadow-inner cursor-not-allowed" title={t.dash.waybill.form.autoTitle}>
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{formData.issueDate || new Date().toISOString().split('T')[0]}</span>
                      </div>
                    </div>

                    {/* Vaqti */}
                    <div>
                      <label className="block text-stone-500 dark:text-stone-400 mb-1 text-[11px] font-semibold flex items-center justify-between">
                        <span>{t.dash.waybill.form.time}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{t.dash.waybill.form.auto}</span>
                      </label>
                      <div className="h-[38px] w-full px-3 rounded-xl bg-stone-100 dark:bg-[#181411] border border-stone-200 dark:border-[#2C241D] text-stone-800 dark:text-stone-200 font-mono font-bold text-xs flex items-center gap-2 select-none shadow-inner cursor-not-allowed" title={t.dash.waybill.form.autoTitle}>
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{formData.issueTime || new Date().toTimeString().slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. YUK JO'NATUVCHI (TANLASH VA YOZISH) */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 dark:text-white uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t.dash.waybill.form.sender}</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-stone-400">{t.dash.waybill.form.quick}</span>
                      <select
                        onChange={(e) => handleSelectSenderPreset(e.target.value)}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1E1915] border border-stone-300 dark:border-[#382F26] text-stone-800 dark:text-stone-200 font-semibold cursor-pointer"
                      >
                        {senderPresets.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-500 mb-1 text-[11px]">{t.dash.waybill.form.companyName}</label>
                      <input
                        type="text"
                        required
                        value={formData.senderCompany}
                        onChange={(e) => setFormData({ ...formData, senderCompany: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1915] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-500 mb-1 text-[11px]">{t.dash.waybill.form.phone}</label>
                      <input
                        type="text"
                        required
                        value={formData.senderPhone}
                        onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1915] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. YUK QABUL QILUVCHI (TANLASH VA YOZISH) */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 dark:text-white uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t.dash.waybill.form.receiver}</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-stone-400">{t.dash.waybill.form.fromBase}</span>
                      <select
                        onChange={(e) => handleSelectReceiverClient(e.target.value)}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1E1915] border border-stone-300 dark:border-[#382F26] text-stone-800 dark:text-stone-200 font-semibold cursor-pointer max-w-[200px]"
                      >
                        <option value="">{t.dash.waybill.form.choose}</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.company || c.name}>{c.company || c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-500 mb-1 text-[11px]">{t.dash.waybill.form.clientName}</label>
                      <input
                        type="text"
                        required
                        placeholder={t.dash.waybill.form.clientNamePh}
                        value={formData.receiverCompany}
                        onChange={(e) => setFormData({ ...formData, receiverCompany: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1915] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-500 mb-1 text-[11px]">{t.dash.waybill.form.phone}</label>
                      <input
                        type="text"
                        required
                        placeholder="+998 99 964 96 95"
                        value={formData.receiverPhone}
                        onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1915] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. MAHSULOTLAR JADVALI (Mahsulot turi ustuni olib tashlandi, Ta birligi olib tashlandi) */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 dark:text-white uppercase tracking-wide text-[11px]">
                        {t.dash.waybill.form.items}
                      </span>
                      {selectedOrder && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-[#E6C774] text-[10px] font-extrabold border border-amber-500/30">
                          <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>{t.dash.waybill.form.onlyOrder}</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-[#E6C774] font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t.dash.waybill.form.addRow}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {items.map((item, idx) => {
                      const matchedProd = products.find(p => 
                        (item.productId && p.id === item.productId) || 
                        p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                      );
                      const matchedOrderOpt = selectedOrder
                        ? availableOrderProducts.find(op => 
                            (op.productId && op.productId === item.productId) ||
                            op.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                          )
                        : null;

                      const isShortage = matchedProd ? (Number(item.quantity) || 0) > matchedProd.stockCount : false;
                      const orderLimitExceeded = matchedOrderOpt ? (Number(item.quantity) || 0) > matchedOrderOpt.remainingQuantity : false;
                      const isPartialShipment = matchedOrderOpt && (Number(item.quantity) || 0) < matchedOrderOpt.remainingQuantity;

                      return (
                        <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-[#1E1915] border border-stone-200 dark:border-[#2E2720] grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-1 text-center font-bold text-stone-400 text-xs pt-2">
                            {idx + 1}
                          </div>

                          <div className="col-span-11 sm:col-span-5">
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-[10px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1">
                                {selectedOrder ? (
                                  <>
                                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                                    <span>{t.dash.waybill.form.chooseOrderProduct}</span>
                                  </>
                                ) : (
                                  <span>{t.dash.waybill.form.chooseProduct}</span>
                                )}
                              </label>
                              {matchedProd && (
                                <span className={`text-[10px] font-mono font-bold ${
                                  isShortage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {t.dash.waybill.form.inStock} {new Intl.NumberFormat('uz-UZ').format(matchedProd.stockCount)} {t.dash.waybill.form.pcs}
                                </span>
                              )}
                            </div>

                            {selectedOrder ? (
                              <select
                                required
                                value={item.productId || availableOrderProducts.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase())?.productId || item.name}
                                onChange={(e) => handleSelectProductForItem(item.id, e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-lg bg-amber-500/5 dark:bg-[#12100E] border text-xs font-semibold cursor-pointer outline-none transition-colors ${
                                  isShortage
                                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-700 dark:text-rose-300'
                                    : 'border-amber-500/40 focus:ring-1 focus:ring-amber-500 text-[#1A1715] dark:text-[#FAF7F2]'
                                }`}
                              >
                                <option value="">{t.dash.waybill.form.chooseOrderPh}</option>
                                {availableOrderProducts.map(op => {
                                  const prod = products.find(p => 
                                    (op.productId && p.id === op.productId) || 
                                    p.name.trim().toLowerCase() === op.name.trim().toLowerCase()
                                  );
                                  const stock = prod ? prod.stockCount : 0;
                                  return (
                                    <option key={op.productId || op.name} value={op.productId || op.name}>
                                      📦 {op.name} ({t.dash.waybill.form.inOrder} {new Intl.NumberFormat('uz-UZ').format(op.quantity)} | {t.dash.waybill.form.inStock} {new Intl.NumberFormat('uz-UZ').format(stock)} {t.dash.waybill.form.pcs})
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <select
                                required
                                value={item.productId || products.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase())?.id || ''}
                                onChange={(e) => handleSelectProductForItem(item.id, e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-[#12100E] border text-xs font-semibold cursor-pointer outline-none transition-colors ${
                                  isShortage
                                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-700 dark:text-rose-300'
                                    : 'border-stone-200 dark:border-[#2E2720] focus:ring-1 focus:ring-amber-500 text-[#1A1715] dark:text-[#FAF7F2]'
                                }`}
                              >
                                <option value="">{t.dash.waybill.form.chooseReadyPh}</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — {t.dash.waybill.form.inStock} {new Intl.NumberFormat('uz-UZ').format(p.stockCount)} {t.dash.waybill.form.pcs} {p.stockCount === 0 ? t.dash.waybill.form.notEnough : ''}
                                  </option>
                                ))}
                              </select>
                            )}

                            {isShortage && (
                              <p className="mt-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                {t.dash.waybill.form.shortage} {new Intl.NumberFormat('uz-UZ').format(matchedProd?.stockCount || 0)} {t.dash.waybill.form.pcs})
                              </p>
                            )}
                          </div>

                          <div className="col-span-4 sm:col-span-2">
                            <label className="block text-[10px] text-stone-400 mb-0.5">{t.dash.waybill.form.unit}</label>
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-xs font-semibold cursor-pointer"
                            >
                              <option value="dona">Dona</option>
                              <option value="metr">Metr</option>
                              <option value="kg">Kg</option>
                              <option value="quti">Quti</option>
                              <option value="rulon">Rulon</option>
                              <option value="blok">Blok</option>
                            </select>
                          </div>

                          <div className="col-span-4 sm:col-span-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-[10px] text-stone-400">{t.dash.waybill.form.qty}</label>
                              {selectedOrder && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-[#E6C774]" title={t.dash.waybill.form.partialTitle}>
                                  {t.dash.waybill.form.partial}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              className={`w-full px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-[#12100E] border text-xs font-bold font-mono text-right outline-none ${
                                isShortage || orderLimitExceeded
                                  ? 'border-rose-500 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20'
                                  : 'border-stone-200 dark:border-[#2E2720] text-amber-600 dark:text-[#E6C774]'
                              }`}
                            />
                            {matchedOrderOpt && (
                              <div className="mt-1 flex flex-col gap-0.5 text-[9px] font-medium">
                                <span className="text-stone-400">{t.dash.waybill.form.remainSmall} <strong>{new Intl.NumberFormat('uz-UZ').format(matchedOrderOpt.remainingQuantity)} {t.dash.waybill.form.pcs}</strong></span>
                                {orderLimitExceeded && (
                                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                                    {t.dash.waybill.form.overRemain}
                                  </span>
                                )}
                                {isPartialShipment && !orderLimitExceeded && (
                                  <span className="text-amber-700 dark:text-[#E6C774] font-bold">
                                    {t.dash.waybill.form.partialShip}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="col-span-3 sm:col-span-2">
                            <label className="block text-[10px] text-stone-400 mb-0.5">{t.dash.waybill.form.price}</label>
                            <input
                              type="number"
                              required
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-xs font-mono text-right outline-none"
                            />
                          </div>

                          <div className="col-span-1 sm:col-span-1 flex items-center justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(item.id)}
                              disabled={items.length <= 1}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                              title={t.dash.waybill.form.remove}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Summary Row */}
                  <div className="pt-2 border-t border-stone-200 dark:border-[#2A231C] flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-medium">
                      {t.dash.waybill.form.total} <strong>{formatNumber(totalCalculatedQuantity)} {t.dash.waybill.form.pcs}</strong>
                    </span>
                    <span className="font-black font-mono text-amber-600 dark:text-[#E6C774] text-sm">
                      {formatUzbekSum(totalCalculatedAmount)}
                    </span>
                  </div>

                  {selectedOrder && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-stone-700 dark:text-stone-300">{t.dash.waybill.form.afterState}</span>
                        {totalCalculatedQuantity >= Math.max(0, selectedOrder.quantity - (selectedOrder.deliveredQuantity || 0)) ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> {t.dash.waybill.form.fullDone}
                          </span>
                        ) : (
                          <span className="text-amber-800 dark:text-[#E6C774] font-black flex items-center gap-1">
                            <PackageCheck className="w-4 h-4" /> {t.dash.waybill.form.partialState} {new Intl.NumberFormat('uz-UZ').format(Math.max(0, selectedOrder.quantity - (selectedOrder.deliveredQuantity || 0) - totalCalculatedQuantity))} {t.dash.waybill.form.pcs})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-600 dark:text-stone-400">
                        {totalCalculatedQuantity >= Math.max(0, selectedOrder.quantity - (selectedOrder.deliveredQuantity || 0))
                          ? t.dash.waybill.form.fullNote
                          : t.dash.waybill.form.partialNote
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Tugmalari (Pastda qotirilgan) */}
              <div className="p-3.5 sm:p-4 border-t border-stone-200 dark:border-[#2C241D] bg-stone-50/70 dark:bg-[#15120F] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#251E18] dark:hover:bg-[#322820] text-stone-700 dark:text-stone-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  {t.dash.waybill.form.cancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg cursor-pointer"
                >
                  {t.dash.waybill.form.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF yaratish jarayoni xabarnomasi */}
      {isGeneratingPdf && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-500/40 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-xs font-bold font-mono">{t.dash.waybill.pdfBusy}</span>
        </div>
      )}

      {/* Yashirin capturable view (PDF yuklab olish uchun 100% toza va ishonchli DOM) */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: 0, 
          width: '794px', 
          background: '#ffffff', 
          zIndex: -100, 
          pointerEvents: 'none' 
        }} 
        aria-hidden="true"
      >
        {pdfTargetWaybill && (
          <div id="ttn-pdf-capture-view" className="p-6 bg-white">
            <OfficialWaybillSheet waybill={pdfTargetWaybill} companyInfo={companyInfo} />
          </div>
        )}
      </div>
    </div>
  );
};
