import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Screen, Loader } from '../../components';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
const str = (r: Rec, k: string): string => String(r[k] ?? '');
const numOrNull = (v: unknown): number | null => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};
const isMine = (r: Rec, name: string): boolean => {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return str(r, 'driver_name').toLowerCase().includes(n);
};

const DEFAULT_CENTER: [number, number] = [41.311, 69.2405]; // Toshkent

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDuration = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} soat ${m} daq`;
  if (m > 0) return `${m} daq ${sec} sek`;
  return `${sec} sek`;
};

const fmtDistance = (m: number): string => {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
};

const tripCoords = (r: Rec): [number, number] | null => {
  const la = numOrNull(r.lat);
  const ln = numOrNull(r.lng);
  if (la !== null && ln !== null) return [la, ln];
  return null;
};

// ===== Geocoding (Nominatim OSM) =====
const geocodeCache: Record<string, [number, number] | null> = {};

const geocode = async (q: string): Promise<[number, number] | null> => {
  const key = q.trim().toLowerCase();
  if (!key) return null;
  if (key in geocodeCache) return geocodeCache[key];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const j = await r.json();
    if (Array.isArray(j) && j.length > 0 && j[0].lat && j[0].lon) {
      const coords: [number, number] = [parseFloat(j[0].lat), parseFloat(j[0].lon)];
      geocodeCache[key] = coords;
      return coords;
    }
  } catch { /* */ }
  geocodeCache[key] = null;
  return null;
};

// Dastlabki tekshiruv — koordinata matn ichida bo'lsa (masalan "41.3111, 69.2406")
const parseInlineCoords = (text: string): [number, number] | null => {
  if (!text) return null;
  const m = text.match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[2]);
  if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) {
    return [a, b];
  }
  return null;
};

// ===== Leaflet dynamic load =====
const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';

const loadLink = (href: string): Promise<void> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve();
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = () => resolve();
    l.onerror = () => resolve();
    document.head.appendChild(l);
  });

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('no DOM'));
    if ((window as any).L) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('leaflet load fail'));
    document.head.appendChild(s);
  });

let leafletReady: Promise<any> | null = null;
const ensureLeaflet = (): Promise<any> => {
  if (leafletReady) return leafletReady;
  leafletReady = (async () => {
    await loadLink(LEAFLET_CSS);
    await loadScript(LEAFLET_JS);
    return (window as any).L;
  })();
  return leafletReady;
};

type Layer = 'street' | 'satellite';

// ===== Web Map Component =====
const WebMap: React.FC<{
  colors: Palette;
  myPos: [number, number] | null;
  trips: Rec[];
  activeTrip: Rec | null;
  layer: Layer;
}> = ({ colors, myPos, trips, activeTrip, layer }) => {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const meMarkerRef = useRef<any>(null);
  const tripMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const [, setReady] = useState(false);

  // Init map
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    (async () => {
      const L = await ensureLeaflet();
      if (cancelled || !containerRef.current) return;
      // Clean host
      const host = containerRef.current as HTMLElement;
      host.style.width = '100%';
      host.style.height = '100%';
      host.innerHTML = '';
      const map = L.map(host, {
        center: myPos ?? DEFAULT_CENTER,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* */ }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch tile layer
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (tileRef.current) {
      try { mapRef.current.removeLayer(tileRef.current); } catch { /* */ }
    }
    const url = layer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png';
    tileRef.current = L.tileLayer(url, { maxZoom: 19 }).addTo(mapRef.current);
  }, [layer]);

  // My position marker
  useEffect(() => {
    if (!mapRef.current || !myPos) return;
    const L = (window as any).L;
    if (meMarkerRef.current) {
      meMarkerRef.current.setLatLng(myPos);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:26px;height:26px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:${colors.gold};opacity:0.25;animation:pulse 2s infinite;"></div>
            <div style="position:absolute;inset:7px;border-radius:50%;background:${colors.gold};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
          </div>
          <style>@keyframes pulse{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.6);opacity:0}}</style>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      meMarkerRef.current = L.marker(myPos, { icon }).addTo(mapRef.current);
    }
  }, [myPos, colors.gold]);

  // Trip markers
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    tripMarkersRef.current.forEach((m) => {
      try { mapRef.current.removeLayer(m); } catch { /* */ }
    });
    tripMarkersRef.current = [];
    trips.forEach((t, idx) => {
      const c = tripCoords(t);
      if (!c) return;
      const isActive = activeTrip && String(t.id) === String(activeTrip.id);
      const color = isActive ? '#3B82F6' : colors.gold;
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="width:32px;height:40px;position:relative;">
            <div style="position:absolute;top:0;left:0;width:32px;height:32px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px;font-family:sans-serif;">${idx + 1}</div>
            <div style="position:absolute;top:28px;left:12px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:10px solid ${color};"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });
      const m = L.marker(c, { icon }).addTo(mapRef.current);
      m.bindPopup(`
        <div style="font-family:sans-serif;font-size:13px;min-width:160px;">
          <div style="font-weight:900;color:#111;margin-bottom:4px;">${(t.client_name as string) ?? '—'}</div>
          <div style="color:#555;font-size:12px;">${(t.destination_address as string) ?? ''}</div>
        </div>
      `);
      tripMarkersRef.current.push(m);
    });
  }, [trips, activeTrip, colors.gold]);

  // Route line (blue) from myPos → activeTrip
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (routeLineRef.current) {
      try { mapRef.current.removeLayer(routeLineRef.current); } catch { /* */ }
      routeLineRef.current = null;
    }
    if (!myPos || !activeTrip) return;
    const c = tripCoords(activeTrip);
    if (!c) return;
    let cancelled = false;
    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${myPos[1]},${myPos[0]};${c[1]},${c[0]}?overview=full&geometries=geojson`;
        const r = await fetch(url);
        const j = await r.json();
        if (cancelled) return;
        const coords: [number, number][] = (j?.routes?.[0]?.geometry?.coordinates ?? [])
          .map((p: [number, number]) => [p[1], p[0]]);
        const line = coords.length
          ? L.polyline(coords, { color: '#3B82F6', weight: 5, opacity: 0.9 })
          : L.polyline([myPos, c], { color: '#3B82F6', weight: 5, opacity: 0.9, dashArray: '8,8' });
        line.addTo(mapRef.current);
        routeLineRef.current = line;
        try {
          mapRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
        } catch { /* */ }
      } catch {
        const fallback = L.polyline([myPos, c], { color: '#3B82F6', weight: 5, opacity: 0.9, dashArray: '8,8' }).addTo(mapRef.current);
        routeLineRef.current = fallback;
      }
    })();
    return () => { cancelled = true; };
  }, [myPos, activeTrip]);

  return <View ref={containerRef} style={{ flex: 1 }} />;
};

export const DriverMapScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const driverName = session?.name ?? '';

  const [trips, setTrips] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [layer, setLayer] = useState<Layer>('street');
  const [permDenied, setPermDenied] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [company, setCompany] = useState<Rec | null>(null);
  const [summary, setSummary] = useState<{ trip: Rec; distanceM: number; durationS: number } | null>(null);
  const [geoByTrip, setGeoByTrip] = useState<Record<string, [number, number]>>({});
  const [companyCoords, setCompanyCoords] = useState<[number, number] | null>(null);

  type RouteStep = { name: string; distance: number; duration: number };
  type RouteInfo = {
    coords: [number, number][];
    distance: number; // metr
    duration: number; // sekund
    steps: RouteStep[];
  };
  const [routes, setRoutes] = useState<Record<string, RouteInfo>>({});
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({});

  // Reys tarixi — har bir reys uchun bosib o'tilgan masofa va vaqt
  const trackingRef = useRef<Record<string, {
    startTs: number;
    lastPos: [number, number] | null;
    distanceM: number;
  }>>({});
  const [tickVer, setTickVer] = useState(0);

  // Timer — har sekundda UI yangilansin (vaqt o'tishi)
  useEffect(() => {
    const t = setInterval(() => setTickVer((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Korxona ma'lumotini yuklash + koordinatlarni aniqlash
  useEffect(() => {
    (async () => {
      try {
        const c = await api.company.get();
        setCompany(c);
        if (!c) return;
        const la = numOrNull(c.lat);
        const ln = numOrNull(c.lng);
        if (la !== null && ln !== null) {
          setCompanyCoords([la, ln]);
          return;
        }
        // Matn ichida koordinata bor-yo'qligi (masalan location: "41.311, 69.240")
        const inline = parseInlineCoords(String(c.location ?? '')) || parseInlineCoords(String(c.address ?? ''));
        if (inline) {
          setCompanyCoords(inline);
          return;
        }
        // Nominatim geocoding
        const target = String(c.address || c.location || c.name || '');
        if (target) {
          const g = await geocode(target);
          if (g) setCompanyCoords(g);
        }
      } catch {
        setCompany(null);
      }
    })();
  }, []);

  // Reyslar uchun koordinata aniqlash — yo'q bo'lsa geocoding
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const t of trips) {
        const id = String(t.id ?? '');
        if (!id || geoByTrip[id]) continue;
        if (tripCoords(t)) continue; // allaqachon bor
        const addr = String(t.destination_address || t.client_name || '');
        if (!addr) continue;
        const inline = parseInlineCoords(addr);
        if (inline) {
          if (!cancelled) setGeoByTrip((p) => ({ ...p, [id]: inline }));
          continue;
        }
        // Nominatim rate-limit (1/s) — ketma-ket, kichik kechikish
        const g = await geocode(`${addr}, Toshkent, Uzbekistan`);
        if (cancelled) return;
        if (g) setGeoByTrip((p) => ({ ...p, [id]: g }));
        await new Promise((r) => setTimeout(r, 1100));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);

  // Enriched trips — koordinata yo'q bo'lganlarga geocodedanni biriktirish
  const tripsEnriched = useMemo(() => trips.map((t) => {
    const id = String(t.id ?? '');
    if (tripCoords(t)) return t;
    const g = geoByTrip[id];
    if (g) return { ...t, lat: g[0], lng: g[1] };
    return t;
  }), [trips, geoByTrip]);

  // Avval "yolda" bo'lgan reyslar uchun — tracker avtomatik yarat
  useEffect(() => {
    for (const t of trips) {
      const id = String(t.id ?? '');
      const st = str(t, 'status').toLowerCase();
      const isRoute = st === 'yolda' || st.includes("yo'lda");
      if (isRoute && !trackingRef.current[id]) {
        // started_at backend'dan kelgan bo'lsa — undan foydalanish
        const startedAt = t.started_at ? new Date(String(t.started_at)).getTime() : Date.now();
        trackingRef.current[id] = {
          startTs: Number.isFinite(startedAt) ? startedAt : Date.now(),
          lastPos: myPos,
          distanceM: 0,
        };
      }
    }
  }, [trips, myPos]);

  // OSRM route (distance+duration+steps) har bir reys uchun
  useEffect(() => {
    // Korxona bo'lmasa — haydovchining joriy joyidan boshlanadi
    const startPos: [number, number] | null = companyCoords ?? myPos;
    if (!startPos) return;
    let cancelled = false;
    (async () => {
      for (const t of tripsEnriched) {
        const id = String(t.id ?? '');
        if (!id || routes[id]) continue;
        const dest = tripCoords(t);
        if (!dest) continue;
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${startPos[1]},${startPos[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&steps=true`;
          const r = await fetch(url);
          const j = await r.json();
          if (cancelled) return;
          const route = j?.routes?.[0];
          if (!route) continue;
          const coords: [number, number][] = (route.geometry?.coordinates ?? [])
            .map((p: [number, number]) => [p[1], p[0]]);
          const steps: RouteStep[] = (route.legs?.[0]?.steps ?? []).map((st: any) => ({
            name: String(st.name || st.maneuver?.type || '—'),
            distance: Number(st.distance || 0),
            duration: Number(st.duration || 0),
          }));
          setRoutes((prev) => ({
            ...prev,
            [id]: {
              coords,
              distance: Number(route.distance || 0),
              duration: Number(route.duration || 0),
              steps,
            },
          }));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripsEnriched, companyCoords, myPos]);

  const changeStatus = useCallback(async (trip: Rec, newStatus: string) => {
    const id = String(trip.id ?? '');
    if (!id) return;
    setBusyId(id);
    try {
      let extras: { traveled_distance_m?: number; traveled_duration_s?: number } | undefined;

      if (newStatus === 'yolda') {
        // Tracking boshlash
        trackingRef.current[id] = {
          startTs: Date.now(),
          lastPos: myPos,
          distanceM: 0,
        };
      }

      if (newStatus === 'yetkazildi') {
        const tr = trackingRef.current[id];
        if (tr) {
          const durationS = Math.round((Date.now() - tr.startTs) / 1000);
          extras = { traveled_distance_m: Math.round(tr.distanceM), traveled_duration_s: durationS };
          setSummary({ trip, distanceM: tr.distanceM, durationS });
          delete trackingRef.current[id];
        }
      }

      await api.deliveries.changeStatus(id, newStatus, extras);
      // optimistic update
      setTrips((prev) => prev.map((r) => (String(r.id) === id ? { ...r, status: newStatus } : r)));
      if (newStatus === 'yetkazildi') {
        setTrips((prev) => prev.filter((r) => String(r.id) !== id));
        setActiveId(null);
      }
    } catch {
      /* fail silently; refresh soon */
    } finally {
      setBusyId(null);
    }
  }, [myPos]);

  const loadTrips = useCallback(async () => {
    try {
      const list = await api.deliveries.list();
      const mine = (list as Rec[])
        .filter((r) => isMine(r, driverName))
        .filter((r) => {
          const st = str(r, 'status').toLowerCase();
          return st !== 'yetkazildi' && st !== 'bekor' && st !== 'completed';
        });
      setTrips(mine);
      if (!activeId && mine.length) {
        // Yolda bo'lgan reys bor bo'lsa — birinchi uni tanlash
        const inRoute = mine.find((r) => {
          const st = String(r.status ?? '').toLowerCase();
          return st === 'yolda' || st.includes("yo'lda");
        });
        setActiveId(String((inRoute ?? mine[0]).id ?? ''));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [driverName, activeId]);

  // Load trips + refresh every 20s
  useEffect(() => {
    loadTrips();
    const t = setInterval(loadTrips, 20000);
    return () => clearInterval(t);
  }, [loadTrips]);

  // Live location
  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setPermDenied(true);
        return;
      }
      setPermDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setMyPos([pos.coords.latitude, pos.coords.longitude]);
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 5 },
        (p) => {
          const np: [number, number] = [p.coords.latitude, p.coords.longitude];
          setMyPos(np);
          // Faol yo'ldagi reyslar uchun masofa tracking
          const t = trackingRef.current;
          for (const id of Object.keys(t)) {
            const tr = t[id];
            if (tr.lastPos) {
              const d = haversine(tr.lastPos[0], tr.lastPos[1], np[0], np[1]);
              if (d > 2 && d < 500) tr.distanceM += d; // noise filter
            }
            tr.lastPos = np;
          }
        },
      );
    })();
    return () => { watcher?.remove(); };
  }, []);

  const activeTrip = useMemo(
    () => tripsEnriched.find((t) => String(t.id) === String(activeId)) ?? null,
    [tripsEnriched, activeId],
  );

  const zoom = (delta: number) => {
    const L = (window as any).L;
    const container = document.querySelector('.leaflet-container') as any;
    if (!container || !container._leaflet_id || !L) return;
    // Simpler: dispatch via Leaflet map instance stored in closure — we re-use via custom event
    const ev = new CustomEvent('driver-map-zoom', { detail: delta });
    window.dispatchEvent(ev);
  };

  const [zoomBump, setZoomBump] = useState(0);
  useEffect(() => {
    const handler = (ev: any) => {
      setZoomBump((n) => n + 1);
      // we attach to window.__dmap
      const map = (window as any).__dmap;
      if (map) {
        map.setZoom(map.getZoom() + ev.detail);
      }
    };
    window.addEventListener('driver-map-zoom', handler as any);
    return () => window.removeEventListener('driver-map-zoom', handler as any);
  }, []);

  const centerMe = () => {
    const map = (window as any).__dmap;
    if (map && myPos) map.setView(myPos, 16);
  };

  if (Platform.OS !== 'web') {
    return (
      <Screen>
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 15 }}>
            Xarita faqat web versiyada mavjud (hozircha). Native uchun yangilash yo'lda.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={s.root}>
      {loading && !myPos ? (
        <View style={s.overlay}><Loader /></View>
      ) : null}

      <MapContainer
        colors={colors}
        myPos={myPos}
        trips={tripsEnriched}
        activeTrip={activeTrip}
        layer={layer}
        warehouse={companyCoords}
      />

      {/* Top bar — title + layer toggles */}
      <View style={s.topBar} pointerEvents="box-none">
        <View style={s.topTitle}>
          <View style={[s.liveDot, { backgroundColor: '#22C55E' }]} />
          <Text style={s.topTitleText}>Jonli xarita</Text>
          <Text style={s.topHint}>· {trips.length}</Text>
        </View>
        <View style={s.layerCtrl}>
          <TouchableOpacity
            onPress={() => setLayer('street')}
            style={[s.layerBtn, layer === 'street' && s.layerBtnActive]}
          >
            <Text style={{ fontSize: 13 }}>🛣️</Text>
            <Text style={[s.layerText, layer === 'street' && s.layerTextActive]}>Ko'cha</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLayer('satellite')}
            style={[s.layerBtn, layer === 'satellite' && s.layerBtnActive]}
          >
            <Text style={{ fontSize: 13 }}>🛰️</Text>
            <Text style={[s.layerText, layer === 'satellite' && s.layerTextActive]}>Sputnik</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right controls — zoom + locate (layer tepasida joylashgan) */}
      <View style={s.rightCtrls} pointerEvents="box-none">
        <TouchableOpacity onPress={() => zoom(1)} style={s.ctrlBtn}>
          <Text style={s.ctrlText}>＋</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => zoom(-1)} style={s.ctrlBtn}>
          <Text style={s.ctrlText}>－</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={centerMe} style={s.ctrlBtn}>
          <Text style={s.ctrlText}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* === JONLI MARSHRUT CARDI (xarita ustida suzadi) — o'chirilgan === */}
      {activeTrip && false ? (() => {
        const t = activeTrip!;
        const id = String(t.id ?? '');
        const route = routes[id];
        const tracker = trackingRef.current[id];
        const traveled = tracker?.distanceM ?? 0;
        const elapsed = tracker ? Math.round((Date.now() - tracker.startTs) / 1000) : 0;
        const totalDist = route?.distance ?? 0;
        const totalDur = route?.duration ?? 0;
        const progress = totalDist > 0 ? Math.min(1, traveled / totalDist) : 0;
        const remainingDur = totalDur > 0 && progress > 0.02
          ? Math.max(0, Math.round(totalDur * (1 - progress)))
          : Math.max(0, totalDur - elapsed);
        const pct = Math.round(progress * 100);
        const st = str(activeTrip!, 'status').toLowerCase();
        const isRoute = st === 'yolda' || st.includes("yo'lda");
        const isDone = st === 'yetkazildi';

        return (
          <View style={[s.liveCard, { bottom: listOpen ? 290 : 68 }]} pointerEvents="box-none" key={`live-${tickVer}`}>
            {/* Trip info row */}
            <View style={s.liveCardHead}>
              <View style={{ flex: 1 }}>
                <View style={s.liveCardCodeRow}>
                  <Text style={s.liveCardCode}>{str(activeTrip!, 'trip_code') || `#${id}`}</Text>
                  <Text style={s.liveCardClient} numberOfLines={1}>
                    {str(activeTrip!, 'client_name') || '—'}
                  </Text>
                </View>
                <View style={s.liveCardAddrRow}>
                  <Text style={{ fontSize: 11 }}>📍</Text>
                  <Text style={s.liveCardAddr} numberOfLines={1}>
                    {str(activeTrip!, 'destination_address') || '—'}
                  </Text>
                </View>
              </View>
              <View style={[s.liveCardBadge, {
                backgroundColor: isDone ? '#22C55E22' : isRoute ? '#F59E0B22' : '#3B82F622',
                borderColor: isDone ? '#22C55E66' : isRoute ? '#F59E0B66' : '#3B82F666',
              }]}>
                <Text style={[s.liveCardBadgeText, {
                  color: isDone ? '#22C55E' : isRoute ? '#F59E0B' : '#3B82F6',
                }]}>
                  {isDone ? '✓ Yetkazilgan' : isRoute ? "🚚 Yo'lda" : '⏳ Kutilmoqda'}
                </Text>
              </View>
            </View>

            {/* Driver info + action */}
            <View style={s.liveCardDriverRow}>
              <Text style={s.liveCardDriverText} numberOfLines={1}>
                Haydovchi: <Text style={s.liveCardDriverName}>{str(activeTrip!, 'driver_name') || '—'}</Text>
                {str(activeTrip!, 'vehicle_plate') ? ` · ${str(activeTrip!, 'vehicle_plate')}` : ''}
              </Text>
              {!isDone ? (
                <TouchableOpacity
                  onPress={() => changeStatus(activeTrip!, isRoute ? 'yetkazildi' : 'yolda')}
                  disabled={busyId === id}
                  style={[s.liveCardAction, { backgroundColor: isRoute ? '#22C55E' : '#3B82F6' }]}
                >
                  <Text style={s.liveCardActionText}>
                    {isRoute ? '✓ Yetkazdim' : '🚚 Yo\'lga chiqdim'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Progress bar + jonli ko'rsatkichlar */}
            {!isDone ? (
              <View style={s.liveProgSection}>
                <View style={s.liveProgRow}>
                  <View style={s.liveProgBg}>
                    <View style={[s.liveProgFill, { width: `${Math.max(2, pct)}%`, opacity: isRoute ? 1 : 0.4 }]} />
                  </View>
                  <Text style={s.liveProgPct}>{pct}%</Text>
                </View>
                {isRoute ? (
                  <Text style={s.liveProgInfo}>
                    🚚 Bosib o'tdi: <Text style={s.liveProgCovered}>{fmtDistance(traveled)}</Text>
                    {' · '}
                    Vaqt: <Text style={s.liveProgElapsed}>{fmtDuration(elapsed)}</Text>
                    {totalDur > 0 ? (
                      <>
                        {' · '}
                        Qoldi: <Text style={s.liveProgLeft}>{fmtDuration(remainingDur)}</Text>
                      </>
                    ) : null}
                  </Text>
                ) : (
                  <Text style={s.liveProgInfo}>
                    ⏳ Harakat boshlanmagan — "Yo'lga chiqdim" tugmasini bosing
                  </Text>
                )}
                {totalDist > 0 ? (
                  <Text style={s.liveProgTotal}>
                    Umumiy yo'l: {fmtDistance(totalDist)}
                    {totalDur > 0 ? ` · ≈ ${fmtDuration(totalDur)}` : ''}
                  </Text>
                ) : (
                  <Text style={s.liveProgTotal}>Yo'l ma'lumoti yuklanmoqda...</Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })() : null}

      {/* Bottom sheet — trips list */}
      <View style={[s.sheet, !listOpen && s.sheetClosed]} pointerEvents="box-none">
        <TouchableOpacity onPress={() => setListOpen((v) => !v)} style={s.sheetHandle}>
          <View style={s.handleBar} />
          <Text style={s.sheetTitle}>
            {listOpen ? 'Faol reyslar' : `${trips.length} ta reys`}
          </Text>
        </TouchableOpacity>
        {listOpen ? (
          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14 }}>
            {trips.length === 0 ? (
              <Text style={s.emptyText}>Hozir faol reys yo'q.</Text>
            ) : (
              <>
                {trips.map((t, i) => {
                  const isAct = String(t.id) === String(activeId);
                  const coords = tripCoords(t);
                  const st = str(t, 'status').toLowerCase();
                  const isEnRoute = st === 'yolda' || st === 'yo_lda' || st.includes("yo'lda");
                  const isPending = st === 'kutilmoqda';
                  const stLabel = isEnRoute ? "Yo'lda" : isPending ? "Kutilmoqda" : (str(t, 'status') || '—');
                  const stColor = isEnRoute ? '#3B82F6' : isPending ? '#F59E0B' : colors.muted;
                  return (
                    <View
                      key={String(t.id ?? i)}
                      style={[s.tripCard, isAct && s.tripCardActive]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setActiveId(String(t.id ?? ''));
                          if (coords) {
                            const map = (window as any).__dmap;
                            if (map) map.setView(coords, 15);
                          }
                        }}
                        activeOpacity={0.85}
                        style={s.tripHeadRow}
                      >
                        <View style={[s.tripNum, { backgroundColor: isAct ? '#3B82F6' : colors.gold }]}>
                          <Text style={s.tripNumText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.tripClient} numberOfLines={1}>
                            {str(t, 'client_name') || '—'}
                          </Text>
                          <Text style={s.tripAddr} numberOfLines={1}>
                            📍 {str(t, 'destination_address') || '—'}
                          </Text>
                        </View>
                        <View style={[s.tripStatus, { backgroundColor: stColor + '22', borderColor: stColor + '55' }]}>
                          <Text style={[s.tripStatusText, { color: stColor }]}>{stLabel}</Text>
                        </View>
                      </TouchableOpacity>


                      {/* Jonli progress — "yo'lda" bo'lgan reys uchun */}
                      {isEnRoute ? (() => {
                        const tid = String(t.id ?? '');
                        const tr = trackingRef.current[tid];
                        const r = routes[tid];
                        const traveled = tr?.distanceM ?? 0;
                        const elapsed = tr ? Math.round((Date.now() - tr.startTs) / 1000) : 0;
                        const totDist = r?.distance ?? 0;
                        const totDur = r?.duration ?? 0;
                        const progress = totDist > 0 ? Math.min(1, traveled / totDist) : 0;
                        const remDur = totDur > 0 && progress > 0.02
                          ? Math.max(0, Math.round(totDur * (1 - progress)))
                          : Math.max(0, totDur - elapsed);
                        const pct = Math.round(progress * 100);
                        return (
                          <View style={s.liveTracker} key={`lt-${tickVer}`}>
                            <View style={s.progHeadRow}>
                              <Text style={s.progHeadText}>🚚 Marshrut jarayoni</Text>
                              <Text style={s.progHeadPct}>{pct}%</Text>
                            </View>
                            <View style={s.progBg}>
                              <View style={[s.progFill, { width: `${Math.max(2, pct)}%` }]} />
                            </View>
                            <Text style={s.liveProgInfo}>
                              🚚 Bosib o'tdi: <Text style={s.liveProgCovered}>{fmtDistance(traveled)}</Text>
                              {' · '}
                              Vaqt: <Text style={s.liveProgElapsed}>{fmtDuration(elapsed)}</Text>
                              {totDur > 0 ? (
                                <>
                                  {' · '}
                                  Qoldi: <Text style={s.liveProgLeft}>{fmtDuration(remDur)}</Text>
                                </>
                              ) : null}
                            </Text>
                            {totDist > 0 ? (
                              <Text style={s.liveProgTotal}>
                                Umumiy yo'l: {fmtDistance(totDist)}
                                {totDur > 0 ? ` · ≈ ${fmtDuration(totDur)}` : ''}
                              </Text>
                            ) : (
                              <Text style={s.liveProgTotal}>Yo'l ma'lumoti yuklanmoqda...</Text>
                            )}
                          </View>
                        );
                      })() : null}

                      {/* Batafsil ma'lumot — "yo'lda" bo'lsa yoki tanlangan bo'lsa */}
                      {isAct || isEnRoute ? (
                        <View style={s.tripDetails}>
                          <View style={s.detailGrid}>
                            <DetailItem label="Trip" value={str(t, 'trip_code') || `#${t.id}`} />
                            <DetailItem label="Buyurtma" value={str(t, 'order_number') || '—'} />
                            <DetailItem label="Yuk" value={str(t, 'cargo_summary') || '—'} full />
                            <DetailItem label="Jo'nash" value={str(t, 'departure_time')?.slice(0, 16).replace('T', ' ') || '—'} />
                            <DetailItem label="Mo'ljal" value={str(t, 'estimated_arrival')?.slice(0, 16).replace('T', ' ') || '—'} />
                            {t.delivery_fee != null ? (
                              <DetailItem label="Haq" value={String(t.delivery_fee) + " so'm"} highlight />
                            ) : null}
                          </View>

                          <Text style={s.statusChangeLabel}>Statusni o'zgartirish</Text>
                          <View style={s.statusRow}>
                            <TouchableOpacity
                              disabled={busyId === String(t.id)}
                              onPress={() => changeStatus(t, 'kutilmoqda')}
                              style={[s.stBtn, isPending && s.stBtnActivePending]}
                            >
                              <Text style={[s.stBtnText, isPending && { color: '#F59E0B' }]}>Kutilmoqda</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={busyId === String(t.id)}
                              onPress={() => changeStatus(t, 'yolda')}
                              style={[s.stBtn, isEnRoute && s.stBtnActiveRoute]}
                            >
                              <Text style={[s.stBtnText, isEnRoute && { color: '#3B82F6' }]}>Yo'lda</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={busyId === String(t.id)}
                              onPress={() => changeStatus(t, 'yetkazildi')}
                              style={[s.stBtn, s.stBtnDone]}
                            >
                              <Text style={[s.stBtnText, { color: '#FFF' }]}>✓ Yetkazildi</Text>
                            </TouchableOpacity>
                          </View>
                          {busyId === String(t.id) ? (
                            <Text style={s.busyText}>Yangilanmoqda...</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        ) : null}
      </View>

      {/* Reys yakuniy summary modal */}
      {summary ? (
        <View style={s.modalOverlay} pointerEvents="box-none">
          <View style={s.modalCard}>
            <View style={s.modalBadge}>
              <Text style={s.modalBadgeText}>✓</Text>
            </View>
            <Text style={s.modalTitle}>Reys yakunlandi!</Text>
            <Text style={s.modalSubtitle}>
              {str(summary.trip, 'client_name') || str(summary.trip, 'trip_code')}
            </Text>
            <View style={s.modalGrid}>
              <View style={s.modalGridItem}>
                <Text style={s.modalGridLabel}>MASOFA</Text>
                <Text style={[s.modalGridVal, { color: '#3B82F6' }]}>
                  {fmtDistance(summary.distanceM)}
                </Text>
              </View>
              <View style={s.modalGridItem}>
                <Text style={s.modalGridLabel}>VAQT</Text>
                <Text style={[s.modalGridVal, { color: '#22C55E' }]}>
                  {fmtDuration(summary.durationS)}
                </Text>
              </View>
              <View style={[s.modalGridItem, { flexBasis: '100%' }]}>
                <Text style={s.modalGridLabel}>YETKAZISH HAQI</Text>
                <Text style={[s.modalGridVal, { color: colors.gold }]}>
                  {String(summary.trip.delivery_fee ?? 0)} so'm
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSummary(null)} style={s.modalBtn}>
              <Text style={s.modalBtnText}>Yopish</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

    </View>
  );
};

// Yordamchi — WebMap ni window.__dmap orqali tashqariga ochish
type MapContainerProps = React.ComponentProps<typeof WebMap> & {
  warehouse: [number, number] | null;
};
const MapContainer: React.FC<MapContainerProps> = (props) => {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const meMarkerRef = useRef<any>(null);
  const warehouseMarkerRef = useRef<any>(null);
  const tripMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await ensureLeaflet();
      if (cancelled || !containerRef.current) return;
      const host = containerRef.current as HTMLElement;
      host.style.width = '100%';
      host.style.height = '100%';
      host.innerHTML = '';
      const map = L.map(host, {
        center: props.myPos ?? DEFAULT_CENTER,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;
      (window as any).__dmap = map;
      // Container o'lchami to'liq hisoblangandan keyin xaritani qayta hisoblash
      setTimeout(() => {
        try { map.invalidateSize(); } catch { /* */ }
      }, 100);
      setTimeout(() => {
        try { map.invalidateSize(); } catch { /* */ }
      }, 500);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* */ }
        mapRef.current = null;
        (window as any).__dmap = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile layer
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (tileRef.current) {
      try { mapRef.current.removeLayer(tileRef.current); } catch { /* */ }
    }
    const url = props.layer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    tileRef.current = L.tileLayer(url, {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      crossOrigin: true,
    }).addTo(mapRef.current);
  }, [props.layer]);

  // Korxona (ombor) markeri — yashil
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (warehouseMarkerRef.current) {
      try { mapRef.current.removeLayer(warehouseMarkerRef.current); } catch { /* */ }
      warehouseMarkerRef.current = null;
    }
    if (!props.warehouse) return;
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="width:36px;height:44px;position:relative;">
          <div style="position:absolute;top:0;left:0;width:36px;height:36px;border-radius:50%;background:#22C55E;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;">🏢</div>
          <div style="position:absolute;top:32px;left:14px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:10px solid #22C55E;"></div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });
    const m = L.marker(props.warehouse, { icon }).addTo(mapRef.current);
    m.bindPopup(`<div style="font-family:sans-serif;font-size:13px;"><b>Korxona (ombor)</b></div>`);
    warehouseMarkerRef.current = m;
  }, [props.warehouse]);

  // My position — ko'k nuqta + xaritani joriy joyga markazlashtirish
  useEffect(() => {
    if (!mapRef.current || !props.myPos) return;
    const L = (window as any).L;
    if (meMarkerRef.current) {
      meMarkerRef.current.setLatLng(props.myPos);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:28px;height:28px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:#3B82F6;opacity:0.25;animation:dmapPulse 2s infinite;"></div>
            <div style="position:absolute;inset:8px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
          </div>
          <style>@keyframes dmapPulse{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.4);opacity:0}}</style>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      meMarkerRef.current = L.marker(props.myPos, { icon }).addTo(mapRef.current);
      // Birinchi marta joyingiz aniqlangach — avtomatik markazlashtirish
      mapRef.current.setView(props.myPos, 15, { animate: true });
    }
  }, [props.myPos]);

  // Trip markers
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    tripMarkersRef.current.forEach((m) => {
      try { mapRef.current.removeLayer(m); } catch { /* */ }
    });
    tripMarkersRef.current = [];
    props.trips.forEach((t, idx) => {
      const c = tripCoords(t);
      if (!c) return;
      const isAct = props.activeTrip && String(t.id) === String(props.activeTrip.id);
      const color = isAct ? '#3B82F6' : props.colors.gold;
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="width:32px;height:40px;position:relative;">
            <div style="position:absolute;top:0;left:0;width:32px;height:32px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px;font-family:sans-serif;">${idx + 1}</div>
            <div style="position:absolute;top:28px;left:12px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:10px solid ${color};"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });
      const m = L.marker(c, { icon }).addTo(mapRef.current);
      m.bindPopup(`
        <div style="font-family:sans-serif;font-size:13px;min-width:160px;">
          <div style="font-weight:900;color:#111;margin-bottom:4px;">${(t.client_name as string) ?? '—'}</div>
          <div style="color:#555;font-size:12px;">${(t.destination_address as string) ?? ''}</div>
        </div>
      `);
      tripMarkersRef.current.push(m);
    });
  }, [props.trips, props.activeTrip, props.colors.gold]);

  // Route — eng maqbul OSRM yo'li; haydovchi marshrutdan uzoqlashsa, yangi marshrut
  const routeLinesRef = useRef<any[]>([]);
  const currentRouteCoordsRef = useRef<[number, number][]>([]);
  const didInitialFitRef = useRef<boolean>(false);
  const [routeKey, setRouteKey] = useState<string>('');

  // Nuqta → chiziq'ning eng yaqin segmentigacha masofa (metr)
  const distToPolyline = (p: [number, number], line: [number, number][]): number => {
    if (!line.length) return Infinity;
    let best = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      // Project p onto segment a-b
      const ax = a[1], ay = a[0], bx = b[1], by = b[0], px = p[1], py = p[0];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1e-9;
      let t = ((px - ax) * dx + (py - ay) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const projLat = ay + t * dy;
      const projLng = ax + t * dx;
      const d = haversine(p[0], p[1], projLat, projLng);
      if (d < best) best = d;
    }
    return best;
  };

  // Haydovchi marshrutdan uzoqlashganini tekshirish — yangi marshrut uchun kalit
  useEffect(() => {
    if (!props.myPos || !currentRouteCoordsRef.current.length) return;
    const d = distToPolyline(props.myPos, currentRouteCoordsRef.current);
    if (d > 80) {
      // Marshrutdan 80m dan uzoqda — yangi marshrut
      setRouteKey(`${Math.round(props.myPos[0] * 1000)},${Math.round(props.myPos[1] * 1000)}`);
    }
  }, [props.myPos]);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    // Eski chiziqlarni tozalash
    routeLinesRef.current.forEach((ln) => {
      try { mapRef.current.removeLayer(ln); } catch { /* */ }
    });
    routeLinesRef.current = [];
    currentRouteCoordsRef.current = [];

    if (!props.activeTrip) return;
    const dest = tripCoords(props.activeTrip);
    if (!dest) return;

    // Boshlanish nuqtasi:
    //  - "yolda" bo'lsa — haydovchining joriy joyi (dinamik, yo'l qayta hisoblanadi)
    //  - aks holda — korxona (yoki haydovchi) joyidan
    const st = String(props.activeTrip.status ?? '').toLowerCase();
    const isEnRoute = st === 'yolda' || st.includes("yo'lda");
    const start = isEnRoute && props.myPos
      ? props.myPos
      : (props.warehouse ?? props.myPos);
    if (!start) return;

    let cancelled = false;
    (async () => {
      let coords: [number, number][] = [];
      try {
        // alternatives=false + continue_straight=false → eng maqbul yo'l
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&alternatives=false&continue_straight=false`;
        const r = await fetch(url);
        const j = await r.json();
        if (cancelled) return;
        coords = (j?.routes?.[0]?.geometry?.coordinates ?? [])
          .map((p: [number, number]) => [p[1], p[0]]);
      } catch {
        /* OSRM javob bermasa — to'g'ri chiziq */
      }
      if (cancelled) return;
      const pathCoords = coords.length ? coords : [start, dest];
      currentRouteCoordsRef.current = pathCoords;

      const outer = L.polyline(pathCoords, {
        color: '#FFFFFF',
        weight: 10,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapRef.current);
      const inner = L.polyline(pathCoords, {
        color: '#3B82F6',
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        ...(coords.length ? {} : { dashArray: '10,8' }),
      }).addTo(mapRef.current);

      routeLinesRef.current.push(outer, inner);

      // Faqat birinchi marshrut yoki trip o'zgarganda markazlashtirish
      if (!didInitialFitRef.current) {
        try {
          mapRef.current.fitBounds(inner.getBounds(), { padding: [70, 70] });
          didInitialFitRef.current = true;
        } catch { /* */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.warehouse, props.activeTrip, routeKey]);

  // Trip o'zgarganda initial fit flag'ni reset qilish
  useEffect(() => {
    didInitialFitRef.current = false;
  }, [props.activeTrip]);

  return <View ref={containerRef} style={StyleSheet.absoluteFill} />;
};

const DetailItem: React.FC<{
  label: string;
  value: string;
  full?: boolean;
  highlight?: boolean;
}> = ({ label, value, full, highlight }) => {
  const { colors } = useAppTheme();
  const s = makeStyles(colors);
  return (
    <View style={[s.detailItem, full && s.detailItemFull, highlight && s.detailItemHighlight]}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, highlight && s.detailValueHi]} numberOfLines={2}>{value}</Text>
    </View>
  );
};

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, position: 'relative' },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg + 'cc',
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  topTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  topTitleText: { color: c.text, fontSize: 13, fontWeight: '900' },
  topHint: { color: c.muted, fontSize: 12, fontWeight: '700' },

  rightCtrls: {
    position: 'absolute',
    right: 12,
    top: 70,
    gap: 8,
    zIndex: 5,
  },
  ctrlBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ctrlText: { fontSize: 20, fontWeight: '900', color: c.text, lineHeight: 22 },

  layerCtrl: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: c.card,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  layerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  layerBtnActive: { backgroundColor: c.gold + '22' },
  layerText: { color: c.muted, fontSize: 12, fontWeight: '800' },
  layerTextActive: { color: c.gold },

  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: c.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    zIndex: 4,
  },
  sheetClosed: {},
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handleBar: {
    width: 42, height: 4, borderRadius: 2,
    backgroundColor: c.cardBorder,
    marginBottom: 6,
  },
  sheetTitle: { color: c.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  emptyText: { color: c.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  tripCard: {
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    overflow: 'hidden',
  },
  tripCardActive: { borderColor: '#3B82F6' },
  tripHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  tripNum: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripNumText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  tripClient: { color: c.text, fontSize: 13, fontWeight: '800' },
  tripAddr: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },
  tripStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tripStatusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  tripDetails: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
    backgroundColor: c.card,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  detailItem: {
    minWidth: '46%',
    flexGrow: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  detailItemFull: { minWidth: '100%' },
  detailItemHighlight: { borderColor: c.gold + '66', backgroundColor: c.gold + '14' },
  detailLabel: {
    color: c.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: c.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  detailValueHi: { color: c.gold },

  statusChangeLabel: {
    color: c.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  stBtn: {
    flex: 1,
    minWidth: 92,
    paddingVertical: 9,
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
  busyText: { color: c.muted, fontSize: 11, marginTop: 6, fontWeight: '600' },

  liveCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 6,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    gap: 8,
  },
  liveCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  liveCardCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  liveCardCode: {
    color: c.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    backgroundColor: c.gold + '14',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: c.gold + '55',
  },
  liveCardClient: { color: c.text, fontSize: 13, fontWeight: '900', flex: 1 },
  liveCardAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  liveCardAddr: { color: c.muted, fontSize: 11, fontWeight: '700', flex: 1 },
  liveCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveCardBadgeText: { fontSize: 10, fontWeight: '900' },

  liveCardDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
  },
  liveCardDriverText: { color: c.muted, fontSize: 11, flex: 1 },
  liveCardDriverName: { color: c.text, fontWeight: '800' },
  liveCardAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveCardActionText: { color: '#FFF', fontSize: 11, fontWeight: '900' },

  liveProgSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3B82F655',
    borderStyle: 'dashed',
  },
  liveProgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  liveProgBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    overflow: 'hidden',
  },
  liveProgFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  liveProgPct: { color: '#3B82F6', fontSize: 12, fontWeight: '900', minWidth: 38, textAlign: 'right' },
  liveProgInfo: { color: c.muted, fontSize: 10, fontWeight: '700', lineHeight: 14 },
  liveProgCovered: { color: '#3B82F6', fontWeight: '900' },
  liveProgElapsed: { color: c.text, fontWeight: '900' },
  liveProgLeft: { color: '#F59E0B', fontWeight: '900' },
  liveProgTotal: { color: c.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },

  liveTracker: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#3B82F612',
    borderTopWidth: 1,
    borderTopColor: '#3B82F655',
  },
  progHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progHeadText: { color: c.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  progHeadPct: { color: '#3B82F6', fontSize: 14, fontWeight: '900' },
  progBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },

  liveStatsRow: { flexDirection: 'row', gap: 8 },
  liveStat: { flex: 1, alignItems: 'center' },
  liveStatLabel: {
    color: c.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  liveStatVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  liveStatHint: {
    color: c.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },

  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: c.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  stepsToggleIcon: { fontSize: 14 },
  stepsToggleText: { color: c.text, fontSize: 12, fontWeight: '800', flex: 1 },
  stepsToggleChev: { color: c.muted, fontSize: 12 },

  stepsList: { marginTop: 8, gap: 4, maxHeight: 220 },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 6,
    borderRadius: 8,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  stepRowDone: {
    backgroundColor: '#3B82F614',
    borderColor: '#3B82F655',
  },
  stepBullet: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBulletDone: { backgroundColor: '#3B82F6' },
  stepBulletText: { color: c.text, fontSize: 9, fontWeight: '900' },
  stepName: { color: c.text, fontSize: 11, fontWeight: '800' },
  stepMeta: { color: c.muted, fontSize: 10, fontWeight: '700', marginTop: 1 },

  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  modalBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalBadgeText: { color: '#FFF', fontSize: 36, fontWeight: '900' },
  modalTitle: { color: c.text, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  modalSubtitle: { color: c.muted, fontSize: 13, fontWeight: '700', marginBottom: 18, textAlign: 'center' },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  modalGridItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
  },
  modalGridLabel: { color: c.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalGridVal: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  modalBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.gold,
    alignItems: 'center',
  },
  modalBtnText: { color: '#1A1715', fontSize: 14, fontWeight: '900' },

  permWarn: {
    position: 'absolute',
    top: 70,
    left: 12,
    right: 70,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 6,
  },
  permText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});
