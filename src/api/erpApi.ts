import type {
  FinancialTransaction, ErpProduct, RawMaterial, ErpOrder,
  ErpClient, Employee, PayrollRecord, BonusRecord, DeliveryTrip, WaybillTTN,
  CompanyInfo, AttendanceRecord, AttendanceSettings, SalaryPayment,
} from '../types/erp';
import type { ContactMessage } from '../types';

// Backend bazasini aniqlash:
//  1) VITE_API_BASE env berilgan bo'lsa — shu.
//  2) localhost / 127.0.0.1 da ochilgan bo'lsa — http://localhost:8000/api.
//  3) Aks holda — ochilgan hostning 8000-portidagi backend (bir xil LAN).
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : `${window.location.protocol}//${window.location.hostname}:8000/api`);

// Login paytida saqlangan token. Server har bir himoyalangan so'rovda talab qiladi.
const TOKEN_KEY = 'brendor_auth_token';
export const authTokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(t: string) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  const tok = authTokenStore.get();
  if (tok && !headers.Authorization) headers.Authorization = `Token ${tok}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // 401 → token yaroqsiz, mijozni login'ga qaytarish
  if (res.status === 401) {
    authTokenStore.clear();
    try {
      // Reload sahifasi — AppContext login screenga olib boradi
      if (!path.endsWith('/auth/login/')) window.location.reload();
    } catch { /* ignore */ }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = (err as { detail?: string }).detail;
    const fieldErrors = Object.entries(err as Record<string, unknown>)
      .filter(([k]) => k !== 'detail')
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      .join('; ');
    const error = new Error(detail || fieldErrors || `API xatosi: ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  // 204 No Content - body yo'q, JSON parse qilmaslik kerak
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

async function listAll<T>(path: string): Promise<T[]> {
  const data = await apiFetch<{ results: T[] }>(`${path}?page_size=1000`);
  return data.results;
}

// --- Backend (snake_case) → Frontend (camelCase) mapping ---

const mapTx = (t: Record<string, unknown>): FinancialTransaction => ({
  id: String(t.id),
  type: t.type as FinancialTransaction['type'],
  category: (t.category as string) || '',
  amount: Number(t.amount) || 0,
  paymentMethod: (t.payment_method as FinancialTransaction['paymentMethod']) || 'naqd',
  date: (t.date as string) || '',
  createdAt: (t.created_at as string) || undefined,
  description: (t.description as string) || '',
  relatedClient: (t.related_client as string) || undefined,
  relatedOrderId: t.related_order_id ? String(t.related_order_id) : undefined,
});

const mapMaterial = (m: Record<string, unknown>): RawMaterial => ({
  id: String(m.id),
  name: (m.name as string) || '',
  batchNumber: (m.batch_number as string) || '',
  category: (m.category as string) || '',
  unit: (m.unit as RawMaterial['unit']) || 'dona',
  quantity: Number(m.quantity) || 0,
  minThreshold: Number(m.min_threshold) || 0,
  unitCost: Number(m.unit_cost) || 0,
  supplier: (m.supplier as string) || '',
  counterparty: (m.counterparty as string) || undefined,
  paymentMethod: (m.payment_method as string) || undefined,
  lastRestocked: (m.last_restocked as string) || '',
  storageLocation: (m.storage_location as string) || '',
  status: (m.status as RawMaterial['status']) || 'yetarli',
});

const mapProduct = (p: Record<string, unknown>): ErpProduct => ({
  id: String(p.id),
  name: (p.name as string) || '',
  imageUrl: (p.image_url as string) || undefined,
  category: (p.category as ErpProduct['category']) || 'qadoq',
  sku: (p.sku as string) || '',
  baseCost: Number(p.base_cost) || 0,
  brandingCost: Number(p.branding_cost) || 0,
  packagingCost: Number(p.packaging_cost) || 0,
  laborCost: Number(p.labor_cost) || 0,
  sellingPrice: Number(p.selling_price) || 0,
  minOrder: Number(p.min_order) || 1,
  stockCount: Number(p.stock_count) || 0,
  soldCount: Number(p.sold_count) || 0,
  technique: (p.technique as string) || '',
  specification: (p.specification as string) || '',
  readyDate: (p.ready_date as string) || undefined,
  batchNumber: (p.batch_number as string) || '',
  bom: ((p.bom as Record<string, unknown>[]) || []).map(b => ({
    materialId: b.material_id ? String(b.material_id) : '',
    materialName: (b.material_name as string) || '',
    quantityNeeded: Number(b.quantity_needed) || 0,
    unit: (b.unit as string) || 'dona',
    unitCost: Number(b.unit_cost) || 0,
    totalCost: Number(b.total_cost) || 0,
  })),
});

const mapOrder = (o: Record<string, unknown>): ErpOrder => ({
  id: String(o.id),
  orderNumber: (o.order_number as string) || '',
  company: (o.company as string) || undefined,
  clientName: (o.client_name as string) || '',
  phone: (o.phone as string) || '',
  businessType: (o.business_type as string) || '',
  productName: (o.product_name as string) || '',
  items: ((o.items as Record<string, unknown>[]) || []).map(i => ({
    id: i.id ? String(i.id) : undefined,
    productId: i.product_id ? String(i.product_id) : undefined,
    productName: (i.product_name as string) || '',
    quantity: Number(i.quantity) || 0,
    unitPrice: Number(i.unit_price) || 0,
    totalPrice: Number(i.total_price) || 0,
  })),
  quantity: Number(o.quantity) || 0,
  totalAmount: Number(o.total_amount) || 0,
  paidAmount: Number(o.paid_amount) || 0,
  estimatedCost: Number(o.estimated_cost) || 0,
  status: (o.status as ErpOrder['status']) || 'jarayonda',
  orderDate: (o.order_date as string) || '',
  deliveryDate: (o.delivery_date as string) || '',
  technique: (o.technique as string) || '',
  notes: (o.notes as string) || undefined,
  ttnNumber: (o.ttn_number as string) || undefined,
  deliveredQuantity: Number(o.delivered_quantity) || 0,
});

const mapClient = (c: Record<string, unknown>): ErpClient => ({
  id: String(c.id),
  name: (c.name as string) || '',
  company: (c.company as string) || '',
  type: (c.type as ErpClient['type']) || 'B2B',
  phone: (c.phone as string) || '',
  email: (c.email as string) || undefined,
  source: (c.source as string) || undefined,
  employeeName: (c.employee_name as string) || undefined,
  region: (c.region as string) || undefined,
  district: (c.district as string) || undefined,
  address: (c.address as string) || '',
  location: (c.location as string) || undefined,
  totalOrders: Number(c.total_orders) || 0,
  totalSpent: Number(c.total_spent) || 0,
  lastOrderDate: (c.last_order_date as string) || '',
  status: (c.status as ErpClient['status']) || 'faol',
});

const mapEmployee = (e: Record<string, unknown>): Employee => ({
  id: String(e.id),
  fullName: (e.full_name as string) || '',
  position: (e.position as string) || '',
  phone: (e.phone as string) || '',
  status: (e.status as Employee['status']) || 'active',
  salary: Number(e.salary) || 0,
  joinDate: (e.join_date as string) || '',
  avatarColor: (e.avatar_color as string) || undefined,
  avatar: (e.avatar as string) || undefined,
  username: (e.username as string) || undefined,
  password: (e.password as string) || undefined,
  hasFaceId: Boolean(e.has_face_id),
});

const mapAttendanceSettings = (s: Record<string, unknown>): AttendanceSettings => ({
  id: String(s.id),
  workStartTime: (s.work_start_time as string) || '08:00:00',
  workEndTime: (s.work_end_time as string) || '18:00:00',
  graceMinutes: Number(s.grace_minutes ?? 15),
  radiusM: Number(s.radius_m ?? 25),
  workDays: (s.work_days as string) || '1,2,3,4,5',
  holidays: (s.holidays as AttendanceSettings['holidays']) || [],
  updatedAt: (s.updated_at as string) || undefined,
});

const mapAttendance = (a: Record<string, unknown>): AttendanceRecord => ({
  id: String(a.id),
  employeeId: a.employee_id ? String(a.employee_id) : '',
  employeeName: (a.employee_name as string) || '',
  date: (a.date as string) || '',
  checkIn: (a.check_in as string) || '',
  lat: a.lat != null ? Number(a.lat) : undefined,
  lng: a.lng != null ? Number(a.lng) : undefined,
  distanceM: a.distance_m != null ? Number(a.distance_m) : undefined,
  method: (a.method as string) || 'face_id',
  facePhoto: (a.face_photo as string) || undefined,
  status: (a.status as AttendanceRecord['status']) || 'kelgan',
  createdAt: (a.created_at as string) || undefined,
});

const mapSalaryPayment = (p: Record<string, unknown>): SalaryPayment => ({
  id: String(p.id),
  employeeId: p.employee_id ? String(p.employee_id) : '',
  employeeName: (p.employee_name as string) || '',
  month: (p.month as string) || '',
  amount: Number(p.amount) || 0,
  status: (p.status as SalaryPayment['status']) || 'jarayonda',
  transactionId: p.transaction_id ? String(p.transaction_id) : undefined,
  createdAt: (p.created_at as string) || undefined,
  updatedAt: (p.updated_at as string) || undefined,
});

const mapPayroll = (p: Record<string, unknown>): PayrollRecord => ({
  id: String(p.id),
  employeeId: p.employee_id ? String(p.employee_id) : '',
  employeeName: (p.employee_name as string) || '',
  position: (p.position as string) || '',
  department: (p.department as string) || '',
  month: (p.month as string) || '',
  baseSalary: Number(p.base_salary) || 0,
  bonusAmount: Number(p.bonus_amount) || 0,
  deductions: Number(p.deductions) || 0,
  netSalary: Number(p.net_salary) || 0,
  status: (p.status as PayrollRecord['status']) || 'kutilmoqda',
  paymentDate: (p.payment_date as string) || undefined,
});

const mapBonus = (b: Record<string, unknown>): BonusRecord => ({
  id: String(b.id),
  employeeId: b.employee_id ? String(b.employee_id) : '',
  employeeName: (b.employee_name as string) || '',
  kpiType: (b.kpi_type as BonusRecord['kpiType']) || 'Mehnat intizomi va tashabbus',
  amount: Number(b.amount) || 0,
  date: (b.date as string) || '',
  status: (b.status as BonusRecord['status']) || 'kutilmoqda',
  notes: (b.notes as string) || '',
});

const mapWaybill = (w: Record<string, unknown>): WaybillTTN => ({
  id: String(w.id),
  orderId: w.order_id ? String(w.order_id) : undefined,
  orderNumber: (w.order_number as string) || '',
  customOrderId: (w.custom_order_id as string) || undefined,
  ttnNumber: (w.ttn_number as string) || '',
  category: (w.category as WaybillTTN['category']) || 'sotuv',
  senderCompany: (w.sender_company as string) || '',
  senderPhone: (w.sender_phone as string) || undefined,
  senderAddress: (w.sender_address as string) || '',
  receiverCompany: (w.receiver_company as string) || '',
  receiverPhone: (w.receiver_phone as string) || '',
  receiverAddress: (w.receiver_address as string) || '',
  driverName: (w.driver_name as string) || undefined,
  driverLicense: (w.driver_license as string) || undefined,
  vehiclePlate: (w.vehicle_plate as string) || undefined,
  vehicleModel: (w.vehicle_model as string) || undefined,
  items: ((w.items as Record<string, unknown>[]) || []).map(i => ({
    name: (i.name as string) || '',
    format: (i.format as string) || undefined,
    unit: (i.unit as string) || 'dona',
    quantity: Number(i.quantity) || 0,
    unitPrice: Number(i.unit_price) || 0,
    totalPrice: Number(i.total_price) || 0,
  })),
  totalSum: Number(w.total_sum) || 0,
  issueDate: (w.issue_date as string) || '',
  issueTime: (w.issue_time as string) || undefined,
  status: (w.status as WaybillTTN['status']) || 'kutilmoqda',
  routeFrom: (w.route_from as string) || undefined,
  routeTo: (w.route_to as string) || undefined,
  responsibleShipper: (w.responsible_shipper as string) || undefined,
  sealNumber: (w.seal_number as string) || undefined,
});

const mapTrip = (t: Record<string, unknown>): DeliveryTrip => ({
  id: String(t.id),
  tripCode: (t.trip_code as string) || '',
  driverName: (t.driver_name as string) || '',
  driverPhone: (t.driver_phone as string) || '',
  vehicleModel: (t.vehicle_model as string) || '',
  vehiclePlate: (t.vehicle_plate as string) || '',
  destinationAddress: (t.destination_address as string) || '',
  clientName: (t.client_name as string) || '',
  orderNumber: (t.order_number as string) || '',
  cargoSummary: (t.cargo_summary as string) || '',
  status: (t.status as DeliveryTrip['status']) || 'kutilmoqda',
  departureTime: (t.departure_time as string) || undefined,
  estimatedArrival: (t.estimated_arrival as string) || undefined,
  completedTime: (t.completed_time as string) || undefined,
  lat: t.lat ? Number(t.lat) : undefined,
  lng: t.lng ? Number(t.lng) : undefined,
  waybillId: t.waybill_id ? String(t.waybill_id) : undefined,
  waybillTtnNumber: (t.waybill_ttn_number as string) || undefined,
  deliveryFee: t.delivery_fee ? Number(t.delivery_fee) : undefined,
  createdAt: (t.created_at as string) || undefined,
  updatedBy: (t.updated_by as string) || undefined,
});

const mapCompany = (c: Record<string, unknown>): CompanyInfo => ({
  id: String(c.id),
  name: (c.name as string) || 'Clean Life',
  slogan: (c.slogan as string) || 'Professional HoReCa Brending va Logo Joylashtirish',
  logo: (c.logo as string) || 'B',
  location: (c.location as string) || 'Toshkent sh., Chilonzor sanoat hududi',
  address: (c.address as string) || 'Toshkent sh., Chilonzor tumani, 12-mavze, 45-uy',
  owner: (c.owner as string) || '',
  manager: (c.manager as string) || '',
  phone: (c.phone as string) || '',
  phone2: (c.phone2 as string) || '',
  email: (c.email as string) || '',
  adminName: (c.admin_name as string) || '',
  adminLogin: (c.admin_login as string) || '',
  adminPassword: (c.admin_password as string) || '',
  adminTitle: (c.admin_title as string) || 'Bosh Admin (Super Administrator)',
  adminPosition: (c.admin_position as string) || 'Boshqaruvchi direktor',
  adminRole: (c.admin_role as string) || 'To‘liq boshqaruv (Admin)',
  adminPhone: (c.admin_phone as string) || '',
  lat: c.lat != null ? Number(c.lat) : null,
  lng: c.lng != null ? Number(c.lng) : null,
  createdAt: (c.created_at as string) || '',
  updatedAt: (c.updated_at as string) || '',
});

// --- Frontend (camelCase) → Backend (snake_case) mapping ---

const toSnake = {
  transaction: (b: Record<string, unknown>) => ({
    type: b.type, category: b.category, amount: b.amount,
    payment_method: b.paymentMethod, date: b.date, description: b.description,
    related_client: b.relatedClient, related_order_id: b.relatedOrderId,
  }),
  material: (b: Record<string, unknown>) => ({
    name: b.name, batch_number: b.batchNumber, category: b.category,
    unit: b.unit, quantity: b.quantity, min_threshold: b.minThreshold,
    unit_cost: b.unitCost, supplier: b.supplier, counterparty: b.counterparty,
    payment_method: b.paymentMethod, last_restocked: b.lastRestocked,
    storage_location: b.storageLocation, status: b.status,
  }),
  product: (b: Record<string, unknown>) => ({
    name: b.name, image_url: b.imageUrl, category: b.category, sku: b.sku,
    base_cost: b.baseCost, branding_cost: b.brandingCost,
    packaging_cost: b.packagingCost, labor_cost: b.laborCost,
    selling_price: b.sellingPrice, min_order: b.minOrder,
    stock_count: b.stockCount, sold_count: b.soldCount,
    technique: b.technique, specification: b.specification,
    ready_date: b.readyDate, batch_number: b.batchNumber,
    bom: ((b.bom as Record<string, unknown>[]) || []).map((i: Record<string, unknown>) => ({
      material_id: i.materialId, material_name: i.materialName,
      quantity_needed: i.quantityNeeded, unit: i.unit,
      unit_cost: i.unitCost, total_cost: i.totalCost,
    })),
  }),
  order: (b: Record<string, unknown>) => ({
    order_number: b.orderNumber, company: b.company, client_name: b.clientName,
    phone: b.phone, business_type: b.businessType, product_name: b.productName,
    items: ((b.items as Record<string, unknown>[]) || []).map((i: Record<string, unknown>) => ({
      product_id: i.productId, product_name: i.productName,
      quantity: i.quantity, unit_price: i.unitPrice, total_price: i.totalPrice,
    })),
    quantity: b.quantity, total_amount: b.totalAmount,
    paid_amount: b.paidAmount, estimated_cost: b.estimatedCost,
    status: b.status, order_date: b.orderDate, delivery_date: b.deliveryDate,
    technique: b.technique, notes: b.notes,
  }),
  client: (b: Record<string, unknown>) => ({
    name: b.name, company: b.company, type: b.type, phone: b.phone,
    email: b.email, source: b.source, employee_name: b.employeeName,
    region: b.region, district: b.district, address: b.address,
    location: b.location, total_orders: b.totalOrders,
    total_spent: b.totalSpent, last_order_date: b.lastOrderDate, status: b.status,
  }),
  employee: (b: Record<string, unknown>) => ({
    full_name: b.fullName, position: b.position,
    phone: b.phone, status: b.status, salary: b.salary,
    join_date: b.joinDate, avatar_color: b.avatarColor,
    avatar: b.avatar, username: b.username, password: b.password,
  }),
  attendanceSettings: (b: Record<string, unknown>) => ({
    work_start_time: (b.workStartTime as string)?.slice(0, 5) || b.workStartTime,
    work_end_time: (b.workEndTime as string)?.slice(0, 5) || b.workEndTime,
    grace_minutes: b.graceMinutes, radius_m: b.radiusM,
    work_days: b.workDays, holidays: b.holidays,
  }),
  payroll: (b: Record<string, unknown>) => ({
    employee_id: b.employeeId, employee_name: b.employeeName,
    position: b.position, department: b.department, month: b.month,
    base_salary: b.baseSalary, bonus_amount: b.bonusAmount,
    deductions: b.deductions, net_salary: b.netSalary,
    status: b.status, payment_date: b.paymentDate,
  }),
  bonus: (b: Record<string, unknown>) => ({
    employee_id: b.employeeId, employee_name: b.employeeName,
    kpi_type: b.kpiType, amount: b.amount, date: b.date,
    status: b.status, notes: b.notes,
  }),
  waybill: (b: Record<string, unknown>) => ({
    order_id: b.orderId, order_number: b.orderNumber,
    custom_order_id: b.customOrderId, ttn_number: b.ttnNumber,
    category: b.category, sender_company: b.senderCompany,
    sender_phone: b.senderPhone, sender_address: b.senderAddress,
    receiver_company: b.receiverCompany, receiver_phone: b.receiverPhone,
    receiver_address: b.receiverAddress, driver_name: b.driverName,
    driver_license: b.driverLicense, vehicle_plate: b.vehiclePlate,
    vehicle_model: b.vehicleModel,
    items: ((b.items as Record<string, unknown>[]) || []).map((i: Record<string, unknown>) => ({
      name: i.name, format: i.format, unit: i.unit,
      quantity: i.quantity, unit_price: i.unitPrice, total_price: i.totalPrice,
    })),
    total_sum: b.totalSum, issue_date: b.issueDate, issue_time: b.issueTime,
    status: b.status, route_from: b.routeFrom, route_to: b.routeTo,
    responsible_shipper: b.responsibleShipper, seal_number: b.sealNumber,
  }),
  trip: (b: Record<string, unknown>) => ({
    trip_code: b.tripCode, driver_name: b.driverName,
    driver_phone: b.driverPhone, vehicle_model: b.vehicleModel,
    vehicle_plate: b.vehiclePlate, destination_address: b.destinationAddress,
    client_name: b.clientName, order_number: b.orderNumber,
    cargo_summary: b.cargoSummary, status: b.status,
    departure_time: b.departureTime, estimated_arrival: b.estimatedArrival,
    lat: b.lat, lng: b.lng, waybill_id: b.waybillId,
    delivery_fee: b.deliveryFee,
  }),
  companyInfo: (b: Record<string, unknown>) => ({
    name: b.name, slogan: b.slogan, logo: b.logo,
    location: b.location, address: b.address,
    owner: b.owner, manager: b.manager, phone: b.phone,
    phone2: b.phone2, email: b.email,
    admin_name: b.adminName, admin_login: b.adminLogin, admin_password: b.adminPassword,
    admin_title: b.adminTitle, admin_position: b.adminPosition, admin_role: b.adminRole,
    admin_phone: b.adminPhone, lat: b.lat, lng: b.lng,
  }),
};

export const erpApi = {
  rawFetch: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, options),
  transactions: {
    list: () => listAll<Record<string, unknown>>('/transactions/').then(r => r.map(mapTx)),
    create: (body: Omit<FinancialTransaction, 'id'>) =>
      apiFetch<Record<string, unknown>>('/transactions/', { method: 'POST', body: JSON.stringify(toSnake.transaction(body)) }).then(mapTx),
    update: (id: string, body: Partial<FinancialTransaction>) =>
      apiFetch<Record<string, unknown>>(`/transactions/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.transaction(body)) }).then(mapTx),
    remove: (id: string) => apiFetch<void>(`/transactions/${id}/`, { method: 'DELETE' }),
  },
  materials: {
    list: () => listAll<Record<string, unknown>>('/materials/').then(r => r.map(mapMaterial)),
    create: (body: Omit<RawMaterial, 'id'>) =>
      apiFetch<Record<string, unknown>>('/materials/', { method: 'POST', body: JSON.stringify(toSnake.material(body)) }).then(mapMaterial),
    update: (id: string, body: Partial<RawMaterial>) =>
      apiFetch<Record<string, unknown>>(`/materials/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.material(body)) }).then(mapMaterial),
    remove: (id: string) => apiFetch<void>(`/materials/${id}/`, { method: 'DELETE' }),
  },
  products: {
    list: () => listAll<Record<string, unknown>>('/products/').then(r => r.map(mapProduct)),
    create: (body: Omit<ErpProduct, 'id'>) =>
      apiFetch<Record<string, unknown>>('/products/', { method: 'POST', body: JSON.stringify(toSnake.product(body)) }).then(mapProduct),
    update: (id: string, body: Partial<ErpProduct>) =>
      apiFetch<Record<string, unknown>>(`/products/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.product(body)) }).then(mapProduct),
    remove: (id: string) => apiFetch<void>(`/products/${id}/`, { method: 'DELETE' }),
  },
  orders: {
    list: () => listAll<Record<string, unknown>>('/orders/').then(r => r.map(mapOrder)),
    create: (body: Omit<ErpOrder, 'id' | 'orderNumber'>) =>
      apiFetch<Record<string, unknown>>('/orders/', { method: 'POST', body: JSON.stringify(toSnake.order(body)) }).then(mapOrder),
    update: (id: string, body: Partial<ErpOrder>) =>
      apiFetch<Record<string, unknown>>(`/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.order(body)) }).then(mapOrder),
    remove: (id: string) => apiFetch<void>(`/orders/${id}/`, { method: 'DELETE' }),
    changeStatus: (id: string, status: ErpOrder['status']) =>
      apiFetch<Record<string, unknown>>(`/orders/${id}/status/`, { method: 'POST', body: JSON.stringify({ status }) }).then(mapOrder),
  },
  clients: {
    list: () => listAll<Record<string, unknown>>('/clients/').then(r => r.map(mapClient)),
    create: (body: Omit<ErpClient, 'id'>) =>
      apiFetch<Record<string, unknown>>('/clients/', { method: 'POST', body: JSON.stringify(toSnake.client(body)) }).then(mapClient),
    update: (id: string, body: Partial<ErpClient>) =>
      apiFetch<Record<string, unknown>>(`/clients/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.client(body)) }).then(mapClient),
    remove: (id: string) => apiFetch<void>(`/clients/${id}/`, { method: 'DELETE' }),
  },
  employees: {
    list: () => listAll<Record<string, unknown>>('/employees/').then(r => r.map(mapEmployee)),
    create: (body: Omit<Employee, 'id'>) =>
      apiFetch<Record<string, unknown>>('/employees/', { method: 'POST', body: JSON.stringify(toSnake.employee(body)) }).then(mapEmployee),
    update: (id: string, body: Partial<Employee>) =>
      apiFetch<Record<string, unknown>>(`/employees/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.employee(body)) }).then(mapEmployee),
    remove: (id: string) => apiFetch<void>(`/employees/${id}/`, { method: 'DELETE' }),
    webauthnRegisterOptions: (id: string) =>
      apiFetch<Record<string, unknown>>(`/employees/${id}/webauthn/register-options/`, { method: 'POST' }),
    webauthnRegisterVerify: (id: string, credential: unknown) =>
      apiFetch<{ registered: boolean }>(`/employees/${id}/webauthn/register-verify/`, { method: 'POST', body: JSON.stringify(credential) }),
    webauthnAuthOptions: (id: string) =>
      apiFetch<Record<string, unknown>>(`/employees/${id}/webauthn/auth-options/`, { method: 'POST' }),
    webauthnAuthVerify: (id: string, assertion: unknown) =>
      apiFetch<{ verified: boolean }>(`/employees/${id}/webauthn/auth-verify/`, { method: 'POST', body: JSON.stringify(assertion) }),
  },
  payroll: {
    list: () => listAll<Record<string, unknown>>('/payroll/').then(r => r.map(mapPayroll)),
    create: (body: Omit<PayrollRecord, 'id'>) =>
      apiFetch<Record<string, unknown>>('/payroll/', { method: 'POST', body: JSON.stringify(toSnake.payroll(body)) }).then(mapPayroll),
    update: (id: string, body: Partial<PayrollRecord>) =>
      apiFetch<Record<string, unknown>>(`/payroll/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.payroll(body)) }).then(mapPayroll),
    remove: (id: string) => apiFetch<void>(`/payroll/${id}/`, { method: 'DELETE' }),
    changeStatus: (id: string, status: PayrollRecord['status']) =>
      apiFetch<Record<string, unknown>>(`/payroll/${id}/status/`, { method: 'POST', body: JSON.stringify({ status }) }).then(mapPayroll),
  },
  bonuses: {
    list: () => listAll<Record<string, unknown>>('/bonuses/').then(r => r.map(mapBonus)),
    create: (body: Omit<BonusRecord, 'id'>) =>
      apiFetch<Record<string, unknown>>('/bonuses/', { method: 'POST', body: JSON.stringify(toSnake.bonus(body)) }).then(mapBonus),
    update: (id: string, body: Partial<BonusRecord>) =>
      apiFetch<Record<string, unknown>>(`/bonuses/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.bonus(body)) }).then(mapBonus),
    remove: (id: string) => apiFetch<void>(`/bonuses/${id}/`, { method: 'DELETE' }),
  },
  waybills: {
    list: () => listAll<Record<string, unknown>>('/waybills/').then(r => r.map(mapWaybill)),
    create: (body: Omit<WaybillTTN, 'id'>) =>
      apiFetch<Record<string, unknown>>('/waybills/', { method: 'POST', body: JSON.stringify(toSnake.waybill(body)) }).then(mapWaybill),
    update: (id: string, body: Partial<WaybillTTN>) =>
      apiFetch<Record<string, unknown>>(`/waybills/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.waybill(body)) }).then(mapWaybill),
    remove: (id: string) => apiFetch<void>(`/waybills/${id}/`, { method: 'DELETE' }),
    changeStatus: (id: string, status: WaybillTTN['status']) =>
      apiFetch<Record<string, unknown>>(`/waybills/${id}/status/`, { method: 'POST', body: JSON.stringify({ status }) }).then(mapWaybill),
  },
  deliveries: {
    list: () => listAll<Record<string, unknown>>('/deliveries/').then(r => r.map(mapTrip)),
    create: (body: Omit<DeliveryTrip, 'id'>) =>
      apiFetch<Record<string, unknown>>('/deliveries/', { method: 'POST', body: JSON.stringify(toSnake.trip(body)) }).then(mapTrip),
    update: (id: string, body: Partial<DeliveryTrip>) =>
      apiFetch<Record<string, unknown>>(`/deliveries/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.trip(body)) }).then(mapTrip),
    remove: (id: string) => apiFetch<void>(`/deliveries/${id}/`, { method: 'DELETE' }),
    changeStatus: (id: string, status: DeliveryTrip['status'], updatedBy?: string) =>
      apiFetch<Record<string, unknown>>(`/deliveries/${id}/status/`, { method: 'POST', body: JSON.stringify({ status, updated_by: updatedBy || 'Admin' }) }).then(mapTrip),
    stats: () => apiFetch<{ day: { trip_count: number; total_delivery_fee: number }; month: { trip_count: number; total_delivery_fee: number }; year: { trip_count: number; total_delivery_fee: number } }>('/deliveries/stats/'),
  },
  company: {
    list: () => listAll<Record<string, unknown>>('/company/').then(r => r.map(mapCompany)),
    get: () => listAll<Record<string, unknown>>('/company/').then(r => (r.length ? mapCompany(r[0]) : null)),
    create: (body: Partial<CompanyInfo>) =>
      apiFetch<Record<string, unknown>>('/company/', { method: 'POST', body: JSON.stringify(toSnake.companyInfo(body)) }).then(mapCompany),
    update: (id: string, body: Partial<CompanyInfo>) =>
      apiFetch<Record<string, unknown>>(`/company/${id}/`, { method: 'PATCH', body: JSON.stringify(toSnake.companyInfo(body)) }).then(mapCompany),
  },
  attendanceSettings: {
    current: () =>
      apiFetch<Record<string, unknown>>('/attendance-settings/current/').then(mapAttendanceSettings),
    update: (body: Partial<AttendanceSettings>) =>
      apiFetch<Record<string, unknown>>('/attendance-settings/current/', { method: 'PATCH', body: JSON.stringify(toSnake.attendanceSettings(body)) }).then(mapAttendanceSettings),
  },
  attendance: {
    list: (params?: { month?: string; year?: string }) => {
      const q = params?.month
        ? `?month=${params.month}&page_size=1000`
        : params?.year
        ? `?year=${params.year}&page_size=1000`
        : '?page_size=1000';
      return apiFetch<{ results: Record<string, unknown>[] }>(`/attendance/${q}`).then(r => r.results.map(mapAttendance));
    },
    checkin: (body: { employee_id: string; lat: number; lng: number; face_verified: boolean; face_photo?: string }) =>
      apiFetch<Record<string, unknown>>('/attendance/check-in/', { method: 'POST', body: JSON.stringify(body) }).then(mapAttendance),
    mark: (body: { employee_id: string; date: string; status: 'kelgan' | 'kechikkan' | 'kelmadi' }) =>
      apiFetch<Record<string, unknown>>('/attendance/mark/', { method: 'POST', body: JSON.stringify(body) }).then(mapAttendance),
    remove: (id: string) => apiFetch<void>(`/attendance/${id}/`, { method: 'DELETE' }),
  },
  salaryPayments: {
    list: (month?: string) => {
      const q = month ? `?month=${month}&page_size=1000` : '?page_size=1000';
      return apiFetch<{ results: Record<string, unknown>[] }>(`/salary-payments/${q}`).then(r => r.results.map(mapSalaryPayment));
    },
    create: (body: { employee_id: string; employee_name?: string; month: string; amount: number; status: SalaryPayment['status'] }) =>
      apiFetch<Record<string, unknown>>('/salary-payments/', { method: 'POST', body: JSON.stringify(body) }).then(mapSalaryPayment),
    update: (id: string, body: Partial<SalaryPayment> & { employee_id?: string; month?: string; amount?: number; status?: SalaryPayment['status'] }) =>
      apiFetch<Record<string, unknown>>(`/salary-payments/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }).then(mapSalaryPayment),
  },
  stats: {
    overview: () => apiFetch<Record<string, unknown>>('/stats/overview/'),
  },
  auth: {
    login: (body: { login: string; password: string; client: 'web' | 'mobile' }) =>
      apiFetch<{ role: string; name?: string; employee_id?: number; position?: string; detail?: string; code?: string; attempts_left?: number; token?: string }>('/auth/login/', { method: 'POST', body: JSON.stringify(body) }).then((r) => { if (r.token) authTokenStore.set(r.token); return r; }),
    logout: () =>
      apiFetch<{ detail: string }>('/auth/logout/', { method: 'POST' }).catch(() => ({ detail: 'ok' })).finally(() => authTokenStore.clear()),
  },
  contactMessages: {
    list: () => listAll<Record<string, unknown>>('/contact-messages/').then(r => r.map(mapContactMessage)),
    create: (body: { name: string; phone: string; email?: string; message: string; external_id?: string }) =>
      apiFetch<Record<string, unknown>>('/contact-messages/', { method: 'POST', body: JSON.stringify(body) }).then(mapContactMessage),
    update: (id: number, body: Partial<{ status: ContactMessage['status']; name: string; phone: string; email: string; message: string }>) =>
      apiFetch<Record<string, unknown>>(`/contact-messages/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }).then(mapContactMessage),
    remove: (id: number) => apiFetch<void>(`/contact-messages/${id}/`, { method: 'DELETE' }),
  },
  site: {
    contactInfo: {
      get: () => apiFetch<Record<string, unknown>>('/site/contact-info/'),
      save: (body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>('/site/contact-info/', { method: 'POST', body: JSON.stringify(body) }),
    },
    portfolio: {
      list: (lang: string) =>
        apiFetch<{ results: Record<string, unknown>[] }>(`/site/portfolio/?lang=${lang}&page_size=1000`).then(r => r.results),
      create: (body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>('/site/portfolio/', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: number, body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>(`/site/portfolio/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
      remove: (id: number) => apiFetch<void>(`/site/portfolio/${id}/`, { method: 'DELETE' }),
    },
    slider: {
      get: (lang: string) => apiFetch<Record<string, unknown>>(`/site/slider/?lang=${lang}`),
      save: (lang: string, data: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>('/site/slider/', { method: 'POST', body: JSON.stringify({ lang, data }) }),
    },
  },
};

function mapContactMessage(o: Record<string, unknown>): ContactMessage {
  return {
    id: String((o.external_id as string) || `db-${o.id as number}`),
    dbId: o.id as number,
    name: String(o.name || ''),
    phone: String(o.phone || ''),
    email: String(o.email || ''),
    message: String(o.message || ''),
    status: (o.status as ContactMessage['status']) || 'yangi',
    createdAt: String(o.created_at || new Date().toISOString()),
  };
}
