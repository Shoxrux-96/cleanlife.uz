import React, { useState } from 'react';
import { 
  PortfolioProject 
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Sparkles, Plus, Edit2, Trash2, Globe, Eye, EyeOff, 
  Image as ImageIcon, Upload, CheckCircle2, X, Search,
  Tag, MapPin, Layers, ExternalLink
} from 'lucide-react';

interface PortfolioCmsTabProps {
  projects: PortfolioProject[];
  onUpdateProjects: (projects: PortfolioProject[]) => void;
  contentLang: 'uz' | 'ru';
  onContentLangChange: (lang: 'uz' | 'ru') => void;
  showNotification: (msg: string) => void;
}

const CATEGORIES: Array<PortfolioProject['businessType']> = [
  'Restoran',
  'Kafe',
  'Choyxona',
  'Fast Food',
  'Coffee Shop',
  'Catering'
];

const PRESET_PHOTOS = [
  { label: 'Hashamatli Restoran', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', cat: 'Restoran' },
  { label: 'Klassik Kafe & Bistro', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80', cat: 'Kafe' },
  { label: 'Milliy Choyxona & Dasturxon', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', cat: 'Choyxona' },
  { label: 'Zamonaviy Fast Food & Burger', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', cat: 'Fast Food' },
  { label: 'Qahvaxona & Artisan Barista', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', cat: 'Coffee Shop' },
  { label: 'Catering & Ziyofat Xizmati', url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80', cat: 'Catering' }
];

export const PortfolioCmsTab: React.FC<PortfolioCmsTabProps> = ({
  projects,
  onUpdateProjects,
  contentLang,
  onContentLangChange,
  showNotification
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [previewProject, setPreviewProject] = useState<PortfolioProject | null>(null);
  const presetLabels = [
    t.dash.cmsPortfolio.presets.p0,
    t.dash.cmsPortfolio.presets.p1,
    t.dash.cmsPortfolio.presets.p2,
    t.dash.cmsPortfolio.presets.p3,
    t.dash.cmsPortfolio.presets.p4,
    t.dash.cmsPortfolio.presets.p5,
  ];

  // Form State
  const [formData, setFormData] = useState<Partial<PortfolioProject>>({
    clientName: '',
    businessType: 'Restoran',
    location: 'Toshkent sh.',
    tagline: '',
    story: '',
    realPhotoUrl: PRESET_PHOTOS[0].url,
    realPhotoCaption: 'Brendlangan mahsulotlar to‘plami',
    isPublished: true,
    logoTheme: {
      name: '',
      subtext: 'HORECA BRANDING',
      primaryColor: '#1A1817',
      accentColor: '#D4AF37',
      textColor: '#FFFFFF',
      symbol: '♛'
    },
    brandedItems: [
      { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Mat o‘ram + Oltin folga logo', technique: 'Fleksografiya + Folga' },
      { title: 'Ofitsiant fartugi', itemType: 'apron', detail: 'Paxta kanvas fartuk, oltin kashta', technique: 'Kompyuter kashtasi' }
    ]
  });

  const resetForm = () => {
    setFormData({
      clientName: '',
      businessType: 'Restoran',
      location: 'Toshkent sh.',
      tagline: '',
      story: '',
      realPhotoUrl: PRESET_PHOTOS[0].url,
      realPhotoCaption: 'Brendlangan mahsulotlar to‘plami',
      isPublished: true,
      logoTheme: {
        name: '',
        subtext: 'HORECA BRANDING',
        primaryColor: '#1A1817',
        accentColor: '#D4AF37',
        textColor: '#FFFFFF',
        symbol: '♛'
      },
      brandedItems: [
        { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Mat o‘ram + Oltin folga logo', technique: 'Fleksografiya + Folga' },
        { title: 'Ofitsiant fartugi', itemType: 'apron', detail: 'Paxta kanvas fartuk, oltin kashta', technique: 'Kompyuter kashtasi' }
      ]
    });
    setEditingProject(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: PortfolioProject) => {
    setEditingProject(project);
    setFormData({
      ...project,
      isPublished: project.isPublished !== false
    });
    setIsModalOpen(true);
  };

  const handleTogglePublish = (id: string) => {
    const updated = projects.map(p => {
      if (p.id === id) {
        const nextState = p.isPublished === false ? true : false;
        return {
          ...p,
          isPublished: nextState,
          publishedAt: nextState ? new Date().toISOString().split('T')[0] : p.publishedAt
        };
      }
      return p;
    });
    onUpdateProjects(updated);
    showNotification(t.dash.cmsPortfolio.msg.publishUpdated);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.dash.cmsPortfolio.msg.confirmDelete)) {
      const updated = projects.filter(p => p.id !== id);
      onUpdateProjects(updated);
      showNotification(t.dash.cmsPortfolio.msg.deleted);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({
          ...prev,
          realPhotoUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName?.trim()) {
      alert(t.dash.cmsPortfolio.msg.needName);
      return;
    }

    const clientName = formData.clientName.trim();
    const logoName = formData.logoTheme?.name || clientName.toUpperCase();

    if (editingProject) {
      // Update existing
      const updated = projects.map(p => {
        if (p.id === editingProject.id) {
          return {
            ...p,
            ...formData,
            id: editingProject.id,
            clientName,
            logoTheme: {
              ...formData.logoTheme!,
              name: logoName
            }
          } as PortfolioProject;
        }
        return p;
      });
      onUpdateProjects(updated);
      showNotification(`${t.dash.cmsPortfolio.msg.updatedA}${clientName}${t.dash.cmsPortfolio.msg.updatedB}`);
    } else {
      // Create new
      const newProject: PortfolioProject = {
        id: `proj-${Date.now()}`,
        clientName,
        businessType: (formData.businessType as PortfolioProject['businessType']) || 'Restoran',
        location: formData.location || 'Toshkent sh.',
        tagline: formData.tagline || 'Premium HoReCa brendingi',
        story: formData.story || 'Mijoz uchun to‘liq brendlangan mahsulotlar to‘plami ishlab chiqildi.',
        realPhotoUrl: formData.realPhotoUrl || PRESET_PHOTOS[0].url,
        realPhotoCaption: formData.realPhotoCaption || 'Real keys fotosurati',
        isPublished: formData.isPublished !== false,
        publishedAt: new Date().toISOString().split('T')[0],
        logoTheme: {
          name: logoName,
          subtext: formData.logoTheme?.subtext || 'HORECA BRANDING',
          primaryColor: formData.logoTheme?.primaryColor || '#1A1817',
          accentColor: formData.logoTheme?.accentColor || '#D4AF37',
          textColor: '#FFFFFF',
          symbol: formData.logoTheme?.symbol || '♛'
        },
        brandedItems: formData.brandedItems || [
          { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Mat o‘ram + Logo', technique: 'Fleksografiya' }
        ]
      };
      onUpdateProjects([newProject, ...projects]);
      showNotification(`${t.dash.cmsPortfolio.msg.createdA}${clientName}${t.dash.cmsPortfolio.msg.createdB}`);
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Add Item to BrandedItems list in form
  const handleAddBrandedItem = () => {
    setFormData(prev => ({
      ...prev,
      brandedItems: [
        ...(prev.brandedItems || []),
        { title: 'Yangi mahsulot', itemType: 'packaging', detail: 'Logotip bosilgan', technique: 'Ofset / Kashta' }
      ]
    }));
  };

  const handleRemoveBrandedItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandedItems: prev.brandedItems?.filter((_, i) => i !== index)
    }));
  };

  // Filtered list
  const filtered = projects.filter(p => {
    const matchCategory = activeCategory === 'all' || p.businessType === activeCategory;
    const matchSearch = 
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const publishedCount = projects.filter(p => p.isPublished !== false).length;
  const draftCount = projects.length - publishedCount;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1A1816] border border-[#302820] shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-serif-luxury text-[#FAF7F2] flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#D4AF37]" />
              <span>{t.dash.cmsPortfolio.header.title}</span>
            </h2>
          </div>
          <p className="text-xs text-[#9E9486] mt-1">
            {t.dash.cmsPortfolio.header.desc}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center p-1 bg-[#121110] rounded-xl border border-[#2B231D]">
            {(['uz', 'ru'] as const).map((l) => (
              <button
                key={l}
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
            onClick={handleOpenCreateModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E5C158] text-black font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dash.cmsPortfolio.header.create}</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#181614] border border-[#2B241D]">
          <span className="text-[11px] text-[#8E8476] font-mono block">{t.dash.cmsPortfolio.stats.total}</span>
          <span className="text-xl font-bold text-[#FAF7F2]">{projects.length} {t.dash.cmsPortfolio.stats.unit}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#181614] border border-emerald-900/30">
          <span className="text-[11px] text-emerald-400 font-mono block flex items-center gap-1">
            <Globe className="w-3 h-3" /> {t.dash.cmsPortfolio.stats.published}
          </span>
          <span className="text-xl font-bold text-emerald-400">{publishedCount} {t.dash.cmsPortfolio.stats.unit}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#181614] border border-amber-900/30">
          <span className="text-[11px] text-amber-400 font-mono block flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> {t.dash.cmsPortfolio.stats.drafts}
          </span>
          <span className="text-xl font-bold text-amber-400">{draftCount} {t.dash.cmsPortfolio.stats.unit}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#181614] border border-[#2B241D]">
          <span className="text-[11px] text-[#D4AF37] font-mono block">{t.dash.cmsPortfolio.stats.categories}</span>
          <span className="text-xl font-bold text-[#D4AF37]">{CATEGORIES.length} {t.dash.cmsPortfolio.stats.unit} {t.dash.cmsPortfolio.stats.directions}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#181614] p-3 rounded-xl border border-[#2C241D]">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#D4AF37] text-black font-bold'
                : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
            }`}
          >
            {t.dash.cmsPortfolio.filter.all} ({projects.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#D4AF37] text-black font-bold'
                  : 'text-[#9E9486] hover:text-[#FAF7F2] hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#8E8476] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dash.cmsPortfolio.filter.searchPh}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#121110] border border-[#332A22] text-xs text-[#FAF7F2] focus:border-[#D4AF37] outline-none"
          />
        </div>
      </div>

      {/* Projects List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(project => {
          const isPublished = project.isPublished !== false;

          return (
            <div
              key={project.id}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isPublished 
                  ? 'bg-[#181614] border-[#31281F] hover:border-[#D4AF37]/50 shadow-md' 
                  : 'bg-[#141312] border-dashed border-[#44382C] opacity-90'
              }`}
            >
              {/* Photo & Badges */}
              <div className="relative h-48 bg-[#1F1C18] overflow-hidden group">
                {project.realPhotoUrl ? (
                  <img
                    src={project.realPhotoUrl}
                    alt={project.clientName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6E6456]">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono shadow-md ${
                    isPublished
                      ? 'bg-emerald-500/90 text-black'
                      : 'bg-amber-500/90 text-black'
                  }`}>
                    {isPublished ? t.dash.cmsPortfolio.card.published : t.dash.cmsPortfolio.card.draft}
                  </span>
                </div>

                {/* Category Badge */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur border border-white/10 text-[10px] text-[#FAF7F2] font-semibold">
                  {project.businessType}
                </div>

                {/* Bottom Photo Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <span className="text-[11px] text-white/90 line-clamp-1">
                    {project.realPhotoCaption || project.tagline}
                  </span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif-luxury font-bold text-base text-[#FAF7F2] line-clamp-1">
                      {project.clientName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#A69C8E] mt-0.5">
                    <MapPin className="w-3 h-3 text-[#D4AF37]" />
                    <span>{project.location}</span>
                  </div>

                  <p className="text-xs text-[#8E8476] mt-2 line-clamp-2 leading-relaxed">
                    {project.story}
                  </p>

                  {/* Branded Items summary */}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {project.brandedItems?.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#241F1A] border border-[#3E342B] text-[#D4AF37]"
                      >
                        {item.title}
                      </span>
                    ))}
                    {(project.brandedItems?.length || 0) > 3 && (
                      <span className="text-[10px] text-[#8E8476]">
                        +{project.brandedItems.length - 3} {t.dash.cmsPortfolio.card.moreUnit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-[#29221B] flex items-center justify-between gap-2">
                  {/* Publish Switch */}
                  <button
                    onClick={() => handleTogglePublish(project.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      isPublished
                        ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/80'
                        : 'bg-amber-950/40 border-amber-800/50 text-amber-400 hover:bg-amber-950/80'
                    }`}
                    title={isPublished ? t.dash.cmsPortfolio.card.hideTitle : t.dash.cmsPortfolio.card.publishTitle}
                  >
                    {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isPublished ? t.dash.cmsPortfolio.card.visible : t.dash.cmsPortfolio.card.draftShort}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(project)}
                      className="p-1.5 rounded-lg bg-[#221D18] hover:bg-[#D4AF37] hover:text-black border border-[#3E342B] text-[#C5BBAE] transition-colors cursor-pointer"
                      title={t.dash.cmsPortfolio.card.editTitle}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/60 border border-rose-800/30 text-rose-400 transition-colors cursor-pointer"
                      title={t.dash.cmsPortfolio.card.deleteTitle}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#181614] border border-[#2B231B]">
          <Globe className="w-10 h-10 text-[#6E6456] mx-auto mb-3" />
          <h3 className="font-serif-luxury text-base text-[#FAF7F2]">{t.dash.cmsPortfolio.empty.title}</h3>
          <p className="text-xs text-[#8E8476] mt-1">{t.dash.cmsPortfolio.empty.desc}</p>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8 bg-[#171513] border border-[#3D3328] rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2C241C] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#27211A] border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center">
                  {editingProject ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-serif-luxury text-lg font-bold text-[#FAF7F2]">
                    {editingProject ? t.dash.cmsPortfolio.modal.editTitle : t.dash.cmsPortfolio.modal.createTitle}
                  </h3>
                  <span className="text-xs text-[#9E9486]">
                    {t.dash.cmsPortfolio.modal.subtitle}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8E8476] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="space-y-5">
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1.5">
                    {t.dash.cmsPortfolio.form.clientName}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName || ''}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder={t.dash.cmsPortfolio.form.clientNamePh}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121110] border border-[#332A21] focus:border-[#D4AF37] text-xs text-[#FAF7F2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1.5">
                    {t.dash.cmsPortfolio.form.category}
                  </label>
                  <select
                    value={formData.businessType || 'Restoran'}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121110] border border-[#332A21] focus:border-[#D4AF37] text-xs text-[#FAF7F2] outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Location & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1.5">
                    {t.dash.cmsPortfolio.form.location}
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t.dash.cmsPortfolio.form.locationPh}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121110] border border-[#332A21] focus:border-[#D4AF37] text-xs text-[#FAF7F2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D6CEBF] mb-1.5">
                    {t.dash.cmsPortfolio.form.tagline}
                  </label>
                  <input
                    type="text"
                    value={formData.tagline || ''}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder={t.dash.cmsPortfolio.form.taglinePh}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121110] border border-[#332A21] focus:border-[#D4AF37] text-xs text-[#FAF7F2] outline-none"
                  />
                </div>
              </div>

              {/* Story */}
              <div>
                <label className="block text-xs font-semibold text-[#D6CEBF] mb-1.5">
                  {t.dash.cmsPortfolio.form.story}
                </label>
                <textarea
                  rows={3}
                  value={formData.story || ''}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  placeholder={t.dash.cmsPortfolio.form.storyPh}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121110] border border-[#332A21] focus:border-[#D4AF37] text-xs text-[#FAF7F2] outline-none"
                />
              </div>

              {/* Image Selection Section */}
              <div className="p-4 rounded-xl bg-[#121110] border border-[#2D251D] space-y-3">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  {t.dash.cmsPortfolio.form.photoTitle}
                </label>

                {/* Preset Fast Select */}
                <div>
                  <span className="text-[11px] text-[#8E8476] block mb-2">
                    {t.dash.cmsPortfolio.form.presetLabel}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_PHOTOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          realPhotoUrl: preset.url,
                          realPhotoCaption: presetLabels[idx]
                        })}
                        className={`p-1.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          formData.realPhotoUrl === preset.url
                            ? 'bg-[#29221A] border-[#D4AF37] shadow-sm'
                            : 'bg-[#181614] border-[#2E261E] hover:border-[#4A3D2F]'
                        }`}
                      >
                        <img src={preset.url} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="text-[11px] text-[#D6CEBF] truncate">{presetLabels[idx]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload or Custom URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-[11px] text-[#8E8476] block mb-1">{t.dash.cmsPortfolio.form.urlLabel}</span>
                    <input
                      type="url"
                      value={formData.realPhotoUrl || ''}
                      onChange={(e) => setFormData({ ...formData, realPhotoUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 rounded-lg bg-[#181614] border border-[#332A21] text-xs text-[#FAF7F2] outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-[#8E8476] block mb-1">{t.dash.cmsPortfolio.form.uploadLabel}</span>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1F1B17] hover:bg-[#2A241F] border border-[#3E3428] text-xs text-[#D6CEBF] cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{t.dash.cmsPortfolio.form.chooseFile}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Current Preview */}
                {formData.realPhotoUrl && (
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      src={formData.realPhotoUrl}
                      alt={t.dash.cmsPortfolio.form.selectedImgAlt}
                      className="w-16 h-12 rounded-lg object-cover border border-[#D4AF37]/40 shadow-sm"
                    />
                    <div className="flex-1">
                      <span className="text-[11px] text-emerald-400 block font-medium">{t.dash.cmsPortfolio.form.imgSelected}</span>
                      <input
                        type="text"
                        value={formData.realPhotoCaption || ''}
                        onChange={(e) => setFormData({ ...formData, realPhotoCaption: e.target.value })}
                        placeholder={t.dash.cmsPortfolio.form.captionPh}
                        className="w-full px-2.5 py-1 rounded bg-[#181614] border border-[#2D251D] text-[11px] text-[#C4BBAE] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Branded Items List */}
              <div className="p-4 rounded-xl bg-[#121110] border border-[#2D251D] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    {t.dash.cmsPortfolio.form.itemsTitle}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBrandedItem}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#241E18] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-[11px] font-semibold transition-colors cursor-pointer border border-[#3E342B]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.dash.cmsPortfolio.form.addItem}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.brandedItems?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[#181614] border border-[#2E261E]">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...(formData.brandedItems || [])];
                          updated[idx].title = e.target.value;
                          setFormData({ ...formData, brandedItems: updated });
                        }}
                        placeholder={t.dash.cmsPortfolio.form.itemNamePh}
                        className="w-1/3 px-2 py-1 rounded bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none"
                      />
                      <input
                        type="text"
                        value={item.technique}
                        onChange={(e) => {
                          const updated = [...(formData.brandedItems || [])];
                          updated[idx].technique = e.target.value;
                          setFormData({ ...formData, brandedItems: updated });
                        }}
                        placeholder={t.dash.cmsPortfolio.form.itemTechPh}
                        className="w-1/3 px-2 py-1 rounded bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none"
                      />
                      <input
                        type="text"
                        value={item.detail}
                        onChange={(e) => {
                          const updated = [...(formData.brandedItems || [])];
                          updated[idx].detail = e.target.value;
                          setFormData({ ...formData, brandedItems: updated });
                        }}
                        placeholder={t.dash.cmsPortfolio.form.itemDetailPh}
                        className="flex-1 px-2 py-1 rounded bg-[#121110] border border-[#332A21] text-xs text-[#FAF7F2] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBrandedItem(idx)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish Toggle & Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#29221B]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished !== false}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 accent-[#D4AF37] rounded"
                  />
                  <span className="text-xs font-semibold text-[#FAF7F2]">
                    {t.dash.cmsPortfolio.form.publishNow}
                  </span>
                </label>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#221D18] hover:bg-[#2C2620] text-[#9E9486] text-xs font-semibold cursor-pointer"
                  >
                    {t.dash.cmsPortfolio.form.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E5C158] text-black font-bold text-xs shadow-lg cursor-pointer"
                  >
                    {editingProject ? t.dash.cmsPortfolio.form.save : t.dash.cmsPortfolio.form.publish}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
