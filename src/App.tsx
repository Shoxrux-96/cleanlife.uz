import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { HowWeBrand } from './components/HowWeBrand';
import { BrandingConsultation } from './components/BrandingConsultation';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { PortfolioSection } from './components/PortfolioSection';
import { WhyChooseUs } from './components/WhyChooseUs';
import { TargetAndJourney } from './components/TargetAndJourney';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { BusinessDashboard } from './components/dashboard/BusinessDashboard';
import { MessageCircle, Phone, X, Send, LayoutDashboard, ShieldCheck, Instagram } from 'lucide-react';
import { getStoredContactInfo } from './data/cmsInitialData';
import { loadContactInfo } from './api/siteSync';
import type { PublicContactInfo } from './types';

function MainApp() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [contactInfo, setContactInfo] = useState<PublicContactInfo>(() => {
    try { return getStoredContactInfo(); } catch {
      return { phone1: '', phone2: '', email: '', telegram: '', instagram: '', address: '', workingHours: '' };
    }
  });

  useEffect(() => {
    loadContactInfo().then(setContactInfo).catch(() => {});
    const syncContact = () => {
      try { setContactInfo(getStoredContactInfo()); } catch { /* noop */ }
    };
    window.addEventListener('brendor_cms_updated', syncContact);
    window.addEventListener('storage', syncContact);
    return () => {
      window.removeEventListener('brendor_cms_updated', syncContact);
      window.removeEventListener('storage', syncContact);
    };
  }, []);
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('brendor_logged_in') !== 'false';
  });

  const [currentView, setCurrentView] = useState<'site' | 'dashboard'>(() => {
    const saved = localStorage.getItem('brendor_view');
    return saved === 'dashboard' ? 'dashboard' : 'site';
  });

  const handleSwitchView = (view: 'site' | 'dashboard') => {
    setCurrentView(view);
    localStorage.setItem('brendor_view', view);
  };

  const handleOpenQuote = () => {
    // Quote form section removed — scroll to contact section instead
    const contactElement = document.getElementById('contact');
    if (contactElement) {
      contactElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenLogin = () => {
    if (isLoggedIn) {
      handleSwitchView('dashboard');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    localStorage.setItem('brendor_logged_in', 'true');
    setIsLoginModalOpen(false);
    handleSwitchView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('brendor_logged_in');
    handleSwitchView('site');
  };

  // If in Dashboard View, render the Business ERP Dashboard
  if (currentView === 'dashboard') {
    return (
      <BusinessDashboard
        onBackToSite={() => handleSwitchView('site')}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-[#C59B27] selection:text-black transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#121110] text-[#EFECE6]' : 'bg-[#FAF8F5] text-[#1A1715]'
    }`}>
      {/* 4. Sticky Header with Login & Theme controls */}
      <Header
        onOpenQuote={() => handleOpenQuote()}
        onOpenLogin={handleOpenLogin}
        isLoggedIn={isLoggedIn}
        onOpenDashboard={() => handleSwitchView('dashboard')}
      />

      {/* Persistent Bar when logged in as Manager */}
      {isLoggedIn && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b transition-colors ${
          theme === 'dark' 
            ? 'bg-[#1C1814] border-[#3E342B] text-[#CFC6B9]' 
            : 'bg-[#F2ECE1] border-[#E2DBD1] text-[#383127]'
        }`}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.app.adminBar} <strong>Akbar Xolmatov</strong></span>
            </div>
            <button
              onClick={() => handleSwitchView('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#D4AF37] hover:bg-[#E2BE46] text-black font-bold text-[11px] transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.app.erpGo}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Hero Section & 6. Hero Interactive Transformation */}
      <Hero onOpenQuote={() => handleOpenQuote()} />

      {/* Before / After Interactive Draggable Slider */}
      <BeforeAfterSlider />

      {/* 8. "How We Brand" Section (Mahsulot sizniki. Brendingiz — bizning ishimiz.) */}
      <HowWeBrand />

      {/* 9. Branding Service (Biz faqat logo joylashtirmaymiz...) */}
      <BrandingConsultation onOpenQuote={() => handleOpenQuote()} />

      {/* 10. Portfolio (Brendlangan loyihalarimiz) */}
      <PortfolioSection />

      {/* 15. Why Choose Us (Nega biz? 5 sections) */}
      <WhyChooseUs />

      {/* 16. Target Businesses & 17. New Restaurant Branding Journey */}
      <TargetAndJourney onOpenQuote={() => handleOpenQuote()} />

      {/* 18. Contact */}
      <ContactSection />

      {/* 22. Footer */}
      <Footer />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Floating Quick Action Widget for Instant Telegram / Phone Contact */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Floating Quick Dashboard Shortcut if logged in */}
        {isLoggedIn && (
          <button
            onClick={() => setCurrentView('dashboard')}
            className="group flex items-center gap-2 p-3.5 rounded-full bg-[#1F1B17] hover:bg-[#2A231C] border-2 border-[#524436] text-[#D4AF37] shadow-2xl hover:scale-105 transition-all"
            title={t.app.dashboardTitle}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold uppercase tracking-wider pr-1">
              {t.app.erpSystem}
            </span>
          </button>
        )}

        <div className="relative flex items-center justify-center">
          {/* Phone-call style pulsing ripple aura rings */}
          <span className="absolute -inset-1 rounded-full bg-[#0088cc] opacity-60 animate-ping pointer-events-none" />
          <span className="absolute -inset-2.5 rounded-full bg-[#0088cc]/30 opacity-75 animate-pulse pointer-events-none" />

          <a
            href={`https://t.me/${contactInfo.telegram.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
            className="relative group flex items-center p-3.5 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-[0_8px_25px_rgba(0,136,204,0.55)] hover:scale-105 active:scale-95 transition-all border-2 border-white/30 cursor-pointer z-10"
            title={t.app.telegramWrite}
          >
            <span className="relative flex items-center justify-center shrink-0">
              <Send className="telegram-call-wiggle w-5 h-5 text-white shrink-0" />
              {/* Online indicator dot */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
            </span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold tracking-wide text-white group-hover:pl-2 pr-1">
              {t.app.telegramWrite}
            </span>
          </a>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Instagram aura rings */}
          <span className="absolute -inset-1 rounded-full bg-[#DD2A7B] opacity-60 animate-ping pointer-events-none" />
          <span className="absolute -inset-2.5 rounded-full bg-[#DD2A7B]/30 opacity-75 animate-pulse pointer-events-none" />

          <a
            href={`https://instagram.com/${contactInfo.instagram.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
            className="group relative z-10 flex items-center gap-2 p-3.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:scale-105 text-white shadow-2xl transition-all border-2 border-white/30 cursor-pointer"
            title="Instagram sahifamiz"
          >
            <Instagram className="w-5 h-5" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold tracking-wide pr-1">
              {contactInfo.instagram}
            </span>
          </a>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Phone aura rings */}
          <span className="absolute -inset-1 rounded-full bg-[#D4AF37] opacity-60 animate-ping pointer-events-none" />
          <span className="absolute -inset-2.5 rounded-full bg-[#D4AF37]/30 opacity-75 animate-pulse pointer-events-none" />

          <a
            href={`tel:${contactInfo.phone1.replace(/[^0-9+]/g, '')}`}
            className="group relative z-10 flex items-center gap-2 p-3.5 rounded-full bg-[#D4AF37] hover:bg-[#E8C872] text-black shadow-2xl hover:scale-105 transition-all border-2 border-white/30 cursor-pointer"
            title={t.app.call}
          >
            <Phone className="w-5 h-5" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold uppercase tracking-wider pr-1">
              {contactInfo.phone1}
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
