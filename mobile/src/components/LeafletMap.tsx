import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

/**
 * Platforma-agnostik Leaflet xarita komponenti.
 * - Web (react-native-web) rejimida: to'g'ridan-to'g'ri `document` + Leaflet
 * - Native (Android/iOS): HTML sahifasini WebView ichida yuklaydi (Leaflet CDN'dan)
 *
 * Bu komponent `react-native-maps`'ni almashtiradi — Google Maps API kaliti kerak
 * emas va Androidda crash qilmaydi.
 */

export type LatLng = [number, number];

export interface LeafletMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string; // "#RRGGBB" — dot rangi
  icon?: string;  // emoji yoki qisqa matn (optional)
}

export interface LeafletPolyline {
  id: string;
  coords: LatLng[];
  color?: string;
  weight?: number;
}

interface Props {
  center: LatLng;
  zoom?: number;
  markers?: LeafletMarker[];
  polylines?: LeafletPolyline[];
  layer?: 'street' | 'satellite';
  onMarkerPress?: (id: string) => void;
  style?: any;
}

const STREET = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function buildHtml(p: Props): string {
  const { center, zoom = 12, markers = [], polylines = [], layer = 'street' } = p;
  const tileUrl = layer === 'satellite' ? SATELLITE : STREET;
  const safeJson = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background:#eee; }
  .m-dot {
    display:flex; align-items:center; justify-content:center;
    width:28px; height:28px; border-radius:50%; border:2px solid #fff;
    background:#D4AF37; color:#fff; font-weight:800; font-size:12px;
    box-shadow: 0 2px 6px rgba(0,0,0,.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var post = function(obj){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e){} };
  try {
    var CENTER = ${safeJson(center)};
    var ZOOM = ${zoom};
    var MARKERS = ${safeJson(markers)};
    var POLYLINES = ${safeJson(polylines)};
    var TILE = ${safeJson(tileUrl)};

    var map = L.map('map', { zoomControl: true }).setView(CENTER, ZOOM);
    L.tileLayer(TILE, { maxZoom: 19, attribution: '&copy; OSM' }).addTo(map);

    MARKERS.forEach(function(m){
      var color = m.color || '#D4AF37';
      var html = '<div class="m-dot" style="background:'+color+'">'+(m.icon || '•')+'</div>';
      var mk = L.marker([m.lat, m.lng], {
        icon: L.divIcon({ className:'', html: html, iconSize: [28,28], iconAnchor: [14,14] })
      }).addTo(map);
      if (m.label) mk.bindPopup(m.label);
      mk.on('click', function(){ post({type:'marker', id:m.id}); });
    });

    POLYLINES.forEach(function(p){
      var ll = (p.coords || []).map(function(c){ return [c[0], c[1]]; });
      if (ll.length < 2) return;
      L.polyline(ll, { color: p.color || '#2563EB', weight: p.weight || 4, opacity: 0.9 }).addTo(map);
    });

    // Fit markers if more than 1
    if (MARKERS.length > 1) {
      try {
        var g = L.featureGroup(MARKERS.map(function(m){ return L.marker([m.lat, m.lng]); }));
        map.fitBounds(g.getBounds().pad(0.2));
      } catch(e){}
    }

    post({type:'ready'});
  } catch(e){ post({type:'error', message: String(e && e.message || e)}); }
})();
</script>
</body>
</html>`;
}

export const LeafletMap: React.FC<Props> = (props) => {
  // --- Web implementation: direct DOM + Leaflet ---
  const hostRef = useRef<any>(null);

  if (Platform.OS === 'web') {
    useEffect(() => {
      if (!hostRef.current) return;
      let destroyed = false;

      const ensureCss = () => {
        const id = 'leaflet-css-sg';
        if (document.getElementById(id)) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.id = id;
        l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(l);
      };

      const ensureJs = () =>
        new Promise<any>((resolve, reject) => {
          const w = window as any;
          if (w.L) return resolve(w.L);
          const id = 'leaflet-js-sg';
          const prev = document.getElementById(id);
          if (prev) {
            prev.addEventListener('load', () => resolve((window as any).L));
            prev.addEventListener('error', () => reject(new Error('leaflet load fail')));
            return;
          }
          const s = document.createElement('script');
          s.id = id;
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.async = true;
          s.onload = () => resolve((window as any).L);
          s.onerror = () => reject(new Error('leaflet load fail'));
          document.head.appendChild(s);
        });

      (async () => {
        ensureCss();
        const L = await ensureJs();
        if (destroyed) return;
        const host = hostRef.current;
        if (!host) return;
        host.innerHTML = '';
        const map = L.map(host, { zoomControl: true }).setView(
          props.center,
          props.zoom ?? 12,
        );
        const tileUrl =
          props.layer === 'satellite' ? SATELLITE : STREET;
        L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
        (props.markers ?? []).forEach((m) => {
          const html = `<div class="m-dot" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:${m.color || '#D4AF37'};color:#fff;font-weight:800;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.35)">${m.icon || '•'}</div>`;
          const mk = L.marker([m.lat, m.lng], {
            icon: L.divIcon({ className: '', html, iconSize: [28, 28], iconAnchor: [14, 14] }),
          }).addTo(map);
          if (m.label) mk.bindPopup(m.label);
          if (props.onMarkerPress) mk.on('click', () => props.onMarkerPress!(m.id));
        });
        (props.polylines ?? []).forEach((p) => {
          if ((p.coords || []).length < 2) return;
          L.polyline(p.coords.map(([la, ln]: LatLng) => [la, ln]), {
            color: p.color || '#2563EB',
            weight: p.weight || 4,
            opacity: 0.9,
          }).addTo(map);
        });
        if ((props.markers ?? []).length > 1) {
          try {
            const g = L.featureGroup(
              (props.markers ?? []).map((m) => L.marker([m.lat, m.lng])),
            );
            map.fitBounds(g.getBounds().pad(0.2));
          } catch { /* ignore */ }
        }
        (host as any).__map = map;
      })().catch(() => { /* ignore */ });

      return () => {
        destroyed = true;
        try {
          const m = (hostRef.current as any)?.__map;
          if (m && typeof m.remove === 'function') m.remove();
        } catch { /* ignore */ }
      };
    }, [props.center[0], props.center[1], props.zoom, props.layer, JSON.stringify(props.markers), JSON.stringify(props.polylines)]);

    return React.createElement('div' as any, {
      ref: hostRef,
      style: { width: '100%', height: '100%', ...(props.style as object) },
    });
  }

  // --- Native implementation: WebView + Leaflet HTML ---
  const html = useMemo(() => buildHtml(props), [JSON.stringify(props.center), props.zoom, props.layer, JSON.stringify(props.markers), JSON.stringify(props.polylines)]);
  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d?.type === 'marker' && props.onMarkerPress) props.onMarkerPress(String(d.id));
    } catch { /* ignore */ }
  };

  return (
    <View style={[styles.wrap, props.style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#eee' },
});
