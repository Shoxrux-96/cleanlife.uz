import { API_BASE } from './config';

export type Role = 'admin' | 'staff' | 'driver';

export interface LoginResult {
  role: Role;
  name?: string;
  employee_id?: number;
  position?: string;
  detail?: string;
  code?: string;
  token?: string;
}

// Login paytida saqlangan token (localStorage web, AsyncStorage'ga keyin ko'chiramiz)
const TOKEN_KEY = 'brendor_auth_token';
let _memToken: string | null = null;
export const authTokenStore = {
  get(): string | null {
    if (_memToken) return _memToken;
    try { return (globalThis as any).localStorage?.getItem(TOKEN_KEY) || null; } catch { return null; }
  },
  set(t: string) {
    _memToken = t;
    try { (globalThis as any).localStorage?.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
  },
  clear() {
    _memToken = null;
    try { (globalThis as any).localStorage?.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  const tok = authTokenStore.get();
  if (tok && !headers.Authorization) headers.Authorization = `Token ${tok}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Serverga ulanib bo‘lmadi. Wi-Fi va manzilni tekshiring.');
  }
  if (res.status === 401) authTokenStore.clear();
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    const detail =
      (err as { detail?: string }).detail || `API xatosi: ${res.status}`;
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function listAll<T>(path: string): Promise<T[]> {
  const data = await apiFetch<{ results: T[] } | T[]>(`${path}?page_size=1000`);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

const crud = (path: string) => ({
  list: () => listAll<Record<string, unknown>>(path),
  get: (id: number | string) =>
    apiFetch<Record<string, unknown>>(`${path}${id}/`),
  create: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: number | string, body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`${path}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: number | string) =>
    apiFetch<void>(`${path}${id}/`, { method: 'DELETE' }),
});

export const api = {
  auth: {
    login: (login: string, password: string) =>
      apiFetch<LoginResult>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ login, password, client: 'mobile' }),
      }).then((r) => { if (r.token) authTokenStore.set(r.token); return r; }),
    logout: () =>
      apiFetch<{ detail: string }>('/auth/logout/', { method: 'POST' })
        .catch(() => ({ detail: 'ok' }))
        .finally(() => authTokenStore.clear()),
  },
  overview: () => apiFetch<Record<string, unknown>>('/stats/overview/'),
  products: crud('/products/'),
  materials: crud('/materials/'),
  orders: {
    ...crud('/orders/'),
    changeStatus: (id: number | string, orderStatus: string) =>
      apiFetch<Record<string, unknown>>(`/orders/${id}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status: orderStatus }),
      }),
  },
  clients: crud('/clients/'),
  deliveries: {
    ...crud('/deliveries/'),
    page: (params: { page?: number; pageSize?: number; driver?: string; status?: string }) => {
      const q = new URLSearchParams();
      q.set('page', String(params.page ?? 1));
      q.set('page_size', String(params.pageSize ?? 10));
      if (params.driver) q.set('driver_name', params.driver);
      if (params.status) q.set('status', params.status);
      return apiFetch<{ count: number; next: string | null; previous: string | null; results: Record<string, unknown>[] }>(
        `/deliveries/?${q.toString()}`,
      );
    },
    changeStatus: (id: number | string, tripStatus: string, extras?: { traveled_distance_m?: number; traveled_duration_s?: number }) =>
      apiFetch<Record<string, unknown>>(`/deliveries/${id}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status: tripStatus, updated_by: 'Mobile', ...(extras ?? {}) }),
      }),
    monthly: (opts?: { driver?: string; year?: number; onlyDelivered?: boolean }) => {
      const q = new URLSearchParams();
      if (opts?.driver) q.set('driver_name', opts.driver);
      if (opts?.year) q.set('year', String(opts.year));
      if (opts?.onlyDelivered) q.set('only_delivered', '1');
      const qs = q.toString();
      return apiFetch<{ year: number; months: { month: number; count: number; fee: number }[] }>(
        `/deliveries/monthly/${qs ? `?${qs}` : ''}`,
      );
    },
    stats: (opts?: { period?: 'day' | 'month' | 'year'; driver?: string; onlyDelivered?: boolean }) => {
      const q = new URLSearchParams();
      if (opts?.period) q.set('period', opts.period);
      if (opts?.driver) q.set('driver_name', opts.driver);
      if (opts?.onlyDelivered) q.set('only_delivered', '1');
      const qs = q.toString();
      return apiFetch<{
        day?: { trip_count: number; total_delivery_fee: number };
        month?: { trip_count: number; total_delivery_fee: number };
        year?: { trip_count: number; total_delivery_fee: number };
      }>(`/deliveries/stats/${qs ? `?${qs}` : ''}`);
    },
  },
  transactions: crud('/transactions/'),
  employees: crud('/employees/'),
  waybills: {
    ...crud('/waybills/'),
    changeStatus: (id: number | string, wbStatus: string) =>
      apiFetch<Record<string, unknown>>(`/waybills/${id}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status: wbStatus }),
      }),
  },
  bonuses: crud('/bonuses/'),
  payroll: crud('/payroll/'),
  salaryPayments: {
    list: (month?: string) => {
      const q = month ? '?month=' + month + '&page_size=1000' : '?page_size=1000';
      return apiFetch<{ results: Record<string, unknown>[] }>(
        '/salary-payments/' + q,
      ).then((r) => (Array.isArray(r?.results) ? r.results : []));
    },
    create: (body: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>('/salary-payments/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number | string, body: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>(`/salary-payments/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
  attendanceSettings: {
    get: () =>
      apiFetch<Record<string, unknown>>('/attendance-settings/current/'),
    update: (body: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>('/attendance-settings/current/', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
  attendance: {
    list: (params?: { month?: string; year?: string }) => {
      let q = '?page_size=1000';
      if (params?.month) q = '?month=' + params.month + '&page_size=1000';
      else if (params?.year) q = '?year=' + params.year + '&page_size=1000';
      return apiFetch<{ results: Record<string, unknown>[] }>(
        '/attendance/' + q,
      ).then((r) => (Array.isArray(r?.results) ? r.results : []));
    },
    checkin: (body: {
      employee_id: number;
      lat: number;
      lng: number;
      face_verified: boolean;
    }) =>
      apiFetch<Record<string, unknown>>('/attendance/check-in/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    settings: () =>
      apiFetch<Record<string, unknown>>('/attendance-settings/current/'),
    mark: (body: { employee_id: number; date: string; status: string }) =>
      apiFetch<Record<string, unknown>>('/attendance/mark/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: number | string) =>
      apiFetch<void>(`/attendance/${id}/`, { method: 'DELETE' }),
  },
  company: {
    get: () =>
      listAll<Record<string, unknown>>('/company/').then((r) => r[0] ?? null),
    update: (id: number | string, body: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>(`/company/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    create: (body: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>('/company/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  site: {
    contactInfo: {
      get: () => apiFetch<Record<string, unknown>>('/site/contact-info/'),
      save: (body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>('/site/contact-info/', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
    },
    messages: {
      list: () =>
        listAll<Record<string, unknown>>('/contact-messages/'),
      update: (id: number, body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>(`/contact-messages/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      remove: (id: number) =>
        apiFetch<void>(`/contact-messages/${id}/`, { method: 'DELETE' }),
    },
    portfolio: {
      list: (lang: string) =>
        apiFetch<{ results: Record<string, unknown>[] }>(
          `/site/portfolio/?lang=${lang}&page_size=1000`,
        ).then((r) => (Array.isArray(r?.results) ? r.results : [])),
      create: (body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>('/site/portfolio/', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (id: number, body: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>(`/site/portfolio/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      remove: (id: number) =>
        apiFetch<void>(`/site/portfolio/${id}/`, { method: 'DELETE' }),
    },
    slider: {
      get: (lang: string) =>
        apiFetch<Record<string, unknown>>(`/site/slider/?lang=${lang}`),
      save: (lang: string, data: Record<string, unknown>) =>
        apiFetch<Record<string, unknown>>('/site/slider/', {
          method: 'POST',
          body: JSON.stringify({ lang, data }),
        }),
    },
  },
};
