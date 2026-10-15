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
type TxType = 'kirim' | 'chiqim';
type Filter = 'all' | TxType;

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';

const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const FinanceScreen: React.FC = () => {
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [fType, setFType] = useState<TxType>('kirim');
  const [fCategory, setFCategory] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fDate, setFDate] = useState(todayStr());
  const [fDesc, setFDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const rows = await api.transactions.list();
      setItems(rows);
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

  const sums = useMemo(() => {
    let kirim = 0;
    let chiqim = 0;
    for (const r of items) {
      const a = num(r, 'amount');
      if (str(r, 'type') === 'chiqim') chiqim += a;
      else kirim += a;
    }
    return { kirim, chiqim, balance: kirim - chiqim };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((r) => str(r, 'type') === filter);
  }, [items, filter]);

  const openCreate = () => {
    setEditing(null);
    setFType('kirim');
    setFCategory('');
    setFAmount('');
    setFDate(todayStr());
    setFDesc('');
    setFormError('');
    setModal(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setFType(str(r, 'type') === 'chiqim' ? 'chiqim' : 'kirim');
    setFCategory(str(r, 'category'));
    setFAmount(str(r, 'amount'));
    setFDate(str(r, 'date') || todayStr());
    setFDesc(str(r, 'description'));
    setFormError('');
    setModal(true);
  };

  const save = async () => {
    if (!fCategory.trim()) {
      setFormError('Kategoriyani kiriting.');
      return;
    }
    const amount = Number(fAmount);
    if (fAmount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
      setFormError('Summani to‘g‘ri kiriting.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fDate.trim())) {
      setFormError('Sana YYYY-MM-DD formatda bo‘lishi kerak.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body: Rec = {
        type: fType,
        category: fCategory.trim(),
        amount,
        date: fDate.trim(),
        description: fDesc.trim(),
      };
      if (editing) {
        await api.transactions.update(idOf(editing), body);
      } else {
        await api.transactions.create(body);
      }
      setModal(false);
      await load(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const removeTx = (r: Rec) => {
    const label = str(r, 'category') || 'yozuv';
    Alert.alert('O‘chirish', `"${label}" o‘chirilsinmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.transactions.remove(idOf(r));
            await load(true);
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

  const renderItem = ({ item }: { item: Rec }) => {
    const isOut = str(item, 'type') === 'chiqim';
    return (
      <Card>
        <View style={s.itemRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.itemTitle}>{str(item, 'category') || '—'}</Text>
            {str(item, 'description') ? (
              <Text style={s.itemSub}>{str(item, 'description')}</Text>
            ) : null}
            <Text style={s.date}>{str(item, 'date')}</Text>
          </View>
          <Text style={[s.amount, { color: isOut ? colors.red : colors.green }]}>
            {isOut ? '−' : '+'}
            {fmtMoney(num(item, 'amount'))}
          </Text>
        </View>
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.miniBtn, s.miniGhost]}
            onPress={() => openEdit(item)}
          >
            <Text style={s.miniGhostText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.miniBtn, s.miniDanger]}
            onPress={() => removeTx(item)}
          >
            <Text style={s.miniDangerText}>O‘chirish</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <H1>Moliya</H1>

      <Card>
        <Muted>Balans</Muted>
        <Text
          style={[
            s.balance,
            { color: sums.balance >= 0 ? colors.green : colors.red },
          ]}
        >
          {fmtMoney(sums.balance)}
        </Text>
        <View style={s.sumRow}>
          <Text style={[s.sum, { color: colors.green }]}>
            Kirim: {fmtMoney(sums.kirim)}
          </Text>
          <Text style={[s.sum, { color: colors.red }]}>
            Chiqim: {fmtMoney(sums.chiqim)}
          </Text>
        </View>
      </Card>

      <View style={s.toggle}>
        {(
          [
            { key: 'all', label: 'Barchasi' },
            { key: 'kirim', label: 'Kirim' },
            { key: 'chiqim', label: 'Chiqim' },
          ] as { key: Filter; label: string }[]
        ).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.toggleBtn, filter === t.key && s.toggleActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text
              style={[s.toggleText, filter === t.key && s.toggleTextActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Btn title="+ Yozuv qo‘shish" onPress={openCreate} />

      {error ? <Text style={s.error}>{error}</Text> : null}

      {loading && items.length === 0 ? (
        <Loader />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(idOf(item) || i)}
          renderItem={renderItem}
          style={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={
            <Empty text={error ? 'Yuklashda xatolik.' : 'Yozuvlar topilmadi.'} />
          }
        />
      )}

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <ScrollView>
              <Text style={s.modalTitle}>
                {editing ? 'Yozuvni tahrirlash' : 'Yangi yozuv'}
              </Text>
              <View style={s.toggle}>
                <TouchableOpacity
                  style={[s.toggleBtn, fType === 'kirim' && s.toggleActive]}
                  onPress={() => setFType('kirim')}
                >
                  <Text
                    style={[
                      s.toggleText,
                      fType === 'kirim' && s.toggleTextActive,
                    ]}
                  >
                    Kirim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, fType === 'chiqim' && s.toggleActive]}
                  onPress={() => setFType('chiqim')}
                >
                  <Text
                    style={[
                      s.toggleText,
                      fType === 'chiqim' && s.toggleTextActive,
                    ]}
                  >
                    Chiqim
                  </Text>
                </TouchableOpacity>
              </View>
              <Field label="Kategoriya" value={fCategory} onChange={setFCategory} placeholder="Masalan: sotuv, oylik..." />
              <Field label="Summa" value={fAmount} onChange={setFAmount} placeholder="0" keyboard="numeric" />
              <Field label="Sana (YYYY-MM-DD)" value={fDate} onChange={setFDate} placeholder={todayStr()} />
              <Field label="Izoh" value={fDesc} onChange={setFDesc} placeholder="Qo‘shimcha izoh" multiline />
              {formError ? <Text style={s.error}>{formError}</Text> : null}
              <Btn title="Saqlash" onPress={save} busy={saving} />
              <Btn title="Bekor qilish" onPress={() => setModal(false)} ghost />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const s = StyleSheet.create({
  balance: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sum: { fontSize: 13, fontWeight: '700' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    marginTop: 12,
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
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  date: { color: colors.faint, fontSize: 12, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
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
  modalBox: {
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
