import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Card, H1, Loader, Muted } from '../../components';
import { colors, fmtMoney } from '../../theme';

interface OverviewData {
  trips: { month: { trip_count: number; total_delivery_fee: number } };
  orders: { total: number; in_progress: number; delivered: number };
  waybills: { total: number };
  clients: { total: number };
  employees: { total: number };
  products: { total: number };
  materials: { total: number };
}

const num = (v: unknown): number => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const p = parseFloat(v);
    return Number.isNaN(p) ? 0 : p;
  }
  return 0;
};

const section = (r: Record<string, unknown>, key: string): Record<string, unknown> =>
  (r[key] as Record<string, unknown>) ?? {};

const monthOf = (r: Record<string, unknown>): Record<string, unknown> => {
  const trips = section(r, 'trips');
  return (trips.month as Record<string, unknown>) ?? {};
};

export const HomeScreen: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.overview();
      const m = monthOf(r);
      const orders = section(r, 'orders');
      const waybills = section(r, 'waybills');
      const clients = section(r, 'clients');
      const employees = section(r, 'employees');
      const products = section(r, 'products');
      const materials = section(r, 'materials');
      setData({
        trips: {
          month: {
            trip_count: num(m.trip_count),
            total_delivery_fee: num(m.total_delivery_fee),
          },
        },
        orders: {
          total: num(orders.total),
          in_progress: num(orders.in_progress),
          delivered: num(orders.delivered),
        },
        waybills: { total: num(waybills.total) },
        clients: { total: num(clients.total) },
        employees: { total: num(employees.total) },
        products: { total: num(products.total) },
        materials: { total: num(materials.total) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Maʼlumot yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Loader />;
  if (error && !data) {
    return (
      <View style={s.center}>
        <Text style={s.error}>{error}</Text>
        <TouchableOpacity style={s.retry} onPress={load}>
          <Text style={s.retryText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const d = data;
  const kpis: { label: string; value: string }[] = [
    { label: 'Buyurtmalar (jami)', value: String(d?.orders.total ?? 0) },
    { label: 'Jarayondagi', value: String(d?.orders.in_progress ?? 0) },
    { label: 'Yetkazilgan', value: String(d?.orders.delivered ?? 0) },
    { label: 'Safarlar (oy)', value: String(d?.trips.month.trip_count ?? 0) },
    {
      label: 'Yetkazish haqi (oy)',
      value: fmtMoney(d?.trips.month.total_delivery_fee ?? 0),
    },
    { label: 'Yuk xatlari', value: String(d?.waybills.total ?? 0) },
    { label: 'Mijozlar', value: String(d?.clients.total ?? 0) },
    { label: 'Xodimlar', value: String(d?.employees.total ?? 0) },
    { label: 'Mahsulotlar', value: String(d?.products.total ?? 0) },
    { label: 'Materiallar', value: String(d?.materials.total ?? 0) },
  ];

  const go = (name: 'Buyurtmalar' | 'Ombor' | 'Moliya' | 'Boshqa') => {
    navigation.navigate(name as never);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <H1>Boshqaruv paneli</H1>
      <Muted>{session?.name ? `Xush kelibsiz, ${session.name}!` : 'Xush kelibsiz!'}</Muted>
      {error ? <Text style={s.errorInline}>{error}</Text> : null}
      <View style={s.grid}>
        {kpis.map((k) => (
          <Card key={k.label} style={s.kpi}>
            <Text style={s.kpiValue}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </Card>
        ))}
      </View>
      <Text style={s.sectionTitle}>Tezkor o‘tish</Text>
      <View style={s.navGrid}>
        <TouchableOpacity style={s.navBtn} onPress={() => go('Buyurtmalar')}>
          <Text style={s.navBtnText}>Buyurtmalar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => go('Ombor')}>
          <Text style={s.navBtnText}>Ombor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => go('Moliya')}>
          <Text style={s.navBtnText}>Moliya</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => go('Boshqa')}>
          <Text style={s.navBtnText}>Boshqa</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: { color: colors.red, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  errorInline: { color: colors.red, fontSize: 13, marginTop: 8 },
  retry: {
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: { color: colors.gold, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  kpi: { width: '48%', marginBottom: 0 },
  kpiValue: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  kpiLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navBtn: {
    width: '48%',
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
