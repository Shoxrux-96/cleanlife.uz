export type TransactionType = 'kirim' | 'chiqim';

export type PaymentMethod = 'naqd' | 'bank_transfer' | 'payme_click';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  createdAt?: string;
  description: string;
  relatedClient?: string;
  relatedOrderId?: string;
}

export interface BomItem {
  materialId: string;
  materialName: string;
  quantityNeeded: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface ErpProduct {
  id: string;
  name: string;
  imageUrl?: string;      // Mahsulot logosi yoki rasmi (URL yoki Base64)
  category: 'kiyimlar' | 'stol' | 'qadoq' | 'aksessuar' | 'toqimachilik';
  sku: string;
  baseCost: number;       // bo'sh blanka/xom-ashyo qiymati (so'm)
  brandingCost: number;   // bosma/kashta xarajati (so'm)
  packagingCost: number;  // qadoqlash xarajati (so'm)
  laborCost: number;      // mehnat/uskuna amortizatsiyasi (so'm)
  sellingPrice: number;   // belgilangan sotuv narxi (so'm)
  minOrder: number;
  stockCount: number;     // ombordagi tayyor mahsulot
  soldCount: number;
  technique: string;
  specification: string;
  bom: BomItem[];         // Ishlab chiqarish retsepti (Bill of Materials)
  readyDate?: string;
  batchNumber?: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  batchNumber: string;    // Partiya raqami
  category: 'Mato & Blanklar' | 'Bo‘yoq & Kimyo' | 'Ip & Furnitura' | 'Qadoq & Karton' | 'Aksessuarlar' | string;
  unit: 'dona' | 'kg' | 'gr' | 'litr' | 'm' | 'pachka' | 'blok' | 'metr' | 'bobina' | 'rulon' | string;
  quantity: number;
  minThreshold: number;   // Minimal xavfsiz zaxira
  unitCost: number;       // 1 birlik sotib olingan narxi (so'm)
  supplier: string;
  counterparty?: string;  // Kontragent / Mijoz
  paymentMethod?: string; // To'lov usuli (Naqd pul, Bank o'tkazmasi, Karta / Korporativ, Nasiya / Muddatli to'lov)
  lastRestocked: string;  // Kirim qilingan sana va vaqt (YYYY-MM-DD HH:mm yoki ISO)
  storageLocation: string;// Ombordagi joylashuvi (masalan: "A-Seksiya, 2-Qator, 4-Polka")
  status: 'yetarli' | 'ogohlantirish' | 'kritik';
}

export type OrderStatus = 'jarayonda' | 'tayyorlandi' | 'jonatildi' | 'yetkazildi';

export interface ErpOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}

export interface ErpOrder {
  id: string;
  orderNumber: string;
  company?: string;
  clientName: string;
  phone: string;
  businessType: string;
  productName: string;
  items?: ErpOrderItem[];
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  estimatedCost: number;
  status: OrderStatus;
  orderDate: string;
  deliveryDate: string;
  technique: string;
  notes?: string;
  ttnNumber?: string;
  deliveredQuantity?: number;
}

export interface ErpClient {
  id: string;
  name: string;
  company: string;
  type?: 'B2B' | 'B2C' | string;
  phone: string;
  email?: string;
  source?: string;       // manba (Hodimlar, Instagram, Telegram, Sayt orqali, Ko‘rgazma/tadbir, Boshqa)
  employeeName?: string; // Hodim tanlanganda kiritilgan hodim ismi
  region?: string;       // viloyat (Toshkent shahri, Samarqand, ...)
  district?: string;     // tuman (Yunusobod, Chilonzor, ...)
  address: string;       // manzil (Ko'cha, uy/bino)
  location?: string;     // lokatsiya (Google Maps yoki Yandex Maps havolasi)
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  status: 'faol' | 'nofaol';
}

export type EmployeeStatus = 'active' | 'on_leave' | 'probation' | 'nofaol';
export interface Employee {
  id: string;
  fullName: string;
  position: string;
  phone: string;
  status: EmployeeStatus;
  salary: number;        // Oylik maosh stavkasi (so'm)
  joinDate: string;
  avatarColor?: string;
  avatar?: string;       // 3x4 rasm (base64 DataURL)
  username?: string;     // Tizimga kirish logini
  password?: string;     // Tizimga kirish paroli
  hasFaceId?: boolean;   // Face ID (WebAuthn) ro'yxatdan o'tganmi
}

export interface CompanyInfo {
  id: string;
  name: string;
  slogan: string;
  logo: string;
  location: string;
  address: string;
  owner: string;     // Korxona egasi F.I.SH
  manager: string;   // Boshqaruv hodimi F.I.SH
  phone: string;     // Asosiy telefon raqam
  phone2: string;    // Qo'shimcha telefon raqam
  email: string;     // Elektron pochta
  adminName: string;     // Tizim boshqaruvchi admin F.I.SH
  adminLogin: string;    // Admin logini
  adminPassword: string; // Admin paroli
  adminTitle: string;    // Admin unvoni (Bosh Admin...)
  adminPosition: string; // Admin lavozimi
  adminRole: string;     // Admin roli
  adminPhone: string;    // Admin telefoni
  lat: number | null;    // Xarita kengligi
  lng: number | null;    // Xarita uzunligi
  createdAt: string;
  updatedAt: string;
}

export type PayrollStatus = 'to_langan' | 'jarayonda' | 'kutilmoqda';

export type SalaryPayStatus = 'jarayonda' | 'tayyorlandi' | 'tolandi';

export interface SalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;          // YYYY-MM
  amount: number;
  status: SalaryPayStatus;
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSettings {
  id: string;
  workStartTime: string;  // "08:00:00"
  workEndTime: string;    // "18:00:00"
  graceMinutes: number;
  radiusM: number;        // metr
  workDays: string;       // "1,2,3,4,5" (1=Du ... 7=Ya)
  holidays: { date: string; name: string }[];
  updatedAt?: string;
}

export type AttendanceStatus = 'kelgan' | 'kechikkan';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;           // YYYY-MM-DD
  checkIn: string;        // HH:MM:SS
  lat?: number;
  lng?: number;
  distanceM?: number;
  method: string;
  facePhoto?: string;
  status: AttendanceStatus;
  createdAt?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  month: string;         // e.g. "Sentabr 2026"
  baseSalary: number;
  bonusAmount: number;
  deductions: number;    // Daromad solig'i yoki ushlanmalar
  netSalary: number;     // Qo'lga tegadigan summa
  status: PayrollStatus;
  paymentDate?: string;
}

export interface BonusRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  kpiType: 
    | 'Rejani ortigʻi bilan bajarish' 
    | 'Brak foizini kamaytirish' 
    | 'Tezkor sifatli yetkazish' 
    | 'Mehnat intizomi va tashabbus'
    | 'Mijoz topgani uchun';
  amount: number;
  date: string;
  status: 'tasdiqlangan' | 'kutilmoqda';
  notes: string;
}

export type DeliveryStatus = 'kutilmoqda' | 'yolda' | 'yetkazildi';

export interface DeliveryTrip {
  id: string;
  tripCode: string;
  driverName: string;
  driverPhone: string;
  vehicleModel: string;
  vehiclePlate: string;
  destinationAddress: string;
  clientName: string;
  orderNumber: string;
  cargoSummary: string;
  status: DeliveryStatus;
  departureTime?: string;
  estimatedArrival?: string;
  completedTime?: string;
  lat?: number;
  lng?: number;
  waybillId?: string;         // Bog'langan yuk xati (TTN) ID
  waybillTtnNumber?: string;  // Bog'langan yuk xati raqami
  deliveryFee?: number;       // Yukni yetkazib berish haqi (so'm, qo'lda kiritiladi)
  createdAt?: string;         // ReyS yaratilgan sana va vaqti (avtomatik)
  updatedBy?: string;         // Holatni o'zgartirgan shaxs (Admin / Haydovchi)
}

export interface WaybillItem {
  name: string;
  format?: string;            // Masalan: "132.5×65" yoki o'lchami
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type WaybillCategory = 'sotuv' | 'xarid';

export interface WaybillTTN {
  id: string;
  orderId?: string;           // Bog‘langan buyurtma ID
  orderNumber?: string;       // Bog‘langan buyurtma raqami
  customOrderId?: string;     // Chekkadagi maxsus buyurtma ID (tanlangan yoki yozilgan)
  ttnNumber: string;          // Masalan: "TTN-2026-0924"
  category?: WaybillCategory; // 'sotuv' (sotuv / mahsulot chiqimi) yoki 'xarid' (xarid / omborga kirim)
  senderCompany: string;      // Masalan: "Shovot Carton"
  senderPhone?: string;       // Masalan: "+998 99 505 40 04"
  senderAddress: string;
  receiverCompany: string;    // Masalan: "Yevro teks mchj"
  receiverPhone: string;      // Masalan: "+998 99 964 96 95"
  receiverAddress: string;
  driverName?: string;
  driverLicense?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  items: WaybillItem[];
  totalSum: number;
  issueDate: string;
  issueTime?: string;         // Masalan: "14:30"
  status: 'kutilmoqda' | 'yo_lda' | 'yetkazildi';
  routeFrom?: string;
  routeTo?: string;
  responsibleShipper?: string; // Mas'ul jo'natuvchi
  sealNumber?: string;
}

export interface CalculationResult {
  productName: string;
  quantity: number;
  unitBaseCost: number;
  unitBrandingCost: number;
  unitPackagingCost: number;
  unitTotalCost: number;
  totalOrderCost: number;
  recommendedUnitPrice: number;
  totalOrderRevenue: number;
  grossProfit: number;
  profitMarginPercent: number;
  requiredMaterials: {
    name: string;
    amountNeeded: number;
    unit: string;
    totalCost: number;
  }[];
}
