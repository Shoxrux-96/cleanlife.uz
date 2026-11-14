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

// UI darajadagi marshrut toifasi:
//  admin / manager → AdminTabs (to'liq boshqaruv)
//  driver → DriverTabs
//  basic  → StaffTabs (faqat o'ziga xizmat)
export type AppRole = 'admin' | 'manager' | 'driver' | 'basic';

const VALID_ROLES: readonly Role[] = ['admin', 'manager', 'driver', 'basic'];

// HR va boshqa admin-only amallar uchun markazlashtirilgan tekshiruv.
export const canAdminWrite = (role?: Role | null): boolean => role === 'admin';

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

const isBasicPos = (position?: string): boolean =>
  /elektrik|oshpaz|qarovul/i.test(position || '');

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
          if (parsed && parsed.role) {
            // Eski saqlangan 'staff' rolini 'manager'ga (yoki basic'ga) ko'chiramiz
            const role: Role = VALID_ROLES.includes(parsed.role as Role)
              ? (parsed.role as Role)
              : parsed.role === 'staff' ? 'manager' : 'basic';
            setSession({ ...parsed, role });
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
    // Noma'lum rolni 'basic'ga tushiramiz — kelajakdagi yangi rollar uchun ham barqaror.
    const role: Role = VALID_ROLES.includes(res.role as Role)
      ? (res.role as Role)
      : 'basic';
    const s: Session = {
      role,
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
  // Server endi rolni to'liq hisoblaydi — unga ishonamiz, pozitsiyadan ham
  // orqa chiziq (eski token'lar uchun).
  const r = session.role;
  if (r === 'admin' || r === 'manager' || r === 'driver' || r === 'basic') return r;
  if (isDriverPos(session.position)) return 'driver';
  if (isBasicPos(session.position)) return 'basic';
  return 'manager';
};

export const isDriver = isDriverPos;
export const isBasic = isBasicPos;

// HR va admin-only amallar uchun qulay hook.
export const useCanAdminWrite = (): boolean => {
  const { session } = useAuth();
  return canAdminWrite(session?.role);
};
