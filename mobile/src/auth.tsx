import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, authTokenStore, Role } from './api';

export interface Session {
  role: Role;
  name: string;
  employeeId?: number;
  position?: string;
}

export type AppRole = 'admin' | 'driver' | 'staff';

interface AuthValue {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const KEY = 'cleanlife_session';

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const isDriverPos = (position?: string): boolean =>
  /haydovchi|driver|voditel/i.test(position || '');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    (async () => {
      try {
        // Birinchi — token'ni memory'ga chiqarib qo'yamiz, keyingi API chaqiriqlarda ishlasin
        await authTokenStore.restore();
        const raw = await AsyncStorage.getItem(KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            (parsed.role === 'admin' ||
              parsed.role === 'staff' ||
              parsed.role === 'driver')
          ) {
            setSession(parsed);
          }
        }
      } catch {
        /* ignore corrupted storage */
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.auth.login(username.trim(), password);
    if (res.role !== 'admin' && res.role !== 'staff' && res.role !== 'driver') {
      throw new Error('Noma’lum rol.');
    }
    const s: Session = {
      role: res.role,
      name: res.name || username,
      employeeId: res.employee_id,
      position: res.position,
    };
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage write failed — in-memory session still works */
    }
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore — token local'da baribir tozalanadi */
    }
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    authTokenStore.clear();
    setSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session, loading, login, logout }),
    [session, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => useContext(AuthContext);

export const useAppRole = (): AppRole => {
  const { session } = useAuth();
  if (!session) return 'admin';
  if (session.role === 'admin') return 'admin';
  return isDriverPos(session.position) ? 'driver' : 'staff';
};

export const isDriver = isDriverPos;
