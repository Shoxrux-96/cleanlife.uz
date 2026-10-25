import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Card, Empty, Field, Loader, Muted, Screen } from '../../components';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): number => Number(r.id);

const REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand viloyati',
  'Andijon viloyati',
  'Fargʻona viloyati',
  'Namangan viloyati',
  'Buxoro viloyati',
  'Qashqadaryo viloyati',
  'Surxondaryo viloyati',
  'Xorazm viloyati',
  'Navoiy viloyati',
  'Jizzax viloyati',
  'Sirdaryo viloyati',
  'Qoraqalpogʻiston Respublikasi',
];

const SOURCES = [
  'Instagram',
  'Telegram',
  'Sayt orqali',
  'Koʻrgazma/tadbir',
  'Xodimlar',
  'Boshqa',
];

const TYPES = ['B2B', 'B2C'];
const STATUSES = [
  { id: 'faol', label: 'Faol' },
  { id: 'nofaol', label: 'Nofaol' },
];

type DropdownProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
};

const Dropdown: React.FC<DropdownProps> = ({ label, value, options, onChange, placeholder }) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        style={s.ddBtn}
        onPress={() => setOpen(true)}
      >
        <Text style={s.ddLabel}>{label}</Text>
        <View style={s.ddValueWrap}>
          <Text style={s.ddValue} numberOfLines={1}>
            {value || placeholder || 'Tanlang'}
          </Text>
          <Text style={s.ddCaret}>▾</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={open} animationType="fade" transparent>
        <TouchableOpacity
          style={s.ddOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={s.ddSheet}>
            <Text style={s.ddTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.ddOption, value === opt && s.ddOptionActive]}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={[s.ddOptionText, value === opt && s.ddOptionTextActive]}>
                    {opt}
                  </Text>
                  {value === opt ? <Text style={{ color: colors.gold }}>✓</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export const ClientsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('Barcha viloyatlar');
  const [sourceFilter, setSourceFilter] = useState('Barcha manbalar');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState({
    name: '',
    company: '',
    type: 'B2B',
    phone: '',
    email: '',
    source: '',
    employee_name: '',
    region: '',
    district: '',
    address: '',
    status: 'faol',
  });
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
    return items.filter((r) => {
      if (regionFilter !== 'Barcha viloyatlar' && str(r, 'region') !== regionFilter) return false;
      if (sourceFilter !== 'Barcha manbalar' && str(r, 'source') !== sourceFilter) return false;
      if (!q) return true;
      const hay = [
        str(r, 'company'),
        str(r, 'name'),
        str(r, 'phone'),
        str(r, 'employee_name'),
        str(r, 'address'),
        str(r, 'region'),
        str(r, 'district'),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, regionFilter, sourceFilter]);

  const resetForm = () =>
    setForm({
      name: '',
      company: '',
      type: 'B2B',
      phone: '',
      email: '',
      source: '',
      employee_name: '',
      region: '',
      district: '',
      address: '',
      status: 'faol',
    });

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setForm({
      name: str(r, 'name'),
      company: str(r, 'company'),
      type: str(r, 'type') || 'B2B',
      phone: str(r, 'phone'),
      email: str(r, 'email'),
      source: str(r, 'source'),
      employee_name: str(r, 'employee_name'),
      region: str(r, 'region'),
      district: str(r, 'district'),
      address: str(r, 'address'),
      status: str(r, 'status') || 'faol',
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Xatolik', 'Mijoz vakili ismini kiriting.');
      return;
    }
    setSaving(true);
    const body: Rec = {
      name: form.name.trim(),
      company: form.company.trim(),
      type: form.type,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      source: form.source || null,
      employee_name: form.employee_name.trim() || null,
      region: form.region || null,
      district: form.district.trim() || null,
      address: form.address.trim(),
      status: form.status,
    };
    try {
      if (editing) await api.clients.update(idOf(editing), body);
      else await api.clients.create(body);
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
      `"${str(r, 'company') || str(r, 'name')}" mijozini o'chirasizmi?`,
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

  const exportExcel = async () => {
    if (filtered.length === 0) {
      Alert.alert('Diqqat', 'Eksport qilish uchun mijozlar yoʻq.');
      return;
    }
    const headers = [
      'Korxona',
      'Vakil',
      'Turi',
      'Telefon',
      'Email',
      'Manba',
      'Xodim',
      'Viloyat',
      'Tuman',
      'Manzil',
      'Buyurtmalar',
      'Jami xarid',
      'Holat',
    ];
    const esc = (v: string): string => {
      if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const rows = filtered.map((r) =>
      [
        str(r, 'company'),
        str(r, 'name'),
        str(r, 'type'),
        str(r, 'phone'),
        str(r, 'email'),
        str(r, 'source'),
        str(r, 'employee_name'),
        str(r, 'region'),
        str(r, 'district'),
        str(r, 'address'),
        str(r, 'total_orders'),
        str(r, 'total_spent'),
        str(r, 'status'),
      ].map(esc).join(';'),
    );
    const csv = ['﻿' + headers.join(';'), ...rows].join('\n');
    try {
      await Share.share({
        title: 'Mijozlar hisoboti',
        message: csv,
      });
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : "Eksportda xatolik.");
    }
  };

  const activeFilterCount =
    (regionFilter !== 'Barcha viloyatlar' ? 1 : 0) +
    (sourceFilter !== 'Barcha manbalar' ? 1 : 0);

  const renderItem = ({ item }: { item: Rec }) => (
    <Card>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {str(item, 'company') || str(item, 'name') || 'Nomsiz'}
          </Text>
          {str(item, 'name') && str(item, 'company') ? (
            <Text style={s.sub}>{str(item, 'name')}</Text>
          ) : null}
        </View>
        <View style={[
          s.badge,
          str(item, 'status') === 'nofaol'
            ? { backgroundColor: colors.red + '22', borderColor: colors.red + '55' }
            : { backgroundColor: colors.green + '22', borderColor: colors.green + '55' },
        ]}>
          <Text style={[
            s.badgeText,
            { color: str(item, 'status') === 'nofaol' ? colors.red : colors.green },
          ]}>
            {str(item, 'status') === 'nofaol' ? 'Nofaol' : 'Faol'}
          </Text>
        </View>
      </View>
      {str(item, 'phone') ? (
        <Text style={s.line}>📞 {str(item, 'phone')}</Text>
      ) : null}
      {str(item, 'employee_name') ? (
        <Muted>Xodim: {str(item, 'employee_name')}</Muted>
      ) : null}
      {str(item, 'region') ? (
        <Muted>📍 {str(item, 'region')}{str(item, 'district') ? `, ${str(item, 'district')}` : ''}</Muted>
      ) : null}
      {str(item, 'source') ? (
        <View style={s.sourceChip}>
          <Text style={s.sourceChipText}>{str(item, 'source')}</Text>
        </View>
      ) : null}
      <View style={s.actionsRow}>
        <TouchableOpacity style={s.smallBtn} onPress={() => openEdit(item)}>
          <Text style={s.smallBtnText}>Tahrirlash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.smallBtn, s.smallBtnDanger]}
          onPress={() => confirmDelete(item)}
        >
          <Text style={[s.smallBtnText, { color: colors.red }]}>Oʻchirish</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Screen>
      {/* === Qidirish === */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Korxona, vakil, telefon, xodim yoki manzil..."
        placeholderTextColor={colors.faint}
        style={s.search}
      />

      {/* === Filtrlar: Viloyat + Manba === */}
      <View style={s.filtersRow}>
        <View style={{ flex: 1 }}>
          <Dropdown
            label="Viloyat"
            value={regionFilter}
            options={['Barcha viloyatlar', ...REGIONS]}
            onChange={setRegionFilter}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Dropdown
            label="Manba"
            value={sourceFilter}
            options={['Barcha manbalar', ...SOURCES]}
            onChange={setSourceFilter}
          />
        </View>
      </View>

      {/* === Harakat tugmalari === */}
      <View style={s.actionButtons}>
        <TouchableOpacity style={s.excelBtn} onPress={exportExcel} activeOpacity={0.85}>
          <Text style={{ fontSize: 16 }}>📊</Text>
          <Text style={s.excelBtnText}>Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Text style={s.addBtnPlus}>+</Text>
          <Text style={s.addBtnText}>Yangi Mijoz Qoʻshish</Text>
        </TouchableOpacity>
      </View>

      {/* === Natijalar sarlavhasi === */}
      <View style={s.resultsHead}>
        <Text style={s.resultsCount}>
          {filtered.length} / {items.length} mijoz
        </Text>
        {activeFilterCount > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setRegionFilter('Barcha viloyatlar');
              setSourceFilter('Barcha manbalar');
            }}
          >
            <Text style={s.clearFilters}>✕ Filtrlarni tozalash</Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}

      {/* === Yangi/Tahrir modal === */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>
              {editing ? 'Mijozni tahrirlash' : 'Yangi mijoz qoʻshish'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Korxona nomi" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Masalan: Caravan Group" />
              <Field label="Vakil (F.I.SH) *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ism Familiya" />
              <Field label="Turi (B2B / B2C)" value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="B2B" />
              <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+998 ..." keyboard="phone-pad" />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="info@example.uz" keyboard="email-address" />
              <Dropdown
                label="Manba"
                value={form.source}
                options={SOURCES}
                onChange={(v) => setForm({ ...form, source: v })}
                placeholder="Qanday topilgan?"
              />
              <View style={{ height: 10 }} />
              <Field label="Xodim" value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} placeholder="Masʼul xodim" />
              <Dropdown
                label="Viloyat"
                value={form.region}
                options={REGIONS}
                onChange={(v) => setForm({ ...form, region: v })}
                placeholder="Viloyat"
              />
              <View style={{ height: 10 }} />
              <Field label="Tuman" value={form.district} onChange={(v) => setForm({ ...form, district: v })} placeholder="Tuman" />
              <Field label="Manzil" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Koʻcha, bino" multiline />
              <View style={s.statusRow}>
                {STATUSES.map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[s.statusChip, form.status === st.id && s.statusChipActive]}
                    onPress={() => setForm({ ...form, status: st.id })}
                  >
                    <Text style={[s.statusChipText, form.status === st.id && s.statusChipTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Btn title="Bekor qilish" onPress={() => setModalVisible(false)} ghost />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Btn title={editing ? 'Yangilash' : 'Qoʻshish'} onPress={save} busy={saving} />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    search: {
      backgroundColor: colors.input,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      marginBottom: 10,
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    excelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.green + '22',
      borderWidth: 1,
      borderColor: colors.green + '66',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    excelBtnText: { color: colors.green, fontWeight: '800', fontSize: 13 },
    addBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.gold,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    addBtnPlus: { color: '#000', fontSize: 20, fontWeight: '900' },
    addBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

    resultsHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    resultsCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    clearFilters: { color: colors.red, fontSize: 12, fontWeight: '700' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },

    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 6,
    },
    title: { color: colors.text, fontSize: 15, fontWeight: '800' },
    sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
    line: { color: colors.text, fontSize: 13, marginTop: 2 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },
    sourceChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.blue + '22',
      borderWidth: 1,
      borderColor: colors.blue + '55',
      marginTop: 6,
    },
    sourceChipText: { color: colors.blue, fontSize: 11, fontWeight: '700' },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    smallBtn: {
      flex: 1,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    smallBtnDanger: { borderColor: colors.red + '66' },
    smallBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },

    // Dropdown
    ddBtn: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    ddLabel: {
      color: colors.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
      marginBottom: 3,
    },
    ddValueWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ddValue: { color: colors.text, fontSize: 13, fontWeight: '700', flex: 1 },
    ddCaret: { color: colors.gold, fontSize: 14, marginLeft: 6 },
    ddOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    ddSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      maxHeight: '70%',
    },
    ddTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
    },
    ddOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    ddOptionActive: { backgroundColor: colors.gold + '15' },
    ddOptionText: { color: colors.text, fontSize: 14 },
    ddOptionTextActive: { color: colors.gold, fontWeight: '800' },

    // Modal
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
    statusRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    statusChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statusChipActive: {
      backgroundColor: colors.gold + '22',
      borderColor: colors.gold,
    },
    statusChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    statusChipTextActive: { color: colors.gold, fontWeight: '800' },
  });
