// Backend bazasini aniqlash:
//  1) Agar EXPO_PUBLIC_API_BASE env berilgan bo'lsa — shu.
//  2) Web rejimida (brauzerda) sahifa ochilgan host:8000
//     (localhost, 127.0.0.1, LAN IP yoki VPS host — hammasi ishlaydi).
//  3) Native (Expo Go) rejimida: host o'zi (bir xil LAN).
const webHost =
  typeof (globalThis as any).window !== 'undefined'
    ? ((globalThis as any).window.location?.hostname as string | undefined)
    : undefined;

const sameHostApi = webHost ? `http://${webHost}:8000/api` : '';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || sameHostApi || 'http://192.168.1.7:8000/api';

export const APP_NAME = 'Clean Life ERP';
