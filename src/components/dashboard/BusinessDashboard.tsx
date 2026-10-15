import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Package, Layers, 
  ShoppingCart, Users, Truck, FileText, ChevronDown, ChevronRight,
  Sun, Moon, LogOut, ShieldCheck, User, Bell, Sparkles, Building2, 
  CheckCircle2, Menu, X, Globe, Phone, Award, Warehouse, ArrowUpRight,
  Calendar, Search, ExternalLink, Factory, Calculator, Briefcase, Mail,
  Images, SlidersHorizontal, MessageSquareText
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { OverviewAnalytics } from './OverviewAnalytics';
import { ProductionMaterialsTab } from './ProductionMaterialsTab';
import { ProductionProductsTab } from './ProductionProductsTab';
import { ProductionWarehouseTab } from './ProductionWarehouseTab';
import { HrEmployeesTab } from './HrEmployeesTab';
import { HrPayrollTab } from './HrPayrollTab';
import { HrBonusesTab } from './HrBonusesTab';
import { DeliveryFleetTab } from './DeliveryFleetTab';
import { DeliveryWaybillTab } from './DeliveryWaybillTab';
import { CrmClientsTab } from './CrmClientsTab';
import { OrdersTab } from './OrdersTab';
import { CashFlowTab } from './CashFlowTab';
import { CalculatorTab } from './CalculatorTab';
import { ContactCmsTab } from './ContactCmsTab';
import { PortfolioCmsTab } from './PortfolioCmsTab';
import { BeforeAfterCmsTab } from './BeforeAfterCmsTab';
import {
  getStoredContactInfo, getStoredContactMessages,
  getStoredPortfolio, getStoredBeforeAfter,
} from '../../data/cmsInitialData';
import { loadContactInfo, loadPortfolio, loadSlider, pushContactInfo, pushPortfolio, pushSlider } from '../../api/siteSync';
import type { ContactMessage, PublicContactInfo, PortfolioProject, BeforeAfterContent } from '../../types';

import { 
  FinancialTransaction, ErpProduct, RawMaterial, ErpOrder, 
  ErpClient, Employee, BonusRecord, DeliveryTrip, WaybillTTN,
  CompanyInfo,
  TransactionType, OrderStatus, DeliveryStatus, PaymentMethod
} from '../../types/erp';
import { MaterialPurchasePayload } from './MaterialReceiptModal';
import { ProductProductionPayload } from './ProductionProductsTab';
import { erpApi } from '../../api/erpApi';

// Yuk xati (TTN) yaratilganda backend avtomatik ravishda alohida
// yetkazib berish reysini yaratadi — bu yerda qo'lda reys yaratilmaydi.

interface BusinessDashboardProps {
  onBackToSite?: () => void;
  onLogout: () => void;
}

export type TabType = 
  | 'overview' 
  | 'production_materials' 
  | 'production_products' 
  | 'production_warehouse' 
  | 'hr_employees' 
  | 'hr_payroll' 
  | 'hr_bonuses' 
  | 'delivery_fleet' 
  | 'delivery_waybill' 
  | 'crm_clients' 
  | 'orders' 
  | 'cashflow'
  | 'calculator'
  | 'cms_contact'
  | 'cms_portfolio'
  | 'cms_beforeafter';

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  onBackToSite,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('brendor_active_tab') as TabType | null;
      const validTabs: TabType[] = [
        'overview', 'production_materials', 'production_products',
        'production_warehouse', 'hr_employees', 'hr_payroll', 'hr_bonuses',
        'delivery_fleet', 'delivery_waybill', 'crm_clients', 'orders',
        'cashflow', 'calculator', 'cms_contact', 'cms_portfolio', 'cms_beforeafter'
      ];
      return saved && validTabs.includes(saved) ? saved : 'overview';
    } catch {
      return 'overview';
    }
  });

  // Faol tabni eslab qolish — sahifa yangilanganda joriy sahifada qoladi
  useEffect(() => {
    try {
      localStorage.setItem('brendor_active_tab', activeTab);
    } catch { /* noop */ }
  }, [activeTab]);

  // --- Sayt CMS holati (Bog'lanish / Portfolio / Slayder) ---
  const [cmsMessages, setCmsMessages] = useState<ContactMessage[]>(() => {
    try { return getStoredContactMessages(); } catch { return []; }
  });
  const [cmsContactInfo, setCmsContactInfo] = useState<PublicContactInfo>(() => {
    try { return getStoredContactInfo(); } catch {
      return { phone1: '', phone2: '', email: '', telegram: '', instagram: '', address: '', workingHours: '' };
    }
  });
  const [cmsPortfolio, setCmsPortfolio] = useState<PortfolioProject[]>(() => {
    try { return getStoredPortfolio('uz'); } catch { return []; }
  });
  const [cmsPortfolioRu, setCmsPortfolioRu] = useState<PortfolioProject[]>(() => {
    try { return getStoredPortfolio('ru'); } catch { return []; }
  });
  const [cmsPortfolioLang, setCmsPortfolioLang] = useState<'uz' | 'ru'>('uz');
  const [cmsBeforeAfter, setCmsBeforeAfter] = useState<BeforeAfterContent>(() => {
    try { return getStoredBeforeAfter('uz'); } catch { return null as unknown as BeforeAfterContent; }
  });
  const [cmsBeforeAfterRu, setCmsBeforeAfterRu] = useState<BeforeAfterContent>(() => {
    try { return getStoredBeforeAfter('ru'); } catch { return null as unknown as BeforeAfterContent; }
  });
  const [cmsBeforeAfterLang, setCmsBeforeAfterLang] = useState<'uz' | 'ru'>('uz');

  // CMS ni localStorage ga yozish (yozilgandan SO'NG event — sayt yangi ma'lumotni o'qiydi)
  const dispatchCms = (key: 'portfolio' | 'quotes' | 'messages' | 'contact_info' | 'before_after') => {
    try {
      window.dispatchEvent(new CustomEvent('brendor_cms_updated', { detail: { key } }));
    } catch { /* noop */ }
  };
  useEffect(() => {
    try { localStorage.setItem('brendor_contact_messages', JSON.stringify(cmsMessages)); } catch { /* noop */ }
    dispatchCms('messages');
  }, [cmsMessages]);
  useEffect(() => {
    try { localStorage.setItem('brendor_contact_info', JSON.stringify(cmsContactInfo)); } catch { /* noop */ }
    dispatchCms('contact_info');
  }, [cmsContactInfo]);
  useEffect(() => {
    try { localStorage.setItem('brendor_portfolio_projects', JSON.stringify(cmsPortfolio)); } catch { /* noop */ }
    dispatchCms('portfolio');
  }, [cmsPortfolio]);
  useEffect(() => {
    try { localStorage.setItem('brendor_portfolio_projects_ru', JSON.stringify(cmsPortfolioRu)); } catch { /* noop */ }
    dispatchCms('portfolio');
  }, [cmsPortfolioRu]);
  useEffect(() => {
    try { localStorage.setItem('brendor_before_after', JSON.stringify(cmsBeforeAfter)); } catch { /* noop */ }
    dispatchCms('before_after');
  }, [cmsBeforeAfter]);
  useEffect(() => {
    try { localStorage.setItem('brendor_before_after_ru', JSON.stringify(cmsBeforeAfterRu)); } catch { /* noop */ }
    dispatchCms('before_after');
  }, [cmsBeforeAfterRu]);

  // DB dagi sayt kontenti bilan sinxronlash (boshqa qurilmadagi yangiliklar)
  useEffect(() => {
    loadContactInfo().then(setCmsContactInfo).catch(() => {});
    loadPortfolio('uz').then(setCmsPortfolio).catch(() => {});
    loadPortfolio('ru').then(setCmsPortfolioRu).catch(() => {});
    loadSlider('uz').then(setCmsBeforeAfter).catch(() => {});
    loadSlider('ru').then(setCmsBeforeAfterRu).catch(() => {});
  }, []);

  const handleCmsContactInfoUpdate = (info: PublicContactInfo) => {
    setCmsContactInfo(info);
    pushContactInfo(info);
  };

  const handleCmsPortfolioUpdate = (lang: 'uz' | 'ru') => (next: PortfolioProject[]) => {
    const prev = lang === 'ru' ? cmsPortfolioRu : cmsPortfolio;
    if (lang === 'ru') setCmsPortfolioRu(next);
    else setCmsPortfolio(next);
    pushPortfolio(lang, next, prev).then((synced) => {
      if (lang === 'ru') setCmsPortfolioRu(synced);
      else setCmsPortfolio(synced);
    });
  };

  const handleCmsSliderUpdate = (lang: 'uz' | 'ru') => (content: BeforeAfterContent) => {
    if (lang === 'ru') setCmsBeforeAfterRu(content);
    else setCmsBeforeAfter(content);
    pushSlider(lang, content);
  };
  useEffect(() => {
    erpApi.contactMessages.list()
      .then((dbMsgs) => {
        setCmsMessages((prev) => {
          const byId = new Map(prev.map(m => [m.id, m]));
          dbMsgs.forEach((db) => {
            if (byId.has(db.id)) {
              byId.set(db.id, { ...byId.get(db.id)!, ...db, status: db.status });
            } else {
              byId.set(db.id, db);
            }
          });
          return Array.from(byId.values()).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      })
      .catch(() => { /* backend o'chiq bo'lsa localStorage bilan ishlayveradi */ });
  }, []);

  const handleCmsMessagesUpdate = (msgs: ContactMessage[]) => {
    const nextIds = new Set(msgs.map(m => m.id));
    // O'chirilganlar → DB dan ham o'chirish
    cmsMessages.forEach((prev) => {
      if (!nextIds.has(prev.id) && prev.dbId) {
        erpApi.contactMessages.remove(prev.dbId).catch(() => {});
      }
    });
    const prevById = new Map(cmsMessages.map(m => [m.id, m]));
    msgs.forEach((m) => {
      const prev = prevById.get(m.id);
      if (m.dbId && prev && prev.status !== m.status) {
        erpApi.contactMessages.update(m.dbId, { status: m.status }).catch(() => {});
      }
      if (!prev && !m.dbId) {
        // Dashboarddan qo'lda qo'shilgan — DB ga ham yozish
        erpApi.contactMessages.create({
          name: m.name, phone: m.phone, email: m.email || '', message: m.message, external_id: m.id,
        }).then((saved) => {
          setCmsMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, dbId: saved.dbId } : x)));
        }).catch(() => {});
      }
    });
    setCmsMessages(msgs);
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen || isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen, isLangDropdownOpen]);

  // Accordion open/collapse states for Sidebar groups
  const [openAccordions, setOpenAccordions] = useState<{
    production: boolean;
    hr: boolean;
    delivery: boolean;
    site: boolean;
  }>({
    production: true,
    hr: true,
    delivery: true,
    site: true
  });

  const toggleAccordion = (section: 'production' | 'hr' | 'delivery' | 'site') => {
    setOpenAccordions(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Notification Toast state
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Persistent States (API dan yuklanadi)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [orders, setOrders] = useState<ErpOrder[]>([]);
  const [clients, setClients] = useState<ErpClient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bonuses, setBonuses] = useState<BonusRecord[]>([]);
const [deliveries, setDeliveries] = useState<DeliveryTrip[]>([]);
const [waybills, setWaybills] = useState<WaybillTTN[]>([]);
const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Admin profili (korxona kartasidagi yagona ma'lumotlardan)
  const adminDisplayName = companyInfo?.adminName || 'Akbar Xolmatov';
  const adminInitials = adminDisplayName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'AX';
  const adminTitle = companyInfo?.adminTitle || t.dash.shell.defTitle;
  const adminPosition = companyInfo?.adminPosition || t.dash.shell.defPosition;
  const adminRole = companyInfo?.adminRole || t.dash.shell.defRole;
  const adminCompanyName = companyInfo?.name || 'Clean Life Factory';

  // API dan barcha ma'lumotlarni yuklash
  useEffect(() => {
    erpApi.transactions.list().then(setTransactions).catch(() => {});
    erpApi.products.list().then(setProducts).catch(() => {});
    erpApi.materials.list().then(setMaterials).catch(() => {});
    erpApi.orders.list().then(setOrders).catch(() => {});
    erpApi.clients.list().then(setClients).catch(() => {});
    erpApi.employees.list().then(setEmployees).catch(() => {});
    erpApi.bonuses.list().then(setBonuses).catch(() => {});
    erpApi.deliveries.list().then(setDeliveries).catch(() => {});
    erpApi.waybills.list().then(setWaybills).catch(() => {});
    // Korxona ma'lumotlarini yuklash
    erpApi.company.get().then(setCompanyInfo).catch(() => {});
  }, []);

  // Moliya sahifasi ochilganda tranzaksiyalarni yangilash (oylik to'lov chiqimlari ko'rinishi uchun)
  useEffect(() => {
    if (activeTab === 'cashflow') {
      erpApi.transactions.list().then(setTransactions).catch(() => {});
    }
  }, [activeTab]);

  // Selected product passed into calculator
  const [calculatorSelectedProduct, setCalculatorSelectedProduct] = useState<ErpProduct | null>(null);

  // Cash flow modal trigger
  const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState(false);
  const [cashFlowModalType, setCashFlowModalType] = useState<TransactionType>('kirim');

  // Handlers
  const handleAddTransaction = async (newTx: Omit<FinancialTransaction, 'id'>) => {
    try {
      const created = await erpApi.transactions.create(newTx);
      setTransactions(prev => [created, ...prev]);
      showNotification('Yangi moliyaviy tranzaksiya kiritildi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await erpApi.transactions.remove(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      showNotification('Tranzaksiya o‘chirildi');
    } catch (e) {
      // 404: serverda allaqachon yo'q — ghost qatorni ro'yxatdan olib tashlaymiz
      if ((e as { status?: number }).status === 404) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        showNotification('Tranzaksiya allaqachon o‘chirilgan');
      } else {
        showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      }
    }
  };

  // Material kirimi (xarid) → moliya sahifasida CHIQIM sifatida avtomatik qayd etish
  const handleRecordMaterialPurchase = (p: MaterialPurchasePayload) => {
    const paymentMethod: PaymentMethod =
      p.paymentMethod.toLowerCase().includes('naqd') ? 'naqd' : 'bank_transfer';

    void handleAddTransaction({
      type: 'chiqim',
      category: 'Material xaridi',
      amount: Math.round(p.amount),
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
      description: `Material xaridi: ${p.materialName} — ${p.quantity} ${p.unit} × ${Math.round(p.unitCost)} so'm`,
      relatedClient: p.counterparty || undefined
    });
  };

  // Tayyor mahsulot qo'shilganda → moliya sahifasida CHIQIM (ishlab chiqarish tannarxi) sifatida qayd etish
  const handleRecordProductProduction = (p: ProductProductionPayload) => {
    if (p.amount <= 0) return;

    void handleAddTransaction({
      type: 'chiqim',
      category: 'Mahsulot ishlab chiqarish',
      amount: Math.round(p.amount),
      paymentMethod: 'bank_transfer',
      date: new Date().toISOString().split('T')[0],
      description: `Tayyor mahsulot: ${p.productName} — ${p.quantity} dona × ${p.unitCost} so'm (SKU: ${p.sku})`
    });
  };

  const handleAddMaterial = async (newMat: Omit<RawMaterial, 'id'>) => {
    try {
      const created = await erpApi.materials.create(newMat);
      setMaterials(prev => [created, ...prev]);
      showNotification('Xom-ashyo omborga muvaffaqiyatli kirim qilindi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleUpdateMaterial = async (updatedMat: RawMaterial) => {
    try {
      const updated = await erpApi.materials.update(updatedMat.id, updatedMat);
      setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m));
      showNotification('Material ma’lumotlari yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await erpApi.materials.remove(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      showNotification('Material ombordan o‘chirildi');
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
      setMaterials(prev => prev.filter(m => m.id !== id));
        showNotification('Yozuv allaqachon o‘chirilgan');
      } else {
        showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      }
    }
  };

  const handleAddProduct = async (newProd: Omit<ErpProduct, 'id'>) => {
    try {
      // O'chirilgan/mavjud bo'lmagan material IDlari BOM'dan chiqarib tashlanadi (400 xatolik oldini olish)
      const sanitized = {
        ...newProd,
        bom: (newProd.bom || []).filter(i => materials.some(m => m.id === i.materialId))
      };
      const created = await erpApi.products.create(sanitized);
      setProducts(prev => [created, ...prev]);
      showNotification('Yangi tayyor mahsulot katalogga qo‘shildi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleUpdateProduct = async (updatedProd: ErpProduct) => {
    try {
      const sanitized = {
        ...updatedProd,
        bom: (updatedProd.bom || []).filter(i => materials.some(m => m.id === i.materialId))
      };
      const updated = await erpApi.products.update(sanitized.id, sanitized);
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      showNotification('Tayyor mahsulot yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await erpApi.products.remove(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotification('Mahsulot katalogdan o‘chirildi');
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
      setProducts(prev => prev.filter(p => p.id !== id));
        showNotification('Yozuv allaqachon o‘chirilgan');
      } else {
        showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      }
    }
  };

  const handleAddOrder = async (newOrder: Omit<ErpOrder, 'id' | 'orderNumber'>) => {
    try {
      const created = await erpApi.orders.create(newOrder);
      setOrders(prev => [created, ...prev]);
      showNotification(`${created.orderNumber} raqamli buyurtma qabul qilindi!`);
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  // Waybill connection state from Orders tab
  const [waybillInitialOrder, setWaybillInitialOrder] = useState<ErpOrder | null>(null);

  const handleCreateWaybillForOrder = (order: ErpOrder) => {
    setWaybillInitialOrder(order);
    setOpenAccordions(prev => ({ ...prev, delivery: true }));
    setActiveTab('delivery_waybill');
  };

  const handleUpdateOrder = async (updatedOrder: ErpOrder) => {
    try {
      const updated = await erpApi.orders.update(updatedOrder.id, updatedOrder);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      showNotification(`${updated.orderNumber} raqamli buyurtma ma’lumotlari yangilandi!`);
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const updated = await erpApi.orders.changeStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      showNotification('Buyurtma holati yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await erpApi.orders.remove(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      showNotification('Buyurtma tizimdan o‘chirildi!');
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
      setOrders(prev => prev.filter(o => o.id !== id));
        showNotification('Yozuv allaqachon o‘chirilgan');
      } else {
        showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      }
    }
  };

  const handleAddClient = async (newClient: Omit<ErpClient, 'id'>) => {
    try {
      const created = await erpApi.clients.create(newClient);
      setClients(prev => [created, ...prev]);
      showNotification('Yangi mijoz CRM bazasiga kiritildi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleUpdateClient = async (updatedClient: ErpClient) => {
    try {
      const updated = await erpApi.clients.update(updatedClient.id, updatedClient);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      showNotification('Mijoz ma’lumotlari muvaffaqiyatli yangilandi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await erpApi.clients.remove(id);
      setClients(prev => prev.filter(c => c.id !== id));
      showNotification('Mijoz bazadan o‘chirildi');
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
      setClients(prev => prev.filter(c => c.id !== id));
        showNotification('Yozuv allaqachon o‘chirilgan');
      } else {
        showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      }
    }
  };

  const handleAddEmployee = async (newEmp: Omit<Employee, 'id'>) => {
    try {
      const created = await erpApi.employees.create(newEmp);
      setEmployees(prev => [created, ...prev]);
      showNotification('Yangi xodim ro‘yxatga olindi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    try {
      const updated = await erpApi.employees.update(updatedEmp.id, updatedEmp);
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      showNotification('Xodim ma’lumotlari yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await erpApi.employees.remove(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      showNotification('Xodim o‘chirildi');
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
      setEmployees(prev => prev.filter(e => e.id !== id));
        showNotification('Yozuv allaqachon o‘chirilgan');
      } else {
        showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      }
    }
  };

  const handleAddBonus = async (newBonus: Omit<BonusRecord, 'id'>) => {
    try {
      const created = await erpApi.bonuses.create(newBonus);
      setBonuses(prev => [created, ...prev]);
      showNotification('Xodimga yangi KPI bonusi belgilandi!');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleApproveBonus = async (id: string) => {
    try {
      const updated = await erpApi.bonuses.update(id, { status: 'tasdiqlangan' });
      setBonuses(prev => prev.map(b => b.id === id ? updated : b));
      showNotification('Bonus tasdiqlandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  // QOTISH QOIDASI: «Yetkazildi» holatiga o'tgan reysni hech kim o'zgartira olmaydi
  const handleUpdateDeliveryStatus = async (id: string, status: DeliveryStatus) => {
    try {
      const updated = await erpApi.deliveries.changeStatus(id, status, 'Admin (Akbar Xolmatov)');
      setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
      showNotification('Reys holati yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  // ReyS ma'lumotlarini yangilash (haydovchi, yetkazish haqi va h.k.)
  const handleUpdateDelivery = async (id: string, updates: Partial<DeliveryTrip>) => {
    try {
      const updated = await erpApi.deliveries.update(id, updates);
      setDeliveries(prev => prev.map(d => d.id === id ? updated : d));
      showNotification('ReyS ma’lumotlari yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  // Reyslar backend tomonidan avtomatik yaratiladi:
  // POST /api/waybills/ → har bir yuk xati uchun alohida DeliveryTrip ochiladi.
  // Shuning uchun yuk xati yaratilganda reyslar ro'yxati qayta yuklanadi (handleAddWaybill).

  const handleAddWaybill = async (newWaybill: Omit<WaybillTTN, 'id'>) => {
    try {
      const created = await erpApi.waybills.create(newWaybill);
      setWaybills(prev => [created, ...prev]);

      // Backend avtomatik: tranzaksiya, buyurtma yangilash, REYS YARATISH, ombor yangilash
      // Bog'liq ma'lumotlarni qayta yuklash
      erpApi.transactions.list().then(setTransactions).catch(() => {});
      erpApi.orders.list().then(setOrders).catch(() => {});
      erpApi.deliveries.list().then(setDeliveries).catch(() => {});
      erpApi.products.list().then(setProducts).catch(() => {});

      showNotification(`${created.ttnNumber} yuk xati rasmiylashtirildi — reys avtomatik yaratildi!`);
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const handleUpdateWaybillStatus = async (id: string, status: WaybillTTN['status']) => {
    try {
      const updated = await erpApi.waybills.changeStatus(id, status);
      setWaybills(prev => prev.map(w => w.id === id ? updated : w));
      // Reyslarni sinxronlash
      erpApi.deliveries.list().then(setDeliveries).catch(() => {});
      showNotification('Yuk xati holati yangilandi');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const selectProductForCalc = (product: ErpProduct) => {
    setCalculatorSelectedProduct(product);
    setOpenAccordions(prev => ({ ...prev, production: true }));
    setActiveTab('calculator');
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#121110] text-[#EFECE6]' : 'bg-[#FAF8F5] text-[#1A1715]'
    }`}>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#1A1816] text-[#FAF7F2] border border-[#D4AF37] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-xs font-medium">{notification}</span>
        </div>
      )}

      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-stone-200 dark:border-[#2C241D] bg-white dark:bg-[#1A1816]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C59B27] to-[#D4AF37] text-black font-extrabold flex items-center justify-center text-sm shadow">
            B
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">CLEAN LIFE ERP</h1>
            <span className="text-[10px] text-amber-500 font-mono block">Ishlab chiqarish</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-stone-100 dark:bg-[#251E18] text-stone-600 dark:text-stone-300"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4AF37]" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-stone-100 dark:bg-[#251E18] text-stone-600 dark:text-stone-300"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 1. CHAP TOMON: SIDEBAR MENYU */}
      <aside className={`
        ${isMobileMenuOpen ? 'fixed inset-0 z-40 flex flex-col' : 'hidden md:flex'}
        w-full md:w-72 shrink-0 bg-white dark:bg-[#161412] border-r border-[#E2DBD1] dark:border-[#2C241D] flex-col justify-between h-auto md:h-screen sticky top-0 overflow-y-auto selection:bg-amber-500
      `}>
        <div className="p-5 space-y-6">
          {/* Logo va Korxona nomi */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/clean-life-logo.jpg"
                alt="Clean Life Group"
                className="h-10 w-auto rounded-lg shadow-md"
              />
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-[#1A1715] dark:text-[#FAF7F2]">
                  CLEAN LIFE ERP
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#94690A] dark:text-[#D4AF37] font-semibold block">
                  {t.dash.shell.subtitle}
                </span>
              </div>
            </div>

            {isMobileMenuOpen && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links with Smooth Accordions */}
          <nav className="space-y-1.5 text-xs font-medium">
            {/* Asosiy Sahifa (Home / Analytics) */}
            <button
              onClick={() => {
                setActiveTab('overview');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold shadow-sm border border-amber-500/30'
                  : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#201B16] hover:text-black dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
              <span>{t.dash.shell.home}</span>
            </button>

            {/* 1. Mijozlar (CRM) */}
            <button
              onClick={() => {
                setActiveTab('crm_clients');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'crm_clients'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold shadow-sm border border-amber-500/30'
                  : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#201B16] hover:text-black dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>{t.dash.shell.crm}</span>
            </button>

            {/* 2. Buyurtmalar */}
            <button
              onClick={() => {
                setActiveTab('orders');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold shadow-sm border border-amber-500/30'
                  : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#201B16] hover:text-black dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-500" />
              <div className="flex-1 flex items-center justify-between">
                <span>{t.dash.shell.orders}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  {orders.length}
                </span>
              </div>
            </button>

            {/* 3. Yuk Xatlari (Buyurtmalardan keyin) */}
            <button
              onClick={() => {
                setActiveTab('delivery_waybill');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'delivery_waybill'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold shadow-sm border border-amber-500/30'
                  : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#201B16] hover:text-black dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <div className="flex-1 flex items-center justify-between">
                <span>{t.dash.shell.waybills}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-[#E6C774] font-bold border border-amber-500/20">
                  {waybills.length}
                </span>
              </div>
            </button>

            {/* 4. Yetkazib berish xizmati (Yuk Xatlari pastida) */}
            <button
              onClick={() => {
                setActiveTab('delivery_fleet');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'delivery_fleet'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold shadow-sm border border-amber-500/30'
                  : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#201B16] hover:text-black dark:hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4 text-cyan-500" />
              <div className="flex-1 flex items-center justify-between">
                <span>{t.dash.shell.fleet}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-500/20">
                  {deliveries.length}
                </span>
              </div>
            </button>

            {/* 5. Moliya (Kirim/Chiqim) */}
            <button
              onClick={() => {
                setActiveTab('cashflow');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'cashflow'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold shadow-sm border border-amber-500/30'
                  : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#201B16] hover:text-black dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4 text-[#D4AF37]" />
              <span>{t.dash.shell.finance}</span>
            </button>

            {/* GROUP 1: ISHLAB CHIQARISH (DROPDOWN / ACCORDION) */}
            <div className="pt-2">
              <button
                onClick={() => toggleAccordion('production')}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#8A7E70] dark:text-[#8E8476] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Factory className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.dash.shell.production}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.production ? 'rotate-0' : '-rotate-90'}`} />
              </button>

              {openAccordions.production && (
                <div className="pl-3.5 mt-1 space-y-1 border-l-2 border-stone-200 dark:border-[#2C241D] ml-3 animate-in fade-in duration-200">
                  <button
                    onClick={() => {
                      setActiveTab('production_materials');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'production_materials'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{t.dash.shell.materials}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('production_products');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'production_products'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.dash.shell.products}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('production_warehouse');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'production_warehouse'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.dash.shell.warehouse}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('calculator');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'calculator'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{t.dash.shell.calculator}</span>
                  </button>
                </div>
              )}
            </div>

            {/* GROUP 2: HR BO'LIMI (DROPDOWN / ACCORDION) */}
            <div className="pt-2">
              <button
                onClick={() => toggleAccordion('hr')}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#8A7E70] dark:text-[#8E8476] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t.dash.shell.hr}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.hr ? 'rotate-0' : '-rotate-90'}`} />
              </button>

              {openAccordions.hr && (
                <div className="pl-3.5 mt-1 space-y-1 border-l-2 border-stone-200 dark:border-[#2C241D] ml-3 animate-in fade-in duration-200">
                  <button
                    onClick={() => {
                      setActiveTab('hr_employees');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'hr_employees'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t.dash.shell.employees}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('hr_payroll');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'hr_payroll'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.dash.shell.payroll}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('hr_bonuses');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'hr_bonuses'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.dash.shell.bonuses}</span>
                  </button>
                </div>
              )}
            </div>

            {/* GROUP 3: SAYT CMS (Sayt bo'limlarini tahrirlash) */}
            <div className="pt-2">
              <button
                onClick={() => toggleAccordion('site')}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#8A7E70] dark:text-[#8E8476] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.dash.shell.site}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.site ? 'rotate-0' : '-rotate-90'}`} />
              </button>

              {openAccordions.site && (
                <div className="pl-3.5 mt-1 space-y-1 border-l-2 border-stone-200 dark:border-[#2C241D] ml-3 animate-in fade-in duration-200">
                  <button
                    onClick={() => {
                      setActiveTab('cms_contact');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'cms_contact'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.dash.shell.cmsContact}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('cms_portfolio');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'cms_portfolio'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Images className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.dash.shell.cmsPortfolio}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('cms_beforeafter');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'cms_beforeafter'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                        : 'text-[#6B6152] dark:text-[#B8AEA0] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.dash.shell.cmsSlider}</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>

      {/* 2. O'NG TOMON: ASOSIY SAHIFA KONTENTI */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Sticky Header for Main Area */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-[#E2DBD1] dark:border-[#2C241D] bg-white/80 dark:bg-[#161412]/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-[#1A1715] dark:text-[#FAF7F2] capitalize">
              {activeTab === 'overview' && t.dash.shell.titleOverview}
              {activeTab === 'production_materials' && t.dash.shell.titleMaterials}
              {activeTab === 'production_products' && t.dash.shell.titleProducts}
              {activeTab === 'production_warehouse' && t.dash.shell.titleWarehouse}
              {activeTab === 'hr_employees' && t.dash.shell.titleEmployees}
              {activeTab === 'hr_payroll' && t.dash.shell.titlePayroll}
              {activeTab === 'hr_bonuses' && t.dash.shell.titleBonuses}
              {activeTab === 'delivery_fleet' && t.dash.shell.titleFleet}
              {activeTab === 'delivery_waybill' && t.dash.shell.titleWaybills}
              {activeTab === 'crm_clients' && t.dash.shell.titleCrm}
              {activeTab === 'orders' && t.dash.shell.titleOrders}
              {activeTab === 'cashflow' && t.dash.shell.titleCashflow}
              {activeTab === 'calculator' && t.dash.shell.titleCalculator}
              {activeTab === 'cms_contact' && t.dash.shell.titleCmsContact}
              {activeTab === 'cms_portfolio' && t.dash.shell.titleCmsPortfolio}
              {activeTab === 'cms_beforeafter' && t.dash.shell.titleCmsSlider}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 1. Saytga tugmasi (faqat ikonka) */}
            {onBackToSite && (
              <button
                onClick={onBackToSite}
                className="w-8 h-8 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#251E18] transition-all cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                title="Veb-saytga o‘tish"
                aria-label="Veb-saytga o‘tish"
              >
                <Globe className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
              </button>
            )}

            {/* 2. Til dropdown (UZ / RU) */}
            <div ref={langDropdownRef} className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="h-8 px-2 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#251E18] transition-all cursor-pointer flex items-center gap-1 shadow-sm text-[11px] font-bold uppercase"
                title={t.header.langLabel}
                aria-label={t.header.langLabel}
              >
                <Globe className="w-4 h-4 text-amber-600 dark:text-[#D4AF37]" />
                <span>{lang}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl border shadow-xl overflow-hidden z-50 bg-white dark:bg-[#1A1714] border-stone-200 dark:border-[#332A22]">
                  {(['uz', 'ru'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setIsLangDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        lang === l
                          ? 'bg-amber-500/15 text-amber-800 dark:text-[#D4AF37] font-bold'
                          : 'text-[#5C5346] dark:text-[#C5BCB0] hover:bg-stone-100 dark:hover:bg-[#251E18]'
                      }`}
                    >
                      <span>{l === 'uz' ? 'O‘zbekcha' : 'Русский'}</span>
                      {lang === l && <span className="text-amber-600 dark:text-[#D4AF37]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Kun / Tun rejimi tugmasi (faqat ikonka) */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl border border-stone-200 dark:border-[#382F26] text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#251E18] transition-all cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
              title={theme === 'dark' ? 'Kunduzgi rejimga o‘tish' : 'Tungi rejimga o‘tish'}
              aria-label="Rejimni o‘zgartirish"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600" />
              )}
            </button>

            <div className="h-5 w-px bg-stone-200 dark:bg-[#2C241D] mx-0.5" />

            {/* 3. Profil Avatar & Ma'lumot (Clickable with Dropdown Popover) */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center gap-2 p-1 pr-2 rounded-xl transition-all cursor-pointer border ${
                  isProfileDropdownOpen
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-[#D4AF37]'
                    : 'border-transparent hover:border-stone-200 dark:hover:border-[#382F26] hover:bg-stone-100 dark:hover:bg-[#201B16]'
                }`}
                title={t.dash.shell.profileTitle}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 text-black font-extrabold flex items-center justify-center text-xs shadow-sm ring-1 ring-amber-500/30">
                    {adminInitials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161412]" />
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-bold text-xs block text-[#1A1715] dark:text-[#FAF7F2] leading-tight">
                    {adminDisplayName}
                  </span>
                  <span className="text-[10px] text-[#7A6F62] dark:text-stone-400 block leading-tight">
                    {companyInfo?.adminPosition || t.dash.shell.profileDefault}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180 text-amber-600 dark:text-[#D4AF37]' : ''}`} />
              </button>

              {/* PROFIL POPOVER / DROPDOWN (Ixcham va chiroyli) */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#1A1714] border border-stone-200 dark:border-[#332A22] shadow-xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#1A1715] dark:text-[#FAF7F2]">
                  {/* Profil bosh qismi */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-stone-100 dark:border-[#28211A]">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black font-extrabold flex items-center justify-center text-xs shadow-sm shrink-0">
                      {adminInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-[#1A1715] dark:text-[#FAF7F2] truncate">
                          {adminDisplayName}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Online
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-700 dark:text-[#D4AF37] font-semibold block truncate">
                        {adminTitle}
                      </span>
                    </div>
                  </div>

                  {/* Ixcham ma'lumotlar ro'yxati */}
                  <div className="py-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-stone-100 dark:border-[#26201A]">
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        {t.dash.shell.company}
                      </span>
                      <span className="font-semibold text-[11px] text-[#1A1715] dark:text-[#FAF7F2] truncate text-right">
                        {adminCompanyName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-stone-100 dark:border-[#26201A]">
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 shrink-0">
                        <User className="w-3.5 h-3.5 text-cyan-500" />
                        {t.dash.shell.employee}
                      </span>
                      <span className="font-semibold text-[11px] text-[#1A1715] dark:text-[#FAF7F2] truncate text-right">
                        {adminDisplayName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-stone-100 dark:border-[#26201A]">
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                        {t.dash.shell.position}
                      </span>
                      <span className="font-semibold text-[11px] text-[#1A1715] dark:text-[#FAF7F2] truncate text-right">
                        {adminPosition}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-stone-100 dark:border-[#26201A]">
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {t.dash.shell.role}
                      </span>
                      <span className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 truncate text-right">
                        {adminRole}
                      </span>
                    </div>
                  </div>

                  {/* Pastki qism */}
                  <div className="pt-2 border-t border-stone-100 dark:border-[#28211A] flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-stone-400">{t.dash.shell.access} 100%</span>
                    <button
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-amber-700 dark:text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      {t.dash.shell.close}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-stone-200 dark:bg-[#2C241D] mx-0.5" />

            {/* 4. Chiqish tugmasi (eng o'ng tomonda) */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition-all cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                title={t.dash.shell.logout}
                aria-label={t.dash.shell.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {activeTab === 'overview' && (
            <OverviewAnalytics
              transactions={transactions}
              orders={orders}
              materials={materials}
              products={products}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
              onOpenCashFlowModal={(type) => {
                setCashFlowModalType(type);
                setIsCashFlowModalOpen(true);
              }}
            />
          )}

          {activeTab === 'production_materials' && (
            <ProductionMaterialsTab
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onRecordPurchase={handleRecordMaterialPurchase}
              companyInfo={companyInfo}
            />
          )}

          {activeTab === 'production_products' && (
            <ProductionProductsTab
              products={products}
              materials={materials}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onSelectForCalculator={selectProductForCalc}
              onRecordProduction={handleRecordProductProduction}
            />
          )}

          {activeTab === 'production_warehouse' && (
            <ProductionWarehouseTab
              materials={materials}
              products={products}
              onUpdateMaterial={handleUpdateMaterial}
              onUpdateProduct={handleUpdateProduct}
              onAddProduct={handleAddProduct}
              onAddMaterial={handleAddMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onRecordPurchase={handleRecordMaterialPurchase}
              companyInfo={companyInfo}
            />
          )}

          {activeTab === 'hr_employees' && (
            <HrEmployeesTab
              employees={employees}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              companyInfo={companyInfo}
              onSaveCompany={setCompanyInfo}
            />
          )}

          {activeTab === 'hr_payroll' && (
            <HrPayrollTab
              employees={employees}
              bonuses={bonuses}
            />
          )}

          {activeTab === 'hr_bonuses' && (
            <HrBonusesTab
              bonuses={bonuses}
              employees={employees}
              onAddBonus={handleAddBonus}
              onApproveBonus={handleApproveBonus}
            />
          )}

          {activeTab === 'delivery_fleet' && (
            <DeliveryFleetTab
              deliveries={deliveries}
              waybills={waybills}
              employees={employees}
              onUpdateDelivery={handleUpdateDelivery}
              onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            />
          )}

          {activeTab === 'delivery_waybill' && (
            <DeliveryWaybillTab
              waybills={waybills}
              orders={orders}
              products={products}
              clients={clients}
              initialSelectedOrder={waybillInitialOrder}
              onClearInitialOrder={() => setWaybillInitialOrder(null)}
              onAddWaybill={handleAddWaybill}
              onUpdateWaybillStatus={handleUpdateWaybillStatus}
              companyInfo={companyInfo}
            />
          )}

          {activeTab === 'crm_clients' && (
            <CrmClientsTab
              clients={clients}
              employees={employees}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              products={products}
              waybills={waybills}
              onAddOrder={handleAddOrder}
              onUpdateOrder={handleUpdateOrder}
              onDeleteOrder={handleDeleteOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onNavigateToWaybill={handleCreateWaybillForOrder}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashFlowTab
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              isAddModalOpen={isCashFlowModalOpen}
              setIsAddModalOpen={setIsCashFlowModalOpen}
              modalInitialType={cashFlowModalType}
            />
          )}

          {activeTab === 'calculator' && (
            <CalculatorTab
              products={products}
              materials={materials}
              selectedProductInitial={calculatorSelectedProduct}
              onCreateOrderFromCalc={(orderData) => {
                handleAddOrder({
                  clientName: 'Kalkulyator mijozi',
                  phone: '+998 90 123 45 67',
                  businessType: 'Kalkulyator hisobi',
                  productName: orderData.productName,
                  quantity: orderData.quantity,
                  totalAmount: orderData.totalAmount,
                  paidAmount: 0,
                  estimatedCost: orderData.estimatedCost,
                  status: 'jarayonda',
                  orderDate: new Date().toISOString().split('T')[0],
                  deliveryDate: new Date(Date.now() + 5*86400000).toISOString().split('T')[0],
                  technique: orderData.technique,
                });
                setActiveTab('orders');
              }}
            />
          )}
          {activeTab === 'cms_contact' && (
            <ContactCmsTab
              messages={cmsMessages}
              contactInfo={cmsContactInfo}
              onUpdateMessages={handleCmsMessagesUpdate}
              onUpdateContactInfo={handleCmsContactInfoUpdate}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'cms_portfolio' && (
            <PortfolioCmsTab
              projects={cmsPortfolioLang === 'ru' ? cmsPortfolioRu : cmsPortfolio}
              onUpdateProjects={handleCmsPortfolioUpdate(cmsPortfolioLang)}
              contentLang={cmsPortfolioLang}
              onContentLangChange={setCmsPortfolioLang}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'cms_beforeafter' && (cmsBeforeAfterLang === 'ru' ? cmsBeforeAfterRu : cmsBeforeAfter) && (
            <BeforeAfterCmsTab
              content={cmsBeforeAfterLang === 'ru' ? cmsBeforeAfterRu : cmsBeforeAfter}
              onUpdateContent={handleCmsSliderUpdate(cmsBeforeAfterLang)}
              contentLang={cmsBeforeAfterLang}
              onContentLangChange={setCmsBeforeAfterLang}
              showNotification={showNotification}
            />
          )}
        </div>
      </main>
    </div>
  );
};
