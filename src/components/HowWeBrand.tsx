import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Sliders, Play, RotateCcw, Sparkles } from 'lucide-react';
import { MockupRenderer } from './MockupRenderer';
import { useLanguage } from '../context/LanguageContext';

export const HowWeBrand: React.FC = () => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedProductType, setSelectedProductType] = useState<'apron' | 'wetwipe' | 'toothpick' | 'polo'>('apron');

  const steps = t.process.steps.map((s, i) => ({ ...s, isBrandedVisual: i >= 2 }));

  // Auto step cycle if playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  return (
    <section id="process" className="py-20 md:py-28 bg-white dark:bg-[#121110] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#C59B27]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[#8C6207] dark:text-[#D4AF37] px-3 py-1 rounded bg-stone-100 dark:bg-[#241E18] border border-[#E2DBD1] dark:border-[#44382B]">
            {t.process.badge}
          </span>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mt-3 mb-4">
            {t.process.title}
          </h2>

          <p className="text-[#6B6152] dark:text-[#A89E91] text-base sm:text-lg">
            {t.process.desc}
          </p>
        </div>

        {/* Product preset switcher for the demo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-xs text-[#6B6152] dark:text-[#8E8578] mr-2">{t.process.sample}</span>
          {(['apron', 'wetwipe', 'toothpick', 'polo'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedProductType(type)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                selectedProductType === type
                  ? 'bg-stone-200 dark:bg-[#31271D] text-[#8C6207] dark:text-[#E8C872] border border-[#D4AF37]'
                  : 'bg-white dark:bg-[#181614] text-[#6B6152] dark:text-[#A69C8E] border border-[#E2DBD1] dark:border-[#2D2721] hover:text-black dark:hover:text-white'
              }`}
            >
              {type === 'apron' && t.process.products.apron}
              {type === 'wetwipe' && t.process.products.wetwipe}
              {type === 'toothpick' && t.process.products.toothpick}
              {type === 'polo' && t.process.products.polo}
            </button>
          ))}
        </div>

        {/* Interactive 4-step Timeline & Live Visual transformation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-[#171513] border border-[#E2DBD1] dark:border-[#312A23] rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Left Column: Interactive Steps List */}
          <div className="lg:col-span-7 space-y-4">
            {steps.map((st, idx) => {
              const isActive = currentStep === idx;
              return (
                <div
                  key={st.step}
                  onClick={() => {
                    setCurrentStep(idx);
                    setIsPlaying(false);
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F5EAD6] to-[#EDDFC2] dark:from-[#26201A] dark:to-[#1C1814] border-[#D4AF37] shadow-[0_5px_25px_rgba(212,175,55,0.15)] scale-[1.01]'
                      : 'bg-white dark:bg-[#141210] border-[#E2DBD1] dark:border-[#29231D] hover:border-[#42372D] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isActive
                            ? 'bg-[#D4AF37] text-black'
                            : 'bg-stone-200 dark:bg-[#26211C] text-[#6B6152] dark:text-[#A69B8D]'
                        }`}
                      >
                        {st.step}
                      </span>
                      <h4
                        className={`font-serif-luxury text-xl font-bold ${
                          isActive ? 'text-[#1A1715] dark:text-[#FAF7F2]' : 'text-[#5C554A] dark:text-[#DDD6CC]'
                        }`}
                      >
                        {st.title}
                      </h4>
                    </div>

                    <span className="text-[11px] font-mono text-[#8C6207] dark:text-[#D4AF37]">
                      {st.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#4A4033] dark:text-[#E0D7CC] font-medium mb-1">
                    {st.subtitle}
                  </p>

                  <p className="text-xs text-[#6B6152] dark:text-[#9E9385] leading-relaxed">
                    {st.description}
                  </p>
                </div>
              );
            })}

            {/* Auto Playback control */}
            <div className="pt-2 flex items-center justify-between text-xs text-[#6B6152] dark:text-[#8A8175]">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 hover:text-black dark:hover:text-[#D4AF37] transition-colors cursor-pointer"
              >
                {isPlaying ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? t.process.autoOn : t.process.autoOff}</span>
              </button>

              <span className="font-mono">
                {t.process.stage} {currentStep + 1} / {steps.length}
              </span>
            </div>
          </div>

          {/* Right Column: Visual Stage Showing Product Transformation */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#FFF9EE] to-[#F1E8D6] dark:from-[#1C1916] dark:to-[#12110F] border border-[#E2DBD1] dark:border-[#3E342A] relative min-h-[420px]">
            {/* Step indicator badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
              <span className="text-xs font-mono font-bold text-[#8C6207] dark:text-[#E8C872] uppercase tracking-wider">
                {steps[currentStep].step}: {steps[currentStep].title}
              </span>
            </div>

            {/* Central Animated Mockup */}
            <div className="my-auto py-6 w-full flex flex-col items-center justify-center relative">
              {currentStep === 1 && (
                /* Overlay vector grid during Step 2 */
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px] rounded-xl border border-dashed border-[#D4AF37]/50 p-4">
                  <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] flex items-center justify-center text-xl text-[#D4AF37] animate-pulse">
                    ♛
                  </div>
                  <span className="text-xs font-mono text-[#D4AF37] mt-2 font-bold tracking-widest">
                    {t.process.vector}
                  </span>
                  <div className="flex gap-2 mt-2">
                    <span className="w-3 h-3 rounded-full bg-[#D4AF37]" />
                    <span className="w-3 h-3 rounded-full bg-white" />
                    <span className="w-3 h-3 rounded-full bg-black" />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                /* Stamping / embroidery laser sweep effect during Step 3 */
                <div className="absolute top-0 bottom-0 left-0 right-0 z-20 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#E8C872] to-transparent shadow-[0_0_15px_#D4AF37] animate-bounce" />
                </div>
              )}

              <MockupRenderer
                type={selectedProductType}
                isBranded={steps[currentStep].isBrandedVisual}
                brandName="SULTON SAROY"
                brandTagline="RESTAURANT & LOUNGE"
                accentColor="#D4AF37"
                symbol="♛"
                className="w-full max-w-[280px] h-64"
                detailMode={true}
              />
            </div>

            {/* Bottom State Caption */}
            <div className="w-full pt-4 border-t border-stone-200 dark:border-white/5 text-center">
              <span className="inline-block px-3 py-1 rounded bg-stone-100 dark:bg-[#241E18] text-[#5C554A] dark:text-[#D8CEBF] text-xs font-mono border border-[#E2DBD1] dark:border-[#44382B]">
                {steps[currentStep].badgeText}
              </span>
              <p className="text-[11px] text-[#6B6152] dark:text-[#A69C8E] mt-2">
                {currentStep < 2
                  ? t.process.bottomPlain
                  : t.process.bottomBranded}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
