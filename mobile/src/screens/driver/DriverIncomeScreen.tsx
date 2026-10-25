import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Screen, Loader, Empty } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
const str = (r: Rec, k: string): string => String(r[k] ?? '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};
const isMine = (r: Rec, name: string): boolean => {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return str(r, 'driver_name').toLowerCase().includes(n);
};

type Filter = 'all' | 'kutilmoqda' | 'yolda' | 'yetkazildi';

const statusMeta = (st: string): { label: string; color: string; icon: string } => {
  const t = (st || '').toLowerCase();
  if (t === 'yetkazildi') return { label: 'Yetkazildi', color: '#22C55E', icon: '✓' };
  if (t === 'yolda' || t.includes("yo'lda")) return { label: "Yo'lda", color: '#3B82F6', icon: '🚚' };
  if (t === 'kutilmoqda') return { label: 'Kutilmoqda', color: '#F59E0B', icon: '⏳' };
  return { label: st || '—', color: '#9CA3AF', icon: '•' };
};

const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ');
};

export const DriverIncomeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const driverName = session?.name ?? '';

  const [trips, setTrips] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Yetkazilganlar bo'yicha kunlik/oylik/yillik stat (server-side)
  const [deliveredStats, setDeliveredStats] = useState<{
    day: { count: number; fee: number };
    month: { count: number; fee: number };
    year: { count: number; fee: number };
  }>({
    day: { count: 0, fee: 0 },
    month: { count: 0, fee: 0 },
    year: { count: 0, fee: 0 },
  });

  const PAGE_SIZE = 10;

  const loadStats = useCallback(async () => {
    try {
      const r = await api.deliveries.stats({ driver: driverName, onlyDelivered: true });
      setDeliveredStats({
        day: { count: r.day?.trip_count ?? 0, fee: r.day?.total_delivery_fee ?? 0 },
        month: { count: r.month?.trip_count ?? 0, fee: r.month?.total_delivery_fee ?? 0 },
        year: { count: r.year?.trip_count ?? 0, fee: r.year?.total_delivery_fee ?? 0 },
      });
    } catch {
      /* ignore */
    }
  }, [driverName]);

  const loadPage = useCallback(async (pg: number, replace = false) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const serverStatus = filter === 'all' ? undefined : filter;
      const r = await api.deliveries.page({
        page: pg,
        pageSize: PAGE_SIZE,
        driver: driverName,
        status: serverStatus,
      });
      setTotalCount(r.count ?? 0);
      setHasMore(Boolean(r.next));
      setTrips((prev) => (replace ? r.results : [...prev, ...r.results]));
      setPage(pg);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [driverName, filter]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPage(1, true), loadStats()]);
  }, [loadPage, loadStats]);

  useEffect(() => {
    loadPage(1, true);
    loadStats();
    const t = setInterval(() => {
      // har 60 soniyada yangilash
      loadPage(1, true);
      loadStats();
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, driverName]);

  const filtered = trips;

  const changeStatus = useCallback(async (trip: Rec, newStatus: string) => {
    const id = String(trip.id ?? '');
    if (!id) return;
    setBusyId(id);
    try {
      await api.deliveries.changeStatus(id, newStatus);
      setTrips((prev) => prev.map((r) => (String(r.id) === id ? { ...r, status: newStatus } : r)));
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  }, []);

  if (loading && !refreshing) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const chips: { k: Filter; label: string }[] = [
    { k: 'all', label: 'Hammasi' },
    { k: 'yolda', label: "Yo'lda" },
    { k: 'kutilmoqda', label: 'Kutilmoqda' },
    { k: 'yetkazildi', label: 'Yetkazilgan' },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            tintColor={colors.gold}
          />
        }
      >
        {/* === Header stats === */}
        <View style={s.titleRow}>
          <Text style={s.title}>Yetkazishlar</Text>
          <Text style={s.subtitle}>Jami: {totalCount}</Text>
        </View>

        {/* Yetkazilgan reyslar — kunlik / oylik / yillik */}
        <View style={s.incomeHead}>
          <Text style={s.incomeHeadIcon}>💰</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.incomeHeadTitle}>Yetkazilgan reyslardan daromad</Text>
            <Text style={s.incomeHeadHint}>Faqat tasdiqlangan yetkazishlar</Text>
          </View>
        </View>

        <View style={s.incomeRow}>
          <View style={[s.incomeCard, { borderColor: '#F59E0B55' }]}>
            <Text style={s.incomePeriod}>Bugun</Text>
            <Text style={[s.incomeAmount, { color: '#F59E0B' }]} numberOfLines={1}>
              {fmtMoney(deliveredStats.day.fee)}
            </Text>
            <View style={s.incomeMetaRow}>
              <Text style={s.incomeMetaCount}>{deliveredStats.day.count}</Text>
              <Text style={s.incomeMetaLabel}>reys</Text>
            </View>
          </View>
          <View style={[s.incomeCard, { borderColor: '#3B82F655' }]}>
            <Text style={s.incomePeriod}>Shu oy</Text>
            <Text style={[s.incomeAmount, { color: '#3B82F6' }]} numberOfLines={1}>
              {fmtMoney(deliveredStats.month.fee)}
            </Text>
            <View style={s.incomeMetaRow}>
              <Text style={s.incomeMetaCount}>{deliveredStats.month.count}</Text>
              <Text style={s.incomeMetaLabel}>reys</Text>
            </View>
          </View>
          <View style={[s.incomeCard, { borderColor: '#22C55E55' }]}>
            <Text style={s.incomePeriod}>Shu yil</Text>
            <Text style={[s.incomeAmount, { color: '#22C55E' }]} numberOfLines={1}>
              {fmtMoney(deliveredStats.year.fee)}
            </Text>
            <View style={s.incomeMetaRow}>
              <Text style={s.incomeMetaCount}>{deliveredStats.year.count}</Text>
              <Text style={s.incomeMetaLabel}>reys</Text>
            </View>
          </View>
        </View>

        {/* Filter chiplari */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll}>
          {chips.map((c) => (
            <TouchableOpacity
              key={c.k}
              onPress={() => setFilter(c.k)}
              style={[s.chip, filter === c.k && s.chipActive]}
            >
              <Text style={[s.chipText, filter === c.k && s.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reys kartalari */}
        {filtered.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <Empty text="Reyslar topilmadi." />
          </View>
        ) : (
          filtered.map((t) => {
            const st = str(t, 'status').toLowerCase();
            const meta = statusMeta(st);
            const isDone = st === 'yetkazildi';
            const isRoute = st === 'yolda' || st.includes("yo'lda");
            const isPending = st === 'kutilmoqda';
            const id = String(t.id ?? '');
            const busy = busyId === id;

            return (
              <View key={id} style={s.tripCard}>
                {/* Header */}
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <View style={s.codeRow}>
                      <Text style={s.tripCode}>{str(t, 'trip_code') || `#${id}`}</Text>
                      {str(t, 'waybill_ttn_number') ? (
                        <View style={s.ttnBadge}>
                          <Text style={s.ttnText}>TTN · {str(t, 'waybill_ttn_number')}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.clientName} numberOfLines={1}>
                      {str(t, 'client_name') || '—'}
                    </Text>
                  </View>
                  <View style={[s.stBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '66' }]}>
                    <Text style={[s.stBadgeText, { color: meta.color }]}>{meta.icon} {meta.label}</Text>
                  </View>
                </View>

                {/* Address */}
                <View style={s.addrRow}>
                  <Text style={s.addrIcon}>📍</Text>
                  <Text style={s.addrText} numberOfLines={2}>
                    {str(t, 'destination_address') || '—'}
                  </Text>
                </View>

                {/* Grid: order, cargo, car */}
                <View style={s.grid}>
                  <View style={s.gridItem}>
                    <Text style={s.gridLabel}>Buyurtma</Text>
                    <Text style={s.gridValue} numberOfLines={1}>{str(t, 'order_number') || '—'}</Text>
                  </View>
                  <View style={s.gridItem}>
                    <Text style={s.gridLabel}>Yaratilgan</Text>
                    <Text style={s.gridValue} numberOfLines={1}>{fmtDate(str(t, 'created_at'))}</Text>
                  </View>
                  <View style={s.gridItem}>
                    <Text style={s.gridLabel}>Mashina</Text>
                    <Text style={s.gridValue} numberOfLines={1}>
                      {str(t, 'vehicle_model') || '—'}
                    </Text>
                  </View>
                  <View style={s.gridItem}>
                    <Text style={s.gridLabel}>Davlat raqami</Text>
                    <Text style={s.gridValue} numberOfLines={1}>{str(t, 'vehicle_plate') || '—'}</Text>
                  </View>
                  <View style={[s.gridItem, s.gridItemFull]}>
                    <Text style={s.gridLabel}>Yuk</Text>
                    <Text style={s.gridValue} numberOfLines={2}>{str(t, 'cargo_summary') || '—'}</Text>
                  </View>
                  {str(t, 'departure_time') ? (
                    <View style={s.gridItem}>
                      <Text style={s.gridLabel}>Jo'nash</Text>
                      <Text style={s.gridValue} numberOfLines={1}>{fmtDate(str(t, 'departure_time'))}</Text>
                    </View>
                  ) : null}
                  {str(t, 'estimated_arrival') ? (
                    <View style={s.gridItem}>
                      <Text style={s.gridLabel}>Mo'ljal</Text>
                      <Text style={s.gridValue} numberOfLines={1}>{fmtDate(str(t, 'estimated_arrival'))}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Fee */}
                <View style={s.feeRow}>
                  <Text style={s.feeRowLabel}>Yetkazish haqi</Text>
                  <Text style={s.feeRowValue}>{fmtMoney(num(t.delivery_fee))}</Text>
                </View>

                {/* Status change buttons */}
                {!isDone ? (
                  <View style={s.statusBtns}>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => changeStatus(t, 'kutilmoqda')}
                      style={[s.stBtn, isPending && s.stBtnActivePending]}
                    >
                      <Text style={[s.stBtnText, isPending && { color: '#F59E0B' }]}>⏳ Kutilmoqda</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => changeStatus(t, 'yolda')}
                      style={[s.stBtn, isRoute && s.stBtnActiveRoute]}
                    >
                      <Text style={[s.stBtnText, isRoute && { color: '#3B82F6' }]}>🚚 Yo'lda</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => changeStatus(t, 'yetkazildi')}
                      style={[s.stBtn, s.stBtnDone]}
                    >
                      <Text style={[s.stBtnText, { color: '#FFF' }]}>✓ Yetkazildi</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.doneHint}>
                    <Text style={s.doneHintText}>✓ Yetkazilgan — tahrir yopiq</Text>
                  </View>
                )}

                {busy ? (
                  <Text style={s.busyText}>Yangilanmoqda...</Text>
                ) : null}
              </View>
            );
          })
        )}

        {hasMore ? (
          <TouchableOpacity
            onPress={() => loadPage(page + 1, false)}
            disabled={loadingMore}
            style={s.loadMoreBtn}
          >
            <Text style={s.loadMoreText}>
              {loadingMore ? 'Yuklanmoqda...' : `Yana ${PAGE_SIZE} ta ko'rsatish`}
            </Text>
            <Text style={s.loadMoreHint}>
              {trips.length} / {totalCount}
            </Text>
          </TouchableOpacity>
        ) : trips.length > 0 ? (
          <Text style={s.endHint}>— oxiri —</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    title: { color: c.text, fontSize: 22, fontWeight: '900', letterSpacing: 0.3 },
    subtitle: { color: c.muted, fontSize: 12, fontWeight: '700' },

    incomeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    incomeHeadIcon: { fontSize: 22 },
    incomeHeadTitle: { color: c.text, fontSize: 14, fontWeight: '900' },
    incomeHeadHint: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },

    incomeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    incomeCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
    },
    incomePeriod: {
      color: c.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    incomeAmount: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    incomeMetaRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
      marginTop: 4,
    },
    incomeMetaCount: { color: c.text, fontSize: 14, fontWeight: '900' },
    incomeMetaLabel: { color: c.muted, fontSize: 11, fontWeight: '700' },

    loadMoreBtn: {
      marginTop: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gold + '55',
      alignItems: 'center',
    },
    loadMoreText: { color: c.gold, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
    loadMoreHint: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '700' },
    endHint: {
      color: c.muted,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 14,
      fontWeight: '700',
      letterSpacing: 1,
    },

    chipsScroll: { marginBottom: 12, flexGrow: 0 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginRight: 8,
    },
    chipActive: { backgroundColor: c.gold + '22', borderColor: c.gold + '66' },
    chipText: { color: c.muted, fontSize: 12, fontWeight: '800' },
    chipTextActive: { color: c.gold },

    tripCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 10,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    tripCode: {
      color: c.gold,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    ttnBadge: {
      backgroundColor: c.bg,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    ttnText: { color: c.muted, fontSize: 10, fontWeight: '800' },
    clientName: { color: c.text, fontSize: 16, fontWeight: '900' },

    stBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    stBadgeText: { fontSize: 11, fontWeight: '900' },

    addrRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: c.bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    addrIcon: { fontSize: 13 },
    addrText: { color: c.text, fontSize: 13, fontWeight: '700', flex: 1 },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    gridItem: {
      minWidth: '47%',
      flexGrow: 1,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    gridItemFull: { minWidth: '100%' },
    gridLabel: {
      color: c.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    gridValue: { color: c.text, fontSize: 13, fontWeight: '800', marginTop: 2 },

    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.gold + '14',
      borderWidth: 1,
      borderColor: c.gold + '55',
      marginBottom: 10,
    },
    feeRowLabel: { color: c.gold, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    feeRowValue: { color: c.gold, fontSize: 16, fontWeight: '900' },

    statusBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    stBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
    },
    stBtnActivePending: { backgroundColor: '#F59E0B22', borderColor: '#F59E0B66' },
    stBtnActiveRoute: { backgroundColor: '#3B82F622', borderColor: '#3B82F666' },
    stBtnDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
    stBtnText: { color: c.text, fontSize: 12, fontWeight: '800' },

    doneHint: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: '#22C55E14',
      borderWidth: 1,
      borderColor: '#22C55E55',
      alignItems: 'center',
    },
    doneHintText: { color: '#22C55E', fontSize: 12, fontWeight: '900' },

    busyText: { color: c.muted, fontSize: 11, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  });
