// Eng birinchi yuklanadi (index.ts dagi birinchi import).
// http (secure bo'lmagan) manzilda crypto.randomUUID bo'lmasligi mumkin.
const uuidPolyfill = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) =>
    (c === 'x' ? Math.random() : Math.random() * 0.5 + 0.5).toString(16),
  );

if (typeof crypto === 'undefined') {
  (globalThis as any).crypto = { randomUUID: uuidPolyfill };
} else if (typeof (crypto as any).randomUUID !== 'function') {
  (crypto as any).randomUUID = uuidPolyfill;
}

export {};
