import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { Loader, Muted, Screen } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};
const sec = (r: Rec, k: string): Rec => (r[k] as Rec) ?? {};

export const ReportsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [overview, setOverview] = useState<Rec | null>(null);
  const [transactions, setTransactions] = useState<Rec[]>([]);
  const [orders, setOrders] = useState<Rec[]>([]);
  const [clients, setClients] = useState<Rec[]>([]);
  const [products, setProducts] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [ov, tx, od, cl, pd] = await Promise.all([
        api.overview().catch(() => ({} as Rec)),
        api.transactions.list(),
        api.orders.list(),
        api.clients.list(),
        api.products.list(),
      ]);
      setOverview(ov);
      setTransactions(tx);
      setOrders(od);
      setClients(cl);
      setProducts(pd);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const money = useMemo(() => {
    const kirim = transactions.filter((t) => String(t.type) === 'kirim').reduce((a, b) => a + num(b.amount), 0);
    const chiqim = transactions.filter((t) => String(t.type) === 'chiqim').reduce((a, b) => a + num(b.amount), 0);
    return { kirim, chiqim, net: kirim - chiqim };
  }, [transactions]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const yangi = orders.filter((o) => String(o.status) === 'yangi').length;
    const jarayonda = orders.filter((o) => String(o.status) === 'ishlab_chiqarishda' || String(o.status) === 'jarayonda').length;
    const tayyor = orders.filter((o) => String(o.status) === 'tayyor' || String(o.status) === 'yetkazildi').length;
    return { total, yangi, jarayonda, tayyor };
  }, [orders]);

  if (loading) return <Loader />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
      >
        {error ? <Text style={s.error}>{error}</Text> : null}

        <Text style={s.sectionTitle}>💰 Moliyaviy ko‘rsatkichlar</Text>
        <View style={s.row}>
          <View style={[s.kpi, { borderColor: colors.green + '55', backgroundColor: colors.green + '14' }]}>
            <Text style={[s.kpiV, { color: colors.green }]}>{fmtMoney(money.kirim)}</Text>
            <Text style={s.kpiL}>Umumiy kirim</Text>
          </View>
          <View style={[s.kpi, { borderColor: colors.red + '55', backgroundColor: colors.red + '14' }]}>
            <Text style={[s.kpiV, { color: colors.red }]}>{fmtMoney(money.chiqim)}</Text>
            <Text style={s.kpiL}>Umumiy chiqim</Text>
          </View>
        </View>
        <View style={[s.kpiBig, { borderColor: colors.gold + '55', backgroundColor: colors.gold + '14' }]}>
          <Text style={[s.kpiBigV, { color: money.net >= 0 ? colors.green : colors.red }]}>{fmtMoney(money.net)}</Text>
          <Text style={s.kpiL}>Sof foyda</Text>
        </View>

        <Text style={s.sectionTitle}>📦 Buyurtmalar</Text>
        <View style={s.row}>
          <View style={[s.kpi, { borderColor: colors.cardBorder }]}>
            <Text style={[s.kpiV, { color: colors.text }]}>{orderStats.total}</Text>
            <Text style={s.kpiL}>Jami</Text>
          </View>
          <View style={[s.kpi, { borderColor: colors.blue + '55', backgroundColor: colors.blue + '14' }]}>
            <Text style={[s.kpiV, { color: colors.blue }]}>{orderStats.yangi}</Text>
            <Text style={s.kpiL}>Yangi</Text>
          </View>
        </View>
        <View style={s.row}>
          <View style={[s.kpi, { borderColor: colors.gold + '55', backgroundColor: colors.gold + '14' }]}>
            <Text style={[s.kpiV, { color: colors.gold }]}>{orderStats.jarayonda}</Text>
            <Text style={s.kpiL}>Jarayonda</Text>
          </View>
          <View style={[s.kpi, { borderColor: colors.green + '55', backgroundColor: colors.green + '14' }]}>
            <Text style={[s.kpiV, { color: colors.green }]}>{orderStats.tayyor}</Text>
            <Text style={s.kpiL}>Bajarilgan</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>📈 Umumiy</Text>
        <View style={s.row}>
          <View style={[s.kpi, { borderColor: colors.cardBorder }]}>
            <Text style={[s.kpiV, { color: colors.text }]}>{clients.length}</Text>
            <Text style={s.kpiL}>Mijozlar</Text>
          </View>
          <View style={[s.kpi, { borderColor: colors.cardBorder }]}>
            <Text style={[s.kpiV, { color: colors.text }]}>{products.length}</Text>
            <Text style={s.kpiL}>Mahsulotlar</Text>
          </View>
        </View>

        {overview && Object.keys(overview).length > 0 && (
          <>
            <Text style={s.sectionTitle}>📊 Server statistikasi</Text>
            {Object.entries(overview).slice(0, 10).map(([k, v]) => (
              <View key={k} style={s.ovRow}>
                <Text style={s.ovK}>{k}</Text>
                <Text style={s.ovV}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Text>
              </View>
            ))}
          </>
        )}

        <Muted>Hisobotlar faqat o‘qish uchun. Ma‘lumotlar yangilanishi uchun pastga torting.</Muted>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) => StyleSheet.create({
  error: { color: c.red, fontSize: 13 },
  sectionTitle: { color: c.text, fontSize: 15, fontWeight: '900', marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: c.card,
  },
  kpiBig: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    backgroundColor: c.card,
    alignItems: 'center',
  },
  kpiV: { fontSize: 18, fontWeight: '900' },
  kpiBigV: { fontSize: 22, fontWeight: '900' },
  kpiL: { color: c.muted, fontSize: 11, marginTop: 4, fontWeight: '700' },
  ovRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 10,
    borderRadius: 10,
  },
  ovK: { color: c.muted, fontSize: 12, fontWeight: '700' },
  ovV: { color: c.text, fontSize: 12, fontWeight: '800' },
});
