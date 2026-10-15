import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const serviceHrefs = ['#branding', '#branding', '#clients', '#clients', '#clients', '#branding'];
  const sectionHrefs = ['#hero', '#process', '#branding', '#portfolio', '#why-us', '#clients'];

  return (
    <footer className="bg-[#0F0E0D] border-t border-[#29221C] text-[#C4BBAE] pt-14 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/clean-life-logo.jpg"
                alt="Clean Life Group"
                className="h-24 w-auto rounded-lg"
              />
            </div>

            <p className="text-xs text-[#A89E90] leading-relaxed max-w-sm">
              {t.footer.desc}
            </p>
          </div>

          {/* Nav Links: Xizmatlar */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#1A1715] dark:text-[#FAF7F2] font-bold mb-4">
              {t.footer.services}
            </h4>
            <ul className="space-y-2 text-xs text-[#6B6152] dark:text-[#9E9486]">
              {t.footer.servicesItems.map((s, i) => (
                <li key={i}><a href={serviceHrefs[i]} className="hover:text-[#8C6207] dark:hover:text-[#D4AF37] transition-colors">{s}</a></li>
              ))}
            </ul>
          </div>

          {/* Nav Links: Kompaniya & Bo‘limlar */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#1A1715] dark:text-[#FAF7F2] font-bold mb-4">
              {t.footer.sections}
            </h4>
            <ul className="space-y-2 text-xs text-[#6B6152] dark:text-[#9E9486]">
              {t.footer.sectionLinks.map((s, i) => (
                <li key={i}><a href={sectionHrefs[i]} className="hover:text-[#8C6207] dark:hover:text-[#D4AF37] transition-colors">{s}</a></li>
              ))}
            </ul>
          </div>

          {/* Back to top */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#1A1715] dark:text-[#FAF7F2] font-bold mb-4">
              {t.footer.nav}
            </h4>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-[#1E1B18] hover:bg-[#D4AF37] hover:text-black text-[#6B6152] dark:text-[#A69C8E] text-xs font-medium transition-colors cursor-pointer border border-stone-300 dark:border-white/5"
              title={t.footer.backTop}
            >
              <span>{t.footer.backTop}</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
