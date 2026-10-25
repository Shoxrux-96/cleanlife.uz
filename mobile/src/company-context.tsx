import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

interface CompanyData {
  name: string;
  logo?: string;
  address?: string;
}

const CompanyContext = createContext<CompanyData>({ name: 'Clean Life', logo: '' });

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [data, setData] = useState<CompanyData>({ name: 'Clean Life', logo: '' });

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const c = (await api.company.get()) as Record<string, unknown> | null;
        if (!cancelled && c) {
          setData({
            name: String(c.name || 'Clean Life'),
            logo: (c.logo as string) || '',
            address: (c.address as string) || '',
          });
        }
      } catch {
        /* server offline — fallback nom qoladi */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return <CompanyContext.Provider value={data}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => useContext(CompanyContext);
