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
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): number => Number(r.id);

const fmtSalary = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  if (Number.isNaN(n)) return fmtMoney(0);
  return fmtMoney(n);
};

export const EmployeesScreen: React.FC = () => {
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.employees.list();
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
        str(r, 'full_name').toLowerCase().includes(q) ||
        str(r, 'position').toLowerCase().includes(q) ||
        str(r, 'phone').toLowerCase().includes(q),
    );
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setFullName('');
    setPosition('');
    setPhone('');
    setSalary('');
    setStatus('ishlaydi');
    setUsername('');
    setPassword('');
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setFullName(str(r, 'full_name'));
    setPosition(str(r, 'position'));
    setPhone(str(r, 'phone'));
    setSalary(str(r, 'salary'));
    setStatus(str(r, 'status') || 'ishlaydi');
    setUsername(str(r, 'username'));
    setPassword('');
    setModalVisible(true);
  };

  const save = async () => {
    if (!fullName.trim()) {
      Alert.alert('Xatolik', 'F.I.Sh. ni kiriting.');
      return;
    }
    if (!editing && !username.trim()) {
      Alert.alert('Xatolik', 'Loginni kiriting.');
      return;
    }
    if (!editing && !password.trim()) {
      Alert.alert('Xatolik', 'Parolni kiriting.');
      return;
    }
    setSaving(true);
    const body: Rec = {
      full_name: fullName.trim(),
      position: position.trim(),
      phone: phone.trim(),
      salary: Number(salary) || 0,
      status: status.trim() || 'ishlaydi',
      username: username.trim(),
    };
    if (password.trim()) {
      body.password = password;
    }
    try {
      if (editing) {
        await api.employees.update(idOf(editing), body);
      } else {
        await api.employees.create(body);
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
      `"${str(r, 'full_name')}" xodimini o'chirasizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await api.employees.remove(idOf(r));
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
      <Text style={s.title}>{str(item, 'full_name') || 'Nomsiz'}</Text>
      <Text style={s.line}>{str(item, 'position') || 'Lavozim kiritilmagan'}</Text>
      <Text style={s.line}>{str(item, 'phone') || 'Telefon kiritilmagan'}</Text>
      <View style={s.meta}>
        <Text style={s.salary}>{fmtSalary(item.salary)}</Text>
        {str(item, 'status') ? (
          <Text style={s.status}>{str(item, 'status')}</Text>
        ) : null}
      </View>
      {str(item, 'username') ? <Muted>Login: {str(item, 'username')}</Muted> : null}
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
      <H1>Xodimlar</H1>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Ism, lavozim yoki telefon bo'yicha qidirish..."
        placeholderTextColor={colors.faint}
        style={s.search}
      />
      <Btn title="+ Yangi xodim" onPress={openCreate} />
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
          ListEmptyComponent={<Empty text="Xodimlar topilmadi." />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editing ? 'Xodimni tahrirlash' : 'Yangi xodim'}</Text>
            <Field label="F.I.Sh. *" value={fullName} onChange={setFullName} placeholder="Familiya Ism Sharif" />
            <Field label="Lavozim" value={position} onChange={setPosition} placeholder="Masalan: sotuvchi" />
            <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+998 ..." keyboard="phone-pad" />
            <Field label="Oylik" value={salary} onChange={setSalary} placeholder="Masalan: 3000000" keyboard="numeric" />
            <Field label="Holat" value={status} onChange={setStatus} placeholder="ishlaydi" />
            <Field label={editing ? 'Login' : 'Login *'} value={username} onChange={setUsername} placeholder="Xodim logini" />
            <Field
              label="Parol"
              value={password}
              onChange={setPassword}
              placeholder={editing ? "O'zgartirmoqchi bo'lsangiz yangi parol yozing" : 'Parol kiriting'}
              secure
            />
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
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  salary: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  status: { color: colors.muted, fontSize: 13 },
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
    maxHeight: '92%',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
});
