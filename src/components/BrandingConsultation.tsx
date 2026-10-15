import React from 'react';
import { Palette, Compass, Shirt, Coffee, Box, Users, Share2, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface BrandingConsultationProps {
  onOpenQuote: () => void;
}

export const BrandingConsultation: React.FC<BrandingConsultationProps> = ({ onOpenQuote }) => {
  const { t } = useLanguage();
  const icons = [Compass, Palette, Shirt, Coffee, Box, Share2];
  const brandingPillars = t.branding.pillars.map((p, i) => ({ ...p, icon: icons[i % icons.length] }));

  const brandFlowSteps = t.branding.flow;

  return (
    <section id="branding" className="py-20 md:py-28 bg-white dark:bg-[#131110] relative overflow-hidden">
      {/* Decorative luxury gradient */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#C59B27]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[#8C6207] dark:text-[#D4AF37] px-3 py-1 rounded bg-stone-100 dark:bg-[#241E18] border border-[#E2DBD1] dark:border-[#44382B]">
            {t.branding.badge}
          </span>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mt-3 mb-4">
            {t.branding.title}
          </h2>

          <p className="text-[#6B6152] dark:text-[#A89E91] text-base sm:text-lg">
            {t.branding.desc}
          </p>

          <p className="font-serif-luxury text-xl sm:text-2xl text-[#8C6207] dark:text-[#E8C872] italic mt-4">
            {t.branding.quote}
          </p>
        </div>

        {/* Visual Brand Flow: Restaurant Sign -> Staff -> Wet Wipe -> Toothpick -> Packaging -> Social */}
        <div className="mb-16 bg-white dark:bg-[#1A1815] border border-[#E2DBD1] dark:border-[#332A22] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <span className="text-xs font-mono uppercase tracking-widest text-[#5C554A] dark:text-[#B3A99B]">
              {t.branding.chain}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative">
            {brandFlowSteps.map((step, idx) => (
              <div
                key={step.label}
                className="relative flex flex-col items-center text-center p-3.5 rounded-xl bg-white dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B241D] hover:border-[#D4AF37]/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-[#241E18] border border-[#E2DBD1] dark:border-[#483B2D] flex items-center justify-center text-xs font-mono text-[#8C6207] dark:text-[#D4AF37] mb-2 group-hover:bg-[#D4AF37] group-hover:text-black transition-colors font-bold">
                  0{idx + 1}
                </div>
                <h5 className="font-serif-luxury text-sm font-bold text-[#1A1715] dark:text-[#F5F2EC] leading-tight">
                  {step.label}
                </h5>
                <span className="text-[10px] text-[#6B6152] dark:text-[#8C8377] font-mono mt-1">
                  {step.sub}
                </span>

                {idx < brandFlowSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-[#8C6207] dark:text-[#D4AF37] font-bold z-10">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 6 Branding Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brandingPillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#2B241E] hover:border-[#D4AF37]/50 transition-all hover:bg-stone-100 dark:hover:bg-[#1C1A17] flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#26201B] border border-[#E2DBD1] dark:border-[#4A3D2F] flex items-center justify-center text-[#8C6207] dark:text-[#D4AF37] mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif-luxury text-xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-2">
                    {pillar.title}
                  </h4>
                  <p className="text-xs text-[#6B6152] dark:text-[#A19789] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-300 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-[#8C6207] dark:text-[#C59B27] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.branding.standard}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA to start consultation */}
        <div className="mt-12 text-center">
          <button
            onClick={onOpenQuote}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-white dark:bg-[#251E17] hover:bg-stone-100 dark:hover:bg-[#332A20] border border-[#D4AF37]/50 text-[#8C6207] dark:text-[#E8C872] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <span>{t.branding.cta}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
