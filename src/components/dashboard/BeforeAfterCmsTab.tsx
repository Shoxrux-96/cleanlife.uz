import React, { useState, useEffect } from 'react';
import { BeforeAfterContent, BeforeAfterItemId, BeforeAfterPair } from '../../types';
import {
  SlidersHorizontal, Save, Upload, Image as ImageIcon, RotateCcw
} from 'lucide-react';
import { INITIAL_BEFORE_AFTER, INITIAL_BEFORE_AFTER_RU } from '../../data/cmsInitialData';
import { useLanguage } from '../../context/LanguageContext';

interface BeforeAfterCmsTabProps {
  content: BeforeAfterContent;
  onUpdateContent: (content: BeforeAfterContent) => void;
  contentLang: 'uz' | 'ru';
  onContentLangChange: (lang: 'uz' | 'ru') => void;
  showNotification: (msg: string) => void;
}

const ITEM_IDS: BeforeAfterItemId[] = ['wetwipe', 'apron', 'toothpick', 'polo'];

export const BeforeAfterCmsTab: React.FC<BeforeAfterCmsTabProps> = ({
  content,
  onUpdateContent,
  contentLang,
  onContentLangChange,
  showNotification
}) => {
  const { t } = useLanguage();
  const [form, setForm] = useState<BeforeAfterContent>(content);
  const [isSaving, setIsSaving] = useState(false);
  const [activeItem, setActiveItem] = useState<BeforeAfterItemId>('wetwipe');

  useEffect(() => {
    setForm(content);
  }, [content]);

  const setPair = (id: BeforeAfterItemId, patch: Partial<BeforeAfterPair>) => {
    setForm(prev => ({ ...prev, pairs: { ...prev.pairs, [id]: { ...prev.pairs[id], ...patch } } }));
  };

  const handleFileUpload = (id: BeforeAfterItemId, field: 'before' | 'after') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert(t.dash.cmsSlider.alerts.onlyImage);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPair(id, { [field]: String(reader.result) } as Partial<BeforeAfterPair>);
        showNotification(t.dash.cmsSlider.alerts.imageUploaded);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    onUpdateContent(form);
    setTimeout(() => {
      setIsSaving(false);
      showNotification(t.dash.cmsSlider.alerts.sliderUpdated);
    }, 400);
  };

  const handleReset = () => {
    if (!window.confirm(t.dash.cmsSlider.alerts.confirmReset)) return;
    const seed = contentLang === 'ru' ? INITIAL_BEFORE_AFTER_RU : INITIAL_BEFORE_AFTER;
    setForm(seed);
    onUpdateContent(seed);
    showNotification(t.dash.cmsSlider.alerts.resetDone);
  };

  const pair = form.pairs[activeItem];
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#332A21] focus:border-[#D4AF37] text-xs text-[#1A1715] dark:text-[#FAF7F2] outline-none';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1A1816] border border-[#E2DBD1] dark:border-[#302820] shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#8C6207] dark:text-[#D4AF37]" />
            <span>{t.dash.cmsSlider.header.title}</span>
          </h2>
          <p className="text-xs text-[#6B6152] dark:text-[#9E9486] mt-1">
            {t.dash.cmsSlider.header.desc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-[#121110] rounded-xl border border-[#2B231D]">
            {(['uz', 'ru'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onContentLangChange(l)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  contentLang === l ? 'bg-[#D4AF37] text-black' : 'text-[#8E8476] hover:text-[#FAF7F2]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-[#221D18] hover:bg-stone-200 dark:hover:bg-[#2F2720] border border-[#E2DBD1] dark:border-[#3B3227] text-xs font-bold text-[#6B6152] dark:text-[#9E9486] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.dash.cmsSlider.header.reset}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Header texts */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#2D251D] space-y-4">
          <h3 className="font-serif-luxury font-bold text-base text-[#1A1715] dark:text-[#FAF7F2]">{t.dash.cmsSlider.section.texts}</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5">{t.dash.cmsSlider.form.badge}</label>
              <input type="text" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5">{t.dash.cmsSlider.form.title}</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5">{t.dash.cmsSlider.form.desc}</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5">{t.dash.cmsSlider.form.bottomNote}</label>
              <input type="text" value={form.bottomNote} onChange={(e) => setForm({ ...form, bottomNote: e.target.value })} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Item editor */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#2D251D] space-y-4">
          <h3 className="font-serif-luxury font-bold text-base text-[#1A1715] dark:text-[#FAF7F2]">{t.dash.cmsSlider.section.items}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {ITEM_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveItem(id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeItem === id ? 'bg-[#D4AF37] text-black'                   : 'bg-stone-100 dark:bg-[#221D18] text-[#6B6152] dark:text-[#9E9486] hover:text-black dark:hover:text-[#FAF7F2] border border-[#E2DBD1] dark:border-[#3B3227]'
                }`}
              >
                {form.pairs[id].label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A4033] dark:text-[#D6CEBF] mb-1.5">{t.dash.cmsSlider.form.productName}</label>
            <input type="text" value={pair.label} onChange={(e) => setPair(activeItem, { label: e.target.value })} className={inputCls} />
          </div>

          {(['before', 'after'] as const).map((field) => (
            <div key={field} className="p-4 rounded-xl bg-stone-50 dark:bg-[#121110] border border-[#E2DBD1] dark:border-[#241E18] space-y-3">
              <h4 className="text-xs font-bold text-[#8C6207] dark:text-[#D4AF37] uppercase tracking-wider">
                {field === 'before' ? t.dash.cmsSlider.pair.before : t.dash.cmsSlider.pair.after}
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-24 h-16 rounded-lg overflow-hidden border border-[#E2DBD1] dark:border-[#3B3227] shrink-0 bg-black">
                  {pair[field] ? (
                    <img src={pair[field]} alt={field} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6E6456]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={pair[field].startsWith('data:') ? '' : pair[field]}
                    onChange={(e) => setPair(activeItem, { [field]: e.target.value } as Partial<BeforeAfterPair>)}
                    placeholder={t.dash.cmsSlider.upload.placeholder}
                    className={inputCls}
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-[#27211A] hover:bg-[#D4AF37] hover:text-black border border-[#E2DBD1] dark:border-[#3D3328] text-[11px] font-bold text-[#4A4033] dark:text-[#D4AF37] transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.dash.cmsSlider.upload.fromComputer}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(activeItem, field)} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B6152] dark:text-[#9E9486] mb-1">{t.dash.cmsSlider.form.caption}</label>
                <input
                  type="text"
                  value={field === 'before' ? pair.beforeCaption : pair.afterCaption}
                  onChange={(e) => setPair(activeItem, field === 'before' ? { beforeCaption: e.target.value } : { afterCaption: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E5C158] text-black font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? t.dash.cmsSlider.save.saving : t.dash.cmsSlider.save.submit}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
