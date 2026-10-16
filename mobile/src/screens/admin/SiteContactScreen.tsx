import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { Btn, Field, H1, Loader } from '../../components';
import { colors } from '../../theme';

const FIELDS: Array<{ key: string; label: string; keyboard?: 'default' | 'numeric' | 'phone-pad' | 'email-address'; multiline?: boolean }> = [
  { key: 'phone1', label: 'Telefon 1', keyboard: 'phone-pad' },
  { key: 'phone2', label: 'Telefon 2', keyboard: 'phone-pad' },
  { key: 'phone3', label: 'Telefon 3', keyboard: 'phone-pad' },
  { key: 'email', label: 'Email', keyboard: 'email-address' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'address', label: 'Manzil (UZ)', multiline: true },
  { key: 'address_ru', label: 'Manzil (RU)', multiline: true },
  { key: 'working_hours', label: 'Ish vaqti (UZ)', multiline: true },
  { key: 'working_hours_ru', label: 'Ish vaqti (RU)', multiline: true },
];

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const emptyState = (): Record<string, string> => ({
  phone1: '',
  phone2: '',
  phone3: '',
  email: '',
  telegram: '',
  instagram: '',
  address: '',
  address_ru: '',
  working_hours: '',
  working_hours_ru: '',
});

export const SiteContactScreen: React.FC = () => {
  const [form, setForm] = useState<Record<string, string>>(emptyState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.site.contactInfo.get();
      setForm((prev) => {
        const next = { ...prev };
        for (const f of FIELDS) next[f.key] = str(data[f.key]);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ma’lumot yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.site.contactInfo.save(form);
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
      <H1>Kontakt ma’lumotlar</H1>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            value={form[f.key]}
            onChange={(v) => {
              setForm((prev) => ({ ...prev, [f.key]: v }));
              setNotice('');
            }}
            keyboard={f.keyboard}
            multiline={f.multiline}
          />
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
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  notice: { color: colors.green, fontSize: 13, marginBottom: 8 },
});
