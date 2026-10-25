import { Platform } from 'react-native';

// Backend bazasini aniqlash:
//  1) Agar EXPO_PUBLIC_API_BASE env berilgan bo'lsa (eas.json preview profile) — shu.
//  2) Web rejimida (brauzerda) sahifa ochilgan host:8000.
//  3) Aks holda — production (`https://cleanlife.uz/api`).
//
// MUHIM: React Native'da `window` global polyfill mavjud, lekin `window.location` yo'q.
// Faqat `typeof window` tekshiruvi yolg'onchi true beradi — Platform.OS === 'web' bilan
// aniq ajratamiz. Bu APK'da sahifa URL'ini xato olishning oldini oladi.
const webHost =
  Platform.OS === 'web' &&
  typeof (globalThis as any).window !== 'undefined' &&
  (globalThis as any).window.location?.hostname
    ? ((globalThis as any).window.location.hostname as string)
    : undefined;

const sameHostApi = webHost ? `http://${webHost}:8000/api` : '';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || sameHostApi || 'https://cleanlife.uz/api';

export const APP_NAME = 'Clean Life ERP';
