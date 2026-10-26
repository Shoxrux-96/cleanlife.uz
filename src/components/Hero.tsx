import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Eye, Grid3x3 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onOpenQuote: () => void;
}

interface Slide {
  key: string;
  label: string;
  icon: string;
  image: string;
}

const SLIDES: Slide[] = [
  { key: 'salfetka', label: 'Nam salfetkalar', icon: '🧻', image: '/hero/slide-1-salfetka.png' },
  { key: 'tish-kavlagich', label: 'Tish kavlagich', icon: '🪥', image: '/hero/slide-2-tish-kavlagich.png' },
  { key: 'forma', label: 'Oshxona formasi', icon: '👨‍🍳', image: '/hero/slide-3-forma.png' },
  { key: 'doppi', label: "Do'ppi va kiyim", icon: '🧢', image: '/hero/slide-4-doppi.png' },
  { key: 'qadoqlash', label: 'Maxsus qadoqlash', icon: '📦', image: '/hero/slide-5-qadoqlash.png' },
];

const AUTO_MS = 5500;

export const Hero: React.FC<HeroProps> = ({ onOpenQuote }) => {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = SLIDES.length;

  const go = useCallback((n: number) => setIdx(((n % total) + total) % total), [total]);
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), AUTO_MS);
    return () => clearInterval(t);
  }, [paused, total]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchStartX.current = null;
  };

  return (
    <section id="hero" className="relative pt-6 pb-16 md:py-20 overflow-hidden">
      {/* Luxury background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#C59B27]/10 via-[#C59B27]/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#3B2D1F]/20 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-4 sm:pt-6">
        {/* Headline + description */}
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
        </div>

        {/* Category pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-6">
          {SLIDES.map((s, i) => {
            const active = i === idx;
            return (
              <button
                key={s.key}
                onClick={() => go(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black border-[#D4AF37] shadow-[0_6px_20px_rgba(212,175,55,0.35)]'
                    : 'bg-white dark:bg-[#1A1816] text-[#5C554A] dark:text-[#C8C0B5] border-[#E2DBD1] dark:border-[#2D251D] hover:border-[#D4AF37]/60 hover:text-[#8C6207] dark:hover:text-[#D4AF37]'
                }`}
              >
                <span className="text-base">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Carousel card */}
        <div
          className="relative mx-auto max-w-6xl rounded-3xl overflow-hidden border border-[#E2DBD1] dark:border-[#332A22] bg-gradient-to-b from-[#F7F0E0] to-[#F1E7CF] dark:from-[#1C1A15] dark:to-[#15130F] shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Slides stack */}
          <div className="relative w-full aspect-[1200/360] sm:aspect-[1200/320] overflow-hidden">
            {SLIDES.map((s, i) => (
              <div
                key={s.key}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                  i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                aria-hidden={i !== idx}
              >
                <img
                  src={s.image}
                  alt={`${s.label} — Clean Life brendlangan mahsulot`}
                  className="w-full h-full object-cover object-center select-none pointer-events-none"
                  draggable={false}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
                {/* Soft bottom gradient for text contrast */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
            ))}

            {/* Prev / Next arrows */}
            <button
              onClick={prev}
              aria-label="Oldingi"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 dark:bg-[#1A1816]/90 backdrop-blur border border-[#E2DBD1] dark:border-[#3A3028] text-[#8C6207] dark:text-[#D4AF37] shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-[#241E18] active:scale-95 transition"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={next}
              aria-label="Keyingi"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 dark:bg-[#1A1816]/90 backdrop-blur border border-[#E2DBD1] dark:border-[#3A3028] text-[#8C6207] dark:text-[#D4AF37] shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-[#241E18] active:scale-95 transition"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Pagination badge (bottom-left) */}
            <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/15 text-white text-[11px] font-mono tracking-wider">
              <span className="font-bold">{String(idx + 1).padStart(2, '0')}</span>
              <span className="opacity-50">/</span>
              <span className="opacity-70">{String(total).padStart(2, '0')}</span>
              <span className="w-16 h-[2px] bg-white/20 rounded-full overflow-hidden ml-1">
                <span
                  className="block h-full bg-[#D4AF37] transition-all duration-700"
                  style={{ width: `${((idx + 1) / total) * 100}%` }}
                />
              </span>
            </div>

            {/* "Xizmatni tanlang" badge (bottom-right) */}
            <a
              href="#products"
              className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/15 text-white text-[11px] font-semibold tracking-wide hover:bg-black/70 transition"
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              <span>Xizmatni tanlang</span>
            </a>
          </div>

          {/* Dots indicator (mobile-friendly) */}
          <div className="flex items-center justify-center gap-1.5 py-3 bg-white/40 dark:bg-black/30">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx
                    ? 'w-6 bg-[#D4AF37]'
                    : 'w-1.5 bg-[#C8BFAE] dark:bg-[#44382B] hover:bg-[#8C6207] dark:hover:bg-[#D4AF37]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Visual formula + CTAs */}
        <div className="mt-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-3 px-5 py-2 rounded-lg bg-white dark:bg-[#181615] border border-[#E2DBD1] dark:border-[#332C25] text-xs tracking-widest uppercase font-mono text-[#8C6207] dark:text-[#D4AF37]">
            <span className="text-[#1A1715] dark:text-[#EFEBE4] font-bold">LOGO</span>
            <span className="text-[#8C6207] dark:text-[#C59B27] font-bold">→</span>
            <span className="text-[#1A1715] dark:text-[#EFEBE4] font-bold">MAHSULOT</span>
            <span className="text-[#8C6207] dark:text-[#C59B27] font-bold">→</span>
            <span className="text-[#E6C774] font-extrabold tracking-[0.2em] bg-[#2E2419] px-2 py-0.5 rounded border border-[#D4AF37]/30">
              BREND
            </span>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
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
