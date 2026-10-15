import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Layers, Calculator, 
  CheckCircle2, ArrowRight, Eye, Calendar, Sparkles, X, Edit, Trash2,
  Image as ImageIcon, Upload, Link as LinkIcon, LayoutGrid, Table2
} from 'lucide-react';
import { ErpProduct, RawMaterial, BomItem } from '../../types/erp';
import { TablePagination } from './TablePagination';
import { useLanguage } from '../../context/LanguageContext';

// Tayyor mahsulot qo'shilganda moliya sahifasiga CHIQIM sifatida yozish uchun ma'lumot
export interface ProductProductionPayload {
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  amount: number;
}

interface ProductionProductsTabProps {
  products: ErpProduct[];
  materials: RawMaterial[];
  onAddProduct: (product: Omit<ErpProduct, 'id'>) => void;
  onUpdateProduct: (product: ErpProduct) => void;
  onDeleteProduct: (id: string) => void;
  onSelectForCalculator?: (product: ErpProduct) => void;
  onRecordProduction?: (payload: ProductProductionPayload) => void;
}

export const ProductionProductsTab: React.FC<ProductionProductsTabProps> = ({
  products,
  materials,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onSelectForCalculator,
  onRecordProduction
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ErpProduct | null>(null);

  // Ko'rinish rejimi: jadval yoki kartochka
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Pagination States (10, 30, 50)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // New/Edit Product Form
  const initialFormData = {
    name: '',
    imageUrl: '',
    baseCost: 35000,
    sellingPrice: 85000,
    stockCount: 150,
    specification: '100% paxta kanvas, yuqori sifatli korporativ bichim, mashina kashtasi'
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: ErpProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      imageUrl: p.imageUrl || '',
      baseCost: p.baseCost,
      sellingPrice: p.sellingPrice,
      stockCount: p.stockCount,
      specification: p.specification || p.technique || ''
    });
    setIsAddModalOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) ||
           p.sku.toLowerCase().includes(term) ||
           (p.category && p.category.toLowerCase().includes(term)) ||
           (p.technique && p.technique.toLowerCase().includes(term));
  });

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalReadyStock = products.reduce((acc, p) => acc + p.stockCount, 0);
  const totalStockWorth = products.reduce((acc, p) => acc + (p.stockCount * p.sellingPrice), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: formData.name,
        imageUrl: formData.imageUrl || editingProduct.imageUrl,
        baseCost: formData.baseCost,
        sellingPrice: formData.sellingPrice,
        stockCount: formData.stockCount,
        specification: formData.specification,
        technique: formData.specification
      });
    } else {
      // Build default BOM based on available materials
      const defaultBom: BomItem[] = materials.slice(0, 2).map(m => ({
        materialId: m.id,
        materialName: m.name,
        quantityNeeded: 1,
        unit: m.unit,
        unitCost: m.unitCost,
        totalCost: m.unitCost
      }));

      const newProd: Omit<ErpProduct, 'id'> = {
        name: formData.name,
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80',
        sku: `HRC-${Math.floor(100 + Math.random() * 900)}`,
        category: 'kiyimlar',
        baseCost: formData.baseCost,
        brandingCost: 0,
        packagingCost: 0,
        laborCost: 0,
        sellingPrice: formData.sellingPrice,
        minOrder: 1,
        stockCount: formData.stockCount,
        soldCount: 0,
        technique: formData.specification || 'Mashina kashtasi yoki UV bosma',
        specification: formData.specification || 'Yuqori sifatli korporativ tayyor mahsulot',
        readyDate: new Date().toISOString().split('T')[0],
        batchNumber: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
        bom: defaultBom
      };

      onAddProduct(newProd);

      // Moliya sahifasiga avtomatik CHIQIM yozish (ishlab chiqarish tannarxi)
      const tannarx =
        (newProd.baseCost || 0) +
        (newProd.brandingCost || 0) +
        (newProd.packagingCost || 0) +
        (newProd.laborCost || 0);
      const amount = Math.round(tannarx * (newProd.stockCount || 0));
      onRecordProduction?.({
        productName: newProd.name,
        sku: newProd.sku,
        quantity: newProd.stockCount || 0,
        unitCost: Math.round(tannarx),
        amount: amount > 0 ? amount : Math.round(tannarx)
      });
    }

    setIsAddModalOpen(false);
    setEditingProduct(null);
    setFormData(initialFormData);
  };

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.production.common.currencySuffix;
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
            {t.dash.production.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.production.header.subtitle}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.dash.production.header.addButton}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.production.summary.models}</span>
          <div className="text-xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mt-1">
            {products.length} {t.dash.production.summary.modelsSuffix}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.production.summary.stock}</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {new Intl.NumberFormat('uz-UZ').format(totalReadyStock)} {t.dash.production.summary.piece}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.production.summary.salesValue}</span>
          <div className="text-xl font-bold text-amber-600 dark:text-[#D4AF37] mt-1">
            {formatUzbekSum(totalStockWorth)}
          </div>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t.dash.production.search.placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] self-start sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.production.search.tableTitle}
            >
              <Table2 className="w-4 h-4" />
              <span>{t.dash.production.search.table}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.production.search.cardsTitle}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t.dash.production.search.cards}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#1C1814] border border-dashed border-[#E2DBD1] dark:border-[#382F26] text-center">
          <Package className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-600" />
          <p className="mt-3 text-sm font-bold text-stone-600 dark:text-stone-300">
            {t.dash.production.empty.title}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            {t.dash.production.empty.subtitle}
          </p>
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && filteredProducts.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[#E2DBD1] dark:border-[#382F26] bg-white dark:bg-[#1C1814]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-stone-50 dark:bg-[#141210] border-b border-[#E2DBD1] dark:border-[#2D251D] text-left">
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider w-14">{t.dash.production.table.image}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider">{t.dash.production.table.product}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider">{t.dash.production.table.category}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider text-right">{t.dash.production.table.cost}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider text-right">{t.dash.production.table.price}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider text-right">{t.dash.production.table.margin}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider text-right">{t.dash.production.table.stock}</th>
                  <th className="px-3 py-3 font-bold text-[#7A6F62] dark:text-[#A69C8E] uppercase tracking-wider text-right">{t.dash.production.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((prod, idx) => {
                  const totalCost = prod.baseCost + prod.brandingCost + prod.packagingCost + prod.laborCost;
                  const profit = prod.sellingPrice - totalCost;
                  const margin = prod.sellingPrice > 0 ? ((profit / prod.sellingPrice) * 100).toFixed(1) : '0.0';

                  return (
                    <tr
                      key={prod.id}
                      className="border-b border-stone-100 dark:border-[#28211A] hover:bg-stone-50 dark:hover:bg-[#201B16] transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono text-stone-400 dark:text-stone-500">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        {prod.imageUrl ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-stone-200 dark:border-[#382F26] bg-stone-100 dark:bg-[#141210]">
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-[#D4AF37]">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-[#1A1715] dark:text-[#FAF7F2] max-w-[260px] truncate" title={prod.name}>
                          {prod.name}
                        </div>
                        <div className="font-mono text-[10px] text-[#C59B27] dark:text-[#D4AF37] font-bold">
                          {prod.sku}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 dark:bg-[#251E18] text-stone-600 dark:text-stone-300 capitalize">
                          {prod.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-stone-600 dark:text-stone-300 whitespace-nowrap">
                        {formatUzbekSum(totalCost)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-600 dark:text-[#D4AF37] whitespace-nowrap">
                        {formatUzbekSum(prod.sellingPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{margin}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        {new Intl.NumberFormat('uz-UZ').format(prod.stockCount)} {t.dash.production.summary.piece}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {onSelectForCalculator && (
                            <button
                              onClick={() => onSelectForCalculator(prod)}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                              title={t.dash.production.actions.calculator}
                            >
                              <Calculator className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                            title={t.dash.production.actions.edit}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(prod.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title={t.dash.production.actions.delete}
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && filteredProducts.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedProducts.map((prod) => {
          const totalCost = prod.baseCost + prod.brandingCost + prod.packagingCost + prod.laborCost;
          const profit = prod.sellingPrice - totalCost;
          const margin = ((profit / prod.sellingPrice) * 100).toFixed(1);

          return (
            <div
              key={prod.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3">
                  {prod.imageUrl ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 dark:border-[#382F26] shrink-0 bg-stone-100 dark:bg-[#141210] shadow-xs">
                      <img 
                        src={prod.imageUrl} 
                        alt={prod.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 dark:text-[#D4AF37]">
                      <Package className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-mono text-[10px] text-[#C59B27] dark:text-[#D4AF37] font-bold">
                        {prod.sku}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 dark:bg-[#251E18] text-stone-600 dark:text-stone-300 capitalize">
                        {prod.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2] mt-0.5 truncate" title={prod.name}>
                      {prod.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                  {prod.specification}
                </p>

                <div className="mt-3.5 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2C241D] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">{t.dash.production.card.materialCost}</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {formatUzbekSum(prod.baseCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">{t.dash.production.card.salePrice}</span>
                    <span className="font-bold text-amber-600 dark:text-[#D4AF37]">
                      {formatUzbekSum(prod.sellingPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-[#2A231C]">
                    <span className="text-stone-500">{t.dash.production.card.netMargin}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatUzbekSum(profit)} ({margin}%)
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                  <span>{t.dash.production.card.warehouseStock}</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {new Intl.NumberFormat('uz-UZ').format(prod.stockCount)} {t.dash.production.summary.piece}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-stone-100 dark:border-[#28211A] flex items-center justify-between gap-2">
                {onSelectForCalculator && (
                  <button
                    onClick={() => onSelectForCalculator(prod)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-[#D4AF37] transition-colors cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{t.dash.production.actions.calculator}</span>
                  </button>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => handleOpenEdit(prod)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                    title={t.dash.production.actions.edit}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(prod.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title={t.dash.production.actions.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {filteredProducts.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[#E2DBD1] dark:border-[#382F26]">
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 30, 50]}
          />
        </div>
      )}

      {/* Modal: Yangi Tayyor Mahsulot Qo‘shish / Tahrirlash */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border-2 border-stone-300 dark:border-[#382F26] rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-200 dark:border-[#2D251D] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#D4AF37]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-950 dark:text-white">
                    {editingProduct ? t.dash.production.modal.titleEdit : t.dash.production.modal.titleAdd}
                  </h3>
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                    {t.dash.production.modal.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 1. Mahsulot Nomi * */}
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                  {t.dash.production.modal.nameLabel} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.dash.production.modal.namePlaceholder}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>

              {/* Mahsulot Logosi yoki Rasmi */}
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                  {t.dash.production.modal.imageLabel}
                </label>
                
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#2E2720]">
                  <div className="flex items-center gap-3.5">
                    {formData.imageUrl ? (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-500/50 shrink-0 bg-white dark:bg-[#181512] shadow-sm">
                        <img 
                          src={formData.imageUrl} 
                          alt={t.dash.production.modal.preview} 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow-sm"
                          title={t.dash.production.modal.removeImage}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-stone-300 dark:border-[#382F26] flex flex-col items-center justify-center shrink-0 text-stone-400 bg-white dark:bg-[#181512]">
                        <ImageIcon className="w-5 h-5 text-amber-500/70" />
                        <span className="text-[9px] font-bold mt-1 text-stone-400">{t.dash.production.modal.noImage}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-[#E6C774] text-xs font-bold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{t.dash.production.modal.upload}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>

                        {formData.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-rose-500 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {t.dash.production.modal.clear}
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="url"
                          placeholder={t.dash.production.modal.urlPlaceholder}
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#1A1816] border border-stone-300 dark:border-[#382F26] text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                        <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 & 3. Material Xarajati (so‘m) & Sotuv Narxi (so‘m) * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.production.modal.materialCost}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.baseCost}
                    onChange={(e) => setFormData({ ...formData, baseCost: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                    {t.dash.production.modal.salePrice} <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-amber-700 dark:text-[#E6C774] font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* 4. Ombordagi  Zaxira (dona) */}
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                  {t.dash.production.modal.stock}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockCount}
                  onChange={(e) => setFormData({ ...formData, stockCount: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                />
              </div>

              {/* 5. Spetsifikatsiya va Ishlab chiqarish texnikasi */}
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 mb-1.5 uppercase tracking-wide">
                  {t.dash.production.modal.spec}
                </label>
                <textarea
                  rows={3}
                  placeholder={t.dash.production.modal.specPlaceholder}
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12100E] border-2 border-stone-300 dark:border-[#382F26] text-stone-950 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t-2 border-stone-200 dark:border-[#2D251D] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold text-xs hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  {t.dash.production.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  {editingProduct ? t.dash.production.modal.saveEdit : t.dash.production.modal.saveAdd}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
