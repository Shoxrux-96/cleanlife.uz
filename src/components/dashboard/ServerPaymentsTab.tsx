import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Server, Plus, ExternalLink, AlertCircle, CheckCircle2, Calendar, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : `${window.location.protocol}//${window.location.hostname}:8000/api`);
const TOKEN_KEY = 'brendor_auth_token';

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Token ${t}` } : {};
};

interface ServerPayment {
  id: number;
  period: string;        // YYYY-MM
  amount: string;
  currency: string;
  paid_at: string;       // YYYY-MM-DD
  next_due_date: string; // YYYY-MM-DD
  provider: string;
  payment_url: string;
  notes: string;
  days_until_due: number | null;
  created_at: string;
}

const PROVIDERS = [
  { v: 'contabo', l: 'Contabo', url: 'https://my.contabo.com/account/billing' },
  { v: 'aws', l: 'AWS', url: 'https://console.aws.amazon.com/billing/' },
  { v: 'digitalocean', l: 'DigitalOcean', url: 'https://cloud.digitalocean.com/account/billing' },
  { v: 'hetzner', l: 'Hetzner', url: 'https://accounts.hetzner.com/billing/' },
  { v: 'timeweb', l: 'Timeweb', url: 'https://timeweb.com/ru/my/finance/' },
  { v: 'other', l: 'Boshqa', url: '' },
];

const emptyForm = () => ({
  period: new Date().toISOString().slice(0, 7),
  amount: '',
  currency: 'USD',
  paid_at: new Date().toISOString().slice(0, 10),
  next_due_date: '',
  provider: 'contabo',
  payment_url: PROVIDERS[0].url,
  notes: '',
});

const PAGE_SIZE_OPTIONS = [10, 30, 50] as const;

export const ServerPaymentsTab: React.FC = () => {
  const [items, setItems] = useState<ServerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/server-payments/?page_size=100`, { headers: authHeader() });
      const d = await r.json();
      setItems(Array.isArray(d) ? d : d.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const providerUrl = (pv: string) => PROVIDERS.find((p) => p.v === pv)?.url || '';

  const onProviderChange = (v: string) => {
    const pu = providerUrl(v) || form.payment_url;
    setForm({ ...form, provider: v, payment_url: form.payment_url && form.payment_url !== providerUrl(form.provider) ? form.payment_url : pu });
  };

  const autoNextDue = (paid: string) => {
    // +30 kun default
    try {
      const d = new Date(paid);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().slice(0, 10);
    } catch { return ''; }
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    const body = { ...form, next_due_date: form.next_due_date || autoNextDue(form.paid_at) };
    try {
      const url = editingId ? `${API_BASE}/server-payments/${editingId}/` : `${API_BASE}/server-payments/`;
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || JSON.stringify(err));
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const edit = (p: ServerPayment) => {
    setEditingId(p.id);
    setForm({
      period: p.period,
      amount: p.amount,
      currency: p.currency,
      paid_at: p.paid_at,
      next_due_date: p.next_due_date,
      provider: p.provider,
      payment_url: p.payment_url,
      notes: p.notes,
    });
    setShowForm(true);
  };

  const remove = async (id: number) => {
    if (!confirm("Bu to'lov yozuvini o'chirmoqchimisiz?")) return;
    await fetch(`${API_BASE}/server-payments/${id}/`, { method: 'DELETE', headers: authHeader() });
    load();
  };

  const upcoming = useMemo(() => {
    if (!items.length) return null;
    return items.slice().sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))[0];
  }, [items]);

  const upcomingDays = upcoming?.days_until_due ?? 0;
  const upcomingTone =
    !upcoming ? 'neutral' :
    upcomingDays < 0 ? 'critical' :
    upcomingDays <= 3 ? 'critical' :
    upcomingDays <= 5 ? 'warning' : 'ok';

  // Sahifalash: pageSize o'zgarganda 1-sahifaga qaytamiz
  useEffect(() => { setPage(1); }, [pageSize, items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );
  const rangeStart = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, items.length);

  const totals = useMemo(() => {
    const byYear: Record<string, number> = {};
    let total = 0;
    for (const p of items) {
      const year = p.period.slice(0, 4);
      const amt = parseFloat(p.amount) || 0;
      byYear[year] = (byYear[year] || 0) + amt;
      total += amt;
    }
    return { total, byYear };
  }, [items]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Yuqoridagi ogohlantirish banneri */}
      {upcoming && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            upcomingTone === 'critical'
              ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
              : upcomingTone === 'warning'
                ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
          }`}
        >
          {upcomingTone === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${upcomingTone === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          )}
          <div className="flex-1">
            <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
              {upcomingDays < 0
                ? `⚠️ To'lov ${-upcomingDays} kun oldin muddati o'tgan`
                : upcomingDays === 0
                  ? '⚠️ Bugun server to\'lov kuni!'
                  : upcomingTone === 'critical'
                    ? `⚠️ Server to'lov muddati ${upcomingDays} kun qoldi`
                    : upcomingTone === 'warning'
                      ? `⏰ Server to'lov muddati ${upcomingDays} kun qoldi`
                      : `✓ Keyingi to'lov ${upcomingDays} kun ichida (${upcoming.next_due_date})`}
            </div>
            <div className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              {upcoming.amount} {upcoming.currency} · {upcoming.provider} · muddat {upcoming.next_due_date}
            </div>
          </div>
          {upcoming.payment_url && (
            <a
              href={upcoming.payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              To'lov sahifasi <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Server to'lovlari
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            VPS / hosting to'lovlari tarixi va keyingi muddat kuzatuvi
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Yangi to'lov
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 dark:border-[#332A22] bg-white dark:bg-[#1A1714] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Jami to'lovlar</div>
          <div className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">{items.length} ta</div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-[#332A22] bg-white dark:bg-[#1A1714] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Umumiy summa</div>
          <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">${totals.total.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-[#332A22] bg-white dark:bg-[#1A1714] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Yil bo'yicha</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(totals.byYear).map(([y, v]) => (
              <span key={y} className="text-xs"><span className="text-stone-500">{y}:</span> <b className="text-stone-900 dark:text-stone-100">${v.toFixed(2)}</b></span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-stone-200 dark:border-[#332A22] bg-white dark:bg-[#1A1714] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{editingId ? "To'lovni tahrirlash" : "Yangi to'lov qo'shish"}</h4>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-xs text-stone-500 hover:text-stone-700">Yopish</button>
          </div>
          {/* 3 ta ustun, 3 ta qator — oxirgi uyada Saqlash tugma */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1-qator: sanalar */}
            <Field label="Davr (oy) — YYYY-MM">
              <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-11" className={inputCls}/>
            </Field>
            <Field label="To'lov sanasi">
              <input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value, next_due_date: form.next_due_date || autoNextDue(e.target.value) })} className={inputCls}/>
            </Field>
            <Field label="Keyingi to'lov muddati">
              <input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} className={inputCls}/>
            </Field>

            {/* 2-qator: summa/valyuta/provider */}
            <Field label="Summa">
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="50.00"
                inputMode="decimal"
                className={inputCls + ' w-full text-lg font-semibold tracking-wide py-3'}
              />
            </Field>
            <Field label="Valyuta">
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls + ' w-full py-3 text-lg font-semibold'}>
                <option>USD</option><option>UZS</option><option>EUR</option>
              </select>
            </Field>
            <Field label="Provider">
              <select value={form.provider} onChange={(e) => onProviderChange(e.target.value)} className={inputCls}>
                {PROVIDERS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>

            {/* 3-qator: URL / Izoh / Saqlash */}
            <Field label="To'lov sahifasi (URL)">
              <input value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} placeholder="https://..." className={inputCls}/>
            </Field>
            <Field label="Izoh (ixtiyoriy)">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="VPS M-small" className={inputCls}/>
            </Field>
            <div className="flex flex-col justify-end">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1 opacity-0 select-none">·</label>
              <button
                onClick={submit}
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                {saving ? 'Saqlanmoqda...' : editingId ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-stone-200 dark:border-[#332A22] bg-white dark:bg-[#1A1714] overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-stone-500">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Server className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <div className="text-sm text-stone-500">Hali to'lov yozuvi yo'q. Birinchi to'lovni qo'shing.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-[#161412] border-b border-stone-200 dark:border-[#332A22]">
              <tr className="text-[10px] uppercase tracking-wider text-stone-500">
                <th className="px-3 py-2.5 text-left">Davr</th>
                <th className="px-3 py-2.5 text-left">Summa</th>
                <th className="px-3 py-2.5 text-left">To'lov sanasi</th>
                <th className="px-3 py-2.5 text-left">Keyingi muddat</th>
                <th className="px-3 py-2.5 text-left">Provider</th>
                <th className="px-3 py-2.5 text-left">Qoldi</th>
                <th className="px-3 py-2.5 text-right">Amal</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((p) => {
                const d = p.days_until_due ?? 0;
                return (
                  <tr key={p.id} className="border-b border-stone-100 dark:border-[#2A221A] hover:bg-stone-50/50 dark:hover:bg-[#1F1A15]">
                    <td className="px-3 py-2.5 font-bold text-stone-900 dark:text-stone-100">{p.period}</td>
                    <td className="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-200">{p.amount} {p.currency}</td>
                    <td className="px-3 py-2.5 text-stone-600 dark:text-stone-400">{p.paid_at}</td>
                    <td className="px-3 py-2.5 text-stone-600 dark:text-stone-400">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/>{p.next_due_date}</span>
                    </td>
                    <td className="px-3 py-2.5 text-stone-600 dark:text-stone-400 capitalize">{p.provider}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${d < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : d <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : d <= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                        {d < 0 ? `${-d} kun oldin` : d === 0 ? 'Bugun' : `${d} kun`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex gap-1.5">
                        {p.payment_url && (
                          <a href={p.payment_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-[#382F26] hover:bg-stone-100 dark:hover:bg-[#251E18]" title="To'lov sahifasi">
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"/>
                          </a>
                        )}
                        <button onClick={() => edit(p)} className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-[#382F26] hover:bg-stone-100 dark:hover:bg-[#251E18]" title="Tahrirlash">
                          <Pencil className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300"/>
                        </button>
                        <button onClick={() => remove(p.id)} className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20" title="O'chirish">
                          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 border-t border-stone-200 dark:border-[#332A22] bg-stone-50/50 dark:bg-[#161412]/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Har sahifada:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-md border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#161412] text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-stone-500">
                · {rangeStart}–{rangeEnd} / {items.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="px-2 py-1 rounded-md border border-stone-200 dark:border-[#382F26] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Boshiga"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-7 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-[#382F26] hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Oldingi"
              >
                <ChevronLeft className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              </button>
              <span className="px-3 text-xs font-bold text-stone-900 dark:text-stone-100">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-7 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-[#382F26] hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Keyingi"
              >
                <ChevronRight className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2 py-1 rounded-md border border-stone-200 dark:border-[#382F26] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Oxiriga"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const inputCls = "w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#161412] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">{label}</label>
    {children}
  </div>
);
