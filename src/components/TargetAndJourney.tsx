import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Rocket } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TargetAndJourneyProps {
  onOpenQuote: () => void;
}

export const TargetAndJourney: React.FC<TargetAndJourneyProps> = ({ onOpenQuote }) => {
  const { t } = useLanguage();
  const itemIcons = ['🍽️', '☕', '🫖', '🍔', '☕', '🥐', '🏨', '🍱'];
  return (
    <section id="clients" className="py-20 md:py-28 bg-white dark:bg-[#121110] border-t border-[#E2DBD1] dark:border-[#26211C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* SECTION 16: TARGET BUSINESSES */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-[#8C6207] dark:text-[#D4AF37] px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-[#201C17] border border-[#E2DBD1] dark:border-[#3E3428]">
              {t.clients.badge}
            </span>

            <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mt-3 mb-4">
              {t.clients.title}
            </h2>

            <p className="text-[#6B6152] dark:text-[#A69C8E] text-base sm:text-lg">
              {t.clients.desc}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {t.clients.items.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#2A241E] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between group hover:bg-stone-100 dark:hover:bg-[#1E1B18]"
              >
                <div>
                  <div className="text-2xl mb-2">{itemIcons[idx % itemIcons.length]}</div>
                  <h4 className="font-serif-luxury text-lg font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1 group-hover:text-[#8C6207] dark:group-hover:text-[#D4AF37] transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-[#6B6152] dark:text-[#9E9385] leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-stone-300 dark:border-white/5 flex items-center justify-between text-[10px] text-[#6B6152] dark:text-[#7A7266] font-mono">
                  <span>{t.clients.horeca}</span>
                  <span className="text-[#8C6207] dark:text-[#D4AF37]">{t.clients.adapted}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Special Callout: "Yangi biznes ochyapsizmi?" */}
          <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#F7EBD2] via-[#F3E6CC] to-[#EDDCB8] dark:from-[#2A221A] dark:via-[#1F1915] dark:to-[#181614] border border-[#E2DBD1] dark:border-[#524332] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#362A1F] border border-[#D4AF37]/50 flex items-center justify-center text-[#8C6207] dark:text-[#D4AF37] shrink-0">
                <Rocket className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#8C6207] dark:text-[#E8C872] font-semibold">
                  {t.clients.offer}
                </span>
                <h3 className="font-serif-luxury text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
                  {t.clients.newBiz}
                </h3>
                <p className="text-xs sm:text-sm text-[#5C554A] dark:text-[#C8BFAF] mt-1">
                  {t.clients.newBizDesc}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenQuote}
              className="px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#E8C872] text-black font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {t.clients.startup}
            </button>
          </div>
        </div>

        {/* SECTION 17: NEW RESTAURANT BRANDING JOURNEY */}
        <div className="pt-8 border-t border-[#E2DBD1] dark:border-[#29221C]">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#8C6207] dark:text-[#D4AF37] px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-[#201C17] border border-[#E2DBD1] dark:border-[#3E3428]">
              {t.clients.map}
            </span>

            <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mt-3 mb-4">
              {t.clients.journeyTitle}
            </h2>

            <p className="text-[#6B6152] dark:text-[#A69C8E] text-base sm:text-lg">
              {t.clients.journeyDesc}
            </p>
          </div>

          {/* Timeline steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {t.clients.journey.map((st, idx) => (
              <div
                key={st.step}
                className="p-4 rounded-xl bg-white dark:bg-[#171513] border border-[#E2DBD1] dark:border-[#2B241E] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-mono font-bold text-[#8C6207] dark:text-[#D4AF37] px-2 py-0.5 rounded bg-stone-100 dark:bg-[#241E18] border border-[#E2DBD1] dark:border-[#3E3225] inline-block mb-3">
                    {st.step}
                  </span>
                  <h4 className="font-serif-luxury text-base font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1.5 leading-snug">
                    {st.title}
                  </h4>
                  <p className="text-[11px] text-[#6B6152] dark:text-[#9E9385] leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-stone-300 dark:border-white/5 text-[9px] text-[#6B6152] dark:text-[#786F62] font-mono">
                  {idx === 6 ? t.clients.success : t.clients.prep}
                </div>
              </div>
            ))}
          </div>

          {/* Section 17 Final Quote */}
          <div className="mt-12 text-center p-6 rounded-2xl bg-white dark:bg-[#1A1815] border border-[#E2DBD1] dark:border-[#3A3026]">
            <p className="font-serif-luxury text-xl sm:text-2xl text-[#8C6207] dark:text-[#E8C872] italic">
              {t.clients.quote}
            </p>
            <p className="text-xs text-[#6B6152] dark:text-[#8E8578] uppercase tracking-widest mt-1 font-mono">
              {t.clients.quoteSub}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
