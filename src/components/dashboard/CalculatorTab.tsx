import React, { useState, useId } from 'react';
import { 
  Calculator, Sparkles, Check, ArrowRight, Layers, DollarSign, 
  Percent, Package, RefreshCw, ShoppingCart, Info, CheckCircle2 
} from 'lucide-react';
import { ErpProduct, RawMaterial } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface CalculatorTabProps {
  products: ErpProduct[];
  materials: RawMaterial[];
  selectedProductInitial?: ErpProduct | null;
  onCreateOrderFromCalc: (orderData: {
    productName: string;
    quantity: number;
    totalAmount: number;
    estimatedCost: number;
    technique: string;
  }) => void;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  products,
  materials,
  selectedProductInitial,
  onCreateOrderFromCalc
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedProductInitial?.id || products[0]?.id || ''
  );

  const [quantity, setQuantity] = useState<number>(100);
  const [techniqueType, setTechniqueType] = useState<'kashta' | 'ipak_bosma' | 'folga' | 'uv_lak'>('kashta');
  const [colorCount, setColorCount] = useState<number>(1);
  const [isExpress, setIsExpress] = useState<boolean>(false);
  const [needDesignVector, setNeedDesignVector] = useState<boolean>(false);
  const [marginPercent, setMarginPercent] = useState<number>(45);

  const { t } = useLanguage();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(Math.round(val)) + ' ' + t.dash.calc.units.som;
  };

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Dynamic cost calculations based on selections
  const baseItemCost = selectedProduct ? selectedProduct.baseCost : 50000;

  // Technique multiplier & base price
  let brandingBase = 15000;
  let techniqueName = t.dash.calc.tech.defaultName;

  if (techniqueType === 'kashta') {
    brandingBase = 18000 + (colorCount > 1 ? (colorCount - 1) * 4000 : 0);
    techniqueName = `${t.dash.calc.tech.kashtaA}${colorCount}${t.dash.calc.tech.kashtaB}`;
  } else if (techniqueType === 'ipak_bosma') {
    brandingBase = 8000 + (colorCount * 3500);
    techniqueName = `${t.dash.calc.tech.ipakA}${colorCount}${t.dash.calc.tech.ipakB}`;
  } else if (techniqueType === 'folga') {
    brandingBase = 14000;
    techniqueName = t.dash.calc.tech.folga;
  } else if (techniqueType === 'uv_lak') {
    brandingBase = 12000;
    techniqueName = t.dash.calc.tech.uv;
  }

  // Volume discount for branding
  let volumeDiscount = 1;
  if (quantity >= 1000) volumeDiscount = 0.70;
  else if (quantity >= 500) volumeDiscount = 0.80;
  else if (quantity >= 200) volumeDiscount = 0.90;

  const unitBrandingCost = brandingBase * volumeDiscount;
  const unitPackagingCost = selectedProduct ? selectedProduct.packagingCost : 3000;
  const unitLaborCost = (selectedProduct ? selectedProduct.laborCost : 6000) * volumeDiscount;

  // Express surcharge
  const expressMultiplier = isExpress ? 1.2 : 1;
  const vectorCost = needDesignVector ? 150000 : 0;

  // Total unit cost
  const unitTotalCost = (baseItemCost + unitBrandingCost + unitPackagingCost + unitLaborCost) * (isExpress ? 1.1 : 1);
  const totalBatchCost = (unitTotalCost * quantity) + vectorCost;

  // Selling price with desired margin
  // Margin = (Price - Cost) / Price => Price = Cost / (1 - Margin/100)
  const unitSellingPrice = unitTotalCost / (1 - marginPercent / 100);
  const totalBatchRevenue = (unitSellingPrice * quantity) + vectorCost;
  const netProfit = totalBatchRevenue - totalBatchCost;
  const effectiveMargin = ((netProfit / totalBatchRevenue) * 100).toFixed(1);

  // Material requirements estimation
  const estimateMaterials = () => {
    const list: { name: string; amount: string; cost: number }[] = [];
    if (!selectedProduct) return list;

    list.push({
      name: `${selectedProduct.name} ${t.dash.calc.mats.blank}`,
      amount: `${quantity} ${t.dash.calc.mats.piece}`,
      cost: baseItemCost * quantity
    });

    if (techniqueType === 'kashta') {
      const bobinas = Math.ceil((quantity * 2500 * colorCount) / 50000);
      list.push({
        name: t.dash.calc.mats.thread,
        amount: `${bobinas} ${t.dash.calc.mats.bobbin}`,
        cost: bobinas * 95000
      });
    } else if (techniqueType === 'ipak_bosma' || techniqueType === 'uv_lak') {
      const liters = ((quantity * 5) / 1000).toFixed(2);
      list.push({
        name: t.dash.calc.mats.paint,
        amount: `${liters} ${t.dash.calc.mats.liter}`,
        cost: Math.round(parseFloat(liters) * 320000)
      });
    } else if (techniqueType === 'folga') {
      const meters = Math.ceil(quantity * 0.15);
      list.push({
        name: t.dash.calc.mats.foil,
        amount: `${meters} ${t.dash.calc.mats.meter}`,
        cost: Math.round((meters / 120) * 185000)
      });
    }

    list.push({
      name: t.dash.calc.mats.pack,
      amount: `${quantity} ${t.dash.calc.mats.set}`,
      cost: unitPackagingCost * quantity
    });

    return list;
  };

  const materialsNeeded = estimateMaterials();

  const handleCreateOrder = () => {
    if (!selectedProduct) return;
    onCreateOrderFromCalc({
      productName: selectedProduct.name,
      quantity,
      totalAmount: Math.round(totalBatchRevenue),
      estimatedCost: Math.round(totalBatchCost),
      technique: techniqueName + (isExpress ? t.dash.calc.tech.expressSuffix : '')
    });
  };

  return (
    <div className="space-y-6">
      {/* Two Column Layout: Controls & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Product Selection */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1815] border border-stone-200 dark:border-[#382F25] shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-amber-700 dark:text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              {t.dash.calc.step1.title}
            </h3>

            <div>
              <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1.5">
                {t.dash.calc.step1.productLabel}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({t.dash.calc.step1.baza} {formatCurrency(p.baseCost)})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Selector with quick presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5]">
                  {t.dash.calc.step1.qtyLabel}
                </label>
                <span className="text-sm font-bold text-amber-600 dark:text-[#D4AF37]">{quantity} {t.dash.calc.step1.qtyUnit}</span>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-2">
                {[50, 100, 250, 500, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuantity(val)}
                    className={`py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      quantity === val
                        ? 'bg-amber-500/20 text-amber-800 dark:text-[#D4AF37] border border-amber-500/40 font-bold'
                        : 'bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-[#7A6F62] dark:text-[#A89F93] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {val} {t.dash.calc.step1.qtyUnit}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-xs text-[#1A1715] dark:text-[#FDFBF7] outline-none"
                placeholder={t.dash.calc.step1.qtyPh}
              />
            </div>
          </div>

          {/* 2. Branding Technique */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1815] border border-stone-200 dark:border-[#382F25] shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-amber-700 dark:text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {t.dash.calc.step2.title}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'kashta', label: t.dash.calc.step2.techKashta, desc: t.dash.calc.step2.techKashtaDesc },
                { id: 'ipak_bosma', label: t.dash.calc.step2.techIpak, desc: t.dash.calc.step2.techIpakDesc },
                { id: 'folga', label: t.dash.calc.step2.techFolga, desc: t.dash.calc.step2.techFolgaDesc },
                { id: 'uv_lak', label: t.dash.calc.step2.techUv, desc: t.dash.calc.step2.techUvDesc },
              ].map(tech => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => setTechniqueType(tech.id as any)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    techniqueType === tech.id
                      ? 'border-amber-500 bg-amber-500/15'
                      : 'border-stone-200 dark:border-[#382F25] bg-stone-50 dark:bg-[#141210] text-[#7A6F62] dark:text-[#A89F93] hover:border-amber-500/30'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1715] dark:text-[#FDFBF7]">{tech.label}</div>
                  <div className="text-[11px] text-[#7A6F62] dark:text-[#8E8476] mt-0.5">{tech.desc}</div>
                </button>
              ))}
            </div>

            {/* Colors count */}
            {(techniqueType === 'kashta' || techniqueType === 'ipak_bosma') && (
              <div>
                <label className="block text-xs font-medium text-[#5C5346] dark:text-[#C8C0B5] mb-1.5">
                  {t.dash.calc.step2.colorsA} <strong className="text-amber-600 dark:text-[#D4AF37]">{colorCount} {t.dash.calc.step2.colorsB}</strong>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 6].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setColorCount(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        colorCount === num
                          ? 'bg-amber-500/20 text-amber-800 dark:text-[#D4AF37] border border-amber-500/40'
                          : 'bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#382F25] text-[#7A6F62] dark:text-[#8E8476]'
                      }`}
                    >
                      {num} {t.dash.calc.step2.colorUnit}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Margin & Extra Services */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1815] border border-stone-200 dark:border-[#382F25] shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-amber-700 dark:text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-4 h-4" />
              {t.dash.calc.step3.title}
            </h3>

            {/* Margin Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#5C5346] dark:text-[#C8C0B5]">{t.dash.calc.step3.marginLabel}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{marginPercent}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="70"
                step="5"
                value={marginPercent}
                onChange={(e) => setMarginPercent(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7A6F62] dark:text-[#8E8476] mt-1">
                <span>{t.dash.calc.step3.min}</span>
                <span>{t.dash.calc.step3.std}</span>
                <span>{t.dash.calc.step3.max}</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-[#2D251D]">
              <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2D251D] cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[#1A1715] dark:text-[#FDFBF7] block">{t.dash.calc.step3.expressTitle}</span>
                  <span className="text-[11px] text-[#7A6F62] dark:text-[#8E8476]">{t.dash.calc.step3.expressDesc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isExpress}
                  onChange={(e) => setIsExpress(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2D251D] cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[#1A1715] dark:text-[#FDFBF7] block">{t.dash.calc.step3.vectorTitle}</span>
                  <span className="text-[11px] text-[#7A6F62] dark:text-[#8E8476]">{t.dash.calc.step3.vectorDesc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={needDesignVector}
                  onChange={(e) => setNeedDesignVector(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Calculation Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-b dark:from-[#251F19] dark:to-[#171412] border-2 border-amber-500/40 shadow-sm relative sticky top-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-[#3E342B] mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-[#D4AF37] tracking-wider">{t.dash.calc.summary.badge}</span>
                <h3 className="text-lg font-bold text-[#1A1715] dark:text-[#FDFBF7]">{t.dash.calc.summary.title}</h3>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-[#D4AF37] text-xs font-bold">
                {quantity} {t.dash.calc.summary.qtyUnit}
              </div>
            </div>

            {/* Birlik Hisobi */}
            <div className="space-y-2.5 text-xs pb-4 border-b border-stone-200 dark:border-[#3E342B]">
              <div className="flex justify-between text-[#7A6F62] dark:text-[#8E8476]">
                <span>{t.dash.calc.summary.rawPer}</span>
                <span className="text-[#1A1715] dark:text-[#DDD6CC] font-mono font-medium">{formatCurrency(baseItemCost)}</span>
              </div>
              <div className="flex justify-between text-[#7A6F62] dark:text-[#8E8476]">
                <span>{t.dash.calc.summary.brandPer}</span>
                <span className="text-[#1A1715] dark:text-[#DDD6CC] font-mono font-medium">{formatCurrency(unitBrandingCost)}</span>
              </div>
              <div className="flex justify-between text-[#7A6F62] dark:text-[#8E8476]">
                <span>{t.dash.calc.summary.packLabor}</span>
                <span className="text-[#1A1715] dark:text-[#DDD6CC] font-mono font-medium">{formatCurrency(unitPackagingCost + unitLaborCost)}</span>
              </div>
              <div className="flex justify-between text-[#1A1715] dark:text-[#DDD7CD] font-semibold pt-1 border-t border-stone-200 dark:border-[#332A21]">
                <span>{t.dash.calc.summary.unitCost}</span>
                <span className="text-[#1A1715] dark:text-[#FDFBF7] font-mono font-bold">{formatCurrency(unitTotalCost)}</span>
              </div>
              <div className="flex justify-between text-amber-700 dark:text-[#D4AF37] font-bold text-sm">
                <span>{t.dash.calc.summary.recPrice}</span>
                <span className="font-mono">{formatCurrency(unitSellingPrice)}</span>
              </div>
            </div>

            {/* Partiya Hisobi */}
            <div className="py-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#332A21] space-y-2">
                <div className="flex justify-between text-xs text-[#7A6F62] dark:text-[#8E8476]">
                  <span>{t.dash.calc.summary.batchCost}</span>
                  <span className="text-[#1A1715] dark:text-[#DDD7CD] font-mono font-semibold">{formatCurrency(totalBatchCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#7A6F62] dark:text-[#8E8476]">
                  <span>{t.dash.calc.summary.batchRevenue}</span>
                  <span className="text-[#1A1715] dark:text-[#FDFBF7] font-mono font-bold text-sm">{formatCurrency(totalBatchRevenue)}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 dark:border-[#261F18] flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t.dash.calc.summary.netA}{effectiveMargin}%{t.dash.calc.summary.netB}</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sarflanadigan Materiallar */}
            <div className="mb-5">
              <h4 className="text-[11px] font-bold text-[#5C5346] dark:text-[#C8C0B5] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-[#D4AF37]" />
                {t.dash.calc.summary.materialsTitle}
              </h4>
              <div className="space-y-1.5 text-xs">
                {materialsNeeded.map((mat, i) => (
                  <div key={i} className="flex justify-between text-[11px] p-2 rounded-xl bg-stone-50 dark:bg-[#181412] border border-stone-200 dark:border-[#2B231B]">
                    <span className="text-[#7A6F62] dark:text-[#8E8476]">{mat.name}:</span>
                    <span className="text-[#1A1715] dark:text-[#DDD6CC] font-medium">{mat.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action button: Convert to Order */}
            <button
              onClick={handleCreateOrder}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t.dash.calc.summary.attach}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
