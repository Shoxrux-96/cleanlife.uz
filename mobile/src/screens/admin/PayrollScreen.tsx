import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Loader, Muted, Screen } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

// -------- Reusable Select (dropdown) --------
type SelectOption = { value: string; label: string; color?: string };
const Select: React.FC<{
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  colors: Palette;
  compact?: boolean;
  disabled?: boolean;
}> = ({ value, options, onChange, placeholder, colors, compact, disabled }) => {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  const tint = cur?.color || colors.text;
  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: compact ? 7 : 10,
          paddingHorizontal: compact ? 10 : 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: cur?.color ? cur.color + '66' : colors.cardBorder,
          backgroundColor: cur?.color ? cur.color + '18' : colors.input,
          opacity: disabled ? 0.5 : 1,
          flex: compact ? undefined : 1,
          minWidth: compact ? 100 : undefined,
        }}
      >
        <Text style={{ color: tint, fontSize: compact ? 11 : 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {cur?.label || placeholder || 'Tanlang'}
        </Text>
        <Text style={{ color: tint, fontSize: 10 }}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 6,
            }}
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: selected ? (opt.color || colors.gold) + '22' : 'transparent',
                    marginBottom: 2,
                  }}
                >
                  <Text
                    style={{
                      color: opt.color || colors.text,
                      fontSize: 14,
                      fontWeight: selected ? '800' : '600',
                    }}
                  >
                    {selected ? '✓ ' : ''}
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// -------- Native date input (web only) overlaying a calendar icon --------
const WebDateIcon: React.FC<{
  value: string;
  onChange: (v: string) => void;
  type: 'date' | 'month' | 'year';
  tint: string;
}> = ({ value, onChange, type, tint }) => {
  const inputRef = React.useRef<any>(null);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ color: tint, fontSize: 18 }}>📅</Text>
      </View>
    );
  }
  const inputType = type === 'month' ? 'month' : type === 'year' ? 'number' : 'date';
  const openPicker = (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      /* fallback */
    }
    el.focus();
    el.click();
  };
  const btnStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    color: tint,
    fontSize: 18,
    userSelect: 'none',
    minWidth: 44,
    border: 0,
    background: 'transparent',
    outline: 'none',
  };
  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    border: 0,
    padding: 0,
    margin: 0,
    background: 'transparent',
  };
  return (
    // @ts-ignore - web-only native button + hidden input
    <button type="button" onClick={openPicker} style={btnStyle} title="Kalendardan tanlang">
      <span style={{ pointerEvents: 'none' }}>📅</span>
      {/* @ts-ignore - web-only native input element */}
      <input
        ref={inputRef}
        type={inputType}
        value={value}
        min={type === 'year' ? 2020 : undefined}
        max={type === 'year' ? 2100 : undefined}
        onChange={(e: any) => onChange(e.target.value)}
        onClick={(e: any) => e.stopPropagation()}
        style={inputStyle}
      />
    </button>
  );
};

// -------- DateFilter: text input + calendar icon --------
const DateFilter: React.FC<{
  value: string;
  onChange: (v: string) => void;
  type: 'date' | 'month' | 'year';
  colors: Palette;
  placeholder?: string;
}> = ({ value, onChange, type, colors, placeholder }) => {
  const ph = placeholder || (type === 'date' ? 'YYYY-MM-DD' : type === 'month' ? 'YYYY-MM' : 'YYYY');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.input,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 10,
        flex: 1,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={ph}
        placeholderTextColor={colors.faint}
        style={{
          flex: 1,
          color: colors.text,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        }}
        keyboardType={type === 'year' ? 'number-pad' : 'default'}
      />
      <View
        style={{
          borderLeftWidth: 1,
          borderLeftColor: colors.cardBorder,
        }}
      >
        <WebDateIcon value={value} onChange={onChange} type={type} tint={colors.gold} />
      </View>
    </View>
  );
};

type Rec = Record<string, unknown>;
type SubTab = 'oylik' | 'ishkunlari' | 'davomat' | 'hisobot';

type RouteParams = { tab?: SubTab; single?: boolean };

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const EN_MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const currentYm = (): string => todayIso().slice(0, 7);
const ymLabel = (ym: string): string => {
  const [y, m] = ym.split('-');
  return `${EN_MONTHS[Number(m)] || m} ${y}`;
};

const parseWorkDays = (s: unknown): number[] => {
  const raw = typeof s === 'string' ? s : '1,2,3,4,5,6';
  return raw.split(',').map((x) => Number(x)).filter((x) => x >= 1 && x <= 7);
};

const getWorkingDays = (ym: string, settings: Rec | null): string[] => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return [];
  const dim = new Date(y, m, 0).getDate();
  const wd = parseWorkDays(settings?.work_days);
  const hols: Rec[] = Array.isArray(settings?.holidays) ? (settings?.holidays as Rec[]) : [];
  const holSet = new Set(hols.map((h) => str(h, 'date')));
  const out: string[] = [];
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, m - 1, d);
    const w = dt.getDay() === 0 ? 7 : dt.getDay();
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (wd.includes(w) && !holSet.has(iso)) out.push(iso);
  }
  return out;
};

const isWorkdayIso = (iso: string, settings: Rec | null): boolean => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  const w = dt.getDay() === 0 ? 7 : dt.getDay();
  const wd = parseWorkDays(settings?.work_days);
  const hols: Rec[] = Array.isArray(settings?.holidays) ? (settings?.holidays as Rec[]) : [];
  const holSet = new Set(hols.map((h) => str(h, 'date')));
  return wd.includes(w) && !holSet.has(iso);
};

const payStatusLabel = (s: string): string => {
  switch (s) {
    case 'tolandi':
      return "To'landi";
    case 'tayyorlandi':
      return 'Tayyorlandi';
    default:
      return 'Jarayonda';
  }
};

const PAY_STATUS_OPTIONS = (gold: string, green: string, muted: string): SelectOption[] => [
  { value: '', label: 'Belgilanmagan', color: muted },
  { value: 'jarayonda', label: 'Jarayonda', color: muted },
  { value: 'tayyorlandi', label: 'Tayyorlandi', color: gold },
  { value: 'tolandi', label: "To'landi", color: green },
];

const ATTENDANCE_STATUS_OPTIONS = (
  green: string,
  gold: string,
  red: string,
  muted: string,
): SelectOption[] => [
  { value: '', label: 'Belgilanmagan', color: muted },
  { value: 'kelgan', label: 'Keldi', color: green },
  { value: 'kechikkan', label: 'Kechikdi', color: gold },
  { value: 'kelmadi', label: 'Kelmadi', color: red },
];

const REPORT_MODE_OPTIONS: SelectOption[] = [
  { value: 'kunlik', label: 'Kun bo‘yicha' },
  { value: 'oylik', label: 'Oy bo‘yicha' },
  { value: 'yillik', label: 'Yil bo‘yicha' },
];

const empIdOf = (rec: Rec): string => {
  const direct = rec.employee_id;
  if (direct !== undefined && direct !== null && direct !== '') return String(direct);
  const emp = rec.employee as Rec | undefined;
  if (emp && emp.id != null) return String(emp.id);
  return '';
};

export const PayrollScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const initialTab: SubTab = (route.params?.tab as SubTab) || 'oylik';
  const singleMode = Boolean(route.params?.single);

  const [subTab, setSubTab] = useState<SubTab>(initialTab);

  // Boshqa sahifadan (masalan, Ishlab chiqarish → Davomat card) tab paramini kelganda sinxronlash
  useEffect(() => {
    const t = route.params?.tab as SubTab | undefined;
    if (t && t !== subTab) setSubTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.tab]);

  // Headerdagi sarlavhani tanlangan tab bilan sinxronlash
  useEffect(() => {
    const tabTitle =
      subTab === 'oylik'
        ? 'Oylik maosh'
        : subTab === 'ishkunlari'
        ? 'Ish kunlari'
        : subTab === 'davomat'
        ? 'Davomat'
        : 'Hisobot';
    navigation.setOptions?.({ title: singleMode ? tabTitle : 'Ish haqi' });
  }, [subTab, navigation, singleMode]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState<Rec[]>([]);
  const [settings, setSettings] = useState<Rec | null>(null);
  const [company, setCompany] = useState<Rec | null>(null);
  const [bonuses, setBonuses] = useState<Rec[]>([]);

  // Per-month attendance cache
  const [recCache, setRecCache] = useState<Record<string, Rec[]>>({});
  // Per-month salary payments cache
  const [payCache, setPayCache] = useState<Record<string, Rec[]>>({});

  // Oylik tab
  const [oylikMonth, setOylikMonth] = useState(currentYm());
  const [payBusyKey, setPayBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Davomat tab
  const [davomatDate, setDavomatDate] = useState(todayIso());
  const [markBusyKey, setMarkBusyKey] = useState<string | null>(null);

  // Hisobot tab
  const [hisobotMode, setHisobotMode] = useState<'kunlik' | 'oylik' | 'yillik'>('oylik');
  const [hisobotDate, setHisobotDate] = useState(todayIso());
  const [hisobotMonth, setHisobotMonth] = useState(currentYm());
  const [hisobotYear, setHisobotYear] = useState(String(new Date().getFullYear()));

  // Ish kunlari tab
  const [calMonth, setCalMonth] = useState(currentYm());
  const [sForm, setSForm] = useState({ workStart: '08:00', workEnd: '18:00', grace: '15', radius: '25' });
  const [workDaysMask, setWorkDaysMask] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [office, setOffice] = useState({ lat: '', lng: '' });
  const [saveBusy, setSaveBusy] = useState(false);
  const [officeBusy, setOfficeBusy] = useState(false);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const today = todayIso();

  // Davomat 10:00 blokirovkasi — bugun soat 10:00 dan oʻtsa yoki oʻtgan kunlar — qoʻlda oʻzgartirib boʻlmaydi.
  const ATT_LOCK_HOUR = 10; // har kuni 10:00 da avtomatik bloklanadi
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30 * 1000); // 30 soniyada bir qayta tekshirish
    return () => clearInterval(id);
  }, []);
  const isAttendanceLocked = useMemo(() => {
    if (davomatDate < today) return true;
    if (davomatDate === today) {
      const now = new Date(nowTick);
      if (now.getHours() >= ATT_LOCK_HOUR) return true;
    }
    return false;
  }, [davomatDate, today, nowTick]);
  const attLockMsg = useMemo(() => {
    if (davomatDate < today) return "O'tgan kunlar davomati bloklangan — qo'lda o'zgartirib bo'lmaydi.";
    if (isAttendanceLocked) return `🔒 Soat ${String(ATT_LOCK_HOUR).padStart(2, '0')}:00 dan oʻtdi — bugungi davomat avtomatik bloklandi.`;
    const now = new Date(nowTick);
    const remMin = (ATT_LOCK_HOUR - now.getHours()) * 60 - now.getMinutes();
    return `⏳ Soat ${String(ATT_LOCK_HOUR).padStart(2, '0')}:00 gacha davomatni belgilash mumkin${remMin > 0 ? ` · ${Math.floor(remMin / 60)}s ${remMin % 60}d qoldi` : ''}.`;
  }, [davomatDate, today, isAttendanceLocked, nowTick]);

  const fetchMonth = useCallback(async (ym: string): Promise<Rec[]> => {
    const key = `m:${ym}`;
    if (recCache[key]) return recCache[key];
    try {
      const r = await api.attendance.list({ month: ym });
      setRecCache((prev) => (prev[key] ? prev : { ...prev, [key]: r }));
      return r;
    } catch {
      return [];
    }
  }, [recCache]);

  const fetchYear = useCallback(async (y: string): Promise<Rec[]> => {
    const key = `y:${y}`;
    if (recCache[key]) return recCache[key];
    try {
      const r = await api.attendance.list({ year: y });
      setRecCache((prev) => (prev[key] ? prev : { ...prev, [key]: r }));
      return r;
    } catch {
      return [];
    }
  }, [recCache]);

  const fetchPay = useCallback(async (ym: string) => {
    try {
      const r = await api.salaryPayments.list(ym);
      setPayCache((prev) => ({ ...prev, [ym]: r }));
    } catch {
      /* ignore */
    }
  }, []);

  const loadBase = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [emps, st, co, bn] = await Promise.all([
        api.employees.list(),
        api.attendanceSettings.get().catch(() => null),
        api.company.get().catch(() => null),
        api.bonuses.list().catch(() => [] as Rec[]),
      ]);
      setEmployees(emps);
      setSettings(st);
      setCompany(co);
      setBonuses(bn);
      if (st) {
        setSForm({
          workStart: String(st.work_start_time || '08:00:00').slice(0, 5),
          workEnd: String(st.work_end_time || '18:00:00').slice(0, 5),
          grace: String(num(st.grace_minutes) || 15),
          radius: String(num(st.radius_m) || 25),
        });
        setWorkDaysMask(new Set(parseWorkDays(st.work_days)));
        const hols: Rec[] = Array.isArray(st.holidays) ? (st.holidays as Rec[]) : [];
        setHolidays(hols.map((h) => ({ date: str(h, 'date'), name: str(h, 'name') })));
      }
      if (co && co.lat != null && co.lng != null) {
        setOffice({ lat: String(co.lat), lng: String(co.lng) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    fetchMonth(oylikMonth);
    fetchPay(oylikMonth);
  }, [oylikMonth, fetchMonth, fetchPay]);

  useEffect(() => {
    fetchMonth(davomatDate.slice(0, 7));
  }, [davomatDate, fetchMonth]);

  useEffect(() => {
    if (hisobotMode === 'kunlik') fetchMonth(hisobotDate.slice(0, 7));
    else if (hisobotMode === 'oylik') fetchMonth(hisobotMonth);
    else fetchYear(hisobotYear);
  }, [hisobotMode, hisobotDate, hisobotMonth, hisobotYear, fetchMonth, fetchYear]);

  useEffect(() => {
    fetchMonth(calMonth);
  }, [calMonth, fetchMonth]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => str(e, 'status') !== 'nofaol'),
    [employees],
  );

  const payMap = useMemo(() => {
    const map = new Map<string, Rec>();
    (payCache[oylikMonth] || []).forEach((p) => {
      const eid = empIdOf(p);
      if (eid) map.set(eid, p);
    });
    return map;
  }, [payCache, oylikMonth]);

  const oylikData = useMemo(() => {
    const working = getWorkingDays(oylikMonth, settings);
    const elapsed = working.filter((d) => d <= today);
    const arr = recCache[`m:${oylikMonth}`] || [];
    const rows = activeEmployees.map((emp) => {
      const eid = String(emp.id);
      const recs = arr.filter((r) => empIdOf(r) === eid);
      const kelgan = recs.filter((r) => str(r, 'status') === 'kelgan').length;
      const kechikkan = recs.filter((r) => str(r, 'status') === 'kechikkan').length;
      const attended = kelgan + kechikkan;
      const kelmagan = Math.max(0, elapsed.length - attended);
      const salary = num(emp.salary);
      const daily = working.length > 0 ? salary / working.length : 0;
      const attEarned = Math.round(daily * attended);
      const bonus = bonuses
        .filter((b) => empIdOf(b) === eid && str(b, 'date').startsWith(oylikMonth) && str(b, 'status') === 'tasdiqlangan')
        .reduce((sum, b) => sum + num(b.amount), 0);
      const earned = attEarned + bonus;
      const deduction = salary > 0 ? attEarned - salary : null;
      return { emp, kelgan, kechikkan, kelmagan, daily: Math.round(daily), bonus, earned, deduction };
    });
    return {
      rows,
      workingDays: working.length,
      totalEarned: rows.reduce((sum, r) => sum + r.earned, 0),
      totalDeduction: rows.reduce((sum, r) => sum + (r.deduction ?? 0), 0),
    };
  }, [oylikMonth, settings, today, recCache, activeEmployees, bonuses]);

  const dayStats = useMemo(() => {
    const arr = recCache[`m:${davomatDate.slice(0, 7)}`] || [];
    const dayRecs = arr.filter((r) => str(r, 'date') === davomatDate);
    const keldi = dayRecs.filter((r) => str(r, 'status') === 'kelgan').length;
    const kechikdi = dayRecs.filter((r) => str(r, 'status') === 'kechikkan').length;
    const workday = isWorkdayIso(davomatDate, settings);
    const past = davomatDate < today;
    const expected = workday && past ? activeEmployees.length : 0;
    const attended = keldi + kechikdi;
    const kelmadi = Math.max(0, expected - attended);
    return { keldi, kechikdi, kelmadi };
  }, [recCache, davomatDate, activeEmployees, settings, today]);

  const davomatRows = useMemo(() => {
    const arr = recCache[`m:${davomatDate.slice(0, 7)}`] || [];
    const workday = isWorkdayIso(davomatDate, settings);
    const past = davomatDate < today;
    return activeEmployees.map((emp) => {
      const eid = String(emp.id);
      const rec = arr.find((r) => empIdOf(r) === eid && str(r, 'date') === davomatDate) || null;
      let status: 'kelgan' | 'kechikkan' | 'kelmadi' | 'belgilanmagan' | 'damolish';
      if (rec) status = str(rec, 'status') as any;
      else if (!workday) status = 'damolish';
      else if (past) status = 'kelmadi';
      else status = 'belgilanmagan';
      return { emp, rec, status };
    });
  }, [recCache, davomatDate, activeEmployees, settings, today]);

  const hisobotData = useMemo(() => {
    if (hisobotMode === 'kunlik') {
      const arr = recCache[`m:${hisobotDate.slice(0, 7)}`] || [];
      const workday = isWorkdayIso(hisobotDate, settings);
      const past = hisobotDate < today;
      const rows = activeEmployees.map((emp) => {
        const eid = String(emp.id);
        const rec = arr.find((r) => empIdOf(r) === eid && str(r, 'date') === hisobotDate) || null;
        const recStatus = rec ? str(rec, 'status') : '';
        const kelgan = recStatus === 'kelgan' ? 1 : 0;
        const kechikkan = recStatus === 'kechikkan' ? 1 : 0;
        const kelmagan = !rec && workday && past ? 1 : 0;
        const attended = kelgan + kechikkan;
        const salary = num(emp.salary);
        const working = getWorkingDays(hisobotDate.slice(0, 7), settings);
        const daily = working.length > 0 ? salary / working.length : 0;
        return {
          emp,
          kelgan,
          kechikkan,
          kelmagan,
          attended,
          workDays: 1,
          earned: Math.round(daily * attended),
        };
      });
      return { rows, workDays: 1, ym: hisobotDate };
    }
    if (hisobotMode === 'oylik') {
      const working = getWorkingDays(hisobotMonth, settings);
      const elapsed = working.filter((d) => d <= today);
      const arr = recCache[`m:${hisobotMonth}`] || [];
      const rows = activeEmployees.map((emp) => {
        const eid = String(emp.id);
        const recs = arr.filter((r) => empIdOf(r) === eid);
        const kelgan = recs.filter((r) => str(r, 'status') === 'kelgan').length;
        const kechikkan = recs.filter((r) => str(r, 'status') === 'kechikkan').length;
        const attended = kelgan + kechikkan;
        const kelmagan = Math.max(0, elapsed.length - attended);
        const salary = num(emp.salary);
        const daily = working.length > 0 ? salary / working.length : 0;
        return { emp, kelgan, kechikkan, kelmagan, attended, workDays: working.length, earned: Math.round(daily * attended) };
      });
      return { rows, workDays: working.length, ym: hisobotMonth };
    }
    const y = Number(hisobotYear) || new Date().getFullYear();
    const arr = recCache[`y:${hisobotYear}`] || [];
    let workTotal = 0;
    const rows = activeEmployees.map((emp) => {
      const eid = String(emp.id);
      let kelgan = 0;
      let kechikkan = 0;
      let workDays = 0;
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        const working = getWorkingDays(ym, settings);
        const elapsed = working.filter((d) => d <= today);
        workDays += elapsed.length;
        kelgan += arr.filter((r) => empIdOf(r) === eid && str(r, 'date').startsWith(ym) && str(r, 'status') === 'kelgan').length;
        kechikkan += arr.filter((r) => empIdOf(r) === eid && str(r, 'date').startsWith(ym) && str(r, 'status') === 'kechikkan').length;
      }
      const attended = kelgan + kechikkan;
      workTotal = Math.max(workTotal, workDays);
      const salary = num(emp.salary);
      const daily = workDays > 0 ? (salary * 12) / workDays : 0;
      return { emp, kelgan, kechikkan, kelmagan: Math.max(0, workDays - attended), attended, workDays, earned: Math.round(daily * attended) };
    });
    return { rows, workDays: workTotal, ym: hisobotYear };
  }, [hisobotMode, hisobotDate, hisobotMonth, hisobotYear, settings, today, recCache, activeEmployees]);

  const handlePayMark = async (empId: string, amount: number, st: 'tolandi' | 'tayyorlandi' | 'jarayonda') => {
    setPayBusyKey(`${empId}:${st}`);
    try {
      const existing = payMap.get(empId);
      const saved = existing
        ? await api.salaryPayments.update(String(existing.id), { amount: Math.round(amount), status: st })
        : await api.salaryPayments.create({ employee_id: Number(empId), month: oylikMonth, amount: Math.round(amount), status: st });
      setPayCache((prev) => {
        const arr = (prev[oylikMonth] || []).filter((p) => String(p.id) !== String(saved.id) && empIdOf(p) !== empId);
        return { ...prev, [oylikMonth]: [saved, ...arr] };
      });
      showMsg('ok', st === 'tolandi' ? "To'lov tasdiqlandi." : "Holat yangilandi.");
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setPayBusyKey(null);
    }
  };

  const handleMark = async (empId: string, st: 'kelgan' | 'kechikkan' | 'kelmadi') => {
    if (davomatDate > today) {
      showMsg('err', 'Kelgusi sanani belgilash mumkin emas.');
      return;
    }
    if (isAttendanceLocked) {
      showMsg(
        'err',
        davomatDate < today
          ? "O'tgan kunlar davomati bloklangan — qo'lda o'zgartirib bo'lmaydi."
          : "Soat 10:00 dan o'tdi — bugungi davomat avtomatik bloklandi.",
      );
      return;
    }
    setMarkBusyKey(`${empId}:${st}`);
    try {
      const res = await api.attendance.mark({ employee_id: Number(empId), date: davomatDate, status: st });
      const key = `m:${davomatDate.slice(0, 7)}`;
      setRecCache((prev) => {
        const arr = prev[key] || [];
        if ((res as unknown as { deleted?: boolean }).deleted) {
          return { ...prev, [key]: arr.filter((r) => !(empIdOf(r) === empId && str(r, 'date') === davomatDate)) };
        }
        const rec = res as Rec;
        return { ...prev, [key]: [rec, ...arr.filter((r) => String(r.id) !== String(rec.id) && !(empIdOf(r) === empId && str(r, 'date') === davomatDate))] };
      });
      showMsg('ok', st === 'kelmadi' ? "'Kelmadi' belgilandi." : 'Davomat yangilandi.');
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setMarkBusyKey(null);
    }
  };

  const toggleWorkDay = (d: number) => {
    setWorkDaysMask((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleSaveSettings = async () => {
    const workDays = [...workDaysMask].sort().join(',');
    if (!workDays) {
      showMsg('err', 'Ish kunlari tanlanmagan.');
      return;
    }
    setSaveBusy(true);
    try {
      const saved = await api.attendanceSettings.update({
        work_start_time: sForm.workStart + ':00',
        work_end_time: sForm.workEnd + ':00',
        grace_minutes: Number(sForm.grace) || 0,
        radius_m: Number(sForm.radius) || 25,
        work_days: workDays,
        holidays,
      });
      setSettings(saved);
      showMsg('ok', 'Sozlamalar saqlandi.');
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleSaveOffice = async () => {
    const lat = Number(String(office.lat).replace(',', '.'));
    const lng = Number(String(office.lng).replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lng)) {
      showMsg('err', "Koordinatalar noto'g'ri.");
      return;
    }
    setOfficeBusy(true);
    try {
      if (company?.id) {
        const updated = await api.company.update(String(company.id), { lat, lng });
        setCompany(updated);
      } else {
        const created = await api.company.create({ lat, lng });
        setCompany(created);
      }
      showMsg('ok', "Ofis joylashuvi saqlandi.");
    } catch (e) {
      showMsg('err', e instanceof Error ? e.message : 'Xatolik.');
    } finally {
      setOfficeBusy(false);
    }
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date) return;
    if (holidays.some((h) => h.date === newHoliday.date)) return;
    setHolidays((prev) => [...prev, { ...newHoliday }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHoliday({ date: '', name: '' });
  };

  const handleExportExcel = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Eslatma', 'Excel yuklab olish web versiyasida ishlaydi.');
      return;
    }
    const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    let header: string[] = [];
    let rows: string[][] = [];
    let fname = 'export';
    if (subTab === 'oylik') {
      header = ['№', 'Oy', 'Xodim', 'Oylik', 'Kunlik', 'Kelgan', 'Kechikkan', 'Kelmagan', 'Bonus', 'Ushlanma', 'Hisoblangan', "To'lov"];
      rows = oylikData.rows.map((r, i) => [
        String(i + 1), oylikMonth, str(r.emp, 'full_name'),
        String(num(r.emp.salary)), String(r.daily),
        String(r.kelgan), String(r.kechikkan), String(r.kelmagan),
        String(r.bonus), r.deduction == null ? '—' : String(r.deduction),
        String(r.earned),
        payMap.get(String(r.emp.id)) ? payStatusLabel(str(payMap.get(String(r.emp.id))!, 'status')) : 'belgilanmagan',
      ]);
      fname = `Oylik_maosh_${oylikMonth}`;
    } else if (subTab === 'davomat') {
      header = ['№', 'Sana', 'Xodim', 'Lavozim', 'Holat', 'Kirish'];
      rows = davomatRows.map((r, i) => [
        String(i + 1), davomatDate, str(r.emp, 'full_name'), str(r.emp, 'position'),
        r.status, str(r.rec || {}, 'check_in').slice(0, 5) || '—',
      ]);
      fname = `Davomat_${davomatDate}`;
    } else if (subTab === 'hisobot') {
      header = ['№', 'Davr', 'Xodim', 'Ish kuni', 'Kelgan', 'Kechikkan', 'Kelmagan', 'Qatnashish %', 'Maosh'];
      rows = hisobotData.rows.map((r, i) => [
        String(i + 1), hisobotData.ym, str(r.emp, 'full_name'),
        String(r.workDays), String(r.kelgan), String(r.kechikkan), String(r.kelmagan),
        String(r.workDays > 0 ? Math.round(((r.kelgan + r.kechikkan) / r.workDays) * 100) : 0),
        String(r.earned),
      ]);
      fname = `Hisobot_${hisobotData.ym}`;
    } else {
      header = ['№', 'Sana', 'Sabab'];
      rows = holidays.map((h, i) => [String(i + 1), h.date, h.name || 'Dam olish']);
      fname = 'Dam_olish_kunlari';
    }
    const bom = '﻿';
    const csv = bom + [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fname}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ------- Calendar cells -------
  const calCells = useMemo(() => {
    const [y, m] = calMonth.split('-').map(Number);
    if (!y || !m) return [] as (string | null)[];
    const dim = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const cells: (string | null)[] = [...Array(offset).fill(null)];
    for (let d = 1; d <= dim; d++) {
      cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [calMonth]);
  const calMonthRecords = recCache[`m:${calMonth}`] || [];

  if (loading) return <Loader />;

  // Davomat tab Ish haqi sahifasidan olib tashlandi — faqat 🏭 Ishlab chiqarish → 📋 Davomat card orqali ochiladi.
  const TABS: { key: SubTab; icon: string; label: string }[] = [
    { key: 'oylik', icon: '💵', label: 'Oylik maosh' },
    { key: 'ishkunlari', icon: '⚙️', label: 'Ish kunlari' },
    { key: 'hisobot', icon: '📊', label: 'Hisobot' },
  ];

  const statusTint = (st: string): string => {
    if (st === 'kelgan') return colors.green;
    if (st === 'kechikkan') return colors.gold;
    if (st === 'kelmadi') return colors.red;
    return colors.muted;
  };
  const statusText = (st: string): string => {
    if (st === 'kelgan') return 'Keldi';
    if (st === 'kechikkan') return 'Kechikdi';
    if (st === 'kelmadi') return 'Kelmadi';
    if (st === 'damolish') return 'Dam olish';
    return 'Belgilanmagan';
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBase(true)}
            tintColor={colors.gold}
          />
        }
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>
              {singleMode
                ? subTab === 'oylik'
                  ? 'Oylik maosh'
                  : subTab === 'ishkunlari'
                  ? 'Ish kunlari'
                  : subTab === 'davomat'
                  ? 'Davomat'
                  : 'Hisobot'
                : 'Oylik maosh'}
            </Text>
            <Muted>
              {singleMode && subTab === 'davomat'
                ? 'Kunlik davomat nazorati — soat 10:00 dan keyin avtomatik bloklanadi'
                : singleMode && subTab === 'ishkunlari'
                ? 'Kalendar, ofis joylashuvi, ish vaqti va bayramlar'
                : singleMode && subTab === 'hisobot'
                ? 'Kun / oy / yil kesimidagi hisobotlar'
                : 'Xodimlar davomati va ish haqi (mobil ilovadan avtomatik keladi)'}
            </Muted>
          </View>
          <TouchableOpacity style={s.excelBtn} onPress={handleExportExcel}>
            <Text style={s.excelBtnText}>Excel</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Tabs — faqat umumiy rejimda ko'rinadi, singleMode da yashirinadi */}
        {!singleMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabsRow}
          >
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setSubTab(t.key)}
                style={[
                  s.tabBtn,
                  subTab === t.key && { backgroundColor: '#F97316', borderColor: '#F97316' },
                ]}
              >
                <Text style={[s.tabBtnText, subTab === t.key && { color: '#fff' }]}>
                  {t.icon} {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {msg && (
          <View
            style={[
              s.msg,
              msg.type === 'ok'
                ? { borderColor: colors.green + '55', backgroundColor: colors.green + '18' }
                : { borderColor: colors.red + '55', backgroundColor: colors.red + '18' },
            ]}
          >
            <Text style={[s.msgText, { color: msg.type === 'ok' ? colors.green : colors.red }]}>
              {msg.text}
            </Text>
          </View>
        )}

        {/* OYLIK TAB */}
        {subTab === 'oylik' && (
          <View style={{ gap: 10 }}>
            <View style={s.monthRow}>
              <DateFilter value={oylikMonth} onChange={setOylikMonth} type="month" colors={colors} />
              <TouchableOpacity style={s.chip} onPress={() => setOylikMonth(currentYm())}>
                <Text style={s.chipText}>Hozirgi oy</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.monthLabel}>{ymLabel(oylikMonth)}</Text>

            <View style={s.kpi3}>
              <View style={[s.kpiBox, { backgroundColor: colors.gold + '18' }]}>
                <Text style={[s.kpiVal, { color: colors.gold }]}>{fmtMoney(oylikData.totalEarned)}</Text>
                <Text style={s.kpiLbl}>Jami ish haqi</Text>
              </View>
              <View style={[s.kpiBox, { backgroundColor: colors.blue + '18' }]}>
                <Text style={[s.kpiVal, { color: colors.blue }]}>{oylikData.workingDays} kun</Text>
                <Text style={s.kpiLbl}>Ish kunlari</Text>
              </View>
              <View style={[s.kpiBox, { backgroundColor: colors.red + '18' }]}>
                <Text style={[s.kpiVal, { color: colors.red }]}>{fmtMoney(oylikData.totalDeduction)}</Text>
                <Text style={s.kpiLbl}>Jami ushlanma</Text>
              </View>
            </View>

            {oylikData.rows.length === 0 ? (
              <Muted>Faol xodimlar yoʻq.</Muted>
            ) : (
              oylikData.rows.map((r) => {
                const empId = String(r.emp.id);
                const pay = payMap.get(empId);
                const payStatus = pay ? str(pay, 'status') : '';
                return (
                  <View key={empId} style={s.rowCard}>
                    <View style={s.rowHead}>
                      <Text style={s.rowName}>{str(r.emp, 'full_name')}</Text>
                      <Text style={s.rowEarned}>{fmtMoney(r.earned)}</Text>
                    </View>
                    <Text style={s.rowSub}>
                      Oylik: {fmtMoney(num(r.emp.salary))} · Kunlik: {fmtMoney(r.daily)}
                    </Text>
                    <View style={s.statGrid}>
                      <StatPill label="Kelgan" value={r.kelgan} color={colors.green} />
                      <StatPill label="Kechikkan" value={r.kechikkan} color={colors.gold} />
                      <StatPill label="Kelmagan" value={r.kelmagan} color={colors.red} />
                      <StatPill label="Bonus" value={fmtMoney(r.bonus)} color={colors.blue} />
                    </View>
                    {r.deduction != null && (
                      <Text style={[s.rowSub, { color: r.deduction < 0 ? colors.red : colors.green }]}>
                        Ushlanma: {fmtMoney(r.deduction)}
                      </Text>
                    )}
                    <View style={{ marginTop: 4 }}>
                      <Text style={s.lbl}>To'lov holati</Text>
                      <Select
                        value={payStatus}
                        options={PAY_STATUS_OPTIONS(colors.gold, colors.green, colors.muted)}
                        onChange={(v) => {
                          if (!v) return;
                          handlePayMark(empId, r.earned, v as 'jarayonda' | 'tayyorlandi' | 'tolandi');
                        }}
                        placeholder="Belgilanmagan"
                        colors={colors}
                        disabled={payBusyKey !== null}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* DAVOMAT TAB */}
        {subTab === 'davomat' && (
          <View style={{ gap: 10 }}>
            <View style={s.monthRow}>
              <DateFilter value={davomatDate} onChange={setDavomatDate} type="date" colors={colors} />
              <TouchableOpacity style={s.chip} onPress={() => setDavomatDate(today)}>
                <Text style={s.chipText}>Bugun</Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                s.lockBanner,
                isAttendanceLocked
                  ? { backgroundColor: colors.red + '18', borderColor: colors.red + '55' }
                  : { backgroundColor: colors.green + '18', borderColor: colors.green + '55' },
              ]}
            >
              <Text
                style={[
                  s.lockBannerText,
                  { color: isAttendanceLocked ? colors.red : colors.green },
                ]}
              >
                {attLockMsg}
              </Text>
            </View>
            <View style={s.kpi3}>
              <View style={[s.kpiBox, { backgroundColor: colors.green + '18' }]}>
                <Text style={[s.kpiVal, { color: colors.green }]}>{dayStats.keldi}</Text>
                <Text style={s.kpiLbl}>Keldi</Text>
              </View>
              <View style={[s.kpiBox, { backgroundColor: colors.gold + '18' }]}>
                <Text style={[s.kpiVal, { color: colors.gold }]}>{dayStats.kechikdi}</Text>
                <Text style={s.kpiLbl}>Kechikdi</Text>
              </View>
              <View style={[s.kpiBox, { backgroundColor: colors.red + '18' }]}>
                <Text style={[s.kpiVal, { color: colors.red }]}>{dayStats.kelmadi}</Text>
                <Text style={s.kpiLbl}>Kelmadi</Text>
              </View>
            </View>
            {davomatRows.length === 0 ? (
              <Muted>Faol xodimlar yoʻq.</Muted>
            ) : (
              davomatRows.map((r) => {
                const recStatus = str(r.rec || {}, 'status');
                return (
                  <View key={String(r.emp.id)} style={s.rowCard}>
                    <View style={s.rowHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowName}>{str(r.emp, 'full_name')}</Text>
                        <Text style={s.rowSub}>{str(r.emp, 'position')}</Text>
                      </View>
                      <Text style={[s.statusText, { color: statusTint(r.status) }]}>
                        {statusText(r.status)}
                      </Text>
                    </View>
                    <Text style={s.lbl}>Davomat holati{isAttendanceLocked ? ' 🔒' : ''}</Text>
                    <Select
                      value={recStatus}
                      options={ATTENDANCE_STATUS_OPTIONS(colors.green, colors.gold, colors.red, colors.muted)}
                      onChange={(v) => {
                        if (!v) return;
                        handleMark(String(r.emp.id), v as 'kelgan' | 'kechikkan' | 'kelmadi');
                      }}
                      placeholder="Belgilanmagan"
                      colors={colors}
                      disabled={markBusyKey !== null || davomatDate > today || isAttendanceLocked}
                    />
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* HISOBOT TAB */}
        {subTab === 'hisobot' && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>Davr turi</Text>
                <Select
                  value={hisobotMode}
                  options={REPORT_MODE_OPTIONS}
                  onChange={(v) => setHisobotMode(v as 'kunlik' | 'oylik' | 'yillik')}
                  colors={colors}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>Sanani tanlang</Text>
                {hisobotMode === 'kunlik' && (
                  <DateFilter value={hisobotDate} onChange={setHisobotDate} type="date" colors={colors} />
                )}
                {hisobotMode === 'oylik' && (
                  <DateFilter value={hisobotMonth} onChange={setHisobotMonth} type="month" colors={colors} />
                )}
                {hisobotMode === 'yillik' && (
                  <DateFilter value={hisobotYear} onChange={setHisobotYear} type="year" colors={colors} />
                )}
              </View>
            </View>
            <View style={s.monthRow}>
              {hisobotMode === 'kunlik' && (
                <TouchableOpacity style={s.chip} onPress={() => setHisobotDate(today)}>
                  <Text style={s.chipText}>Bugun</Text>
                </TouchableOpacity>
              )}
              {hisobotMode === 'oylik' && (
                <TouchableOpacity style={s.chip} onPress={() => setHisobotMonth(currentYm())}>
                  <Text style={s.chipText}>Hozirgi oy</Text>
                </TouchableOpacity>
              )}
              {hisobotMode === 'yillik' && (
                <TouchableOpacity
                  style={s.chip}
                  onPress={() => setHisobotYear(String(new Date().getFullYear()))}
                >
                  <Text style={s.chipText}>Hozirgi yil</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.monthLabel}>
              {hisobotMode === 'kunlik'
                ? hisobotDate
                : hisobotMode === 'oylik'
                ? ymLabel(hisobotMonth)
                : hisobotYear}
              {' · '}Ish kunlari: {hisobotData.workDays}
            </Text>
            {hisobotData.rows.map((r) => {
              const pct = r.workDays > 0 ? Math.round(((r.kelgan + r.kechikkan) / r.workDays) * 100) : 0;
              return (
                <View key={String(r.emp.id)} style={s.rowCard}>
                  <View style={s.rowHead}>
                    <Text style={s.rowName}>{str(r.emp, 'full_name')}</Text>
                    <Text style={s.rowEarned}>{fmtMoney(r.earned)}</Text>
                  </View>
                  <View style={s.statGrid}>
                    <StatPill label="Ish kuni" value={r.workDays} color={colors.blue} />
                    <StatPill label="Kelgan" value={r.kelgan} color={colors.green} />
                    <StatPill label="Kechikkan" value={r.kechikkan} color={colors.gold} />
                    <StatPill label="Kelmagan" value={r.kelmagan} color={colors.red} />
                  </View>
                  <View style={[s.attendBar, { borderColor: pct >= 90 ? colors.green + '55' : colors.red + '55' }]}>
                    <Text style={[s.attendBarText, { color: pct >= 90 ? colors.green : colors.red }]}>
                      Qatnashish: {pct}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ISH KUNLARI TAB */}
        {subTab === 'ishkunlari' && (
          <View style={{ gap: 12 }}>
            <View style={s.rowCard}>
              <Text style={s.sectionTitle}>📅 Kalendar</Text>
              <View style={s.monthRow}>
                <DateFilter value={calMonth} onChange={setCalMonth} type="month" colors={colors} />
                <TouchableOpacity style={s.chip} onPress={() => setCalMonth(currentYm())}>
                  <Text style={s.chipText}>Hozirgi oy</Text>
                </TouchableOpacity>
              </View>
              <View style={s.weekHeader}>
                {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d) => (
                  <Text key={d} style={s.weekHeaderText}>{d}</Text>
                ))}
              </View>
              <View style={s.calGrid}>
                {calCells.map((iso, i) => {
                  if (!iso) return <View key={i} style={s.calCellEmpty} />;
                  const d = new Date(iso + 'T00:00:00');
                  const isToday = iso === today;
                  const isHol = holidays.some((h) => h.date === iso);
                  const isSun = d.getDay() === 0;
                  const cnt = calMonthRecords.filter((r) => str(r, 'date') === iso).length;
                  const dnum = Number(iso.slice(8, 10));
                  return (
                    <View
                      key={i}
                      style={[
                        s.calCell,
                        isToday && { backgroundColor: '#F97316', borderColor: '#F97316' },
                        !isToday && (isHol || isSun) && { backgroundColor: colors.red + '22', borderColor: colors.red + '55' },
                      ]}
                    >
                      <Text
                        style={[
                          s.calCellText,
                          isToday && { color: '#fff' },
                          !isToday && (isHol || isSun) && { color: colors.red },
                        ]}
                      >
                        {dnum}
                      </Text>
                      {cnt > 0 && (
                        <Text style={[s.calCellBadge, { color: isToday ? '#fff' : colors.green }]}>{cnt}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={s.rowCard}>
              <Text style={s.sectionTitle}>🏢 Ofis joylashuvi</Text>
              <View style={s.gridInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={s.lbl}>Kenglik (lat)</Text>
                  <TextInput
                    value={office.lat}
                    onChangeText={(v) => setOffice({ ...office, lat: v })}
                    placeholder="41.69908"
                    placeholderTextColor={colors.faint}
                    style={s.input}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lbl}>Uzunlik (lng)</Text>
                  <TextInput
                    value={office.lng}
                    onChangeText={(v) => setOffice({ ...office, lng: v })}
                    placeholder="60.287164"
                    placeholderTextColor={colors.faint}
                    style={s.input}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Text style={s.lbl}>Radius (metr)</Text>
              <TextInput
                value={sForm.radius}
                onChangeText={(v) => setSForm({ ...sForm, radius: v })}
                placeholder="25"
                placeholderTextColor={colors.faint}
                style={s.input}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[s.saveBtn, officeBusy && { opacity: 0.6 }]}
                disabled={officeBusy}
                onPress={handleSaveOffice}
              >
                <Text style={s.saveBtnText}>{officeBusy ? '...' : 'Joylashuvni saqlash'}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.rowCard}>
              <Text style={s.sectionTitle}>⏰ Ish vaqti</Text>
              <View style={s.gridInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={s.lbl}>Boshlanish</Text>
                  <TextInput
                    value={sForm.workStart}
                    onChangeText={(v) => setSForm({ ...sForm, workStart: v })}
                    placeholder="08:00"
                    placeholderTextColor={colors.faint}
                    style={s.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lbl}>Tugash</Text>
                  <TextInput
                    value={sForm.workEnd}
                    onChangeText={(v) => setSForm({ ...sForm, workEnd: v })}
                    placeholder="18:00"
                    placeholderTextColor={colors.faint}
                    style={s.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lbl}>Grace (daq.)</Text>
                  <TextInput
                    value={sForm.grace}
                    onChangeText={(v) => setSForm({ ...sForm, grace: v })}
                    placeholder="15"
                    placeholderTextColor={colors.faint}
                    style={s.input}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={s.rowCard}>
              <Text style={s.sectionTitle}>🗓️ Ish kunlari</Text>
              <View style={s.chipRow}>
                {[
                  { d: 1, l: 'Du' },
                  { d: 2, l: 'Se' },
                  { d: 3, l: 'Ch' },
                  { d: 4, l: 'Pa' },
                  { d: 5, l: 'Ju' },
                  { d: 6, l: 'Sh' },
                  { d: 7, l: 'Ya' },
                ].map((x) => {
                  const on = workDaysMask.has(x.d);
                  return (
                    <TouchableOpacity
                      key={x.d}
                      style={[s.chip, on && { backgroundColor: colors.gold, borderColor: colors.gold }]}
                      onPress={() => toggleWorkDay(x.d)}
                    >
                      <Text style={[s.chipText, on && { color: '#000' }]}>{x.l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.rowCard}>
              <Text style={s.sectionTitle}>🎉 Bayram / Dam olish kunlari</Text>

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={s.lbl}>Sana *</Text>
                  <DateFilter
                    value={newHoliday.date}
                    onChange={(v) => setNewHoliday({ ...newHoliday, date: v })}
                    type="date"
                    colors={colors}
                  />
                </View>
                <View>
                  <Text style={s.lbl}>Sabab</Text>
                  <TextInput
                    value={newHoliday.name}
                    onChangeText={(v) => setNewHoliday({ ...newHoliday, name: v })}
                    placeholder="Masalan: Mustaqillik kuni"
                    placeholderTextColor={colors.faint}
                    style={s.inputLg}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    s.holidayAddBtn,
                    !newHoliday.date && { opacity: 0.5 },
                  ]}
                  disabled={!newHoliday.date}
                  onPress={handleAddHoliday}
                >
                  <Text style={s.holidayAddBtnText}>+ Dam olish kuni qoʻshish</Text>
                </TouchableOpacity>
              </View>

              <View style={s.holidayDivider}>
                <Text style={s.holidayListTitle}>
                  Qoʻshilgan dam olish kunlari{' '}
                  <Text style={{ color: colors.gold }}>({holidays.length})</Text>
                </Text>
              </View>

              {holidays.length === 0 ? (
                <View style={s.holidayEmpty}>
                  <Text style={s.holidayEmptyText}>
                    Hali bayram / dam olish kuni qoʻshilmagan.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {holidays.map((h, idx) => (
                    <View key={h.date} style={s.holidayItem}>
                      <View style={s.holidayItemIdx}>
                        <Text style={s.holidayItemIdxText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.holidayItemDate}>{h.date}</Text>
                        <Text style={s.holidayItemName}>
                          {h.name || 'Dam olish kuni'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          setHolidays((prev) => prev.filter((x) => x.date !== h.date))
                        }
                        style={s.holidayItemDel}
                      >
                        <Text style={s.holidayItemDelText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[s.saveBtn, saveBusy && { opacity: 0.6 }]}
              disabled={saveBusy}
              onPress={handleSaveSettings}
            >
              <Text style={s.saveBtnText}>{saveBusy ? '...' : 'Sozlamalarni saqlash'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const StatPill: React.FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ color, fontSize: 13, fontWeight: '800' }}>{value}</Text>
    <Text style={{ color: color + 'bb', fontSize: 10 }}>{label}</Text>
  </View>
);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    title: { color: c.text, fontSize: 22, fontWeight: '900' },
    excelBtn: {
      backgroundColor: c.green,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
    },
    excelBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

    tabsRow: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
    tabBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    tabBtnText: { color: c.muted, fontWeight: '800', fontSize: 12 },

    msg: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },
    msgText: { fontSize: 12, fontWeight: '700' },

    monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    monthInput: {
      flex: 1,
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    monthLabel: {
      color: c.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 6,
      marginTop: 2,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chipText: { color: c.text, fontSize: 12, fontWeight: '700' },

    kpi3: { flexDirection: 'row', gap: 8 },
    kpiBox: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    kpiVal: { fontSize: 14, fontWeight: '900' },
    kpiLbl: { color: c.muted, fontSize: 10, marginTop: 4, fontWeight: '700' },

    rowCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    rowHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowName: { color: c.text, fontSize: 15, fontWeight: '800', flex: 1 },
    rowEarned: { color: c.gold, fontSize: 15, fontWeight: '800' },
    rowSub: { color: c.muted, fontSize: 12 },
    statGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: c.input,
      borderRadius: 10,
      paddingVertical: 8,
    },
    payActions: { flexDirection: 'row', gap: 6 },
    payBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
      alignItems: 'center',
    },
    payBtnText: { color: c.text, fontSize: 11, fontWeight: '800' },

    markRow: { flexDirection: 'row', gap: 6 },
    markBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
      alignItems: 'center',
    },
    markBtnText: { color: c.text, fontSize: 11, fontWeight: '800' },
    statusText: { fontSize: 12, fontWeight: '800' },

    error: {
      color: c.red,
      fontSize: 13,
      marginBottom: 8,
      textAlign: 'center',
    },

    toggleRow: {
      flexDirection: 'row',
      backgroundColor: c.input,
      borderRadius: 10,
      padding: 3,
      alignSelf: 'flex-start',
      gap: 2,
    },
    toggleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
    toggleBtnActive: { backgroundColor: '#F97316' },
    toggleBtnText: { color: c.muted, fontSize: 12, fontWeight: '800' },

    attendBar: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 6,
      alignItems: 'center',
    },
    attendBarText: { fontSize: 12, fontWeight: '800' },

    sectionTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 6,
    },
    weekHeader: {
      flexDirection: 'row',
      marginTop: 8,
      marginBottom: 4,
    },
    weekHeaderText: {
      flex: 1,
      textAlign: 'center',
      color: c.muted,
      fontSize: 10,
      fontWeight: '800',
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calCell: {
      width: '14.2857%',
      aspectRatio: 1,
      padding: 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
    },
    calCellEmpty: { width: '14.2857%', aspectRatio: 1 },
    calCellText: { color: c.text, fontSize: 12, fontWeight: '800' },
    calCellBadge: { fontSize: 9, fontWeight: '800' },

    gridInputs: { flexDirection: 'row', gap: 8 },
    lbl: { color: c.muted, fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
    input: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 10,
      paddingVertical: 9,
      fontSize: 13,
    },

    addBtn: {
      backgroundColor: '#F97316',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

    inputLg: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
    },
    holidayAddBtn: {
      backgroundColor: '#F97316',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    holidayAddBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    holidayDivider: {
      marginTop: 14,
      marginBottom: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    holidayListTitle: {
      color: c.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    holidayEmpty: {
      padding: 14,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.cardBorder,
      alignItems: 'center',
    },
    holidayEmptyText: { color: c.muted, fontSize: 12 },
    holidayItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.red + '12',
      borderWidth: 1,
      borderColor: c.red + '55',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    holidayItemIdx: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: c.red + '22',
      borderWidth: 1,
      borderColor: c.red + '66',
      alignItems: 'center',
      justifyContent: 'center',
    },
    holidayItemIdxText: {
      color: c.red,
      fontSize: 12,
      fontWeight: '900',
    },
    holidayItemDate: {
      color: c.text,
      fontSize: 14,
      fontWeight: '900',
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    holidayItemName: {
      color: c.muted,
      fontSize: 12,
      marginTop: 2,
    },
    holidayItemDel: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.red + '18',
      borderWidth: 1,
      borderColor: c.red + '55',
      alignItems: 'center',
      justifyContent: 'center',
    },
    holidayItemDelText: {
      color: c.red,
      fontSize: 14,
      fontWeight: '900',
    },

    saveBtn: {
      backgroundColor: c.gold,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
    lockBanner: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    lockBannerText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  });
