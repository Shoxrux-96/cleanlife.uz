import React from 'react';
import { Award, HeartHandshake, UtensilsCrossed, Sparkles, Building2, CheckCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const WhyChooseUs: React.FC = () => {
  const { t } = useLanguage();
  const icons = [Award, HeartHandshake, UtensilsCrossed, Sparkles, Building2];
  const items = t.why.items;

  return (
    <section id="why-us" className="py-20 md:py-28 bg-white dark:bg-[#151312] border-t border-[#E2DBD1] dark:border-[#29221C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[#8C6207] dark:text-[#D4AF37] px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-[#201C17] border border-[#E2DBD1] dark:border-[#3D3326]">
            {t.why.badge}
          </span>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mt-3 mb-4">
            {t.why.title}
          </h2>

          <p className="text-[#6B6152] dark:text-[#A69C8E] text-base sm:text-lg">
            {t.why.desc}
          </p>
        </div>

        {/* 5 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {items.map((item, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-white dark:bg-[#191715] border border-[#E2DBD1] dark:border-[#2D261F] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#26201B] border border-[#E2DBD1] dark:border-[#483B2D] flex items-center justify-center text-[#8C6207] dark:text-[#D4AF37] group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#6B6152] dark:text-[#7A7165]">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="font-serif-luxury text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-3 group-hover:text-[#8C6207] dark:group-hover:text-[#D4AF37] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#6B6152] dark:text-[#9E9486] leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-stone-300 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-[#8C6207] dark:text-[#C59B27] font-mono">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{t.why.guarantee}</span>
                </div>
              </div>
            );
          })}

          {/* Special Anti-Clothing Factory Statement Card */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-[#F7EBD2] to-[#EFDFC0] dark:from-[#241C15] dark:to-[#171310] border-2 border-[#D4AF37]/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#8C6207] dark:text-[#E8C872] uppercase tracking-wider mb-3">
                <ShieldAlert className="w-4 h-4 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.why.principle}</span>
              </div>

              <h4 className="font-serif-luxury text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-3">
                {t.why.noSew}
              </h4>

              <p className="text-xs text-[#5C554A] dark:text-[#C7BDAF] leading-relaxed mb-4">
                {t.why.noSewDesc1}
                <strong className="text-[#1A1715] dark:text-[#FAF7F2]">{t.why.noSewStrong}</strong>
                {t.why.noSewDesc2}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-black/40 border border-[#E2DBD1] dark:border-white/10 text-[11px] text-[#6B6152] dark:text-[#A89E91] font-mono">
              {t.why.formula}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
