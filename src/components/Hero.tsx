import React from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onOpenQuote: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenQuote }) => {
  const { t } = useLanguage();
  return (
    <section id="hero" className="relative pt-6 pb-20 md:py-24 overflow-hidden">
      {/* Background radial luxury lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#C59B27]/10 via-[#C59B27]/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#3B2D1F]/20 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-4 sm:pt-6">
        {/* Main Headline & Supporting Text */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="font-serif-luxury text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1A1715] dark:text-[#FAF7F2] leading-[1.08] mb-6">
            {t.hero.titleA}{' '}
            <span className="italic font-normal text-[#E8C872] relative inline-block">
              {t.hero.titleB}
              <span className="absolute left-0 bottom-1 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-70" />
            </span>{' '}
            {t.hero.titleC}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#5C554A] dark:text-[#BDB5A8] max-w-3xl mx-auto font-light leading-relaxed">
            {t.hero.desc}
          </p>

          {/* Visual Formula: LOGO -> MAHSULOT -> BREND */}
          <div className="mt-6 inline-flex items-center justify-center gap-3 px-5 py-2 rounded-lg bg-white dark:bg-[#181615] border border-[#E2DBD1] dark:border-[#332C25] text-xs tracking-widest uppercase font-mono text-[#8C6207] dark:text-[#D4AF37]">
            <span className="text-[#1A1715] dark:text-[#EFEBE4] font-bold">LOGO</span>
            <span className="text-[#8C6207] dark:text-[#C59B27] font-bold">→</span>
            <span className="text-[#1A1715] dark:text-[#EFEBE4] font-bold">MAHSULOT</span>
            <span className="text-[#8C6207] dark:text-[#C59B27] font-bold">→</span>
            <span className="text-[#E6C774] font-extrabold tracking-[0.2em] bg-[#2E2419] px-2 py-0.5 rounded border border-[#D4AF37]/30">
              BREND
            </span>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenQuote}
              className="w-full sm:w-auto px-8 py-4 rounded-md bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-[#121110] font-bold text-sm tracking-wider uppercase shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_35px_rgba(212,175,55,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
            >
              <span>{t.hero.start}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#portfolio"
              className="w-full sm:w-auto px-7 py-4 rounded-md bg-white dark:bg-[#1B1816] hover:bg-stone-100 dark:hover:bg-[#25211D] border border-[#E2DBD1] dark:border-[#3D352B] text-[#1A1715] dark:text-[#EFEBE4] font-medium text-sm transition-all flex items-center justify-center gap-2 text-center"
            >
              <Eye className="w-4 h-4 text-[#8C6207] dark:text-[#D4AF37]" />
              <span>{t.hero.viewProducts}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
