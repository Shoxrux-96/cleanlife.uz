import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Empty, Field, Loader, Muted, Screen } from '../../components';
import { fmtMoney, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
type EmpStatus = 'active' | 'on_leave' | 'probation' | 'nofaol';

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const idOf = (r: Rec): number => Number(r.id);

const POSITIONS = [
  'Boshqaruvchi',
  'Ishchi',
  'Haydovchi',
  'Elektrik',
  'Boshqa',
] as const;

const STATUS_OPTS: { value: EmpStatus; label: string }[] = [
  { value: 'active', label: 'Faol' },
  { value: 'on_leave', label: 'Taʼtilda' },
  { value: 'probation', label: 'Sinov davri' },
  { value: 'nofaol', label: 'Nofaol' },
];

const statusLabel = (s: string): string => {
  const found = STATUS_OPTS.find((x) => x.value === s);
  return found ? found.label : s || 'Faol';
};

const statusColor = (s: string, colors: Palette): string => {
  switch (s) {
    case 'active':
      return colors.green;
    case 'on_leave':
      return colors.gold;
    case 'probation':
      return colors.blue;
    case 'nofaol':
    default:
      return colors.muted;
  }
};

const pickImage = async (onPick: (dataUrl: string) => void) => {
  // Web: HTML input orqali
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onPick(String(reader.result || ''));
      reader.readAsDataURL(file);
    };
    input.click();
    return;
  }
  // Native: expo-image-picker orqali
  try {
    const ImagePicker = require('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Ruxsat kerak', 'Rasm tanlash uchun galereya ruxsati berilmagan.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
      allowsEditing: true,
      aspect: [3, 4], // 3x4 xodim rasmi
      quality: 0.7,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const uri = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : asset.uri;
    onPick(uri);
  } catch (e) {
    Alert.alert('Xatolik', `Rasm tanlab bo'lmadi: ${e instanceof Error ? e.message : String(e)}`);
  }
};

export const EmployeesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Rec[]>([]);
  const [company, setCompany] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Employee modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [avatar, setAvatar] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState<string>('Ishchi');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState<EmpStatus>('active');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company modal state
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [cName, setCName] = useState('');
  const [cLogo, setCLogo] = useState('');
  const [cOwner, setCOwner] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cPhone2, setCPhone2] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cLocation, setCLocation] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cAdminName, setCAdminName] = useState('');
  const [cAdminPosition, setCAdminPosition] = useState('');
  const [cAdminPhone, setCAdminPhone] = useState('');
  const [cAdminLogin, setCAdminLogin] = useState('');
  const [cAdminPassword, setCAdminPassword] = useState('');
  const [cSavingCo, setCSavingCo] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [companyData, data] = await Promise.all([
        api.company.get().catch(() => null),
        api.employees.list(),
      ]);
      setCompany(companyData);
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

  const totalEmployees = items.length;
  const activeCount = useMemo(
    () => items.filter((r) => str(r, 'status') === 'active').length,
    [items],
  );
  const leaveCount = useMemo(
    () => items.filter((r) => str(r, 'status') === 'on_leave').length,
    [items],
  );
  const payrollFund = useMemo(
    () =>
      items
        .filter((r) => str(r, 'status') !== 'nofaol')
        .reduce((sum, r) => sum + (Number(r.salary) || 0), 0),
    [items],
  );

  const companyLogo = str(company || {}, 'logo') || 'B';
  const companyName = str(company || {}, 'name') || 'Clean Life';
  const companyLocation = str(company || {}, 'location');
  const companyAddress = str(company || {}, 'address');
  const companyOwner = str(company || {}, 'owner');
  const companyAdminName = str(company || {}, 'admin_name');
  const companyAdminPosition = str(company || {}, 'admin_position');
  const companyPhone = str(company || {}, 'phone');
  const companyPhone2 = str(company || {}, 'phone2');
  const companyEmail = str(company || {}, 'email');

  const openCreate = () => {
    setEditing(null);
    setAvatar('');
    setFullName('');
    setPosition('Ishchi');
    setPhone('+998 ');
    setSalary('7500000');
    setStatus('active');
    setUsername('');
    setPassword('');
    setShowPass(false);
    setModalVisible(true);
  };

  const openEdit = (r: Rec) => {
    setEditing(r);
    setAvatar(str(r, 'avatar'));
    setFullName(str(r, 'full_name'));
    setPosition(str(r, 'position') || 'Ishchi');
    setPhone(str(r, 'phone'));
    setSalary(str(r, 'salary'));
    const st = str(r, 'status') as EmpStatus;
    setStatus(STATUS_OPTS.some((o) => o.value === st) ? st : 'active');
    setUsername(str(r, 'username'));
    setPassword('');
    setShowPass(false);
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
      position: position.trim() || 'Ishchi',
      phone: phone.trim(),
      salary: Number(salary) || 0,
      status,
      username: username.trim(),
      avatar: avatar || null,
      avatar_color: 'from-amber-600 to-yellow-500',
      join_date: str(editing || {}, 'join_date') || new Date().toISOString().split('T')[0],
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
              Alert.alert(
                'Xatolik',
                e instanceof Error ? e.message : "O'chirishda xatolik.",
              );
            }
          },
        },
      ],
    );
  };

  const openCompanyModal = () => {
    const c = company || {};
    setCName(str(c, 'name') || 'Clean Life');
    setCLogo(str(c, 'logo') || 'B');
    setCOwner(str(c, 'owner'));
    setCPhone(str(c, 'phone'));
    setCPhone2(str(c, 'phone2'));
    setCEmail(str(c, 'email'));
    setCLocation(str(c, 'location'));
    setCAddress(str(c, 'address'));
    setCAdminName(str(c, 'admin_name'));
    setCAdminPosition(str(c, 'admin_position'));
    setCAdminPhone(str(c, 'admin_phone'));
    setCAdminLogin(str(c, 'admin_login'));
    setCAdminPassword('');
    setShowAdminPass(false);
    setCompanyModalVisible(true);
  };

  const handleExportExcel = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Eslatma', 'Excel yuklab olish web versiyasida ishlaydi.');
      return;
    }
    const header = ['№', 'F.I.SH', 'Lavozim', 'Telefon', 'Oylik', 'Login', 'Holat', 'Ishga kirgan'];
    const csvEscape = (v: string) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = filtered.map((r, i) => [
      String(i + 1),
      str(r, 'full_name'),
      str(r, 'position'),
      str(r, 'phone'),
      String(Number(r.salary) || 0),
      str(r, 'username') || '-',
      statusLabel(str(r, 'status')),
      str(r, 'join_date'),
    ].map(csvEscape).join(','));
    const bom = '﻿';
    const csv = bom + [header.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xodimlar-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveCompany = async () => {
    setCSavingCo(true);
    const body: Rec = {
      name: cName.trim(),
      logo: cLogo || 'B',
      owner: cOwner.trim(),
      phone: cPhone.trim(),
      phone2: cPhone2.trim(),
      email: cEmail.trim(),
      location: cLocation.trim(),
      address: cAddress.trim(),
      admin_name: cAdminName.trim(),
      admin_position: cAdminPosition.trim(),
      admin_phone: cAdminPhone.trim(),
      admin_login: cAdminLogin.trim(),
    };
    if (cAdminPassword.trim()) body.admin_password = cAdminPassword;
    try {
      if (company && company.id) {
        await api.company.update(idOf(company), body);
      } else {
        await api.company.create(body);
      }
      setCompanyModalVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setCSavingCo(false);
    }
  };

  const renderCompany = () => (
    <View style={s.companyWrap}>
      <View style={s.companyBanner}>
        <View style={s.bannerLabel}>
          <Text style={s.bannerLabelText}>Korxona profili</Text>
        </View>
        <View style={s.bannerActions}>
          <TouchableOpacity style={s.bannerEdit} onPress={openCompanyModal}>
            <Text style={s.bannerEditText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bannerAddBtn} onPress={openCreate}>
            <Text style={s.bannerAddBtnText}>+ Xodim</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.companyBody}>
        <View style={s.companyHead}>
          <View style={s.logoBox}>
            {companyLogo.startsWith('data:') ? (
              <Image source={{ uri: companyLogo }} style={s.logoImg} />
            ) : (
              <Text style={s.logoText}>{companyLogo}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.companyName}>{companyName}</Text>
            {!!companyAdminName && (
              <View style={s.adminPill}>
                <Text style={s.adminPillText}>
                  Tizim admini: <Text style={{ fontWeight: '800' }}>{companyAdminName}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.infoGrid}>
          {!!companyLocation && (
            <InfoCell colors={colors} label="Lokatsiya" value={companyLocation} />
          )}
          {!!companyAddress && (
            <InfoCell colors={colors} label="Manzil" value={companyAddress} />
          )}
          {!!companyOwner && (
            <InfoCell colors={colors} label="Egasi" value={companyOwner} />
          )}
          {!!companyAdminPosition && (
            <InfoCell colors={colors} label="Lavozim" value={companyAdminPosition} />
          )}
          {!!(companyPhone || companyPhone2) && (
            <InfoCell
              colors={colors}
              label="Telefonlar"
              value={[companyPhone, companyPhone2].filter(Boolean).join(', ')}
            />
          )}
          {!!companyEmail && (
            <InfoCell colors={colors} label="Email" value={companyEmail} />
          )}
        </View>
      </View>
    </View>
  );

  const renderKpi = () => (
    <View style={s.kpiRow}>
      <View style={s.kpiCard}>
        <Text style={s.kpiLabel}>Jami Shtatdagi Xodimlar</Text>
        <View style={s.kpiRowInline}>
          <Text style={s.kpiValue}>{totalEmployees} nafar</Text>
          <Text style={[s.kpiExtra, { color: colors.green }]}>
            {activeCount} faol
          </Text>
        </View>
      </View>
      <View style={s.kpiCard}>
        <Text style={s.kpiLabel}>Mehnat Taʼtili / On Leave</Text>
        <Text style={[s.kpiValue, { color: colors.gold }]}>
          {leaveCount} nafar xodim
        </Text>
      </View>
      <View style={s.kpiCard}>
        <Text style={s.kpiLabel}>Oylik Ish Haqi Fondi (FOT)</Text>
        <Text style={[s.kpiValue, { color: colors.blue }]}>
          {fmtMoney(payrollFund)}
        </Text>
      </View>
    </View>
  );

  const renderToolbar = () => (
    <View style={s.toolbar}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Xodim ismi, lavozim yoki telefon..."
        placeholderTextColor={colors.faint}
        style={s.search}
      />
      <TouchableOpacity style={s.excelBtn} onPress={handleExportExcel}>
        <Text style={s.excelBtnText}>Excel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, index }: { item: Rec; index: number }) => {
    const st = str(item, 'status');
    const faded = st === 'nofaol';
    return (
      <View style={[s.empCard, faded && { opacity: 0.55 }]}>
        <View style={s.empTop}>
          <View style={s.empNo}>
            <Text style={s.empNoText}>{index + 1}</Text>
          </View>
          {str(item, 'avatar') ? (
            <Image source={{ uri: str(item, 'avatar') }} style={s.empAvatar} />
          ) : (
            <View style={[s.empAvatar, s.empAvatarFallback]}>
              <Text style={s.empAvatarFallbackText}>
                {str(item, 'full_name').charAt(0) || '?'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.empName}>{str(item, 'full_name') || 'Nomsiz'}</Text>
            <Text style={s.empPos}>{str(item, 'position') || '—'}</Text>
            {!!str(item, 'phone') && (
              <Text style={s.empPhone}>{str(item, 'phone')}</Text>
            )}
          </View>
        </View>

        <View style={s.empMeta}>
          <Text style={s.empSalary}>{fmtMoney(Number(item.salary) || 0)}</Text>
          <View
            style={[
              s.statusPill,
              { borderColor: statusColor(st, colors) + '55' },
            ]}
          >
            <Text style={[s.statusPillText, { color: statusColor(st, colors) }]}>
              {statusLabel(st)}
            </Text>
          </View>
        </View>

        {!!str(item, 'username') && (
          <Muted>Login: {str(item, 'username')}</Muted>
        )}

        <View style={s.empActions}>
          <TouchableOpacity style={s.actBtn} onPress={() => openEdit(item)}>
            <Text style={s.actBtnText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actBtn, s.actBtnDanger]}
            onPress={() => confirmDelete(item)}
          >
            <Text style={[s.actBtnText, { color: colors.red }]}>{"O'chirish"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const Header = () => (
    <View>
      {renderCompany()}
      {renderKpi()}
      {renderToolbar()}
      <View style={s.tableHead}>
        <Text style={s.tableHeadText}>
          Xodimlar roʻyxati{filtered.length > 0 ? ` · ${filtered.length}` : ''}
        </Text>
        <Text style={s.tableHeadCols}>
          № · Rasm · F.I.SH · Lavozim · Telefon · Maosh · Holat · Amallar
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
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
          ListHeaderComponent={Header}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.gold}
            />
          }
          ListEmptyComponent={<Empty text="Xodimlar topilmadi." />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* Employee modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editing ? 'Xodimni tahrirlash' : 'Yangi xodim'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Avatar */}
              <Text style={s.lbl}>3×4 Rasm</Text>
              <View style={s.avatarPicker}>
                <TouchableOpacity
                  style={s.pickBtn}
                  onPress={() => pickImage((d) => setAvatar(d))}
                >
                  <Text style={s.pickBtnText}>Rasm tanlash</Text>
                </TouchableOpacity>
                {!!avatar && (
                  <Image source={{ uri: avatar }} style={s.avatarPreview} />
                )}
                {!!avatar && (
                  <TouchableOpacity
                    style={s.clearBtn}
                    onPress={() => setAvatar('')}
                  >
                    <Text style={s.clearBtnText}>Olib tashlash</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Field
                label="F.I.Sh. *"
                value={fullName}
                onChange={setFullName}
                placeholder="Familiya Ism Sharif"
              />

              <Text style={s.lbl}>Lavozim *</Text>
              <View style={s.chipRow}>
                {POSITIONS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPosition(p)}
                    style={[
                      s.chip,
                      position === p && { borderColor: colors.gold, backgroundColor: colors.gold + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        s.chipText,
                        position === p && { color: colors.gold, fontWeight: '800' },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Field
                label="Telefon *"
                value={phone}
                onChange={setPhone}
                placeholder="+998 ..."
                keyboard="phone-pad"
              />
              <Field
                label="Oylik maosh (so'm) *"
                value={salary}
                onChange={setSalary}
                placeholder="7500000"
                keyboard="numeric"
              />

              <Text style={s.lbl}>Holat</Text>
              <View style={s.chipRow}>
                {STATUS_OPTS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setStatus(opt.value)}
                    style={[
                      s.chip,
                      status === opt.value && {
                        borderColor: statusColor(opt.value, colors),
                        backgroundColor: statusColor(opt.value, colors) + '22',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.chipText,
                        status === opt.value && {
                          color: statusColor(opt.value, colors),
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Field
                label={editing ? 'Login' : 'Login *'}
                value={username}
                onChange={setUsername}
                placeholder="Xodim logini"
              />

              <Text style={s.lbl}>
                {editing ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}
              </Text>
              <View style={s.passWrap}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    editing
                      ? "O'zgartirmoqchi bo'lsangiz yangi parol yozing"
                      : 'Parol kiriting'
                  }
                  placeholderTextColor={colors.faint}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={s.passInput}
                />
                <TouchableOpacity
                  onPress={() => setShowPass((v) => !v)}
                  style={s.eyeBtn}
                >
                  <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700' }}>
                    {showPass ? 'Yashirish' : "Ko'rsatish"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 8 }} />
              <Btn title="Saqlash" onPress={save} busy={saving} />
              <Btn title="Bekor qilish" onPress={() => setModalVisible(false)} ghost />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Company modal */}
      <Modal visible={companyModalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{"Korxona ma'lumotlari"}</Text>
              <TouchableOpacity onPress={() => setCompanyModalVisible(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.lbl}>Logo</Text>
              <View style={s.avatarPicker}>
                <TouchableOpacity
                  style={s.pickBtn}
                  onPress={() => pickImage((d) => setCLogo(d))}
                >
                  <Text style={s.pickBtnText}>Logo tanlash</Text>
                </TouchableOpacity>
                {!!cLogo && cLogo.startsWith('data:') && (
                  <Image source={{ uri: cLogo }} style={s.logoPreview} />
                )}
                {!!cLogo && !cLogo.startsWith('data:') && (
                  <View style={s.logoLetter}>
                    <Text style={s.logoLetterText}>{cLogo}</Text>
                  </View>
                )}
              </View>
              <Muted>{"Tavsiya: PNG/JPG, kvadrat o'lchamli, kichik hajmli."}</Muted>

              <Field
                label="Korxona nomi *"
                value={cName}
                onChange={setCName}
                placeholder="Clean Life"
              />
              <Field
                label="Egasi F.I.SH"
                value={cOwner}
                onChange={setCOwner}
                placeholder="Ism familiya"
              />
              <Field
                label="Asosiy telefon"
                value={cPhone}
                onChange={setCPhone}
                placeholder="+998 71 200 44 88"
                keyboard="phone-pad"
              />
              <Field
                label="Qo'shimcha telefon"
                value={cPhone2}
                onChange={setCPhone2}
                placeholder="+998 90 ..."
                keyboard="phone-pad"
              />
              <Field
                label="Email"
                value={cEmail}
                onChange={setCEmail}
                placeholder="info@cleanlife.uz"
                keyboard="email-address"
              />
              <Field
                label="Lokatsiya"
                value={cLocation}
                onChange={setCLocation}
                placeholder="Toshkent sh., Chilonzor sanoat hududi"
              />
              <Field
                label="Manzil"
                value={cAddress}
                onChange={setCAddress}
                placeholder="Toshkent sh., Chilonzor, 12-mavze, 45-uy"
                multiline
              />

              <View style={s.sectionTitle}>
                <Text style={s.sectionTitleText}>Tizim admini</Text>
              </View>
              <Field
                label="Admin F.I.SH"
                value={cAdminName}
                onChange={setCAdminName}
                placeholder="Bosh Admin"
              />
              <Field
                label="Admin lavozimi"
                value={cAdminPosition}
                onChange={setCAdminPosition}
                placeholder="Boshqaruvchi direktor"
              />
              <Field
                label="Admin telefoni"
                value={cAdminPhone}
                onChange={setCAdminPhone}
                placeholder="+998 90 ..."
                keyboard="phone-pad"
              />
              <Field
                label="Admin logini"
                value={cAdminLogin}
                onChange={setCAdminLogin}
                placeholder="admin"
              />

              <Text style={s.lbl}>Admin paroli (yangi parol)</Text>
              <View style={s.passWrap}>
                <TextInput
                  value={cAdminPassword}
                  onChangeText={setCAdminPassword}
                  placeholder="O'zgartirish uchun yangi parol"
                  placeholderTextColor={colors.faint}
                  secureTextEntry={!showAdminPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={s.passInput}
                />
                <TouchableOpacity
                  onPress={() => setShowAdminPass((v) => !v)}
                  style={s.eyeBtn}
                >
                  <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700' }}>
                    {showAdminPass ? 'Yashirish' : "Ko'rsatish"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 8 }} />
              <Btn title="Saqlash" onPress={saveCompany} busy={cSavingCo} />
              <Btn
                title="Bekor qilish"
                onPress={() => setCompanyModalVisible(false)}
                ghost
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const InfoCell: React.FC<{ colors: Palette; label: string; value: string }> = ({
  colors,
  label,
  value,
}) => (
  <View
    style={{
      flexBasis: '48%',
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
    }}
  >
    <Text
      style={{
        color: colors.muted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}
    >
      {label}
    </Text>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
      {value}
    </Text>
  </View>
);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    error: {
      color: c.red,
      fontSize: 14,
      marginBottom: 8,
      textAlign: 'center',
    },

    companyWrap: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
      backgroundColor: c.card,
      marginBottom: 12,
    },
    companyBanner: {
      backgroundColor: c.gold,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bannerLabel: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    bannerLabelText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    bannerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    bannerEdit: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    bannerEditText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    bannerAddBtn: {
      backgroundColor: '#fff',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
    },
    bannerAddBtnText: {
      color: '#1b1a17',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    companyBody: { padding: 14, marginTop: -24 },
    companyHead: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
      marginBottom: 12,
    },
    logoBox: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: c.gold,
      borderWidth: 3,
      borderColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoImg: { width: '100%', height: '100%' },
    logoText: { color: '#1b1a17', fontSize: 32, fontWeight: '900' },
    companyName: {
      color: c.text,
      fontSize: 22,
      fontWeight: '900',
    },
    adminPill: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    adminPillText: { color: c.text, fontSize: 11 },

    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    kpiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    kpiCard: {
      flexBasis: '100%',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    kpiLabel: { color: c.muted, fontSize: 11, marginBottom: 4 },
    kpiRowInline: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    kpiValue: { color: c.text, fontSize: 18, fontWeight: '800' },
    kpiExtra: { fontSize: 12, fontWeight: '700' },

    toolbar: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    search: {
      flex: 1,
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    excelBtn: {
      backgroundColor: c.green,
      borderRadius: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    excelBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    tableHead: {
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    tableHeadText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    tableHeadCols: {
      color: c.muted,
      fontSize: 10,
      letterSpacing: 0.3,
    },

    empCard: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    empTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    empNo: {
      minWidth: 32,
      height: 28,
      paddingHorizontal: 8,
      borderRadius: 10,
      backgroundColor: c.gold + '22',
      borderColor: c.gold + '66',
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empNoText: { color: c.text, fontWeight: '900', fontSize: 13 },
    empAvatar: {
      width: 48,
      height: 64,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.gold + '66',
    },
    empAvatarFallback: {
      backgroundColor: c.input,
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed',
    },
    empAvatarFallbackText: {
      color: c.muted,
      fontSize: 20,
      fontWeight: '900',
    },
    empName: { color: c.text, fontSize: 15, fontWeight: '800' },
    empPos: { color: c.text, fontSize: 13, marginTop: 2 },
    empPhone: { color: c.muted, fontSize: 12, marginTop: 2 },
    empMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    empSalary: { color: c.gold, fontSize: 15, fontWeight: '800' },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    empActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    actBtn: {
      flex: 1,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    actBtnDanger: { borderColor: c.red },
    actBtnText: { color: c.gold, fontWeight: '700', fontSize: 13 },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: c.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderColor: c.cardBorder,
      borderWidth: 1,
      padding: 16,
      maxHeight: '92%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    closeX: { color: c.muted, fontSize: 20, paddingHorizontal: 6 },

    lbl: {
      color: c.muted,
      fontSize: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },

    avatarPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    pickBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.gold + '22',
      borderColor: c.gold + '55',
      borderWidth: 1,
    },
    pickBtnText: { color: c.gold, fontWeight: '800', fontSize: 12 },
    avatarPreview: {
      width: 48,
      height: 64,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    logoPreview: {
      width: 48,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    logoLetter: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoLetterText: { color: '#1b1a17', fontSize: 24, fontWeight: '900' },
    clearBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    clearBtnText: { color: c.muted, fontSize: 11, fontWeight: '700' },

    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.input,
    },
    chipText: { color: c.text, fontSize: 12, fontWeight: '600' },

    passWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingRight: 10,
      marginBottom: 12,
    },
    passInput: {
      flex: 1,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    eyeBtn: { paddingHorizontal: 8, paddingVertical: 6 },

    sectionTitle: {
      marginTop: 8,
      marginBottom: 10,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      paddingTop: 12,
    },
    sectionTitleText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
    },
  });
