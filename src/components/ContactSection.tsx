import React, { useState, useEffect } from 'react';
import { Phone, Send, Instagram, MessageCircle, MapPin, Clock, QrCode, CheckCircle2 } from 'lucide-react';
import { getStoredContactInfo, getStoredContactMessages, notifyCmsUpdated } from '../data/cmsInitialData';
import { loadContactInfo } from '../api/siteSync';
import { PublicContactInfo, ContactMessage } from '../types';
import { erpApi } from '../api/erpApi';
import { useLanguage } from '../context/LanguageContext';

export const ContactSection: React.FC = () => {
  const { t, lang } = useLanguage();
  const [contactInfo, setContactInfo] = useState<PublicContactInfo>(() => getStoredContactInfo());
  const address = lang === 'ru' ? (contactInfo.address_ru || contactInfo.address) : contactInfo.address;
  const workingHours = lang === 'ru' ? (contactInfo.workingHours_ru || contactInfo.workingHours) : contactInfo.workingHours;
  const [quickMsg, setQuickMsg] = useState({ name: '', phone: '', email: '', message: '' });
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    // DB dagi so'nggi ma'lumot (boshqa qurilmadan yangilangan bo'lishi mumkin)
    loadContactInfo().then(setContactInfo).catch(() => {});
    const handleCmsUpdate = () => {
      setContactInfo(getStoredContactInfo());
    };
    window.addEventListener('brendor_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);
    return () => {
      window.removeEventListener('brendor_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
    };
  }, []);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMsg.name.trim() || !quickMsg.phone.trim()) return;

    const newMsg: ContactMessage = {
      id: `msg-${Date.now()}`,
      name: quickMsg.name.trim(),
      phone: quickMsg.phone.trim(),
      email: quickMsg.email.trim(),
      message: quickMsg.message.trim() || 'Saytdan tezkor xabar',
      status: 'yangi',
      createdAt: new Date().toISOString()
    };

    try {
      const stored = getStoredContactMessages();
      localStorage.setItem('brendor_contact_messages', JSON.stringify([newMsg, ...stored]));
      notifyCmsUpdated('messages');
    } catch (err) {
      console.error(err);
    }

    // DB ga saqlash (muvaffaqiyatsiz bo'lsa ham sayt ishlayveradi)
    erpApi.contactMessages.create({
      name: newMsg.name,
      phone: newMsg.phone,
      email: newMsg.email,
      message: newMsg.message,
      external_id: newMsg.id,
    }).catch((err) => console.error('DB xabar saqlashda xato:', err));

    setIsSent(true);
    setQuickMsg({ name: '', phone: '', email: '', message: '' });
    setTimeout(() => setIsSent(false), 5000);
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-[#F7F3EA] dark:bg-[#151312] border-t border-[#E2DBD1] dark:border-[#29221C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span             className="text-xs font-mono uppercase tracking-widest text-[#8C6207] dark:text-[#D4AF37] px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-[#201C17] border border-[#E2DBD1] dark:border-[#3E3428]">
            {t.contact.badge}
          </span>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mt-3 mb-4">
            {t.contact.title}
          </h2>

          <p className="text-[#6B6152] dark:text-[#A69C8E] text-base">
            {t.contact.desc}
          </p>
        </div>

        {/* Contact Info + QR + Fast message form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Contact Details (Left) */}
          <div className="lg:col-span-1">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1A1815] border border-[#E2DBD1] dark:border-[#312921] space-y-6 shadow-xl h-full">
              <h3 className="font-serif-luxury text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
                {t.contact.directTitle}
              </h3>

              <div className="space-y-4 text-sm text-[#5C554A] dark:text-[#C8BFAF]">
                <a
                  href={`tel:${contactInfo.phone1.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B231D] hover:border-[#D4AF37]/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-[#241E18] text-[#8C6207] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B6152] dark:text-[#8C8377] font-mono block">{t.contact.phone}</span>
                    <span className="font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{[contactInfo.phone1, contactInfo.phone2, contactInfo.phone3].filter(Boolean).join(' / ')}</span>
                  </div>
                </a>

                <a
                  href={`https://t.me/${contactInfo.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B231D] hover:border-[#D4AF37]/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-[#1B2936] text-[#0284C7] dark:text-[#64B5F6] flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B6152] dark:text-[#8C8377] font-mono block">{t.contact.telegram}</span>
                    <span className="font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{contactInfo.telegram}</span>
                  </div>
                </a>

                <a
                  href={`https://instagram.com/${contactInfo.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B231D] hover:border-[#D4AF37]/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-[#2E1E26] text-[#DB2777] dark:text-[#F06292] flex items-center justify-center shrink-0">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B6152] dark:text-[#8C8377] font-mono block">{t.contact.instagram}</span>
                    <span className="font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{contactInfo.instagram}</span>
                  </div>
                </a>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B231D]">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-[#241E18] text-[#8C6207] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B6152] dark:text-[#8C8377] font-mono block">{t.contact.address}</span>
                    <span className="font-semibold text-[#1A1715] dark:text-[#FAF7F2]">
                      {address}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-[#E2DBD1] dark:border-[#2B231D]">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-[#241E18] text-[#8C6207] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B6152] dark:text-[#8C8377] font-mono block">{t.contact.hours}</span>
                    <span className="font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{workingHours}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Message Form (Right) */}
          <div className="lg:col-span-1 bg-white dark:bg-[#1A1815] border border-[#E2DBD1] dark:border-[#312921] rounded-3xl p-6 sm:p-8 shadow-xl h-full">
            <h3 className="font-serif-luxury text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1">
              {t.contact.formTitle}
            </h3>
            <p className="text-xs text-[#6B6152] dark:text-[#A69C8E] mb-6">
              {t.contact.formDesc}
            </p>

            {isSent ? (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-[#221C16] border border-[#D4AF37] text-center">
                <CheckCircle2 className="w-10 h-10 text-[#8C6207] dark:text-[#D4AF37] mx-auto mb-2" />
                <h4 className="text-lg font-bold text-[#1A1715] dark:text-[#FAF7F2] mb-1">{t.contact.thanks}</h4>
                <p className="text-xs text-[#5C554A] dark:text-[#C8BFAF]">
                  {t.contact.thanksDesc}
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuickSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89E91] mb-1">
                    {t.contact.name}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.contact.namePh}
                    value={quickMsg.name}
                    onChange={(e) => setQuickMsg({ ...quickMsg, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#2D261F] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89E91] mb-1">
                    {t.contact.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={t.contact.phonePh}
                    value={quickMsg.phone}
                    onChange={(e) => setQuickMsg({ ...quickMsg, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#2D261F] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89E91] mb-1">
                    {t.contact.emailOpt}
                  </label>
                  <input
                    type="email"
                    placeholder="pochta@example.com"
                    value={quickMsg.email}
                    onChange={(e) => setQuickMsg({ ...quickMsg, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#2D261F] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#6B6152] dark:text-[#A89E91] mb-1">
                    {t.contact.message}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={t.contact.messagePh}
                    value={quickMsg.message}
                    onChange={(e) => setQuickMsg({ ...quickMsg, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#2D261F] text-[#1A1715] dark:text-[#FAF7F2] text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#E8C872] text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.contact.send}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
