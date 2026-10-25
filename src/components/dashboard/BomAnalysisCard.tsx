import React, { useEffect, useState } from 'react';
import { BarChart3Icon, PackageIcon, RefreshCwIcon, TrendingUpIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { erpApi } from '../../api/erpApi';

interface BomRow {
  category: string;
  planned_cost: number;
  actual_cost: number;
}
interface BomResp {
  items: BomRow[];
  totals: {
    planned_total: number;
    actual_total: number;
    categories_count: number;
    bom_items_count: number;
  };
}

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#6366F1'];

const fmt = (n: number) =>
  new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' so\'m';

export const BomAnalysisCard: React.FC = () => {
  const [data, setData] = useState<BomResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await erpApi.rawFetch<BomResp>('/materials/bom-analysis/');
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const items = data?.items ?? [];
  const totals = data?.totals;
  const pieData = items.filter((i) => i.planned_cost > 0).slice(0, 10);
  const barData = items.slice(0, 10).map((i) => ({
    name: i.category.length > 14 ? i.category.slice(0, 12) + '…' : i.category,
    fullName: i.category,
    Rejalashtirilgan: i.planned_cost,
    Amalda: i.actual_cost,
  }));

  return (
    <div className="bg-white dark:bg-[#1A1612] rounded-2xl border border-stone-200 dark:border-[#2E2720] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BarChart3Icon className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">
                Xom-ashyo Sarfi Strukturasi
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                BOM Tahlil — ishlab chiqarishga sarflangan asosiy xom-ashyo toifalari
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-[#2E2720] text-stone-600 dark:text-stone-300 transition"
          title="Yangilash"
        >
          <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatTile
            icon={<PackageIcon className="w-4 h-4" />}
            label="Toifalar"
            value={String(totals.categories_count)}
            tint="emerald"
          />
          <StatTile
            icon={<BarChart3Icon className="w-4 h-4" />}
            label="BOM yozuvlari"
            value={String(totals.bom_items_count)}
            tint="blue"
          />
          <StatTile
            icon={<TrendingUpIcon className="w-4 h-4" />}
            label="Rejalashtirilgan"
            value={fmt(totals.planned_total)}
            tint="amber"
          />
          <StatTile
            icon={<TrendingUpIcon className="w-4 h-4" />}
            label="Amalda sarflangan"
            value={fmt(totals.actual_total)}
            tint="purple"
          />
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="py-12 text-center text-stone-500 dark:text-stone-400">
          <PackageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">BOM yozuvlari yo'q. Mahsulotlarga xom-ashyo biriktiring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pie — categories share */}
          <div className="rounded-xl border border-stone-200 dark:border-[#2E2720] p-4">
            <h4 className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-3">
              Toifalar bo'yicha ulush
            </h4>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="planned_cost"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="transparent"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar — planned vs actual */}
          <div className="rounded-xl border border-stone-200 dark:border-[#2E2720] p-4">
            <h4 className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-3">
              Rejalashtirilgan vs Amalda sarflangan
            </h4>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                  <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} />
                  <YAxis
                    fontSize={10}
                    tickFormatter={(v) => {
                      if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
                      if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                      return String(v);
                    }}
                  />
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    labelFormatter={(l, p) => (p?.[0]?.payload as { fullName?: string })?.fullName || l}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Rejalashtirilgan" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Amalda" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table — detailed breakdown */}
          <div className="lg:col-span-2 rounded-xl border border-stone-200 dark:border-[#2E2720] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-[#141210]">
                <tr>
                  <th className="text-left p-3 font-bold text-stone-700 dark:text-stone-200">
                    Toifa
                  </th>
                  <th className="text-right p-3 font-bold text-stone-700 dark:text-stone-200">
                    Rejalashtirilgan
                  </th>
                  <th className="text-right p-3 font-bold text-stone-700 dark:text-stone-200">
                    Amalda sarflangan
                  </th>
                  <th className="text-right p-3 font-bold text-stone-700 dark:text-stone-200">
                    Ulush
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const pct =
                    totals && totals.planned_total > 0
                      ? (r.planned_cost / totals.planned_total) * 100
                      : 0;
                  return (
                    <tr
                      key={r.category}
                      className="border-t border-stone-100 dark:border-[#2E2720] hover:bg-stone-50/60 dark:hover:bg-[#141210]/60"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="font-semibold text-stone-800 dark:text-stone-100">
                            {r.category}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-stone-700 dark:text-stone-200">
                        {fmt(r.planned_cost)}
                      </td>
                      <td className="p-3 text-right font-mono text-stone-700 dark:text-stone-200">
                        {fmt(r.actual_cost)}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: 'amber' | 'emerald' | 'blue' | 'purple';
}> = ({ icon, label, value, tint }) => {
  const tints = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="rounded-xl border border-stone-200 dark:border-[#2E2720] p-3 bg-stone-50/40 dark:bg-[#141210]/40">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${tints[tint]}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-lg font-black text-stone-800 dark:text-stone-100 truncate">
        {value}
      </div>
    </div>
  );
};
