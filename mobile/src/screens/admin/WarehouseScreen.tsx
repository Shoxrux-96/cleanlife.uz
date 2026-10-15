import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { api } from '../../api';
import {
  Screen,
  Card,
  H1,
  Muted,
  Field,
  Empty,
  Loader,
} from '../../components';
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;
type Tab = 'products' | 'materials';

const LOW_STOCK = 10;
const MID_STOCK = 50;

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';

const stockOf = (r: Rec, tab: Tab): number =>
  tab === 'products' ? num(r, 'stock_count') : num(r, 'quantity');

type Badge = { label: string; color: string };
const badgeOf = (qty: number): Badge => {
  if (qty < LOW_STOCK) return { label: 'Kritik', color: colors.red };
  if (qty < MID_STOCK) return { label: 'Kam', color: colors.gold };
  return { label: 'Yetarli', color: colors.green };
};

export const WarehouseScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');

  const [products, setProducts] = useState<Rec[]>([]);
  const [materials, setMaterials] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [p, m] = await Promise.all([
        api.products.list(),
        api.materials.list(),
      ]);
      setProducts(p);
      setMaterials(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    let totalStock = 0;
    let lowCount = 0;
    for (const p of products) {
      const q = num(p, 'stock_count');
      totalStock += q;
      if (q < LOW_STOCK) lowCount += 1;
    }
    let matQty = 0;
    for (const m of materials) matQty += num(m, 'quantity');
    return {
      totalProducts: products.length,
      totalStock,
      lowCount,
      matQty,
    };
  }, [products, materials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (tab === 'products') {
      if (!q) return products;
      return products.filter((r) =>
        [str(r, 'name'), str(r, 'sku'), str(r, 'category')]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    if (!q) return materials;
    return materials.filter((r) =>
      [str(r, 'name'), str(r, 'supplier'), str(r, 'unit')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [products, materials, search, tab]);

  const adjust = useCallback(
    async (item: Rec, delta: number) => {
      const id = idOf(item);
      if (id === '' || adjustingId !== null) return;
      const current = stockOf(item, tab);
      const next = Math.max(0, Math.round((current + delta) * 100) / 100);
      setAdjustingId(id);
      try {
        if (tab === 'products') {
          await api.products.update(id, { stock_count: next });
          setProducts((prev) =>
            prev.map((p) =>
              idOf(p) === id ? { ...p, stock_count: next } : p,
            ),
          );
        } else {
          await api.materials.update(id, { quantity: next });
          setMaterials((prev) =>
            prev.map((m) =>
              idOf(m) === id ? { ...m, quantity: next } : m,
            ),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Qoldiqni yangilashda xatolik.');
      } finally {
        setAdjustingId(null);
      }
    },
    [adjustingId, tab],
  );

  const isProducts = tab === 'products';

  const renderItem = ({ item }: { item: Rec }) => {
    const qty = stockOf(item, tab);
    const badge = badgeOf(qty);
    const busy = adjustingId === idOf(item);
    const unit = isProducts ? 'dona' : str(item, 'unit') || '';
    return (
      <Card>
        <View style={s.itemHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.itemTitle}>{str(item, 'name') || '—'}</Text>
            <Text style={s.itemSub}>
              {isProducts
                ? `${str(item, 'sku') || 'SKU —'}${str(item, 'category') ? ` • ${str(item, 'category')}` : ''}`
                : `${str(item, 'supplier') ? `Yetkazuvchi: ${str(item, 'supplier')}` : 'Yetkazuvchi —'}`}
            </Text>
          </View>
          <View style={[s.badge, { borderColor: badge.color }]}>
            <Text style={[s.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>
        <View style={s.row}>
          <Text style={s.price}>
            {isProducts
              ? fmtMoney(num(item, 'selling_price'))
              : `${qty} ${unit}`.trim()}
          </Text>
          <Text style={s.stock}>
            Qoldiq: {qty}
            {unit ? ` ${unit}` : ''}
            {!isProducts ? ` • ${fmtMoney(num(item, 'unit_cost'))}` : ''}
          </Text>
        </View>
        <View style={s.stepper}>
          {(
            [
              { delta: -10, label: '−10' },
              { delta: -1, label: '−1' },
              { delta: 1, label: '+1' },
              { delta: 10, label: '+10' },
            ] as { delta: number; label: string }[]
          ).map((st) => (
            <TouchableOpacity
              key={st.label}
              style={[
                s.stepBtn,
                st.delta > 0 && s.stepPlus,
                busy && s.stepDisabled,
              ]}
              disabled={busy}
              onPress={() => adjust(item, st.delta)}
            >
              <Text
                style={[s.stepText, st.delta > 0 && s.stepPlusText]}
              >
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    );
  };

  const header = (
    <>
      <H1>Ombor monitoringi</H1>
      <View style={s.grid}>
        <Card style={s.stat}>
          <Muted>Jami mahsulot</Muted>
          <Text style={s.statValue}>{summary.totalProducts}</Text>
        </Card>
        <Card style={s.stat}>
          <Muted>Jami qoldiq</Muted>
          <Text style={s.statValue}>{summary.totalStock}</Text>
        </Card>
        <Card style={s.stat}>
          <Muted>Kam qoldiq (&lt;10)</Muted>
          <Text style={[s.statValue, { color: summary.lowCount > 0 ? colors.red : colors.green }]}>
            {summary.lowCount}
          </Text>
        </Card>
        <Card style={s.stat}>
          <Muted>Material miqdori</Muted>
          <Text style={s.statValue}>{summary.matQty}</Text>
        </Card>
      </View>
      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, isProducts && s.toggleActive]}
          onPress={() => setTab('products')}
        >
          <Text style={[s.toggleText, isProducts && s.toggleTextActive]}>
            Mahsulotlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, !isProducts && s.toggleActive]}
          onPress={() => setTab('materials')}
        >
          <Text style={[s.toggleText, !isProducts && s.toggleTextActive]}>
            Materiallar
          </Text>
        </TouchableOpacity>
      </View>
      <Field
        label="Qidiruv"
        value={search}
        onChange={setSearch}
        placeholder={isProducts ? 'Nom, SKU, kategoriya...' : 'Nom, yetkazuvchi...'}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </>
  );

  if (loading && products.length === 0 && materials.length === 0) {
    return (
      <Screen>
        {header}
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => String(idOf(item) || `${tab}-${i}`)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          <Empty
            text={error ? 'Yuklashda xatolik.' : 'Hech narsa topilmadi.'}
          />
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  stat: { width: '48%', flexGrow: 1, marginBottom: 8 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleActive: { backgroundColor: colors.gold },
  toggleText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: '#000' },
  error: { color: colors.red, marginBottom: 8, fontSize: 13 },
  itemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  stock: { color: colors.text, fontSize: 13 },
  stepper: { flexDirection: 'row', gap: 6, marginTop: 10 },
  stepBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'transparent',
  },
  stepPlus: { borderColor: colors.gold },
  stepText: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  stepPlusText: { color: colors.gold },
  stepDisabled: { opacity: 0.5 },
});
