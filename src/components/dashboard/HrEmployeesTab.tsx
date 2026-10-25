import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, Search, Filter, Phone, Briefcase, 
  Calendar, Award, CheckCircle2, AlertCircle, X, Trash2, Edit,
  MapPin, Building, Sparkles, Map, MapPin as MapPinIcon, Eye, EyeOff,
  FileSpreadsheet, User, Mail
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { Employee, EmployeeStatus, CompanyInfo } from '../../types/erp';
import { TablePagination } from './TablePagination';
import { erpApi } from '../../api/erpApi';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../context/LanguageContext';

// Mahalliy notification funksiyasi
const showNotification = (msg: string) => {
  console.log('[Notification]', msg);
  alert(msg);
};

// Leaflet marker icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface HrEmployeesTabProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  companyInfo?: CompanyInfo | null;
  onSaveCompany?: (c: CompanyInfo) => void;
}

export const HrEmployeesTab: React.FC<HrEmployeesTabProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  companyInfo,
  onSaveCompany
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyMap, setCompanyMap] = useState<L.Map | null>(null);
  const [companyMarker, setCompanyMarker] = useState<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    id: '',
    name: 'Clean Life',
    slogan: 'Professional HoReCa Brending va Logo Joylashtirish',
    logo: 'B',
    location: 'Toshkent sh., Chilonzor sanoat hududi',
    address: 'Toshkent sh., Chilonzor tumani, 12-mavze, 45-uy',
    owner: '',
    phone: '',
    phone2: '',
    email: '',
    adminName: '',
    adminLogin: '',
    adminPassword: '',
    adminPosition: '',
    adminPhone: '',
    lat: null as number | null,
    lng: null as number | null
  });

  // companyInfo prop dan ma'lumotlarni yuklash (lokatsiya bilan birga — qayta belgilash shart emas)
  useEffect(() => {
    if (companyInfo) {
      if (companyInfo.lat != null && companyInfo.lng != null) {
        setMapCoords([companyInfo.lat, companyInfo.lng]);
      }
      setCompanyFormData({
        id: companyInfo.id,
        name: companyInfo.name,
        slogan: companyInfo.slogan,
        logo: companyInfo.logo,
        location: companyInfo.location,
        address: companyInfo.address,
        owner: companyInfo.owner || '',
        phone: companyInfo.phone || '',
        phone2: companyInfo.phone2 || '',
        email: companyInfo.email || '',
        adminName: companyInfo.adminName || '',
        adminLogin: companyInfo.adminLogin || '',
        adminPassword: companyInfo.adminPassword || '',
        adminPosition: companyInfo.adminPosition || '',
        adminPhone: companyInfo.adminPhone || '',
        lat: companyInfo.lat,
        lng: companyInfo.lng
      });
    }
  }, [companyInfo]);

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API ga saqlash: mavjud bo'lsa PATCH, bo'lmasa POST (yaratish)
    const existingId = companyInfo?.id && companyInfo.id !== 'undefined' ? companyInfo.id : undefined;
    const req = existingId
      ? erpApi.company.update(existingId, companyFormData)
      : erpApi.company.create(companyFormData);
    req.then((saved) => {
      onSaveCompany?.(saved);
      showNotification(t.dash.employees.msg.companyUpdated);
      setIsCompanyModalOpen(false);
    }).catch((err) => {
      console.error('Company update error:', err);
      showNotification(t.dash.employees.msg.errorPrefix + (err instanceof Error ? err.message : t.dash.employees.msg.unknownError));
    });
  };

  const handleCompanyCancel = () => {
    if (companyInfo) {
      setCompanyFormData({
        id: companyInfo.id,
        name: companyInfo.name,
        slogan: companyInfo.slogan,
        logo: companyInfo.logo,
        location: companyInfo.location,
        address: companyInfo.address,
        owner: companyInfo.owner || '',
        phone: companyInfo.phone || '',
        phone2: companyInfo.phone2 || '',
        email: companyInfo.email || '',
        adminName: companyInfo.adminName || '',
        adminLogin: companyInfo.adminLogin || '',
        adminPassword: companyInfo.adminPassword || '',
        adminPosition: companyInfo.adminPosition || '',
        adminPhone: companyInfo.adminPhone || '',
        lat: companyInfo.lat,
        lng: companyInfo.lng
      });
    }
    setIsCompanyModalOpen(false);
  };

  const handleOpenCompanyModal = () => {
    if (companyInfo) {
      setCompanyFormData({
        id: companyInfo.id,
        name: companyInfo.name,
        slogan: companyInfo.slogan,
        logo: companyInfo.logo,
        location: companyInfo.location,
        address: companyInfo.address,
        owner: companyInfo.owner || '',
        phone: companyInfo.phone || '',
        phone2: companyInfo.phone2 || '',
        email: companyInfo.email || '',
        adminName: companyInfo.adminName || '',
        adminLogin: companyInfo.adminLogin || '',
        adminPassword: companyInfo.adminPassword || '',
        adminPosition: companyInfo.adminPosition || '',
        adminPhone: companyInfo.adminPhone || '',
        lat: companyInfo.lat,
        lng: companyInfo.lng
      });
    }
    setIsCompanyModalOpen(true);
  };

  // Xaritani ishga tushirish (modal ochilganda)
  useEffect(() => {
    if (!isCompanyModalOpen || companyMap) return;
    if (!mapContainerRef.current) return;

    const initialLat = mapCoords?.[0] ?? 41.311;
    const initialLng = mapCoords?.[1] ?? 69.279;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });

    const companyTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Tarmoq uzilganda (ERR_NETWORK_CHANGED va b.) plitkalarni avtomatik qayta yuklash
    companyTiles.on('tileerror', (e: any) => {
      const tile = e?.tile as HTMLImageElement | undefined;
      if (!tile) return;
      const done = Number(tile.dataset.tileRetries || 0);
      if (done >= 3) return;
      tile.dataset.tileRetries = String(done + 1);
      const url = tile.src;
      window.setTimeout(() => { tile.src = url; }, 600 * (done + 1));
    });

    let marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      setMapCoords([pos.lat, pos.lng]);
      setCompanyFormData(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }));
      reverseGeocode(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setMapCoords([e.latlng.lat, e.latlng.lng]);
      setCompanyFormData(prev => ({ ...prev, lat: e.latlng.lat, lng: e.latlng.lng }));
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    setCompanyMap(map);
    setCompanyMarker(marker);

    return () => {
      map.remove();
      setCompanyMap(null);
      setCompanyMarker(null);
    };
  }, [isCompanyModalOpen]);

  // Teskari geokodlash (koordinatlar -> manzil)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=uz`
      );
      const data = await res.json();
      if (data.address) {
        const addr = data.address;
        const locationParts = [
          addr.city || addr.town || addr.village || addr.county || '',
          addr.state || addr.region || '',
        ].filter(Boolean);
        const fullAddress = data.display_name || '';
        
        setCompanyFormData(prev => ({
          ...prev,
          location: locationParts.join(', '),
          address: fullAddress,
        }));
      }
    } catch (err) {
      console.warn('Geocoding xatoligi:', err);
    }
  };

  // Koordinatlarni manzil maydonlariga ham qo'shish
  const updateLocationFromCoords = () => {
    if (mapCoords) {
      setCompanyFormData(prev => ({
        ...prev,
        location: `${mapCoords[0].toFixed(6)}, ${mapCoords[1].toFixed(6)}`,
      }));
    }
  };

  // New Employee Form State
  // Lavozim turlari
  const positionOptions = [
    'Boshqaruvchi',
    'Ishchi',
    'Haydovchi',
    'Elektrik',
    'Boshqa'
  ] as const;

  const [formData, setFormData] = useState({
    fullName: '',
    position: 'Ishchi' as string,
    phone: '+998 ',
    status: 'active' as EmployeeStatus,
    salary: 7500000,
    joinDate: new Date().toISOString().split('T')[0],
    avatar: '', // 3x4 rasm (base64)
    username: '', // Login
    password: ''  // Parol
  });

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone.includes(searchTerm);
    return matchesSearch;
  });

  // Pagination States (10, 30, 50)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const activeCount = employees.filter(e => e.status === 'active').length;
  const leaveCount = employees.filter(e => e.status === 'on_leave').length;
  const totalPayroll = employees.filter(e => e.status !== 'nofaol').reduce((sum, e) => sum + e.salary, 0);

  const resetEmployeeForm = () => {
    setFormData({
      fullName: '',
      position: 'Ishchi',
      phone: '+998 ',
      status: 'active',
      salary: 7500000,
      joinDate: new Date().toISOString().split('T')[0],
      avatar: '',
      username: '',
      password: ''
    });
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    resetEmployeeForm();
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName,
      position: emp.position,
      phone: emp.phone,
      status: emp.status,
      salary: emp.salary,
      joinDate: emp.joinDate,
      avatar: emp.avatar || '',
      username: emp.username || '',
      password: emp.password || ''
    });
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCloseEmployeeModal = () => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.position) return;

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        ...formData
      });
    } else {
      onAddEmployee({
        ...formData,
        avatarColor: 'from-amber-600 to-yellow-500'
      });
    }

    handleCloseEmployeeModal();
    resetEmployeeForm();
  };

  const formatUzbekSum = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + t.dash.employees.common.currencySuffix;
  };

  const statusLabel = (s: Employee['status']) =>
    s === 'active' ? t.dash.employees.status.active : s === 'on_leave' ? t.dash.employees.status.onLeave : s === 'probation' ? t.dash.employees.status.probation : t.dash.employees.status.inactive;

  // Excel eksport — xodim rasmlari bilan birga (rasm katakchaga joylanadi)
  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Clean Life ERP';
    const ws = wb.addWorksheet(t.dash.employees.excel.sheet);
    ws.columns = [
      { header: '№', key: 'no', width: 6 },
      { header: t.dash.employees.excel.photo, key: 'photo', width: 16 },
      { header: t.dash.employees.excel.name, key: 'name', width: 30 },
      { header: t.dash.employees.excel.position, key: 'position', width: 22 },
      { header: t.dash.employees.excel.phone, key: 'phone', width: 20 },
      { header: t.dash.employees.excel.salary, key: 'salary', width: 20 },
      { header: t.dash.employees.excel.login, key: 'login', width: 18 },
      { header: t.dash.employees.excel.status, key: 'status', width: 16 },
      { header: t.dash.employees.excel.join, key: 'join', width: 14 },
    ];
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC59B27' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    filteredEmployees.forEach((emp, i) => {
      const rowIdx = i + 2;
      ws.addRow({
        no: i + 1,
        photo: '',
        name: emp.fullName,
        position: emp.position,
        phone: emp.phone,
        salary: emp.salary,
        login: emp.username || '—',
        status: statusLabel(emp.status),
        join: emp.joinDate,
      });
      if (emp.avatar && emp.avatar.startsWith('data:image/')) {
        const m = emp.avatar.match(/^data:image\/(\w+);base64,(.*)$/s);
        if (m) {
          const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
          if (ext === 'png' || ext === 'jpeg' || ext === 'gif') {
            try {
              ws.getRow(rowIdx).height = 60;
              const imgId = wb.addImage({ base64: m[2], extension: ext as 'png' | 'jpeg' | 'gif' });
              ws.addImage(imgId, `B${rowIdx}:B${rowIdx}`);
            } catch { /* rasm buzilgan bo'lsa o'tkazib yuborish */ }
          }
        }
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.dash.employees.excel.filePrefix}${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Korxona Ma'lumotlari Karti — yangi ko'rinish */}
      <div className="rounded-2xl border-2 border-amber-500/30 dark:border-amber-700/40 shadow-xl overflow-hidden">
        {/* Yuqori banner */}
        <div className="relative bg-gradient-to-r from-[#7A5A12] via-[#C59B27] to-[#E6C774] px-5 sm:px-6 pt-5 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M30 0L45 15v30L30 60 15 45V15L30 0z%22 fill=%22%23FFFFFF%22 fill-opacity=%220.08%22/%3E%3C/svg%3E')]" />
          <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-24 -bottom-20 w-44 h-44 rounded-full bg-black/10 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Building className="w-3.5 h-3.5" />
              {t.dash.employees.header.profile}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCompanyModal}
                className="p-2.5 rounded-xl bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm transition-colors cursor-pointer"
                title={t.dash.employees.header.editCompanyTitle}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-stone-900 font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{t.dash.employees.header.addEmployee}</span>
                <span className="sm:hidden">{t.dash.employees.header.addEmployee}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Asosiy qism */}
        <div className="px-5 sm:px-6 pb-6 bg-white dark:bg-[#1C1814]">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#C59B27] via-[#D4AF37] to-[#B3871C] flex items-center justify-center text-4xl font-serif font-bold text-white shadow-xl shadow-amber-500/30 border-2 border-amber-500/50 ring-4 ring-white dark:ring-[#1C1814] shrink-0 overflow-hidden">
              {companyInfo?.logo?.startsWith('data:') ? (
                <img
                  src={companyInfo.logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                companyInfo?.logo
              )}
            </div>
            <div className="flex-1 min-w-0 sm:pb-1">
              <h2 className="text-2xl md:text-3xl font-serif font-black text-[#1A1715] dark:text-[#FAF7F2] tracking-wide truncate relative -top-[15px]">
                {companyInfo?.name}
              </h2>
              {companyInfo?.adminName && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-stone-700 dark:text-stone-200 relative -top-[10px]">
                  <User className="w-3.5 h-3.5 text-amber-600 dark:text-[#D4AF37]" />
                  {t.dash.employees.header.adminPrefix} <strong>{companyInfo.adminName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Ma'lumot plitkalari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200/70 dark:border-[#2C241D]">
              <span className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{t.dash.employees.company.location}</span>
                <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100 mt-0.5 break-words">{companyInfo?.location}</span>
              </span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200/70 dark:border-[#2C241D]">
              <span className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Building className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{t.dash.employees.company.address}</span>
                <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100 mt-0.5 break-words">{companyInfo?.address}</span>
              </span>
            </div>
            {companyInfo?.owner && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200/70 dark:border-[#2C241D]">
                <span className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{t.dash.employees.company.owner}</span>
                  <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100 mt-0.5 break-words">{companyInfo.owner}</span>
                </span>
              </div>
            )}
            {companyInfo?.adminPosition && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200/70 dark:border-[#2C241D]">
                <span className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{t.dash.employees.company.position}</span>
                  <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100 mt-0.5 break-words">{companyInfo.adminPosition}</span>
                </span>
              </div>
            )}
            {companyInfo?.phone && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200/70 dark:border-[#2C241D]">
                <span className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{t.dash.employees.company.phones}</span>
                  <span className="block text-xs font-semibold font-mono text-stone-800 dark:text-stone-100 mt-0.5 break-words">{companyInfo.phone}{companyInfo.phone2 ? `, ${companyInfo.phone2}` : ''}</span>
                </span>
              </div>
            )}
            {companyInfo?.email && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200/70 dark:border-[#2C241D]">
                <span className="w-9 h-9 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{t.dash.employees.company.email}</span>
                  <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100 mt-0.5 break-all">{companyInfo.email}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.employees.kpi.total}</span>
          <div className="text-xl font-bold text-[#1A1715] dark:text-[#FAF7F2] mt-1 flex items-center justify-between">
            <span>{employees.length} {t.dash.employees.kpi.personUnit}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{activeCount} {t.dash.employees.kpi.activeUnit}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.employees.kpi.leave}</span>
          <div className="text-xl font-bold text-amber-600 dark:text-[#D4AF37] mt-1">
            {leaveCount} {t.dash.employees.kpi.leaveUnit}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26]">
          <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E]">{t.dash.employees.kpi.payroll}</span>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatUzbekSum(totalPayroll)}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={t.dash.employees.search.placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
          title={t.dash.employees.search.exportTitle}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t.dash.employees.search.exportBtn}</span>
        </button>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-[#141210] text-[#7A6F62] dark:text-[#A69C8E] border-b border-stone-200 dark:border-[#2D251D]">
              <tr>
                <th className="py-3 px-4 font-black text-sm uppercase tracking-wider w-16 text-center text-amber-700 dark:text-[#E6C774]">№</th>
                <th className="py-3 px-4 font-semibold">{t.dash.employees.table.photo}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.employees.table.fullName}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.employees.table.position}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.employees.table.phone}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.employees.table.salary}</th>
                <th className="py-3 px-4 font-semibold">{t.dash.employees.table.status}</th>
                <th className="py-3 px-4 font-semibold text-right">{t.dash.employees.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#241E18] text-[#1A1715] dark:text-[#FAF7F2]">
              {paginatedEmployees.map((emp, idx) => (
                <tr key={emp.id} className={`hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors ${emp.status === 'nofaol' ? 'opacity-55' : ''}`}>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border-2 border-amber-500/40 text-stone-900 dark:text-[#FAF7F2] font-black text-sm font-mono shadow-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {emp.avatar ? (
                      <img
                        src={emp.avatar}
                        alt={emp.fullName}
                        className="w-12 h-16 rounded-lg object-cover border-2 border-amber-500/40 shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-stone-100 dark:bg-[#251E18] border-2 border-dashed border-stone-300 dark:border-[#382F26] flex items-center justify-center text-stone-400 font-black text-lg">
                        {emp.fullName.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    <div>
                      <span className="font-semibold text-sm">{emp.fullName}</span>
                      <span className="block text-[10px] text-stone-400">
                        {t.dash.employees.table.joinedPrefix} {emp.joinDate}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-stone-700 dark:text-stone-300 font-medium">
                    {emp.position}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-600 dark:text-stone-400">
                    {emp.phone}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-[#D4AF37]">
                    {formatUzbekSum(emp.salary)}
                  </td>
                  <td className="py-3.5 px-4">
                    {emp.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.dash.employees.status.activeBadge}</span>
                      </span>
                    ) : emp.status === 'on_leave' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                        <span>{t.dash.employees.status.onLeave}</span>
                      </span>
                    ) : emp.status === 'nofaol' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-500/15 text-stone-500 dark:text-stone-400 border border-stone-500/30 text-[10px] font-semibold">
                        <span>{t.dash.employees.status.inactive}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-semibold">
                        <span>{t.dash.employees.status.probation}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="p-1.5 rounded-lg hover:bg-amber-500/10 text-stone-400 hover:text-amber-600 transition-colors cursor-pointer"
                      title={t.dash.employees.table.editTitle}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title={t.dash.employees.table.deleteTitle}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border border-[#E2DBD1] dark:border-[#382F26] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-[#2D251D] mb-4">
              <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                {editingEmployee ? t.dash.employees.form.editTitle : t.dash.employees.form.addTitle}
              </h3>
              <button
                onClick={handleCloseEmployeeModal}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 3x4 Rasm yuklash */}
              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.form.photoLabel}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    required={!editingEmployee}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // 3×4 proporsiya saqlab, max 600px balandlikda qisqartirish (face-api uchun yetarli)
                      const img = new Image();
                      const url = URL.createObjectURL(file);
                      img.onload = () => {
                        URL.revokeObjectURL(url);
                        const MAX_H = 600;
                        const MAX_W = 450; // 3:4 nisbat
                        let w = img.width;
                        let h = img.height;
                        const scale = Math.min(MAX_W / w, MAX_H / h, 1);
                        w = Math.round(w * scale);
                        h = Math.round(h * scale);
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.drawImage(img, 0, 0, w, h);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        setFormData(prev => ({ ...prev, avatar: dataUrl }));
                      };
                      img.onerror = () => URL.revokeObjectURL(url);
                      img.src = url;
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-amber-100 dark:file:bg-amber-900/30 file:text-amber-700 dark:file:text-amber-400 cursor-pointer"
                  />
                  {formData.avatar?.startsWith('data:') && (
                    <img 
                      src={formData.avatar} 
                      alt="3x4 preview" 
                      className="w-12 h-16 rounded-lg object-cover border border-stone-200 dark:border-[#2E2720]"
                    />
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{t.dash.employees.form.photoHint}</p>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.form.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.dash.employees.form.namePh}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.form.phoneLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.form.salaryLabel}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.form.positionLabel}
                  </label>
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  >
                    {positionOptions.map((p) => (
                      <option key={p} value={p}>{(t.dash.employees.positions as Record<string, string>)[p] ?? p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.form.statusLabel}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  >
                    <option value="active">{t.dash.employees.status.activeBadge}</option>
                    <option value="on_leave">{t.dash.employees.status.onLeave}</option>
                    <option value="probation">{t.dash.employees.status.probation}</option>
                    <option value="nofaol">{t.dash.employees.status.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.form.loginLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="login"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.form.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.dash.employees.form.passwordPh}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      title={showPassword ? t.dash.employees.form.hidePass : t.dash.employees.form.showPass}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 dark:border-[#2D251D] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseEmployeeModal}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-[#382F26] text-stone-600 dark:text-stone-300"
                >
                  {t.dash.employees.form.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold shadow-md"
                >
                  {editingEmployee ? t.dash.employees.form.saveEdit : t.dash.employees.form.saveNew}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Info Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border border-[#E2DBD1] dark:border-[#382F26] rounded-2xl w-full max-w-5xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-[#2D251D] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C59B27] via-[#D4AF37] to-[#B3871C] flex items-center justify-center text-2xl font-serif font-bold text-white">
                  {companyFormData.logo?.startsWith('data:') ? (
                    <img 
                      src={companyFormData.logo} 
                      alt="Logo" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    companyFormData.logo
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1A1715] dark:text-[#FAF7F2]">
                    {t.dash.employees.companyModal.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {t.dash.employees.companyModal.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCompanyCancel}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="text-xs">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.companyModal.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.dash.employees.companyModal.namePh}
                  value={companyFormData.name}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-2">
                    {t.dash.employees.companyModal.logoLabel}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCompanyFormData(prev => ({
                              ...prev,
                              logo: reader.result as string
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-amber-100 dark:file:bg-amber-900/30 file:text-amber-700 dark:file:text-amber-400 cursor-pointer"
                    />
                    {companyFormData.logo?.startsWith('data:') && (
                      <img 
                        src={companyFormData.logo} 
                        alt="Logo preview" 
                        className="w-12 h-12 rounded-lg object-cover border border-stone-200 dark:border-[#2E2720]"
                      />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{t.dash.employees.companyModal.logoHint}</p>
                </div>
              </div>

                <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.companyModal.ownerLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.dash.employees.companyModal.ownerPh}
                    value={companyFormData.owner}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, owner: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  />
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.companyModal.phoneLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+998 71 200 44 88"
                    value={companyFormData.phone}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.companyModal.phone2Label}
                  </label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={companyFormData.phone2}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone2: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.companyModal.adminLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.dash.employees.companyModal.adminPh}
                  value={companyFormData.adminName}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, adminName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.companyModal.adminPhoneLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={companyFormData.adminPhone}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, adminPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.companyModal.adminPositionLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.dash.employees.companyModal.adminPositionPh}
                    value={companyFormData.adminPosition}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, adminPosition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.companyModal.adminLoginLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="admin"
                    autoComplete="off"
                    value={companyFormData.adminLogin}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, adminLogin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                    {t.dash.employees.companyModal.adminPassLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder={t.dash.employees.companyModal.adminPassPh}
                      autoComplete="new-password"
                      value={companyFormData.adminPassword}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, adminPassword: e.target.value })}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      title={showAdminPassword ? t.dash.employees.form.hidePass : t.dash.employees.form.showPass}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.companyModal.emailLabel}
                </label>
                <input
                  type="email"
                  placeholder="info@cleanlife.uz"
                  value={companyFormData.email}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.companyModal.locationLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.dash.employees.companyModal.locationPh}
                  value={companyFormData.location}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2]"
                />
              </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-amber-600" />
                    {t.dash.employees.companyModal.mapLabel}
                  </label>
                  <div ref={mapContainerRef} className="w-full h-72 md:h-[560px] rounded-xl border border-stone-200 dark:border-[#2E2720] overflow-hidden" />
                  {mapCoords && (
                    <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-[#141210] px-3 py-2 rounded-lg">
                      <MapPinIcon className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t.dash.employees.companyModal.coordsPrefix} {mapCoords[0].toFixed(6)}, {mapCoords[1].toFixed(6)}</span>
                      <button
                        type="button"
                        onClick={updateLocationFromCoords}
                        className="ml-auto px-2 py-1 text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        {t.dash.employees.companyModal.writeToAddress}
                      </button>
                    </div>
                  )}

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t.dash.employees.companyModal.addressLabel}
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder={t.dash.employees.companyModal.addressPh}
                  value={companyFormData.address}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] resize-none"
                />
              </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-200 dark:border-[#2D251D] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCompanyCancel}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-[#382F26] text-stone-600 dark:text-stone-300"
                >
                  {t.dash.employees.form.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-bold shadow-md"
                >
                  {t.dash.employees.companyModal.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
