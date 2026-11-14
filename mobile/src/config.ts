import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Backend bazasini aniqlash:
//  1) Agar EXPO_PUBLIC_API_BASE env berilgan bo'lsa (eas.json preview profile) — shu.
//  2) Dev rejimida (Expo development bundler) — Metro xosti bo'yicha http://<hostIp>:8000/api.
//     Bu LAN'da test qilayotgan telefon avtomatik lokal Django dev server'ga ulanadi.
//  3) Web rejimida (brauzerda) sahifa ochilgan host:8000.
//  4) Aks holda — production (`https://cleanlife.uz/api`).

const devHost = (() => {
  // Expo 49+ da `expoConfig.hostUri`, ilgari `manifest.debuggerHost`.
  const c: any = Constants;
  const raw =
    c?.expoConfig?.hostUri ||
    c?.expoGoConfig?.debuggerHost ||
    c?.manifest2?.extra?.expoClient?.hostUri ||
    c?.manifest?.debuggerHost ||
    '';
  // raw: "192.168.1.8:8082" — port'ni olib tashlab, 8000'ga qo'yamiz
  const ip = String(raw).split(':')[0].trim();
  return ip && ip !== 'localhost' ? ip : '';
})();

const webHost =
  Platform.OS === 'web' &&
  typeof (globalThis as any).window !== 'undefined' &&
  (globalThis as any).window.location?.hostname
    ? ((globalThis as any).window.location.hostname as string)
    : undefined;

const sameHostApi =
  Platform.OS !== 'web' && devHost
    ? `http://${devHost}:8000/api`
    : webHost
      ? `http://${webHost}:8000/api`
      : '';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || sameHostApi || 'https://cleanlife.uz/api';

export const APP_NAME = 'Clean Life ERP';
