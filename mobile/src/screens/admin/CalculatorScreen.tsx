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
type Mode = 'product' | 'manual';

// Formula (hujjatlashtirilgan, soddalashtirilgan):
//   jami summa = birlik narxi × soni
//   taxminiy material xarajati = jami summa × 60%
//   taxminiy foyda = jami summa − material xarajati
const MATERIAL_SHARE = 0.6;

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';
const toNum = (v: string): number => {
  const n = Number(v.replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

export const CalculatorScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('product');

  const [products, setProducts] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [qtyStr, setQtyStr] = useState('1');

  const [costStr, setCostStr] = useState('');
  const [marginStr, setMarginStr] = useState('30');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const rows = await api.products.list();
      setProducts(rows);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((r) =>
      [str(r, 'name'), str(r, 'sku'), str(r, 'category')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [products, search]);

  const selected = useMemo(
    () => products.find((p) => idOf(p) === selectedId) ?? null,
    [products, selectedId],
  );

  const calc = useMemo(() => {
    const qty = Math.max(0, Math.floor(toNum(qtyStr)));
    const unitPrice = selected ? num(selected, 'selling_price') : 0;
    const total = unitPrice * qty;
    const matCost = total * MATERIAL_SHARE;
    const profit = total - matCost;
    return { qty, unitPrice, total, matCost, profit };
  }, [qtyStr, selected]);

  const manual = useMemo(() => {
    const unitCost = Math.max(0, toNum(costStr));
    const margin = toNum(marginStr);
    const selling = unitCost * (1 + margin / 100);
    const profitPerUnit = selling - unitCost;
    return { unitCost, margin, selling, profitPerUnit };
  }, [costStr, marginStr]);

  const renderProduct = ({ item }: { item: Rec }) => {
    const id = idOf(item);
    const active = id === selectedId;
    return (
      <TouchableOpacity
        style={[s.pick, active && s.pickActive]}
        onPress={() => setSelectedId(id)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.itemTitle, active && s.pickTextActive]}>
            {str(item, 'name') || '—'}
          </Text>
          <Text style={s.itemSub}>
            {str(item, 'sku') || 'SKU —'}
            {str(item, 'category') ? ` • ${str(item, 'category')}` : ''}
          </Text>
        </View>
        <Text style={[s.price, active && s.pickTextActive]}>
          {fmtMoney(num(item, 'selling_price'))}
        </Text>
      </TouchableOpacity>
    );
  };

  const row = (label: string, value: string, valueColor?: string) => (
    <View style={s.kv}>
      <Text style={s.k}>{label}</Text>
      <Text style={[s.v, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );

  return (
    <Screen>
      <H1>Tannarx kalkulyatori</H1>

      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, mode === 'product' && s.toggleActive]}
          onPress={() => setMode('product')}
        >
          <Text
            style={[s.toggleText, mode === 'product' && s.toggleTextActive]}
          >
            Mahsulot bo‘yicha
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, mode === 'manual' && s.toggleActive]}
          onPress={() => setMode('manual')}
        >
          <Text
            style={[s.toggleText, mode === 'manual' && s.toggleTextActive]}
          >
            Qo‘lda hisoblash
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'product' ? (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(idOf(item) || i)}
          renderItem={renderProduct}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.gold}
            />
          }
          ListHeaderComponent={
            <>
              <Field
                label="Qidiruv"
                value={search}
                onChange={setSearch}
                placeholder="Nom, SKU, kategoriya..."
              />
              <Field
                label="Soni"
                value={qtyStr}
                onChange={setQtyStr}
                placeholder="1"
                keyboard="numeric"
              />
              <Card>
                <Muted>
                  Formula: material xarajati = narx × soni × 60%, foyda = jami
                  − material.
                </Muted>
                {selected ? (
                  <View style={{ marginTop: 8 }}>
                    {row('Mahsulot', str(selected, 'name') || '—')}
                    {row('Soni', String(calc.qty))}
                    {row('Birlik narxi', fmtMoney(calc.unitPrice))}
                    {row('Jami summa', fmtMoney(calc.total), colors.gold)}
                    {row('Taxminiy material xarajati', fmtMoney(calc.matCost), colors.red)}
                    {row('Taxminiy foyda', fmtMoney(calc.profit), colors.green)}
                  </View>
                ) : (
                  <Text style={s.hint}>
                    {loading
                      ? 'Yuklanmoqda...'
                      : 'Ro‘yxatdan mahsulotni tanlang.'}
                  </Text>
                )}
              </Card>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Text style={s.sectionTitle}>Mahsulotlar</Text>
            </>
          }
          ListEmptyComponent={
            loading ? (
              <Loader />
            ) : (
              <Empty
                text={error ? 'Yuklashda xatolik.' : 'Mahsulotlar topilmadi.'}
              />
            )
          }
        />
      ) : (
        <>
          <Field
            label="Birlik tannarxi"
            value={costStr}
            onChange={setCostStr}
            placeholder="0"
            keyboard="numeric"
          />
          <Field
            label="Marja (%)"
            value={marginStr}
            onChange={setMarginStr}
            placeholder="30"
            keyboard="numeric"
          />
          <Card>
            <Muted>
              Formula: sotuv narxi = tannarx × (1 + marja / 100).
            </Muted>
            <View style={{ marginTop: 8 }}>
              {row('Birlik tannarxi', fmtMoney(manual.unitCost))}
              {row('Marja', `${manual.margin} %`)}
              {row('Sotuv narxi', fmtMoney(manual.selling), colors.gold)}
              {row(
                'Birlik foyda',
                fmtMoney(manual.profitPerUnit),
                manual.profitPerUnit >= 0 ? colors.green : colors.red,
              )}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
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
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 8,
  },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pickActive: { borderColor: colors.gold, backgroundColor: '#241E12' },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  pickTextActive: { color: colors.gold },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 12,
  },
  k: { color: colors.muted, fontSize: 13, flex: 1 },
  v: { color: colors.text, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  hint: { color: colors.muted, fontSize: 13, marginTop: 8 },
  error: { color: colors.red, marginBottom: 8, fontSize: 13 },
});
