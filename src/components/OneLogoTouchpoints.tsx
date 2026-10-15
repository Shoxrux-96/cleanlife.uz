import React, { useState } from 'react';
import { ArrowRight, Eye, Sparkles, CheckCircle2, ChevronRight, Layers, Image as ImageIcon, Box } from 'lucide-react';
import { MockupRenderer } from './MockupRenderer';

export const OneLogoTouchpoints: React.FC = () => {
  const [activeTouchpointId, setActiveTouchpointId] = useState<string>('shirt');
  const [displayMode, setDisplayMode] = useState<'photo' | 'mockup'>('photo');

  const touchpoints = [
    {
      id: 'shirt',
      number: '01',
      title: 'Xodim futbolkasi / Polo',
      category: 'Xodimlar ko‘rinishi',
      desc: 'Mijoz zalga kirganda birinchi bo‘lib ofitsiant yoki ma’mur kiyimidagi nafis tikilgan logotipni ko‘radi.',
      mockupType: 'polo' as const,
      placement: 'Chap ko‘krak qismida kashta va yengda monogramma',
      realPhotoUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80',
      realPhotoCaption: '100% paxta piqué to‘qimali qora poloda nafis kashta'
    },
    {
      id: 'apron',
      number: '02',
      title: 'Oshpaz va barista fartugi',
      category: 'Oshxona & Bar',
      desc: 'Ochiq oshxona yoki bar peshtaxtasida ishlayotgan mutaxassisning qalin fartugidagi relyefli brending.',
      mockupType: 'apron' as const,
      placement: 'Ko‘krak markazida qalin oltin ipli kashta',
      realPhotoUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
      realPhotoCaption: 'Qalin kanvas fartuk, charm tasmalar va kashta logotipi'
    },
    {
      id: 'cap',
      number: '03',
      title: 'Kepka / Milliy do‘ppi',
      category: 'Bosh kiyimlar',
      desc: 'Zamonaviy street-food beysbolkasi yoki milliy choyxonalarda nufuzli baxmal do‘ppi hoshiyasida yashirin brending.',
      mockupType: 'cap' as const,
      placement: 'Old frontal qismida 3D relyefli kashta',
      realPhotoUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
      realPhotoCaption: '3D bo‘rtma relyefli kashtali beysbolka va brendlangan do‘ppilar'
    },
    {
      id: 'wetwipe',
      number: '04',
      title: 'Nam salfetka',
      category: 'Stol usti gigiyenasi',
      desc: 'Mijoz stolda taom kutayotganda ushlaydigan va ko‘z yugurtiradigan eng yaqin aloqa vositasi.',
      mockupType: 'wetwipe' as const,
      placement: 'Qadoqning 100% yuzasida mat fleksografik dizayn va QR-menyu',
      realPhotoUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
      realPhotoCaption: 'Mat qora sachet, oltin muhrli logotip va QR-menyu'
    },
    {
      id: 'toothpick',
      number: '05',
      title: 'Tish kovlagich qutisi',
      category: 'Stol usti aksessuari',
      desc: 'Stolda butun oqshom davomida turuvchi kichik mini-reklama bilbordingiz.',
      mockupType: 'toothpick' as const,
      placement: 'Karton qutining barcha 4 tarafiga UV-lak bilan bosish',
      realPhotoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      realPhotoCaption: 'Zich qora kartonli stol usti tish kovlagich qutisi + UV lak'
    },
    {
      id: 'packaging',
      number: '06',
      title: 'Takeaway kraft paketi',
      category: 'Yetkazib berish & Olib ketish',
      desc: 'Mijoz taomni uyiga olib ketganda yoki ko‘chada ko‘targanda brendingiz butun shaharga namoyon bo‘ladi.',
      mockupType: 'packaging' as const,
      placement: 'Kraft qog‘oz markazida katta formatli monoxrom bosma',
      realPhotoUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
      realPhotoCaption: 'Eko kraft qog‘oz paketi markazida katta formatli bosma'
    }
  ];

  const activeItem = touchpoints.find((t) => t.id === activeTouchpointId) || touchpoints[0];

  return (
    <section className="py-20 md:py-28 bg-white dark:bg-[#171513] border-t border-[#E2DBD1] dark:border-[#29231D] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section 10 Headline */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-[#262019] border border-[#E2DBD1] dark:border-[#44372A] text-xs font-mono text-[#8C6207] dark:text-[#D4AF37] mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Ko‘p nuqtali mijoz tajribasi (Omnichannel Touchpoints)</span>
          </div>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mb-4">
            Logotipingizni bitta joyda qoldirmang.
          </h2>

          <p className="text-[#6B6152] dark:text-[#A89E91] text-base sm:text-lg max-w-2xl mx-auto">
            Mijoz eshikdan kirganidan boshlab to uyiga taom olib ketguncha bitta yagona brend
            uslubiga duch keladi.
          </p>

          <p className="font-serif-luxury text-xl sm:text-2xl text-[#8C6207] dark:text-[#E8C872] italic mt-4">
            “Mijozingiz brendingizni ko‘proq ko‘rgan sari, brendingiz esda qoladi.”
          </p>

          {/* Mode Switcher */}
          <div className="mt-6 inline-flex p-1 bg-stone-100 dark:bg-[#100F0E] rounded-xl border border-[#E2DBD1] dark:border-[#2E2720]">
            <button
              onClick={() => setDisplayMode('photo')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'photo'
                  ? 'bg-gradient-to-r from-[#C59B27] to-[#D4AF37] text-black shadow-md'
                  : 'text-[#6B6152] dark:text-[#8E8578] hover:text-black dark:hover:text-[#D6CEBF]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Real Fotosuratlar</span>
            </button>
            <button
              onClick={() => setDisplayMode('mockup')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === 'mockup'
                  ? 'bg-stone-200 dark:bg-[#3A332C] text-stone-700 dark:text-white shadow-sm'
                  : 'text-[#6B6152] dark:text-[#8E8578] hover:text-black dark:hover:text-[#D6CEBF]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Maketlar</span>
            </button>
          </div>
        </div>

        {/* Interactive Touchpoint Grid with Live Focus */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-[#131110] border border-[#E2DBD1] dark:border-[#312921] rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Touchpoint List (Left) */}
          <div className="lg:col-span-6 space-y-2.5">
            <span className="text-xs uppercase tracking-widest text-[#6B6152] dark:text-[#8A8175] font-mono block mb-3">
              Mijozning 6 ta asosiy aloqa nuqtasi (Touchpoints):
            </span>

            {touchpoints.map((tp) => {
              const isSelected = tp.id === activeTouchpointId;
              return (
                <div
                  key={tp.id}
                  onClick={() => setActiveTouchpointId(tp.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-white dark:bg-[#241F1A] border-[#D4AF37] shadow-[0_5px_20px_rgba(212,175,55,0.15)]'
                      : 'bg-white dark:bg-[#181614] border-[#E2DBD1] dark:border-[#29231E] hover:border-[#42372D] text-[#5C554A] dark:text-[#DDD7CC]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                        isSelected
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-stone-200 dark:bg-[#241F1A] text-[#6B6152] dark:text-[#9E9486] group-hover:text-black dark:group-hover:text-white'
                      }`}
                    >
                      {tp.number}
                    </span>
                    <div>
                      <h4
                        className={`text-sm font-semibold transition-colors ${
                          isSelected ? 'text-[#1A1715] dark:text-[#FAF7F2]' : 'text-[#5C554A] dark:text-[#CFC6B9]'
                        }`}
                      >
                        {tp.title}
                      </h4>
                      <span className="text-[11px] text-[#6B6152] dark:text-[#8C8377] block font-mono">
                        {tp.category}
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected
                        ? 'text-[#8C6207] dark:text-[#D4AF37] translate-x-1'
                        : 'text-[#6B6152] dark:text-[#61584C] group-hover:text-black dark:group-hover:text-[#AAA092]'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Touchpoint Preview Spotlight (Right) */}
          <div className="lg:col-span-6 bg-gradient-to-b from-[#FFF9EE] to-[#F1E8D6] dark:from-[#1C1815] dark:to-[#12110F] border border-[#E2DBD1] dark:border-[#3A3127] rounded-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Top metadata */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-300 dark:border-white/5 relative z-10">
              <span className="text-xs font-mono text-[#8C6207] dark:text-[#D4AF37]">
                Aloqa Nuqtasi #{activeItem.number}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-stone-100 dark:bg-[#282119] border border-[#E2DBD1] dark:border-[#4E3F30] text-[#5C554A] dark:text-[#D8CEBF] font-mono">
                {activeItem.category}
              </span>
            </div>

            {/* Center Product Stage: Real Photo vs 3D Mockup */}
            <div className="my-auto py-4 relative z-10 flex items-center justify-center">
              {displayMode === 'photo' ? (
                <div className="relative w-full max-w-[340px] h-64 rounded-xl overflow-hidden border border-stone-300 dark:border-white/10 shadow-2xl group">
                  <img
                    src={activeItem.realPhotoUrl}
                    alt={activeItem.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur border border-white/15 text-[#E8C872] font-mono text-[10px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      Real fotosurat
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-center">
                    <p className="text-[11px] font-mono text-[#DDD6CB] bg-black/80 backdrop-blur px-2.5 py-1 rounded border border-white/10">
                      {activeItem.realPhotoCaption}
                    </p>
                  </div>
                </div>
              ) : (
                <MockupRenderer
                  type={activeItem.mockupType}
                  isBranded={true}
                  brandName="SULTON SAROY"
                  brandTagline="RESTAURANT & LOUNGE"
                  accentColor="#D4AF37"
                  symbol="♛"
                  className="w-full max-w-[280px] h-60"
                  detailMode={true}
                />
              )}
            </div>

            {/* Bottom detailed description */}
            <div className="pt-4 border-t border-stone-300 dark:border-white/10 relative z-10">
              <h4 className="font-serif-luxury text-xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1">
                {activeItem.title}
              </h4>
              <p className="text-xs text-[#5C554A] dark:text-[#B5ABA0] leading-relaxed mb-3">
                {activeItem.desc}
              </p>
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#332A22] text-[11px] text-[#8C6207] dark:text-[#D4AF37] font-mono flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Joylashtirish standarti: {activeItem.placement}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
