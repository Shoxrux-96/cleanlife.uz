export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  tag: string;
  features: string[];
  materials: string[];
  techniques: string[];
  mockupType: 'wetwipe' | 'toothpick' | 'staff' | 'chef' | 'waiter' | 'packaging';
  realPhotoUrl: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category: 'kiyimlar' | 'stol' | 'qadoq' | 'promo';
  description: string;
  suitableFor: string;
  printMethods: string[];
  minOrder: string;
  leadTime: string;
  popular?: boolean;
  imageUrl: string;
  realPhotoCaption: string;
}

export interface PortfolioProject {
  id: string;
  dbId?: number;
  clientName: string;
  businessType: 'Restoran' | 'Kafe' | 'Choyxona' | 'Fast Food' | 'Coffee Shop' | 'Catering';
  location: string;
  tagline: string;
  story: string;
  logoTheme: {
    name: string;
    subtext: string;
    primaryColor: string;
    accentColor: string;
    textColor: string;
    symbol: string;
  };
  brandedItems: {
    title: string;
    itemType: 'wetwipe' | 'toothpick' | 'apron' | 'polo' | 'packaging' | 'cap';
    detail: string;
    technique: string;
  }[];
  realPhotoUrl?: string;
  realPhotoCaption?: string;
  isPublished?: boolean;
  publishedAt?: string;
}

export type QuoteStatus = 'yangi' | 'boglanildi' | 'taklif_yuborildi' | 'shartnoma' | 'rad_etildi';

export interface QuoteRequest {
  id: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessType: string;
  selectedProducts: string[];
  quantityRange: string;
  notes?: string;
  logoFile?: string | null;
  logoFileName?: string;
  status: QuoteStatus;
  createdAt: string;
}

export type ContactMessageStatus = 'yangi' | 'oqildi' | 'javob_berildi';

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  dbId?: number;
}

export interface PublicContactInfo {
  phone1: string;
  phone2: string;
  phone3?: string;
  email: string;
  telegram: string;
  instagram: string;
  address: string;
  address_ru?: string;
  workingHours: string;
  workingHours_ru?: string;
}

export type BeforeAfterItemId = 'wetwipe' | 'apron' | 'toothpick' | 'polo';

export interface BeforeAfterPair {
  label: string;
  before: string;
  after: string;
  beforeCaption: string;
  afterCaption: string;
}

export interface BeforeAfterContent {
  badge: string;
  title: string;
  description: string;
  bottomNote: string;
  pairs: Record<BeforeAfterItemId, BeforeAfterPair>;
}

export interface BrandingPackage {
  id: string;
  title: string;
  badge?: string;
  subtitle: string;
  recommendedFor: string;
  items: string[];
  benefits: string[];
  turnaround: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}
