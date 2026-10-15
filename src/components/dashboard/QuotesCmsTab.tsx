import React, { useState } from 'react';
import { QuoteRequest, QuoteStatus } from '../../types';
import { ErpOrder } from '../../types/erp';
import { 
  FileText, Phone, MessageSquare, CheckCircle2, Clock, 
  ExternalLink, ArrowUpRight, Search, Plus, Trash2, 
  ShoppingBag, Building2, Package, Tag, User, X
} from 'lucide-react';
import { notifyCmsUpdated } from '../../data/cmsInitialData';

interface QuotesCmsTabProps {
  quotes: QuoteRequest[];
  onUpdateQuotes: (quotes: QuoteRequest[]) => void;
  onConvertToOrder?: (orderData: Partial<ErpOrder>) => void;
  showNotification: (msg: string) => void;
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; bg: string; text: string; border: string }> = {
  yangi: { label: 'Yangi so‘rov', bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/40' },
  boglanildi: { label: 'Bog‘lanildi', bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/40' },
  taklif_yuborildi: { label: 'Taklif yuborildi', bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/40' },
  shartnoma: { label: 'Shartnoma tuzildi', bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/40' },
  rad_etildi: { label: 'Rad etildi', bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/40' },
};

export const QuotesCmsTab: React.FC<QuotesCmsTabProps> = ({
  quotes,
  onUpdateQuotes,
  onConvertToOrder,
  showNotification
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);

  // Manual create form
  const [newQuoteData, setNewQuoteData] = useState({
    fullName: '',
    phone: '+998 ',
    businessName: '',
    businessType: 'Restoran',
    selectedProducts: ['Nam salfetka', 'Fartuk'],
    quantityRange: '100-300 dona',
    notes: ''
  });

  const handleStatusChange = (id: string, newStatus: QuoteStatus) => {
    const updated = quotes.map(q => q.id === id ? { ...q, status: newStatus } : q);
    onUpdateQuotes(updated);
    notifyCmsUpdated('quotes');
    showNotification(`So‘rov holati "${STATUS_CONFIG[newStatus].label}"ga o‘zgartirildi!`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Haqiqatan ham ushbu so‘rovni o‘chirmoqchimisiz?')) {
      const updated = quotes.filter(q => q.id !== id);
      onUpdateQuotes(updated);
      notifyCmsUpdated('quotes');
      showNotification('So‘rov o‘chirildi!');
    }
  };

  const handleCreateManualQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteData.fullName.trim() || !newQuoteData.phone.trim()) {
      alert('Iltimos, ism va telefon raqamini to‘ldiring!');
      return;
    }

    const created: QuoteRequest = {
      id: `quote-${Date.now()}`,
      fullName: newQuoteData.fullName.trim(),
      phone: newQuoteData.phone.trim(),
      businessName: newQuoteData.businessName.trim() || 'Yangi Mijoz',
      businessType: newQuoteData.businessType,
      selectedProducts: newQuoteData.selectedProducts,
      quantityRange: newQuoteData.quantityRange,
      notes: newQuoteData.notes.trim(),
      status: 'yangi',
      createdAt: new Date().toISOString()
    };

    onUpdateQuotes([created, ...quotes]);
    notifyCmsUpdated('quotes');
    showNotification('Yangi taklif so‘rovi muvaffaqiyatli saqlandi!');
    setIsNewModalOpen(false);
    setNewQuoteData({
      fullName: '',
      phone: '+998 ',
      businessName: '',
      businessType: 'Restoran',
      selectedProducts: ['Nam salfetka', 'Fartuk'],
      quantityRange: '100-300 dona',
      notes: ''
    });
  };

  const handleConvertQuoteToOrder = (quote: QuoteRequest) => {
    if (onConvertToOrder) {
      onConvertToOrder({
        clientName: quote.businessName || quote.fullName,
        phone: quote.phone,
        businessType: quote.businessType,
        productName: quote.selectedProducts.join(', '),
        quantity: parseInt(quote.quantityRange) || 100,
        notes: `Taklif so‘rovi asosida: ${quote.notes || ''}`
      });
      handleStatusChange(quote.id, 'shartnoma');
      showNotification('So‘rov ERP Buyurtmalar bo‘limiga muvaffaqiyatli o‘tkazildi!');
    } else {
      handleStatusChange(quote.id, 'shartnoma');
      showNotification('So‘rov shartnoma holatiga o‘tkazildi!');
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const matchStatus = activeFilter === 'all' || q.status === activeFilter;
    const matchSearch = 
      q.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.phone.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const newQuotesCount = quotes.filter(q => q.status === 'yangi').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1A1816] border border-[#302820] shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-serif-luxury text-[#FAF7F2] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              <span>Brendingiz Uchun Taklif Oling (Arizalar & Leads)</span>
            </h2>
            {newQuotesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold animate-pulse">
                +{newQuotesCount} yangi
              </span>
            )}
          </div>
          <p className="text-xs text-[#9E9486] mt-1">
            Saytdagi hisob-kitob va taklif olish formasidan kelib tushgan barcha HoReCa mijoz so‘rovlari.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E5C158] text-black font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi So‘rov Kiritish</span>
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#181614] border border-[#2B241D]">
          <span className="text-[11px] text-[#8E8476] font-mono block">Jami So‘rovlar</span>
          <span className="text-xl font-bold text-[#FAF7F2]">{quotes.length} ta</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#181614] border border-emerald-900/30">
          <span className="text-[11px] text-emerald-400 font-mono block">Yangi kelganlar</span>
          <span className="text-xl font-bold text-emerald-400">{newQuotesCount} ta</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#181614] border border-blue-900/30">
          <span className="text-[11px] text-blue-400 font-mono block">Bog‘lanilganlar</span>
          <span className="text-xl font-bold text-blue-400">{quotes.filter(q => q.status === 'boglanildi').length} ta</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#181614] border border-amber-900/30">
          <span className="text-[11px] text-amber-400 font-mono block">Taklif yuborildi</span>
          <span className="text-xl font-bold text-amber-400">{quotes.filter(q => q.status === 'taklif_yuborildi').length} ta</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#181614] border border-purple-900/30">
          <span className="text-[11px] text-purple-400 font-mono block">Shartnoma tuzildi</span>
          <span className="text-xl font-bold text-purple-400">{quotes.filter(q => q.status === 'shartnoma').length} ta</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#181614] p-3 rounded-xl border border-[#2C241D]">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#D4AF37] text-black font-bold'
                : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
            }`}
          >
            Barchasi ({quotes.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === key
                  ? 'bg-[#D4AF37] text-black font-bold'
                  : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
              }`}
            >
              {cfg.label} ({quotes.filter(q => q.status === key).length})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#8E8476] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mijoz, telefon, restoran..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#121110] border border-[#332A22] text-xs text-[#FAF7F2] focus:border-[#D4AF37] outline-none"
          />
        </div>
      </div>

      {/* Quotes Cards Grid */}
      <div className="space-y-3">
        {filteredQuotes.map(quote => {
          const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.yangi;
          const cleanPhone = quote.phone.replace(/[^0-9+]/g, '');

          return (
            <div
              key={quote.id}
              className="p-5 rounded-2xl bg-[#181614] border border-[#2D251D] hover:border-[#3D3328] transition-all shadow-md space-y-4"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#26201A] border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif-luxury font-bold text-base text-[#FAF7F2]">
                        {quote.businessName || 'Noma’lum Biznes'}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#241F1A] border border-[#3D3328] text-[#C4BBAE]">
                        {quote.businessType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9E9486] mt-0.5">
                      <span className="text-[#FAF7F2] font-medium">{quote.fullName}</span>
                      <span>•</span>
                      <span>{new Date(quote.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={quote.status}
                    onChange={(e) => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                  >
                    {Object.entries(STATUS_CONFIG).map(([stKey, stCfg]) => (
                      <option key={stKey} value={stKey} className="bg-[#181614] text-[#FAF7F2]">
                        {stCfg.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(quote.id)}
                    className="p-1.5 rounded-lg text-[#8E8476] hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Middle row: Selected products & Quantity */}
              <div className="p-3.5 rounded-xl bg-[#121110] border border-[#25201A] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-[#8E8476] font-mono block mb-1">Qiziqtirgan mahsulotlar:</span>
                  <div className="flex flex-wrap gap-1">
                    {quote.selectedProducts.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#201C18] border border-[#362D24] text-[#D4AF37] text-[11px]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-[#8E8476] font-mono block mb-1">Mo‘ljallangan adad (miqdor):</span>
                  <span className="font-semibold text-[#FAF7F2]">{quote.quantityRange}</span>
                </div>

                <div>
                  <span className="text-[11px] text-[#8E8476] font-mono block mb-1">Yuklangan Logo Fayl:</span>
                  {quote.logoFile ? (
                    <div className="flex items-center gap-2">
                      <img src={quote.logoFile} alt="Logo" className="w-8 h-8 rounded border border-white/20 object-contain bg-white/5" />
                      <span className="text-[11px] text-emerald-400 truncate">{quote.logoFileName || 'Logo biriktirilgan'}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#7E7466]">Fayl biriktirilmagan</span>
                  )}
                </div>
              </div>

              {/* Notes if any */}
              {quote.notes && (
                <div className="text-xs text-[#A89E90] bg-[#1B1815] p-2.5 rounded-lg border border-[#2E261E]">
                  <span className="text-[10px] text-[#8E8476] uppercase tracking-wider block font-bold mb-0.5">Mijoz Izohi:</span>
                  {quote.notes}
                </div>
              )}

              {/* Actions row: Call, Telegram, Convert to Order */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#25201A]">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#221D18] hover:bg-[#2F2720] border border-[#3B3227] text-xs font-semibold text-[#FAF7F2] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{quote.phone}</span>
                  </a>

                  <a
                    href={`https://t.me/+${cleanPhone.replace('+', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2936] hover:bg-[#23384B] border border-[#2E4559] text-xs font-semibold text-[#64B5F6] transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Telegramda bog‘lanish</span>
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  {quote.status !== 'shartnoma' && (
                    <button
                      onClick={() => handleConvertQuoteToOrder(quote)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-xs font-bold text-[#D4AF37] transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ERP Buyurtmaga O‘tkazish</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredQuotes.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#181614] border border-[#2B231B]">
            <FileText className="w-10 h-10 text-[#6E6456] mx-auto mb-3" />
            <h3 className="font-serif-luxury text-base text-[#FAF7F2]">Taklif so‘rovlari topilmadi</h3>
            <p className="text-xs text-[#8E8476] mt-1">Ushbu holat bo‘yicha hozircha arizalar mavjud emas.</p>
          </div>
        )}
      </div>

      {/* MANUAL CREATE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#171513] border border-[#3D3328] rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#2C241C] pb-3">
              <h3 className="font-serif-luxury text-base font-bold text-[#FAF7F2]">
                Yangi Taklif So‘rovini Kiritish
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-[#8E8476] hover:text-[#FAF7F2]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">Mijoz Ismi *</label>
                <input
                  type="text"
                  required
                  value={newQuoteData.fullName}
                  onChange={(e) => setNewQuoteData({ ...newQuoteData, fullName: e.target.value })}
                  placeholder="Ism Familiya"
                  className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">Telefon *</label>
                  <input
                    type="text"
                    required
                    value={newQuoteData.phone}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">Biznes Nomi</label>
                  <input
                    type="text"
                    value={newQuoteData.businessName}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, businessName: e.target.value })}
                    placeholder="Rayhon, Paul..."
                    className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">Biznes Turi</label>
                  <select
                    value={newQuoteData.businessType}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, businessType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Restoran">Restoran</option>
                    <option value="Kafe">Kafe</option>
                    <option value="Choyxona">Choyxona</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Coffee Shop">Coffee Shop</option>
                    <option value="Catering">Catering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">Adad (Miqdor)</label>
                  <input
                    type="text"
                    value={newQuoteData.quantityRange}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, quantityRange: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">Izoh / Ehtiyoj</label>
                <textarea
                  rows={2}
                  value={newQuoteData.notes}
                  onChange={(e) => setNewQuoteData({ ...newQuoteData, notes: e.target.value })}
                  placeholder="Mijoz nimalarni so‘ragan..."
                  className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#221D18] text-[#9E9486] text-xs font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] text-black text-xs font-bold"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
