import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api';
import { useAuth, useAppRole } from '../auth';
import { Btn, Card, Field, Loader, Screen } from '../components';
import { useAppTheme } from '../theme-context';
import { fmtMoney, Palette } from '../theme';

type Rec = Record<string, unknown>;
const str = (r: Rec, k: string): string => (r[k] == null ? '' : String(r[k]));

type FormState = {
  name: string;
  slogan: string;
  logo: string;
  location: string;
  address: string;
  phone: string;
  phone2: string;
  email: string;
  admin_name: string;
  admin_login: string;
  admin_title: string;
  admin_position: string;
  admin_role: string;
  admin_phone: string;
  lat: string;
  lng: string;
};

const emptyForm = (): FormState => ({
  name: '',
  slogan: '',
  logo: 'B',
  location: '',
  address: '',
  phone: '',
  phone2: '',
  email: '',
  admin_name: '',
  admin_login: '',
  admin_title: '',
  admin_position: '',
  admin_role: '',
  admin_phone: '',
  lat: '',
  lng: '',
});

const fromRec = (r: Rec | null): FormState => {
  if (!r) return emptyForm();
  const rawLogo = str(r, 'logo');
  // Prod DB'da `logo` 100+ KB base64 bo'lishi mumkin. Bitta harfni `<Text>` ichida ko'rsatamiz —
  // base64 yoki URL bo'lsa, korxona nomining birinchi harfiga tushamiz. Haqiqiy rasm esa
  // formState'da emas, `company.logo` orqali `<Image>` sifatida renderlanadi.
  const nameFirst = (str(r, 'name').trim().charAt(0) || 'B').toUpperCase();
  const isLongOrDataUrl = rawLogo.length > 2 || rawLogo.startsWith('data:') || rawLogo.startsWith('http');
  const logoLetter = isLongOrDataUrl ? nameFirst : (rawLogo || nameFirst);
  return {
    name: str(r, 'name'),
    slogan: str(r, 'slogan'),
    logo: logoLetter,
    location: str(r, 'location'),
    address: str(r, 'address'),
    phone: str(r, 'phone'),
    phone2: str(r, 'phone2'),
    email: str(r, 'email'),
    admin_name: str(r, 'admin_name'),
    admin_login: str(r, 'admin_login'),
    admin_title: str(r, 'admin_title'),
    admin_position: str(r, 'admin_position'),
    admin_role: str(r, 'admin_role'),
    admin_phone: str(r, 'admin_phone'),
    lat: r.lat == null ? '' : String(r.lat),
    lng: r.lng == null ? '' : String(r.lng),
  };
};

const toPayload = (f: FormState): Rec => {
  const latNum = f.lat.trim() ? Number(f.lat.replace(',', '.')) : null;
  const lngNum = f.lng.trim() ? Number(f.lng.replace(',', '.')) : null;
  // Diqqat: logo payload'ga qo'shilmaydi. Mobil'da `logo` field — bu faqat bir harfli
  // placeholder (asl rasm `company.logo` orqali ko'rsatiladi). PATCH yuborganda uni
  // tashlab yuborsak, backend DB'dagi asl base64 rasmni saqlab qoladi.
  return {
    name: f.name.trim(),
    slogan: f.slogan.trim(),
    location: f.location.trim(),
    address: f.address.trim(),
    phone: f.phone.trim(),
    phone2: f.phone2.trim(),
    email: f.email.trim(),
    admin_name: f.admin_name.trim(),
    admin_login: f.admin_login.trim(),
    admin_title: f.admin_title.trim(),
    admin_position: f.admin_position.trim(),
    admin_role: f.admin_role.trim(),
    admin_phone: f.admin_phone.trim(),
    lat: Number.isFinite(latNum as number) ? latNum : null,
    lng: Number.isFinite(lngNum as number) ? lngNum : null,
  };
};

// Admin profilining asosiy komponenti. Hook'lar faqat ADMIN rolida chaqiriladi.
// Oldingi versiya hook'larni erta return'dan keyin chaqirgan edi — bu production build'da
// "Rendered more hooks than during the previous render" xatosi va cheksiz loader keltirib
// chiqarardi. Komponentlar ajratilgan — Rules of Hooks saqlanadi.
export const ProfileScreen: React.FC = () => {
  const { session, logout } = useAuth();
  const role = useAppRole();

  if (role === 'staff' || role === 'driver') {
    return <StaffProfile session={session} logout={logout} />;
  }
  return <AdminProfile />;
};

const AdminProfile: React.FC = () => {
  const { session, logout } = useAuth();
  const { theme, colors, toggleTheme } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [company, setCompany] = useState<Rec | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setMsg('');
    try {
      const c = await api.company.get();
      setCompany(c);
      setForm(fromRec(c));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Korxona maʼlumotlarini yuklab boʻlmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Xatolik', 'Korxona nomini kiriting.');
      return;
    }
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const payload = toPayload(form);
      const saved = company?.id
        ? await api.company.update(company.id as number, payload)
        : await api.company.create(payload);
      setCompany(saved);
      setForm(fromRec(saved));
      setEditing(false);
      setMsg('✓ Maʼlumotlar muvaffaqiyatli saqlandi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setBusy(false);
    }
  };

  const cancelEdit = () => {
    setForm(fromRec(company));
    setEditing(false);
    setError('');
  };

  const confirmLogout = () => {
    // Alert.alert ning action tugmalari react-native-web da ishlamaydi —
    // web uchun native window.confirm, native uchun Alert.alert ishlatiladi.
    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm('Rostdan ham tizimdan chiqmoqchimisiz?')
          : true;
      if (ok) void logout();
      return;
    }
    Alert.alert('Chiqish', 'Rostdan ham tizimdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  if (loading && !company && !error) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const hasCoords = form.lat || form.lng;

  // --- Vizual elementlar (inline, chunki ranglar dinamik) ---
  const InfoRow = ({
    icon,
    label,
    value,
    tint = colors.gold,
  }: {
    icon: string;
    label: string;
    value: string;
    tint?: string;
  }) => (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );

  const SectionHeader = ({
    icon,
    title,
    hint,
  }: {
    icon: string;
    title: string;
    hint?: string;
  }) => (
    <View style={s.sectionHeader}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {hint ? <Text style={s.sectionHint}>{hint}</Text> : null}
      </View>
    </View>
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        {/* === HERO === */}
        <View style={s.hero}>
          <View style={s.logoRing}>
            <View style={s.logoWrap}>
              <Text style={s.logoText}>{form.logo || 'B'}</Text>
            </View>
          </View>

          <Text style={s.companyName} numberOfLines={2}>
            {form.name || 'Korxona nomi'}
          </Text>

          {form.slogan ? (
            <Text style={s.slogan} numberOfLines={3}>{form.slogan}</Text>
          ) : null}

          <View style={s.chipsRow}>
            <View style={s.chip}>
              <Text style={s.chipText}>✓ Faol</Text>
            </View>
            {form.location ? (
              <View style={s.chipMuted}>
                <Text style={s.chipMutedText}>📍 {form.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* === KOʻRINISH REJIMI (THEME TOGGLE) === */}
        <View style={s.themeCard}>
          <View style={s.themeHead}>
            <Text style={{ fontSize: 22 }}>{theme === 'light' ? '☀️' : '🌙'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.themeTitle}>Koʻrinish rejimi</Text>
              <Text style={s.themeHint}>
                {theme === 'light' ? 'Kun rejimi yoqilgan' : 'Tun rejimi yoqilgan'}
              </Text>
            </View>
          </View>
          <View style={s.themeSwitch}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => theme !== 'light' && toggleTheme()}
              style={[s.themeOption, theme === 'light' && s.themeOptionActive]}
            >
              <Text style={{ fontSize: 18 }}>☀️</Text>
              <Text style={[s.themeOptionText, theme === 'light' && s.themeOptionTextActive]}>
                Kun
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => theme !== 'dark' && toggleTheme()}
              style={[s.themeOption, theme === 'dark' && s.themeOptionActive]}
            >
              <Text style={{ fontSize: 18 }}>🌙</Text>
              <Text style={[s.themeOptionText, theme === 'dark' && s.themeOptionTextActive]}>
                Tun
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* === Sessiya kartasi === */}
        <View style={s.sessionCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>
              {(session?.name || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sessionName}>{session?.name ?? '—'}</Text>
            <Text style={s.sessionRole}>
              {session?.role === 'admin' ? 'Administrator' : 'Xodim'}
              {session?.position ? ` • ${session.position}` : ''}
            </Text>
          </View>
          <View style={s.sessionDot} />
        </View>

        {msg ? (
          <View style={s.alertOk}>
            <Text style={{ fontSize: 16 }}>✓</Text>
            <Text style={s.alertOkText}>{msg}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={s.alertErr}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={s.alertErrText}>{error}</Text>
          </View>
        ) : null}

        {/* === Umumiy maʼlumot === */}
        <Card>
          <View style={s.cardTopRow}>
            <SectionHeader icon="🏢" title="Umumiy maʼlumot" hint="Korxona asosiy maʼlumotlari" />
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={s.editPill}>
                <Text style={s.editPillText}>✎ Tahrir</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {editing ? (
            <>
              <Field label="Korxona nomi" value={form.name} onChange={set('name')} placeholder="Masalan: Clean Life" />
              <Field label="Slogan" value={form.slogan} onChange={set('slogan')} placeholder="Qisqa shior" multiline />
            </>
          ) : (
            <>
              <InfoRow icon="🏷️" label="Nomi" value={form.name} tint="#D4AF37" />
              <InfoRow icon="💬" label="Slogan" value={form.slogan} tint="#64B5F6" />
            </>
          )}
        </Card>

        {/* === Bogʻlanish === */}
        <Card>
          <SectionHeader icon="📞" title="Bogʻlanish" hint="Telefon va elektron pochta" />
          {editing ? (
            <>
              <Field label="Asosiy telefon" value={form.phone} onChange={set('phone')} placeholder="+998 ..." keyboard="phone-pad" />
              <Field label="Qoʻshimcha telefon" value={form.phone2} onChange={set('phone2')} placeholder="+998 ..." keyboard="phone-pad" />
              <Field label="Email" value={form.email} onChange={set('email')} placeholder="info@example.uz" keyboard="email-address" />
            </>
          ) : (
            <>
              <InfoRow icon="☎️" label="Asosiy telefon" value={form.phone} tint="#34D399" />
              <InfoRow icon="📱" label="Qoʻshimcha telefon" value={form.phone2} tint="#34D399" />
              <InfoRow icon="✉️" label="Email" value={form.email} tint="#64B5F6" />
            </>
          )}
        </Card>

        {/* === Joylashuv === */}
        <Card>
          <SectionHeader icon="📍" title="Joylashuv" hint="Hudud, manzil va xaritadagi koordinata" />
          {editing ? (
            <>
              <Field label="Shahar / Hudud" value={form.location} onChange={set('location')} placeholder="Toshkent sh., Chilonzor" />
              <Field label="Toʻliq manzil" value={form.address} onChange={set('address')} placeholder="Koʻcha, bino, kvartira" multiline />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Latitude" value={form.lat} onChange={set('lat')} placeholder="41.311" keyboard="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Longitude" value={form.lng} onChange={set('lng')} placeholder="69.240" keyboard="numeric" />
                </View>
              </View>
            </>
          ) : (
            <>
              <InfoRow icon="🌆" label="Shahar / Hudud" value={form.location} tint="#F59E0B" />
              <InfoRow icon="🏠" label="Toʻliq manzil" value={form.address} tint="#D4AF37" />
              {hasCoords ? (
                <View style={s.coordsRow}>
                  <View style={s.coordBox}>
                    <Text style={s.coordLabel}>LATITUDE</Text>
                    <Text style={s.coordValue}>{form.lat || '—'}</Text>
                  </View>
                  <View style={s.coordBox}>
                    <Text style={s.coordLabel}>LONGITUDE</Text>
                    <Text style={s.coordValue}>{form.lng || '—'}</Text>
                  </View>
                </View>
              ) : (
                <InfoRow icon="🗺️" label="Xarita koordinatasi" value="—" tint="#A78BFA" />
              )}
            </>
          )}
        </Card>

        {/* === Admin kabineti === */}
        <Card>
          <SectionHeader icon="🛡️" title="Admin kabineti" hint="Tizim boshqaruvchisi maʼlumotlari" />
          {editing ? (
            <>
              <Field label="Admin F.I.SH" value={form.admin_name} onChange={set('admin_name')} placeholder="Ism Familiya" />
              <Field label="Admin login" value={form.admin_login} onChange={set('admin_login')} placeholder="admin" />
              <Field label="Unvon" value={form.admin_title} onChange={set('admin_title')} placeholder="Bosh Admin" />
              <Field label="Lavozim" value={form.admin_position} onChange={set('admin_position')} placeholder="Boshqaruvchi direktor" />
              <Field label="Rol" value={form.admin_role} onChange={set('admin_role')} placeholder="Toʻliq boshqaruv" />
              <Field label="Admin telefoni" value={form.admin_phone} onChange={set('admin_phone')} placeholder="+998 ..." keyboard="phone-pad" />
            </>
          ) : (
            <>
              <InfoRow icon="🧑‍💼" label="F.I.SH" value={form.admin_name} tint="#A78BFA" />
              <InfoRow icon="🔑" label="Login" value={form.admin_login} tint="#D4AF37" />
              <InfoRow icon="🏆" label="Unvon" value={form.admin_title} tint="#F59E0B" />
              <InfoRow icon="💼" label="Lavozim" value={form.admin_position} tint="#64B5F6" />
              <InfoRow icon="🧭" label="Rol" value={form.admin_role} tint="#22D3EE" />
              <InfoRow icon="📞" label="Admin telefoni" value={form.admin_phone} tint="#34D399" />
            </>
          )}
        </Card>

        {editing ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Btn title="Bekor qilish" onPress={cancelEdit} ghost />
            </View>
            <View style={{ flex: 1.5 }}>
              <Btn title="Saqlash" onPress={save} busy={busy} />
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Btn title="🚪 Tizimdan chiqish" onPress={confirmLogout} danger />
        </View>

        <Text style={s.footer}>Clean Life ERP • Mobil ilova • v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
};

const staffMakeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      alignItems: 'center',
      paddingTop: 20,
      paddingBottom: 18,
      paddingHorizontal: 16,
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 14,
    },
    avatarRing: {
      width: 128,
      height: 128,
      borderRadius: 64,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 3,
      padding: 3,
      position: 'relative',
    },
    avatarColor: {
      width: 118,
      height: 118,
      borderRadius: 59,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#1A1715', fontSize: 46, fontWeight: '900' },
    avatarImage: { width: 118, height: 118, borderRadius: 59 },
    statusDot: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 3,
    },
    name: {
      color: c.text,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    position: {
      color: c.muted,
      fontSize: 14,
      marginTop: 4,
      textAlign: 'center',
      fontWeight: '600',
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipText: { fontSize: 11, fontWeight: '800' },
    chipMuted: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chipMutedText: { color: c.muted, fontSize: 11, fontWeight: '700' },

    themeCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 12,
    },
    themeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    themeTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    themeHint: { color: c.muted, fontSize: 12, marginTop: 2 },
    themeSwitch: {
      flexDirection: 'row',
      gap: 8,
      padding: 4,
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 10,
    },
    themeOptionActive: {
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    themeOptionText: { color: c.muted, fontSize: 13, fontWeight: '800' },
    themeOptionTextActive: { color: c.gold },

    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    statLabel: {
      color: c.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 4,
    },
    statValue: {
      color: c.text,
      fontSize: 13,
      fontWeight: '900',
    },

    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      flex: 1,
    },
    sectionTitle: { color: c.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
    sectionHint: { color: c.muted, fontSize: 11, marginTop: 1 },
    editPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    editPillText: { color: c.gold, fontSize: 11, fontWeight: '800' },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoLabel: {
      color: c.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    infoValue: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: 2 },

    alertOk: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.green + '22',
      borderWidth: 1,
      borderColor: c.green + '55',
      marginBottom: 12,
    },
    alertOkText: { color: c.green, fontSize: 12, fontWeight: '700', flex: 1 },
    alertErr: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.red + '22',
      borderWidth: 1,
      borderColor: c.red + '55',
      marginBottom: 12,
    },
    alertErrText: { color: c.red, fontSize: 12, fontWeight: '700', flex: 1 },

    btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    btnFlex: { flex: 1 },
    logoutWrap: { marginTop: 16 },
    footerText: { color: c.faint, fontSize: 11, textAlign: 'center', marginTop: 16 },
  });

type EmpForm = {
  full_name: string;
  position: string;
  phone: string;
};

const emptyEmpForm = (): EmpForm => ({
  full_name: '',
  position: '',
  phone: '',
});

const fromEmpRec = (r: Rec | null): EmpForm => ({
  full_name: str(r ?? {}, 'full_name'),
  position: str(r ?? {}, 'position'),
  phone: str(r ?? {}, 'phone'),
});

const StaffProfile: React.FC<{
  session: { employeeId?: number; name?: string } | null;
  logout: () => Promise<void>;
}> = ({ session, logout }) => {
  const { theme, colors, toggleTheme } = useAppTheme();
  const s = useMemo(() => staffMakeStyles(colors), [colors]);

  const [rec, setRec] = useState<Rec | null>(null);
  const [form, setForm] = useState<EmpForm>(emptyEmpForm());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const employeeId = session?.employeeId;
  const employeeName = session?.name ?? 'Xodim';

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setMsg(null);
    if (!employeeId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const r = await api.employees.get(employeeId);
      setRec(r);
      setForm(fromEmpRec(r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xodim profilingini yuklab bo'lmadi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (k: keyof EmpForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const statusColor = (status: string): string => {
    const t = (status ?? '').toLowerCase();
    if (t === 'active') return colors.green;
    if (t.includes('prob') || t === 'sinov') return colors.blue;
    if (t.includes('leave') || t === "ta'tilda") return colors.gold;
    return colors.red;
  };

  const statusLabel = (status: string): string => {
    const t = (status ?? '').toLowerCase();
    if (t === 'active') return 'Faol';
    if (t.includes('prob') || t === 'sinov') return "Sinov davrida";
    if (t.includes('leave') || t === "ta'tilda") return "Ta'tilda";
    if (t === 'nofaol') return "Nofaol";
    return status;
  };

  const save = async () => {
    if (!employeeId) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const saved = await api.employees.update(employeeId, {
        full_name: form.full_name.trim(),
        position: form.position.trim(),
        phone: form.phone.trim(),
      });
      setRec(saved);
      setForm(fromEmpRec(saved));
      setEditing(false);
      setMsg('✓ Profil muvaffaqiyatli saqlandi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setBusy(false);
    }
  };

  const confirmLogout = () => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm('Tizimdan chiqmoqchimisiz?')) void logout();
      return;
    }
    Alert.alert('Chiqish', 'Tizimdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  if (loading && !rec) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const initials = (employeeName || 'X')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const status = String(rec?.status ?? 'active');
  const avatarUri =
    rec?.avatar && String(rec.avatar).trim() ? String(rec.avatar) : '';
  const stColor = statusColor(status);

  const InfoRow: React.FC<{
    icon: string;
    label: string;
    value: string;
    tint?: string;
  }> = ({ icon, label, value, tint = colors.gold }) => (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        {/* === HERO === */}
        <View style={s.hero}>
          <View style={[s.avatarRing, { borderColor: stColor + '66' }]}>
            {avatarUri ? (
              <Image style={s.avatarImage} source={{ uri: avatarUri }} />
            ) : (
              <View
                style={[
                  s.avatarColor,
                  { backgroundColor: String(rec?.avatar_color || colors.gold) },
                ]}
              >
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={[s.statusDot, { backgroundColor: stColor, borderColor: colors.card }]} />
          </View>

          <Text style={s.name}>{String(rec?.full_name || employeeName)}</Text>
          {rec?.position ? (
            <Text style={s.position}>{String(rec.position)}</Text>
          ) : null}

          <View style={s.chipsRow}>
            <View style={[s.chip, { backgroundColor: stColor + '22', borderColor: stColor + '66' }]}>
              <Text style={[s.chipText, { color: stColor }]}>● {statusLabel(status)}</Text>
            </View>
            {rec?.username ? (
              <View style={s.chipMuted}>
                <Text style={s.chipMutedText}>@{String(rec.username)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* === TUN / KUN REJIMI === */}
        <View style={s.themeCard}>
          <View style={s.themeHead}>
            <Text style={{ fontSize: 22 }}>{theme === 'light' ? '☀️' : '🌙'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.themeTitle}>Koʻrinish rejimi</Text>
              <Text style={s.themeHint}>
                {theme === 'light' ? 'Kun rejimi yoqilgan' : 'Tun rejimi yoqilgan'}
              </Text>
            </View>
          </View>
          <View style={s.themeSwitch}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => theme !== 'light' && toggleTheme()}
              style={[s.themeOption, theme === 'light' && s.themeOptionActive]}
            >
              <Text style={{ fontSize: 18 }}>☀️</Text>
              <Text style={[s.themeOptionText, theme === 'light' && s.themeOptionTextActive]}>Kun</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => theme !== 'dark' && toggleTheme()}
              style={[s.themeOption, theme === 'dark' && s.themeOptionActive]}
            >
              <Text style={{ fontSize: 18 }}>🌙</Text>
              <Text style={[s.themeOptionText, theme === 'dark' && s.themeOptionTextActive]}>Tun</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* === STAT KARTALAR === */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>MAOSH</Text>
            <Text style={s.statValue} numberOfLines={1}>
              {rec?.salary == null ? '—' : fmtMoney(Number(rec.salary))}
            </Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>ISHGA KIRGAN</Text>
            <Text style={s.statValue} numberOfLines={1}>
              {String(rec?.join_date || '—')}
            </Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>FACE ID</Text>
            <Text style={[s.statValue, { color: rec?.has_face_id ? colors.green : colors.muted }]} numberOfLines={1}>
              {rec?.has_face_id ? "✓ Ro'yxatda" : "— Yo'q"}
            </Text>
          </View>
        </View>

        {msg ? (
          <View style={s.alertOk}>
            <Text style={{ fontSize: 16 }}>✓</Text>
            <Text style={s.alertOkText}>{msg}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={s.alertErr}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={s.alertErrText}>{error}</Text>
          </View>
        ) : null}

        {/* === Shaxsiy maʼlumot === */}
        <Card>
          <View style={s.cardTopRow}>
            <View style={s.sectionHeader}>
              <Text style={{ fontSize: 18 }}>👤</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>Shaxsiy maʼlumotlar</Text>
                <Text style={s.sectionHint}>Ism, lavozim va aloqa</Text>
              </View>
            </View>
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={s.editPill}>
                <Text style={s.editPillText}>✎ Tahrir</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {editing ? (
            <>
              <Field label="Ism va familiya" value={form.full_name} onChange={setField('full_name')} placeholder="Ism Familiya" />
              <Field label="Lavozim" value={form.position} onChange={setField('position')} placeholder="Muvofiq lavozim" />
              <Field label="Telefon" value={form.phone} onChange={setField('phone')} placeholder="+998 ..." keyboard="phone-pad" />
            </>
          ) : (
            <>
              <InfoRow icon="🪪" label="Ism va familiya" value={String(rec?.full_name || employeeName)} tint="#D4AF37" />
              <InfoRow icon="💼" label="Lavozim" value={String(rec?.position || '—')} tint="#64B5F6" />
              <InfoRow icon="📱" label="Telefon" value={String(rec?.phone || '—')} tint="#34D399" />
              <InfoRow icon="🔑" label="Login" value={String(rec?.username || '—')} tint="#A78BFA" />
            </>
          )}

          {!editing ? (
            <View style={{ marginTop: 10 }}>
              <Btn title="✎ Ma'lumotlarimni tahrirlash" onPress={() => setEditing(true)} ghost />
            </View>
          ) : (
            <View style={s.btnRow}>
              <View style={s.btnFlex}>
                <Btn title="Bekor qilish" onPress={() => { setForm(fromEmpRec(rec)); setEditing(false); }} ghost />
              </View>
              <View style={s.btnFlex}>
                <Btn title="Saqlash" onPress={save} busy={busy} />
              </View>
            </View>
          )}
        </Card>

        <View style={s.logoutWrap}>
          <Btn title="🚪 Tizimdan chiqish" onPress={confirmLogout} danger />
        </View>
        <Text style={s.footerText}>Brendor ERP • Xodim profili</Text>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 20,
      marginBottom: 8,
    },
    logoRing: {
      width: 128,
      height: 128,
      borderRadius: 64,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gold + '12',
      borderWidth: 2,
      borderColor: c.gold + '55',
      marginBottom: 14,
    },
    logoWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.gold,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    logoText: { color: '#1A1715', fontSize: 52, fontWeight: '900' },
    companyName: {
      color: c.text,
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0.5,
      paddingHorizontal: 16,
    },
    slogan: {
      color: c.muted,
      fontSize: 13,
      marginTop: 6,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 18,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      flexWrap: 'wrap',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.green + '22',
      borderWidth: 1,
      borderColor: c.green + '55',
    },
    chipText: { color: c.green, fontSize: 11, fontWeight: '800' },
    chipMuted: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chipMutedText: { color: c.muted, fontSize: 11, fontWeight: '700' },

    // Theme toggle card
    themeCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 12,
    },
    themeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    themeTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    themeHint: { color: c.muted, fontSize: 12, marginTop: 2 },
    themeSwitch: {
      flexDirection: 'row',
      gap: 8,
      padding: 4,
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 10,
    },
    themeOptionActive: {
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    themeOptionText: { color: c.muted, fontSize: 13, fontWeight: '800' },
    themeOptionTextActive: { color: c.gold },

    // Sessiya
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 12,
    },
    avatarCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '55',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: c.gold, fontSize: 20, fontWeight: '900' },
    sessionName: { color: c.text, fontSize: 15, fontWeight: '800' },
    sessionRole: { color: c.muted, fontSize: 12, marginTop: 2 },
    sessionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.green },

    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    sectionTitle: { color: c.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
    sectionHint: { color: c.muted, fontSize: 11, marginTop: 1 },
    editPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '55',
    },
    editPillText: { color: c.gold, fontSize: 11, fontWeight: '800' },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoLabel: {
      color: c.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    infoValue: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: 2 },

    coordsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
    },
    coordBox: {
      flex: 1,
      backgroundColor: c.bg,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    coordLabel: { color: c.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    coordValue: { color: c.gold, fontSize: 14, fontWeight: '900', marginTop: 2 },

    alertOk: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.green + '22',
      borderWidth: 1,
      borderColor: c.green + '55',
      marginBottom: 12,
    },
    alertOkText: { color: c.green, fontSize: 12, fontWeight: '700', flex: 1 },
    alertErr: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.red + '22',
      borderWidth: 1,
      borderColor: c.red + '55',
      marginBottom: 12,
    },
    alertErrText: { color: c.red, fontSize: 12, fontWeight: '700', flex: 1 },

    footer: { color: c.faint, fontSize: 11, textAlign: 'center', marginTop: 20 },
  });
