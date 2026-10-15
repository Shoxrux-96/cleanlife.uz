import React, { useState } from 'react';
import { SERVICES_DATA } from '../data/content';
import { MockupRenderer } from './MockupRenderer';
import { Check, ArrowRight, Sparkles, ShieldCheck, Image as ImageIcon, Box } from 'lucide-react';
import { ServiceItem } from '../types';

interface ServicesSectionProps {
  onSelectService: (service: ServiceItem) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  // Global view mode toggle between Real Photos and 3D Mockups
  const [globalMode, setGlobalMode] = useState<'photo' | 'mockup'>('photo');

  return (
    <section id="services" className="py-20 md:py-28 bg-[#151312] border-t border-[#26211C] relative">
      <span id="products" className="absolute -top-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241F1A] border border-[#3E352B] text-xs text-[#D4AF37] font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asosiy xizmat yo‘nalishlari</span>
          </div>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#FDFBF7] tracking-tight mb-4">
            Biz nimalarni brendlaymiz?
          </h2>

          <p className="text-[#AFA699] text-base sm:text-lg">
            Oddiy mahsulotlarni mijozingiz e’tiborini tortadigan korporativ aktivga aylantiramiz.
            <span className="block text-[#D4AF37] font-medium mt-1">
              *Biz kiyim tikmaymiz — tayyor mahsulotlarga logotipingizni professional joylashtiramiz.
            </span>
          </p>

          {/* Mode Switcher: Real Fotosurat vs 3D Maket */}
          <div className="mt-6 inline-flex p-1 bg-[#100F0E] rounded-xl border border-[#2E2720]">
            <button
              onClick={() => setGlobalMode('photo')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                globalMode === 'photo'
                  ? 'bg-gradient-to-r from-[#C59B27] to-[#D4AF37] text-black shadow-md'
                  : 'text-[#8E8578] hover:text-[#D6CEBF]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Real Fotosuratlar</span>
            </button>
            <button
              onClick={() => setGlobalMode('mockup')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                globalMode === 'mockup'
                  ? 'bg-[#3A332C] text-white shadow-sm'
                  : 'text-[#8E8578] hover:text-[#D6CEBF]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Maketlar</span>
            </button>
          </div>
        </div>

        {/* 6 Large Premium Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES_DATA.map((service) => (
            <div
              key={service.id}
              className="group rounded-2xl bg-[#1A1816] border border-[#312B25] hover:border-[#D4AF37]/60 transition-all duration-500 overflow-hidden flex flex-col justify-between hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.7)]"
            >
              {/* Card Visual Header */}
              <div className="relative h-64 bg-gradient-to-b from-[#221F1B] to-[#181614] flex items-center justify-center border-b border-[#2C2621] overflow-hidden">
                {globalMode === 'photo' ? (
                  <div className="relative w-full h-full">
                    <img
                      src={service.realPhotoUrl}
                      alt={service.title}
                      className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1816] via-black/25 to-black/30" />

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-white font-mono bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-white/10">
                      <span className="flex items-center gap-1 text-[#E8C872]">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        Real fotosurat
                      </span>
                      <span>Tayyor mahsulot</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]" />
                    <MockupRenderer
                      type={
                        service.mockupType === 'staff' || service.mockupType === 'waiter'
                          ? 'polo'
                          : service.mockupType === 'chef'
                          ? 'apron'
                          : (service.mockupType as any)
                      }
                      isBranded={true}
                      brandName="ROYAL LOUNGE"
                      brandTagline="HORECA BRANDING"
                      accentColor="#D4AF37"
                      className="w-full h-full max-h-52 transform group-hover:scale-105 transition-transform duration-500"
                    />
                  </>
                )}

                {/* Service Number Tag */}
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-black/75 backdrop-blur border border-white/15 text-[#D4AF37] font-mono font-bold text-xs">
                  {service.number}
                </div>

                <div className="absolute top-4 right-4 px-2.5 py-1 rounded bg-[#2A231A]/90 backdrop-blur border border-[#524433] text-[#D8CEBF] text-[10px] uppercase tracking-wider font-mono">
                  {service.tag}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif-luxury text-2xl font-bold text-[#FAF7F2] mb-2 group-hover:text-[#D4AF37] transition-colors">
                    {service.number} — {service.title}
                  </h3>

                  <p className="text-sm font-medium text-[#E2DACF] mb-3 italic">
                    “{service.shortDesc}”
                  </p>

                  <p className="text-xs text-[#9E9487] leading-relaxed mb-4">
                    {service.fullDesc}
                  </p>

                  {/* Key Highlights */}
                  <div className="space-y-1.5 pt-3 border-t border-white/5 mb-4">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#C5BCAD]">
                        <Check className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Application Techniques */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {service.techniques.map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#121110] border border-[#3A3229] text-[#B8AF9F] font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action CTA inside card */}
                <div className="pt-4 border-t border-[#29241F] flex items-center justify-between">
                  <span className="text-[11px] text-[#8C8377] font-mono">
                    Tayyor mahsulotga brending
                  </span>
                  <button
                    onClick={() => onSelectService(service)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] hover:text-[#F3EFEA] transition-colors cursor-pointer"
                  >
                    <span>Taklif olish</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Core Reminder Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-[#1A1715] border border-[#40352A] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#26201B] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif-luxury text-lg font-bold text-[#FAF7F2]">
                Kiyimingiz bormi yoki tayyor mahsulot qidiryapsizmi?
              </h4>
              <p className="text-xs text-[#AEA495]">
                O‘zingiz olib kelgan kiyimlarga ham, biz tavsiya qilgan tayyor sifatli bazalarga ham birdek mukammal logo joylashtiramiz.
              </p>
            </div>
          </div>

          <a
            href="#contact"
            className="px-6 py-3 rounded-md bg-[#2B241C] hover:bg-[#382E23] border border-[#5E4D3A] text-[#E8C872] text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors"
          >
            Konsultatsiya olish
          </a>
        </div>
      </div>
    </section>
  );
};
