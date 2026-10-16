import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Check, ArrowRight, Package } from 'lucide-react';

export const ProductsSection: React.FC = () => {
  const { t } = useLanguage();
  const p = (t as any).products;

  const goContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="products" className="py-20 md:py-28 bg-[#151312] border-t border-[#26211C] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241F1A] border border-[#3E352B] text-xs text-[#D4AF37] font-medium mb-3">
            <Package className="w-3.5 h-3.5" />
            <span>{p.badge}</span>
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#FDFBF7] tracking-tight mb-4 uppercase">
            {p.title}
          </h2>
          <p className="text-[#AFA699] text-base sm:text-lg">{p.sub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10">
          {p.items.map((item: { emoji: string; name: string }, i: number) => (
            <div
              key={i}
              className="group flex items-center gap-4 rounded-2xl bg-[#1A1816] border border-[#312B25] hover:border-[#D4AF37]/60 transition-all duration-300 px-5 py-4 hover:shadow-[0_10px_25px_-10px_rgba(0,0,0,0.7)]"
            >
              <span className="text-3xl shrink-0 group-hover:scale-110 transition-transform">
                {item.emoji}
              </span>
              <span className="text-[#EDE8DD] font-semibold text-[15px] leading-snug">
                {item.name}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10">
          {p.features.map((f: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-2 text-[#D4AF37] font-semibold text-sm sm:text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </span>
              {f}
            </span>
          ))}
        </div>

        <div className="text-center rounded-2xl bg-gradient-to-r from-[#241D12] via-[#2E2417] to-[#241D12] border border-[#D4AF37]/30 px-6 py-8">
          <p className="font-serif-luxury text-xl sm:text-2xl font-bold text-[#FDFBF7] mb-5">
            {p.cta}
          </p>
          <button
            onClick={goContact}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] text-black font-extrabold text-sm sm:text-base hover:shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)] transition-all cursor-pointer"
          >
            {p.order}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
