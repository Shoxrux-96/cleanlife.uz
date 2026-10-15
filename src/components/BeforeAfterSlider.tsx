import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal, Sparkles, MoveHorizontal, Image as ImageIcon, Box } from 'lucide-react';
import { MockupRenderer } from './MockupRenderer';
import { getStoredBeforeAfter } from '../data/cmsInitialData';
import { loadSlider } from '../api/siteSync';
import { BeforeAfterItemId } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const BeforeAfterSlider: React.FC = () => {
  const { t, lang } = useLanguage();
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [activeItem, setActiveItem] = useState<BeforeAfterItemId>('wetwipe');
  const [comparisonMode, setComparisonMode] = useState<'photo' | 'mockup'>('photo');
  const [content, setContent] = useState(() => getStoredBeforeAfter(lang));
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    loadSlider(lang).then(setContent).catch(() => {});
    setContent(getStoredBeforeAfter(lang));
    const handleCmsUpdate = () => setContent(getStoredBeforeAfter(lang));
    window.addEventListener('brendor_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);
    return () => {
      window.removeEventListener('brendor_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
    };
  }, [lang]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const productTabs: { id: BeforeAfterItemId; label: string }[] = (
    Object.keys(content.pairs) as BeforeAfterItemId[]
  ).map((id) => ({ id, label: content.pairs[id].label }));

  // High-res realistic real photography before and after pairs (dashboarddan tahrirlanadi)
  const photoPairs = content.pairs;

  const currentPair = photoPairs[activeItem];

  return (
    <section id="compare" className="py-20 md:py-28 bg-white dark:bg-[#141211] border-t border-[#E2DBD1] dark:border-[#29221C] relative select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#241F1A] border border-[#E2DBD1] dark:border-[#3E352B] text-xs text-[#8C6207] dark:text-[#D4AF37] font-medium mb-3">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mb-4">
            {content.title}
          </h2>

          <p className="text-[#6B6152] dark:text-[#A89E91] text-base sm:text-lg">
            {content.description}
          </p>

          {/* Mode Switcher */}
          <div className="mt-5 inline-flex p-1 bg-stone-100 dark:bg-[#100F0E] rounded-xl border border-[#E2DBD1] dark:border-[#2E2720]">
            <button
              onClick={() => setComparisonMode('photo')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                comparisonMode === 'photo'
                  ? 'bg-gradient-to-r from-[#C59B27] to-[#D4AF37] text-black shadow-md'
                  : 'text-[#6B6152] dark:text-[#8E8578] hover:text-black dark:hover:text-[#D6CEBF]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t.slider.photoMode}</span>
            </button>
            <button
              onClick={() => setComparisonMode('mockup')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                comparisonMode === 'mockup'
                  ? 'bg-stone-200 dark:bg-[#3A332C] text-stone-700 dark:text-white shadow-sm'
                  : 'text-[#6B6152] dark:text-[#8E8578] hover:text-black dark:hover:text-[#D6CEBF]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{t.slider.mockupMode}</span>
            </button>
          </div>
        </div>

        {/* Product preset buttons */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {productTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveItem(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                activeItem === tab.id
                  ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-bold'
                  : 'bg-white dark:bg-[#1D1A17] text-[#6B6152] dark:text-[#AEA495] border border-[#E2DBD1] dark:border-[#332B23] hover:border-[#D4AF37]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Split View Box */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="before-after-slider relative w-full max-w-4xl mx-auto h-[450px] sm:h-[500px] rounded-3xl overflow-hidden border-2 border-[#E2DBD1] dark:border-[#42372D] shadow-2xl cursor-ew-resize bg-[#100F0E]"
        >
          {comparisonMode === 'photo' ? (
            <>
              {/* Background Right Layer: REAL PHOTO BRANDED (After) */}
              <div className="absolute inset-0 bg-[#161412]">
                <img
                  src={currentPair.after}
                  alt="Brendlangan real mahsulot"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                <div className="absolute bottom-6 right-6 px-4 py-2 rounded-xl bg-black/80 backdrop-blur border border-[#D4AF37]/60 text-right pointer-events-none max-w-xs">
                  <span className="text-xs font-mono font-bold text-[#E8C872] flex items-center justify-end gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {t.slider.brandedPhoto}
                  </span>
                  <span className="text-[11px] text-[#E0D7CB] block mt-0.5 leading-snug">
                    {currentPair.afterCaption}
                  </span>
                </div>
              </div>

              {/* Foreground Left Layer: REAL PHOTO PLAIN (Before) - clipped via slider position */}
              <div
                className="absolute inset-0 bg-[#161412] border-r-2 border-[#D4AF37]"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={currentPair.before}
                  alt="Oddiy brendsiz mahsulot"
                  className="w-full h-full object-cover object-center grayscale-[30%] brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                <div className="absolute bottom-6 left-6 px-4 py-2 rounded-xl bg-black/80 backdrop-blur border border-white/15 text-left pointer-events-none max-w-xs">
                  <span className="text-xs font-mono font-bold text-stone-300">
                    {t.slider.plainPhoto}
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-0.5 leading-snug">
                    {currentPair.beforeCaption}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Background Right Layer: 3D BRANDED */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#241F1A] via-[#1B1815] to-[#121110] flex flex-col items-center justify-center p-8">
                <MockupRenderer
                  type={activeItem}
                  isBranded={true}
                  brandName="SULTON SAROY"
                  brandTagline="RESTAURANT & LOUNGE"
                  accentColor="#D4AF37"
                  symbol="♛"
                  className="w-full max-w-md h-72"
                  detailMode={true}
                />

                <div className="absolute bottom-6 right-6 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur border border-[#D4AF37]/50 text-right pointer-events-none">
                  <span className="text-xs font-mono font-bold text-[#E8C872] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t.slider.brandedMockup}
                  </span>
                  <span className="text-[10px] text-[#6B6152] dark:text-[#A69C8E] block">
                    {t.slider.mockupSub}
                  </span>
                </div>
              </div>

              {/* Foreground Left Layer: 3D PLAIN */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#222120] via-[#1C1B1A] to-[#141413] flex flex-col items-center justify-center p-8 border-r border-[#D4AF37]"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <MockupRenderer
                  type={activeItem}
                  isBranded={false}
                  className="w-full max-w-md h-72"
                />

                <div className="absolute bottom-6 left-6 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur border border-white/10 text-left pointer-events-none">
                  <span className="text-xs font-mono font-bold text-stone-300">
                    {t.slider.plainMockup}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {t.slider.plainMockupSub}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Draggable Divider Bar */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-[#D4AF37] pointer-events-none shadow-[0_0_15px_#D4AF37]"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Handle Knob */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white dark:bg-[#181614] border-2 border-[#D4AF37] text-[#8C6207] dark:text-[#D4AF37] flex items-center justify-center shadow-2xl">
              <MoveHorizontal className="w-5 h-5" />
            </div>
          </div>

          {/* Top Instruction Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-black/80 backdrop-blur border border-white/15 text-[11px] font-mono text-[#D8CEBF] pointer-events-none">
            {t.slider.drag}
          </div>
        </div>

        {/* Bottom Highlight text */}
        <div className="mt-8 text-center text-xs text-[#6B6152] dark:text-[#8E8578] font-mono">
          <span>
            {content.bottomNote}
          </span>
        </div>
      </div>
    </section>
  );
};
