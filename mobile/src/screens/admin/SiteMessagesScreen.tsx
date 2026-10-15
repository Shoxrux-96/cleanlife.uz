import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Card, Empty, Field, H1, Loader } from '../../components';
import { colors } from '../../theme';

type Msg = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const idOf = (o: Msg): number => Number(o.id);
const statusOf = (o: Msg): string => str(o.status) || 'yangi';

const STATUS_LABEL: Record<string, string> = {
  yangi: 'Yangi',
  o_qildi: 'O‘qildi',
  o_qildi_alt: 'O‘qildi',
  "o'qildi": 'O‘qildi',
  javob_berildi: 'Javob berildi',
};

const statusLabel = (st: string): string => STATUS_LABEL[st] ?? st;

const statusColor = (st: string): string => {
  if (st === 'javob_berildi') return colors.green;
  if (st === 'yangi') return colors.gold;
  return colors.blue;
};

export const SiteMessagesScreen: React.FC = () => {
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.site.messages.list();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xabarlar yuklanmadi.');
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
    if (!q) return items;
    return items.filter(
      (m) =>
        str(m.name).toLowerCase().includes(q) ||
        str(m.phone).toLowerCase().includes(q) ||
        str(m.email).toLowerCase().includes(q) ||
        str(m.message).toLowerCase().includes(q),
    );
  }, [items, search]);

  const changeStatus = async (m: Msg, status: string) => {
    const id = idOf(m);
    setBusyId(`${id}:${status}`);
    try {
      await api.site.messages.update(id, { status });
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Status o‘zgarmadi.');
    } finally {
      setBusyId('');
    }
  };

  const confirmDelete = (m: Msg) => {
    Alert.alert(
      'O‘chirish',
      `${str(m.name) || 'Xabar'} o‘chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O‘chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.site.messages.remove(idOf(m));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : 'O‘chirishda xatolik.');
            }
          },
        },
      ],
    );
  };

  if (loading) return <Loader />;

  const renderItem = ({ item }: { item: Msg }) => {
    const st = statusOf(item);
    return (
      <Card>
        <View style={s.row}>
          <Text style={s.name}>{str(item.name) || '—'}</Text>
          <Text style={[s.badge, { color: statusColor(st) }]}>{statusLabel(st)}</Text>
        </View>
        <Text style={s.meta}>{str(item.phone) || '—'}</Text>
        {str(item.email) ? <Text style={s.meta}>{str(item.email)}</Text> : null}
        {str(item.created_at) ? <Text style={s.date}>{str(item.created_at)}</Text> : null}
        <Text style={s.msg}>{str(item.message) || '—'}</Text>
        <View style={s.actions}>
          <TouchableOpacity
            style={s.statusBtn}
            onPress={() => changeStatus(item, "o'qildi")}
            disabled={busyId === `${idOf(item)}:o'qildi`}
          >
            <Text style={s.statusText}>O‘qildi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.statusBtn}
            onPress={() => changeStatus(item, 'javob_berildi')}
            disabled={busyId === `${idOf(item)}:javob_berildi`}
          >
            <Text style={s.statusText}>Javob berildi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(item)}>
            <Text style={s.delText}>O‘chirish</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={s.wrap}>
      <H1>Xabarlar</H1>
      <Field
        label="Qidiruv"
        value={search}
        onChange={setSearch}
        placeholder="Ism, telefon, xabar..."
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => str(item.id) || String(i)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={<Empty text="Xabarlar topilmadi." />}
      />
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  badge: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  date: { color: colors.faint, fontSize: 12, marginTop: 2 },
  msg: { color: colors.text, fontSize: 14, marginTop: 8 },
  actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  statusBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  delBtn: {
    flex: 1,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  delText: { color: colors.red, fontWeight: '700', fontSize: 13 },
});
