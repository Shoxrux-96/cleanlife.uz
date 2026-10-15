// Backend manzili:
// - Expo Go (telefon): EXPO_PUBLIC_API_BASE yoki kompyuter LAN IP.
// - Web export (serverda): sahifa ochilgan hostning 8000-porti.
const webHost =
  typeof (globalThis as any).window !== 'undefined'
    ? ((globalThis as any).window.location?.hostname as string)
    : '';
const sameHostApi =
  webHost && webHost !== 'localhost' && webHost !== '127.0.0.1'
    ? `http://${webHost}:8000/api`
    : '';
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  sameHostApi ||
  'http://192.168.1.7:8000/api';

export const APP_NAME = 'Clean Life ERP';
