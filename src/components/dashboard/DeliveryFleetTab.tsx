import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as XLSX from 'xlsx';
import { 
  Truck, Search, MapPin, CheckCircle2, 
  Clock, Navigation, Phone, User,
  Map as MapIcon, Layers, Compass,
  Satellite, Table as TableIcon,
  FileText, Lock, Download, FileSpreadsheet, BarChart3, Radar,
  ChevronDown, Flag
} from 'lucide-react';
import { DeliveryTrip, DeliveryStatus, WaybillTTN, Employee } from '../../types/erp';
import { TablePagination } from './TablePagination';
import { useLanguage } from '../../context/LanguageContext';

interface DeliveryFleetTabProps {
  deliveries: DeliveryTrip[];
  waybills: WaybillTTN[];
  employees: Employee[];
  onUpdateDelivery: (id: string, updates: Partial<DeliveryTrip>) => void;
  onUpdateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
}

// Sana va vaqtni formatlash (YYYY-MM-DD HH:mm)
const formatDateTime = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// --- REAL MARSHRUT (OSRM): ombordan mijozgacha real yo'l bo'ylab ---
type RouteStep = { name: string; distance: number; duration: number; type?: string };
type RouteInfo = {
  coords: [number, number][];
  distance: number;
  duration: number;
  steps: RouteStep[];
  isFallback?: boolean;
};

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// NOTE: burilish belgilari (MANEUVER_LABELS) va davomiylik formati (formatRoadDuration)
// komponent ichida t.dash.fleet orqali lokallashtirilgan holda aniqlangan.

const fetchRouteInfo = async (from: [number, number], to: [number, number]): Promise<RouteInfo> => {
  // OSRM: real yo'llar bo'ylab eng tez (eng yaqin haydovchi) marshrut
  const url = `${OSRM_BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length) {
      const r = data.routes[0];
      return {
        coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
        distance: r.distance || 0,
        duration: r.duration || 0,
        steps: ((r.legs?.[0]?.steps || []) as { name?: string; distance?: number; duration?: number; maneuver?: { type?: string } }[])
          .map(s => ({ name: s.name || '', distance: s.distance || 0, duration: s.duration || 0, type: s.maneuver?.type })),
      };
    }
  } catch { /* tarmoq xatosi — zaxira to‘g‘ri chiziq */ }
  return { coords: [from, to], distance: 0, duration: 0, steps: [], isFallback: true };
};

// Polylineda berilgan progress (0..1) bo'yicha joriy nuqtani hisoblash
const pointAlongCoords = (coords: [number, number][], progress: number): [number, number] => {
  if (coords.length === 0) return WAREHOUSE_COORDS;
  if (coords.length === 1 || progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];

  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
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

const formatRoadDistance = (m: number): string =>
  m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

// Markaziy baza / Omborxona koordinatasi (Shovot Carton & Clean Life Asosiy Ombori)
const WAREHOUSE_COORDS: [number, number] = [41.3350, 69.2450];

// Har bir reys uchun koordinata aniqlovchi funksiya
const getTripCoords = (trip: DeliveryTrip): [number, number] => {
  if (typeof trip.lat === 'number' && typeof trip.lng === 'number' && !isNaN(trip.lat) && !isNaN(trip.lng)) {
    return [trip.lat, trip.lng];
  }
  const lower = (trip.destinationAddress + ' ' + trip.clientName).toLowerCase();
  if (lower.includes('mustaqillik') || lower.includes('sulton')) return [41.3195, 69.2825];
  if (lower.includes('bunyodkor') || lower.includes('rayhon')) return [41.2845, 69.2155];
  if (lower.includes('rustaveli') || lower.includes('aroma')) return [41.2985, 69.2612];
  if (lower.includes('chilonzor')) return [41.2750, 69.2050];
  if (lower.includes('yunusobod')) return [41.3650, 69.2890];
  if (lower.includes('mirobod') || lower.includes('nukus')) return [41.2950, 69.2780];
  if (lower.includes('sergeli')) return [41.2250, 69.2200];
  
  // Deterministic fallback based on ID hash around Tashkent
  let hash = 0;
  const str = trip.id + trip.destinationAddress;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  const latOffset = ((Math.abs(hash) % 70) - 35) / 1000;
  const lngOffset = ((Math.abs(hash * 3) % 70) - 35) / 1000;
  return [41.3110 + latOffset, 69.2405 + lngOffset];
};

export const DeliveryFleetTab: React.FC<DeliveryFleetTabProps> = ({
  deliveries,
  waybills,
  employees,
  onUpdateDelivery,
  onUpdateDeliveryStatus
}) => {
  const { t } = useLanguage();
  // Lokallashtirilgan burilish belgilari va davomiylik formati (mantiq o'zgarmagan)
  const MANEUVER_LABELS: Record<string, string> = {
    depart: t.dash.fleet.maneuver.depart, turn: t.dash.fleet.maneuver.turn, new_name: t.dash.fleet.maneuver.newName,
    merge: t.dash.fleet.maneuver.merge, on_ramp: t.dash.fleet.maneuver.onRamp, off_ramp: t.dash.fleet.maneuver.offRamp,
    fork: t.dash.fleet.maneuver.fork, end_of_road: t.dash.fleet.maneuver.endOfRoad, continue: t.dash.fleet.maneuver.continue,
    roundabout: t.dash.fleet.maneuver.roundabout, rotary: t.dash.fleet.maneuver.rotary,
    roundabout_turn: t.dash.fleet.maneuver.roundaboutTurn, exit_roundabout: t.dash.fleet.maneuver.exitRoundabout,
    arrive: t.dash.fleet.maneuver.arrive,
  };
  const formatRoadDuration = (s: number): string => {
    if (s <= 0) return '—';
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      return m > 0 ? `${h} ${t.dash.fleet.units.hour} ${m} ${t.dash.fleet.units.minShort}` : `${h} ${t.dash.fleet.units.hour}`;
    }
    return `${Math.max(1, Math.round(s / 60))} ${t.dash.fleet.units.minute}`;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(deliveries[0]?.id || null);
  const [layoutMode, setLayoutMode] = useState<'split' | 'table' | 'map'>('split');
  const [mapTileMode, setMapTileMode] = useState<'streets' | 'satellite'>('streets');

  // Haydovchilar ro'yxati (haydovchi / kuryer / logist lavozimdagi faol xodimlar)
  const drivers = useMemo(() => {
    const list = employees.filter(e =>
      e.status === 'active' && (
        e.position.toLowerCase().includes('haydovchi') ||
        e.position.toLowerCase().includes('kuryer') ||
        e.position.toLowerCase().includes('logist')
      )
    );
    return list.length > 0 ? list : employees.filter(e => e.status === 'active');
  }, [employees]);

  // PAGINATSIYA (10 / 20 / 30 qator)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Vaqt filteri (Kunlik / Oylik / Yillik)
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'month' | 'year'>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStr = todayStr.slice(0, 7);
  const yearStr = todayStr.slice(0, 4);

  const tripDate = (d: DeliveryTrip): string => {
    if (d.createdAt) {
      const s = d.createdAt.split('T')[0];
      if (s && s !== 'Invalid Date') return s;
    }
    if (d.departureTime) {
      const part = d.departureTime.split(',')[1]?.trim();
      if (part) return part;
    }
    return '';
  };

  const matchPeriod = (d: DeliveryTrip, mode: 'day' | 'month' | 'year'): boolean => {
    const ds = tripDate(d);
    if (!ds) return false;
    if (mode === 'day') return ds === todayStr;
    if (mode === 'month') return ds.startsWith(monthStr);
    return ds.startsWith(yearStr);
  };

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const mapContainerElRef = useRef<HTMLDivElement | null>(null);

  // REAL-TIME (jonli) kuzatuv rejimi
  const [liveTracking, setLiveTracking] = useState(true);
  const [mapVersion, setMapVersion] = useState(0);

  // --- REAL MARSHRUTLAR (OSRM) va haydovchi harakati simulyatsiyasi ---
  const [routeCache, setRouteCache] = useState<Record<string, RouteInfo>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [showRouteSteps, setShowRouteSteps] = useState(false);
  const routesRef = useRef<Record<string, RouteInfo>>({});
  const pendingRoutesRef = useRef<Record<string, boolean>>({});

  // Tanlangan va yo'ldagi reyslar uchun real yo'l marshrutini yuklab olish
  const ensureRoute = (trip: DeliveryTrip) => {
    if (routesRef.current[trip.id] || pendingRoutesRef.current[trip.id]) return;
    pendingRoutesRef.current[trip.id] = true;
    fetchRouteInfo(WAREHOUSE_COORDS, getTripCoords(trip))
      .then(info => {
        routesRef.current[trip.id] = info;
        setRouteCache(prev => ({ ...prev, [trip.id]: info }));
      })
      .finally(() => { delete pendingRoutesRef.current[trip.id]; });
  };

  const baseFilteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      if (filterStatus !== 'all' && d.status !== filterStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
          return (
            d.driverName.toLowerCase().includes(q) ||
            d.vehiclePlate.toLowerCase().includes(q) ||
            d.clientName.toLowerCase().includes(q) ||
            d.destinationAddress.toLowerCase().includes(q) ||
            d.tripCode.toLowerCase().includes(q) ||
            d.orderNumber.toLowerCase().includes(q) ||
            (d.waybillTtnNumber || '').toLowerCase().includes(q)
          );
      }
      return true;
    });
  }, [deliveries, filterStatus, searchTerm]);

  // KUNLIK / OYLIK / YILLIK STATISTIKA: reyslar soni + yuk haqi summasi
  const periodStats = useMemo(() => {
    const calc = (mode: 'day' | 'month' | 'year') => {
      const list = baseFilteredDeliveries.filter(d => matchPeriod(d, mode));
      const totalFee = list.reduce((sum, d) => sum + (d.deliveryFee || 0), 0);
      return { count: list.length, totalFee };
    };
    return { day: calc('day'), month: calc('month'), year: calc('year') };
  }, [baseFilteredDeliveries, todayStr, monthStr, yearStr]);

  const filteredDeliveries = useMemo(() => {
    if (timeFilter === 'all') return baseFilteredDeliveries;
    return baseFilteredDeliveries.filter(d => matchPeriod(d, timeFilter));
  }, [baseFilteredDeliveries, timeFilter, todayStr, monthStr, yearStr]);

  // Paginatsiya: sahifalash
  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedDeliveries = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, validPage, pageSize]);

  // Filter o'zgarganda birinchi sahifaga qaytish
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, timeFilter, pageSize]);

  // HAYDOVCHI HARAKATI SIMULYATSIYASI: jonli kuzatuvda mashina real marshrut
  // bo'ylab mijozga yaqinlashib boradi (to'liq yo'l ~150 soniyada bosiladi)
  useEffect(() => {
    if (!liveTracking) return;
    const hasActive = deliveries.some(d => d.status === 'yolda');
    if (!hasActive) return;
    const interval = setInterval(() => {
      setProgressMap(prev => {
        let changed = false;
        const next = { ...prev };
        deliveries.forEach(d => {
          if (d.status !== 'yolda') return;
          const cur = next[d.id] ?? 0;
          if (cur < 1) {
            next[d.id] = Math.min(1, cur + 1 / 150);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [liveTracking, deliveries]);

  // EXCEL GA EKSPORT
  const handleExportExcel = () => {
    const rows = filteredDeliveries.map((d, idx) => ({
      '№': idx + 1,
      [t.dash.fleet.export.colTrip]: d.tripCode,
      [t.dash.fleet.export.colWaybill]: d.waybillTtnNumber || '—',
      [t.dash.fleet.export.colOrder]: d.orderNumber || '—',
      [t.dash.fleet.export.colClient]: d.clientName,
      [t.dash.fleet.export.colAddress]: d.destinationAddress,
      [t.dash.fleet.export.colCargo]: d.cargoSummary,
      [t.dash.fleet.export.colDriver]: d.driverName || '—',
      [t.dash.fleet.export.colDriverPhone]: d.driverPhone || '—',
      [t.dash.fleet.export.colCar]: `${d.vehiclePlate} (${d.vehicleModel})`,
      [t.dash.fleet.export.colDate]: formatDateTime(d.createdAt),
      [t.dash.fleet.export.colFee]: d.deliveryFee || 0,
      [t.dash.fleet.export.colStatus]: d.status === 'yetkazildi' ? t.dash.fleet.export.stDelivered : d.status === 'yolda' ? t.dash.fleet.export.stOnWay : t.dash.fleet.export.stWaiting,
      [t.dash.fleet.export.colLocked]: d.status === 'yetkazildi' ? t.dash.fleet.export.yes : t.dash.fleet.export.no
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.dash.fleet.export.sheet);
    XLSX.writeFile(wb, `${t.dash.fleet.export.filePrefix}_${todayStr}.xlsx`);
  };

  const activeTripsCount = deliveries.filter(d => d.status === 'yolda').length;
  const completedTripsCount = deliveries.filter(d => d.status === 'yetkazildi').length;

  const selectedTrip = useMemo(() => {
    return deliveries.find(d => d.id === selectedTripId) || filteredDeliveries[0] || deliveries[0] || null;
  }, [deliveries, selectedTripId, filteredDeliveries]);

  // Tanlangan reysning marshrut ma'lumotlari va joriy harakat progressi
  const selectedRoute = selectedTrip ? routeCache[selectedTrip.id] : undefined;
  const selectedProgress = !selectedTrip
    ? 0
    : selectedTrip.status === 'yetkazildi'
    ? 1
    : selectedTrip.status === 'kutilmoqda'
    ? 0
    : (progressMap[selectedTrip.id] ?? 0);

  // Marshrut qadamlari (yo'l nomlari va har birida o'tgan vaqt) — kumulyativ masofa bilan
  let cumDistance = 0;
  const routeStepsCum = (selectedRoute?.steps || []).map(s => {
    cumDistance += s.distance;
    return { ...s, cumDistance };
  });

  // REAL MARSHRUT: tanlangan va yo'ldagi reyslar uchun ombor→mijoz real yo'lini yuklash
  useEffect(() => {
    const needed: DeliveryTrip[] = [];
    if (selectedTrip) needed.push(selectedTrip);
    deliveries.forEach(d => {
      if (d.status === 'yolda' && d.id !== selectedTrip?.id) needed.push(d);
    });
    needed.forEach(ensureRoute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrip?.id, deliveries]);

  // Leaflet Icons Creator
  const createMarkerIcon = (status: DeliveryStatus, isSelected: boolean) => {
    if (status === 'yolda') {
      return L.divIcon({
        className: 'custom-fleet-pin-yolda',
        html: `
          <div style="position: relative; width: ${isSelected ? 42 : 36}px; height: ${isSelected ? 42 : 36}px; transform: translate(-50%, -50%); cursor: pointer;">
            <span style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(245, 158, 11, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="
              position: relative; 
              background: linear-gradient(135deg, #F59E0B, #D97706); 
              color: #000; 
              width: 100%; 
              height: 100%; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              box-shadow: 0 4px 14px rgba(217, 119, 6, 0.6); 
              border: ${isSelected ? '3px solid #FFF' : '2px solid #FFF'}; 
              font-size: ${isSelected ? 18 : 16}px;
            ">
              🚚
            </div>
          </div>
        `,
        iconSize: [isSelected ? 42 : 36, isSelected ? 42 : 36],
        iconAnchor: [isSelected ? 21 : 18, isSelected ? 21 : 18]
      });
    }

    if (status === 'yetkazildi') {
      return L.divIcon({
        className: 'custom-fleet-pin-yetkazildi',
        html: `
          <div style="
            position: relative; 
            width: ${isSelected ? 38 : 32}px; 
            height: ${isSelected ? 38 : 32}px; 
            transform: translate(-50%, -50%); 
            background: linear-gradient(135deg, #10B981, #059669); 
            color: #FFF; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); 
            border: ${isSelected ? '3px solid #FFF' : '2px solid #FFF'}; 
            font-size: ${isSelected ? 16 : 14}px; 
            font-weight: bold;
            cursor: pointer;
          ">
            ✓
          </div>
        `,
        iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
        iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16]
      });
    }

    // Kutilmoqda
    return L.divIcon({
      className: 'custom-fleet-pin-kutilmoqda',
      html: `
        <div style="
          position: relative; 
          width: ${isSelected ? 36 : 30}px; 
          height: ${isSelected ? 36 : 30}px; 
          transform: translate(-50%, -50%); 
          background: linear-gradient(135deg, #3B82F6, #2563EB); 
          color: #FFF; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4); 
          border: ${isSelected ? '3px solid #FFF' : '2px solid #FFF'}; 
          font-size: ${isSelected ? 15 : 13}px;
          cursor: pointer;
        ">
          ⏱️
        </div>
      `,
      iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
      iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
    });
  };

  // Haydovchi mashinasi belgisi (marshrut bo'ylab harakatlanuvchi)
  const createCarIcon = (isSelected: boolean, progress: number) => {
    return L.divIcon({
      className: 'custom-car-pin',
      html: `
        <div style="position: relative; width: ${isSelected ? 44 : 38}px; height: ${isSelected ? 44 : 38}px; transform: translate(-50%, -50%); cursor: pointer;">
          <span style="position: absolute; inset: -5px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="
            position: relative;
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            color: #FFF;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(29, 78, 216, 0.6);
            border: ${isSelected ? '3px solid #FFF' : '2px solid #FFF'};
            font-size: ${isSelected ? 18 : 16}px;
          ">
            🚚
          </div>
          <div style="
            position: absolute;
            left: 50%;
            bottom: -9px;
            transform: translateX(-50%);
            background: #1D4ED8;
            color: #FFF;
            font-size: 8px;
            font-weight: 800;
            font-family: monospace;
            padding: 1px 4px;
            border-radius: 6px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ">${Math.round(progress * 100)}%</div>
        </div>
      `,
      iconSize: [isSelected ? 44 : 38, isSelected ? 44 : 38],
      iconAnchor: [isSelected ? 22 : 19, isSelected ? 22 : 19]
    });
  };

  const createWarehouseIcon = () => {
    return L.divIcon({
      className: 'custom-warehouse-pin',
      html: `
        <div style="
          position: relative; 
          width: 40px; 
          height: 40px; 
          transform: translate(-50%, -50%); 
          background: linear-gradient(135deg, #1C1814, #2E251D); 
          border: 2.5px solid #D4AF37; 
          color: #D4AF37; 
          border-radius: 12px; 
          display: flex; 
          flex-direction: column;
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 6px 16px rgba(0,0,0,0.5); 
          font-size: 18px;
        ">
          🏭
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  // Initialize Map (konteyner o'zgarganda qayta ishga tushadi — rejim almashtirishda ham)
  useEffect(() => {
    const el = mapContainerRef.current;

    // Konteyner DOM'da yo'q (masalan, faqat "Jadval" rejimi) — mavjud xaritani tozalash
    if (!el) {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* noop */ }
        mapInstanceRef.current = null;
      }
      mapContainerElRef.current = null;
      return;
    }

    // Aynan shu konteynerga allaqachon tashkil etilgan bo'lsa — qayta tashkil qilish shart emas
    if (mapContainerElRef.current === el && mapInstanceRef.current) return;

    // Konteyner yangisiga almashtirildi — eski xaritani yo'q qilish
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch { /* noop */ }
      mapInstanceRef.current = null;
    }
    mapContainerElRef.current = el;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: false
    }).setView([41.3110, 69.2550], 12);

    // Streets layer
    streetLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    // Satellite layer
    satelliteLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    // Tarmoq uzilganda (ERR_NETWORK_CHANGED va b.) plitkalarni avtomatik qayta yuklash
    [streetLayerRef.current, satelliteLayerRef.current].forEach((layer) => {
      layer?.on('tileerror', (e: any) => {
        const tile = e?.tile as HTMLImageElement | undefined;
        if (!tile) return;
        const done = Number(tile.dataset.tileRetries || 0);
        if (done >= 3) return;
        tile.dataset.tileRetries = String(done + 1);
        const url = tile.src;
        window.setTimeout(() => { tile.src = url; }, 600 * (done + 1));
      });
    });

    // Add initial street layer
    streetLayerRef.current.addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setMapVersion(v => v + 1);

    map.whenReady(() => {
      try { map.invalidateSize(); } catch { /* noop */ }
    });

    return () => {
      if (mapContainerElRef.current === el) {
        try { map.remove(); } catch { /* noop */ }
        mapInstanceRef.current = null;
        mapContainerElRef.current = null;
      }
    };
  }, [layoutMode]);

  // REAL-TIME JONLI KUZATUV: har 10 soniyada xarita yangilanadi + faol reyslarni kuzatish
  useEffect(() => {
    if (!liveTracking) return;
    const interval = setInterval(() => {
      const map = mapInstanceRef.current;
      if (!map) return;
      try { map.invalidateSize(); } catch { /* noop */ }
      setMapVersion(v => v + 1);

      // Faol (Yo‘lda) reyslarni avtomatik kuzatib borish — mashinanING JORIY joyi
      const activeTrips = deliveries.filter(d => d.status === 'yolda');
      if (activeTrips.length > 0) {
        const target = activeTrips[0];
        const route = routesRef.current[target.id];
        const progress = progressMap[target.id] ?? 0;
        const coords = route && route.coords.length > 1
          ? pointAlongCoords(route.coords, progress)
          : getTripCoords(target);
        try { map.panTo(coords, { animate: true, duration: 1 }); } catch { /* noop */ }
        if (selectedTripId !== target.id) {
          setSelectedTripId(target.id);
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [liveTracking, deliveries, selectedTripId, progressMap]);

  // Update map layers and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Handle tile switcher
    if (mapTileMode === 'satellite') {
      if (streetLayerRef.current && map.hasLayer(streetLayerRef.current)) {
        map.removeLayer(streetLayerRef.current);
      }
      if (satelliteLayerRef.current && !map.hasLayer(satelliteLayerRef.current)) {
        satelliteLayerRef.current.addTo(map);
      }
    } else {
      if (satelliteLayerRef.current && map.hasLayer(satelliteLayerRef.current)) {
        map.removeLayer(satelliteLayerRef.current);
      }
      if (streetLayerRef.current && !map.hasLayer(streetLayerRef.current)) {
        streetLayerRef.current.addTo(map);
      }
    }

    // Refresh Markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      // 1. Markaziy Omborxona / Baza markeri
      const whMarker = L.marker(WAREHOUSE_COORDS, { icon: createWarehouseIcon() });
      whMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px; line-height: 1.4;">
          <div style="font-weight: 800; color: #b45309; font-size: 13px; margin-bottom: 2px;">
            🏭 Shovot Carton & Clean Life
          </div>
          <div style="color: #4b5563; font-size: 11px;">${t.dash.fleet.popup.baseDesc}</div>
          <div style="margin-top: 4px; font-weight: 600; font-size: 11px; color: #111827;">${t.dash.fleet.popup.baseAddr}</div>
        </div>
      `);
      whMarker.addTo(markersLayerRef.current);

      // 2. REAL MARSHRUTLAR: ombordan mijozgacha real yo'l bo'ylab ko'k chiziq
      deliveries.forEach(d => {
        const info = routeCache[d.id];
        if (!info || info.coords.length < 2) return;
        const isRelevant = d.id === selectedTrip?.id || d.status === 'yolda' || d.status === 'yetkazildi';
        if (!isRelevant) return;
        const isSel = selectedTrip?.id === d.id;
        L.polyline(info.coords, {
          color: '#2563EB',
          weight: isSel ? 5 : 3,
          opacity: isSel ? 0.9 : 0.5,
          dashArray: info.isFallback ? '8, 8' : undefined,
        }).addTo(markersLayerRef.current!);
      });

      // 3. Deliveries Markers (yo'ldagi reys — marshrutdagi joriy joyida HARAKATLANADI)
      const boundsCoords: [number, number][] = [WAREHOUSE_COORDS];

      deliveries.forEach(trip => {
        const destCoords = getTripCoords(trip);
        const info = routeCache[trip.id];
        const progress = trip.status === 'yetkazildi'
          ? 1
          : trip.status === 'kutilmoqda'
          ? 0
          : (progressMap[trip.id] ?? 0);
        const isDriving = trip.status === 'yolda' && !!info && info.coords.length > 1;
        const coords: [number, number] = isDriving ? pointAlongCoords(info!.coords, progress) : destCoords;
        boundsCoords.push(coords);
        const isSelected = selectedTrip?.id === trip.id;
        const icon = isDriving ? createCarIcon(isSelected, progress) : createMarkerIcon(trip.status, isSelected);

        const marker = L.marker(coords, { icon });

        const statusLabel =
          trip.status === 'yolda'
            ? `<span style="color: #2563eb; font-weight: 800;">${t.dash.fleet.popup.statusOnWay}</span>`
            : trip.status === 'yetkazildi'
            ? `<span style="color: #059669; font-weight: 800;">${t.dash.fleet.popup.statusDelivered}</span>`
            : `<span style="color: #2563eb; font-weight: 800;">${t.dash.fleet.popup.statusWaiting}</span>`;

        const progressLabel = isDriving
          ? `<div style="margin-top: 4px; padding-top: 3px; border-top: 1px dashed #93c5fd; font-size: 11px; color: #1d4ed8; font-weight: 700;">
               ${t.dash.fleet.popup.roadDone} ${Math.round(progress * 100)}%${
                  info && info.distance
                    ? ` (${formatRoadDistance(info.distance * progress)} / ${formatRoadDuration(info.duration * (1 - progress))} ${t.dash.fleet.popup.left})`
                    : ''
                }
             </div>`
          : '';

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 4px; line-height: 1.4; min-width: 200px;">
            <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #b45309;">
              ${trip.tripCode} &bull; ${trip.orderNumber}
            </div>
            <div style="font-weight: 800; color: #111827; font-size: 13px; margin-top: 2px;">
              ${trip.clientName}
            </div>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
              📍 ${trip.destinationAddress}
            </div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e5e7eb; font-size: 11px;">
              <div><strong>${t.dash.fleet.popup.driver}</strong> ${trip.driverName || '—'}</div>
              <div><strong>${t.dash.fleet.popup.car}</strong> ${trip.vehiclePlate} (${trip.vehicleModel})</div>
              <div style="margin-top: 3px;">${statusLabel}</div>
              ${progressLabel}
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedTripId(trip.id);
        });

        marker.addTo(markersLayerRef.current!);
      });
    }
  }, [deliveries, selectedTrip, routeCache, progressMap, mapTileMode, mapVersion]);

  // Center on selected trip
  const handleFocusTripOnMap = (trip: DeliveryTrip) => {
    setSelectedTripId(trip.id);
    const map = mapInstanceRef.current;
    if (!map) return;
    const coords = getTripCoords(trip);
    map.flyTo(coords, 14, { duration: 1 });
  };

  // Fit all markers in viewport
  const handleFitAllMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const allCoords: [number, number][] = [WAREHOUSE_COORDS];
    deliveries.forEach(d => allCoords.push(getTripCoords(d)));
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    }
  };

  // Re-invalidate map on layout changes
  useEffect(() => {
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);
  }, [layoutMode]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1715] dark:text-[#FAF7F2]">
            {t.dash.fleet.header.title}
          </h2>
          <p className="text-xs text-[#7A6F62] dark:text-[#A69C8E] mt-0.5">
            {t.dash.fleet.header.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Ko'rinish rejimi tanlovi (Split: Jadval + Xarita) */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-[#2C241D] text-xs font-bold">
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.fleet.layout.splitTitle}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.dash.fleet.layout.split}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'table'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.fleet.layout.tableTitle}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{t.dash.fleet.layout.table}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('map')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'map'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title={t.dash.fleet.layout.mapTitle}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{t.dash.fleet.layout.map}</span>
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            title={t.dash.fleet.layout.excelTitle}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.dash.fleet.layout.excel}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Ko'rsatkichlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E] font-medium block">
              {t.dash.fleet.kpi.activeLabel}
            </span>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-[#D4AF37] mt-1 flex items-center gap-2">
              <span>{activeTripsCount}</span>
              <span className="text-xs font-sans font-bold text-stone-400">{t.dash.fleet.kpi.activeUnit}</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              {t.dash.fleet.kpi.activeHint}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-[#D4AF37]">
            <Navigation className="w-5 h-5 animate-spin" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E] font-medium block">
              {t.dash.fleet.kpi.doneLabel}
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>{completedTripsCount}</span>
              <span className="text-xs font-sans font-bold text-stone-400">{t.dash.fleet.kpi.doneUnit}</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              {t.dash.fleet.kpi.doneHint}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#7A6F62] dark:text-[#A69C8E] font-medium block">
              {t.dash.fleet.kpi.fleetLabel}
            </span>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
              3 <span className="text-xs font-sans font-bold text-stone-400">{t.dash.fleet.kpi.fleetUnit}</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              {t.dash.fleet.kpi.fleetHint}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/15 text-purple-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2.5. KUNLIK / OYLIK / YILLIK STATISTIKA FILTRI */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
              {t.dash.fleet.stats.title}
            </h3>
            <span className="text-[10px] text-stone-400 font-mono">
              {t.dash.fleet.stats.hint}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === 'all'
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 font-black shadow-xs'
                  : 'bg-stone-100 dark:bg-[#201A15] text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {t.dash.fleet.stats.all}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === 'day'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              {t.dash.fleet.stats.day}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === 'month'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              {t.dash.fleet.stats.month}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === 'year'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              {t.dash.fleet.stats.year}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* KUNLIK */}
          <button
            type="button"
            onClick={() => setTimeFilter(timeFilter === 'day' ? 'all' : 'day')}
            className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
              timeFilter === 'day'
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-[#E2DBD1] dark:border-[#382F26] bg-stone-50/60 dark:bg-[#161310] hover:border-blue-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                {t.dash.fleet.stats.today}
              </span>
              <span className="text-[10px] font-mono text-stone-400">{todayStr}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300">
                  {periodStats.day.count}
                </span>
                <span className="text-[10px] font-sans font-bold text-stone-400 ml-1">{t.dash.fleet.stats.tripUnit}</span>
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-stone-500 dark:text-stone-400">
              {t.dash.fleet.stats.feeLabel} <strong className="text-emerald-600 dark:text-emerald-400">{periodStats.day.totalFee.toLocaleString('uz-UZ')} {t.dash.fleet.stats.currency}</strong>
            </div>
          </button>

          {/* OYLIK */}
          <button
            type="button"
            onClick={() => setTimeFilter(timeFilter === 'month' ? 'all' : 'month')}
            className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
              timeFilter === 'month'
                ? 'border-purple-500/50 bg-purple-500/10'
                : 'border-[#E2DBD1] dark:border-[#382F26] bg-stone-50/60 dark:bg-[#161310] hover:border-purple-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                {t.dash.fleet.stats.thisMonth}
              </span>
              <span className="text-[10px] font-mono text-stone-400">{monthStr}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
                  {periodStats.month.count}
                </span>
                <span className="text-[10px] font-sans font-bold text-stone-400 ml-1">{t.dash.fleet.stats.tripUnit}</span>
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-stone-500 dark:text-stone-400">
              {t.dash.fleet.stats.feeLabel} <strong className="text-emerald-600 dark:text-emerald-400">{periodStats.month.totalFee.toLocaleString('uz-UZ')} {t.dash.fleet.stats.currency}</strong>
            </div>
          </button>

          {/* YILLIK */}
          <button
            type="button"
            onClick={() => setTimeFilter(timeFilter === 'year' ? 'all' : 'year')}
            className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
              timeFilter === 'year'
                ? 'border-rose-500/50 bg-rose-500/10'
                : 'border-[#E2DBD1] dark:border-[#382F26] bg-stone-50/60 dark:bg-[#161310] hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                {t.dash.fleet.stats.thisYear}
              </span>
              <span className="text-[10px] font-mono text-stone-400">{yearStr}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-rose-700 dark:text-rose-300">
                  {periodStats.year.count}
                </span>
                <span className="text-[10px] font-sans font-bold text-stone-400 ml-1">{t.dash.fleet.stats.tripUnit}</span>
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-stone-500 dark:text-stone-400">
              {t.dash.fleet.stats.feeLabel} <strong className="text-emerald-600 dark:text-emerald-400">{periodStats.year.totalFee.toLocaleString('uz-UZ')} {t.dash.fleet.stats.currency}</strong>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Filter va Qidiruv qatori */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] flex flex-col md:flex-row gap-3 justify-between items-center shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={t.dash.fleet.filter.searchPh}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-[#2E2720] text-[#1A1715] dark:text-[#FAF7F2] focus:ring-2 focus:ring-amber-500/50 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'bg-stone-100 dark:bg-[#201A15] text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            {t.dash.fleet.filter.all} ({deliveries.length})
          </button>
          <button
            onClick={() => setFilterStatus('yolda')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filterStatus === 'yolda'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Navigation className="w-3 h-3" />
            <span>{t.dash.fleet.filter.onWay} ({deliveries.filter(d => d.status === 'yolda').length})</span>
          </button>
          <button
            onClick={() => setFilterStatus('yetkazildi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filterStatus === 'yetkazildi'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{t.dash.fleet.filter.delivered} ({deliveries.filter(d => d.status === 'yetkazildi').length})</span>
          </button>
          <button
            onClick={() => setFilterStatus('kutilmoqda')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filterStatus === 'kutilmoqda'
                ? 'bg-blue-600 text-white font-black shadow-xs'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{t.dash.fleet.filter.waiting} ({deliveries.filter(d => d.status === 'kutilmoqda').length})</span>
          </button>
        </div>
      </div>

      {/* 4. Asosiy Maydon: Jadval va Xarita Yonma-Yon (Split View) */}
      <div className={`grid gap-5 items-start ${
        layoutMode === 'split' 
          ? 'grid-cols-1 lg:grid-cols-12' 
          : layoutMode === 'table' 
          ? 'grid-cols-1' 
          : 'grid-cols-1'
      }`}>
        
        {/* CHAP TOMON: REYSLAR JADVALI (Table) */}
        {(layoutMode === 'split' || layoutMode === 'table') && (
          <div className={`${layoutMode === 'split' ? 'lg:col-span-7' : 'w-full'} rounded-2xl overflow-hidden bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs`}>
            <div className="p-4 border-b border-[#E2DBD1] dark:border-[#382F26] flex items-center justify-between bg-stone-50/60 dark:bg-[#161310]">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-[#1A1715] dark:text-[#FAF7F2]">
                  {t.dash.fleet.table.title}
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                {t.dash.fleet.table.total} <strong className="text-amber-600 dark:text-[#E6C774]">{filteredDeliveries.length} {t.dash.fleet.table.ta}</strong> {t.dash.fleet.table.trips}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2DBD1] dark:border-[#382F26] bg-stone-50/75 dark:bg-[#151210] text-[#7A6F62] dark:text-[#A69C8E] font-bold">
                    <th className="py-3 px-3 text-center w-10">{t.dash.fleet.table.thNum}</th>
                    <th className="py-3 px-3">{t.dash.fleet.table.thTrip}</th>
                    <th className="py-3 px-3">{t.dash.fleet.table.thClient}</th>
                    <th className="py-3 px-3">{t.dash.fleet.table.thDate} <span className="text-amber-600 dark:text-[#D4AF37]">{t.dash.fleet.table.thAuto}</span></th>
                    <th className="py-3 px-3">{t.dash.fleet.table.thDriver}</th>
                    <th className="py-3 px-3 text-center">{t.dash.fleet.table.thFee}</th>
                    <th className="py-3 px-3 text-center">{t.dash.fleet.table.thStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DBD1]/60 dark:divide-[#382F26]/60 text-stone-800 dark:text-stone-200">
                  {paginatedDeliveries.map((trip, idx) => {
                    const isSelected = selectedTrip?.id === trip.id;
                    return (
                      <tr
                        key={trip.id}
                        onClick={() => handleFocusTripOnMap(trip)}
                        className={`transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500/15 dark:bg-amber-500/20 font-medium' 
                            : 'hover:bg-amber-500/5 dark:hover:bg-amber-500/10'
                        }`}
                      >
                        {/* № */}
                        <td className="py-3 px-3 text-center font-mono text-stone-400 font-semibold">
                          {idx + 1}
                        </td>

                        {/* Reys kodi & Yuk xati */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className="font-mono font-black text-amber-700 dark:text-[#E6C774] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-xs">
                              {trip.tripCode}
                            </span>
                            {trip.waybillTtnNumber && (
                              <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                                <FileText className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                                {t.dash.fleet.table.waybill} <strong className="text-cyan-700 dark:text-cyan-300">{trip.waybillTtnNumber}</strong>
                              </span>
                            )}
                            {trip.orderNumber && (
                              <span className="text-[10px] text-stone-500 font-mono">
                                {t.dash.fleet.table.order} <strong>{trip.orderNumber}</strong>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Mijoz & Manzil */}
                        <td className="py-3 px-3 min-w-[200px]">
                          <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                            {trip.clientName}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-start gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{trip.destinationAddress}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1 italic">
                            {trip.cargoSummary}
                          </div>
                        </td>

                        {/* Sana & Vaqt (AVTOMATIK yozib olinadi) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-stone-700 dark:text-stone-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{formatDateTime(trip.createdAt)}</span>
                          </div>
                        </td>

                        {/* Haydovchi & Avto (ADMIN va HAYDOVCHI tanlaydi) */}
                        <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {trip.status === 'yetkazildi' ? (
                            <div>
                              <div className="font-semibold text-stone-800 dark:text-stone-200 text-xs flex items-center gap-1">
                                <User className="w-3 h-3 text-stone-400" />
                                <span>{trip.driverName}</span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-mono mt-0.5 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-amber-500" />
                                <strong className="text-stone-700 dark:text-stone-300">{trip.vehiclePlate}</strong> ({trip.vehicleModel})
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <select
                                value={trip.driverName}
                                onChange={(e) => {
                                  const drv = drivers.find(d => d.fullName === e.target.value);
                                  onUpdateDelivery(trip.id, {
                                    driverName: e.target.value,
                                    driverPhone: drv?.phone || trip.driverPhone
                                  });
                                }}
                                className="px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[11px] font-semibold text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-[190px]"
                                title={t.dash.fleet.table.driverTitle}
                              >
                                {!trip.driverName && <option value="">{t.dash.fleet.table.driverPh}</option>}
                                {drivers.map(d => (
                                  <option key={d.id} value={d.fullName}>{d.fullName} — {d.position}</option>
                                ))}
                                {trip.driverName && !drivers.some(d => d.fullName === trip.driverName) && (
                                  <option value={trip.driverName}>{trip.driverName}</option>
                                )}
                              </select>
                              <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                                <Truck className="w-3 h-3 text-amber-500" />
                                <strong className="text-stone-700 dark:text-stone-300">{trip.vehiclePlate}</strong> ({trip.vehicleModel})
                              </div>
                              {trip.driverPhone && (
                                <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-stone-400" />
                                  {trip.driverPhone}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Yetkazib berish haqi (QO'LDA kiritiladi) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {trip.status === 'yetkazildi' ? (
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                                {trip.deliveryFee ? `${trip.deliveryFee.toLocaleString('uz-UZ')} ${t.dash.fleet.table.currency}` : '—'}
                              </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={trip.deliveryFee ?? ''}
                                onChange={(e) => onUpdateDelivery(trip.id, { deliveryFee: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-24 px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-[#12100E] border border-stone-200 dark:border-[#2E2720] text-[11px] font-mono text-center text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-amber-500"
                                title={t.dash.fleet.table.feeTitle}
                              />
                              <span className="text-[10px] text-stone-400 font-bold">{t.dash.fleet.table.currency}</span>
                            </div>
                          )}
                        </td>

                        {/* Holat (ADMIN va HAYDOVCHI o‘zgartiradi; «Yetkazildi» QOTIB QOLADI) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {trip.status === 'yetkazildi' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t.dash.fleet.table.delivered}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-stone-400 uppercase tracking-wide">
                                <Lock className="w-2.5 h-2.5" />
                                {t.dash.fleet.table.locked}
                              </span>
                            </div>
                          ) : (
                            <select
                              value={trip.status}
                              onChange={(e) => onUpdateDeliveryStatus(trip.id, e.target.value as DeliveryStatus)}
                              className={`px-2.5 py-1.5 rounded-full text-[10px] font-extrabold outline-none cursor-pointer border transition-colors ${
                                trip.status === 'yolda'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                              }`}
                              title={t.dash.fleet.table.statusTitle}
                            >
                              <option value="kutilmoqda">{t.dash.fleet.table.optWaiting}</option>
                              <option value="yolda">{t.dash.fleet.table.optOnWay}</option>
                              <option value="yetkazildi">{t.dash.fleet.table.optDelivered}</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                        {t.dash.fleet.table.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATSIYA (10 / 20 / 30 qator) */}
            <TablePagination
              currentPage={validPage}
              totalItems={filteredDeliveries.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 30]}
            />
          </div>
        )}

        {/* O'NG TOMON: JONLI XARITA (Live Map) */}
        {(layoutMode === 'split' || layoutMode === 'map') && (
          <div className={`${layoutMode === 'split' ? 'lg:col-span-5' : 'w-full'} rounded-2xl overflow-hidden bg-white dark:bg-[#1C1814] border border-[#E2DBD1] dark:border-[#382F26] shadow-xs flex flex-col sticky top-4`}>
            {/* Xarita boshqaruv paneli */}
            <div className="p-3.5 border-b border-[#E2DBD1] dark:border-[#382F26] flex items-center justify-between bg-stone-50/70 dark:bg-[#161310]">
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-[#1A1715] dark:text-[#FAF7F2]">
                  {t.dash.fleet.map.title}
                </span>
                {/* JONLI (LIVE) belgisi */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {t.dash.fleet.map.live}
                </span>
                {activeTripsCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                    <Navigation className="w-2.5 h-2.5" />
                    {activeTripsCount} {t.dash.fleet.map.onWayUnit}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Jonli kuzatuv rejimi */}
                <button
                  type="button"
                  onClick={() => setLiveTracking(prev => !prev)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                    liveTracking
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 hover:bg-stone-200 dark:bg-[#201A15] dark:hover:bg-[#2C241D] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-[#2C241D]'
                  }`}
                  title={t.dash.fleet.map.trackTitle}
                >
                  <Radar className={`w-3 h-3 ${liveTracking ? 'animate-pulse' : ''}`} />
                  <span>{liveTracking ? t.dash.fleet.map.trackOn : t.dash.fleet.map.trackOff}</span>
                </button>

                {/* Street / Satellite Rejimi */}
                <button
                  type="button"
                  onClick={() => setMapTileMode(prev => prev === 'streets' ? 'satellite' : 'streets')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#201A15] dark:hover:bg-[#2C241D] text-stone-700 dark:text-stone-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-stone-200 dark:border-[#2C241D]"
                  title={t.dash.fleet.map.tileTitle}
                >
                  <Satellite className="w-3 h-3 text-amber-500" />
                  <span>{mapTileMode === 'streets' ? t.dash.fleet.map.satellite : t.dash.fleet.map.scheme}</span>
                </button>

                {/* Barcha nuqtalarni sig'dirish */}
                <button
                  type="button"
                  onClick={handleFitAllMarkers}
                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-[#201A15] dark:hover:bg-[#2C241D] text-stone-700 dark:text-stone-300 transition-colors cursor-pointer border border-stone-200 dark:border-[#2C241D]"
                  title={t.dash.fleet.map.fitTitle}
                >
                  <Compass className="w-3.5 h-3.5 text-stone-500" />
                </button>
              </div>
            </div>

            {/* Leaflet Map konteyneri */}
            <div className="relative w-full h-[460px] sm:h-[510px] bg-stone-100 dark:bg-[#141210]">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* Xarita ustidagi mini afisha: Tanlangan reys */}
              {selectedTrip && (
                <div className="absolute bottom-3 left-3 right-3 z-10 p-3 rounded-xl bg-white/95 dark:bg-[#1C1814]/95 backdrop-blur-md border border-stone-300 dark:border-[#382F26] shadow-lg text-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-700 dark:text-[#E6C774] text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {selectedTrip.tripCode}
                        </span>
                        <strong className="text-stone-900 dark:text-white text-xs">{selectedTrip.clientName}</strong>
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-300 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{selectedTrip.destinationAddress}</span>
                      </div>
                    </div>

                    {selectedTrip.status === 'yolda' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold text-[10px] whitespace-nowrap">
                        {t.dash.fleet.map.badgeOnWay}
                      </span>
                    ) : selectedTrip.status === 'yetkazildi' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] whitespace-nowrap">
                        {t.dash.fleet.map.badgeDelivered}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold text-[10px] whitespace-nowrap">
                        {t.dash.fleet.map.badgeWaiting}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-200 dark:border-[#2C241D] flex items-center justify-between text-[11px] text-stone-500">
                    <div>
                      {t.dash.fleet.map.driver} <strong className="text-stone-800 dark:text-stone-200">{selectedTrip.driverName || '—'}</strong> ({selectedTrip.vehiclePlate})
                    </div>
                    {selectedTrip.status !== 'yetkazildi' && (
                      <button
                        type="button"
                        onClick={() => onUpdateDeliveryStatus(selectedTrip.id, 'yetkazildi')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer"
                      >
                        {t.dash.fleet.map.markDelivered}
                      </button>
                    )}
                  </div>

                  {/* Haydovchining joriy harakati (marshrut bo'ylab) */}
                  {selectedTrip.status === 'yolda' && selectedRoute && (
                    <div className="pt-2 border-t border-dashed border-blue-300 dark:border-blue-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-[#2C241D] overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.round(selectedProgress * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-[10px]">
                          {Math.round(selectedProgress * 100)}%
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                        🚚 {t.dash.fleet.map.covered} <strong className="text-blue-700 dark:text-blue-400">{formatRoadDistance((selectedRoute.distance || 0) * selectedProgress)}</strong>
                        {' · '}{t.dash.fleet.map.elapsed} <strong>{formatRoadDuration((selectedRoute.duration || 0) * selectedProgress)}</strong>
                        {' · '}{t.dash.fleet.map.left} <strong className="text-amber-600">{formatRoadDuration((selectedRoute.duration || 0) * (1 - selectedProgress))}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MARSHRUT MA'LUMOTLARI: real yo'l bo'ylab qadam-baqadam (yo'l nomi + vaqt) */}
            {selectedTrip && (
              <div className="border-t border-[#E2DBD1] dark:border-[#382F26] bg-stone-50/80 dark:bg-[#161310] text-xs">
                <button
                  type="button"
                  onClick={() => setShowRouteSteps(v => !v)}
                  className="w-full px-3 py-2.5 flex items-center justify-between gap-2 font-bold text-[#1A1715] dark:text-[#FAF7F2] hover:bg-stone-100 dark:hover:bg-[#201A15] transition-colors cursor-pointer"
                  title={t.dash.fleet.route.toggleTitle}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {selectedRoute
                      ? selectedRoute.isFallback
                        ? `${t.dash.fleet.route.fallbackA} ${formatRoadDistance(selectedRoute.distance)}`
                        : `${t.dash.fleet.route.realA} ${formatRoadDistance(selectedRoute.distance)} · ${formatRoadDuration(selectedRoute.duration)}`
                      : t.dash.fleet.route.loading}
                    {!selectedRoute && <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {selectedRoute && selectedRoute.steps.length > 0 && (
                      <span className="text-[10px] font-mono text-stone-500">{selectedRoute.steps.length} {t.dash.fleet.route.segmentUnit}</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRouteSteps ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {showRouteSteps && (
                  <div className="px-3 pb-3">
                    {routeStepsCum.length === 0 ? (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 py-1">
                        {selectedRoute?.isFallback
                          ? t.dash.fleet.route.noService
                          : t.dash.fleet.route.noSteps}
                      </p>
                    ) : (
                      <ol className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {routeStepsCum.map((s, i) => {
                          const traveled = selectedProgress * (selectedRoute?.distance || 0);
                          const done = s.cumDistance <= traveled + 1;
                          const roadName = s.name || MANEUVER_LABELS[s.type || ''] || t.dash.fleet.route.segmentFallback;
                          return (
                            <li
                              key={i}
                              className={`flex items-start gap-2 p-1.5 rounded-lg ${
                                done
                                  ? 'bg-blue-500/10 border border-blue-500/20'
                                  : 'bg-white dark:bg-[#141210] border border-stone-200 dark:border-[#2C241D]'
                              }`}
                            >
                              <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-black ${
                                done ? 'bg-blue-600 text-white' : 'bg-stone-200 dark:bg-[#2C241D] text-stone-500'
                              }`}>
                                {done ? '✓' : i + 1}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className={`block text-[11px] font-semibold truncate ${done ? 'text-blue-800 dark:text-blue-300' : 'text-stone-700 dark:text-stone-200'}`}>
                                  {roadName}
                                </span>
                                <span className="block text-[10px] font-mono text-stone-500 dark:text-stone-400">
                                  {formatRoadDistance(s.distance)} · {formatRoadDuration(s.duration)}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Xarita tagidagi belgilar tushuntirishi (Legend) */}
            <div className="p-2.5 bg-stone-50/80 dark:bg-[#161310] border-t border-[#E2DBD1] dark:border-[#382F26] flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-5 h-[3px] bg-blue-600 inline-block rounded"></span>
                  <span>{t.dash.fleet.legend.realRoute}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>{t.dash.fleet.legend.onWay}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>{t.dash.fleet.legend.delivered}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span>{t.dash.fleet.legend.waiting}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>🚚</span>
                  <span>{t.dash.fleet.legend.driverCar}</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-400">
                {t.dash.fleet.legend.warehouse}
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
