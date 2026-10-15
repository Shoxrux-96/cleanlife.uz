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

// Diagnostika: har qanday fatal xatoni telefonda popup qilib ko'rsatish.
// (Xato matnini o'qib menga yuboring.)
try {
  const EU = (globalThis as any).ErrorUtils;
  if (EU && typeof EU.setGlobalHandler === 'function') {
    const prev = typeof EU.getGlobalHandler === 'function' ? EU.getGlobalHandler() : null;
    EU.setGlobalHandler((e: any) => {
      try {
        const msg = String((e && e.message) || (e && e.stack) || e).slice(0, 500);
        setTimeout(() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('react-native').Alert.alert('Xatolik', msg);
          } catch {
            /* ignore */
          }
        }, 500);
      } catch {
        /* ignore */
      }
      try {
        if (prev) prev(e);
      } catch {
        /* ignore */
      }
    });
  }
} catch {
  /* ignore */
}

export {};
