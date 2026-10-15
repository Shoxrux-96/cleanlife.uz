import React, { useState } from 'react';
import { 
  Package, Plus, Search, Tag, DollarSign, Percent, Sparkles, 
  Trash2, Edit3, Shirt, Box, ShoppingBag, CreditCard, QrCode, 
  Scissors, Check, AlertCircle, ArrowRight
} from 'lucide-react';
import { ErpProduct } from '../../types/erp';
import { useLanguage } from '../../context/LanguageContext';

interface ProductsTabProps {
  products: ErpProduct[];
  onAddProduct: (product: Omit<ErpProduct, 'id'>) => void;
  onUpdateProduct: (product: ErpProduct) => void;
  onDeleteProduct: (id: string) => void;
  onSelectForCalculation: (product: ErpProduct) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onSelectForCalculation
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ErpProduct | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'kiyimlar' as ErpProduct['category'],
    baseCost: 50000,
    brandingCost: 15000,
    packagingCost: 3000,
    laborCost: 7000,
    sellingPrice: 110000,
    minOrder: 10,
    stockCount: 50,
    soldCount: 0,
    technique: 'Mashina kashtasi yoki UV bosma'
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.products.currency.suffix;
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.technique.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Open modal for editing or new
  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'kiyimlar',
      baseCost: 40000,
      brandingCost: 15000,
      packagingCost: 3000,
      laborCost: 7000,
      sellingPrice: 95000,
      minOrder: 15,
      stockCount: 50,
      soldCount: 0,
      technique: 'Mashina kashtasi'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ErpProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      baseCost: p.baseCost,
      brandingCost: p.brandingCost,
      packagingCost: p.packagingCost,
      laborCost: p.laborCost,
      sellingPrice: p.sellingPrice,
      minOrder: p.minOrder,
      stockCount: p.stockCount,
      soldCount: p.soldCount,
      technique: p.technique
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData
      });
    } else {
      onAddProduct({
        ...formData,
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        specification: 'Standart korxona spetsifikatsiyasi',
        bom: []
      });
    }
    setIsModalOpen(false);
  };

  // Helper calculation
  const calculateTotalCost = (p: { baseCost: number; brandingCost: number; packagingCost: number; laborCost: number }) => {
    return p.baseCost + p.brandingCost + p.packagingCost + p.laborCost;
  };

  const calculateMargin = (cost: number, price: number) => {
    if (price <= 0) return 0;
    return (((price - cost) / price) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#181513] border border-[#352D24] shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-[#FDFBF7] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D4AF37]" />
            {t.dash.products.header.title}
          </h2>
          <p className="text-xs text-[#8E8476] mt-0.5">
            {t.dash.products.header.desc}
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E2BE46] text-black text-xs font-bold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t.dash.products.header.add}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8476]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dash.products.search.placeholder}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#1C1815] border border-[#352D24] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: t.dash.products.cats.all },
            { id: 'kiyimlar', label: t.dash.products.cats.clothes },
            { id: 'stol', label: t.dash.products.cats.table },
            { id: 'qadoq', label: t.dash.products.cats.pack },
            { id: 'aksessuar', label: t.dash.products.cats.access }
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
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const totalCost = calculateTotalCost(product);
          const profit = product.sellingPrice - totalCost;
          const margin = calculateMargin(totalCost, product.sellingPrice);

          return (
            <div 
              key={product.id}
              className="rounded-2xl bg-[#1C1815] border border-[#382F25] p-5 shadow-lg flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] px-2 py-0.5 rounded bg-[#262019] border border-[#423627]">
                      {product.category}
                    </span>
                    <h3 className="text-base font-bold text-[#FDFBF7] mt-1.5 group-hover:text-[#D4AF37] transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="p-1.5 rounded-lg text-[#8E8476] hover:text-[#D4AF37] hover:bg-white/5 transition-colors"
                      title={t.dash.products.card.editTitle}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      className="p-1.5 rounded-lg text-[#8E8476] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title={t.dash.products.card.deleteTitle}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#A89F93] mb-4 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                  <span>{product.technique}</span>
                </p>

                {/* Cost Breakdown Grid */}
                <div className="p-3.5 rounded-xl bg-[#141210] border border-[#2B231B] space-y-2 mb-4 text-xs">
                  <div className="flex justify-between text-[#8E8476]">
                    <span>{t.dash.products.card.base}</span>
                    <span className="text-[#DDD7CD] font-medium">{formatCurrency(product.baseCost)}</span>
                  </div>
                  <div className="flex justify-between text-[#8E8476]">
                    <span>{t.dash.products.card.branding}</span>
                    <span className="text-[#DDD7CD] font-medium">{formatCurrency(product.brandingCost)}</span>
                  </div>
                  <div className="flex justify-between text-[#8E8476]">
                    <span>{t.dash.products.card.pack}</span>
                    <span className="text-[#DDD7CD] font-medium">{formatCurrency(product.packagingCost)}</span>
                  </div>
                  <div className="flex justify-between text-[#8E8476]">
                    <span>{t.dash.products.card.labor}</span>
                    <span className="text-[#DDD7CD] font-medium">{formatCurrency(product.laborCost)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#2B231B] flex justify-between font-bold">
                    <span className="text-[#C8C0B5]">{t.dash.products.card.total}</span>
                    <span className="text-[#FDFBF7]">{formatCurrency(totalCost)}</span>
                  </div>
                </div>

                {/* Selling Price & Profit Margin */}
                <div className="p-3 rounded-xl bg-[#231D18] border border-[#453728] flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] text-[#A89F93] block uppercase tracking-wider">{t.dash.products.card.price}</span>
                    <span className="text-base font-bold text-[#D4AF37]">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block uppercase tracking-wider">{t.dash.products.card.profit}</span>
                    <span className="text-sm font-bold text-emerald-400">
                      +{formatCurrency(profit)} ({margin}%)
                    </span>
                  </div>
                </div>

                {/* Stock Stats */}
                <div className="flex items-center justify-between text-xs text-[#8E8476] px-1">
                  <span>{t.dash.products.card.inStock} <strong className="text-[#FDFBF7]">{product.stockCount} {t.dash.products.card.unit}</strong></span>
                  <span>{t.dash.products.card.sold} <strong className="text-[#DDD7CD]">{product.soldCount} {t.dash.products.card.unit}</strong></span>
                  <span>{t.dash.products.card.minOrder} <strong className="text-[#DDD7CD]">{product.minOrder} {t.dash.products.card.unit}</strong></span>
                </div>
              </div>

              {/* Action Button: Send to calculator */}
              <button
                onClick={() => onSelectForCalculation(product)}
                className="w-full mt-4 py-2 rounded-lg bg-[#272019] hover:bg-[#332A20] border border-[#483B2C] text-[#D4AF37] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>{t.dash.products.card.calc}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#1C1815] border border-[#3E342B] p-6 shadow-2xl text-[#EFECE6] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#FDFBF7] mb-1">
              {editingProduct ? t.dash.products.modal.editTitle : t.dash.products.modal.addTitle}
            </h3>
            <p className="text-xs text-[#8E8476] mb-4">
              {t.dash.products.modal.desc}
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                  {t.dash.products.modal.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.dash.products.modal.namePh}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#141210] border border-[#382F25] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                    {t.dash.products.modal.catLabel}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#141210] border border-[#382F25] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
                  >
                    <option value="kiyimlar">{t.dash.products.modal.optClothes}</option>
                    <option value="stol">{t.dash.products.modal.optTable}</option>
                    <option value="qadoq">{t.dash.products.modal.optPack}</option>
                    <option value="aksessuar">{t.dash.products.modal.optAccess}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                    {t.dash.products.modal.techLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.technique}
                    onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                    placeholder={t.dash.products.modal.techPh}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#141210] border border-[#382F25] focus:border-[#D4AF37] text-xs text-[#FDFBF7] outline-none"
                  />
                </div>
              </div>

              {/* Cost Inputs */}
              <div className="p-4 rounded-xl bg-[#141210] border border-[#2B231B] space-y-3">
                <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  {t.dash.products.modal.costTitle}
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#8E8476] mb-1">{t.dash.products.modal.baseLabel}</label>
                    <input
                      type="number"
                      value={formData.baseCost}
                      onChange={(e) => setFormData({ ...formData, baseCost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#201B17] border border-[#352D24] text-xs text-[#FDFBF7] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E8476] mb-1">{t.dash.products.modal.brandingLabel}</label>
                    <input
                      type="number"
                      value={formData.brandingCost}
                      onChange={(e) => setFormData({ ...formData, brandingCost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#201B17] border border-[#352D24] text-xs text-[#FDFBF7] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E8476] mb-1">{t.dash.products.modal.packLabel}</label>
                    <input
                      type="number"
                      value={formData.packagingCost}
                      onChange={(e) => setFormData({ ...formData, packagingCost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#201B17] border border-[#352D24] text-xs text-[#FDFBF7] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E8476] mb-1">{t.dash.products.modal.laborLabel}</label>
                    <input
                      type="number"
                      value={formData.laborCost}
                      onChange={(e) => setFormData({ ...formData, laborCost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#201B17] border border-[#352D24] text-xs text-[#FDFBF7] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#352D24] flex items-center justify-between text-xs font-bold text-[#FDFBF7]">
                  <span>{t.dash.products.modal.totalLabel}</span>
                  <span>{formatCurrency(calculateTotalCost(formData))}</span>
                </div>
              </div>

              {/* Selling price and stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                    {t.dash.products.modal.priceLabel}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#141210] border border-[#D4AF37]/50 text-sm font-bold text-[#D4AF37] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C8C0B5] mb-1">
                    {t.dash.products.modal.stockLabel}
                  </label>
                  <input
                    type="number"
                    value={formData.stockCount}
                    onChange={(e) => setFormData({ ...formData, stockCount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#141210] border border-[#382F25] text-xs text-[#FDFBF7] outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[#241E19] text-[#8E8476] hover:text-white text-xs font-semibold"
                >
                  {t.dash.products.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E2BE46] text-black text-xs font-bold shadow-md"
                >
                  {editingProduct ? t.dash.products.modal.saveEdit : t.dash.products.modal.saveAdd}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
