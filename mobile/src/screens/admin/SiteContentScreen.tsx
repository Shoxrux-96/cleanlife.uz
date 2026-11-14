import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { useCanAdminWrite } from '../../auth';
import { Loader, Muted, Screen } from '../../components';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;
const str = (r: Rec, k: string): string => String(r[k] ?? '');

export const SiteContentScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const canEdit = useCanAdminWrite();

  const [contact, setContact] = useState<Rec | null>(null);
  const [portfolio, setPortfolio] = useState<Rec[]>([]);
  const [lang, setLang] = useState<'uz' | 'ru' | 'en'>('uz');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Contact info form
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [telegram, setTelegram] = useState('');
  const [instagram, setInstagram] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [ci, pf] = await Promise.all([
        api.site.contactInfo.get().catch(() => ({} as Rec)),
        api.site.portfolio.list(lang).catch(() => [] as Rec[]),
      ]);
      setContact(ci);
      setPhone1(str(ci, 'phone1'));
      setPhone2(str(ci, 'phone2'));
      setEmail(str(ci, 'email'));
      setAddress(str(ci, 'address'));
      setTelegram(str(ci, 'telegram'));
      setInstagram(str(ci, 'instagram'));
      setPortfolio(pf);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const saveContact = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.site.contactInfo.save({
        phone1: phone1.trim(),
        phone2: phone2.trim(),
        email: email.trim(),
        address: address.trim(),
        telegram: telegram.trim(),
        instagram: instagram.trim(),
      });
      Alert.alert('Saqlandi', 'Aloqa ma‘lumotlari yangilandi.');
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteItem = (p: Rec) => {
    Alert.alert("O'chirish", `"${str(p, 'title')}" portfoliodan o'chirilsinmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await api.site.portfolio.remove(Number(p.id));
            setPortfolio((prev) => prev.filter((x) => x.id !== p.id));
          } catch (e) {
            Alert.alert('Xatolik', e instanceof Error ? e.message : "O'chirishda xatolik");
          }
        },
      },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
      >
        {error ? <Text style={s.error}>{error}</Text> : null}

        <Text style={s.sectionTitle}>📞 Saytdagi aloqa ma‘lumotlari</Text>
        <View style={s.card}>
          <Field label="Telefon 1" value={phone1} onChange={setPhone1} editable={canEdit} colors={colors} />
          <Field label="Telefon 2" value={phone2} onChange={setPhone2} editable={canEdit} colors={colors} />
          <Field label="Email" value={email} onChange={setEmail} editable={canEdit} colors={colors} />
          <Field label="Manzil" value={address} onChange={setAddress} editable={canEdit} colors={colors} />
          <Field label="Telegram" value={telegram} onChange={setTelegram} editable={canEdit} colors={colors} />
          <Field label="Instagram" value={instagram} onChange={setInstagram} editable={canEdit} colors={colors} />
          {canEdit && (
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={saveContact}>
              <Text style={s.saveBtnT}>{saving ? '...' : 'Saqlash'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.sectionTitle}>🖼️ Portfolio ({portfolio.length})</Text>
        <View style={s.langRow}>
          {(['uz', 'ru', 'en'] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={[s.langChip, lang === l && { backgroundColor: colors.gold, borderColor: colors.gold }]}
              onPress={() => setLang(l)}
            >
              <Text style={[s.langChipT, lang === l && { color: '#000' }]}>{l.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {portfolio.length === 0 ? (
          <Muted>Portfolio bo‘sh.</Muted>
        ) : (
          portfolio.map((p) => (
            <View key={String(p.id)} style={s.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle} numberOfLines={2}>{str(p, 'title') || 'Nomsiz'}</Text>
                {!!str(p, 'category') && <Text style={s.itemSub}>{str(p, 'category')}</Text>}
                {!!str(p, 'description') && (
                  <Text style={s.itemDesc} numberOfLines={2}>{str(p, 'description')}</Text>
                )}
              </View>
              {canEdit && (
                <TouchableOpacity
                  style={[s.delBtn, { borderColor: colors.red + '55' }]}
                  onPress={() => confirmDeleteItem(p)}
                >
                  <Text style={[s.delBtnT, { color: colors.red }]}>O‘chirish</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <Muted>Portfolio elementlarini qo‘shish/tahrirlash veb-admin orqali amalga oshiriladi.</Muted>
      </ScrollView>
    </Screen>
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  colors: Palette;
};
const Field: React.FC<FieldProps> = ({ label, value, onChange, editable, colors }) => {
  const s = useMemo(() => fieldStyles(colors), [colors]);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        placeholderTextColor={colors.faint}
        style={[s.input, !editable && { opacity: 0.6 }]}
      />
    </View>
  );
};
const fieldStyles = (c: Palette) => StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { color: c.muted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: c.cardBorder,
    color: c.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.card,
    fontSize: 13,
  },
});

const makeStyles = (c: Palette) => StyleSheet.create({
  error: { color: c.red, fontSize: 13 },
  roBanner: {
    backgroundColor: c.gold + '18',
    borderWidth: 1,
    borderColor: c.gold + '55',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roBannerText: { color: c.gold, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: c.text, fontSize: 15, fontWeight: '900', marginTop: 8 },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: c.gold,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnT: { color: '#000', fontWeight: '900', fontSize: 14 },
  langRow: { flexDirection: 'row', gap: 8 },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  langChipT: { color: c.text, fontSize: 12, fontWeight: '800' },
  itemCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  itemTitle: { color: c.text, fontSize: 13, fontWeight: '800' },
  itemSub: { color: c.gold, fontSize: 11, fontWeight: '700', marginTop: 2 },
  itemDesc: { color: c.muted, fontSize: 11, marginTop: 4 },
  delBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  delBtnT: { fontSize: 11, fontWeight: '800' },
});
