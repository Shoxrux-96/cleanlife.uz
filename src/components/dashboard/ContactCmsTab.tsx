import React, { useState, useEffect } from 'react';
import { ContactMessage, ContactMessageStatus, PublicContactInfo } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Phone, MessageSquare, Send, Instagram, MapPin, Clock, 
  CheckCircle2, Search, Trash2, Plus, Edit2, Save, X, Globe, User, Mail, Eye
} from 'lucide-react';

interface ContactCmsTabProps {
  messages: ContactMessage[];
  contactInfo: PublicContactInfo;
  onUpdateMessages: (msgs: ContactMessage[]) => void;
  onUpdateContactInfo: (info: PublicContactInfo) => void;
  showNotification: (msg: string) => void;
}

export const ContactCmsTab: React.FC<ContactCmsTabProps> = ({
  messages,
  contactInfo,
  onUpdateMessages,
  onUpdateContactInfo,
  showNotification
}) => {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<'messages' | 'settings'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [isNewMsgModalOpen, setIsNewMsgModalOpen] = useState(false);
  const [viewingMsg, setViewingMsg] = useState<ContactMessage | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<PublicContactInfo>(contactInfo);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // DB dan kelgan yangilikda formani yangilash
  useEffect(() => {
    setSettingsForm(contactInfo);
  }, [contactInfo]);

  // Manual message state
  const [newMsg, setNewMsg] = useState({ name: '', phone: '+998 ', email: '', message: '' });

  const handleStatusChange = (id: string, nextStatus: ContactMessageStatus) => {
    const updated = messages.map(m => m.id === id ? { ...m, status: nextStatus } : m);
    onUpdateMessages(updated);
    showNotification(t.dash.cmsContact.msg.statusUpdated);
  };

  const handleDeleteMessage = (id: string) => {
    if (window.confirm(t.dash.cmsContact.msg.confirmDelete)) {
      const updated = messages.filter(m => m.id !== id);
      onUpdateMessages(updated);
      showNotification(t.dash.cmsContact.msg.deleted);
    }
  };

  const handleCreateManualMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.name.trim() || !newMsg.phone.trim()) {
      alert(t.dash.cmsContact.msg.fillNamePhone);
      return;
    }

    const created: ContactMessage = {
      id: `msg-${Date.now()}`,
      name: newMsg.name.trim(),
      phone: newMsg.phone.trim(),
      email: newMsg.email.trim(),
      message: newMsg.message.trim() || t.dash.cmsContact.msg.defaultMessage,
      status: 'yangi',
      createdAt: new Date().toISOString()
    };

    onUpdateMessages([created, ...messages]);
    showNotification(t.dash.cmsContact.msg.saved);
    setIsNewMsgModalOpen(false);
    setNewMsg({ name: '', phone: '+998 ', email: '', message: '' });
  };

  const handleSaveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    onUpdateContactInfo(settingsForm);
    setTimeout(() => {
      setIsSavingSettings(false);
      showNotification(t.dash.cmsContact.msg.infoSaved);
    }, 400);
  };

  const filteredMessages = messages.filter(m => {
    const matchStatus = activeStatus === 'all' || m.status === activeStatus;
    const matchSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const unreadCount = messages.filter(m => m.status === 'yangi').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1A1816] border border-[#302820] shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-serif-luxury text-[#FAF7F2] flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#D4AF37]" />
              <span>{t.dash.cmsContact.header.title}</span>
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold animate-pulse">
                +{unreadCount} {t.dash.cmsContact.header.badgeSuffix}
              </span>
            )}
          </div>
          <p className="text-xs text-[#9E9486] mt-1">
            {t.dash.cmsContact.header.subtitle}
          </p>
        </div>

        {/* SubTab switcher */}
        <div className="flex items-center p-1 bg-[#121110] rounded-xl border border-[#2B231D]">
          <button
            onClick={() => setSubTab('messages')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'messages'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-[#8E8476] hover:text-[#FAF7F2]'
            }`}
          >
            {t.dash.cmsContact.tabs.messages} ({messages.length})
          </button>
          <button
            onClick={() => setSubTab('settings')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'settings'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-[#8E8476] hover:text-[#FAF7F2]'
            }`}
          >
            {t.dash.cmsContact.tabs.settings}
          </button>
        </div>
      </div>

      {/* SUBTAB 1: MESSAGES LIST */}
      {subTab === 'messages' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#181614] p-3 rounded-xl border border-[#2C241D]">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setActiveStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeStatus === 'all'
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
                }`}
              >
                {t.dash.cmsContact.filter.all} ({messages.length})
              </button>
              <button
                onClick={() => setActiveStatus('yangi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeStatus === 'yangi'
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
                }`}
              >
                {t.dash.cmsContact.filter.yangi} ({messages.filter(m => m.status === 'yangi').length})
              </button>
              <button
                onClick={() => setActiveStatus('oqildi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeStatus === 'oqildi'
                    ? 'bg-blue-500 text-white font-bold'
                    : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
                }`}
              >
                {t.dash.cmsContact.filter.oqildi} ({messages.filter(m => m.status === 'oqildi').length})
              </button>
              <button
                onClick={() => setActiveStatus('javob_berildi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeStatus === 'javob_berildi'
                    ? 'bg-purple-500 text-white font-bold'
                    : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
                }`}
              >
                {t.dash.cmsContact.filter.javob} ({messages.filter(m => m.status === 'javob_berildi').length})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 text-[#8E8476] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.dash.cmsContact.search.placeholder}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#121110] border border-[#332A22] text-xs text-[#FAF7F2] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <button
                onClick={() => setIsNewMsgModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27211A] hover:bg-[#D4AF37] hover:text-black border border-[#3D3328] text-xs font-bold text-[#D4AF37] transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.dash.cmsContact.actions.add}</span>
              </button>
            </div>
          </div>

          {/* Messages Table */}
          <div className="rounded-xl bg-[#181614] border border-[#2D251D] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[820px]">
                <thead>
                  <tr className="bg-[#121110] border-b border-[#2D251D] text-[#8E8476] uppercase tracking-wider text-[11px]">
                    <th className="text-left font-semibold px-4 py-3 w-10">№</th>
                    <th className="text-left font-semibold px-4 py-3">{t.dash.cmsContact.table.date}</th>
                    <th className="text-left font-semibold px-4 py-3">{t.dash.cmsContact.table.name}</th>
                    <th className="text-left font-semibold px-4 py-3">{t.dash.cmsContact.table.phone}</th>
                    <th className="text-left font-semibold px-4 py-3">{t.dash.cmsContact.table.email}</th>
                    <th className="text-left font-semibold px-4 py-3">{t.dash.cmsContact.table.message}</th>
                    <th className="text-left font-semibold px-4 py-3">{t.dash.cmsContact.table.status}</th>
                    <th className="text-right font-semibold px-4 py-3">{t.dash.cmsContact.table.ops}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg, idx) => (
                    <tr
                      key={msg.id}
                      onClick={() => setViewingMsg(msg)}
                      className="border-b border-[#241E18] last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-[#8E8476] font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 text-[#B8ADA0] whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#FAF7F2] whitespace-nowrap">{msg.name}</td>
                      <td className="px-4 py-3 text-[#D6CEBF] whitespace-nowrap">{msg.phone}</td>
                      <td className="px-4 py-3 text-[#6EE7B7] whitespace-nowrap">{msg.email || '—'}</td>
                      <td className="px-4 py-3 text-[#B8ADA0] max-w-[260px] truncate">{msg.message}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={msg.status}
                          onChange={(e) => handleStatusChange(msg.id, e.target.value as ContactMessageStatus)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border outline-none cursor-pointer ${
                            msg.status === 'yangi'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                              : msg.status === 'oqildi'
                              ? 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                              : 'bg-purple-950/40 text-purple-400 border-purple-800/40'
                          }`}
                        >
                          <option value="yangi" className="bg-[#181614] text-[#FAF7F2]">{t.dash.cmsContact.table.stYangi}</option>
                          <option value="oqildi" className="bg-[#181614] text-[#FAF7F2]">{t.dash.cmsContact.table.stOqildi}</option>
                          <option value="javob_berildi" className="bg-[#181614] text-[#FAF7F2]">{t.dash.cmsContact.table.stJavob}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingMsg(msg)}
                            className="p-1.5 rounded-lg text-[#8E8476] hover:text-[#D4AF37] hover:bg-white/5 transition-colors cursor-pointer"
                            title={t.dash.cmsContact.table.viewTitle}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1.5 rounded-lg text-[#8E8476] hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                            title={t.dash.cmsContact.table.deleteTitle}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMessages.length === 0 && (
              <div className="p-10 text-center">
                <MessageSquare className="w-8 h-8 text-[#6E6456] mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-[#FAF7F2]">{t.dash.cmsContact.empty.title}</h4>
                <p className="text-xs text-[#8E8476] mt-0.5">{t.dash.cmsContact.empty.desc}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PUBLIC CONTACT SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveContactInfo} className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#2D251D] shadow-lg space-y-6">
          <div className="border-b border-[#E2DBD1] dark:border-[#2C241C] pb-4">
            <h3 className="font-serif-luxury font-bold text-base text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#8C6207] dark:text-[#D4AF37]" />
              <span>{t.dash.cmsContact.settings.title}</span>
            </h3>
            <p className="text-xs text-[#6B6152] dark:text-[#9E9486] mt-0.5">
              {t.dash.cmsContact.settings.desc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{t.dash.cmsContact.settings.phone1}</span>
              </label>
              <input
                type="text"
                value={settingsForm.phone1}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone1: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{t.dash.cmsContact.settings.phone2}</span>
              </label>
              <input
                type="text"
                value={settingsForm.phone2}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone2: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#6EE7B7]" />
                <span>{t.dash.cmsContact.settings.email}</span>
              </label>
              <input
                type="email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                placeholder="info@cleanlife.uz"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#64B5F6]" />
                <span>{t.dash.cmsContact.settings.telegram}</span>
              </label>
              <input
                type="text"
                value={settingsForm.telegram}
                onChange={(e) => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                placeholder="@brendor_horeca"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-[#F06292]" />
                <span>{t.dash.cmsContact.settings.instagram}</span>
              </label>
              <input
                type="text"
                value={settingsForm.instagram}
                onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                placeholder="@brendor.horeca"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.dash.cmsContact.settings.address}</span>
              </label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.dash.cmsContact.settings.addressRu}</span>
              </label>
              <input
                type="text"
                value={settingsForm.address_ru || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, address_ru: e.target.value })}
                placeholder="г. Ташкент, ..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.dash.cmsContact.settings.hours}</span>
              </label>
              <input
                type="text"
                value={settingsForm.workingHours}
                onChange={(e) => setSettingsForm({ ...settingsForm, workingHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.dash.cmsContact.settings.hoursRu}</span>
              </label>
              <input
                type="text"
                value={settingsForm.workingHours_ru || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, workingHours_ru: e.target.value })}
                placeholder="Понедельник — Суббота: 09:00 - 19:00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#E2DBD1] dark:border-[#29221B]">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E5C158] text-black font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSettings ? t.dash.cmsContact.settings.saving : t.dash.cmsContact.settings.save}</span>
            </button>
          </div>
        </form>
      )}

      {/* DETAIL VIEW MODAL */}
      {viewingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingMsg(null)}>
          <div
            className="relative w-full max-w-lg bg-white dark:bg-[#171513] border border-[#E2DBD1] dark:border-[#3D3328] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2DBD1] dark:border-[#2C241C] pb-3">
              <h3 className="font-serif-luxury text-base font-bold text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.dash.cmsContact.detail.title}</span>
              </h3>
              <button onClick={() => setViewingMsg(null)} className="text-[#6B6152] dark:text-[#8E8476] hover:text-black dark:hover:text-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#8C6207] dark:text-[#D4AF37] flex items-center justify-center font-bold text-lg">
                {viewingMsg.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2] block">{viewingMsg.name}</span>
                <span className="text-[11px] text-[#6B6152] dark:text-[#8E8476]">
                  {new Date(viewingMsg.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <select
                value={viewingMsg.status}
                onChange={(e) => {
                  handleStatusChange(viewingMsg.id, e.target.value as ContactMessageStatus);
                  setViewingMsg({ ...viewingMsg, status: e.target.value as ContactMessageStatus });
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border outline-none cursor-pointer ${
                  viewingMsg.status === 'yangi'
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                    : viewingMsg.status === 'oqildi'
                    ? 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                    : 'bg-purple-950/40 text-purple-400 border-purple-800/40'
                }`}
              >
                <option value="yangi" className="bg-[#181614] text-[#FAF7F2]">{t.dash.cmsContact.table.stYangi}</option>
                <option value="oqildi" className="bg-[#181614] text-[#FAF7F2]">{t.dash.cmsContact.table.stOqildi}</option>
                <option value="javob_berildi" className="bg-[#181614] text-[#FAF7F2]">{t.dash.cmsContact.table.stJavob}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#241E18]">
                <span className="text-[10px] uppercase tracking-wider text-[#6B6152] dark:text-[#8E8476] font-mono block mb-1">{t.dash.cmsContact.detail.phone}</span>
                <span className="font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{viewingMsg.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#241E18]">
                <span className="text-[10px] uppercase tracking-wider text-[#6B6152] dark:text-[#8E8476] font-mono block mb-1">{t.dash.cmsContact.detail.email}</span>
                <span className="font-semibold text-[#047857] dark:text-[#6EE7B7]">{viewingMsg.email || '—'}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#241E18]">
              <span className="text-[10px] uppercase tracking-wider text-[#6B6152] dark:text-[#8E8476] font-mono block mb-1.5">{t.dash.cmsContact.detail.messageText}</span>
              <p className="text-sm text-[#4A4033] dark:text-[#D6CEBF] leading-relaxed whitespace-pre-wrap">{viewingMsg.message}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${viewingMsg.phone.replace(/[^0-9+]/g, '')}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 dark:bg-[#221D18] hover:bg-stone-200 dark:hover:bg-[#2F2720] border border-[#E2DBD1] dark:border-[#3B3227] text-xs font-medium text-[#1A1715] dark:text-[#FAF7F2] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#8C6207] dark:text-[#D4AF37]" />
                <span>{t.dash.cmsContact.detail.call}</span>
              </a>
              {viewingMsg.email ? (
                <a
                  href={`mailto:${viewingMsg.email}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-[#16241E] hover:bg-emerald-100 dark:hover:bg-[#1D3027] border border-emerald-200 dark:border-[#1F4433] text-xs font-medium text-[#047857] dark:text-[#6EE7B7] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t.dash.cmsContact.detail.emailWrite}</span>
                </a>
              ) : null}
              <a
                href={`https://t.me/+${viewingMsg.phone.replace(/[^0-9+]/g, '').replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-50 dark:bg-[#1B2936] hover:bg-sky-100 dark:hover:bg-[#23384B] border border-sky-200 dark:border-[#2E4559] text-xs font-medium text-[#0284C7] dark:text-[#64B5F6] transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.dash.cmsContact.detail.telegramOpen}</span>
              </a>
              <button
                onClick={() => {
                  handleDeleteMessage(viewingMsg.id);
                  setViewingMsg(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 text-xs font-medium text-red-600 dark:text-red-400 transition-colors cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.dash.cmsContact.detail.delete}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL MESSAGE MODAL */}
      {isNewMsgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#171513] border border-[#3D3328] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C241C] pb-3">
              <h3 className="font-serif-luxury text-base font-bold text-[#FAF7F2]">
                {t.dash.cmsContact.manual.title}
              </h3>
              <button onClick={() => setIsNewMsgModalOpen(false)} className="text-[#8E8476] hover:text-[#FAF7F2]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">{t.dash.cmsContact.manual.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={newMsg.name}
                  onChange={(e) => setNewMsg({ ...newMsg, name: e.target.value })}
                  placeholder={t.dash.cmsContact.manual.namePh}
                  className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">{t.dash.cmsContact.manual.phoneLabel}</label>
                <input
                  type="text"
                  required
                  value={newMsg.phone}
                  onChange={(e) => setNewMsg({ ...newMsg, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">{t.dash.cmsContact.manual.emailLabel}</label>
                <input
                  type="email"
                  value={newMsg.email}
                  onChange={(e) => setNewMsg({ ...newMsg, email: e.target.value })}
                  placeholder="pochta@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1">{t.dash.cmsContact.manual.messageLabel}</label>
                <textarea
                  rows={3}
                  value={newMsg.message}
                  onChange={(e) => setNewMsg({ ...newMsg, message: e.target.value })}
                  placeholder={t.dash.cmsContact.manual.messagePh}
                  className="w-full px-3 py-2 rounded-xl bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMsgModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#221D18] text-[#9E9486] text-xs font-semibold"
                >
                  {t.dash.cmsContact.manual.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] text-black text-xs font-bold"
                >
                  {t.dash.cmsContact.manual.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
