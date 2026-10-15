import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Card, Empty, Field, H1, Loader, Muted, Screen } from '../../components';
import { colors } from '../../theme';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): number => Number(r.id);

export const ClientsScreen: React.FC = () => {
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.clients.list();
      setItems(data);
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
    if (!q) return items;
    return items.filter(
      (r) =>
        str(r, 'name').toLowerCase().includes(q) ||
        str(r, 'phone').toLowerCase().includes(q),
    );
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setCompany('');
    setType('');
    setAddress('');
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setName(str(r, 'name'));
    setPhone(str(r, 'phone'));
    setCompany(str(r, 'company'));
    setType(str(r, 'type'));
    setAddress(str(r, 'address'));
    setModalVisible(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Xatolik', 'Mijoz nomini kiriting.');
      return;
    }
    setSaving(true);
    const body: Rec = {
      name: name.trim(),
      phone: phone.trim(),
      company: company.trim(),
      type: type.trim(),
      address: address.trim(),
    };
    try {
      if (editing) {
        await api.clients.update(idOf(editing), body);
      } else {
        await api.clients.create(body);
      }
      setModalVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (r: Rec) => {
    Alert.alert(
      "O'chirish",
      `"${str(r, 'name')}" mijozini o'chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clients.remove(idOf(r));
              await load();
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Rec }) => (
    <Card>
      <Text style={s.title}>{str(item, 'name') || 'Nomsiz'}</Text>
      <Text style={s.line}>{str(item, 'phone') || 'Telefon kiritilmagan'}</Text>
      {str(item, 'company') ? <Text style={s.line}>{str(item, 'company')}</Text> : null}
      {str(item, 'type') ? <Muted>Turi: {str(item, 'type')}</Muted> : null}
      {str(item, 'address') ? <Muted>{str(item, 'address')}</Muted> : null}
      <View style={s.row}>
        <TouchableOpacity style={s.smallBtn} onPress={() => openEdit(item)}>
          <Text style={s.smallBtnText}>Tahrirlash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.smallBtn, s.smallBtnDanger]}
          onPress={() => confirmDelete(item)}
        >
          <Text style={[s.smallBtnText, { color: colors.red }]}>O'chirish</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Screen>
      <H1>Mijozlar</H1>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Ism yoki telefon bo'yicha qidirish..."
        placeholderTextColor={colors.faint}
        style={s.search}
      />
      <Btn title="+ Yangi mijoz" onPress={openCreate} />
      <View style={{ height: 12 }} />
      {loading ? (
        <Loader />
      ) : error ? (
        <View style={s.center}>
          <Text style={s.error}>{error}</Text>
          <Btn title="Qayta urinish" onPress={() => load()} ghost />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={<Empty text="Mijozlar topilmadi." />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editing ? 'Mijozni tahrirlash' : 'Yangi mijoz'}</Text>
            <Field label="Ism *" value={name} onChange={setName} placeholder="Mijoz ismi" />
            <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+998 ..." keyboard="phone-pad" />
            <Field label="Kompaniya" value={company} onChange={setCompany} placeholder="Kompaniya nomi" />
            <Field label="Turi" value={type} onChange={setType} placeholder="Masalan: doimiy, ulgurji" />
            <Field label="Manzil" value={address} onChange={setAddress} placeholder="Manzil" multiline />
            <Btn title="Saqlash" onPress={save} busy={saving} />
            <Btn title="Bekor qilish" onPress={() => setModalVisible(false)} ghost />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const s = StyleSheet.create({
  search: {
    backgroundColor: colors.input,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  line: { color: colors.text, fontSize: 14, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  smallBtnDanger: { borderColor: colors.red },
  smallBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
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
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
});
