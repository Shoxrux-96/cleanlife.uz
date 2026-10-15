import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations, SiteLang, TranslationDict } from '../i18n/index';

interface LanguageContextValue {
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
  t: TranslationDict;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'uz',
  setLang: () => {},
  t: translations.uz as unknown as TranslationDict,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SiteLang>(() => {
    try {
      const saved = localStorage.getItem('cleanlife_lang');
      return saved === 'ru' ? 'ru' : 'uz';
    } catch {
      return 'uz';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cleanlife_lang', lang);
    } catch { /* noop */ }
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz';
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang: setLangState,
    t: translations[lang] as unknown as TranslationDict,
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
