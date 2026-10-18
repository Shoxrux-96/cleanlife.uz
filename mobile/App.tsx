import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth';
import { RootNavigator } from './src/nav';


// Polyfill for crypto.randomUUID (some browsers/extensions don't support it)
const uuidPolyfill = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() : Math.random() * 0.5 + 0.5).toString(16));

if (typeof crypto === 'undefined') {
  (globalThis as any).crypto = { randomUUID: uuidPolyfill };
} else if (typeof crypto.randomUUID !== 'function') {
  (crypto as any).randomUUID = uuidPolyfill;
}

export default function App() {
  useEffect(() => {
    // Web da ildiz balandligi bo'lmasa ekran bo'sh ko'rinadi
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const css = 'html,body,#root,#root>div{height:100%!important;min-height:100vh;margin:0;background:#121110;}';
      const el = document.createElement('style');
      el.textContent = css;
      document.head.appendChild(el);
    }
  }, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
