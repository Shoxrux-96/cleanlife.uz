import { QuoteRequest, ContactMessage, PublicContactInfo, PortfolioProject, BeforeAfterContent } from '../types';
import { PORTFOLIO_PROJECTS } from './content';
import { PORTFOLIO_PROJECTS_RU } from './content_ru';
import type { SiteLang } from '../i18n/index';

export const INITIAL_CONTACT_INFO: PublicContactInfo = {
  phone1: '+998 (71) 200-00-99',
  phone2: '+998 (90) 800-00-99',
  email: 'info@cleanlife.uz',
  telegram: '@brendor_horeca',
  instagram: '@cleanlife.uz',
  address: 'Toshkent sh., Yakkasaroy t., Bobur ko‘chasi, 44-uy',
  address_ru: 'г. Ташкент, Яккасарайский р-н, ул. Бобура, 44',
  workingHours: 'Dushanba — Shanba: 09:00 - 19:00',
  workingHours_ru: 'Понедельник — Суббота: 09:00 - 19:00'
};

export const INITIAL_QUOTES: QuoteRequest[] = [
  {
    id: 'quote-101',
    fullName: 'Javohir Ergashev',
    phone: '+998 (90) 123-45-67',
    businessName: 'Chustiy Restaurant',
    businessType: 'Restoran',
    selectedProducts: ['Nam salfetka', 'Tish kavlagich qutisi', 'Fartuk'],
    quantityRange: '500-1000 dona',
    notes: 'Yangi milliy restoran ochilyapti. Oltin va qora rangdagi logo tushirish kerak.',
    status: 'yangi',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'quote-102',
    fullName: 'Kamola Rustamova',
    phone: '+998 (97) 765-43-21',
    businessName: 'Bon Appetit Coffee',
    businessType: 'Coffee Shop',
    selectedProducts: ['Nam salfetka', 'Qadoqlash', 'Ofitsiant kiyimi'],
    quantityRange: '100-300 dona',
    notes: 'Qahvaxona uchun barista fartuklari va kofe stakan g‘iloflari kerak.',
    status: 'boglanildi',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'quote-103',
    fullName: 'Nodirbek Alimov',
    phone: '+998 (93) 555-88-99',
    businessName: 'Rayhon Milliy Taomlar',
    businessType: 'Choyxona',
    selectedProducts: ['Fartuk', 'T-shirt / Polo', 'Do‘ppi / bosh kiyim'],
    quantityRange: '50-100 dona',
    notes: 'Xodimlar uchun to‘q ko‘k rangli do‘ppi va pololar.',
    status: 'taklif_yuborildi',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export const INITIAL_CONTACT_MESSAGES: ContactMessage[] = [
  {
    id: 'msg-201',
    name: 'Sardor Qodirov',
    phone: '+998 (91) 987-65-43',
    message: 'Assalomu alaykum! Fartuk va pololarga kashta bosish narxlari bo‘yicha namuna ko‘rsata olasizmi?',
    status: 'yangi',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'msg-202',
    name: 'Malika Karimova',
    phone: '+998 (90) 333-22-11',
    message: 'Bizning pitseriyamiz uchun quti va nam salfetkalar tayyorlash muddatlari qancha?',
    status: 'oqildi',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
  }
];

// Helper to get portfolio projects (seeded with initial PORTFOLIO_PROJECTS, per language)
export const getStoredPortfolio = (lang: SiteLang = 'uz'): PortfolioProject[] => {
  const key = lang === 'ru' ? 'brendor_portfolio_projects_ru' : 'brendor_portfolio_projects';
  const seed = lang === 'ru' ? PORTFOLIO_PROJECTS_RU : PORTFOLIO_PROJECTS;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  // Initialize with isPublished = true for existing projects
  const initial = seed.map(p => ({
    ...p,
    isPublished: p.isPublished ?? true,
    publishedAt: p.publishedAt ?? '2024-01-15'
  }));
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
};

// Helper to get quote requests
export const getStoredQuotes = (): QuoteRequest[] => {
  try {
    const saved = localStorage.getItem('brendor_quote_requests');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem('brendor_quote_requests', JSON.stringify(INITIAL_QUOTES));
  return INITIAL_QUOTES;
};

// Helper to get contact messages
export const getStoredContactMessages = (): ContactMessage[] => {
  try {
    const saved = localStorage.getItem('brendor_contact_messages');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem('brendor_contact_messages', JSON.stringify(INITIAL_CONTACT_MESSAGES));
  return INITIAL_CONTACT_MESSAGES;
};

// Helper to get contact info
export const getStoredContactInfo = (): PublicContactInfo => {
  try {
    const saved = localStorage.getItem('brendor_contact_info');
    if (saved) return { email: INITIAL_CONTACT_INFO.email, ...JSON.parse(saved) };
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem('brendor_contact_info', JSON.stringify(INITIAL_CONTACT_INFO));
  return INITIAL_CONTACT_INFO;
};

export const INITIAL_BEFORE_AFTER: BeforeAfterContent = {
  badge: 'Taqqoslash slayderi — Real natija',
  title: 'Oddiy mahsulot → Brend mahsuloti',
  description: 'Slayderni chapga-o‘ngga surib, oddiy buyum qanday qilib restoran nufuzini ko‘rsatuvchi real brend elementiga aylanishini bevosita taqqoslang.',
  bottomNote: 'Barcha mahsulotlar real restoran muhitida sinovdan o‘tgan va yuqori sifatli texnologiyada brendlangan.',
  pairs: {
    wetwipe: {
      label: 'Nam salfetka',
      before: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Oddiy oq sachet (Brendsiz, standart)',
      afterCaption: 'Matte qora sachet + Oltin folgali restoran logotipi',
    },
    apron: {
      label: 'Oshpaz fartugi',
      before: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Oddiy tekis fartuk (Korporativ belgisiz)',
      afterCaption: 'Qalin kanvas fartuk + Charm tasmalar + Oltin kashta',
    },
    toothpick: {
      label: 'Tish kavlagich',
      before: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Stol ustidagi brendsiz oddiy quti',
      afterCaption: 'Zich qora karton quti + UV-lak + Restoran monogrammasi',
    },
    polo: {
      label: 'Xodim polosi',
      before: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Oddiy kiyim (Xodim va mijoz farqlanmaydi)',
      afterCaption: '100% paxta piqué polo + Chap ko‘krakda nafis kashta',
    },
  }
};

export const INITIAL_BEFORE_AFTER_RU: BeforeAfterContent = {
  badge: 'Слайдер сравнения — реальный результат',
  title: 'Обычный продукт → Брендированный продукт',
  description: 'Двигайте слайдер влево-вправо и напрямую сравнивайте, как обычный предмет превращается в реальный бренд-элемент, отражающий статус ресторана.',
  bottomNote: 'Вся продукция протестирована в реальной ресторанной среде и забрендирована по высококачественной технологии.',
  pairs: {
    wetwipe: {
      label: 'Влажная салфетка',
      before: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Обычное белое саше (без бренда, стандарт)',
      afterCaption: 'Матовое чёрное саше + логотип ресторана золотой фольгой',
    },
    apron: {
      label: 'Фартук повара',
      before: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Обычный ровный фартук (без корпоративного знака)',
      afterCaption: 'Плотный канвасовый фартук + кожаные лямки + золотая вышивка',
    },
    toothpick: {
      label: 'Зубочистка',
      before: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Обычная коробочка без бренда на столе',
      afterCaption: 'Плотная чёрная картонная коробка + УФ-лак + монограмма ресторана',
    },
    polo: {
      label: 'Поло персонала',
      before: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      after: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80',
      beforeCaption: 'Обычная одежда (персонал и гость не различаются)',
      afterCaption: '100% хлопковое поло пике + изящная вышивка на левой груди',
    },
  }
};

// Helper to get before/after slider content (per language)
export const getStoredBeforeAfter = (lang: SiteLang = 'uz'): BeforeAfterContent => {
  const key = lang === 'ru' ? 'brendor_before_after_ru' : 'brendor_before_after';
  const seed = lang === 'ru' ? INITIAL_BEFORE_AFTER_RU : INITIAL_BEFORE_AFTER;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...seed, ...parsed, pairs: { ...seed.pairs, ...(parsed.pairs || {}) } };
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
};

// Event dispatcher for cross-component live sync
export const notifyCmsUpdated = (key: 'portfolio' | 'quotes' | 'messages' | 'contact_info' | 'before_after') => {
  window.dispatchEvent(new CustomEvent('brendor_cms_updated', { detail: { key } }));
};
