import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { useCanAdminWrite } from '../../auth';
import { Empty, Loader, Muted, Screen } from '../../components';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');

const STATUS_LABEL: Record<string, string> = {
  yangi: 'Yangi',
  oqildi: "O'qildi",
  javob_berildi: 'Javob berildi',
};

export const MessagesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const canEdit = useCanAdminWrite();

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.site.messages.list();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markStatus = async (m: Rec, status: string) => {
    try {
      await api.site.messages.update(Number(m.id), { status });
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, status } : x)));
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Yangilashda xatolik');
    }
  };

  const confirmDelete = (m: Rec) => {
    Alert.alert("O'chirish", "Xabarni o'chirmoqchimisiz?", [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await api.site.messages.remove(Number(m.id));
            setItems((prev) => prev.filter((x) => x.id !== m.id));
          } catch (e) {
            Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik");
          }
        },
      },
    ]);
  };

  const call = (phone: string) => Linking.openURL(`tel:${phone}`).catch(() => {});

  const renderItem = ({ item }: { item: Rec }) => {
    const st = str(item, 'status');
    const stColor = st === 'yangi' ? colors.gold : st === 'javob_berildi' ? colors.green : colors.muted;
    return (
      <View style={s.card}>
        <View style={s.head}>
          <Text style={s.name}>{str(item, 'name') || 'Nomsiz'}</Text>
          <View style={[s.pill, { borderColor: stColor + '55', backgroundColor: stColor + '18' }]}>
            <Text style={[s.pillText, { color: stColor }]}>{STATUS_LABEL[st] || st}</Text>
          </View>
        </View>
        <Text style={s.phone}>📞 {str(item, 'phone')}</Text>
        {!!str(item, 'email') && <Text style={s.email}>✉️ {str(item, 'email')}</Text>}
        <Text style={s.msg}>{str(item, 'message') || '—'}</Text>
        <Text style={s.date}>{String(item.created_at || '').slice(0, 19).replace('T', ' ')}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={s.btn} onPress={() => call(str(item, 'phone'))}>
            <Text style={s.btnT}>Qo‘ng‘iroq</Text>
          </TouchableOpacity>
          {canEdit && st !== 'oqildi' && st !== 'javob_berildi' && (
            <TouchableOpacity style={s.btn} onPress={() => markStatus(item, 'oqildi')}>
              <Text style={[s.btnT, { color: colors.blue }]}>O‘qildi</Text>
            </TouchableOpacity>
          )}
          {canEdit && st !== 'javob_berildi' && (
            <TouchableOpacity style={s.btn} onPress={() => markStatus(item, 'javob_berildi')}>
              <Text style={[s.btnT, { color: colors.green }]}>Javob berildi</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity style={[s.btn, { borderColor: colors.red + '55' }]} onPress={() => confirmDelete(item)}>
              <Text style={[s.btnT, { color: colors.red }]}>O‘chirish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <Loader />;

  return (
    <Screen>
      <Muted>Mijoz murojaatlari ({items.length}). Yangilarini o‘qib, qayta aloqaga chiqing.</Muted>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(x) => String(x.id)}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={<Empty text="Xabarlar topilmadi" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
      />
    </Screen>
  );
};

const makeStyles = (c: Palette) => StyleSheet.create({
  error: { color: c.red, fontSize: 13 },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: c.text, fontSize: 15, fontWeight: '800', flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '800' },
  phone: { color: c.text, fontSize: 13, fontWeight: '700' },
  email: { color: c.muted, fontSize: 12 },
  msg: { color: c.text, fontSize: 13, marginTop: 4 },
  date: { color: c.faint, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btn: {
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnT: { color: c.text, fontSize: 12, fontWeight: '700' },
});
