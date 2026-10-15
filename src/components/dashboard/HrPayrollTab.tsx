import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList, BarChart3, Settings2, Wallet, FileSpreadsheet,
  CalendarDays, CheckCircle2, Clock, X, Plus, Save, MapPin,
  Map as MapIcon, Trash2, AlertTriangle, Eye, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, AttendanceRecord, AttendanceSettings, CompanyInfo, SalaryPayment, BonusRecord } from '../../types/erp';
import { erpApi } from '../../api/erpApi';
import { useLanguage } from '../../context/LanguageContext';

type SubTab = 'davomat' | 'hisobot' | 'ishkunlari' | 'oylik';

interface HrPayrollTabProps {
  employees: Employee[];
  bonuses?: BonusRecord[];
}

const EN_MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const currentYm = () => todayIso().slice(0, 7);

const ymLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${EN_MONTHS[Number(m)] || m} ${y}`;
};

const formatUzbekSum = (val: number) => {
  return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
};

// Oy ish kunlari ro'yxati (dam olish + bayram chegirilgan)
const getWorkingDays = (ym: string, s: AttendanceSettings | null): string[] => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return [];
  const dim = new Date(y, m, 0).getDate();
  const wd = (s?.workDays || '1,2,3,4,5,6').split(',').map(x => Number(x));
  const hol = new Set((s?.holidays || []).map(h => h.date));
  const out: string[] = [];
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, m - 1, d);
    const w = dt.getDay() === 0 ? 7 : dt.getDay();
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (wd.includes(w) && !hol.has(iso)) out.push(iso);
  }
  return out;
};

const isWorkdayIso = (iso: string, s: AttendanceSettings | null): boolean => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const w = dt.getDay() === 0 ? 7 : dt.getDay();
  const wd = (s?.workDays || '1,2,3,4,5,6').split(',').map(Number);
  const hol = new Set((s?.holidays || []).map(h => h.date));
  return wd.includes(w) && !hol.has(iso);
};

export const HrPayrollTab: React.FC<HrPayrollTabProps> = ({ employees, bonuses = [] }) => {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<SubTab>('oylik');
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [recCache, setRecCache] = useState<Record<string, AttendanceRecord[]>>({});
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [davomatDate, setDavomatDate] = useState(todayIso());
  const [hisobotMode, setHisobotMode] = useState<'oylik' | 'yillik'>('oylik');
  const [hisobotMonth, setHisobotMonth] = useState(currentYm());
  const [hisobotYear, setHisobotYear] = useState(String(new Date().getFullYear()));
  const [oylikMonth, setOylikMonth] = useState(currentYm());
  const [calMonth, setCalMonth] = useState(currentYm());
  const [matrixMode, setMatrixMode] = useState<'hafta' | 'oy'>('hafta');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [matrixMonth, setMatrixMonth] = useState(currentYm());

  const [detailEmpId, setDetailEmpId] = useState<string | null>(null);
  const [markKey, setMarkKey] = useState<string | null>(null);
  const [payCache, setPayCache] = useState<Record<string, SalaryPayment[]>>({});
  const [payBusyKey, setPayBusyKey] = useState<string | null>(null);

  // Sozlamalar formasi
  const [sForm, setSForm] = useState({ workStart: '08:00', workEnd: '18:00', grace: 15, radius: 25 });
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [office, setOffice] = useState({ lat: '', lng: '' });
  const [saveBusy, setSaveBusy] = useState(false);
  const [officeBusy, setOfficeBusy] = useState(false);

  const showMsg = (type: 'ok' | 'err', text: string) => setMsg({ type, text });

  const fetchMonth = async (ym: string) => {
    const key = `m:${ym}`;
    if (recCache[key]) return recCache[key];
    const r = await erpApi.attendance.list({ month: ym }).catch(() => [] as AttendanceRecord[]);
    setRecCache(prev => (prev[key] ? prev : { ...prev, [key]: r }));
    return r;
  };

  const fetchYear = async (y: string) => {
    const key = `y:${y}`;
    if (recCache[key]) return recCache[key];
    const r = await erpApi.attendance.list({ year: y }).catch(() => [] as AttendanceRecord[]);
    setRecCache(prev => (prev[key] ? prev : { ...prev, [key]: r }));
    return r;
  };

  useEffect(() => {
    erpApi.attendanceSettings.current()
      .then(s => {
        setSettings(s);
        setSForm({
          workStart: (s.workStartTime || '08:00:00').slice(0, 5),
          workEnd: (s.workEndTime || '18:00:00').slice(0, 5),
          grace: s.graceMinutes,
          radius: s.radiusM,
        });
        setHolidays(s.holidays || []);
      })
      .catch(() => {});
    erpApi.company.get()
      .then(c => {
        setCompany(c);
        if (c?.lat != null && c?.lng != null) {
          setOffice({ lat: String(c.lat), lng: String(c.lng) });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMonth(davomatDate.slice(0, 7));
  }, [davomatDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hisobotMode === 'oylik') fetchMonth(hisobotMonth);
    else fetchYear(hisobotYear);
  }, [hisobotMode, hisobotMonth, hisobotYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMonth(oylikMonth);
    erpApi.salaryPayments.list(oylikMonth)
      .then(r => setPayCache(prev => ({ ...prev, [oylikMonth]: r })))
      .catch(() => {});
  }, [oylikMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const payMap = useMemo(() => {
    const map = new Map<string, SalaryPayment>();
    (payCache[oylikMonth] || []).forEach(p => map.set(p.employeeId, p));
    return map;
  }, [payCache, oylikMonth]);

  const payStatusLabel = (s: SalaryPayment['status']) =>
    s === 'tolandi' ? t.dash.payroll.payStatus.tolandi : s === 'tayyorlandi' ? t.dash.payroll.payStatus.tayyorlandi : t.dash.payroll.payStatus.jarayonda;

  const handlePayMark = async (empId: string, amount: number, st: SalaryPayment['status']) => {
    setPayBusyKey(`${empId}:${st}`);
    try {
      const existing = payMap.get(empId);
      const saved = existing
        ? await erpApi.salaryPayments.update(existing.id, { amount: Math.round(amount), status: st })
        : await erpApi.salaryPayments.create({ employee_id: empId, month: oylikMonth, amount: Math.round(amount), status: st });
      setPayCache(prev => {
        const arr = (prev[oylikMonth] || []).filter(p => p.id !== saved.id && p.employeeId !== empId);
        return { ...prev, [oylikMonth]: [saved, ...arr] };
      });
      showMsg('ok', st === 'tolandi' ? t.dash.payroll.msg.payConfirmed : t.dash.payroll.msg.payUpdated);
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : t.dash.payroll.msg.error);
    } finally {
      setPayBusyKey(null);
    }
  };

  useEffect(() => {
    fetchMonth(calMonth);
  }, [calMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (matrixMode === 'oy') {
      fetchMonth(matrixMonth);
    } else {
      const ws = weekStart.slice(0, 7);
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + 6);
      const we = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      fetchMonth(ws);
      if (we !== ws) fetchMonth(we);
    }
  }, [matrixMode, weekStart, matrixMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haftalik / oylik matritsa uchun kunlar
  const matrixDays: string[] = useMemo(() => {
    if (matrixMode === 'oy') {
      const [y, m] = matrixMonth.split('-').map(Number);
      if (!y || !m) return [];
      const dim = new Date(y, m, 0).getDate();
      return Array.from({ length: dim }, (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
    }
    const out: string[] = [];
    const d = new Date(weekStart + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const t = new Date(d);
      t.setDate(d.getDate() + i);
      out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
    }
    return out;
  }, [matrixMode, weekStart, matrixMonth]);

  const matrixRecords = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    Object.values(recCache).flat().forEach(r => map.set(`${r.employeeId}|${r.date}`, r));
    return map;
  }, [recCache]);

  const matrixCell = (empId: string, iso: string): 'kelgan' | 'kechikkan' | 'kelmadi' | 'damolish' | 'yok' => {
    const rec = matrixRecords.get(`${empId}|${iso}`);
    if (rec) return rec.status;
    if (!isWorkdayIso(iso, settings)) return 'damolish';
    if (iso > today) return 'yok';
    if (iso === today) return 'yok';
    return 'kelmadi';
  };

  const activeEmployees = useMemo(() => employees.filter(e => e.status !== 'nofaol'), [employees]);
  const today = todayIso();

  // ---- Davomat kuni ----
  const dayRecords = useMemo(() => {
    const arr = recCache[`m:${davomatDate.slice(0, 7)}`] || [];
    const map = new Map<string, AttendanceRecord>();
    arr.forEach(r => { if (r.date === davomatDate) map.set(r.employeeId, r); });
    return map;
  }, [recCache, davomatDate]);

  const davomatRows = useMemo(() => {
    const past = davomatDate < today;
    const workday = isWorkdayIso(davomatDate, settings);
    return activeEmployees.map(emp => {
      const rec = dayRecords.get(emp.id);
      let st: 'kelgan' | 'kechikkan' | 'kelmadi' | 'belgilanmagan' | 'damolish';
      if (rec) st = rec.status;
      else if (!workday) st = 'damolish';
      else if (past) st = 'kelmadi';
      else st = 'belgilanmagan';
      return { emp, rec: rec || null, status: st };
    });
  }, [activeEmployees, dayRecords, davomatDate, today, settings]);

  const dayStats = useMemo(() => ({
    keldi: davomatRows.filter(r => r.status === 'kelgan').length,
    kechikdi: davomatRows.filter(r => r.status === 'kechikkan').length,
    kelmadi: davomatRows.filter(r => r.status === 'kelmadi').length,
  }), [davomatRows]);

  const handleMark = async (empId: string, st: 'kelgan' | 'kechikkan' | 'kelmadi') => {
    if (davomatDate > today) {
      showMsg('err', t.dash.payroll.msg.futureMark);
      return;
    }
    setMarkKey(`${empId}:${st}`);
    try {
      const res = await erpApi.attendance.mark({ employee_id: empId, date: davomatDate, status: st });
      const key = `m:${davomatDate.slice(0, 7)}`;
      setRecCache(prev => {
        const arr = prev[key] || [];
        if ((res as unknown as { deleted?: boolean }).deleted) {
          return { ...prev, [key]: arr.filter(r => !(r.employeeId === empId && r.date === davomatDate)) };
        }
        const rec = res as AttendanceRecord;
        return { ...prev, [key]: [rec, ...arr.filter(r => r.id !== rec.id && !(r.employeeId === empId && r.date === davomatDate))] };
      });
      showMsg('ok', st === 'kelmadi' ? t.dash.payroll.msg.markedAbsent : t.dash.payroll.msg.attUpdated);
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : t.dash.payroll.msg.error);
    } finally {
      setMarkKey(null);
    }
  };

  const detailRec = detailEmpId ? dayRecords.get(detailEmpId) || null : null;
  const detailEmp = detailEmpId ? activeEmployees.find(e => e.id === detailEmpId) || null : null;

  // ---- Hisobot ----
  const hisobotData = useMemo(() => {
    if (hisobotMode === 'oylik') {
      const working = getWorkingDays(hisobotMonth, settings);
      const elapsed = working.filter(d => d <= today);
      const arr = recCache[`m:${hisobotMonth}`] || [];
      const rows = activeEmployees.map(emp => {
        const recs = arr.filter(r => r.employeeId === emp.id);
        const kelgan = recs.filter(r => r.status === 'kelgan').length;
        const kechikkan = recs.filter(r => r.status === 'kechikkan').length;
        const attended = kelgan + kechikkan;
        const kelmagan = Math.max(0, elapsed.length - attended);
        const daily = working.length > 0 ? emp.salary / working.length : 0;
        return { emp, kelgan, kechikkan, kelmagan, attended, daily: Math.round(daily), earned: Math.round(daily * attended), workDays: working.length };
      });
      return { rows, workDays: working.length, ym: hisobotMonth };
    }
    const y = Number(hisobotYear) || new Date().getFullYear();
    const arr = recCache[`y:${hisobotYear}`] || [];
    let workTotal = 0;
    const rows = activeEmployees.map(emp => {
      let kelgan = 0, kechikkan = 0, workDays = 0;
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        const working = getWorkingDays(ym, settings);
        const elapsed = working.filter(d => d <= today);
        workDays += elapsed.length;
        kelgan += arr.filter(r => r.employeeId === emp.id && r.date.startsWith(ym) && r.status === 'kelgan').length;
        kechikkan += arr.filter(r => r.employeeId === emp.id && r.date.startsWith(ym) && r.status === 'kechikkan').length;
      }
      const attended = kelgan + kechikkan;
      workTotal = Math.max(workTotal, workDays);
      const daily = workDays > 0 ? (emp.salary * 12) / workDays : 0;
      return { emp, kelgan, kechikkan, kelmagan: Math.max(0, workDays - attended), attended, daily: Math.round(daily), earned: Math.round(daily * attended), workDays };
    });
    return { rows, workDays: workTotal, ym: hisobotYear };
  }, [hisobotMode, hisobotMonth, hisobotYear, recCache, activeEmployees, settings, today]);

  // ---- Oylik maosh ----
  const oylikData = useMemo(() => {
    const working = getWorkingDays(oylikMonth, settings);
    const elapsed = working.filter(d => d <= today);
    const arr = recCache[`m:${oylikMonth}`] || [];
    const rows = activeEmployees.map(emp => {
      const recs = arr.filter(r => r.employeeId === emp.id);
      const kelgan = recs.filter(r => r.status === 'kelgan').length;
      const kechikkan = recs.filter(r => r.status === 'kechikkan').length;
      const attended = kelgan + kechikkan;
      const kelmagan = Math.max(0, elapsed.length - attended);
      const daily = working.length > 0 ? emp.salary / working.length : 0;
      const attEarned = Math.round(daily * attended);
      // Bonus — davomatga bog'liq emas, tasdiqlangan bonuslar oylik ustiga qo'shiladi
      const bonus = bonuses
        .filter(b => b.employeeId === emp.id && (b.date || '').startsWith(oylikMonth) && b.status === 'tasdiqlangan')
        .reduce((s, b) => s + b.amount, 0);
      const earned = attEarned + bonus;
      return { emp, kelgan, kechikkan, kelmagan, daily: Math.round(daily), bonus, earned, deduction: emp.salary > 0 ? attEarned - emp.salary : null };
    });
    return {
      rows,
      workingDays: working.length,
      totalEarned: rows.reduce((s, r) => s + r.earned, 0),
      totalDeduction: rows.reduce((s, r) => s + (r.deduction ?? 0), 0),
    };
  }, [oylikMonth, recCache, activeEmployees, settings, today, bonuses]);

  // ---- Sozlash saqlash ----
  const handleSaveSettings = async () => {
    setSaveBusy(true);
    try {
      const saved = await erpApi.attendanceSettings.update({
        workStartTime: sForm.workStart,
        workEndTime: sForm.workEnd,
        graceMinutes: Number(sForm.grace) || 0,
        radiusM: Number(sForm.radius) || 25,
        workDays: settings?.workDays || '1,2,3,4,5,6',
        holidays,
      });
      setSettings(saved);
      showMsg('ok', t.dash.payroll.msg.settingsSaved);
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : t.dash.payroll.msg.error);
    } finally {
      setSaveBusy(false);
    }
  };

  const handleSaveOffice = async () => {
    const lat = Number(String(office.lat).replace(',', '.'));
    const lng = Number(String(office.lng).replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lng)) {
      showMsg('err', t.dash.payroll.msg.coordError);
      return;
    }
    setOfficeBusy(true);
    try {
      if (company?.id) {
        const updated = await erpApi.company.update(company.id, { lat, lng });
        setCompany(updated);
      } else {
        const created = await erpApi.company.create({ lat, lng } as never);
        setCompany(created);
      }
      showMsg('ok', t.dash.payroll.msg.officeSaved);
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : t.dash.payroll.msg.error);
    } finally {
      setOfficeBusy(false);
    }
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date) return;
    if (holidays.some(h => h.date === newHoliday.date)) return;
    setHolidays(prev => [...prev, { ...newHoliday }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHoliday({ date: '', name: '' });
  };

  // ---- Excel ----
  const handleExportExcel = () => {
    let rows: Record<string, unknown>[] = [];
    let fname = '';
    if (subTab === 'davomat') {
      rows = davomatRows.map((r, i) => ({
        '№': i + 1,
        [t.dash.payroll.excel.sana]: davomatDate,
        [t.dash.payroll.excel.xodim]: r.emp.fullName,
        [t.dash.payroll.excel.lavozim]: r.emp.position,
        [t.dash.payroll.excel.holat]: r.status === 'kelgan' ? t.dash.payroll.status.keldi : r.status === 'kechikkan' ? t.dash.payroll.status.kechikdi : r.status === 'kelmadi' ? t.dash.payroll.status.kelmadi : r.status === 'damolish' ? t.dash.payroll.status.damolish : t.dash.payroll.status.belgilanmagan,
        [t.dash.payroll.excel.kirish]: r.rec?.checkIn?.slice(0, 5) || '—',
      }));
      fname = `Davomat_${davomatDate}`;
    } else if (subTab === 'hisobot') {
      rows = hisobotData.rows.map((r, i) => ({
        '№': i + 1,
        [t.dash.payroll.excel.davr]: hisobotData.ym,
        [t.dash.payroll.excel.xodim]: r.emp.fullName,
        [t.dash.payroll.excel.ishKuni]: r.workDays,
        [t.dash.payroll.excel.kelgan]: r.kelgan,
        [t.dash.payroll.excel.kechikkan]: r.kechikkan,
        [t.dash.payroll.excel.kelmagan]: r.kelmagan,
        [t.dash.payroll.excel.qatnashish]: r.workDays > 0 ? Math.round((r.attended / r.workDays) * 100) : 0,
        [t.dash.payroll.excel.maosh]: r.earned,
      }));
      fname = `Hisobot_${hisobotData.ym}`;
    } else if (subTab === 'oylik') {
      const pm = new Map<string, SalaryPayment>();
      (payCache[oylikMonth] || []).forEach(p => pm.set(p.employeeId, p));
      rows = oylikData.rows.map((r, i) => ({
        '№': i + 1,
        [t.dash.payroll.excel.oy]: oylikMonth,
        [t.dash.payroll.excel.xodim]: r.emp.fullName,
        [t.dash.payroll.excel.oylikMaosh]: r.emp.salary,
        [t.dash.payroll.excel.kunlik]: r.daily,
        [t.dash.payroll.excel.kelgan]: r.kelgan,
        [t.dash.payroll.excel.kechikkan]: r.kechikkan,
        [t.dash.payroll.excel.kelmagan]: r.kelmagan,
        [t.dash.payroll.excel.bonus]: r.bonus,
        [t.dash.payroll.excel.ushlanma]: r.deduction ?? '—',
        [t.dash.payroll.excel.hisoblangan]: r.earned,
        [t.dash.payroll.excel.tolov]: pm.get(r.emp.id) ? payStatusLabel(pm.get(r.emp.id)!.status) : t.dash.payroll.status.belgilanmagan,
      }));
      fname = `Oylik_maosh_${oylikMonth}`;
    } else {
      rows = holidays.map((h, i) => ({ '№': i + 1, [t.dash.payroll.excel.sana]: h.date, [t.dash.payroll.excel.sabab]: h.name || t.dash.payroll.excel.defaultRest }));
      fname = `Dam_olish_kunlari`;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.dash.payroll.excel.sheet);
    XLSX.writeFile(wb, `${fname}.xlsx`);
  };

  // ---- Kalendar ----
  const calCells = useMemo(() => {
    const [y, m] = calMonth.split('-').map(Number);
    if (!y || !m) return { cells: [] as (string | null)[], y: 0 };
    const dim = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const cells: (string | null)[] = [...Array(offset).fill(null)];
    for (let d = 1; d <= dim; d++) {
      cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return { cells, y };
  }, [calMonth]);

  const calMonthRecords = recCache[`m:${calMonth}`] || [];

  const tabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: 'oylik', label: t.dash.payroll.tabs.oylik, icon: <Wallet className="w-4 h-4" /> },
    { key: 'ishkunlari', label: t.dash.payroll.tabs.ishkunlari, icon: <Settings2 className="w-4 h-4" /> },
    { key: 'davomat', label: t.dash.payroll.tabs.davomat, icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'hisobot', label: t.dash.payroll.tabs.hisobot, icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const statusBadge = (st: string) => {
    if (st === 'kelgan') return <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t.dash.payroll.status.keldi}</span>;
    if (st === 'kechikkan') return <span className="text-amber-600 dark:text-amber-400 font-bold">{t.dash.payroll.status.kechikdi}</span>;
    if (st === 'kelmadi') return <span className="text-rose-600 dark:text-rose-400 font-bold">{t.dash.payroll.status.kelmadi}</span>;
    if (st === 'damolish') return <span className="text-stone-400">{t.dash.payroll.status.damolish}</span>;
    return <span className="text-stone-400">{t.dash.payroll.status.belgilanmagan}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-[#1A1715] dark:text-[#FAF7F2] tracking-tight">
            {t.dash.payroll.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-1">
            {t.dash.payroll.header.sub}
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer self-start"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t.dash.payroll.header.excel}</span>
        </button>
      </div>

      {/* Ichki tablar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === t.key
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
                : 'bg-stone-100 dark:bg-[#251E18] text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl border-2 text-xs font-bold flex items-start gap-2 ${
          msg.type === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============ DAVOMAT TAB ============ */}
      {subTab === 'davomat' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-xs font-mono font-bold">
              <CalendarDays className="w-4 h-4 text-stone-400" />
              <input
                type="date"
                value={davomatDate}
                max={today}
                onChange={(e) => e.target.value && setDavomatDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </span>
            <button
              onClick={() => setDavomatDate(today)}
              className="px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-xs font-bold hover:border-amber-500 transition-colors cursor-pointer"
            >
              {t.dash.payroll.davomat.today}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-center shadow-sm">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{dayStats.keldi}</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">{t.dash.payroll.status.keldi}</div>
            </div>
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-center shadow-sm">
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{dayStats.kechikdi}</div>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">{t.dash.payroll.status.kechikdi}</div>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-center shadow-sm">
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{dayStats.kelmadi}</div>
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">{t.dash.payroll.status.kelmadi}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100 dark:border-[#2D251D]">
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.davomat.colEmp}</th>
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.davomat.colRole}</th>
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.davomat.colStatus}</th>
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.davomat.colCheck}</th>
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.davomat.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-[#241E18]">
                  {davomatRows.map(r => (
                    <tr key={r.emp.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{r.emp.fullName}</td>
                      <td className="py-3.5 px-4 text-stone-500">{r.emp.position}</td>
                      <td className="py-3.5 px-4">{statusBadge(r.status)}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setDetailEmpId(r.emp.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-[#382F26] text-[11px] font-bold hover:border-amber-500 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t.dash.payroll.davomat.checkBtn}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {(['kelgan', 'kelmadi', 'kechikkan'] as const).map(st => (
                            <button
                              key={st}
                              disabled={markKey !== null || davomatDate > today}
                              onClick={() => handleMark(r.emp.id, st)}
                              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-40 ${
                                r.rec?.status === st
                                  ? st === 'kelgan'
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : st === 'kechikkan'
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-rose-500 text-white border-rose-500'
                                  : 'border-stone-200 dark:border-[#382F26] text-stone-500 hover:border-amber-500'
                              }`}
                            >
                              {st === 'kelgan' ? t.dash.payroll.status.keldi : st === 'kelmadi' ? t.dash.payroll.status.kelmadi : t.dash.payroll.status.kechikdi}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil kartalar */}
          <div className="md:hidden space-y-2">
            {davomatRows.map(r => (
              <div key={r.emp.id} className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2] truncate">{r.emp.fullName}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">{r.emp.position}</div>
                  </div>
                  {statusBadge(r.status)}
                </div>
                <div className="flex items-stretch gap-1.5">
                  <button
                    onClick={() => setDetailEmpId(r.emp.id)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-stone-200 dark:border-[#382F26] text-[10px] font-bold hover:border-amber-500 transition-colors cursor-pointer flex-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t.dash.payroll.davomat.checkBtn}
                  </button>
                  {(['kelgan', 'kelmadi', 'kechikkan'] as const).map(st => (
                    <button
                      key={st}
                      disabled={markKey !== null || davomatDate > today}
                      onClick={() => handleMark(r.emp.id, st)}
                      className={`flex-1 px-2 py-2 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-40 ${
                        r.rec?.status === st
                          ? st === 'kelgan'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : st === 'kechikkan'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-rose-500 text-white border-rose-500'
                          : 'border-stone-200 dark:border-[#382F26] text-stone-500 hover:border-amber-500'
                      }`}
                    >
                      {st === 'kelgan' ? t.dash.payroll.status.keldi : st === 'kelmadi' ? t.dash.payroll.status.kelmadi : t.dash.payroll.status.kechikdi}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ HISOBOT TAB ============ */}
      {subTab === 'hisobot' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-[#251E18]">
              <button
                onClick={() => setHisobotMode('oylik')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${hisobotMode === 'oylik' ? 'bg-orange-500 text-white shadow' : 'text-stone-500'}`}
              >
                {t.dash.payroll.hisobot.monthly}
              </button>
              <button
                onClick={() => setHisobotMode('yillik')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${hisobotMode === 'yillik' ? 'bg-orange-500 text-white shadow' : 'text-stone-500'}`}
              >
                {t.dash.payroll.hisobot.yearly}
              </button>
            </div>
            {hisobotMode === 'oylik' ? (
              <input
                type="month"
                value={hisobotMonth}
                onChange={(e) => e.target.value && setHisobotMonth(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-xs font-mono"
              />
            ) : (
              <input
                type="number"
                min={2020}
                max={2100}
                value={hisobotYear}
                onChange={(e) => e.target.value && setHisobotYear(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-xs font-mono w-28"
              />
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                {hisobotMode === 'oylik' ? `${ymLabel(hisobotMonth)} ${t.dash.payroll.hisobot.report}` : `${hisobotYear} ${t.dash.payroll.hisobot.yearReport}`}
              </h3>
              <span className="text-[11px] text-stone-400">{t.dash.payroll.hisobot.workdays}: {hisobotData.workDays}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-y border-stone-100 dark:border-[#2D251D] bg-stone-50/50 dark:bg-[#141210]">
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.hisobot.colEmp}</th>
                    <th className="py-3 px-4 font-bold text-center">{t.dash.payroll.hisobot.colWorkday}</th>
                    <th className="py-3 px-4 font-bold text-center text-emerald-600">{t.dash.payroll.hisobot.colKeldi}</th>
                    <th className="py-3 px-4 font-bold text-center text-amber-600">{t.dash.payroll.hisobot.colKechikkan}</th>
                    <th className="py-3 px-4 font-bold text-center text-rose-600">{t.dash.payroll.hisobot.colKelmagan}</th>
                    <th className="py-3 px-4 font-bold text-center">{t.dash.payroll.hisobot.colAttend}</th>
                    <th className="py-3 px-4 font-bold text-right">{t.dash.payroll.hisobot.colSalary}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-[#241E18]">
                  {hisobotData.rows.map(r => (
                    <tr key={r.emp.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{r.emp.fullName}</td>
                      <td className="py-3.5 px-4 text-center">{r.workDays}</td>
                      <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{r.kelgan}</td>
                      <td className="py-3.5 px-4 text-center text-amber-600 font-bold">{r.kechikkan}</td>
                      <td className="py-3.5 px-4 text-center text-rose-600 font-bold">{r.kelmagan}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.workDays > 0 && r.attended / r.workDays >= 0.9
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-rose-500/15 text-rose-600'
                        }`}>
                          {r.workDays > 0 ? Math.round((r.attended / r.workDays) * 100) : 0}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">{formatUzbekSum(r.earned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ ISH KUNLARI TAB ============ */}
      {subTab === 'ishkunlari' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[calc(50%+12.5px)_calc(50%-12.5px)] gap-4">
          <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm p-5">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div>
                <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-amber-600" /> {t.dash.payroll.calendar.monthView}
                </h3>
                <input
                  type="month"
                  value={calMonth}
                  onChange={(e) => e.target.value && setCalMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono mb-3"
                />
                <div className="max-w-[300px]">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400 mb-1">
                  {[t.dash.payroll.calendar.wd.du, t.dash.payroll.calendar.wd.se, t.dash.payroll.calendar.wd.ch, t.dash.payroll.calendar.wd.pa, t.dash.payroll.calendar.wd.ju, t.dash.payroll.calendar.wd.sh, t.dash.payroll.calendar.wd.ya].map(d => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calCells.cells.map((iso, i) => {
                    if (!iso) return <span key={i} />;
                    const d = new Date(iso + 'T00:00:00');
                    const isToday = iso === today;
                    const isHol = holidays.some(h => h.date === iso);
                    const isSun = d.getDay() === 0;
                    const cnt = calMonthRecords.filter(r => r.date === iso).length;
                    return (
                      <div
                        key={i}
                        title={`${iso}${isHol ? ` — ${t.dash.payroll.calendar.holiday}` : ''} • ${t.dash.payroll.calendar.arrived}: ${cnt}`}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-black border ${
                          isToday
                            ? 'bg-orange-500 text-white border-orange-500 shadow'
                            : isHol || isSun
                            ? 'bg-rose-100 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-400/60'
                            : 'bg-stone-50 dark:bg-[#141210] text-stone-600 dark:text-stone-300 border-stone-100 dark:border-[#26201A]'
                        }`}
                      >
                        <span>{Number(iso.slice(8, 10))}</span>
                        {cnt > 0 && <span className={`text-[8px] leading-none font-bold ${isToday ? 'text-white' : isHol || isSun ? 'text-rose-700 dark:text-rose-200' : 'text-emerald-600'}`}>{cnt}</span>}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2 mb-3">
                  <span className="text-amber-500">◐</span> {t.dash.payroll.calendar.restTitle}
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="flex-1">
                    <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.calendar.date}</label>
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono"
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.calendar.reason}</label>
                    <input
                      type="text"
                      placeholder={t.dash.payroll.calendar.reasonPh}
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddHoliday}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {t.dash.payroll.calendar.add}
                    </button>
                  </div>
                </div>
                {holidays.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4">{t.dash.payroll.calendar.empty}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {holidays.map(h => (
                      <span key={h.date} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                        {h.date}{h.name ? ` — ${h.name}` : ''}
                        <button onClick={() => setHolidays(prev => prev.filter(x => x.date !== h.date))} className="opacity-60 hover:opacity-100 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-stone-400 mt-3">
                  {t.dash.payroll.calendar.note}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              {t.dash.payroll.office.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.office.lat}</label>
                <input
                  value={office.lat}
                  onChange={(e) => setOffice({ ...office, lat: e.target.value })}
                  placeholder="41.69908"
                  inputMode="decimal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.office.lng}</label>
                <input
                  value={office.lng}
                  onChange={(e) => setOffice({ ...office, lng: e.target.value })}
                  placeholder="60.287164"
                  inputMode="decimal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <div className="flex gap-2">
                {office.lat && office.lng && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${office.lat}&mlon=${office.lng}#map=16/${office.lat}/${office.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    title={t.dash.payroll.office.mapTitle}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] hover:border-amber-500 transition-colors cursor-pointer"
                  >
                    <MapIcon className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={handleSaveOffice}
                  disabled={officeBusy}
                  className="px-4 py-2.5 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {officeBusy ? '...' : t.dash.payroll.office.save}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.office.radius}</label>
              <input
                type="number"
                min={5}
                max={5000}
                value={sForm.radius}
                onChange={(e) => setSForm({ ...sForm, radius: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.office.start}</label>
                <input
                  type="time"
                  value={sForm.workStart}
                  onChange={(e) => setSForm({ ...sForm, workStart: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.office.end}</label>
                <input
                  type="time"
                  value={sForm.workEnd}
                  onChange={(e) => setSForm({ ...sForm, workEnd: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">{t.dash.payroll.office.grace}</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={sForm.grace}
                  onChange={(e) => setSForm({ ...sForm, grace: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-stone-50 dark:bg-[#12100E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-400 bg-stone-50 dark:bg-[#141210] px-3 py-2 rounded-xl">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {t.dash.payroll.office.hint}
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saveBusy}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B27] via-[#D4AF37] to-[#B3871C] text-black font-black text-xs uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50"
            >
              {saveBusy ? t.dash.payroll.office.settingsSaving : t.dash.payroll.office.settingsSave}
            </button>
          </div>
          </div>

          {/* Haftalik / oylik davomat matritsasi */}
          <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.payroll.matrix.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-[#251E18]">
                  <button
                    onClick={() => setMatrixMode('hafta')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${matrixMode === 'hafta' ? 'bg-orange-500 text-white shadow' : 'text-stone-500'}`}
                  >
                    {t.dash.payroll.matrix.weekly}
                  </button>
                  <button
                    onClick={() => setMatrixMode('oy')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${matrixMode === 'oy' ? 'bg-orange-500 text-white shadow' : 'text-stone-500'}`}
                  >
                    {t.dash.payroll.matrix.monthly}
                  </button>
                </div>
                {matrixMode === 'hafta' ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const d = new Date(weekStart + 'T00:00:00');
                        d.setDate(d.getDate() - 7);
                        setWeekStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#382F26] text-xs font-black hover:border-amber-500 cursor-pointer"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                        setWeekStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#382F26] text-[11px] font-bold hover:border-amber-500 cursor-pointer"
                    >
                      {t.dash.payroll.matrix.thisWeek}
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(weekStart + 'T00:00:00');
                        d.setDate(d.getDate() + 7);
                        setWeekStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#382F26] text-xs font-black hover:border-amber-500 cursor-pointer"
                    >
                      ›
                    </button>
                  </div>
                ) : (
                  <input
                    type="month"
                    value={matrixMonth}
                    onChange={(e) => e.target.value && setMatrixMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-xs font-mono"
                  />
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100 dark:border-[#2D251D]">
                    <th className="py-2 px-3 font-bold sticky left-0 bg-white dark:bg-[#1C1814] z-10 min-w-[140px]">{t.dash.payroll.matrix.colEmp}</th>
                    {matrixDays.map(iso => {
                      const dt = new Date(iso + 'T00:00:00');
                      const wd = [t.dash.payroll.calendar.wd.ya, t.dash.payroll.calendar.wd.du, t.dash.payroll.calendar.wd.se, t.dash.payroll.calendar.wd.ch, t.dash.payroll.calendar.wd.pa, t.dash.payroll.calendar.wd.ju, t.dash.payroll.calendar.wd.sh][dt.getDay()];
                      return (
                        <th key={iso} className="py-2 px-1 font-bold text-center min-w-[36px]">
                          <span className="block text-[9px] text-stone-400">{matrixMode === 'hafta' ? wd : ''}</span>
                          <span>{Number(iso.slice(8, 10))}</span>
                        </th>
                      );
                    })}
                    <th className="py-2 px-3 font-bold text-center">{t.dash.payroll.matrix.colKeldi}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-[#241E18]">
                  {activeEmployees.map(emp => {
                    const cells = matrixDays.map(iso => matrixCell(emp.id, iso));
                    const kelgan = cells.filter(c => c === 'kelgan' || c === 'kechikkan').length;
                    return (
                      <tr key={emp.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16]">
                        <td className="py-2 px-3 font-semibold text-[#1A1715] dark:text-[#FAF7F2] sticky left-0 bg-white dark:bg-[#1C1814] z-10 whitespace-nowrap">
                          {emp.fullName}
                        </td>
                        {matrixDays.map((iso, i) => {
                          const st = cells[i];
                          const cls = st === 'kelgan'
                            ? 'bg-emerald-500 text-white'
                            : st === 'kechikkan'
                            ? 'bg-amber-500 text-white'
                            : st === 'kelmadi'
                            ? 'bg-rose-500 text-white'
                            : st === 'damolish'
                            ? 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                            : 'bg-transparent border border-dashed border-stone-300 dark:border-stone-600 text-transparent';
                          const label = st === 'kelgan' ? t.dash.payroll.status.keldi : st === 'kechikkan' ? t.dash.payroll.status.kechikdi : st === 'kelmadi' ? t.dash.payroll.status.kelmadi : st === 'damolish' ? t.dash.payroll.status.damolish : '—';
                          return (
                            <td key={iso} className="py-1.5 px-1 text-center">
                              <span
                                title={`${emp.fullName} • ${iso} • ${label}`}
                                className={`w-7 h-7 rounded-md inline-flex items-center justify-center text-[10px] font-black ${cls}`}
                              >
                                {st === 'kelgan' ? '✓' : st === 'kechikkan' ? '!' : st === 'kelmadi' ? '✗' : st === 'damolish' ? '–' : '·'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center font-mono font-bold whitespace-nowrap">
                          {kelgan}/{matrixDays.filter(iso => isWorkdayIso(iso, settings)).length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> {t.dash.payroll.status.keldi}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> {t.dash.payroll.status.kechikdi}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block" /> {t.dash.payroll.status.kelmadi}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-300 dark:bg-stone-600 inline-block" /> {t.dash.payroll.status.damolish}</span>
            </div>
          </div>

        </div>
      )}

      {/* ============ OYLIK MAOSH TAB ============ */}
      {subTab === 'oylik' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-xs font-mono font-bold">
              <CalendarDays className="w-4 h-4 text-stone-400" />
              <input
                type="month"
                value={oylikMonth}
                onChange={(e) => e.target.value && setOylikMonth(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-center shadow-sm">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatUzbekSum(oylikData.totalEarned)}</div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{t.dash.payroll.oylik.totalSalary}</div>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-center shadow-sm">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{oylikData.workingDays} {t.dash.payroll.oylik.day}</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">{t.dash.payroll.oylik.workdays}</div>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-center shadow-sm">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatUzbekSum(oylikData.totalDeduction)}</div>
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">{t.dash.payroll.oylik.totalDeduction}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100 dark:border-[#2D251D]">
                    <th className="py-3 px-4 font-bold">{t.dash.payroll.oylik.colEmp}</th>
                    <th className="py-3 px-4 font-bold text-right">{t.dash.payroll.oylik.colSalary}</th>
                    <th className="py-3 px-4 font-bold text-right">{t.dash.payroll.oylik.colDaily}</th>
                    <th className="py-3 px-4 font-bold text-center text-emerald-600">{t.dash.payroll.oylik.colKeldi}</th>
                    <th className="py-3 px-4 font-bold text-center text-amber-600">{t.dash.payroll.oylik.colKechikkan}</th>
                    <th className="py-3 px-4 font-bold text-center text-rose-600">{t.dash.payroll.oylik.colKelmagan}</th>
                    <th className="py-3 px-4 font-bold text-right text-violet-600">{t.dash.payroll.oylik.colBonus}</th>
                    <th className="py-3 px-4 font-bold text-right">{t.dash.payroll.oylik.colDeduction}</th>
                    <th className="py-3 px-4 font-bold text-right">{t.dash.payroll.oylik.colEarned}</th>
                    <th className="py-3 px-4 font-bold text-center">{t.dash.payroll.oylik.colPay}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-[#241E18]">
                  {oylikData.rows.map(r => {
                    const pay = payMap.get(r.emp.id);
                    const locked = pay?.status === 'tolandi';
                    return (
                    <tr key={r.emp.id} className="hover:bg-stone-50/50 dark:hover:bg-[#221C16] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#1A1715] dark:text-[#FAF7F2]">{r.emp.fullName}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatUzbekSum(r.emp.salary)}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatUzbekSum(r.daily)}</td>
                      <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{r.kelgan}</td>
                      <td className="py-3.5 px-4 text-center text-amber-600 font-bold">{r.kechikkan}</td>
                      <td className="py-3.5 px-4 text-center text-rose-600 font-bold">{r.kelmagan}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-violet-600 dark:text-violet-400">
                        {r.bonus > 0 ? `+${formatUzbekSum(r.bonus)}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600">
                        {r.deduction == null ? '—' : formatUzbekSum(r.deduction)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">{formatUzbekSum(r.earned)}</td>
                      <td className="py-3.5 px-4 text-center">
                        {locked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-[10px] font-black" title={t.dash.payroll.oylik.lockedTitle}>
                            <Lock className="w-3 h-3" />
                            {t.dash.payroll.oylik.paid}
                          </span>
                        ) : (
                          <select
                            value={pay?.status || 'jarayonda'}
                            disabled={payBusyKey !== null}
                            onChange={(e) => handlePayMark(r.emp.id, r.earned, e.target.value as SalaryPayment['status'])}
                            title={t.dash.payroll.oylik.payTitle}
                            className="px-2 py-1 rounded-lg border border-stone-200 dark:border-[#382F26] bg-white dark:bg-[#1A1714] text-[10px] font-bold text-stone-600 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-40"
                          >
                            <option value="jarayonda">{t.dash.payroll.oylik.optProgress}</option>
                            <option value="tayyorlandi">{t.dash.payroll.oylik.optReady}</option>
                            <option value="tolandi">{t.dash.payroll.oylik.optPaid}</option>
                          </select>
                        )}
                        {pay && !locked && (
                          <div className="text-[9px] text-stone-400 font-mono mt-0.5">{formatUzbekSum(pay.amount)}</div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Kelish detallari modali */}
      {detailEmpId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] border border-[#E2DBD1] dark:border-[#382F26] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-[#2D251D] mb-4">
              <h3 className="font-bold text-base text-[#1A1715] dark:text-[#FAF7F2]">
                {t.dash.payroll.modal.title}
              </h3>
              <button
                onClick={() => setDetailEmpId(null)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#251E18] text-stone-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {!detailEmp ? (
              <p className="text-xs text-stone-500">{t.dash.payroll.modal.notFound}</p>
            ) : !detailRec ? (
              <div className="text-xs space-y-2">
                <p className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">{detailEmp.fullName}</p>
                <p className="text-stone-500">{t.dash.payroll.modal.noRecord} {davomatDate}.</p>
              </div>
            ) : (
              <div className="text-xs space-y-3">
                <p className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">{detailEmp.fullName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720]">
                    <div className="text-[10px] text-stone-400 font-bold uppercase">{t.dash.payroll.modal.checkin}</div>
                    <div className="font-mono font-black text-sm mt-0.5">{detailRec.checkIn?.slice(0, 5) || '—'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720]">
                    <div className="text-[10px] text-stone-400 font-bold uppercase">{t.dash.payroll.modal.distance}</div>
                    <div className="font-mono font-black text-sm mt-0.5">{detailRec.distanceM != null ? `${Math.round(detailRec.distanceM)}m` : '—'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720]">
                    <div className="text-[10px] text-stone-400 font-bold uppercase">{t.dash.payroll.modal.method}</div>
                    <div className="font-bold text-sm mt-0.5">{detailRec.method === 'manual' ? t.dash.payroll.modal.manual : t.dash.payroll.modal.face}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720]">
                    <div className="text-[10px] text-stone-400 font-bold uppercase">{t.dash.payroll.modal.status}</div>
                    <div className="font-bold text-sm mt-0.5">{detailRec.status === 'kelgan' ? t.dash.payroll.modal.stKeldi : t.dash.payroll.modal.stKechikdi}</div>
                  </div>
                </div>
                {detailRec.facePhoto && (
                  <img src={detailRec.facePhoto} alt={t.dash.payroll.modal.evidenceAlt} className="w-full h-48 rounded-xl object-cover border border-stone-200 dark:border-[#2E2720]" />
                )}
                {detailRec.lat != null && detailRec.lng != null && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${detailRec.lat}&mlon=${detailRec.lng}#map=17/${detailRec.lat}/${detailRec.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {t.dash.payroll.modal.mapView} ({detailRec.lat.toFixed(5)}, {detailRec.lng.toFixed(5)})
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
