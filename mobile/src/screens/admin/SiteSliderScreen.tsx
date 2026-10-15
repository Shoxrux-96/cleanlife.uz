import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../api';
import { Btn, Card, Field, H1, Loader } from '../../components';
import { colors } from '../../theme';

type Lang = 'uz' | 'ru';

type PairKey = 'wetwipe' | 'apron' | 'toothpick' | 'polo';

const PAIR_KEYS: PairKey[] = ['wetwipe', 'apron', 'toothpick', 'polo'];

const PAIR_LABEL: Record<PairKey, string> = {
  wetwipe: 'Salfetka',
  apron: 'Fartuk',
  toothpick: 'Tish kavlagichi',
  polo: 'Polo',
};

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

type PairForm = { label: string; before: string; after: string; beforeCaption: string; afterCaption: string };

const emptyPair = (): PairForm => ({ label: '', before: '', after: '', beforeCaption: '', afterCaption: '' });

type SliderForm = {
  badge: string;
  title: string;
  description: string;
  bottomNote: string;
  pairs: Record<PairKey, PairForm>;
};

const emptyForm = (): SliderForm => ({
  badge: '',
  title: '',
  description: '',
  bottomNote: '',
  pairs: { wetwipe: emptyPair(), apron: emptyPair(), toothpick: emptyPair(), polo: emptyPair() },
});

const toPairForm = (v: unknown): PairForm => {
  const o = (v as Record<string, unknown>) ?? {};
  return {
    label: str(o.label),
    before: str(o.before),
    after: str(o.after),
    beforeCaption: str(o.beforeCaption),
    afterCaption: str(o.afterCaption),
  };
};

export const SiteSliderScreen: React.FC = () => {
  const [lang, setLang] = useState<Lang>('uz');
  const [form, setForm] = useState<SliderForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (l: Lang) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.site.slider.get(l);
      const raw: Record<string, unknown> =
        (res.data as Record<string, unknown>) ?? res;
      const pairsRaw = (raw.pairs as Record<string, unknown>) ?? {};
      setForm({
        badge: str(raw.badge),
        title: str(raw.title),
        description: str(raw.description),
        bottomNote: str(raw.bottomNote),
        pairs: {
          wetwipe: toPairForm(pairsRaw.wetwipe),
          apron: toPairForm(pairsRaw.apron),
          toothpick: toPairForm(pairsRaw.toothpick),
          polo: toPairForm(pairsRaw.polo),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Slayder yuklanmadi.');
      setForm(emptyForm());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(lang);
  }, [lang, load]);

  const setTop = (k: 'badge' | 'title' | 'description' | 'bottomNote') => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setNotice('');
  };

  const setPair = (pair: PairKey, k: keyof PairForm) => (v: string) => {
    setForm((f) => ({ ...f, pairs: { ...f.pairs, [pair]: { ...f.pairs[pair], [k]: v } } }));
    setNotice('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.site.slider.save(lang, {
        badge: form.badge,
        title: form.title,
        description: form.description,
        bottomNote: form.bottomNote,
        pairs: form.pairs,
      });
      setNotice('Saqlandi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <View style={s.wrap}>
      <H1>Slayder</H1>
      <View style={s.langRow}>
        {(['uz', 'ru'] as Lang[]).map((l) => (
          <TouchableOpacity
            key={l}
            style={[s.langBtn, lang === l && s.langActive]}
            onPress={() => setLang(l)}
          >
            <Text style={[s.langText, lang === l && s.langTextActive]}>
              {l === 'uz' ? 'UZ' : 'RU'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Field label="Badge" value={form.badge} onChange={setTop('badge')} placeholder="Badge" />
        <Field label="Sarlavha" value={form.title} onChange={setTop('title')} placeholder="Sarlavha" multiline />
        <Field label="Tavsif" value={form.description} onChange={setTop('description')} placeholder="Tavsif" multiline />
        <Field label="Pastki izoh" value={form.bottomNote} onChange={setTop('bottomNote')} placeholder="Pastki izoh" multiline />
        {PAIR_KEYS.map((p) => (
          <Card key={p}>
            <Text style={s.pairTitle}>{PAIR_LABEL[p]}</Text>
            <Field label="Label" value={form.pairs[p].label} onChange={setPair(p, 'label')} placeholder="Label" />
            <Field label="Before (URL)" value={form.pairs[p].before} onChange={setPair(p, 'before')} placeholder="https://..." />
            <Field label="After (URL)" value={form.pairs[p].after} onChange={setPair(p, 'after')} placeholder="https://..." />
            <Field label="Before izohi" value={form.pairs[p].beforeCaption} onChange={setPair(p, 'beforeCaption')} placeholder="Before izohi" />
            <Field label="After izohi" value={form.pairs[p].afterCaption} onChange={setPair(p, 'afterCaption')} placeholder="After izohi" />
          </Card>
        ))}
        {error ? <Text style={s.error}>{error}</Text> : null}
        {notice ? <Text style={s.notice}>{notice}</Text> : null}
        <Btn title="Saqlash" onPress={save} busy={saving} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 16 },
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
  pairTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  notice: { color: colors.green, fontSize: 13, marginBottom: 8 },
});
