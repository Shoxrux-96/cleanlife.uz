import React, { useState, useEffect } from 'react';
import { Layers, X, Building2, CreditCard, Clock } from 'lucide-react';
import { RawMaterial } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

// Material kirimini (xaridni) moliyaga yozish uchun ma'lumot
export interface MaterialPurchasePayload {
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  amount: number;
  counterparty: string;
  paymentMethod: string;
}

interface MaterialReceiptModalProps {
  open: boolean;
  materials: RawMaterial[];
  editingMaterial?: RawMaterial | null;
  onClose: () => void;
  onAddMaterial?: (material: Omit<RawMaterial, 'id'>) => void;
  onUpdateMaterial: (material: RawMaterial) => void;
  // Har bir kirimni moliya sahifasida 'Material xaridi' (chiqim) sifatida qayd etish
  onRecordPurchase?: (payload: MaterialPurchasePayload) => void;
}

type ReceiptFormState = {
  name: string;
  unit: string;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  counterparty: string;
  paymentMethod: string;
};

const initialFormState: ReceiptFormState = {
  name: '',
  unit: 'dona',
  quantity: 100,
  minThreshold: 30,
  unitCost: 25000,
  counterparty: 'Buxoro EuroTex Fabrikasi MCHJ',
  paymentMethod: 'Bank hisob raqami (Perechisleniye)'
};

const unitOptions = [
  { value: 'dona', label: 'dona (Dona)' },
  { value: 'kg', label: 'kg (Kilogramm)' },
  { value: 'gr', label: 'gr (Gramm)' },
  { value: 'litr', label: 'litr (Litr)' },
  { value: 'm', label: 'm (Metr)' },
  { value: 'pachka', label: 'pachka (Pachka)' },
  { value: 'blok', label: 'blok (Blok)' }
];

const getUzbekistanDateTimeString = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';

  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const getUzbekistanDisplayTime = () => {
  const [datePart, timePart] = getUzbekistanDateTimeString().split(' ');
  const [year, month, day] = datePart.split('-');
  return `${day}.${month}.${year} ${timePart}`;
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '—';
  const clean = dateStr.replace('T', ' ');
  const parts = clean.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '09:00';
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y} ${timePart.slice(0, 5)}`;
};

const formatUzbekSum = (val: number, suffix = " so'm") => {
  return new Intl.NumberFormat('uz-UZ').format(val) + suffix;
};

// Ikkala sahifada (Kirim materiallari va Omborxona) bitta yagona modal oyna
export const MaterialReceiptModal: React.FC<MaterialReceiptModalProps> = ({
  open,
  materials,
  editingMaterial,
  onClose,
  onAddMaterial,
  onUpdateMaterial,
  onRecordPurchase
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<ReceiptFormState>(initialFormState);

  useEffect(() => {
    if (!open) return;
    if (editingMaterial) {
      setFormData({
        name: editingMaterial.name,
        unit: editingMaterial.unit,
        quantity: editingMaterial.quantity,
        minThreshold: editingMaterial.minThreshold,
        unitCost: editingMaterial.unitCost,
        counterparty: editingMaterial.counterparty || editingMaterial.supplier || '',
        paymentMethod: editingMaterial.paymentMethod || 'Bank hisob raqami (Perechisleniye)'
      });
    } else {
      setFormData(initialFormState);
    }
  }, [open, editingMaterial]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const status: RawMaterial['status'] =
      formData.quantity <= formData.minThreshold ? 'kritik' :
      formData.quantity <= formData.minThreshold * 1.5 ? 'ogohlantirish' : 'yetarli';

    const uzbekistanTimestamp = getUzbekistanDateTimeString();

    if (editingMaterial) {
      onUpdateMaterial({
        ...editingMaterial,
        ...formData,
        supplier: formData.counterparty || editingMaterial.supplier,
        status
      });
    } else {
      const existing = materials.find(m => m.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
      if (existing) {
        const newQty = existing.quantity + formData.quantity;
        const newStatus: RawMaterial['status'] =
          newQty <= existing.minThreshold ? 'kritik' :
          newQty <= existing.minThreshold * 1.5 ? 'ogohlantirish' : 'yetarli';

        onUpdateMaterial({
          ...existing,
          quantity: newQty,
          unitCost: formData.unitCost || existing.unitCost,
          unit: formData.unit || existing.unit,
          counterparty: formData.counterparty || existing.counterparty,
          paymentMethod: formData.paymentMethod || existing.paymentMethod,
          lastRestocked: uzbekistanTimestamp,
          status: newStatus
        });
      } else if (onAddMaterial) {
        onAddMaterial({
          ...formData,
          batchNumber: `MAT-${Date.now().toString().slice(-6)}`,
          category: 'Xom-ashyo',
          supplier: formData.counterparty || 'Omborxona',
          storageLocation: 'Asosiy ombor',
          lastRestocked: uzbekistanTimestamp,
          status
        });
      }
    }

    // Tahrirlashdan tashqari HAR BIR kirim moliya sahifasida xarid (chiqim) bo'lib qayd etiladi
    if (!editingMaterial) {
      onRecordPurchase?.({
        materialName: formData.name.trim(),
        quantity: formData.quantity,
        unit: formData.unit,
        unitCost: formData.unitCost,
        amount: formData.quantity * formData.unitCost,
        counterparty: formData.counterparty,
        paymentMethod: formData.paymentMethod
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 12, 10, 0.75)' }}
    >
      <div className="material-modal-card bg-white dark:bg-[#181512] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8 text-stone-950 dark:text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-stone-950 dark:text-white">
                {editingMaterial ? t.dash.receipt.header.editTitle : t.dash.receipt.header.addTitle}
              </h3>
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                {t.dash.receipt.header.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
            title={t.dash.receipt.header.closeTitle}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4.5 text-xs">
          {/* Mahsulot Nomi */}
          <div>
            <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
              {t.dash.receipt.form.nameLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
            </label>
            <input
              type="text"
              required
              list="shared-materials-datalist"
              placeholder={t.dash.receipt.form.namePh}
              value={formData.name}
              onChange={(e) => {
                const val = e.target.value;
                const matched = materials.find(m => m.name.toLowerCase() === val.toLowerCase());
                if (matched) {
                  setFormData({
                    ...formData,
                    name: val,
                    unit: matched.unit || formData.unit,
                    unitCost: matched.unitCost || formData.unitCost,
                    counterparty: matched.counterparty || matched.supplier || formData.counterparty,
                    minThreshold: matched.minThreshold || formData.minThreshold
                  });
                } else {
                  setFormData({ ...formData, name: val });
                }
              }}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-sm font-semibold transition-colors"
            />
            <datalist id="shared-materials-datalist">
              {materials.map(m => (
                <option key={m.id} value={m.name}>
                  {t.dash.receipt.form.stockPrefix} {m.quantity} {m.unit}
                </option>
              ))}
            </datalist>
          </div>

          {/* Kontragent / Mijoz va To‘lov Usuli */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                {t.dash.receipt.form.counterpartyLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={t.dash.receipt.form.counterpartyPh}
                  value={formData.counterparty}
                  onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                />
                <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                {t.dash.receipt.form.paymentLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer"
                >
                  <option value="Bank hisob raqami (Perechisleniye)">{t.dash.receipt.payment.bank}</option>
                  <option value="Naqd pul">{t.dash.receipt.payment.cash}</option>
                  <option value="Korporativ karta (Uzcard/Humo)">{t.dash.receipt.payment.card}</option>
                  <option value="Nasiya (Muddatli to‘lov)">{t.dash.receipt.payment.credit}</option>
                  <option value="Boshqa to‘lov">{t.dash.receipt.payment.other}</option>
                </select>
                <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* O'lchov birligi va Miqdori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/[0.06] border-2 border-amber-500/30">
            <div>
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                {t.dash.receipt.form.unitLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 cursor-pointer"
              >
                {unitOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-white text-stone-900 dark:bg-[#181512] dark:text-white font-semibold py-1.5"
                  >
                    {(t.dash.receipt.units as Record<string, string>)[opt.value] ?? opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                {t.dash.receipt.form.qtyLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  {formData.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Birlik Narxi va Minimal Zaxira */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                {t.dash.receipt.form.priceLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 font-semibold">{t.dash.receipt.form.totalLabel}</span>
                <span className="font-black text-amber-700 dark:text-amber-400 text-sm">
                  {formatUzbekSum(formData.quantity * formData.unitCost, t.dash.receipt.common.currencySuffix)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                {t.dash.receipt.form.minLabel}
              </label>
              <input
                type="number"
                min="0"
                value={formData.minThreshold}
                onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 mt-1 block">
                {t.dash.receipt.form.minHint}
              </span>
            </div>
          </div>

          {/* O'zbekiston vaqti bilan avtomatik sana va vaqt qayd etish */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-[#231D16] border-2 border-amber-300 dark:border-amber-600/40 text-stone-950 dark:text-white">
            <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs uppercase tracking-wide font-extrabold text-amber-900 dark:text-amber-300 block">
                {t.dash.receipt.time.title}
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono font-black text-sm text-stone-950 dark:text-white">
                  {editingMaterial ? formatDateTime(editingMaterial.lastRestocked) : `${getUzbekistanDisplayTime()}`}
                </span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-extrabold bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                  {t.dash.receipt.time.autoBadge}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Buttons */}
          <div className="pt-5 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs transition-colors cursor-pointer"
            >
              {t.dash.receipt.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              {editingMaterial ? t.dash.receipt.actions.saveEdit : t.dash.receipt.actions.saveNew}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
