import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { Btn, Card, Empty, Field, H1, Loader } from '../../components';
import { colors } from '../../theme';

type Row = Record<string, unknown>;
type Lang = 'uz' | 'ru';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const idOf = (o: Row): number => Number(o.id);
const dataOf = (o: Row): Record<string, unknown> =>
  (o.data as Record<string, unknown>) ?? {};

const clientNameOf = (o: Row): string => str(dataOf(o).clientName);
const businessTypeOf = (o: Row): string => str(o.business_type);
const publishedOf = (o: Row): boolean => Boolean(o.is_published);

const DEFAULT_LOGO_THEME = { mode: 'light', accent: '#D4AF37' };

const emptyForm = {
  clientName: '',
  business_type: '',
  location: '',
  tagline: '',
  story: '',
  realPhotoUrl: '',
  realPhotoCaption: '',
  is_published: false,
};

export const SitePortfolioScreen: React.FC = () => {
  const [lang, setLang] = useState<Lang>('uz');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(
    async (isRefresh = false, l: Lang = lang) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await api.site.portfolio.list(l);
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Portfolio yuklanmadi.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [lang],
  );

  useEffect(() => {
    load(false, lang);
  }, [lang, load]);

  const switchLang = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (o: Row) => {
    const d = dataOf(o);
    setEditing(o);
    setForm({
      clientName: str(d.clientName),
      business_type: businessTypeOf(o),
      location: str(d.location),
      tagline: str(d.tagline),
      story: str(d.story),
      realPhotoUrl: str(d.realPhotoUrl),
      realPhotoCaption: str(d.realPhotoCaption),
      is_published: publishedOf(o),
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.clientName.trim()) {
      setFormError('Mijoz nomini kiriting.');
      return;
    }
    const existing = editing ? dataOf(editing) : {};
    const body: Record<string, unknown> = {
      external_id: editing ? str(editing.external_id) || `proj-${Date.now()}` : `proj-${Date.now()}`,
      lang,
      business_type: form.business_type.trim(),
      is_published: form.is_published,
      published_at: form.is_published
        ? str(editing?.published_at) || new Date().toISOString()
        : null,
      data: {
        ...existing,
        clientName: form.clientName.trim(),
        location: form.location.trim(),
        tagline: form.tagline.trim(),
        story: form.story,
        realPhotoUrl: form.realPhotoUrl.trim(),
        realPhotoCaption: form.realPhotoCaption.trim(),
        logoTheme: (existing.logoTheme as Record<string, unknown>) ?? DEFAULT_LOGO_THEME,
        brandedItems: (existing.brandedItems as unknown[]) ?? [],
      },
    };
    setSaving(true);
    try {
      if (editing) {
        await api.site.portfolio.update(idOf(editing), body);
      } else {
        await api.site.portfolio.create(body);
      }
      setModalOpen(false);
      await load(false, lang);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (o: Row) => {
    try {
      const next = !publishedOf(o);
      await api.site.portfolio.update(idOf(o), {
        is_published: next,
        published_at: next ? str(o.published_at) || new Date().toISOString() : null,
      });
      await load(false, lang);
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Nashr holati o‘zgarmadi.');
    }
  };

  const confirmDelete = (o: Row) => {
    Alert.alert(
      'O‘chirish',
      `${clientNameOf(o) || 'Loyiha'} o‘chirilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O‘chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.site.portfolio.remove(idOf(o));
              await load(false, lang);
            } catch (e) {
              Alert.alert('Xatolik', e instanceof Error ? e.message : 'O‘chirishda xatolik.');
            }
          },
        },
      ],
    );
  };

  const langs: Lang[] = useMemo(() => ['uz', 'ru'], []);

  const langsLabel: Record<Lang, string> = { uz: 'UZ', ru: 'RU' };

  const setF = (k: keyof typeof emptyForm) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <Loader />;

  const renderItem = ({ item }: { item: Row }) => (
    <Card>
      <View style={s.row}>
        <Text style={s.name}>{clientNameOf(item) || '—'}</Text>
        <Text style={[s.badge, { color: publishedOf(item) ? colors.green : colors.faint }]}>
          {publishedOf(item) ? 'Nashr qilingan' : 'Qoralama'}
        </Text>
      </View>
      <Text style={s.meta}>{businessTypeOf(item) || '—'}</Text>
      <View style={s.actions}>
        <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
          <Text style={s.editText}>Tahrirlash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.editBtn} onPress={() => togglePublish(item)}>
          <Text style={s.editText}>{publishedOf(item) ? 'Yashirish' : 'Nashr qilish'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(item)}>
          <Text style={s.delText}>O‘chirish</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <H1>Portfolio</H1>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addText}>+ Qo‘shish</Text>
        </TouchableOpacity>
      </View>
      <View style={s.langRow}>
        {langs.map((l) => (
          <TouchableOpacity
            key={l}
            style={[s.langBtn, lang === l && s.langActive]}
            onPress={() => switchLang(l)}
          >
            <Text style={[s.langText, lang === l && s.langTextActive]}>{langsLabel[l]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item, i) => str(item.id) || String(i)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true, lang)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={<Empty text="Loyihalar topilmadi." />}
      />
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>{editing ? 'Loyihani tahrirlash' : 'Yangi loyiha'}</Text>
              <Field label="Mijoz nomi" value={form.clientName} onChange={setF('clientName')} placeholder="Mijoz nomi" />
              <Field label="Biznes turi" value={form.business_type} onChange={setF('business_type')} placeholder="Masalan: restoran" />
              <Field label="Manzil" value={form.location} onChange={setF('location')} placeholder="Manzil" />
              <Field label="Tagline" value={form.tagline} onChange={setF('tagline')} placeholder="Qisqa shior" />
              <Field label="Hikoya" value={form.story} onChange={setF('story')} placeholder="Loyiha hikoyasi" multiline />
              <Field label="Foto URL" value={form.realPhotoUrl} onChange={setF('realPhotoUrl')} placeholder="https://..." />
              <Field label="Foto izohi" value={form.realPhotoCaption} onChange={setF('realPhotoCaption')} placeholder="Foto izohi" />
              <View style={s.pubRow}>
                <Text style={s.label}>Nashr qilingan</Text>
                <TouchableOpacity
                  style={[s.langBtn, form.is_published && s.langActive]}
                  onPress={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                >
                  <Text style={[s.langText, form.is_published && s.langTextActive]}>
                    {form.is_published ? 'Ha' : 'Yo‘q'}
                  </Text>
                </TouchableOpacity>
              </View>
              {formError ? <Text style={s.error}>{formError}</Text> : null}
              <Btn title={editing ? 'Saqlash' : 'Qo‘shish'} onPress={submit} busy={saving} />
              <Btn title="Bekor qilish" onPress={() => setModalOpen(false)} ghost />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 12,
  },
  addText: { color: '#000', fontWeight: '800', fontSize: 14 },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  langBtn: {
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  langActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  langText: { color: colors.muted, fontWeight: '800', fontSize: 14 },
  langTextActive: { color: '#000' },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  badge: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  editBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  delBtn: {
    flex: 1,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  delText: { color: colors.red, fontWeight: '700', fontSize: 13 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '92%',
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  pubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
