import React, { useState } from 'react';
import { 
  Layers, Plus, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Trash2, Edit3, CheckCircle2, ShieldAlert, Package, RefreshCw, Box
} from 'lucide-react';
import { RawMaterial } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface MaterialsTabProps {
  materials: RawMaterial[];
  onAddMaterial: (material: Omit<RawMaterial, 'id'>) => void;
  onUpdateMaterial: (material: RawMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onStockAdjustment: (id: string, delta: number, reason: string) => void;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onStockAdjustment
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  // Adjustment Modal
  const [adjustingMaterial, setAdjustingMaterial] = useState<RawMaterial | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustReason, setAdjustReason] = useState<string>(t.dash.materials.adjust.reasonReceived);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Mato & Blanklar' as RawMaterial['category'],
    unit: 'dona' as RawMaterial['unit'],
    quantity: 100,
    minThreshold: 20,
    unitCost: 50000,
    supplier: '',
    counterparty: 'Buxoro EuroTex Fabrikasi MCHJ',
    paymentMethod: 'Bank hisob raqami (Perechisleniye)',
    lastRestocked: new Date().toISOString().split('T')[0]
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.materials.currencySuffix;
  };

  const totalStockValue = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
  const lowStockMaterials = materials.filter(m => m.quantity <= m.minThreshold);

  const filteredMaterials = materials.filter(m => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.supplier.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleOpenNew = () => {
    setEditingMaterial(null);
    setFormData({
      name: '',
      category: 'Mato & Blanklar',
      unit: 'dona',
      quantity: 100,
      minThreshold: 20,
      unitCost: 45000,
      supplier: 'Toshkent To‘qimachilik',
      counterparty: 'Toshkent To‘qimachilik MCHJ',
      paymentMethod: 'Bank hisob raqami (Perechisleniye)',
      lastRestocked: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: RawMaterial) => {
    setEditingMaterial(m);
    setFormData({
      name: m.name,
      category: m.category,
      unit: m.unit,
      quantity: m.quantity,
      minThreshold: m.minThreshold,
      unitCost: m.unitCost,
      supplier: m.supplier,
      counterparty: m.counterparty || m.supplier || '',
      paymentMethod: m.paymentMethod || 'Bank hisob raqami (Perechisleniye)',
      lastRestocked: m.lastRestocked
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingMaterial) {
      onUpdateMaterial({
        ...editingMaterial,
        ...formData
      });
    } else {
      onAddMaterial({
        ...formData,
        batchNumber: `P-${Math.floor(100 + Math.random() * 900)}`,
        storageLocation: 'Ombor-1, A-Polka',
        status: formData.quantity <= formData.minThreshold ? 'ogohlantirish' : 'yetarli'
      });
    }
    setIsModalOpen(false);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    const deltaNum = parseFloat(adjustDelta);
    if (!deltaNum || deltaNum <= 0) return;

    const actualDelta = adjustType === 'add' ? deltaNum : -deltaNum;
    onStockAdjustment(adjustingMaterial.id, actualDelta, adjustReason);
    setAdjustingMaterial(null);
    setAdjustDelta('');
  };

  return (
    <div className="space-y-6">
      {/* Top Inventory Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#1C1815] border border-[#382F25] shadow-lg">
          <div className="flex items-center justify-between text-xs text-[#8E8476] uppercase tracking-wider mb-2">
            <span>{t.dash.materials.summary.totalValue}</span>
            <Layers className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-bold text-[#FDFBF7]">
            {formatCurrency(totalStockValue)}
          </div>
          <p className="text-[11px] text-[#A89F93] mt-1">{t.dash.materials.summary.totalValueSub}</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1C1815] border border-[#382F25] shadow-lg">
          <div className="flex items-center justify-between text-xs text-[#8E8476] uppercase tracking-wider mb-2">
            <span>{t.dash.materials.summary.types}</span>
            <Box className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#FDFBF7]">
            {materials.length} {t.dash.materials.summary.typesSuffix}
          </div>
          <p className="text-[11px] text-[#A89F93] mt-1">{t.dash.materials.summary.typesSub}</p>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg ${
          lowStockMaterials.length > 0 
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' 
            : 'bg-[#1C1815] border-emerald-500/30 text-emerald-400'
        }`}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider mb-2">
            <span>{t.dash.materials.summary.minControl}</span>
            {lowStockMaterials.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="text-2xl font-bold text-[#FDFBF7]">
            {lowStockMaterials.length > 0 ? `${lowStockMaterials.length} ${t.dash.materials.summary.lowSuffix}` : t.dash.materials.summary.allOk}
          </div>
          <p className="text-[11px] text-[#A89F93] mt-1">
            {lowStockMaterials.length > 0 ? t.dash.materials.summary.urgent : t.dash.materials.summary.noLow}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#181513] border border-[#352D24]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8476]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dash.materials.search.ph}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#201B17] border border-[#382F25] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E2BE46] text-black text-xs font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dash.materials.search.addBtn}</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: t.dash.materials.cats.all },
          { id: 'Mato & Blanklar', label: t.dash.materials.cats.mato },
          { id: 'Bo‘yoq & Kimyo', label: t.dash.materials.cats.boyoq },
          { id: 'Ip & Furnitura', label: t.dash.materials.cats.ip },
          { id: 'Qadoq & Karton', label: t.dash.materials.cats.qadoq },
          { id: 'Aksessuarlar', label: t.dash.materials.cats.aks }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[#2A231C] text-[#D4AF37] border border-[#4D3F30]'
                : 'bg-[#181513] text-[#8E8476] border border-[#2D261F] hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Materials Table */}
      <div className="rounded-2xl bg-[#181513] border border-[#352D24] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#201B17] text-[#8E8476] uppercase tracking-wider text-[11px] border-b border-[#352D24]">
              <tr>
                <th className="py-3 px-4">{t.dash.materials.table.nameCat}</th>
                <th className="py-3 px-4 text-center">{t.dash.materials.table.unit}</th>
                <th className="py-3 px-4 text-right">{t.dash.materials.table.stock}</th>
                <th className="py-3 px-4 text-right">{t.dash.materials.table.minLimit}</th>
                <th className="py-3 px-4 text-right">{t.dash.materials.table.unitPrice}</th>
                <th className="py-3 px-4 text-right">{t.dash.materials.table.totalValue}</th>
                <th className="py-3 px-4">{t.dash.materials.table.supplierDate}</th>
                <th className="py-3 px-4 text-center">{t.dash.materials.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B231B] text-[#DDD7CD]">
              {filteredMaterials.map((mat) => {
                const isLow = mat.quantity <= mat.minThreshold;
                const totalVal = mat.quantity * mat.unitCost;

                return (
                  <tr key={mat.id} className={`hover:bg-white/[0.02] transition-colors ${isLow ? 'bg-amber-500/[0.04]' : ''}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {isLow && (
                          <span title={t.dash.materials.table.lowTitle}>
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          </span>
                        )}
                        <div>
                          <div className="font-bold text-[#FDFBF7]">{mat.name}</div>
                          <span className="text-[10px] text-[#D4AF37] px-1.5 py-0.5 rounded bg-[#262019] border border-[#423627] inline-block mt-0.5">
                            {mat.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-[#A89F93]">
                      {mat.unit}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-bold text-sm ${isLow ? 'text-amber-400' : 'text-[#FDFBF7]'}`}>
                        {mat.quantity} {mat.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-[#8E8476]">
                      {mat.minThreshold} {mat.unit}
                    </td>

                    <td className="py-3.5 px-4 text-right text-[#DDD6CC]">
                      {formatCurrency(mat.unitCost)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-[#D4AF37]">
                      {formatCurrency(totalVal)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[#C8C0B5]">{mat.supplier}</div>
                      <div className="text-[10px] text-[#8E8476]">{mat.lastRestocked}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setAdjustingMaterial(mat);
                            setAdjustType('add');
                            setAdjustDelta('');
                            setAdjustReason(t.dash.materials.adjust.reasonReceived);
                          }}
                          className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold text-[11px] border border-emerald-500/30"
                          title={t.dash.materials.row.receiveTitle}
                        >
                          {t.dash.materials.row.receive}
                        </button>

                        <button
                          onClick={() => {
                            setAdjustingMaterial(mat);
                            setAdjustType('remove');
                            setAdjustDelta('');
                            setAdjustReason(t.dash.materials.adjust.reasonIssued);
                          }}
                          className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-semibold text-[11px] border border-rose-500/30"
                          title={t.dash.materials.row.issueTitle}
                        >
                          {t.dash.materials.row.issue}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(mat)}
                          className="p-1 rounded text-[#8E8476] hover:text-[#D4AF37]"
                          title={t.dash.materials.row.editTitle}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteMaterial(mat.id)}
                          className="p-1 rounded text-[#8E8476] hover:text-rose-400"
                          title={t.dash.materials.row.deleteTitle}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal (Kirim / Sarf) */}
      {adjustingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#1C1815] border border-[#3E342B] p-5 shadow-2xl text-[#EFECE6]">
            <h3 className="text-base font-bold text-[#FDFBF7] mb-1">
              {adjustType === 'add' ? t.dash.materials.adjust.inTitle : t.dash.materials.adjust.outTitle}
            </h3>
            <p className="text-xs text-[#8E8476] mb-3">
              {adjustingMaterial.name} ({adjustingMaterial.quantity} {adjustingMaterial.unit} {t.dash.materials.adjust.availSuffix})
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                  {t.dash.materials.adjust.amount} ({adjustingMaterial.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder={`${t.dash.materials.adjust.examplePrefix} ${adjustingMaterial.unit}`}
                  className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] focus:border-[#D4AF37] text-sm text-[#FDFBF7] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                  {t.dash.materials.adjust.reasonLabel}
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingMaterial(null)}
                  className="flex-1 py-2 rounded-lg bg-[#241E19] text-[#8E8476] text-xs font-semibold"
                >
                  {t.dash.materials.adjust.cancel}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 rounded-lg text-xs font-bold text-white shadow-md ${
                    adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {adjustType === 'add' ? t.dash.materials.adjust.confirmIn : t.dash.materials.adjust.confirmOut}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#1C1815] border border-[#3E342B] p-6 shadow-2xl text-[#EFECE6]">
            <h3 className="text-lg font-bold text-[#FDFBF7] mb-1">
              {editingMaterial ? t.dash.materials.form.editTitle : t.dash.materials.form.addTitle}
            </h3>
            <p className="text-xs text-[#8E8476] mb-4">
              {t.dash.materials.form.subtitle}
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.dash.materials.form.namePh}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#141210] border border-[#382F25] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.category}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  >
                    <option value="Mato & Blanklar">{t.dash.materials.cats.mato}</option>
                    <option value="Bo‘yoq & Kimyo">{t.dash.materials.cats.boyoq}</option>
                    <option value="Ip & Furnitura">{t.dash.materials.cats.ip}</option>
                    <option value="Qadoq & Karton">{t.dash.materials.cats.qadoq}</option>
                    <option value="Aksessuarlar">{t.dash.materials.cats.aks}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.table.unit}</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  >
                    <option value="dona">dona</option>
                    <option value="metr">metr</option>
                    <option value="litr">litr</option>
                    <option value="kg">kg</option>
                    <option value="bobina">bobina</option>
                    <option value="rulon">rulon</option>
                    <option value="pachka">pachka</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.stockNow}</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.minLimit}</label>
                  <input
                    type="number"
                    value={formData.minThreshold}
                    onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.unitCost}</label>
                  <input
                    type="number"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.counterparty}</label>
                  <input
                    type="text"
                    value={formData.counterparty}
                    onChange={(e) => setFormData({ ...formData, counterparty: e.target.value, supplier: e.target.value })}
                    placeholder={t.dash.materials.form.counterpartyPh}
                    className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C8C0B5] mb-1">{t.dash.materials.form.payment}</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                >
                  <option value="Bank hisob raqami (Perechisleniye)">{t.dash.materials.form.payBank}</option>
                  <option value="Naqd pul">{t.dash.materials.form.payCash}</option>
                  <option value="Korporativ karta (Uzcard/Humo)">{t.dash.materials.form.payCard}</option>
                  <option value="Nasiya (Muddatli to‘lov)">{t.dash.materials.form.payCredit}</option>
                  <option value="Boshqa to‘lov">{t.dash.materials.form.payOther}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[#241E19] text-[#8E8476] text-xs font-semibold"
                >
                  {t.dash.materials.form.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E2BE46] text-black text-xs font-bold shadow-md"
                >
                  {t.dash.materials.form.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
