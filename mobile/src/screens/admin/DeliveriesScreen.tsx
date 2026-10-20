import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Card, Empty, Field, H1, Loader, Muted, Screen } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

// react-native-maps faqat telefonda (webda codegen yo'q).
// Expo Go da native modul yo'q — try/catch shart, aks holda butun ilova qora ekranda qotib qoladi.
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
  } catch {
    MapView = null;
    Marker = null;
    Polyline = null;
  }
}

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): number | string => (r.id as number | string) ?? '';
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};

const STATUSES = ['kutilmoqda', 'yolda', 'yetkazildi'] as const;
type TripStatus = (typeof STATUSES)[number];

const statusLabel = (st: string): string => {
  if (st === 'kutilmoqda') return 'Kutilmoqda';
  if (st === 'yolda') return "Yo'lda";
  if (st === 'yetkazildi') return 'Yetkazildi';
  return st || '—';
};

const WAREHOUSE: [number, number] = [41.335, 69.245];
const TASHKENT: [number, number] = [41.311, 69.2405];

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && !Number.isNaN(v)
    ? v
    : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
      ? Number(v)
      : null;

const tripCoords = (r: Rec): [number, number] => {
  const la = numOrNull(r.lat);
  const ln = numOrNull(r.lng);
  if (la !== null && ln !== null) return [la, ln];
  const hay = `${str(r, 'destination_address')} ${str(r, 'client_name')}`.toLowerCase();
  if (hay.includes('mustaqillik') || hay.includes('sulton')) return [41.3195, 69.2825];
  if (hay.includes('bunyodkor') || hay.includes('rayhon')) return [41.2845, 69.2155];
  if (hay.includes('rustaveli') || hay.includes('aroma')) return [41.2985, 69.2612];
  if (hay.includes('chilonzor')) return [41.275, 69.205];
  if (hay.includes('yunusobod')) return [41.365, 69.289];
  if (hay.includes('mirobod') || hay.includes('nukus')) return [41.295, 69.278];
  if (hay.includes('sergeli')) return [41.225, 69.22];
  let hash = 0;
  const s = `${idOf(r)}${str(r, 'destination_address')}`;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return [41.311 + (((Math.abs(hash) % 70) - 35) / 1000), 69.2405 + (((Math.abs(hash * 3) % 70) - 35) / 1000)];
};

const fmtDateTime = (v: unknown): string => {
  if (!v) return '—';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtFee = (v: unknown): string => fmtMoney(num(v));

// --- REAL MARSHRUT (OSRM) ---
type RouteInfo = { coords: [number, number][]; distance: number; duration: number; isFallback?: boolean };
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

const fetchRouteInfo = async (from: [number, number], to: [number, number]): Promise<RouteInfo> => {
  const url = `${OSRM_BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length) {
      const r = data.routes[0];
      return {
        coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
        distance: r.distance || 0,
        duration: r.duration || 0,
      };
    }
  } catch { /* tarmoq xatosi — zaxira to'g'ri chiziq */ }
  return { coords: [from, to], distance: 0, duration: 0, isFallback: true };
};

const pointAlongCoords = (coords: [number, number][], progress: number): [number, number] => {
  if (coords.length === 0) return WAREHOUSE;
  if (coords.length === 1 || progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const len = Math.sqrt((coords[i][0] - coords[i - 1][0]) ** 2 + (coords[i][1] - coords[i - 1][1]) ** 2);
    segLens.push(len);
    total += len;
  }
  if (total === 0) return coords[0];
  let target = total * progress;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i]) {
      const t = segLens[i] === 0 ? 0 : target / segLens[i];
      return [
        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t,
        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t,
      ];
    }
    target -= segLens[i];
  }
  return coords[coords.length - 1];
};

const fmtRoadDistance = (m: number): string =>
  m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

const fmtRoadDuration = (s: number): string => {
  if (s <= 0) return '—';
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return m > 0 ? `${h} soat ${m} daq` : `${h} soat`;
  }
  return `${Math.max(1, Math.round(s / 60))} daqiqa`;
};

type Stats = {
  day?: { trip_count: number; total_delivery_fee: number };
  month?: { trip_count: number; total_delivery_fee: number };
  year?: { trip_count: number; total_delivery_fee: number };
};

export const DeliveriesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [layoutMode, setLayoutMode] = useState<'split' | 'table' | 'map'>('split');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TripStatus>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [stats, setStats] = useState<Stats>({});
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  // Xarita / jonli kuzatuv
  const [liveTracking, setLiveTracking] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [routeCache, setRouteCache] = useState<Record<string, RouteInfo>>({});
  const routesRef = useRef<Record<string, RouteInfo>>({});
  const pendingRef = useRef<Record<string, boolean>>({});

  // Modal (CRUD)
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [data, st] = await Promise.all([api.deliveries.list(), api.deliveries.stats()]);
      setItems(data);
      setStats(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // --- Filtrlash ---
  const baseFiltered = useMemo(() => {
    return items.filter((d) => {
      if (filterStatus !== 'all' && str(d, 'status') !== filterStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          str(d, 'driver_name').toLowerCase().includes(q) ||
          str(d, 'vehicle_plate').toLowerCase().includes(q) ||
          str(d, 'client_name').toLowerCase().includes(q) ||
          str(d, 'destination_address').toLowerCase().includes(q) ||
          str(d, 'trip_code').toLowerCase().includes(q) ||
          str(d, 'order_number').toLowerCase().includes(q) ||
          str(d, 'waybill_ttn_number').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filterStatus, searchTerm]);

  const filtered = baseFiltered;

  const counts = useMemo(() => {
    return {
      all: items.length,
      kutilmoqda: items.filter((d) => str(d, 'status') === 'kutilmoqda').length,
      yolda: items.filter((d) => str(d, 'status') === 'yolda').length,
      yetkazildi: items.filter((d) => str(d, 'status') === 'yetkazildi').length,
    };
  }, [items]);

  const activeCount = counts.yolda;
  const completedCount = counts.yetkazildi;

  // --- Jonli harakat simulyatsiyasi (yo'ldagi reyslar ~150s da marshrutni bosib o'tadi) ---
  useEffect(() => {
    if (!liveTracking) return;
    if (!items.some((d) => str(d, 'status') === 'yolda')) return;
    const interval = setInterval(() => {
      setProgressMap((prev) => {
        let changed = false;
        const next = { ...prev };
        items.forEach((d) => {
          if (str(d, 'status') !== 'yolda') return;
          const cur = next[String(idOf(d))] ?? 0;
          if (cur < 1) {
            next[String(idOf(d))] = Math.min(1, cur + 1 / 150);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [liveTracking, items]);

  // --- Tanlangan reys marshrutini yuklash (OSRM) ---
  const selectedTrip = useMemo(
    () => items.find((d) => idOf(d) === selectedId) || filtered[0] || items[0] || null,
    [items, selectedId, filtered],
  );

  const ensureRoute = useCallback((trip: Rec) => {
    const key = String(idOf(trip));
    if (routesRef.current[key] || pendingRef.current[key]) return;
    pendingRef.current[key] = true;
    fetchRouteInfo(WAREHOUSE, tripCoords(trip))
      .then((info) => {
        routesRef.current[key] = info;
        setRouteCache((prev) => ({ ...prev, [key]: info }));
      })
      .finally(() => {
        delete pendingRef.current[key];
      });
  }, []);

  useEffect(() => {
    if (selectedTrip) ensureRoute(selectedTrip);
  }, [selectedTrip, ensureRoute]);

  const selectedRoute = selectedTrip ? routeCache[String(idOf(selectedTrip))] : undefined;
  const selectedProgress = !selectedTrip
    ? 0
    : str(selectedTrip, 'status') === 'yetkazildi'
    ? 1
    : str(selectedTrip, 'status') === 'kutilmoqda'
    ? 0
    : (progressMap[String(idOf(selectedTrip))] ?? 0);

  // --- Excel (CSV) eksport ---
  const handleExport = useCallback(async () => {
    try {
      const header = [
        '№', 'Reys kodi', 'Yuk xati (TTN)', 'Buyurtma', 'Mijoz', 'Manzil', 'Yuk tavsifi',
        'Haydovchi', 'Haydovchi telefon', 'Avto', 'Sana & Vaqt',
        "Yetkazish haqi (so'm)", 'Holat', 'Qotirilgan',
      ];
      const rows = filtered.map((d, i) => [
        i + 1,
        str(d, 'trip_code'),
        str(d, 'waybill_ttn_number') || '—',
        str(d, 'order_number') || '—',
        str(d, 'client_name'),
        str(d, 'destination_address'),
        str(d, 'cargo_summary'),
        str(d, 'driver_name') || '—',
        str(d, 'driver_phone') || '—',
        `${str(d, 'vehicle_plate')} (${str(d, 'vehicle_model')})`,
        fmtDateTime(d.created_at),
        num(d.delivery_fee) || 0,
        statusLabel(str(d, 'status')),
        str(d, 'status') === 'yetkazildi' ? 'HA' : "YO'Q",
      ]);
      const csv =
        '\uFEFF' +
        [header, ...rows]
          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
          .join('\r\n');
      await Share.share({ title: 'Yetkazib_Berish_Reyslari.csv', message: csv });
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Eksport qilinmadi.');
    }
  }, [filtered]);

  // --- CRUD ---
  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setModalVisible(true);
  };

  const confirmDelete = (r: Rec) => {
    Alert.alert(
      "O'chirish",
      `"${str(r, 'trip_code') || 'Yetkazma'}" yozuvini o'chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deliveries.remove(idOf(r));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  const changeStatus = async (r: Rec, next: TripStatus) => {
    try {
      await api.deliveries.changeStatus(idOf(r), next);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Holatni o‘zgartirishda xatolik.');
    }
  };

  const statFor = (key: 'day' | 'month' | 'year') => stats[key];

  const COLS = { num: 46, trip: 200, client: 210, date: 150, driver: 190, fee: 120, status: 130 };

  const renderTable = () => (
    <View style={s.tableWrap}>
      <View style={s.tableHeadRow}>
        <Text style={[s.th, { width: COLS.num }]}>№</Text>
        <Text style={[s.th, { width: COLS.trip }]}>Reys & Yuk Xati</Text>
        <Text style={[s.th, { width: COLS.client }]}>Mijoz & Manzil</Text>
        <Text style={[s.th, { width: COLS.date }]}>Sana & Vaqt</Text>
        <Text style={[s.th, { width: COLS.driver }]}>Haydovchi & Avto</Text>
        <Text style={[s.th, { width: COLS.fee, textAlign: 'center' }]}>Haq</Text>
        <Text style={[s.th, { width: COLS.status, textAlign: 'center' }]}>Holat</Text>
      </View>
      {filtered.map((trip, idx) => {
        const st = str(trip, 'status');
        const locked = st === 'yetkazildi';
        const isSel = selectedTrip && idOf(selectedTrip) === idOf(trip);
        return (
          <TouchableOpacity
            key={String(idOf(trip))}
            style={[s.tableRow, isSel && s.tableRowActive]}
            onPress={() => {
              setSelectedId(idOf(trip));
              if (layoutMode === 'map') setLayoutMode('split');
              openEdit(trip);
            }}
          >
            <Text style={[s.td, { width: COLS.num, color: colors.faint }]}>{idx + 1}</Text>

            <View style={[s.td, { width: COLS.trip }]}>
              <Text style={[s.tdMono, { color: colors.gold }]}>{str(trip, 'trip_code') || '—'}</Text>
              {str(trip, 'waybill_ttn_number') ? (
                <Text style={s.tdSub}>Yuk xati: {str(trip, 'waybill_ttn_number')}</Text>
              ) : null}
              {str(trip, 'order_number') ? (
                <Text style={s.tdSub}>Buyurtma: {str(trip, 'order_number')}</Text>
              ) : null}
            </View>

            <View style={[s.td, { width: COLS.client }]}>
              <Text style={[s.tdBold, { color: colors.text }]}>{str(trip, 'client_name') || '—'}</Text>
              <Text style={s.tdSub} numberOfLines={1}>📍 {str(trip, 'destination_address')}</Text>
              {str(trip, 'cargo_summary') ? (
                <Text style={s.tdSubItalic} numberOfLines={1}>{str(trip, 'cargo_summary')}</Text>
              ) : null}
            </View>

            <View style={[s.td, { width: COLS.date }]}>
              <Text style={s.tdMono}>{fmtDateTime(trip.created_at)}</Text>
            </View>

            <View style={[s.td, { width: COLS.driver }]}>
              <Text style={[s.tdBold, { color: colors.text }]}>👤 {str(trip, 'driver_name') || '—'}</Text>
              <Text style={s.tdSub}>🚚 {str(trip, 'vehicle_plate')} ({str(trip, 'vehicle_model')})</Text>
              {str(trip, 'driver_phone') ? (
                <Text style={s.tdSub}>📞 {str(trip, 'driver_phone')}</Text>
              ) : null}
            </View>

            <View style={[s.td, { width: COLS.fee, alignItems: 'center' }]}>
              <Text style={[s.tdMono, { color: locked ? colors.green : colors.text }]}>
                {locked && num(trip.delivery_fee) > 0
                  ? fmtFee(trip.delivery_fee)
                  : num(trip.delivery_fee) > 0
                  ? fmtFee(trip.delivery_fee)
                  : '—'}
              </Text>
            </View>

            <View style={[s.td, { width: COLS.status, alignItems: 'center' }]}>
              <View style={[s.badge, { borderColor: badgeColor(st, colors) }]}>
                <Text style={[s.badgeText, { color: badgeColor(st, colors) }]}>{statusLabel(st)}</Text>
              </View>
              {locked ? <Text style={s.locked}>🔒 Qotirilgan</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
      {filtered.length === 0 && (
        <View style={s.tableEmpty}>
          <Text style={s.tableEmptyText}>Qidiruv yoki filtr bo‘yicha reyslar topilmadi.</Text>
        </View>
      )}
    </View>
  );

  const renderMap = () => {
    if (!MapView) {
      return (
        <Card style={s.mapFallback}>
          <H1>Xarita mavjud emas</H1>
          <Muted>
            react-native-maps faqat mahalliy build (APK) da ishlaydi. Quyida reyslar ro‘yxati:
          </Muted>
          {items.map((d) => (
            <TouchableOpacity
              key={String(idOf(d))}
              style={s.mapFallbackRow}
              onPress={() => {
                setSelectedId(idOf(d));
                openEdit(d);
              }}
            >
              <Text style={[s.tdMono, { color: colors.gold }]}>{str(d, 'trip_code')}</Text>
              <Text style={s.tdSub}>
                {str(d, 'client_name')} · {str(d, 'destination_address')}
              </Text>
              <Text style={[s.badgeText, { color: badgeColor(str(d, 'status'), colors) }]}>
                {statusLabel(str(d, 'status'))}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      );
    }

    const driving = items.filter((d) => str(d, 'status') === 'yolda');
    const coords = driving.length
      ? pointAlongCoords(
          routesRef.current[String(idOf(driving[0]))]?.coords?.length > 1
            ? routesRef.current[String(idOf(driving[0]))].coords
            : [WAREHOUSE, tripCoords(driving[0])],
          progressMap[String(idOf(driving[0]))] ?? 0,
        )
      : selectedTrip
      ? tripCoords(selectedTrip)
      : WAREHOUSE;

    return (
      <Card style={s.mapWrap}>
        <View style={s.mapHead}>
          <Text style={s.mapTitle}>Jonli Marshrutlar Xaritasi</Text>
          <View style={s.liveBadge}>
            <Text style={s.liveBadgeText}>● JONLI</Text>
          </View>
          {activeCount > 0 ? (
            <View style={s.onwayBadge}>
              <Text style={s.onwayBadgeText}>{activeCount} ta yo'lda</Text>
            </View>
          ) : null}
        </View>

        <MapView
          style={s.mapView}
          initialRegion={{
            latitude: coords[0],
            longitude: coords[1],
            latitudeDelta: 0.09,
            longitudeDelta: 0.09,
          }}
          region={{
            latitude: coords[0],
            longitude: coords[1],
            latitudeDelta: 0.09,
            longitudeDelta: 0.09,
          }}
        >
          <Marker coordinate={{ latitude: WAREHOUSE[0], longitude: WAREHOUSE[1] }} title="Asosiy Ombor" description="Toshkent sh., Chilonzor sanoat hududi">
            <Text style={s.mapEmoji}>🏭</Text>
          </Marker>

          {items.map((d) => {
            const st = str(d, 'status');
            const info = routeCache[String(idOf(d))];
            const prog = st === 'yetkazildi' ? 1 : st === 'kutilmoqda' ? 0 : (progressMap[String(idOf(d))] ?? 0);
            const isDriving = st === 'yolda' && !!info && info.coords.length > 1;
            const c: [number, number] = isDriving ? pointAlongCoords(info.coords, prog) : tripCoords(d);
            return (
              <Marker
                key={String(idOf(d))}
                coordinate={{ latitude: c[0], longitude: c[1] }}
                title={`${str(d, 'trip_code')} · ${str(d, 'client_name')}`}
                description={`${str(d, 'destination_address')} — ${statusLabel(st)}`}
                onPress={() => setSelectedId(idOf(d))}
              >
                <Text style={s.mapEmoji}>{st === 'yolda' ? '🚚' : st === 'yetkazildi' ? '✅' : '⏱️'}</Text>
              </Marker>
            );
          })}

          {items.map((d) => {
            const info = routeCache[String(idOf(d))];
            if (!info || info.coords.length < 2) return null;
            if (!(idOf(d) === idOf(selectedTrip) || str(d, 'status') === 'yolda' || str(d, 'status') === 'yetkazildi')) return null;
            return (
              <Polyline
                key={`pl-${idOf(d)}`}
                coordinates={info.coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                strokeColor="#2563EB"
                strokeWidth={idOf(selectedTrip) === idOf(d) ? 5 : 3}
              />
            );
          })}
        </MapView>

        {selectedTrip ? (
          <View style={s.mapInfo}>
            <Text style={[s.tdMono, { color: colors.gold }]}>{str(selectedTrip, 'trip_code')}</Text>
            <Text style={[s.tdBold, { color: colors.text }]}>{str(selectedTrip, 'client_name')}</Text>
            <Text style={s.tdSub} numberOfLines={1}>📍 {str(selectedTrip, 'destination_address')}</Text>
            <View style={s.mapInfoRow}>
              <Text style={s.tdSub}>👤 {str(selectedTrip, 'driver_name') || '—'} ({str(selectedTrip, 'vehicle_plate')})</Text>
              {str(selectedTrip, 'status') !== 'yetkazildi' ? (
                <TouchableOpacity style={s.deliverBtn} onPress={() => changeStatus(selectedTrip, 'yetkazildi')}>
                  <Text style={s.deliverBtnText}>Yetkazildi</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {str(selectedTrip, 'status') === 'yolda' && selectedRoute ? (
              <View style={s.progressBox}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.round(selectedProgress * 100)}%` }]} />
                </View>
                <Text style={s.progressText}>{Math.round(selectedProgress * 100)}%</Text>
                <Text style={s.progressMeta}>
                  🚚 {fmtRoadDistance(selectedRoute.distance * selectedProgress)} · qoldi {fmtRoadDuration(selectedRoute.duration * (1 - selectedProgress))}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />
        }
      >
        {/* 1. Sarlavha */}
        <View>
          <H1>Yetkazib Berish Xizmati</H1>
          <Muted>
            Reyslar yaratilgan yuk xatlaridan avtomatik ochiladi — haydovchi va yetkazish haqini shu jadvaldan kiriting
          </Muted>
        </View>

        {/* 2. Ko'rinish rejimi + Excel */}
        <View style={s.toolbar}>
          <View style={s.seg}>
            {(['split', 'table', 'map'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.segBtn, layoutMode === m && s.segBtnActive]}
                onPress={() => setLayoutMode(m)}
              >
                <Text style={[s.segBtnText, layoutMode === m && s.segBtnTextActive]}>
                  {m === 'split' ? 'Jadval + Xarita' : m === 'table' ? 'Jadval' : 'Xarita'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.excelBtn} onPress={handleExport}>
            <Text style={s.excelBtnText}>Excel</Text>
          </TouchableOpacity>
        </View>

        {/* 3. KPI */}
        <View style={s.kpiRow}>
          <Card style={s.kpiAmber}>
            <Text style={s.kpiLabel}>Hozir Yo‘ldagi Transportlar</Text>
            <Text style={[s.kpiValue, { color: colors.gold }]}>
              {activeCount} <Text style={s.kpiUnit}>ta faol reys</Text>
            </Text>
            <Text style={s.kpiHint}>Jonli GPS navigatsiya va yetkazish</Text>
          </Card>
          <Card style={s.kpiGreen}>
            <Text style={s.kpiLabel}>Muvaffaqiyatli Yetkazilgan</Text>
            <Text style={[s.kpiValue, { color: colors.green }]}>
              {completedCount} <Text style={s.kpiUnit}>ta reys yopilgan</Text>
            </Text>
            <Text style={s.kpiHint}>Yuk xatlari bilan tasdiqlangan</Text>
          </Card>
          <Card style={s.kpiPurple}>
            <Text style={s.kpiLabel}>Korxona Avtoparki</Text>
            <Text style={[s.kpiValue, { color: colors.blue }]}>
              3 <Text style={s.kpiUnit}>ta transport</Text>
            </Text>
            <Text style={s.kpiHint}>Labo Max, Damas, Isuzu NPR 4.5T</Text>
          </Card>
        </View>

        {/* 4. ReyS hisoboti */}
        <Card>
          <View style={s.statsHead}>
            <Text style={s.statsTitle}>ReyS hisoboti</Text>
            <Muted>reyslar soni & yetkazish haqi summasi</Muted>
          </View>
          <View style={s.statsSeg}>
            {(['all', 'day', 'month', 'year'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[s.statsSegBtn, timeFilter === f && s.statsSegBtnActive]}
                onPress={() => setTimeFilter(f)}
              >
                <Text style={[s.statsSegText, timeFilter === f && s.statsSegTextActive]}>
                  {f === 'all' ? 'Barcha vaqt' : f === 'day' ? 'Kunlik' : f === 'month' ? 'Oylik' : 'Yillik'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.statsRow}>
            <Card style={s.statCardPlain}>
              <Text style={s.statLabel}>📅 Bugun (Kunlik)</Text>
              <View style={s.statRow}>
                <Text style={s.statCount}>{statFor('day')?.trip_count ?? 0}</Text>
                <Text style={s.statUnit}>ta reys</Text>
              </View>
              <Text style={s.statFee}>Yuk haqi: {fmtMoney(statFor('day')?.total_delivery_fee ?? 0)}</Text>
            </Card>
            <Card style={s.statCardPlain}>
              <Text style={s.statLabel}>📆 Bu oy (Oylik)</Text>
              <View style={s.statRow}>
                <Text style={s.statCount}>{statFor('month')?.trip_count ?? 0}</Text>
                <Text style={s.statUnit}>ta reys</Text>
              </View>
              <Text style={s.statFee}>Yuk haqi: {fmtMoney(statFor('month')?.total_delivery_fee ?? 0)}</Text>
            </Card>
            <Card style={s.statCardPlain}>
              <Text style={s.statLabel}>📅 Bu yil (Yillik)</Text>
              <View style={s.statRow}>
                <Text style={s.statCount}>{statFor('year')?.trip_count ?? 0}</Text>
                <Text style={s.statUnit}>ta reys</Text>
              </View>
              <Text style={s.statFee}>Yuk haqi: {fmtMoney(statFor('year')?.total_delivery_fee ?? 0)}</Text>
            </Card>
          </View>
        </Card>

        {/* 5. Qidiruv + filtr */}
        <View style={s.filterBar}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Haydovchi, avto raqami, mijoz yoki manzil..."
              placeholderTextColor={colors.faint}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
            {(['all', ...STATUSES] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[s.chip, filterStatus === f && s.chipActive]}
                onPress={() => setFilterStatus(f)}
              >
                <Text style={[s.chipText, filterStatus === f && s.chipTextActive]}>
                  {f === 'all' ? 'Barcha reyslar' : statusLabel(f)} ({counts[f]})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 6. Jadval / Xarita */}
        {loading ? (
          <Loader />
        ) : error ? (
          <View style={s.center}>
            <Text style={s.errorText}>{error}</Text>
            <Btn title="Qayta urinish" onPress={() => load()} ghost />
          </View>
        ) : (
          <>
            {(layoutMode === 'split' || layoutMode === 'table') && (
              <View style={s.tableOuter}>
                <View style={s.tableHeaderBar}>
                  <Text style={s.tableHeaderTitle}>Yetkazib Berish Reyslari Jadvali</Text>
                  <Text style={s.tableHeaderCount}>Jami: {filtered.length} ta reys</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>{renderTable()}</View>
                </ScrollView>
              </View>
            )}
            {(layoutMode === 'split' || layoutMode === 'map') && renderMap()}
          </>
        )}
      </ScrollView>

      {/* FAB — Yangi reys */}
      <TouchableOpacity style={s.fab} onPress={openCreate}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* CRUD Modal */}
      <TripModal
        visible={modalVisible}
        editing={editing}
        colors={colors}
        onClose={() => setModalVisible(false)}
        onSaved={async () => {
          setModalVisible(false);
          await load();
        }}
        api={api}
      />
    </Screen>
  );
};

// ---------- Modal: yangi yoki tahrirlash ----------
const TripModal: React.FC<{
  visible: boolean;
  editing: Rec | null;
  colors: Palette;
  onClose: () => void;
  onSaved: () => void;
  api: typeof api;
}> = ({ visible, editing, colors, onClose, onSaved, api }) => {
  const isEdit = !!editing;
  const [saving, setSaving] = useState(false);
  const [tripCode, setTripCode] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [destination, setDestination] = useState('');
  const [clientName, setClientName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [cargo, setCargo] = useState('');
  const [fee, setFee] = useState('');
  const [status, setStatus] = useState<string>('kutilmoqda');

  const locked = isEdit && str(editing, 'status') === 'yetkazildi';

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTripCode(str(editing, 'trip_code'));
      setDriverName(str(editing, 'driver_name'));
      setDriverPhone(str(editing, 'driver_phone'));
      setVehicleModel(str(editing, 'vehicle_model'));
      setVehiclePlate(str(editing, 'vehicle_plate'));
      setDestination(str(editing, 'destination_address'));
      setClientName(str(editing, 'client_name'));
      setOrderNumber(str(editing, 'order_number'));
      setCargo(str(editing, 'cargo_summary'));
      setFee(editing.delivery_fee != null && editing.delivery_fee !== '' ? String(editing.delivery_fee) : '');
      setStatus(str(editing, 'status'));
    } else {
      const next = `REYS-${Date.now().toString().slice(-6)}`;
      setTripCode(next);
      setDriverName('');
      setDriverPhone('');
      setVehicleModel('');
      setVehiclePlate('');
      setDestination('');
      setClientName('');
      setOrderNumber('');
      setCargo('');
      setFee('');
      setStatus('kutilmoqda');
    }
  }, [visible, editing]);

  const save = async () => {
    if (!tripCode.trim()) {
      Alert.alert('Xatolik', 'Reys kodi majburiy.');
      return;
    }
    setSaving(true);
    const body: Rec = {
      trip_code: tripCode.trim(),
      driver_name: driverName.trim(),
      driver_phone: driverPhone.trim() || null,
      vehicle_model: vehicleModel.trim(),
      vehicle_plate: vehiclePlate.trim(),
      destination_address: destination.trim(),
      client_name: clientName.trim(),
      order_number: orderNumber.trim(),
      cargo_summary: cargo.trim(),
      delivery_fee: fee.trim() === '' ? null : Number(fee),
    };
    try {
      if (isEdit && !locked) {
        const upd: Rec = { ...body };
        if (status !== str(editing, 'status')) {
          // holatni alohida status endpoint orqali o'tkazamiz (qotish qoidasi)
          await api.deliveries.update(idOf(editing), upd);
          await api.deliveries.changeStatus(idOf(editing), status);
        } else {
          await api.deliveries.update(idOf(editing), upd);
        }
      } else if (isEdit && locked) {
        // qotirilgan — faqat ko'rsatamiz
        Alert.alert('Qotirilgan', 'Bu reys «Yetkazildi» holatida QOTIRILGAN — o‘zgartirib bo‘lmaydi!');
      } else {
        await api.deliveries.create(body);
      }
      onSaved();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const s = makeModalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{isEdit ? 'Reysni tahrirlash' : 'Yangi reys'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.form}>
            <Field label="Reys kodi" value={tripCode} onChange={setTripCode} placeholder="REYS-..." />
            <Field label="Haydovchi" value={driverName} onChange={setDriverName} placeholder="F.I.SH" />
            <Field label="Haydovchi telefon" value={driverPhone} onChange={setDriverPhone} placeholder="+998 ..." keyboard="phone-pad" />
            <Field label="Avto model" value={vehicleModel} onChange={setVehicleModel} placeholder="Isuzu NPR" />
            <Field label="Avto raqami" value={vehiclePlate} onChange={setVehiclePlate} placeholder="01A123BB" />
            <Field label="Mijoz" value={clientName} onChange={setClientName} placeholder="Mijoz nomi" />
            <Field label="Manzil" value={destination} onChange={setDestination} placeholder="Yetkazib berish manzili" multiline />
            <Field label="Buyurtma raqami" value={orderNumber} onChange={setOrderNumber} placeholder="BUS-..." />
            <Field label="Yuk tavsifi" value={cargo} onChange={setCargo} placeholder="20 dona ..." multiline />
            <Field label="Yetkazish haqi (so'm)" value={fee} onChange={setFee} placeholder="0" keyboard="numeric" />

            <Text style={s.fieldLabel}>Holat</Text>
            <View style={s.statusRow}>
              {STATUSES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.statusBtn, status === st && s.statusBtnActive]}
                  disabled={locked}
                  onPress={() => setStatus(st)}
                >
                  <Text style={[s.statusBtnText, status === st && s.statusBtnTextActive]}>
                    {statusLabel(st)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {locked ? (
              <Text style={s.lockedNote}>🔒 Bu reys «Yetkazildi» holatida QOTIRILGAN — o‘zgartirib bo‘lmaydi!</Text>
            ) : null}
          </ScrollView>
          <View style={s.sheetActions}>
            {isEdit && !locked ? (
              <Btn
                title="O'chirish"
                danger
                onPress={async () => {
                  try {
                    await api.deliveries.remove(idOf(editing!));
                    Alert.alert('OK', 'Reys o‘chirildi.');
                    onSaved();
                  } catch (e) {
                    Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
                  }
                }}
              />
            ) : null}
            <Btn title="Bekor qilish" onPress={onClose} ghost />
            <Btn title={saving ? 'Saqlanmoqda…' : 'Saqlash'} onPress={save} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const badgeColor = (st: string, colors: Palette): string => {
  if (st === 'yetkazildi') return colors.green;
  if (st === 'yolda') return colors.gold;
  return colors.blue;
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    scroll: { paddingBottom: 90, gap: 12 },
    toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
    seg: { flexDirection: 'row', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, overflow: 'hidden', flex: 1 },
    segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.input },
    segBtnActive: { backgroundColor: colors.gold },
    segBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    segBtnTextActive: { color: '#000', fontWeight: '900' },
    excelBtn: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
    excelBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpi: { flex: 1, minWidth: 150 },
    kpiAmber: { flex: 1, minWidth: 150, borderColor: colors.gold },
    kpiGreen: { flex: 1, minWidth: 150, borderColor: colors.green },
    kpiPurple: { flex: 1, minWidth: 150, borderColor: colors.blue },
    kpiLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
    kpiValue: { fontSize: 24, fontWeight: '900' },
    kpiUnit: { fontSize: 11, fontWeight: '700', color: colors.faint },
    kpiHint: { color: colors.faint, fontSize: 10, marginTop: 2 },
    statsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statsTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    statsSeg: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
    statsSegBtn: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
    statsSegBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    statsSegText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
    statsSegTextActive: { color: '#000', fontWeight: '900' },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statCardPlain: { flex: 1, minWidth: 150 },
    statLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: 6 },
    statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    statCount: { color: colors.gold, fontSize: 22, fontWeight: '900' },
    statUnit: { color: colors.faint, fontSize: 10, fontWeight: '700' },
    statFee: { color: colors.faint, fontSize: 10, marginTop: 4 },
    filterBar: { gap: 8 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.input,
    },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 13 },
    chips: { flexDirection: 'row' },
    chip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
    chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#000', fontWeight: '900' },
    tableOuter: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    tableHeaderBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.bg,
    },
    tableHeaderTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
    tableHeaderCount: { color: colors.faint, fontSize: 11 },
    tableWrap: { minWidth: 1006 },
    tableHeadRow: { flexDirection: 'row', backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: 10 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: 10, paddingHorizontal: 6 },
    tableRowActive: { backgroundColor: colors.gold + '14' },
    tableEmpty: { padding: 24, alignItems: 'center' },
    tableEmptyText: { color: colors.faint, fontSize: 12 },
    th: { color: colors.muted, fontSize: 11, fontWeight: '800', paddingHorizontal: 6 },
    td: { paddingHorizontal: 6, justifyContent: 'center' },
    tdMono: { color: colors.text, fontSize: 11, fontWeight: '700' },
    tdBold: { fontSize: 12, fontWeight: '700' },
    tdSub: { color: colors.faint, fontSize: 10, marginTop: 2 },
    tdSubItalic: { color: colors.faint, fontSize: 10, fontStyle: 'italic', marginTop: 2 },
    badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    locked: { color: colors.faint, fontSize: 9, marginTop: 2 },
    mapWrap: { padding: 0, overflow: 'hidden' },
    mapHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    mapTitle: { color: colors.text, fontWeight: '800', fontSize: 13, flex: 1 },
    liveBadge: { backgroundColor: colors.green + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    liveBadgeText: { color: colors.green, fontSize: 10, fontWeight: '900' },
    onwayBadge: { backgroundColor: colors.gold + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    onwayBadgeText: { color: colors.gold, fontSize: 10, fontWeight: '800' },
    mapView: { width: '100%', height: 420 },
    mapEmoji: { fontSize: 22 },
    mapInfo: { padding: 12, gap: 6, borderTopWidth: 1, borderTopColor: colors.cardBorder },
    mapInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deliverBtn: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    deliverBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
    progressBox: { gap: 4 },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.cardBorder, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.blue },
    progressText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
    progressMeta: { color: colors.faint, fontSize: 10 },
    mapFallback: { gap: 8 },
    mapFallbackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 30 },
    errorText: { color: colors.red, fontSize: 14, textAlign: 'center' },
    statCard: { flex: 1, minWidth: 150, borderWidth: 1, borderRadius: 12, padding: 12 },
    statCardActive: { borderColor: colors.gold },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabText: { color: '#000', fontSize: 30, fontWeight: '900', lineHeight: 34 },
  });

const makeModalStyles = (colors: Palette) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '92%',
    },
    sheetHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
    closeText: { color: colors.muted, fontSize: 20 },
    form: { padding: 16, gap: 4 },
    fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
    statusRow: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    statusBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    statusBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    statusBtnTextActive: { color: '#000', fontWeight: '900' },
    lockedNote: { color: colors.red, fontSize: 11, marginTop: 8 },
    sheetActions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  });