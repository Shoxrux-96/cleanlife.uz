import React from 'react';

interface MockupProps {
  type: 'wetwipe' | 'toothpick' | 'apron' | 'polo' | 'packaging' | 'cap';
  isBranded?: boolean;
  brandName?: string;
  brandTagline?: string;
  symbol?: string;
  accentColor?: string;
  className?: string;
  detailMode?: boolean;
}

export const MockupRenderer: React.FC<MockupProps> = ({
  type,
  isBranded = true,
  brandName = 'SULTON SAROY',
  brandTagline = 'RESTAURANT & LOUNGE',
  symbol = '♛',
  accentColor = '#D4AF37',
  className = '',
  detailMode = false,
}) => {
  // 1. WET WIPE SACHET
  if (type === 'wetwipe') {
    return (
      <div className={`mockup-renderer-root relative flex items-center justify-center p-3 select-none ${className}`}>
        <div
          className={`relative w-full max-w-[280px] aspect-[16/10] rounded-lg shadow-2xl transition-all duration-700 overflow-hidden flex flex-col justify-between p-4 border ${
            isBranded
              ? 'bg-gradient-to-br from-[#1C1A18] via-[#24201D] to-[#121110] border-[#443B33] text-[#F3EFEA]'
              : 'bg-gradient-to-br from-[#ECE7DD] via-[#E2DCCE] to-[#D5CFC1] border-[#B8B0A2] text-stone-700 shadow-md'
          }`}
          style={{
            boxShadow: isBranded
              ? '0 20px 35px -10px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.15)'
              : '0 15px 25px -10px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
          }}
        >
          {/* Crimped sealed top edge texture */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 flex justify-between px-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className={`w-[2px] h-full ${isBranded ? 'bg-black/40' : 'bg-stone-400'}`} />
            ))}
          </div>

          {/* Notch tear mark */}
          <div className="absolute top-4 left-0 w-2 h-2 rounded-r-full bg-black/60" />
          <div className="absolute top-4 right-0 w-2 h-2 rounded-l-full bg-black/60" />

          {/* Subtle light reflection on foil */}
          <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-25 pointer-events-none" />

          {/* Sachet Content */}
          {isBranded ? (
            <div className="relative z-10 flex flex-col justify-between h-full py-1">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-[#B2A89C]">
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                  Xushbo‘y nam salfetka
                </span>
                <span className="opacity-75">100% Paxta</span>
              </div>

              <div className="my-auto text-center flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full border flex items-center justify-center text-sm mb-1.5 transition-transform duration-500 hover:scale-110 shadow-sm"
                  style={{
                    borderColor: `${accentColor}80`,
                    color: accentColor,
                    background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
                  }}
                >
                  {symbol}
                </div>
                <h4
                  className="font-serif-luxury text-base sm:text-lg font-semibold tracking-wider uppercase leading-tight"
                  style={{ color: accentColor }}
                >
                  {brandName}
                </h4>
                <p className="text-[8px] uppercase tracking-[0.25em] text-[#C4BDB4] font-medium mt-0.5">
                  {brandTagline}
                </p>
              </div>

              <div className="flex items-center justify-between text-[8px] text-[#A69E93] pt-1 border-t border-white/10">
                <span className="font-mono">ANTIBACTERIAL • 0% ALCOHOL</span>
                <div className="w-3.5 h-3.5 bg-white/10 rounded border border-white/20 flex items-center justify-center text-[6px]">
                  QR
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-stone-600">
              <div className="w-12 h-1 rounded bg-stone-400 mb-2" />
              <div className="w-20 h-1.5 rounded bg-stone-400/70" />
              <span className="text-[10px] text-stone-600 mt-2 font-mono tracking-widest uppercase font-bold">
                ODDIY / BRENDSIZ
              </span>
            </div>
          )}

          {/* Crimped sealed bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 flex justify-between px-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className={`w-[2px] h-full ${isBranded ? 'bg-black/40' : 'bg-stone-400'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. TOOTHPICK BOX
  if (type === 'toothpick') {
    return (
      <div className={`mockup-renderer-root relative flex items-center justify-center p-3 select-none ${className}`}>
        <div
          className={`relative w-[180px] aspect-[9/14] rounded-md shadow-2xl transition-all duration-700 p-3 flex flex-col justify-between border ${
            isBranded
              ? 'bg-gradient-to-b from-[#241F1C] via-[#1B1816] to-[#121110] border-[#4E443B] text-[#EFEBE4]'
              : 'bg-[#EDE7DD] border-[#C4BDB0] text-stone-700 shadow-md'
          }`}
          style={{
            boxShadow: isBranded
              ? '0 25px 40px -15px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.1)'
              : '0 15px 25px -10px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
          }}
        >
          {/* Box top opening slot with visible bamboo picks */}
          <div
            className={`w-full h-3 rounded-full border flex items-center justify-center px-2 gap-1 overflow-hidden ${
              isBranded ? 'bg-[#0E0D0C] border-[#38312B]' : 'bg-stone-400 border-stone-500'
            }`}
          >
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="w-[1.5px] h-3 bg-[#E0D3BC] rounded-full rotate-3" />
            ))}
          </div>

          {/* Body branding */}
          {isBranded ? (
            <div className="my-auto text-center flex flex-col items-center py-2">
              <div
                className="w-7 h-7 rounded-full border flex items-center justify-center text-xs mb-1"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {symbol}
              </div>
              <h5
                className="font-serif-luxury text-sm font-semibold tracking-wider uppercase leading-tight"
                style={{ color: accentColor }}
              >
                {brandName}
              </h5>
              <div className="w-8 h-[1px] my-1" style={{ backgroundColor: `${accentColor}80` }} />
              <p className="text-[7px] uppercase tracking-widest text-[#B5AEA5]">
                {brandTagline}
              </p>
              <p className="text-[6px] tracking-wider text-[#8A8177] mt-3 uppercase">
                Tabiiy bambuk • Gigiyenik
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto">
              <div className="w-8 h-8 rounded-full border border-stone-400 mb-2" />
              <div className="w-16 h-1.5 bg-stone-400 rounded mb-1" />
              <span className="text-[8px] text-stone-600 font-mono tracking-widest uppercase font-bold">
                BRENDSIZ
              </span>
            </div>
          )}

          {/* Box footer */}
          <div className="text-center pt-2 border-t border-black/10">
            <span
              className={`text-[7px] tracking-widest uppercase font-medium ${
                isBranded ? 'text-[#877F76]' : 'text-stone-600'
              }`}
            >
              HoReCa Stol Aksessuari
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. CHEF / BARISTA APRON
  if (type === 'apron') {
    return (
      <div className={`mockup-renderer-root relative flex items-center justify-center p-2 select-none overflow-hidden ${className}`}>
        {/* Apron SVG Shape with realistic leather straps and canvas texture */}
        <div className="relative w-full h-full max-h-[380px] max-w-[280px] aspect-[3/4] flex items-center justify-center">
          <svg
            viewBox="-15 -5 330 415"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-full object-contain drop-shadow-2xl transition-all duration-700"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Leather Neck Straps */}
            <path
              d="M100 40 C100 8, 200 8, 200 40"
              stroke="#6B4B32"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Brass Ring rivets */}
            <circle cx="100" cy="50" r="5" fill="#D4AF37" />
            <circle cx="200" cy="50" r="5" fill="#D4AF37" />

            {/* Apron Body Canvas */}
            <path
              d="M100 45 L200 45 C208 45, 215 50, 215 58 L215 75 C240 100, 255 125, 260 145 C263 155, 260 375, 260 380 C260 388, 252 395, 245 395 L55 395 C48 395, 40 388, 40 380 C40 375, 37 155, 40 145 C45 125, 60 100, 85 75 L85 58 C85 50, 92 45, 100 45 Z"
              fill={isBranded ? '#1E1B18' : '#EDE8DE'}
              stroke={isBranded ? '#3F372F' : '#B8B0A2'}
              strokeWidth="3"
            />

            {/* Double stitch seam around apron */}
            <path
              d="M105 52 L195 52 C202 52, 208 56, 208 62 L208 77 C232 101, 246 125, 251 143 C254 153, 251 370, 251 385 L49 385 C49 370, 46 153, 49 143 C54 125, 68 101, 92 77 L92 62 C92 56, 98 52, 105 52 Z"
              stroke={isBranded ? 'rgba(212,175,55,0.25)' : 'rgba(0,0,0,0.18)'}
              strokeWidth="1.5"
              strokeDasharray="4 2"
              fill="none"
            />

            {/* Waist ties */}
            <path d="M40 160 L5 170" stroke="#6B4B32" strokeWidth="8" strokeLinecap="round" />
            <path d="M260 160 L295 170" stroke="#6B4B32" strokeWidth="8" strokeLinecap="round" />

            {/* Apron Large Pocket */}
            <path
              d="M75 240 L225 240 L220 350 L80 350 Z"
              fill={isBranded ? '#191614' : '#DFD9CE'}
              stroke={isBranded ? '#483F37' : '#B5ADA0'}
              strokeWidth="2"
            />
            {/* Pocket center divider stitch */}
            <line
              x1="150"
              y1="240"
              x2="150"
              y2="350"
              stroke={isBranded ? '#D4AF37' : '#8A8275'}
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            {/* Pocket brass corner rivets */}
            <circle cx="78" cy="244" r="3" fill="#D4AF37" />
            <circle cx="222" cy="244" r="3" fill="#D4AF37" />
          </svg>

          {/* Logo Placement on Chest (EMBROIDERY SIMULATION) */}
          <div className="absolute top-[23%] left-1/2 -translate-x-1/2 w-40 text-center pointer-events-none px-2">
            {isBranded ? (
              <div className="flex flex-col items-center justify-center drop-shadow-md">
                {/* Stitched crest badge */}
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center text-base sm:text-lg mb-1 shadow-inner"
                  style={{
                    borderColor: accentColor,
                    color: accentColor,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    boxShadow: 'inset 0 0 5px rgba(212,175,55,0.3)',
                  }}
                >
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{symbol}</span>
                </div>
                <div
                  className="font-serif-luxury font-bold tracking-widest text-xs sm:text-sm uppercase leading-tight drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] truncate max-w-full"
                  style={{ color: accentColor }}
                >
                  {brandName}
                </div>
                <div className="text-[7px] uppercase tracking-[0.2em] text-[#C9BFB1] font-semibold mt-0.5 truncate max-w-full">
                  {brandTagline}
                </div>
                {detailMode && (
                  <span className="mt-1.5 px-2 py-0.5 text-[8px] bg-black/60 rounded border border-amber-500/30 text-amber-300 font-mono">
                    ✦ Zich kompyuter kashtasi
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-stone-400 mb-1" />
                <div className="w-16 h-2 bg-stone-400/60 rounded mb-1" />
                <span className="text-[8px] text-stone-700 font-mono tracking-widest uppercase font-bold">
                  ODDIY FARTUK
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. EMPLOYEE POLO
  if (type === 'polo') {
    return (
      <div className={`mockup-renderer-root relative flex items-center justify-center p-3 select-none ${className}`}>
        <div className="relative w-full max-w-[280px] aspect-[4/3] flex items-center justify-center">
          <svg
            viewBox="0 0 320 260"
            className="w-full h-full drop-shadow-xl transition-all duration-700"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Polo Body */}
            <path
              d="M80 50 L115 50 L160 85 L205 50 L240 50 L295 90 L260 140 L235 125 L235 250 L85 250 L85 125 L60 140 L25 90 Z"
              fill={isBranded ? '#1A1817' : '#EDE8DE'}
              stroke={isBranded ? '#3D3630' : '#B8B0A2'}
              strokeWidth="3"
            />
            {/* Polo Collar */}
            <path
              d="M115 50 L160 85 L135 115 L95 65 Z"
              fill={isBranded ? '#272320' : '#DDD7CB'}
              stroke={isBranded ? '#483E36' : '#B0A89C'}
              strokeWidth="2"
            />
            <path
              d="M205 50 L160 85 L185 115 L225 65 Z"
              fill={isBranded ? '#272320' : '#DDD7CB'}
              stroke={isBranded ? '#483E36' : '#B0A89C'}
              strokeWidth="2"
            />
            {/* Button Placket */}
            <rect
              x="148"
              y="85"
              width="24"
              height="65"
              rx="2"
              fill={isBranded ? '#221F1C' : '#D5CFC3'}
              stroke={isBranded ? '#443A32' : '#AAA195'}
              strokeWidth="1.5"
            />
            {/* Pearl buttons */}
            <circle cx="160" cy="100" r="3" fill="#D7D3CC" stroke="#888" strokeWidth="0.5" />
            <circle cx="160" cy="120" r="3" fill="#D7D3CC" stroke="#888" strokeWidth="0.5" />
            <circle cx="160" cy="140" r="3" fill="#D7D3CC" stroke="#888" strokeWidth="0.5" />

            {/* Sleeve hems */}
            <line x1="25" y1="90" x2="60" y2="140" stroke={isBranded ? '#443A32' : '#AAA195'} strokeWidth="1.5" />
            <line x1="295" y1="90" x2="260" y2="140" stroke={isBranded ? '#443A32' : '#AAA195'} strokeWidth="1.5" />
          </svg>

          {/* Embroidered Left Chest Logo */}
          <div className="absolute top-[48%] left-[30%] -translate-x-1/2 -translate-y-1/2 text-left pointer-events-none">
            {isBranded ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded border flex items-center justify-center text-xs font-bold shadow-md"
                  style={{
                    borderColor: accentColor,
                    color: accentColor,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  }}
                >
                  {symbol}
                </div>
                <div className="flex flex-col">
                  <span
                    className="font-serif-luxury font-bold text-[10px] leading-tight tracking-wider uppercase"
                    style={{ color: accentColor }}
                  >
                    {brandName}
                  </span>
                  <span className="text-[6px] tracking-widest text-[#BDB5AB] font-mono">STAFF</span>
                </div>
              </div>
            ) : (
              <div className="w-10 h-6 border border-dashed border-stone-400 bg-stone-300/40 rounded flex items-center justify-center">
                <span className="text-[6px] text-stone-700 font-mono font-bold">BRENDSIZ</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. PACKAGING / KRAFT BAG
  if (type === 'packaging') {
    return (
      <div className={`mockup-renderer-root relative flex items-center justify-center p-3 select-none ${className}`}>
        <div
          className={`relative w-full max-w-[260px] aspect-[4/5] rounded-md shadow-2xl transition-all duration-700 p-5 flex flex-col justify-between border ${
            isBranded
              ? 'bg-[#C2A379] border-[#A8885C] text-[#241B13]'
              : 'bg-[#D0B897] border-[#B29875] text-stone-700 shadow-md'
          }`}
          style={{
            boxShadow: '0 20px 30px -10px rgba(0,0,0,0.3)',
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 100%)',
          }}
        >
          {/* Twisted paper handle cutout */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-24 h-12 border-4 border-[#7A5A39] rounded-t-full pointer-events-none" />

          {/* Bag serrated top fold */}
          <div className="w-full flex justify-between border-b border-black/10 pb-2">
            <span className="text-[8px] font-mono tracking-widest uppercase opacity-75">
              100% Eko Qayta Ishlangan Kraft
            </span>
            <span className="text-[8px] font-mono opacity-75">TAKEAWAY</span>
          </div>

          {/* Center Brand Identity */}
          {isBranded ? (
            <div className="my-auto text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#241B13] flex items-center justify-center text-xl font-bold mb-2">
                {symbol}
              </div>
              <h3 className="font-serif-luxury text-xl font-bold tracking-widest uppercase text-[#1F1710] leading-tight">
                {brandName}
              </h3>
              <div className="w-12 h-[1.5px] bg-[#241B13] my-1" />
              <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#3D2E21]">
                {brandTagline}
              </p>
              <p className="text-[7px] text-[#4A3828] mt-3 font-mono">
                HOT & FRESH • RESTAURANT DELIVERY
              </p>
            </div>
          ) : (
            <div className="my-auto text-center">
              <div className="w-16 h-16 rounded border-2 border-dashed border-stone-600/50 mx-auto mb-2 flex items-center justify-center text-xs font-mono font-bold text-stone-700">
                PRINTSIZ
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-stone-700 font-bold">
                ODDIY KRAFT PAKET
              </span>
            </div>
          )}

          <div className="border-t border-black/10 pt-2 flex items-center justify-between text-[8px] font-mono">
            <span>Toshkent, O‘zbekiston</span>
            <span>Yoqimli ishtaha!</span>
          </div>
        </div>
      </div>
    );
  }

  // 6. CAP / HEADWEAR (MILLIY DO‘PPI / BASEBALL CAP)
  return (
    <div className={`mockup-renderer-root relative flex items-center justify-center p-3 select-none ${className}`}>
      <div
        className={`relative w-full max-w-[260px] aspect-[4/3] rounded-2xl p-4 flex flex-col items-center justify-center border shadow-xl ${
          isBranded
            ? 'bg-gradient-to-b from-[#1C1A17] to-[#121110] border-[#443A30]'
            : 'bg-[#EDE7DD] border-[#C0B9AC] shadow-md'
        }`}
      >
        <svg viewBox="0 0 240 160" className="w-48 h-32" fill="none">
          {/* Cap Crown */}
          <path
            d="M30 110 C30 50, 80 20, 140 20 C180 20, 210 50, 210 110 Z"
            fill={isBranded ? '#1E1A17' : '#DDD7CB'}
            stroke={isBranded ? '#4D4133' : '#ABA395'}
            strokeWidth="3"
          />
          {/* Cap Visor */}
          <path
            d="M30 110 C50 135, 170 145, 230 115 C210 105, 140 100, 30 110 Z"
            fill={isBranded ? '#151311' : '#CEC7BA'}
            stroke={isBranded ? '#3F352A' : '#9E9586'}
            strokeWidth="2.5"
          />
          {/* Cap top button */}
          <circle cx="140" cy="20" r="5" fill="#D4AF37" />
        </svg>

        <div className="absolute top-[38%] left-[54%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          {isBranded ? (
            <div className="flex flex-col items-center">
              <span className="text-base" style={{ color: accentColor }}>
                {symbol}
              </span>
              <span
                className="font-serif-luxury text-[10px] font-bold tracking-widest uppercase"
                style={{ color: accentColor }}
              >
                {brandName}
              </span>
            </div>
          ) : (
            <span className="text-[8px] text-stone-600 font-mono font-bold">BRENDSIZ</span>
          )}
        </div>
        <span
          className={`text-[8px] font-mono uppercase tracking-widest mt-1 ${
            isBranded ? 'text-[#9C948A]' : 'text-stone-600 font-medium'
          }`}
        >
          {isBranded ? '3D Relyefli Kashta Bosh Kiyimi' : 'Oddiy Kepka'}
        </span>
      </div>
    </div>
  );
};
