import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Screen, Card, Btn, Loader } from '../../components';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Period = 'month' | 'year';
type Rec = Record<string, unknown>;

const pad = (n: number): string => String(n).padStart(2, '0');

const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toMonth = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const MONTH_NAMES_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];
const MONTH_SHORT_UZ = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
];
const WEEKDAYS_UZ = ['Du', 'Se', 'Chr', 'Pay', 'Jum', 'Shn', 'Yak'];

type AttCat = 'present' | 'late' | 'absent' | 'none';

const classify = (status: string): AttCat => {
  const t = (status || '').toLowerCase();
  if (
    t.includes('present') ||
    t.includes('keldi') ||
    t.includes('kelgan') ||
    t === 'ok'
  )
    return 'present';
  if (t.includes('late') || t.includes('kech')) return 'late';
  if (
    t.includes('absent') ||
    t.includes('kelmadi') ||
    t.includes("yo'q") ||
    t.includes('yoq')
  )
    return 'absent';
  return 'present';
};

const parseWorkDays = (raw: unknown): Set<number> => {
  const s = String(raw ?? '1,2,3,4,5,6');
  const arr = s
    .split(/[,;\s]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 7);
  return new Set(arr.length ? arr : [1, 2, 3, 4, 5, 6]);
};

const parseHolidays = (raw: unknown): Set<string> => {
  const s = String(raw ?? '');
  const arr = s
    .split(/[,;\s\n]+/)
    .map((x) => x.trim())
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  return new Set(arr);
};

export const StatsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { session } = useAuth();
  const employeeName = session?.name ?? '';

  const now = new Date();
  const today = toLocalDate(now);

  const [period, setPeriod] = useState<Period>('month');
  const [calDate, setCalDate] = useState<{ y: number; m: number }>({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthAtt, setMonthAtt] = useState<Rec[]>([]);
  const [yearAtt, setYearAtt] = useState<Rec[]>([]);
  const [settings, setSettings] = useState<Rec | null>(null);

  const monthKey = `${calDate.y}-${pad(calDate.m + 1)}`;
  const yearKey = String(calDate.y);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [setRes, mAtt, yAtt] = await Promise.all([
        api.attendance.settings(),
        api.attendance.list({ month: monthKey }),
        api.attendance.list({ year: yearKey }),
      ]);
      setSettings(setRes);
      const filt = (list: Rec[]): Rec[] =>
        list.filter((r) => String(r.employee_name ?? '') === employeeName);
      setMonthAtt(filt(mAtt as Rec[]));
      setYearAtt(filt(yAtt as Rec[]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumot yuklanmadi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeName, monthKey, yearKey]);

  useEffect(() => {
    load(false);
  }, [load]);

  const workDays = useMemo(() => parseWorkDays(settings?.work_days), [settings]);
  const holidays = useMemo(() => parseHolidays(settings?.holidays), [settings]);

  const isWorkDay = useCallback(
    (ds: string): boolean => {
      const d = new Date(ds + 'T00:00:00');
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      return workDays.has(iso) && !holidays.has(ds);
    },
    [workDays, holidays],
  );

  // Oylik hisob
  const monthStats = useMemo(() => {
    const y = calDate.y;
    const m = calDate.m;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const attMap = new Map<string, Rec>();
    monthAtt.forEach((r) => attMap.set(String(r.date ?? ''), r));
    let worked = 0;
    let late = 0;
    let absent = 0;
    let total = 0;
    const todayMs = new Date(today + 'T00:00:00').getTime();
    for (let i = 1; i <= daysInMonth; i++) {
      const ds = `${y}-${pad(m + 1)}-${pad(i)}`;
      if (!isWorkDay(ds)) continue;
      total++;
      const dMs = new Date(ds + 'T00:00:00').getTime();
      const rec = attMap.get(ds);
      const c = rec ? classify(String(rec.status ?? '')) : 'none';
      if (c === 'present' || c === 'late') worked++;
      if (c === 'late') late++;
      if (c === 'absent' || (c === 'none' && dMs < todayMs)) absent++;
    }
    return { worked, late, absent, total, daysInMonth };
  }, [monthAtt, calDate.y, calDate.m, isWorkDay, today]);

  // Yillik hisob
  const yearStats = useMemo(() => {
    const y = calDate.y;
    const attByDate = new Map<string, Rec>();
    yearAtt.forEach((r) => attByDate.set(String(r.date ?? ''), r));
    const months: {
      m: number;
      worked: number;
      total: number;
    }[] = [];
    let totalWorked = 0;
    let totalDays = 0;
    const todayMs = new Date(today + 'T00:00:00').getTime();
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      let worked = 0;
      let total = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        const ds = `${y}-${pad(m + 1)}-${pad(i)}`;
        if (!isWorkDay(ds)) continue;
        total++;
        const dMs = new Date(ds + 'T00:00:00').getTime();
        if (dMs > todayMs) continue;
        const rec = attByDate.get(ds);
        const c = rec ? classify(String(rec.status ?? '')) : 'none';
        if (c === 'present' || c === 'late') worked++;
      }
      months.push({ m, worked, total });
      totalWorked += worked;
      totalDays += total;
    }
    return { months, totalWorked, totalDays };
  }, [yearAtt, calDate.y, isWorkDay, today]);

  // Kalendar grid
  const calGrid = useMemo(() => {
    const y = calDate.y;
    const m = calDate.m;
    const attMap = new Map<string, Rec>();
    monthAtt.forEach((r) => attMap.set(String(r.date ?? ''), r));
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const first = new Date(y, m, 1).getDay();
    const offset = (first + 6) % 7;
    const grid: {
      key: string;
      d: number;
      ds: string;
      rec: Rec | null;
      isWork: boolean;
      isHoliday: boolean;
    }[] = [];
    for (let i = 0; i < 42; i++) {
      const day = i - offset + 1;
      if (day < 1 || day > daysInMonth) {
        grid.push({ key: `e${i}`, d: 0, ds: '', rec: null, isWork: false, isHoliday: false });
        continue;
      }
      const ds = `${y}-${pad(m + 1)}-${pad(day)}`;
      grid.push({
        key: ds,
        d: day,
        ds,
        rec: attMap.get(ds) ?? null,
        isWork: isWorkDay(ds),
        isHoliday: holidays.has(ds),
      });
    }
    return grid;
  }, [monthAtt, calDate.y, calDate.m, isWorkDay, holidays]);

  const prevMonth = () =>
    setCalDate({
      y: calDate.m === 0 ? calDate.y - 1 : calDate.y,
      m: calDate.m === 0 ? 11 : calDate.m - 1,
    });
  const nextMonth = () =>
    setCalDate({
      y: calDate.m === 11 ? calDate.y + 1 : calDate.y,
      m: calDate.m === 11 ? 0 : calDate.m + 1,
    });
  const prevYear = () => setCalDate({ y: calDate.y - 1, m: calDate.m });
  const nextYear = () => setCalDate({ y: calDate.y + 1, m: calDate.m });

  if (loading && !refreshing) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const selectedRec =
    selectedDay && monthAtt.find((r) => String(r.date ?? '') === selectedDay);
  const selectedWeekend = selectedDay && !isWorkDay(selectedDay);
  const selectedIsHoliday = selectedDay && holidays.has(selectedDay);

  const workDayLabels = ['Du', 'Se', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
  const activeWorkDays = Array.from(workDays).sort().map((n) => workDayLabels[n - 1]);
  const restDayNums: number[] = [];
  for (let i = 1; i <= 7; i++) if (!workDays.has(i)) restDayNums.push(i);
  const restDayNames = restDayNums.map((n) => workDayLabels[n - 1]);
  const upcomingHolidays = Array.from(holidays)
    .filter((h) => h >= today)
    .sort()
    .slice(0, 4);

  const monthPct = monthStats.total
    ? Math.round((monthStats.worked / monthStats.total) * 100)
    : 0;
  const yearPct = yearStats.totalDays
    ? Math.round((yearStats.totalWorked / yearStats.totalDays) * 100)
    : 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        {/* Header title */}
        <View style={s.titleRow}>
          <Text style={s.title}>Davomat</Text>
          <Text style={s.subtitle}>{employeeName}</Text>
        </View>

        {/* Period tabs */}
        <View style={s.tabs}>
          <TouchableOpacity
            onPress={() => setPeriod('month')}
            style={[s.tab, period === 'month' && s.tabActive]}
          >
            <Text style={[s.tabText, period === 'month' && s.tabTextActive]}>
              📅 Oy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPeriod('year')}
            style={[s.tab, period === 'year' && s.tabActive]}
          >
            <Text style={[s.tabText, period === 'year' && s.tabTextActive]}>
              📊 Yil
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Card>
            <Text style={s.errorText}>{error}</Text>
            <Btn title="Qayta urinish" onPress={() => load(false)} ghost />
          </Card>
        ) : null}

        {period === 'month' ? (
          <>
            {/* Oylik stat kartalar */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderColor: colors.green + '66', backgroundColor: colors.green + '12' }]}>
                <Text style={s.statLabel}>Ishga chiqdi</Text>
                <Text style={[s.statValue, { color: colors.green }]}>
                  {monthStats.worked}
                </Text>
                <Text style={s.statHint}>/ {monthStats.total} ish kuni</Text>
              </View>
              <View style={[s.statCard, { borderColor: colors.gold + '66', backgroundColor: colors.gold + '12' }]}>
                <Text style={s.statLabel}>Kechikdi</Text>
                <Text style={[s.statValue, { color: colors.gold }]}>
                  {monthStats.late}
                </Text>
                <Text style={s.statHint}>marta</Text>
              </View>
              <View style={[s.statCard, { borderColor: colors.red + '66', backgroundColor: colors.red + '12' }]}>
                <Text style={s.statLabel}>Kelmadi</Text>
                <Text style={[s.statValue, { color: colors.red }]}>
                  {monthStats.absent}
                </Text>
                <Text style={s.statHint}>kun</Text>
              </View>
            </View>

            {/* Progress bar */}
            <Card>
              <View style={s.progHead}>
                <Text style={s.progTitle}>Oylik davomat</Text>
                <Text style={[s.progPct, { color: monthPct >= 90 ? colors.green : monthPct >= 70 ? colors.gold : colors.red }]}>
                  {monthPct}%
                </Text>
              </View>
              <View style={s.progBg}>
                <View style={[s.progFill, {
                  width: `${monthPct}%`,
                  backgroundColor: monthPct >= 90 ? colors.green : monthPct >= 70 ? colors.gold : colors.red,
                }]} />
              </View>
              <Text style={s.progHint}>
                {MONTH_NAMES_UZ[calDate.m]} {calDate.y} • {monthStats.worked} / {monthStats.total} ish kuni
              </Text>
            </Card>

            {/* Kalendar */}
            <Card>
              <View style={s.calHead}>
                <TouchableOpacity onPress={prevMonth} style={s.calNav}>
                  <Text style={s.calNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={s.calTitle}>
                  {MONTH_NAMES_UZ[calDate.m]} {calDate.y}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={s.calNav}>
                  <Text style={s.calNavText}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={s.calWeek}>
                {WEEKDAYS_UZ.map((w, i) => (
                  <Text key={w} style={[s.calWeekDay, (i === 5 || i === 6) && { color: colors.red + 'bb' }]}>
                    {w}
                  </Text>
                ))}
              </View>
              <View style={s.calGrid}>
                {calGrid.map((item) => {
                  if (item.d === 0) return <View key={item.key} style={s.calEmpty} />;
                  const isToday = item.ds === today;
                  const isSel = item.ds === selectedDay;
                  const rec = item.rec;
                  const cat = rec ? classify(String(rec.status ?? '')) : 'none';
                  const past = item.ds < today;

                  let bg = colors.card;
                  let fg = colors.text;
                  let dot: string | null = null;

                  if (item.isHoliday) {
                    bg = '#F59E0B22';
                    fg = '#F59E0B';
                  } else if (!item.isWork) {
                    bg = colors.faint + '15';
                    fg = colors.muted;
                  } else if (rec && cat === 'present') {
                    bg = colors.green + '22';
                    dot = colors.green;
                  } else if (rec && cat === 'late') {
                    bg = colors.gold + '22';
                    dot = colors.gold;
                  } else if (rec && cat === 'absent') {
                    bg = colors.red + '22';
                    dot = colors.red;
                  } else if (past && item.isWork) {
                    bg = colors.red + '14';
                    dot = colors.red + '77';
                  }

                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setSelectedDay(item.ds)}
                      activeOpacity={0.75}
                      style={[
                        s.calCell,
                        { backgroundColor: bg },
                        isToday && { borderColor: colors.gold, borderWidth: 2 },
                        isSel && { borderColor: colors.blue, borderWidth: 2 },
                      ]}
                    >
                      <Text style={[s.calDay, { color: fg }, isToday && { fontWeight: '900' }]}>
                        {item.d}
                      </Text>
                      {dot ? (
                        <View style={[s.calDot, { backgroundColor: dot }]} />
                      ) : item.isHoliday ? (
                        <Text style={s.calTag}>bayram</Text>
                      ) : !item.isWork ? (
                        <Text style={s.calTag}>dam</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.calLegend}>
                <LegendDot c={colors.green} label="Keldi" styles={s} />
                <LegendDot c={colors.gold} label="Kech" styles={s} />
                <LegendDot c={colors.red} label="Kelmadi" styles={s} />
                <LegendDot c="#F59E0B" label="Bayram" styles={s} />
              </View>

              {selectedDay ? (
                <View style={s.selBox}>
                  <Text style={s.selDate}>
                    📌 {selectedDay}
                    {selectedIsHoliday ? '  •  Bayram kuni' : selectedWeekend ? '  •  Dam olish' : ''}
                  </Text>
                  {selectedRec ? (
                    <>
                      <View style={s.selRow}>
                        <Text style={s.selLabel}>Holat</Text>
                        <Text style={s.selValue}>{String(selectedRec.status ?? '—')}</Text>
                      </View>
                      <View style={s.selRow}>
                        <Text style={s.selLabel}>Kirish vaqti</Text>
                        <Text style={s.selValue}>{String(selectedRec.check_in ?? '—')}</Text>
                      </View>
                      <View style={s.selRow}>
                        <Text style={s.selLabel}>Usul</Text>
                        <Text style={s.selValue}>{String(selectedRec.method ?? '—')}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={s.selEmpty}>
                      {selectedIsHoliday || selectedWeekend
                        ? 'Ish kuni emas.'
                        : selectedDay > today
                          ? 'Hali kelmagan sana.'
                          : "Bu kuni davomatdan o'tilmagan."}
                    </Text>
                  )}
                </View>
              ) : null}
            </Card>

            {/* Dam olish / bayram kartasi */}
            <Card>
              <View style={s.restHead}>
                <Text style={{ fontSize: 20 }}>🏖️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.restTitle}>Dam olish rejimi</Text>
                  <Text style={s.restHint}>Admin tomonidan belgilangan</Text>
                </View>
              </View>
              <View style={s.restRow}>
                <View style={s.restCell}>
                  <Text style={s.restLabel}>Ish kunlari</Text>
                  <View style={s.pillsRow}>
                    {activeWorkDays.map((d) => (
                      <View key={d} style={[s.pill, { backgroundColor: colors.green + '22', borderColor: colors.green + '55' }]}>
                        <Text style={[s.pillText, { color: colors.green }]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.restCell}>
                  <Text style={s.restLabel}>Dam kunlari</Text>
                  <View style={s.pillsRow}>
                    {restDayNames.length ? restDayNames.map((d) => (
                      <View key={d} style={[s.pill, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B55' }]}>
                        <Text style={[s.pillText, { color: '#F59E0B' }]}>{d}</Text>
                      </View>
                    )) : (
                      <Text style={s.restEmpty}>—</Text>
                    )}
                  </View>
                </View>
              </View>
              {upcomingHolidays.length ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={s.restLabel}>Kelayotgan bayramlar</Text>
                  <View style={s.pillsRow}>
                    {upcomingHolidays.map((h) => (
                      <View key={h} style={[s.pill, { backgroundColor: '#A78BFA22', borderColor: '#A78BFA55' }]}>
                        <Text style={[s.pillText, { color: '#A78BFA' }]}>🎉 {h}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        ) : (
          <>
            {/* Yillik sarlavha */}
            <Card>
              <View style={s.calHead}>
                <TouchableOpacity onPress={prevYear} style={s.calNav}>
                  <Text style={s.calNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={s.calTitle}>{calDate.y} yil</Text>
                <TouchableOpacity onPress={nextYear} style={s.calNav}>
                  <Text style={s.calNavText}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={s.yearSummary}>
                <View>
                  <Text style={s.yearBig}>{yearStats.totalWorked}</Text>
                  <Text style={s.yearHint}>Jami ishga chiqqan</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.yearPct, { color: yearPct >= 90 ? colors.green : yearPct >= 70 ? colors.gold : colors.red }]}>
                    {yearPct}%
                  </Text>
                  <Text style={s.yearHint}>/ {yearStats.totalDays} ish kuni</Text>
                </View>
              </View>

              <View style={s.progBg}>
                <View style={[s.progFill, {
                  width: `${yearPct}%`,
                  backgroundColor: yearPct >= 90 ? colors.green : yearPct >= 70 ? colors.gold : colors.red,
                }]} />
              </View>
            </Card>

            {/* Oyma-oy */}
            <Text style={s.yearGridTitle}>Oyma-oy davomat</Text>
            <View style={s.monthGrid}>
              {yearStats.months.map((mo) => {
                const pct = mo.total ? Math.round((mo.worked / mo.total) * 100) : 0;
                const barC = pct >= 90 ? colors.green : pct >= 70 ? colors.gold : pct > 0 ? colors.red : colors.faint;
                const isCur = mo.m === now.getMonth() && calDate.y === now.getFullYear();
                return (
                  <TouchableOpacity
                    key={mo.m}
                    onPress={() => { setCalDate({ y: calDate.y, m: mo.m }); setPeriod('month'); }}
                    activeOpacity={0.8}
                    style={[s.monthCard, isCur && { borderColor: colors.gold, borderWidth: 2 }]}
                  >
                    <Text style={s.monthName}>{MONTH_SHORT_UZ[mo.m]}</Text>
                    <Text style={[s.monthBig, { color: barC }]}>{mo.worked}</Text>
                    <Text style={s.monthHint}>/ {mo.total}</Text>
                    <View style={s.monthBarBg}>
                      <View style={[s.monthBarFill, { width: `${pct}%`, backgroundColor: barC }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const LegendDot: React.FC<{ c: string; label: string; styles: ReturnType<typeof makeStyles> }> = ({ c, label, styles }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: c }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    titleRow: { marginBottom: 10 },
    title: { color: c.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.3 },
    subtitle: { color: c.muted, fontSize: 13, marginTop: 2, fontWeight: '600' },

    tabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      padding: 4,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    tabActive: { backgroundColor: c.gold + '22', borderWidth: 1, borderColor: c.gold + '55' },
    tabText: { color: c.muted, fontWeight: '800', fontSize: 13 },
    tabTextActive: { color: c.gold },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    statCard: {
      flex: 1,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    statLabel: { color: c.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    statValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
    statHint: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },

    progHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    progPct: { fontSize: 22, fontWeight: '900' },
    progBg: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
    },
    progFill: { height: '100%', borderRadius: 5 },
    progHint: { color: c.muted, fontSize: 12, marginTop: 8, fontWeight: '600' },

    calHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    calNav: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    calNavText: { color: c.text, fontSize: 22, fontWeight: '900', lineHeight: 24 },
    calTitle: { color: c.text, fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
    calWeek: { flexDirection: 'row', marginBottom: 6 },
    calWeekDay: {
      flex: 1,
      textAlign: 'center',
      color: c.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    calCell: {
      width: `${100 / 7 - 1}%`,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    calEmpty: { width: `${100 / 7 - 1}%`, minHeight: 48 },
    calDay: { fontSize: 14, fontWeight: '700' },
    calDot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
    calTag: { color: c.muted, fontSize: 8, marginTop: 1, fontWeight: '700' },

    calLegend: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { color: c.muted, fontSize: 11, fontWeight: '600' },

    selBox: {
      marginTop: 12,
      padding: 12,
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    selDate: { color: c.text, fontSize: 14, fontWeight: '900', marginBottom: 8 },
    selRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    selLabel: { color: c.muted, fontSize: 12 },
    selValue: { color: c.text, fontSize: 13, fontWeight: '700' },
    selEmpty: { color: c.muted, fontSize: 12, fontStyle: 'italic' },

    restHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    restTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    restHint: { color: c.muted, fontSize: 11, marginTop: 1 },
    restRow: { flexDirection: 'row', gap: 10 },
    restCell: { flex: 1 },
    restLabel: {
      color: c.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    restEmpty: { color: c.muted, fontSize: 12 },
    pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillText: { fontSize: 11, fontWeight: '800' },

    yearSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    yearBig: { color: c.gold, fontSize: 36, fontWeight: '900', letterSpacing: 0.5 },
    yearPct: { fontSize: 32, fontWeight: '900' },
    yearHint: { color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },

    yearGridTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 6,
      marginBottom: 10,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    monthCard: {
      width: `${100 / 3 - 2}%`,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
    },
    monthName: { color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    monthBig: { fontSize: 22, fontWeight: '900', marginTop: 2 },
    monthHint: { color: c.muted, fontSize: 10, fontWeight: '600' },
    monthBarBg: {
      marginTop: 6,
      width: '100%',
      height: 4,
      borderRadius: 2,
      backgroundColor: c.bg,
      overflow: 'hidden',
    },
    monthBarFill: { height: '100%', borderRadius: 2 },

    errorText: { color: c.red, fontSize: 14, marginBottom: 8 },
  });
