import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, Role } from './api';

export interface Session {
  role: Role;
  name: string;
  employeeId?: number;
  position?: string;
}

interface AuthValue {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const KEY = 'cleanlife_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      login: async (username: string, password: string) => {
        const res = await api.auth.login(username.trim(), password);
        if (res.role !== 'admin' && res.role !== 'staff') {
          throw new Error('Noma’lum rol.');
        }
        const s: Session = {
          role: res.role,
          name: res.name || username,
          employeeId: res.employee_id,
          position: res.position,
        };
        await AsyncStorage.setItem(KEY, JSON.stringify(s));
        setSession(s);
      },
      logout: async () => {
        await AsyncStorage.removeItem(KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

/** Haydovchi ekanini lavozimdan aniqlash */
export const isDriver = (position?: string) =>
  /haydovchi|driver|voditel/i.test(position || '');

export type AppRole = 'admin' | 'driver' | 'staff';

export const useAppRole = (): AppRole => {
  const { session } = useAuth();
  if (!session || session.role === 'admin') return 'admin';
  return isDriver(session.position) ? 'driver' : 'staff';
};
