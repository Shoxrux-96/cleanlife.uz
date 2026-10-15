import { API_BASE } from './config';

export type Role = 'admin' | 'staff';

export interface LoginResult {
  role: Role;
  name?: string;
  employee_id?: number;
  position?: string;
  detail?: string;
  code?: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Serverga ulanib bo‘lmadi. Wi-Fi va manzilni tekshiring.');
  }
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
  const data = await apiFetch<{ results: T[] }>(`${path}?page_size=1000`);
  return data.results;
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
      }),
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
    changeStatus: (id: number | string, tripStatus: string) =>
      apiFetch<Record<string, unknown>>(`/deliveries/${id}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status: tripStatus, updated_by: 'Mobile' }),
      }),
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
      ).then((r) => r.results);
    },
  },
  attendance: {
    list: (params?: { month?: string; year?: string }) => {
      let q = '?page_size=1000';
      if (params?.month) q = '?month=' + params.month + '&page_size=1000';
      else if (params?.year) q = '?year=' + params.year + '&page_size=1000';
      return apiFetch<{ results: Record<string, unknown>[] }>(
        '/attendance/' + q,
      ).then((r) => r.results);
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
  company: () =>
    listAll<Record<string, unknown>>('/company/').then((r) => r[0] ?? null),
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
        ).then((r) => r.results),
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
