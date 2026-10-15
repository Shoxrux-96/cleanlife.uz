import React, { useState, useEffect } from 'react';
import { getStoredPortfolio } from '../data/cmsInitialData';
import { loadPortfolio } from '../api/siteSync';
import { PortfolioProject } from '../types';
import { MockupRenderer } from './MockupRenderer';
import { Sparkles, MapPin, CheckCircle2, X, ArrowRight, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const PortfolioSection: React.FC = () => {
  const { t, lang } = useLanguage();
  const [projects, setProjects] = useState<PortfolioProject[]>(() => getStoredPortfolio(lang));

  useEffect(() => {
    loadPortfolio(lang).then(setProjects).catch(() => {});
    setProjects(getStoredPortfolio(lang));
  }, [lang]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);

  useEffect(() => {
    const handleCmsUpdate = () => {
      setProjects(getStoredPortfolio(lang));
    };
    window.addEventListener('brendor_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);
    return () => {
      window.removeEventListener('brendor_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
    };
  }, [lang]);

  const categories = [
    { id: 'all', label: t.portfolio.all },
    { id: 'Restoran', label: t.portfolio.restaurants },
    { id: 'Kafe', label: t.portfolio.cafes },
    { id: 'Choyxona', label: t.portfolio.teahouses },
    { id: 'Fast Food', label: 'Fast Food' },
    { id: 'Coffee Shop', label: 'Coffee Shop' },
    { id: 'Catering', label: 'Catering' },
  ];

  // Only show published projects on the public site
  const publishedProjects = projects.filter(p => p.isPublished !== false);

  const filteredProjects =
    activeCategory === 'all'
      ? publishedProjects
      : publishedProjects.filter((p) => p.businessType === activeCategory);

  return (
    <section id="portfolio" className="py-20 md:py-28 bg-[#F7F3EA] dark:bg-[#151312] border-t border-[#E2DBD1] dark:border-[#29221C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#241F1A] border border-[#E2DBD1] dark:border-[#3E3428] text-xs font-mono text-[#8C6207] dark:text-[#D4AF37] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.portfolio.badge}</span>
          </div>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mb-4">
            {t.portfolio.title}
          </h2>

          <p className="text-[#6B6152] dark:text-[#A69C8E] text-base sm:text-lg">
            {t.portfolio.desc}
          </p>
        </div>

        {/* Filter categories */}
        <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#D4AF37] text-black font-bold shadow-md shadow-[#D4AF37]/20'
                  : 'bg-white dark:bg-[#1D1B18] text-[#6B6152] dark:text-[#9E9486] border border-[#E2DBD1] dark:border-[#2D261F] hover:border-[#E2DBD1] dark:hover:border-[#42372A] hover:text-black dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Portfolio Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl bg-white dark:bg-[#191715] border border-[#E2DBD1] dark:border-[#312921] hover:border-[#D4AF37]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between group hover:shadow-2xl"
            >
              {/* Product Visual Showcase Header with Real Photography */}
              <div
                onClick={() => setSelectedProject(project)}
                className="relative h-64 bg-gradient-to-b from-[#221E1A] to-[#161412] overflow-hidden border-b border-[#E2DBD1] dark:border-[#2C251F] cursor-pointer"
              >
                {project.realPhotoUrl ? (
                  <img
                    src={project.realPhotoUrl}
                    alt={project.clientName}
                    className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
                    loading="lazy"
                  />
                ) : (
                  <MockupRenderer
                    type="wetwipe"
                    isBranded={true}
                    brandName={project.logoTheme.name}
                    brandTagline={project.logoTheme.subtext}
                    symbol={project.logoTheme.symbol}
                    accentColor={project.logoTheme.accentColor}
                    className="w-full h-full max-h-52 transform group-hover:scale-105 transition-transform duration-500"
                  />
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#191715] via-black/30 to-black/20" />

                {/* Real Photo Badge */}
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-black/75 backdrop-blur border border-white/15 text-[#E8C872] text-[10px] font-mono font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#8C6207] dark:text-[#D4AF37]" />
                  <span>{t.portfolio.realCase}</span>
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] text-[#DDD6CB] bg-black/70 px-2.5 py-1 rounded backdrop-blur font-mono border border-stone-300 dark:border-white/10">
                  <MapPin className="w-3 h-3 text-[#8C6207] dark:text-[#D4AF37]" />
                  <span>{project.location}</span>
                </div>

                {/* Bottom caption on image */}
                {project.realPhotoCaption && (
                  <div className="absolute bottom-2 left-3 right-3 text-[10px] text-[#DDD6CB] font-mono bg-black/70 backdrop-blur px-2.5 py-1 rounded border border-stone-300 dark:border-white/10 truncate">
                    {project.realPhotoCaption}
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif-luxury text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1 group-hover:text-[#8C6207] dark:group-hover:text-[#8C6207] dark:hover:text-[#D4AF37] transition-colors">
                    {project.clientName}
                  </h3>
                  <p className="text-xs text-[#C59B27] font-medium italic mb-3">
                    “{project.tagline}”
                  </p>
                  <p className="text-xs text-[#5C554A] dark:text-[#9E9385] leading-relaxed line-clamp-3 mb-4">
                    {project.story}
                  </p>

                  {/* Branded Items Summary badges */}
                  <div className="space-y-1.5 pt-3 border-t border-stone-300 dark:border-white/5 mb-4">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#6B6152] dark:text-[#8A8173] block mb-1">
                      {t.portfolio.products}
                    </span>
                    {project.brandedItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-[#4A4033] dark:text-[#C2B7A8]">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                          <span>{item.title}</span>
                        </span>
                        <span className="text-[10px] text-[#6B6152] dark:text-[#877E71] font-mono">
                          {item.technique}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspect Details Button */}
                <div className="pt-4 border-t border-[#E2DBD1] dark:border-[#29231D] flex items-center justify-between">
                  <span className="text-[11px] text-[#6B6152] dark:text-[#80776A] font-mono">
                    {project.brandedItems.length} {t.portfolio.productsCount}
                  </span>
                  <button
                    onClick={() => setSelectedProject(project)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white dark:bg-[#251E17] hover:bg-[#D4AF37] hover:text-black text-[#8C6207] dark:text-[#D4AF37] text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.portfolio.viewCase}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Full Project Case Study */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#3E3428] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-stone-100 dark:bg-[#241F1A] text-stone-500 dark:text-[#A69B8D] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Real Photo Header */}
              {selectedProject.realPhotoUrl && (
                <div className="relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden mb-6 border border-stone-300 dark:border-white/10">
                  <img
                    src={selectedProject.realPhotoUrl}
                    alt={selectedProject.clientName}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181614] via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-[#E8C872] font-mono bg-black/75 backdrop-blur px-3 py-1.5 rounded-lg border border-[#D4AF37]/30">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                      <span>{selectedProject.realPhotoCaption}</span>
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-0.5 rounded bg-[#D4AF37] text-black text-xs font-bold font-mono">
                  {selectedProject.businessType}
                </span>
                <span className="text-xs text-[#8A8173] font-mono flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                  {selectedProject.location}
                </span>
              </div>

              <h3 className="font-serif-luxury text-3xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1">
                {selectedProject.clientName}
              </h3>
              <p className="text-sm text-[#8C6207] dark:text-[#D4AF37] italic mb-4">
                “{selectedProject.tagline}”
              </p>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B241D] mb-6">
                <h5 className="text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A69C8E] mb-1">
                  {t.portfolio.story}
                </h5>
                <p className="text-xs sm:text-sm text-[#5C554A] dark:text-[#C8BFAF] leading-relaxed">
                  {selectedProject.story}
                </p>
              </div>

              {/* Grid of Branded Items */}
              <h4 className="font-serif-luxury text-lg font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-3">
                {t.portfolio.itemsDone}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {selectedProject.brandedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-stone-50 dark:bg-[#1D1A17] border border-[#E2DBD1] dark:border-[#2E2720] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-semibold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                          {item.title}
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-[#2B231A] text-[#8C6207] dark:text-[#D4AF37] font-mono">
                          {item.technique}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6152] dark:text-[#9E9385]">{item.detail}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-300 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-[#6B6152] dark:text-[#A69C8E] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.portfolio.quality}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#29221C] flex items-center justify-end">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-6 py-2.5 rounded-lg bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#E8C872] transition-colors cursor-pointer"
                >
                  {t.portfolio.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
