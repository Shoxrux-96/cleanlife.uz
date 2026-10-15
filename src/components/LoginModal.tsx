import React, { useState, useEffect } from 'react';
import { X, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { erpApi } from '../api/erpApi';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

// Frontend himoya: ketma-ket xato urinishlardan keyin vaqtincha bloklash (brute-force)
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60;

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) {
        setLockedUntil(0);
        setFails(0);
        setError('');
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  if (!isOpen) return null;

  const isLocked = lockedUntil > now;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLocked || isLoading) return;

    const login = username.trim().slice(0, 150);
    // Kirish validatsiyasi (SQL injection belgilarini erta rad etish)
    if (!login || !password) {
      setError(t.login.fillError);
      return;
    }
    if (login.length > 150 || password.length > 150) {
      setError(t.login.tooLong);
      return;
    }
    if (!/^[\w.@+\-]+$/.test(login)) {
      setError(t.login.badChars);
      return;
    }

    setIsLoading(true);
    try {
      // Veb-saytga faqat admin kiradi (xodimlar mobil ilovadan kiradi)
      const res = await erpApi.auth.login({ login, password, client: 'web' });
      if (res.role !== 'admin') {
        throw new Error('Veb-saytga faqat boshqaruvchi (admin) kirishi mumkin.');
      }
      setFails(0);
      setIsLoading(false);
      onLoginSuccess();
    } catch (err) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Kirishda xatolik.';
      const nextFails = fails + 1;
      setFails(nextFails);
      if (nextFails >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_SECONDS * 1000);
        setError(`${t.login.lockedError} ${LOCK_SECONDS} ${t.login.wait}`);
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
      theme === 'dark' ? 'bg-black/80' : 'bg-stone-900/40'
    }`}>
      <div 
        className={`relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden transition-all border ${
          theme === 'dark' 
            ? 'bg-[#181513] border-[#3E342B] text-[#EFECE6]' 
            : 'bg-white border-[#DFD7CA] text-[#1A1715]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient gold glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 right-5 p-2 rounded-lg transition-colors cursor-pointer ${
            theme === 'dark'
              ? 'text-[#9E9385] hover:text-white hover:bg-white/5'
              : 'text-[#695E50] hover:text-black hover:bg-black/5'
          }`}
          aria-label={t.login.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <img
            src="/clean-life-logo.jpg"
            alt="Clean Life Group"
            className="h-14 w-auto rounded-xl mb-3 shadow-lg mx-auto"
          />
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${
              theme === 'dark'
                ? 'bg-[#262019] border-[#483B2D] text-[#D4AF37]'
                : 'bg-[#ECE5D8] border-[#D4C8B5] text-[#8C6207]'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CLEAN LIFE ERP TIZIMI</span>
            </span>
          </div>
          <h2 className={`font-serif-luxury text-2xl sm:text-3xl font-bold ${
            theme === 'dark' ? 'text-[#FDFBF7]' : 'text-[#1A1715]'
          }`}>
            {t.login.title}
          </h2>
          <p className={`text-xs sm:text-sm mt-1 max-w-xs mx-auto ${
            theme === 'dark' ? 'text-[#A89F93]' : 'text-[#695E50]'
          }`}>
            {t.login.desc}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#C8C0B5]' : 'text-[#4A4033]'
            }`}>
              {t.login.loginLabel}
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                theme === 'dark' ? 'text-[#8C8275]' : 'text-[#8C6207]'
              }`}>
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 150))}
                placeholder="admin"
                maxLength={150}
                autoComplete="username"
                disabled={isLoading || isLocked}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all border ${
                  theme === 'dark'
                    ? 'bg-[#221D19] border-[#3E352B] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-[#FDFBF7] placeholder-[#73685C]'
                    : 'bg-[#F8F5EE] border-[#D9D1C3] focus:border-[#8C6207] focus:ring-1 focus:ring-[#8C6207] text-[#1A1715] placeholder-[#8C8275]'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#C8C0B5]' : 'text-[#4A4033]'
            }`}>
              {t.login.passLabel}
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                theme === 'dark' ? 'text-[#8C8275]' : 'text-[#8C6207]'
              }`}>
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 150))}
                placeholder="••••••••"
                maxLength={150}
                autoComplete="current-password"
                disabled={isLoading || isLocked}
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all border ${
                  theme === 'dark'
                    ? 'bg-[#221D19] border-[#3E352B] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-[#FDFBF7] placeholder-[#73685C]'
                    : 'bg-[#F8F5EE] border-[#D9D1C3] focus:border-[#8C6207] focus:ring-1 focus:ring-[#8C6207] text-[#1A1715] placeholder-[#8C8275]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center ${
                  theme === 'dark' ? 'text-[#8C8275] hover:text-[#DDD6CC]' : 'text-[#695E50] hover:text-[#1A1715]'
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isLocked}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-[#121110] font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block animate-pulse">{t.login.checking}</span>
            ) : isLocked ? (
              <span>{Math.ceil((lockedUntil - now) / 1000)} {t.login.wait}</span>
            ) : (
              <>
                <span>{t.login.submit}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className={`text-center text-[11px] ${theme === 'dark' ? 'text-[#7F7466]' : 'text-[#8A7D6E]'}`}>
            {t.login.adminOnly}
          </p>

        </form>
      </div>
    </div>
  );
};
