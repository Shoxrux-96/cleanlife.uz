import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : `${window.location.protocol}//${window.location.hostname}:8000/api`);
const TOKEN_KEY = 'brendor_auth_token';

type Upcoming = {
  has_payment: boolean;
  latest?: {
    period: string;
    amount: string;
    currency: string;
    next_due_date: string;
    payment_url: string;
    provider: string;
  };
  days_until_due?: number;
  reminder?: boolean;
  critical?: boolean;
  overdue?: boolean;
};

export const ServerPaymentBell: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const [info, setInfo] = useState<Upcoming | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchInfo = () => {
      const tok = localStorage.getItem(TOKEN_KEY);
      if (!tok) return;
      fetch(`${API_BASE}/server-payments/upcoming/`, {
        headers: { Authorization: `Token ${tok}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setInfo(d))
        .catch(() => {});
    };
    fetchInfo();
    // Har 5 daqiqada qayta tekshirish
    const id = setInterval(fetchInfo, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!info || !info.has_payment) return null;

  const isWarning = Boolean(info.reminder);
  const isCritical = Boolean(info.critical);
  const isOverdue = Boolean(info.overdue);
  const days = info.days_until_due ?? 0;

  const badge = isOverdue
    ? { bg: 'bg-red-600', ring: 'ring-red-600', text: `${-days} kun kechikdi` }
    : isCritical
      ? { bg: 'bg-red-500', ring: 'ring-red-500', text: `${days} kun qoldi` }
      : isWarning
        ? { bg: 'bg-amber-500', ring: 'ring-amber-500', text: `${days} kun qoldi` }
        : { bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: `${days} kun qoldi` };

  const showActive = isWarning || isCritical || isOverdue;

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative w-8 h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 ${
          showActive
            ? `border-${isCritical || isOverdue ? 'red' : 'amber'}-300 dark:border-${isCritical || isOverdue ? 'red' : 'amber'}-600 ${isCritical || isOverdue ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`
            : 'border-stone-200 dark:border-[#382F26] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#251E18]'
        }`}
        title={`Server to'lovi: ${badge.text}`}
        aria-label="Server to'lov ogohlantirishi"
      >
        <Bell className={`w-4 h-4 ${showActive ? (isCritical || isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400') : 'text-stone-500 dark:text-stone-400'}`} />
        {showActive && (
          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${badge.bg} ring-2 ring-white dark:ring-[#161412] animate-pulse`} />
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border shadow-xl overflow-hidden z-50 bg-white dark:bg-[#1A1714] border-stone-200 dark:border-[#332A22]">
          <div className={`px-4 py-3 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : isCritical ? 'bg-red-50 dark:bg-red-900/20' : isWarning ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Keyingi server to'lovi
            </div>
            <div className={`mt-1 text-lg font-bold ${isOverdue || isCritical ? 'text-red-700 dark:text-red-400' : isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {badge.text}
            </div>
          </div>
          <div className="px-4 py-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Muddat:</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100">{info.latest?.next_due_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Summa:</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {info.latest?.amount} {info.latest?.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Provider:</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100 capitalize">{info.latest?.provider}</span>
            </div>
          </div>
          <button
            onClick={onOpen}
            className="w-full px-4 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Batafsil →
          </button>
        </div>
      )}
    </div>
  );
};
