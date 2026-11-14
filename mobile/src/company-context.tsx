import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from './api';
import { useAuth } from './auth';

interface CompanyData {
  name: string;
  logo: string;
  address: string;
  phone: string;
  slogan: string;
  refresh: () => Promise<void>;
}

const DEFAULTS: Omit<CompanyData, 'refresh'> = {
  name: 'Clean Life',
  logo: '',
  address: '',
  phone: '',
  slogan: '',
};

const CompanyContext = createContext<CompanyData>({ ...DEFAULTS, refresh: async () => {} });

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [data, setData] = useState<Omit<CompanyData, 'refresh'>>(DEFAULTS);
  const inflightRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const c = (await api.company.get()) as Record<string, unknown> | null;
      if (c) {
        setData({
          name: String(c.name || DEFAULTS.name),
          logo: String(c.logo || ''),
          address: String(c.address || c.location || ''),
          phone: String(c.phone || ''),
          slogan: String(c.slogan || ''),
        });
      }
    } catch {
      /* server offline — fallback saqlanadi */
    } finally {
      inflightRef.current = false;
    }
  }, []);

  // 1) Session o'zgarganda birinchi yuklash
  useEffect(() => {
    if (!session) return;
    fetchOnce();
  }, [session, fetchOnce]);

  // 2) Har 60 soniyada avtomatik — admin veb-saytda tahrirlasa, mobil darhol oladi
  useEffect(() => {
    if (!session) return;
    const id = setInterval(fetchOnce, 60_000);
    return () => clearInterval(id);
  }, [session, fetchOnce]);

  // 3) App foreground'ga qaytganda — qat'iy yangilanish
  useEffect(() => {
    if (!session) return;
    const onChange = (st: AppStateStatus) => {
      if (st === 'active') fetchOnce();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [session, fetchOnce]);

  return (
    <CompanyContext.Provider value={{ ...data, refresh: fetchOnce }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
