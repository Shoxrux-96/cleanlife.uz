import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { Btn, Card, H1, Loader, Muted, Screen } from '../../components';
import { LeafletMap, LeafletMarker, LeafletPolyline } from '../../components/LeafletMap';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';
import * as Location from 'expo-location';

// react-native-maps faqat telefonda (webda codegen yo'q).
// Expo Go da native modul yo'q — try/catch shart, aks holda butun ilova qora ekranda qotib qoladi.
// MUHIM: PROVIDER_DEFAULT va PROVIDER_NONE ni yoqamiz. PROVIDER_GOOGLE API kaliti talab qiladi
// (bizda yo'q) — kaliti bo'lmasa Google Maps APK'da ishga tushganda release buildni crash qiladi.
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let UrlTile: any = null;
let MAP_PROVIDER: any = null; // null = OS default (Android: OSM via UrlTile; iOS: Apple Maps)
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    UrlTile = maps.UrlTile;
    // Google provider'ni ATAYLAB ishlatmaymiz — bu API kalit talab qiladi va kaliti yo'q
    // bo'lsa Android'da native crash beradi. PROVIDER_NONE Android'da bo'sh canvas qaytaradi,
    // uning ustiga biz OSM UrlTile'ini qo'yamiz.
    MAP_PROVIDER = maps.PROVIDER_NONE ?? null;
  } catch {
    MapView = null;
    Marker = null;
    Polyline = null;
    UrlTile = null;
    MAP_PROVIDER = null;
  }
}

// OpenStreetMap plitalari (Google Maps API kaliti shart emas)
const OSM_STREET = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_SATELLITE = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const haversineKm = (a: [number, number], b: [number, number]): number => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const pathLengthKm = (coords: [number, number][]): number => {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) sum += haversineKm(coords[i - 1], coords[i]);
  return sum;
};

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

  // Default: 'table' — xarita native modul (react-native-maps) muammosi bo'lsa ham sahifa ochiladi
  const [layoutMode, setLayoutMode] = useState<'split' | 'table' | 'map'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TripStatus>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [stats, setStats] = useState<Stats>({});
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  // Xarita / jonli kuzatuv
  const [liveTracking] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [routeCache, setRouteCache] = useState<Record<string, RouteInfo>>({});
  const routesRef = useRef<Record<string, RouteInfo>>({});
  const pendingRef = useRef<Record<string, boolean>>({});

  // Qator boshqaruvi: select orqali holat + yetkazish haqi kiritish/saqlash
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<string, TripStatus>>({});
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [selectRow, setSelectRow] = useState<Rec | null>(null);
  const [mapTrip, setMapTrip] = useState<Rec | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch (loading -> loaded)
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

  // Har bir reys uchun joriy marshrut progressi (0..1)
  const progressFor = (trip: Rec): number => {
    const st = str(trip, 'status');
    if (st === 'yetkazildi') return 1;
    if (st === 'kutilmoqda') return 0;
    return progressMap[String(idOf(trip))] ?? 0;
  };

  const selectedProgress = selectedTrip ? progressFor(selectedTrip) : 0;
  const selectedProgressFor = progressFor;

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

  // --- Qator yozuvi: tanlangan holat + haq qiymati ---
  const rawFee = (r: Rec): string =>
    r.delivery_fee != null && r.delivery_fee !== '' ? String(r.delivery_fee) : '';

  const draftStatus = (r: Rec): TripStatus =>
    statusDraft[String(idOf(r))] ?? (str(r, 'status') as TripStatus);

  const draftFee = (r: Rec): string => feeDraft[String(idOf(r))] ?? rawFee(r);

  const isRowDirty = (r: Rec): boolean =>
    draftStatus(r) !== str(r, 'status') || draftFee(r) !== rawFee(r);

  const saveRow = async (r: Rec) => {
    const key = String(idOf(r));
    const locked = str(r, 'status') === 'yetkazildi';
    if (locked) {
      Alert.alert('Qotirilgan', 'Bu reys «Yetkazildi» holatida QOTIRILGAN — o‘zgartirib bo‘lmaydi!');
      return;
    }
    const nextFee = draftFee(r).trim();
    const nextStatus = draftStatus(r);
    if (nextFee !== '' && Number.isNaN(Number(nextFee))) {
      Alert.alert('Xatolik', "Yetkazish haqi faqat raqam bo'lishi kerak.");
      return;
    }
    setSavingRow(key);
    try {
      if (nextFee !== rawFee(r)) {
        await api.deliveries.update(idOf(r), {
          delivery_fee: nextFee === '' ? null : Number(nextFee),
        });
      }
      if (nextStatus !== str(r, 'status')) {
        await api.deliveries.changeStatus(idOf(r), nextStatus);
      }
      setFeeDraft((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      setStatusDraft((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSavingRow(null);
    }
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

  const renderTripCards = () => (
    <View style={s.cardList}>
      {filtered.map((trip, idx) => {
        const st = str(trip, 'status');
        const locked = st === 'yetkazildi';
        const isSel = selectedTrip && idOf(selectedTrip) === idOf(trip);
        const dirty = isRowDirty(trip);
        const busy = savingRow === String(idOf(trip));
        return (
          <View key={String(idOf(trip))} style={[s.tripCard, isSel && s.tripCardSel]}>
            {/* Sarlavha: № + reys kodi + sana + holat select */}
            <TouchableOpacity
              style={s.cardHead}
              activeOpacity={0.75}
              onPress={() => {
                setSelectedId(idOf(trip));
                if (layoutMode === 'map') setLayoutMode('split');
              }}
            >
              <View style={s.idxBadge}>
                <Text style={s.idxBadgeText}>{idx + 1}</Text>
              </View>
              <View style={s.cardHeadMain}>
                <Text style={s.cardCode}>{str(trip, 'trip_code') || '—'}</Text>
                <Text style={s.cardDate}>🕒 {fmtDateTime(trip.created_at)}</Text>
              </View>
              <TouchableOpacity
                style={[
                  s.selectBtn,
                  { borderColor: badgeColor(st, colors) },
                  locked && s.selectBtnLocked,
                  draftStatus(trip) !== st && s.selectBtnDirty,
                ]}
                disabled={locked}
                onPress={() => setSelectRow(trip)}
              >
                <Text
                  style={[
                    s.selectBtnText,
                    { color: locked ? colors.faint : badgeColor(st, colors) },
                    draftStatus(trip) !== st && { color: colors.gold },
                  ]}
                >
                  {statusLabel(draftStatus(trip))} ▾
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {locked ? <Text style={s.lockedBanner}>🔒 Qotirilgan — o‘zgartirib bo‘lmaydi</Text> : null}

            <View style={s.divider} />

            {/* Haydovchi & Transport */}
            <View style={s.block}>
              <Text style={s.blockLabel}>Haydovchi & Transport</Text>
              <Text style={s.blockValue}>👤 {str(trip, 'driver_name') || 'Haydovchi hali biriktirilmagan'}</Text>
              <Text style={s.blockSub}>
                🚚 {str(trip, 'vehicle_plate') || '—'}
                {str(trip, 'vehicle_model') ? ` · ${str(trip, 'vehicle_model')}` : ''}
              </Text>
              {str(trip, 'driver_phone') ? <Text style={s.blockSub}>📞 {str(trip, 'driver_phone')}</Text> : null}
            </View>

            {/* Mijoz & Manzil */}
            <View style={s.block}>
              <Text style={s.blockLabel}>Mijoz & Manzil</Text>
              <Text style={s.blockValue}>🏢 {str(trip, 'client_name') || '—'}</Text>
              <Text style={s.blockSub}>📍 {str(trip, 'destination_address') || 'Manzil kiritilmagan'}</Text>
              {str(trip, 'cargo_summary') ? <Text style={s.blockSub}>📦 {str(trip, 'cargo_summary')}</Text> : null}
            </View>

            {/* Hujjatlar */}
            <View style={s.block}>
              <Text style={s.blockLabel}>Hujjatlar</Text>
              <Text style={s.blockSub}>📄 Yuk xati: {str(trip, 'waybill_ttn_number') || '—'}</Text>
              <Text style={s.blockSub}>🛒 Buyurtma: {str(trip, 'order_number') || '—'}</Text>
            </View>

            <View style={s.divider} />

            {/* Yetkazish haqi */}
            <Text style={s.blockLabel}>{"Yetkazish haqi (so'm)"}</Text>
            <View style={s.feeRow}>
              <TextInput
                style={[s.feeInput, locked && s.feeInputLocked]}
                value={draftFee(trip)}
                onChangeText={(t) => setFeeDraft((p) => ({ ...p, [String(idOf(trip))]: t }))}
                onBlur={() => {
                  if (isRowDirty(trip)) saveRow(trip);
                }}
                placeholder="0"
                placeholderTextColor={colors.faint}
                keyboardType="numeric"
                editable={!locked}
              />
              <Text style={s.feeSuffix}>so‘m</Text>
            </View>
            {num(trip.delivery_fee) > 0 && draftFee(trip) === rawFee(trip) ? (
              <Text style={s.feeHint}>Saqlangan: {fmtFee(trip.delivery_fee)}</Text>
            ) : null}

            {/* Amallar */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.mapBtn} onPress={() => setMapTrip(trip)}>
                <Text style={s.mapBtnText}>🗺️ Xaritada ochish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.saveBtn,
                  dirty && !locked ? s.saveBtnActive : s.saveBtnIdle,
                  busy && s.saveBtnBusy,
                ]}
                disabled={!dirty || busy || locked}
                onPress={() => saveRow(trip)}
              >
                <Text style={[s.saveBtnText, dirty && !locked && s.saveBtnTextActive]}>
                  {busy ? 'Saqlanmoqda…' : '💾 Saqlash'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    // Android'da react-native-maps Google Maps API kaliti talab qiladi (kaliti yo'q bo'lsa
    // native crash beradi). Buning o'rniga WebView+Leaflet'ga asoslangan `LeafletMap`
    // komponentini ishlatamiz — hamma telefonlarda ishlaydi, API kaliti kerak emas.
    if (Platform.OS === 'android') {
      const markers: LeafletMarker[] = [
        { id: 'warehouse', lat: WAREHOUSE[0], lng: WAREHOUSE[1], color: '#10B981', icon: '🏭', label: 'Asosiy Ombor' },
      ];
      const polylines: LeafletPolyline[] = [];
      items.forEach((d) => {
        const tc = tripCoords(d);
        if (!tc) return;
        const st = str(d, 'status');
        markers.push({
          id: String(idOf(d)),
          lat: tc[0],
          lng: tc[1],
          color: st === 'yetkazildi' ? '#22C55E' : st === 'yolda' ? '#F59E0B' : '#64748B',
          icon: st === 'yolda' ? '🚚' : st === 'yetkazildi' ? '✅' : '⏱️',
          label: `${str(d, 'trip_code')} · ${str(d, 'client_name')}`,
        });
        const info = routeCache[String(idOf(d))];
        if (info && info.coords.length >= 2 && (idOf(d) === idOf(selectedTrip) || st === 'yolda' || st === 'yetkazildi')) {
          polylines.push({ id: `pl-${idOf(d)}`, coords: info.coords, color: '#2563EB', weight: 4 });
        } else if (tc) {
          polylines.push({ id: `pl-${idOf(d)}`, coords: [WAREHOUSE, tc], color: '#64748B', weight: 2 });
        }
      });
      return (
        <Card style={s.mapWrap}>
          <View style={s.mapHead}>
            <Text style={s.mapTitle}>Jonli Marshrutlar Xaritasi</Text>
            <View style={s.liveBadge}>
              <Text style={s.liveBadgeText}>● JONLI</Text>
            </View>
            {activeCount > 0 ? (
              <View style={s.onwayBadge}>
                <Text style={s.onwayBadgeText}>{activeCount} {'ta yo\'lda'}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.mapView}>
            <LeafletMap
              center={selectedTrip ? tripCoords(selectedTrip) : WAREHOUSE}
              zoom={11}
              markers={markers}
              polylines={polylines}
              onMarkerPress={(id) => {
                const d = items.find((x) => String(idOf(x)) === id);
                if (d) setSelectedId(idOf(d));
              }}
            />
          </View>
        </Card>
      );
    }

    if (!MapView) {
      return (
        <Card style={s.mapFallback}>
          <H1>Xarita mavjud emas</H1>
          <Muted>
            Mobil ilovaning web rejimida xarita faqat shu komponent orqali ko'rinadi.
          </Muted>
          {items.map((d) => (
            <TouchableOpacity
              key={String(idOf(d))}
              style={s.mapFallbackRow}
              onPress={() => {
                setSelectedId(idOf(d));
                setMapTrip(d);
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
          routeCache[String(idOf(driving[0]))]?.coords?.length > 1
            ? routeCache[String(idOf(driving[0]))].coords
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
              <Text style={s.onwayBadgeText}>{activeCount} {'ta yo\'lda'}</Text>
            </View>
          ) : null}
        </View>

        <MapView
          provider={MAP_PROVIDER}
          mapType="standard"
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
          {UrlTile ? (
            <UrlTile urlTemplate={OSM_STREET} maximumZ={19} flipY={false} />
          ) : null}
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
                {renderTripCards()}
              </View>
            )}
            {(layoutMode === 'split' || layoutMode === 'map') && renderMap()}
          </>
        )}
      </ScrollView>

      {/* To'liq ekran xarita (har bir reys uchun) */}
      <FullScreenMap
        trip={mapTrip}
        route={mapTrip ? routeCache[String(idOf(mapTrip))] : undefined}
        progress={!mapTrip ? 0 : selectedProgressFor(mapTrip)}
        colors={colors}
        onClose={() => setMapTrip(null)}
      />

      {/* Holat select tegi */}
      <StatusSelect
        trip={selectRow}
        value={selectRow ? draftStatus(selectRow) : 'kutilmoqda'}
        colors={colors}
        onClose={() => setSelectRow(null)}
        onPick={(next) => {
          if (selectRow) {
            setStatusDraft((p) => ({ ...p, [String(idOf(selectRow))]: next }));
          }
          setSelectRow(null);
        }}
      />
    </Screen>
  );
};

// ---------- Holat select tegi (faqat status o'zgartirish) ----------
const StatusSelect: React.FC<{
  trip: Rec | null;
  value: TripStatus;
  colors: Palette;
  onClose: () => void;
  onPick: (next: TripStatus) => void;
}> = ({ trip, value, colors, onClose, onPick }) => {
  const s = makeSelectStyles(colors);
  return (
    <Modal visible={!!trip} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.box} activeOpacity={1} onPress={() => {}}>
          <Text style={s.title}>Holatni tanlang</Text>
          {trip ? (
            <Text style={s.sub}>
              {str(trip, 'trip_code')} · {str(trip, 'client_name') || str(trip, 'destination_address')}
            </Text>
          ) : null}
          {STATUSES.map((st) => (
            <TouchableOpacity
              key={st}
              style={[s.option, value === st && s.optionActive]}
              onPress={() => onPick(st)}
            >
              <View style={[s.dot, { backgroundColor: badgeColor(st, colors) }]} />
              <Text style={[s.optionText, value === st && s.optionTextActive]}>{statusLabel(st)}</Text>
              {value === st ? <Text style={s.check}>✓</Text> : null}
            </TouchableOpacity>
          ))}
          <Text style={s.hint}>Tanlagach jadvaldagi «💾 Saqlash» tugmasini bosing.</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ---------- To'liq ekran OpenStreetMap (har bir reys uchun) ----------
const FullScreenMap: React.FC<{
  trip: Rec | null;
  route?: RouteInfo;
  progress: number;
  colors: Palette;
  onClose: () => void;
}> = ({ trip, route, progress, colors, onClose }) => {
  const s = makeMapStyles(colors);
  const [layer, setLayer] = useState<'street' | 'satellite'>('street');
  const [cam, setCam] = useState({
    latitude: WAREHOUSE[0],
    longitude: WAREHOUSE[1],
    latitudeDelta: 0.08,
    longitudeDelta: 0.13,
  });
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<any>(null);

  const dest = trip ? tripCoords(trip) : TASHKENT;
  const road = route && route.coords.length > 1 ? route.coords : null;
  const st = trip ? str(trip, 'status') : '';
  const prog = st === 'yetkazildi' ? 1 : st === 'kutilmoqda' ? 0 : progress;

  // Reysga borganda kamerani marshrut bo'ylab moslash
  const tripKey = trip ? String(idOf(trip)) : '';
  useEffect(() => {
    if (!trip) return;
    const next = {
      latitude: (WAREHOUSE[0] + dest[0]) / 2,
      longitude: (WAREHOUSE[1] + dest[1]) / 2,
      latitudeDelta: Math.max(0.03, Math.abs(dest[0] - WAREHOUSE[0]) * 2.4),
      longitudeDelta: Math.max(0.05, Math.abs(dest[1] - WAREHOUSE[1]) * 2.4),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kamerani reysga moslash
    setCam(next);
    const t = setTimeout(() => mapRef.current?.animateToRegion(next, 450), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey]);

  const zoomBy = (factor: number) => {
    const nd = Math.min(1.5, Math.max(0.002, cam.latitudeDelta * factor));
    const next = { ...cam, latitudeDelta: nd, longitudeDelta: nd * 1.7 };
    setCam(next);
    mapRef.current?.animateToRegion(next, 220);
  };

  const goToMe = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Joriy lokatsiya', 'Bu funksiya telefonda ishlaydi.');
      return;
    }
    try {
      setLocating(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Ruxsat kerak', 'Joriy lokatsiyani ko‘rish uchun ruxsat bering.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.03,
      };
      setUserPos([next.latitude, next.longitude]);
      setCam(next);
      mapRef.current?.animateToRegion(next, 400);
    } catch {
      Alert.alert('Xatolik', 'Lokatsiyani aniqlab bo‘lmadi.');
    } finally {
      setLocating(false);
    }
  };

  // --- Yo'l taqqoslash: road (OSRM) vs to'g'ri chiziq ---
  const roadKm = road ? pathLengthKm(road) : 0;
  const directKm = haversineKm(WAREHOUSE, dest);
  const shownKm = road ? roadKm : directKm;
  const deltaKm = road ? Math.max(0, roadKm - directKm) : 0;
  const deltaPct = directKm > 0 ? Math.round((deltaKm / directKm) * 100) : 0;

  const driverPos: [number, number] | null =
    road && (st === 'yolda' || st === 'yetkazildi') ? pointAlongCoords(road, prog) : null;

  const mapBody = () => {
    if (Platform.OS === 'web') {
      const bboxList = [WAREHOUSE, dest, ...(road ?? [])];
      const lats = bboxList.map((c) => c[0]);
      const lngs = bboxList.map((c) => c[1]);
      const pad = 0.01;
      const bbox = [
        Math.min(...lngs) - pad,
        Math.min(...lats) - pad,
        Math.max(...lngs) + pad,
        Math.max(...lats) + pad,
      ].join('%2C');
      return React.createElement('iframe' as never, {
        title: 'OpenStreetMap',
        src: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${dest[0]}%2C${dest[1]}`,
        style: { flex: 1, width: '100%', border: 'none' } as never,
      });
    }

    // Android — react-native-maps o'rniga LeafletMap (WebView ichida)
    if (Platform.OS === 'android') {
      const markers: LeafletMarker[] = [
        { id: 'wh', lat: WAREHOUSE[0], lng: WAREHOUSE[1], color: '#10B981', icon: '🏭', label: 'Asosiy Ombor' },
        { id: 'dest', lat: dest[0], lng: dest[1], color: '#EF4444', icon: '📍', label: str(trip ?? {}, 'client_name') || 'Manzil' },
      ];
      if (driverPos) markers.push({ id: 'drv', lat: driverPos[0], lng: driverPos[1], color: '#2563EB', icon: '🚚', label: 'Haydovchi' });
      const polylines: LeafletPolyline[] = [];
      if (road && road.length >= 2) polylines.push({ id: 'road', coords: road, color: colors.blue, weight: 5 });
      polylines.push({ id: 'direct', coords: [WAREHOUSE, dest], color: colors.muted, weight: 2 });
      return (
        <LeafletMap
          center={driverPos || dest}
          zoom={12}
          layer={layer}
          markers={markers}
          polylines={polylines}
        />
      );
    }

    if (!MapView || !UrlTile) {
      return (
        <View style={s.noMap}>
          <Text style={s.noMapTitle}>Xarita faqat APK (build) da ochiladi</Text>
          <Muted>OpenStreetMap plitalari uchun ilovani qurib o‘rnating.</Muted>
        </View>
      );
    }

    const tileUrl = layer === 'street' ? OSM_STREET : OSM_SATELLITE;

    return (
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={s.map}
        mapType="none"
        zoomControlEnabled={false}
        showsUserLocation={false}
        initialRegion={cam}
        region={cam}
        onRegionChangeComplete={(r: any) => setCam(r)}
      >
        <UrlTile urlTemplate={tileUrl} maximumZ={19} minimumZ={0} flipY={layer === 'satellite'} zIndex={-1} />

        {/* Ombor */}
        <Marker coordinate={{ latitude: WAREHOUSE[0], longitude: WAREHOUSE[1] }} title="Asosiy Ombor" anchor={{ x: 0.5, y: 0.5 }}>
          <Text style={s.markerEmoji}>🏭</Text>
        </Marker>

        {/* Manzil */}
        <Marker coordinate={{ latitude: dest[0], longitude: dest[1] }} title={str(trip ?? {}, 'client_name')} description={str(trip ?? {}, 'destination_address')} anchor={{ x: 0.5, y: 1 }}>
          <Text style={s.markerEmoji}>📍</Text>
        </Marker>

        {/* Road route (OSRM) */}
        {road ? (
          <Polyline
            coordinates={road.map(([la, ln]) => ({ latitude: la, longitude: ln }))}
            strokeColor={colors.blue}
            strokeWidth={5}
          />
        ) : null}

        {/* Taqqoslash uchun to'g'ri chiziq */}
        <Polyline
          coordinates={[
            { latitude: WAREHOUSE[0], longitude: WAREHOUSE[1] },
            { latitude: dest[0], longitude: dest[1] },
          ]}
          strokeColor={colors.muted}
          strokeWidth={2}
          lineDashPattern={[6, 6]}
        />

        {/* Jonli haydovchi */}
        {driverPos ? (
          <Marker
            coordinate={{ latitude: driverPos[0], longitude: driverPos[1] }}
            title={`Haydovchi: ${str(trip ?? {}, 'driver_name') || '—'}`}
            description={`${Math.round(prog * 100)}% · ${fmtRoadDistance(shownKm * (1 - prog))} qoldi`}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={s.driverBubble}>
              <Text style={s.driverEmoji}>🚚</Text>
            </View>
          </Marker>
        ) : null}

        {/* Joriy lokatsiya */}
        {userPos ? (
          <Marker
            coordinate={{ latitude: userPos[0], longitude: userPos[1] }}
            title="Mening joylashuvim"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={s.userDot} />
          </Marker>
        ) : null}
      </MapView>
    );
  };

  return (
    <Modal visible={!!trip} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        {mapBody()}

        {/* Tepa panel: orqaga + sarlavha + plita rejimi */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={onClose}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={s.topTitle}>
            <Text style={s.topTitleMain} numberOfLines={1}>
              {trip ? str(trip, 'trip_code') || 'Reys' : 'OpenStreetMap'}
            </Text>
            <Text style={s.topTitleSub} numberOfLines={1}>
              {trip ? `${str(trip, 'driver_name') || '—'} · ${str(trip, 'vehicle_plate')}` : 'To‘liq ekran'}
            </Text>
          </View>
          <View style={s.layerRow}>
            <TouchableOpacity
              style={[s.layerBtn, layer === 'street' && s.layerBtnActive]}
              onPress={() => setLayer('street')}
            >
              <Text style={[s.layerBtnText, layer === 'street' && s.layerBtnTextActive]}>🛣 Ko‘cha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.layerBtn, layer === 'satellite' && s.layerBtnActive]}
              onPress={() => setLayer('satellite')}
            >
              <Text style={[s.layerBtnText, layer === 'satellite' && s.layerBtnTextActive]}>🛰 Sputnik</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pastki panel: reys ma'lumoti + boshqaruv + yo'l taqqoslash */}
        <View style={s.bottom}>
          <View style={s.bottomHead}>
            <Text style={s.bottomTrip} numberOfLines={1}>
              {trip ? str(trip, 'client_name') || str(trip, 'destination_address') : ''}
            </Text>
            <View style={[s.livePill, st === 'yolda' ? s.livePillOn : s.livePillOff]}>
              <Text style={[s.livePillText, { color: st === 'yolda' ? colors.green : colors.faint }]}>
                {st === 'yolda' ? '● JONLI' : statusLabel(st)}
              </Text>
            </View>
          </View>
          <Text style={s.bottomAddr} numberOfLines={1}>
            📍 {trip ? str(trip, 'destination_address') : '—'}
          </Text>

          <View style={s.compareRow}>
            <View style={s.compareBox}>
              <Text style={s.compareLabel}>Yo‘l (OSRM)</Text>
              <Text style={[s.compareValue, { color: colors.blue }]}>{fmtRoadDistance(roadKm)}</Text>
            </View>
            <View style={s.compareBox}>
              <Text style={s.compareLabel}>To‘g‘ri chiziq</Text>
              <Text style={[s.compareValue, { color: colors.muted }]}>{fmtRoadDistance(directKm)}</Text>
            </View>
            <View style={s.compareBox}>
              <Text style={s.compareLabel}>Farq</Text>
              <Text style={[s.compareValue, { color: colors.gold }]}>
                +{fmtRoadDistance(deltaKm)} ({deltaPct}%)
              </Text>
            </View>
          </View>

          {st === 'yolda' || st === 'yetkazildi' ? (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${Math.round(prog * 100)}%` }]} />
              </View>
              <Text style={s.progressMeta}>
                {Math.round(prog * 100)}% · qolgan {fmtRoadDistance(shownKm * (1 - prog))}
                {route && route.duration > 0 ? ` · ~${fmtRoadDuration(route.duration * (1 - prog))}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Boshqaruv: zoom + joriy lokatsiya (yagona, pastda) */}
          <View style={s.ctrlBar}>
            <Text style={s.ctrlBarLabel}>Xarita boshqaruvi</Text>
            <View style={s.ctrlBarBtns}>
              <TouchableOpacity style={s.ctrlBtn} onPress={() => zoomBy(0.6)}>
                <Text style={s.ctrlBtnText}>＋</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ctrlBtn} onPress={() => zoomBy(1 / 0.6)}>
                <Text style={s.ctrlBtnText}>－</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.ctrlBtn, s.ctrlBtnLoc, locating && s.ctrlBtnBusy]} onPress={goToMe}>
                <Text style={s.ctrlBtnText}>📍</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.attr}>© OpenStreetMap · {layer === 'street' ? 'mapnik' : 'Esri World Imagery'}</Text>
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
    tableEmpty: { padding: 24, alignItems: 'center' },
    tableEmptyText: { color: colors.faint, fontSize: 12 },
    tdMono: { color: colors.text, fontSize: 11, fontWeight: '700' },
    tdBold: { fontSize: 12, fontWeight: '700' },
    tdSub: { color: colors.faint, fontSize: 10, marginTop: 2 },
    tdSubItalic: { color: colors.faint, fontSize: 10, fontStyle: 'italic', marginTop: 2 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    cardList: { gap: 10 },
    tripCard: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      backgroundColor: colors.card,
      padding: 12,
      gap: 8,
    },
    tripCardSel: { borderColor: colors.gold, backgroundColor: colors.gold + '0D' },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardHeadMain: { flex: 1 },
    idxBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.gold + '26',
      alignItems: 'center',
      justifyContent: 'center',
    },
    idxBadgeText: { color: colors.gold, fontWeight: '900', fontSize: 13 },
    cardCode: { color: colors.gold, fontWeight: '900', fontSize: 14 },
    cardDate: { color: colors.faint, fontSize: 11, marginTop: 2 },
    lockedBanner: {
      color: colors.red,
      fontSize: 11,
      fontWeight: '700',
      backgroundColor: colors.red + '14',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    divider: { height: 1, backgroundColor: colors.cardBorder },
    block: { gap: 3 },
    blockLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    blockValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
    blockSub: { color: colors.faint, fontSize: 12, marginTop: 2 },
    feeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    feeInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      backgroundColor: colors.input,
      textAlign: 'right',
    },
    feeInputLocked: { opacity: 0.6, backgroundColor: colors.bg },
    feeSuffix: { color: colors.faint, fontSize: 12, fontWeight: '700' },
    feeHint: { color: colors.green, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    selectBtn: {
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 112,
      alignItems: 'center',
      backgroundColor: colors.input,
    },
    selectBtnLocked: { opacity: 0.7 },
    selectBtnDirty: { borderColor: colors.gold, backgroundColor: colors.gold + '1A' },
    selectBtnText: { fontSize: 12, fontWeight: '800' },
    mapBtn: {
      flex: 1,
      backgroundColor: colors.blue,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    mapBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    saveBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    saveBtnActive: { backgroundColor: colors.gold },
    saveBtnIdle: { backgroundColor: colors.cardBorder },
    saveBtnBusy: { opacity: 0.7 },
    saveBtnText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
    saveBtnTextActive: { color: '#000' },
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
  });

const makeSelectStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
    box: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.cardBorder },
    title: { color: colors.text, fontWeight: '900', fontSize: 15 },
    sub: { color: colors.muted, fontSize: 12, marginBottom: 6 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
      backgroundColor: colors.input,
    },
    optionActive: { borderColor: colors.gold, backgroundColor: colors.gold + '1A' },
    dot: { width: 10, height: 10, borderRadius: 5 },
    optionText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
    optionTextActive: { color: colors.gold, fontWeight: '900' },
    check: { color: colors.gold, fontSize: 16, fontWeight: '900' },
    hint: { color: colors.faint, fontSize: 11, marginTop: 4 },
  });

const makeMapStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    noMap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
    noMapTitle: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center' },
    markerEmoji: { fontSize: 26 },
    driverBubble: {
      backgroundColor: colors.gold,
      borderRadius: 18,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderWidth: 2,
      borderColor: '#000',
    },
    driverEmoji: { fontSize: 16 },
    userDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#2563EB',
      borderWidth: 3,
      borderColor: '#fff',
    },
    topBar: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 54 : 26,
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card + 'F2',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 8,
      paddingVertical: 7,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnText: { color: '#000', fontSize: 22, fontWeight: '900', lineHeight: 26 },
    topTitle: { flex: 1 },
    topTitleMain: { color: colors.text, fontWeight: '900', fontSize: 13 },
    topTitleSub: { color: colors.faint, fontSize: 10, marginTop: 1 },
    layerRow: { flexDirection: 'row', gap: 4 },
    layerBtn: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 8,
      backgroundColor: colors.input,
    },
    layerBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    layerBtnText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
    layerBtnTextActive: { color: '#000' },
    ctrlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: colors.input,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginTop: 4,
    },
    ctrlBarLabel: { color: colors.faint, fontSize: 11, fontWeight: '700' },
    ctrlBarBtns: { flexDirection: 'row', gap: 6 },
    ctrlBtn: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctrlBtnLoc: { backgroundColor: colors.gold, borderColor: colors.gold },
    ctrlBtnBusy: { opacity: 0.6 },
    ctrlBtnText: { color: colors.text, fontSize: 19, fontWeight: '900' },
    bottom: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: Platform.OS === 'ios' ? 34 : 16,
      backgroundColor: colors.card + 'F5',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      gap: 6,
    },
    bottomHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bottomTrip: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 13 },
    livePill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    livePillOn: { backgroundColor: colors.green + '22' },
    livePillOff: { backgroundColor: colors.cardBorder },
    livePillText: { fontSize: 10, fontWeight: '900' },
    bottomAddr: { color: colors.faint, fontSize: 11 },
    compareRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    compareBox: {
      flex: 1,
      backgroundColor: colors.input,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    compareLabel: { color: colors.faint, fontSize: 9, fontWeight: '700' },
    compareValue: { fontSize: 12, fontWeight: '900', marginTop: 2 },
    progressWrap: { gap: 4, marginTop: 4 },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.cardBorder, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.blue },
    progressMeta: { color: colors.muted, fontSize: 11, fontWeight: '700' },
    attr: { color: colors.faint, fontSize: 9, textAlign: 'right', marginTop: 2 },
  });