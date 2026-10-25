import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Search, Check, X, Compass, Loader2, Layers, Satellite, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface OsmMapPickerProps {
  initialLocation?: string;
  onSelectLocation: (locationStr: string, details?: { address?: string; district?: string; region?: string }) => void;
  onClose: () => void;
}

// Default center: Tashkent, Uzbekistan
const DEFAULT_LAT = 41.311081;
const DEFAULT_LNG = 69.240562;

const QUICK_CITIES = [
  { name: 'Toshkent', lat: 41.311081, lng: 69.240562 },
  { name: 'Samarqand', lat: 39.65417, lng: 66.95972 },
  { name: 'Buxoro', lat: 39.77472, lng: 64.42861 },
  { name: 'Andijon', lat: 40.78206, lng: 72.34424 },
  { name: 'Farg‘ona', lat: 40.38421, lng: 71.78432 },
  { name: 'Namangan', lat: 40.9983, lng: 71.67257 }
];

export const OsmMapPicker: React.FC<OsmMapPickerProps> = ({
  initialLocation,
  onSelectLocation,
  onClose
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Tile layers refs
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const { t } = useLanguage();

  // Parse existing coordinates if available (e.g. from google maps url or "lat, lng")
  const parseCoords = (loc?: string): [number, number] => {
    if (!loc) return [DEFAULT_LAT, DEFAULT_LNG];
    const match = loc.match(/([0-9]+\.[0-9]+)[,\s]+([0-9]+\.[0-9]+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [DEFAULT_LAT, DEFAULT_LNG];
  };

  const [coords, setCoords] = useState<[number, number]>(() => parseCoords(initialLocation));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [reverseAddress, setReverseAddress] = useState<string | null>(null);
  const [isReverseLoading, setIsReverseLoading] = useState(false);

  // Custom Luxury Gold Pin for OpenStreetMap
  const createCustomIcon = () => {
    return L.divIcon({
      className: 'custom-osm-pin-container',
      html: `
        <div style="position: relative; width: 36px; height: 42px; transform: translate(-50%, -100%); cursor: grab;">
          <div style="
            background: linear-gradient(135deg, #F3C644, #C59B27);
            color: #000;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            border: 2.5px solid #FFFFFF;
            margin: 0 auto;
          ">
            <div style="transform: rotate(45deg); width: 10px; height: 10px; background: #1A1715; border-radius: 50%;"></div>
          </div>
          <div style="
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 14px;
            height: 5px;
            background: rgba(0,0,0,0.4);
            border-radius: 50%;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42]
    });
  };

  // Reverse geocode from OpenStreetMap Nominatim
  const fetchReverseGeocode = async (lat: number, lng: number) => {
    setIsReverseLoading(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'uz, ru, en'
          }
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.display_name) {
          setReverseAddress(data.display_name);
        }
      }
    } catch {
      // ignore network errors for reverse geocode
    } finally {
      setIsReverseLoading(false);
    }
  };

  // Mode switcher handler
  const handleSwitchMode = (mode: 'streets' | 'satellite') => {
    setMapMode(mode);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mode === 'satellite') {
      // Remove streets layer
      if (streetLayerRef.current && map.hasLayer(streetLayerRef.current)) {
        map.removeLayer(streetLayerRef.current);
      }
      // Add satellite layer
      if (satelliteLayerRef.current && !map.hasLayer(satelliteLayerRef.current)) {
        satelliteLayerRef.current.addTo(map);
      }
      // Add labels overlay
      if (labelsLayerRef.current && !map.hasLayer(labelsLayerRef.current)) {
        labelsLayerRef.current.addTo(map);
      }
    } else {
      // Remove satellite and labels layers
      if (satelliteLayerRef.current && map.hasLayer(satelliteLayerRef.current)) {
        map.removeLayer(satelliteLayerRef.current);
      }
      if (labelsLayerRef.current && map.hasLayer(labelsLayerRef.current)) {
        map.removeLayer(labelsLayerRef.current);
      }
      // Add streets layer
      if (streetLayerRef.current && !map.hasLayer(streetLayerRef.current)) {
        streetLayerRef.current.addTo(map);
      }
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initial = parseCoords(initialLocation);
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView(initial, 13);
    // Zoom tugmalarini pastki chap burchakka joylashtirish (karta/sputnik tugmalaridan tagiga)
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // 1. Street layer (CartoDB Voyager — OSM asosli, global CDN, cheklovsiz)
    streetLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    });

    // 2. Satellite layer (Esri World Imagery)
    satelliteLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // 3. Boundaries and Roads Labels layer (Reference)
    labelsLayerRef.current = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      opacity: 0.9
    });

    // Tarmoq uzilganda (ERR_NETWORK_CHANGED va b.) plitkalarni avtomatik qayta yuklash
    [streetLayerRef.current, satelliteLayerRef.current, labelsLayerRef.current].forEach((layer) => {
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

    const icon = createCustomIcon();
    const marker = L.marker(initial, { icon, draggable: true }).addTo(map);
    markerRef.current = marker;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCoords([lat, lng]);
      fetchReverseGeocode(lat, lng);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCoords([pos.lat, pos.lng]);
      fetchReverseGeocode(pos.lat, pos.lng);
    });

    mapInstanceRef.current = map;

    // Trigger size update
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // Initial reverse geocode
    fetchReverseGeocode(initial[0], initial[1]);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleCityJump = (lat: number, lng: number) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.setView([lat, lng], 13);
    markerRef.current.setLatLng([lat, lng]);
    setCoords([lat, lng]);
    fetchReverseGeocode(lat, lng);
  };

  const handleSearchNominatim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchMessage(null);

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', O‘zbekiston')}&limit=1`,
        {
          headers: {
            'Accept-Language': 'uz, ru, en'
          }
        }
      );
      if (resp.ok) {
        const results = await resp.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            markerRef.current.setLatLng([lat, lng]);
            setCoords([lat, lng]);
            setReverseAddress(first.display_name);
          }
        } else {
          setSearchMessage(t.dash.map.search.notFound);
        }
      }
    } catch {
      setSearchMessage(t.dash.map.search.error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmLocation = () => {
    const [lat, lng] = coords;
    const formattedUrl = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    onSelectLocation(formattedUrl, {
      address: reverseAddress || undefined
    });
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#151310] border-2 border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="p-3.5 bg-stone-100 dark:bg-[#1E1914] border-b border-stone-200 dark:border-[#2D251D] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-[#E6C774] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-xs sm:text-sm text-stone-900 dark:text-white truncate">
              {t.dash.map.header.title}
            </h4>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
              {t.dash.map.header.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-[#2A231B] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          title={t.dash.map.header.closeTitle}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Quick Cities Bar */}
      <div className="p-3 bg-stone-50 dark:bg-[#181512] border-b border-stone-200 dark:border-[#2D251D] space-y-2">
        <form onSubmit={handleSearchNominatim} className="relative flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t.dash.map.search.placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#12100E] border border-stone-300 dark:border-[#382F26] text-stone-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-[#2A231B] hover:bg-amber-500 hover:text-black text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t.dash.map.search.button}</span>
          </button>
        </form>

        {searchMessage && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{searchMessage}</p>
        )}

        {/* Quick city tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
          <span className="text-stone-400 font-bold shrink-0">{t.dash.map.quick}</span>
          {QUICK_CITIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleCityJump(c.lat, c.lng)}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-[#201B16] border border-stone-200 dark:border-[#2F2720] hover:border-amber-500 text-stone-700 dark:text-stone-300 font-semibold shrink-0 cursor-pointer transition-colors"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map canvas container */}
      <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] w-full bg-stone-100 dark:bg-stone-900">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

        {/* REJIM TANLASH (Karta / Sun'iy yo'ldosh) - Floating Mode Switcher */}
        <div className="absolute top-3 left-3 z-20 flex items-center bg-white/95 dark:bg-[#181512]/95 backdrop-blur-md p-1 rounded-xl border-2 border-stone-300/80 dark:border-[#382F26] shadow-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => handleSwitchMode('streets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mapMode === 'streets'
                ? 'bg-amber-500 text-stone-950 font-black shadow-sm ring-1 ring-amber-600/30'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#251E18]'
            }`}
            title={t.dash.map.mode.mapTitle}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{t.dash.map.mode.map}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('satellite')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mapMode === 'satellite'
                ? 'bg-amber-500 text-stone-950 font-black shadow-sm ring-1 ring-amber-600/30'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#251E18]'
            }`}
            title={t.dash.map.mode.satelliteTitle}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>{t.dash.map.mode.satellite}</span>
          </button>
        </div>

        {/* Floating crosshair prompt with coordinates */}
        <div className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-[#181512]/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-stone-200 dark:border-[#2E2720] shadow-md text-[11px] font-mono font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 pointer-events-none">
          <Navigation className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
        </div>
      </div>

      {/* Footer bar with Address and Confirmation */}
      <div className="p-3 bg-stone-50 dark:bg-[#181512] border-t border-stone-200 dark:border-[#2D251D] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-xs min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[11px]">
            <Compass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{t.dash.map.footer.selectedLabel}</span>
            {isReverseLoading && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
          </div>
          <p className="font-semibold text-stone-900 dark:text-white truncate mt-0.5 text-xs" title={reverseAddress || t.dash.map.footer.fallbackCoords}>
            {reverseAddress || `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-[#382F26] text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-200 dark:hover:bg-[#251E18] transition-colors cursor-pointer"
          >
            {t.dash.map.footer.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirmLocation}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{t.dash.map.footer.confirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
