import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Phone, Send, Sparkles, ShieldCheck, 
  Sun, Moon, LogIn, LayoutDashboard, Globe, ChevronDown, Check
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  onOpenQuote: () => void;
  onOpenLogin: () => void;
  isLoggedIn?: boolean;
  onOpenDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenQuote, 
  onOpenLogin, 
  isLoggedIn = false, 
  onOpenDashboard 
}) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target as Node)) setMobileLangOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: t.nav.home, href: '#hero' },
    { label: t.nav.process, href: '#process' },
    { label: t.nav.branding, href: '#branding' },
    { label: t.nav.portfolio, href: '#portfolio' },
    { label: t.nav.why, href: '#why-us' },
    { label: t.nav.clients, href: '#clients' },
    { label: t.nav.contact, href: '#contact' },
  ];

  return (
    <>
      {/* Main Sticky Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-md ${
          isScrolled
            ? (theme === 'dark'
                ? 'bg-[#121110]/95 border-b border-[#2E2824] shadow-xl py-3.5'
                : 'bg-[#FAF8F5]/95 border-b border-[#E2DBD1] shadow-md py-3.5')
            : (theme === 'dark'
                ? 'bg-[#121110]/80 border-b border-white/5 py-4'
                : 'bg-[#FAF8F5]/95 border-b border-[#E2DBD1] shadow-sm py-4')
        }`}
      >
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo on Left */}
          <a href="#hero" className="flex flex-col leading-tight">
            <span className="font-serif-luxury text-xl font-bold tracking-widest text-[#8C6207] dark:text-[#D4AF37]">
              CLEAN LIFE
            </span>
            <span className="text-[10px] lowercase tracking-[0.2em] font-medium text-[#8C6207] dark:text-[#D4AF37]">
              cleanlife.uz
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-[14px] font-medium transition-colors relative py-1 hover:after:w-full after:w-0 after:h-[1.5px] after:absolute after:bottom-0 after:left-0 after:transition-all after:duration-300 ${
                  theme === 'dark'
                    ? 'text-[#C8C0B5] hover:text-[#D4AF37] after:bg-[#D4AF37]'
                    : 'text-[#383127] hover:text-[#8C6207] after:bg-[#8C6207]'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Primary CTA, Theme Switcher & Login */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Language Dropdown (UZ / RU) */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                  theme === 'dark'
                    ? 'bg-[#1F1B17] hover:bg-[#2A241F] border-[#3E342B] text-[#D4AF37]'
                    : 'bg-[#F4EFE6] hover:bg-[#EAE2D5] border-[#E2DBD1] text-[#8C6207]'
                }`}
                title={t.header.langLabel}
                aria-label={t.header.langLabel}
              >
                <Globe className="w-4 h-4" />
                <span>{lang}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className={`absolute right-0 top-full mt-2 w-36 rounded-xl border shadow-xl overflow-hidden z-50 ${
                  theme === 'dark' ? 'bg-[#1C1915] border-[#3E342B]' : 'bg-white border-[#E2DBD1]'
                }`}>
                  {(['uz', 'ru'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        lang === l
                          ? theme === 'dark' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-amber-50 text-[#8C6207]'
                          : theme === 'dark' ? 'text-[#C8C0B5] hover:bg-white/5' : 'text-[#383127] hover:bg-black/5'
                      }`}
                    >
                      <span>{l === 'uz' ? 'O‘zbekcha' : 'Русский'}</span>
                      {lang === l && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle (Kun-tun rejimi) */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                theme === 'dark'
                  ? 'bg-[#1F1B17] hover:bg-[#2A241F] border-[#3E342B] text-[#D4AF37]'
                  : 'bg-[#F4EFE6] hover:bg-[#EAE2D5] border-[#E2DBD1] text-[#8C6207]'
              }`}
              title={theme === 'dark' ? t.header.dayTitle : t.header.nightTitle}
              aria-label={t.header.themeLabel}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Login / Dashboard Button */}
            {isLoggedIn ? (
              <button
                onClick={onOpenDashboard}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm ${
                  theme === 'dark'
                    ? 'bg-[#272019] hover:bg-[#332A20] border-[#524436] text-[#D4AF37]'
                    : 'bg-[#F4EFE6] hover:bg-[#EAE2D5] border-[#D4AF37]/50 text-[#8C6207]'
                }`}
                title={t.header.dashboardTitle}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.header.dashboard}</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm ${
                  theme === 'dark'
                    ? 'bg-[#201B17] hover:bg-[#2C241F] border-[#3E342B] text-[#EFECE6] hover:text-[#D4AF37]'
                    : 'bg-[#F4EFE6] hover:bg-[#EAE2D5] border-[#E2DBD1] text-[#1A1715] hover:text-[#8C6207]'
                }`}
                title={t.header.loginTitle}
              >
                <LogIn className={`w-4 h-4 ${theme === 'dark' ? 'text-[#D4AF37]' : 'text-[#8C6207]'}`} />
                <span>{t.header.login}</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {/* Mobile Language Dropdown */}
            <div ref={mobileLangRef} className="relative">
              <button
                onClick={() => setMobileLangOpen((v) => !v)}
                className={`flex items-center gap-1 p-2 rounded-lg border text-[11px] font-bold uppercase ${
                  theme === 'dark'
                    ? 'bg-[#201B17] border-[#3E342B] text-[#D4AF37]'
                    : 'bg-[#F4EFE6] border-[#E2DBD1] text-[#8C6207]'
                }`}
                title={t.header.langLabel}
                aria-label={t.header.langLabel}
              >
                <Globe className="w-4 h-4" />
                <span>{lang}</span>
              </button>
              {mobileLangOpen && (
                <div className={`absolute right-0 top-full mt-2 w-36 rounded-xl border shadow-xl overflow-hidden z-50 ${
                  theme === 'dark' ? 'bg-[#1C1915] border-[#3E342B]' : 'bg-white border-[#E2DBD1]'
                }`}>
                  {(['uz', 'ru'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setMobileLangOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
                        lang === l
                          ? theme === 'dark' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-amber-50 text-[#8C6207]'
                          : theme === 'dark' ? 'text-[#C8C0B5]' : 'text-[#383127]'
                      }`}
                    >
                      <span>{l === 'uz' ? 'O‘zbekcha' : 'Русский'}</span>
                      {lang === l && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border text-xs ${
                theme === 'dark'
                  ? 'bg-[#201B17] border-[#3E342B] text-[#D4AF37]'
                  : 'bg-[#F4EFE6] border-[#E2DBD1] text-[#8C6207]'
              }`}
              title={t.header.themeLabel}
              aria-label={t.header.themeLabel}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile Login / Dashboard */}
            {isLoggedIn ? (
              <button
                onClick={onOpenDashboard}
                className={`p-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#272019] border-[#524436] text-[#D4AF37]'
                    : 'bg-[#F4EFE6] border-[#D4AF37]/50 text-[#8C6207]'
                }`}
                title={t.header.dashboard}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                  theme === 'dark'
                    ? 'bg-[#201B17] border-[#3E342B] text-[#D4AF37]'
                    : 'bg-[#F4EFE6] border-[#E2DBD1] text-[#8C6207]'
                }`}
                title={t.header.login}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.header.login}</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg focus:outline-none ${
                theme === 'dark' ? 'text-[#C8C0B5] hover:text-white' : 'text-[#383127] hover:text-black'
              }`}
              aria-label={t.header.menuLabel}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-b px-5 py-6 space-y-4 animate-in fade-in slide-in-from-top-3 ${
            theme === 'dark' ? 'bg-[#161413] border-[#302B26]' : 'bg-white border-[#E2DBD1] shadow-xl'
          }`}>
            <div className={`p-3 rounded-lg border text-xs mb-4 ${
              theme === 'dark' 
                ? 'bg-[#201D1A] border-[#3E3730] text-[#CFC6B9]' 
                : 'bg-[#F4EFE6] border-[#E2DBD1] text-[#383127]'
            }`}>
              <span className={`font-semibold ${theme === 'dark' ? 'text-[#D4AF37]' : 'text-[#8C6207]'}`}>
                {t.header.mobileNote1}
              </span>
              <p className={`mt-0.5 text-[11px] ${theme === 'dark' ? 'text-[#A89F93]' : 'text-[#695E50]'}`}>
                {t.header.mobileNote2}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 text-[15px] rounded transition-colors ${
                    theme === 'dark'
                      ? 'text-[#DDD7CD] hover:text-[#D4AF37] hover:bg-white/5'
                      : 'text-[#383127] hover:text-[#8C6207] hover:bg-black/5'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className={`pt-4 border-t flex flex-col gap-2 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDashboard && onOpenDashboard();
                  }}
                  className={`w-full py-2.5 rounded-md border font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-[#251F19] border-[#524436] text-[#D4AF37] hover:bg-[#302820]'
                      : 'bg-[#F4EFE6] border-[#D4AF37]/60 text-[#8C6207] hover:bg-[#EAE0D0]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{t.header.erpDashboard}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className={`w-full py-2.5 rounded-md border font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-[#221D19] border-[#3E342B] text-[#EFECE6] hover:text-[#D4AF37]'
                      : 'bg-[#F4EFE6] border-[#E2DBD1] text-[#1A1715] hover:text-[#8C6207]'
                  }`}
                >
                  <LogIn className={`w-4 h-4 ${theme === 'dark' ? 'text-[#D4AF37]' : 'text-[#8C6207]'}`} />
                  <span>{t.header.businessLogin}</span>
                </button>
              )}

              <a
                href="https://t.me/brendor_horeca"
                target="_blank"
                rel="noreferrer"
                className={`w-full py-2.5 rounded border text-xs text-center flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'border-[#453D34] text-[#D8D0C5] hover:bg-white/5'
                    : 'border-[#E2DBD1] text-[#383127] hover:bg-black/5'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-[#0088cc]" />
                {t.header.telegramContact}
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
