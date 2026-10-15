import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Send, CheckCircle2, Upload, Sparkles, Phone, MessageSquare, ShieldCheck, FileCheck } from 'lucide-react';
import { MockupRenderer } from './MockupRenderer';
import { getStoredQuotes, notifyCmsUpdated } from '../data/cmsInitialData';
import { QuoteRequest } from '../types';

interface QuoteFormProps {
  initialSelectedProduct?: string;
  onSuccess?: () => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({
  initialSelectedProduct,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+998 ',
    businessName: '',
    businessType: 'Restoran',
    quantityRange: '50-100 dona',
    notes: '',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    initialSelectedProduct ? [initialSelectedProduct] : ['Nam salfetka', 'Fartuk']
  );

  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const productOptions = [
    'Nam salfetka',
    'Tish kovlagich qutisi',
    'Fartuk',
    'Oshpaz kiyimi',
    'Ofitsiant kiyimi',
    'T-shirt / Polo',
    'Do‘ppi / bosh kiyim',
    'Qadoqlash',
    'Boshqa'
  ];

  const businessTypes = [
    'Restoran',
    'Kafe',
    'Choyxona',
    'Fast Food',
    'Coffee Shop',
    'Nonvoyxona',
    'Mehmonxona',
    'Catering',
    'Boshqa xizmat turi'
  ];

  const toggleProduct = (prod: string) => {
    setSelectedProducts((prev) =>
      prev.includes(prod) ? prev.filter((p) => p !== prod) : [...prev, prod]
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const stored = getStoredQuotes();
      const newQuote: QuoteRequest = {
        id: `quote-${Date.now()}`,
        fullName: formData.fullName.trim() || 'Noma’lum mijoz',
        phone: formData.phone.trim(),
        businessName: formData.businessName.trim() || 'Restoran / Kafe',
        businessType: formData.businessType,
        selectedProducts: selectedProducts,
        quantityRange: formData.quantityRange,
        notes: formData.notes.trim(),
        logoFile: logoFile,
        logoFileName: logoFileName,
        status: 'yangi',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('brendor_quote_requests', JSON.stringify([newQuote, ...stored]));
      notifyCmsUpdated('quotes');
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);

      // Trigger celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#E8C872', '#FAF7F2', '#332E2B']
      });

      if (onSuccess) onSuccess();
    }, 600);
  };

  const telegramMessage = encodeURIComponent(
    `Assalomu alaykum! Clean Life studiyasiga brending so'rovi:\n\n` +
    `👤 Ism: ${formData.fullName}\n` +
    `📞 Telefon: ${formData.phone}\n` +
    `🏢 Biznes: ${formData.businessName} (${formData.businessType})\n` +
    `📦 Mahsulotlar: ${selectedProducts.join(', ')}\n` +
    `🔢 Miqdor: ${formData.quantityRange}\n` +
    (formData.notes ? `📝 Izoh: ${formData.notes}\n` : '')
  );

  return (
    <section id="quote-form" className="py-20 md:py-28 bg-[#151312] border-t border-[#29221C] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#241F1A] border border-[#3E3428] text-xs font-mono text-[#8C6207] dark:text-[#D4AF37] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kalkulyatsiya va bepul konsultatsiya</span>
          </div>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mb-4">
            Brendingiz uchun taklif oling
          </h2>

          <p className="text-[#6B6152] dark:text-[#A69C8E] text-base sm:text-lg">
            Mahsulotlar va miqdorni tanlang, logotipingizni yuklang — mutaxassislarimiz 30 daqiqa
            ichida tayyor vizual namuna va hisob-kitobni taqdim etishadi.
          </p>
        </div>

        {isSubmitted ? (
          /* Confirmation Success Card */
          <div className="bg-white dark:bg-[#1C1916] border-2 border-[#D4AF37] rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-[#29221A] border-2 border-[#D4AF37] flex items-center justify-center text-[#8C6207] dark:text-[#D4AF37] mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="font-serif-luxury text-3xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-2">
              So‘rovingiz muvaffaqiyatli qabul qilindi!
            </h3>

            <p className="text-sm text-[#5C554A] dark:text-[#C8BFAF] leading-relaxed mb-6">
              Rahmat, <strong className="text-[#1A1715] dark:text-[#FAF7F2]">{formData.fullName}</strong>! Sizning{' '}
              <strong className="text-[#8C6207] dark:text-[#D4AF37]">{formData.businessName}</strong> uchun yuborgan so‘rovingiz mutaxassisimizga yetkazildi. Tez orada siz bilan bog‘lanamiz.
            </p>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B241E] text-left text-xs space-y-2 mb-6 text-[#6B6152] dark:text-[#A69C8E]">
              <div><strong>Tanlangan mahsulotlar:</strong> {selectedProducts.join(', ')}</div>
              <div><strong>Telefon:</strong> {formData.phone}</div>
              <div><strong>Hajm:</strong> {formData.quantityRange}</div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://t.me/brendor_horeca?text=${telegramMessage}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                Telegram orqali tezkor javob olish
              </a>

              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-stone-200 dark:bg-[#26201B] border border-[#E2DBD1] dark:border-[#483B2D] text-[#4A4033] dark:text-[#D8CEBF] text-xs font-semibold hover:bg-stone-300 dark:hover:bg-[#322A23] transition-colors"
              >
                Yana so‘rov yuborish
              </button>
            </div>
          </div>
        ) : (
          /* Main Form Layout with Live Preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Form Fields (Left) */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-7 bg-[#1A1715] border border-[#312921] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 flex flex-col justify-between h-full"
            >
              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                    Ismingiz *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Sardor Rahimov"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#332A22] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                    Telefon raqamingiz *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+998 (90) 123-45-67"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#332A22] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Business Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                    Biznes / Restoran nomi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Sulton Saroy"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#332A22] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                    Biznes turi
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#332A22] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  >
                    {businessTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Qaysi mahsulotlarni brendlash kerak? (Required checkboxes) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8C6207] dark:text-[#D4AF37] mb-2 font-bold">
                  Qaysi mahsulotlarni brendlash kerak? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {productOptions.map((prod) => {
                    const isChecked = selectedProducts.includes(prod);
                    return (
                      <button
                        key={prod}
                        type="button"
                        onClick={() => toggleProduct(prod)}
                        className={`p-2.5 rounded-lg text-xs font-medium text-left flex items-center gap-2 border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-100 dark:bg-[#29221A] border-[#D4AF37] text-[#1A1715] dark:text-[#FAF7F2]'
                            : 'bg-stone-50 dark:bg-[#141210] border-[#E2DBD1] dark:border-[#29221C] text-[#6B6152] dark:text-[#8E8578] hover:border-[#D4AF37] dark:hover:border-[#3D3326]'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold text-[10px]'
                              : 'border-[#4A3F33]'
                          }`}
                        >
                          {isChecked && '✓'}
                        </span>
                        <span className="truncate">{prod}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                  Taxminiy miqdor
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['10-50 dona', '50-200 dona', '500-1,000 dona', '2,000+ dona'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setFormData({ ...formData, quantityRange: q })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        formData.quantityRange === q
                          ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                          : 'bg-stone-50 dark:bg-[#141210] border-[#E2DBD1] dark:border-[#2D261F] text-[#6B6152] dark:text-[#8E8578] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                  Logotipingizni yuklang (ixtiyoriy)
                </label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#E2DBD1] dark:border-[#3B3126] hover:border-[#D4AF37] rounded-xl cursor-pointer bg-stone-50 dark:bg-[#141210] transition-colors group">
                  <Upload className="w-6 h-6 text-[#6B6152] dark:text-[#A69C8E] group-hover:text-[#8C6207] dark:group-hover:text-[#D4AF37] mb-1 transition-colors" />
                  <span className="text-xs text-[#4A4033] dark:text-[#D8CEBF]">
                    {logoFileName ? logoFileName : 'Faylni tanlang (AI, EPS, CDR, PNG, JPG, PDF)'}
                  </span>
                  <span className="text-[10px] text-[#6B6152] dark:text-[#7A7164] mt-0.5 font-mono">
                    Agar logotipingiz bo‘lmasa, dizaynerimiz yordam beradi
                  </span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.cdr,.eps"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89F93] mb-1.5">
                  Izoh yoki alohida istaklaringiz
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Bizga 20 ta qora fartuk va 2,000 ta nam salfetka kerak..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#332A22] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Disclaimer reminder */}
              <div className="flex items-center gap-2 text-xs text-[#6B6152] dark:text-[#A89E91] bg-stone-50 dark:bg-[#141210] p-3 rounded-lg border border-[#E2DBD1] dark:border-[#26211C]">
                <ShieldCheck className="w-4 h-4 text-[#8C6207] dark:text-[#D4AF37] shrink-0" />
                <span>
                  Eslatma: Biz kiyim tikmaymiz — tayyor mahsulotlarga logotipingizni professional
                  joylashtiramiz.
                </span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-[#121110] font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-98"
              >
                <span>{isSubmitting ? 'Tayyorlanmoqda...' : 'Bepul taklif olish'}</span>
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Live Visual Mockup Preview (Right) */}
            <div className="lg:col-span-5 bg-[#171513] border border-[#312921] rounded-3xl p-6 sm:p-8 flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-stone-300 dark:border-white/5 mb-4">
                  <span className="text-xs font-mono text-[#8C6207] dark:text-[#D4AF37] uppercase tracking-wider">
                    Jonli namuna (Live Preview)
                  </span>
                  <span className="text-[10px] text-[#8A8174] font-mono">
                    3D vizualizatsiya
                  </span>
                </div>

                <div className="text-center mb-4">
                  <h4 className="font-serif-luxury text-xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
                    {formData.businessName || 'SIZNING RESTORANINGIZ'}
                  </h4>
                  <p className="text-[10px] uppercase tracking-widest text-[#B5ABA0]">
                    {formData.businessType} • BRENDLANGAN NAMUNA
                  </p>
                </div>

                {/* Preview of chosen products */}
                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className="p-3.5 rounded-2xl bg-[#121110] border border-[#2B231D] flex flex-col items-center overflow-hidden">
                    <span className="text-[10px] font-mono text-[#8C8376] mb-1">
                      Nam salfetkada logotip ko‘rinishi:
                    </span>
                    <MockupRenderer
                      type="wetwipe"
                      isBranded={true}
                      brandName={formData.businessName || 'SIZNING RESTORAN'}
                      brandTagline={formData.businessType}
                      accentColor="#D4AF37"
                      className="w-full h-36"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#121110] border border-[#2B231D] flex flex-col items-center overflow-hidden">
                    <span className="text-[10px] font-mono text-[#8C8376] mb-1">
                      Fartukda professional kashta va eskiz ko‘rinishi:
                    </span>
                    <div className="w-full h-64 sm:h-72 flex items-center justify-center overflow-hidden p-1">
                      <MockupRenderer
                        type="apron"
                        isBranded={true}
                        brandName={formData.businessName || 'SIZNING RESTORAN'}
                        brandTagline={formData.businessType}
                        accentColor="#D4AF37"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Telegram fast channel */}
              <div className="mt-6 pt-4 border-t border-stone-300 dark:border-white/5 text-center">
                <span className="text-xs text-[#8A8175] block mb-2">
                  Formani to‘ldirishga vaqtingiz yo‘qmi?
                </span>
                <a
                  href="https://t.me/brendor_horeca"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">To‘g‘ridan-to‘g‘ri Telegram’ga yozish</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
