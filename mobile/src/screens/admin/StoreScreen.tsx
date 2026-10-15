import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { api } from '../../api';
import {
  Screen,
  Card,
  H1,
  Muted,
  Field,
  Btn,
  Empty,
  Loader,
} from '../../components';
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;
type Tab = 'products' | 'materials';

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';

const EMPTY_PRODUCT = { name: '', sku: '', category: '', selling_price: '', stock_count: '' };
const EMPTY_MATERIAL = { name: '', quantity: '', unit: '', unit_cost: '', supplier: '' };

export const StoreScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');

  const [products, setProducts] = useState<Rec[]>([]);
  const [pLoading, setPLoading] = useState(true);
  const [pRefreshing, setPRefreshing] = useState(false);
  const [pError, setPError] = useState('');

  const [materials, setMaterials] = useState<Rec[]>([]);
  const [mLoading, setMLoading] = useState(true);
  const [mRefreshing, setMRefreshing] = useState(false);
  const [mError, setMError] = useState('');

  // Product form
  const [pModal, setPModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Rec | null>(null);
  const [pForm, setPForm] = useState(EMPTY_PRODUCT);
  const [pSaving, setPSaving] = useState(false);
  const [pFormError, setPFormError] = useState('');

  // Material form
  const [mModal, setMModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Rec | null>(null);
  const [mForm, setMForm] = useState(EMPTY_MATERIAL);
  const [mSaving, setMSaving] = useState(false);
  const [mFormError, setMFormError] = useState('');

  const loadProducts = useCallback(async (refresh = false) => {
    if (refresh) setPRefreshing(true);
    else setPLoading(true);
    setPError('');
    try {
      const rows = await api.products.list();
      setProducts(rows);
    } catch (e) {
      setPError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setPLoading(false);
      setPRefreshing(false);
    }
  }, []);

  const loadMaterials = useCallback(async (refresh = false) => {
    if (refresh) setMRefreshing(true);
    else setMLoading(true);
    setMError('');
    try {
      const rows = await api.materials.list();
      setMaterials(rows);
    } catch (e) {
      setMError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setMLoading(false);
      setMRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadMaterials();
  }, [loadMaterials, loadProducts]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((r) =>
      [str(r, 'name'), str(r, 'sku'), str(r, 'category')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [products, search]);

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((r) =>
      [str(r, 'name'), str(r, 'supplier'), str(r, 'unit')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [materials, search]);

  const openProductCreate = () => {
    setEditingProduct(null);
    setPForm(EMPTY_PRODUCT);
    setPFormError('');
    setPModal(true);
  };

  const openProductEdit = (r: Rec) => {
    setEditingProduct(r);
    setPForm({
      name: str(r, 'name'),
      sku: str(r, 'sku'),
      category: str(r, 'category'),
      selling_price: str(r, 'selling_price'),
      stock_count: str(r, 'stock_count'),
    });
    setPFormError('');
    setPModal(true);
  };

  const saveProduct = async () => {
    if (!pForm.name.trim()) {
      setPFormError('Mahsulot nomini kiriting.');
      return;
    }
    const selling_price = Number(pForm.selling_price);
    const stock_count = Number(pForm.stock_count);
    if (pForm.selling_price.trim() !== '' && Number.isNaN(selling_price)) {
      setPFormError('Narx noto‘g‘ri kiritilgan.');
      return;
    }
    if (pForm.stock_count.trim() !== '' && Number.isNaN(stock_count)) {
      setPFormError('Soni noto‘g‘ri kiritilgan.');
      return;
    }
    setPSaving(true);
    setPFormError('');
    try {
      const body: Rec = {
        name: pForm.name.trim(),
        sku: pForm.sku.trim(),
        category: pForm.category.trim(),
        selling_price: pForm.selling_price.trim() === '' ? 0 : selling_price,
        stock_count: pForm.stock_count.trim() === '' ? 0 : stock_count,
      };
      if (editingProduct) {
        await api.products.update(idOf(editingProduct), body);
      } else {
        await api.products.create(body);
      }
      setPModal(false);
      await loadProducts(true);
    } catch (e) {
      setPFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setPSaving(false);
    }
  };

  const deleteProduct = (r: Rec) => {
    const name = str(r, 'name') || 'mahsulot';
    Alert.alert('O‘chirish', `"${name}" o‘chirilsinmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.products.remove(idOf(r));
            await loadProducts(true);
          } catch (e) {
            Alert.alert(
              'Xatolik',
              e instanceof Error ? e.message : 'O‘chirishda xatolik.',
            );
          }
        },
      },
    ]);
  };

  const openMaterialCreate = () => {
    setEditingMaterial(null);
    setMForm(EMPTY_MATERIAL);
    setMFormError('');
    setMModal(true);
  };

  const openMaterialEdit = (r: Rec) => {
    setEditingMaterial(r);
    setMForm({
      name: str(r, 'name'),
      quantity: str(r, 'quantity'),
      unit: str(r, 'unit'),
      unit_cost: str(r, 'unit_cost'),
      supplier: str(r, 'supplier'),
    });
    setMFormError('');
    setMModal(true);
  };

  const saveMaterial = async () => {
    if (!mForm.name.trim()) {
      setMFormError('Material nomini kiriting.');
      return;
    }
    const quantity = Number(mForm.quantity);
    const unit_cost = Number(mForm.unit_cost);
    if (mForm.quantity.trim() !== '' && Number.isNaN(quantity)) {
      setMFormError('Miqdor noto‘g‘ri kiritilgan.');
      return;
    }
    if (mForm.unit_cost.trim() !== '' && Number.isNaN(unit_cost)) {
      setMFormError('Narx noto‘g‘ri kiritilgan.');
      return;
    }
    setMSaving(true);
    setMFormError('');
    try {
      const body: Rec = {
        name: mForm.name.trim(),
        quantity: mForm.quantity.trim() === '' ? 0 : quantity,
        unit: mForm.unit.trim(),
        unit_cost: mForm.unit_cost.trim() === '' ? 0 : unit_cost,
        supplier: mForm.supplier.trim(),
      };
      if (editingMaterial) {
        await api.materials.update(idOf(editingMaterial), body);
      } else {
        await api.materials.create(body);
      }
      setMModal(false);
      await loadMaterials(true);
    } catch (e) {
      setMFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setMSaving(false);
    }
  };

  const deleteMaterial = (r: Rec) => {
    const name = str(r, 'name') || 'material';
    Alert.alert('O‘chirish', `"${name}" o‘chirilsinmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.materials.remove(idOf(r));
            await loadMaterials(true);
          } catch (e) {
            Alert.alert(
              'Xatolik',
              e instanceof Error ? e.message : 'O‘chirishda xatolik.',
            );
          }
        },
      },
    ]);
  };

  const isProducts = tab === 'products';
  const loading = isProducts ? pLoading : mLoading;
  const error = isProducts ? pError : mError;

  const renderProduct = ({ item }: { item: Rec }) => (
    <Card>
      <Text style={s.itemTitle}>{str(item, 'name') || '—'}</Text>
      <Text style={s.itemSub}>
        {str(item, 'sku') || 'SKU —'}
        {str(item, 'category') ? ` • ${str(item, 'category')}` : ''}
      </Text>
      <View style={s.row}>
        <Text style={s.price}>{fmtMoney(num(item, 'selling_price'))}</Text>
        <Text style={s.stock}>Qoldiq: {str(item, 'stock_count') || '0'}</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.miniBtn, s.miniGhost]}
          onPress={() => openProductEdit(item)}
        >
          <Text style={s.miniGhostText}>Tahrirlash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.miniBtn, s.miniDanger]}
          onPress={() => deleteProduct(item)}
        >
          <Text style={s.miniDangerText}>O‘chirish</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderMaterial = ({ item }: { item: Rec }) => (
    <Card>
      <Text style={s.itemTitle}>{str(item, 'name') || '—'}</Text>
      <View style={s.row}>
        <Text style={s.price}>
          {str(item, 'quantity') || '0'} {str(item, 'unit')}
        </Text>
        <Text style={s.stock}>{fmtMoney(num(item, 'unit_cost'))}</Text>
      </View>
      {str(item, 'supplier') ? (
        <Text style={s.itemSub}>Yetkazuvchi: {str(item, 'supplier')}</Text>
      ) : null}
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.miniBtn, s.miniGhost]}
          onPress={() => openMaterialEdit(item)}
        >
          <Text style={s.miniGhostText}>Tahrirlash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.miniBtn, s.miniDanger]}
          onPress={() => deleteMaterial(item)}
        >
          <Text style={s.miniDangerText}>O‘chirish</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Screen>
      <H1>Ombor</H1>

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
      <Btn
        title={isProducts ? '+ Mahsulot qo‘shish' : '+ Material qo‘shish'}
        onPress={isProducts ? openProductCreate : openMaterialCreate}
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      {loading && (isProducts ? products : materials).length === 0 ? (
        <Loader />
      ) : isProducts ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, i) => String(idOf(item) || i)}
          renderItem={renderProduct}
          style={s.list}
          refreshControl={
            <RefreshControl
              refreshing={pRefreshing}
              onRefresh={() => loadProducts(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={
            <Empty
              text={pError ? 'Yuklashda xatolik.' : 'Mahsulotlar topilmadi.'}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredMaterials}
          keyExtractor={(item, i) => String(idOf(item) || i)}
          renderItem={renderMaterial}
          style={s.list}
          refreshControl={
            <RefreshControl
              refreshing={mRefreshing}
              onRefresh={() => loadMaterials(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={
            <Empty
              text={mError ? 'Yuklashda xatolik.' : 'Materiallar topilmadi.'}
            />
          }
        />
      )}

      {/* Product create/edit modal */}
      <Modal visible={pModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <ScrollView>
              <Text style={s.modalTitle}>
                {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
              </Text>
              <Field label="Nomi" value={pForm.name} onChange={(v) => setPForm({ ...pForm, name: v })} placeholder="Mahsulot nomi" />
              <Field label="SKU" value={pForm.sku} onChange={(v) => setPForm({ ...pForm, sku: v })} placeholder="SKU kodi" />
              <Field label="Kategoriya" value={pForm.category} onChange={(v) => setPForm({ ...pForm, category: v })} placeholder="Kategoriya" />
              <Field label="Sotuv narxi" value={pForm.selling_price} onChange={(v) => setPForm({ ...pForm, selling_price: v })} placeholder="0" keyboard="numeric" />
              <Field label="Qoldiq soni" value={pForm.stock_count} onChange={(v) => setPForm({ ...pForm, stock_count: v })} placeholder="0" keyboard="numeric" />
              {pFormError ? <Text style={s.error}>{pFormError}</Text> : null}
              <Btn title="Saqlash" onPress={saveProduct} busy={pSaving} />
              <Btn title="Bekor qilish" onPress={() => setPModal(false)} ghost />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Material create/edit modal */}
      <Modal visible={mModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <ScrollView>
              <Text style={s.modalTitle}>
                {editingMaterial ? 'Materialni tahrirlash' : 'Yangi material'}
              </Text>
              <Field label="Nomi" value={mForm.name} onChange={(v) => setMForm({ ...mForm, name: v })} placeholder="Material nomi" />
              <Field label="Miqdori" value={mForm.quantity} onChange={(v) => setMForm({ ...mForm, quantity: v })} placeholder="0" keyboard="numeric" />
              <Field label="Birligi" value={mForm.unit} onChange={(v) => setMForm({ ...mForm, unit: v })} placeholder="kg, dona, litr..." />
              <Field label="Birlik narxi" value={mForm.unit_cost} onChange={(v) => setMForm({ ...mForm, unit_cost: v })} placeholder="0" keyboard="numeric" />
              <Field label="Yetkazuvchi" value={mForm.supplier} onChange={(v) => setMForm({ ...mForm, supplier: v })} placeholder="Yetkazuvchi nomi" />
              {mFormError ? <Text style={s.error}>{mFormError}</Text> : null}
              <Btn title="Saqlash" onPress={saveMaterial} busy={mSaving} />
              <Btn title="Bekor qilish" onPress={() => setMModal(false)} ghost />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  list: { marginTop: 12 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  stock: { color: colors.text, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  miniBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  miniGhost: { borderColor: colors.cardBorder, backgroundColor: 'transparent' },
  miniDanger: { borderColor: colors.red, backgroundColor: 'transparent' },
  miniGhostText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  miniDangerText: { color: colors.red, fontWeight: '700', fontSize: 13 },
  error: { color: colors.red, marginTop: 8, marginBottom: 4, fontSize: 13 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    padding: 16,
    maxHeight: '90%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
});
