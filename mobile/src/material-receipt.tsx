import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from './api';
import { Btn } from './components';
import { OptionsModal } from './components/dialogs';
import { Palette, fmtMoney } from './theme';
import { useAppTheme } from './theme-context';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string =>
  r[k] === null || r[k] === undefined ? '' : String(r[k]);
const num = (r: Rec, k: string): number => {
  const v = Number(r[k]);
  return Number.isNaN(v) ? 0 : v;
};
const idOf = (r: Rec): string | number =>
  (r.id as string | number) ?? (r.pk as string | number) ?? '';

export const UNITS = ['dona', 'kg', 'gr', 'litr', 'm', 'pachka', 'blok'];
export const UNIT_LABELS: Record<string, string> = {
  dona: 'dona (Dona)',
  kg: 'kg (Kilogramm)',
  gr: 'gr (Gramm)',
  litr: 'litr (Litr)',
  m: 'm (Metr)',
  pachka: 'pachka (Pachka)',
  blok: 'blok (Blok)',
};
export const PAYMENTS = [
  { value: 'Bank hisob raqami (Perechisleniye)', label: 'Bank hisob raqami (Perechisleniye)' },
  { value: 'Naqd pul', label: 'Naqd pul' },
  { value: 'Korporativ karta (Uzcard/Humo)', label: 'Korporativ karta (Uzcard/Humo)' },
  { value: 'Nasiya (Muddatli to‘lov)', label: 'Nasiya (Muddatli to‘lov)' },
  { value: 'Boshqa to‘lov', label: 'Boshqa to‘lov usuli' },
];

const fmtQty = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

const tashkent = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour'), mi: g('minute') };
};
export const nowTashkent = () => {
  const { y, m, d, h, mi } = tashkent();
  return `${y}-${m}-${d} ${h}:${mi}`;
};
const displayTashkent = () => {
  const { d, m, y, h, mi } = tashkent();
  return `${d}.${m}.${y} ${h}:${mi}`;
};
const todayIso = () => {
  const { y, m, d } = tashkent();
  return `${y}-${m}-${d}`;
};
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '—';
  const parts = dateStr.replace('T', ' ').split(' ');
  const [y, m, d] = parts[0].split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y} ${(parts[1] || '09:00').slice(0, 5)}`;
};

const computeStatus = (qty: number, min: number): string =>
  qty <= min ? 'kritik' : qty <= min * 1.5 ? 'ogohlantirish' : 'yetarli';

export type MaterialForm = {
  name: string;
  unit: string;
  quantity: string;
  minThreshold: string;
  unitCost: string;
  counterparty: string;
  paymentMethod: string;
};

export const EMPTY_MATERIAL_FORM: MaterialForm = {
  name: '',
  unit: 'dona',
  quantity: '100',
  minThreshold: '30',
  unitCost: '25000',
  counterparty: 'Buxoro EuroTex Fabrikasi MCHJ',
  paymentMethod: 'Bank hisob raqami (Perechisleniye)',
};

/**
 * Xom-ashyo kirim oynasi — web'dagi MaterialReceiptModal bilan bir xil.
 * "Kirim Materiallari" va "Omborxona" sahifalarida bir xil ishlatiladi.
 */
export const MaterialReceiptModal: React.FC<{
  visible: boolean;
  editing?: Rec | null;
  materials?: Rec[];
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}> = ({ visible, editing = null, materials = [], onClose, onSaved }) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [form, setForm] = useState<MaterialForm>(EMPTY_MATERIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickTarget, setPickTarget] = useState<'unit' | 'payment' | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Modal ochilganda formani to‘ldirish
  if (visible && !loaded) {
    setLoaded(true);
    if (editing) {
      setForm({
        name: str(editing, 'name'),
        unit: str(editing, 'unit') || 'dona',
        quantity: str(editing, 'quantity'),
        minThreshold: str(editing, 'min_threshold'),
        unitCost: str(editing, 'unit_cost'),
        counterparty: str(editing, 'counterparty') || str(editing, 'supplier'),
        paymentMethod:
          str(editing, 'payment_method') || 'Bank hisob raqami (Perechisleniye)',
      });
    } else {
      setForm(EMPTY_MATERIAL_FORM);
    }
    setFormError('');
  }
  if (!visible && loaded) setLoaded(false);

  const qty = Number(form.quantity) || 0;
  const cost = Number(form.unitCost) || 0;
  const minT = Number(form.minThreshold) || 0;

  const nameSuggestions = useMemo(() => {
    const q = form.name.trim().toLowerCase();
    if (!q) return [];
    return materials
      .filter(
        (m) =>
          str(m, 'name').toLowerCase().includes(q) &&
          str(m, 'name').toLowerCase() !== q,
      )
      .slice(0, 5);
  }, [materials, form.name]);

  const applySuggestion = (m: Rec) => {
    setForm((f) => ({
      ...f,
      name: str(m, 'name'),
      unit: str(m, 'unit') || f.unit,
      unitCost: str(m, 'unit_cost') || f.unitCost,
      counterparty: str(m, 'counterparty') || str(m, 'supplier') || f.counterparty,
      minThreshold: str(m, 'min_threshold') || f.minThreshold,
    }));
  };

  const close = () => {
    setPickTarget(null);
    setFormError('');
    onClose();
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError('Mahsulot / Material nomini kiriting.');
      return;
    }
    if (Number.isNaN(Number(form.quantity)) || qty < 0) {
      setFormError('Kirim miqdorini to‘g‘ri kiriting.');
      return;
    }
    if (Number.isNaN(Number(form.unitCost)) || cost < 0) {
      setFormError('Birlik narxini to‘g‘ri kiriting.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const stamp = nowTashkent();
      const status = computeStatus(qty, minT);

      if (editing) {
        await api.materials.update(idOf(editing), {
          name: form.name.trim(),
          unit: form.unit,
          quantity: qty,
          min_threshold: minT,
          unit_cost: cost,
          counterparty: form.counterparty.trim(),
          payment_method: form.paymentMethod,
          supplier: form.counterparty.trim() || str(editing, 'supplier'),
          batch_number: str(editing, 'batch_number'),
          category: str(editing, 'category'),
          storage_location: str(editing, 'storage_location'),
          last_restocked: str(editing, 'last_restocked') || stamp,
          status,
        });
      } else {
        const existing = materials.find(
          (m) =>
            str(m, 'name').trim().toLowerCase() ===
            form.name.trim().toLowerCase(),
        );
        if (existing) {
          const newQty = num(existing, 'quantity') + qty;
          await api.materials.update(idOf(existing), {
            quantity: newQty,
            unit_cost: cost || num(existing, 'unit_cost'),
            unit: form.unit || str(existing, 'unit'),
            counterparty:
              form.counterparty.trim() || str(existing, 'counterparty'),
            payment_method: form.paymentMethod || str(existing, 'payment_method'),
            last_restocked: stamp,
            status: computeStatus(newQty, num(existing, 'min_threshold')),
          });
        } else {
          await api.materials.create({
            name: form.name.trim(),
            batch_number: `MAT-${Date.now().toString().slice(-6)}`,
            category: 'Xom-ashyo',
            unit: form.unit,
            quantity: qty,
            min_threshold: minT,
            unit_cost: cost,
            supplier: form.counterparty.trim() || 'Omborxona',
            counterparty: form.counterparty.trim(),
            payment_method: form.paymentMethod,
            last_restocked: stamp,
            storage_location: 'Asosiy ombor',
            status,
          });
        }

        // Har bir kirim moliyada xarid (chiqim) bo'lib qayd etiladi
        if (qty * cost > 0) {
          try {
            await api.transactions.create({
              type: 'chiqim',
              category: 'Material xaridi',
              amount: Math.round(qty * cost),
              payment_method: form.paymentMethod.toLowerCase().includes('naqd')
                ? 'naqd'
                : 'bank_transfer',
              date: todayIso(),
              description: `Material xaridi: ${form.name.trim()} — ${qty} ${form.unit} × ${Math.round(
                cost,
              )} so'm`,
              related_client: form.counterparty.trim() || null,
            });
          } catch {
            /* moliyaviy yozuv yarata olmasa ham kirim saqlanadi */
          }
        }
      }

      close();
      await onSaved?.();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <View style={s.modalIcon}>
              <Text style={{ fontSize: 20 }}>🧪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>
                {editing
                  ? 'Xom-ashyo Ma’lumotlarini Tahrirlash'
                  : 'Yangi Xom-ashyo Material Kirimi'}
              </Text>
              <Text style={s.modalSub}>
                Nomi, o‘lchov birligi, miqdori va narxini kiriting
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={close}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.label}>
              Mahsulot / Material Nomi <Text style={s.req}>*</Text>
            </Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="Masalan: Spunlace no-to‘qima paxta matosi yoki Oq qalin karton"
              placeholderTextColor={colors.faint}
              style={s.input}
            />
            {nameSuggestions.length > 0 ? (
              <View style={s.suggestBox}>
                {nameSuggestions.map((m) => (
                  <TouchableOpacity
                    key={String(idOf(m))}
                    style={s.suggestItem}
                    onPress={() => applySuggestion(m)}
                  >
                    <Text style={s.suggestText}>{str(m, 'name')}</Text>
                    <Text style={s.suggestHint}>
                      Mavjud ombor zaxirasi: {fmtQty(num(m, 'quantity'))}{' '}
                      {str(m, 'unit')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={s.label}>
              Kontragent / Mijoz <Text style={s.req}>*</Text>
            </Text>
            <TextInput
              value={form.counterparty}
              onChangeText={(v) => setForm({ ...form, counterparty: v })}
              placeholder="Masalan: Buxoro EuroTex Fabrikasi MCHJ"
              placeholderTextColor={colors.faint}
              style={s.input}
            />

            <Text style={s.label}>
              To‘lov Usuli <Text style={s.req}>*</Text>
            </Text>
            <TouchableOpacity style={s.input} onPress={() => setPickTarget('payment')}>
              <Text style={s.inputText}>
                {PAYMENTS.find((p) => p.value === form.paymentMethod)?.label ??
                  form.paymentMethod}
              </Text>
            </TouchableOpacity>

            <View style={s.amberBox}>
              <Text style={s.label}>
                O‘lchov Birligi <Text style={s.req}>*</Text>
              </Text>
              <TouchableOpacity style={s.input} onPress={() => setPickTarget('unit')}>
                <Text style={s.inputText}>{UNIT_LABELS[form.unit] ?? form.unit}</Text>
              </TouchableOpacity>

              <Text style={s.label}>
                Kirim Miqdori <Text style={s.req}>*</Text>
              </Text>
              <View style={s.qtyWrap}>
                <TextInput
                  value={form.quantity}
                  onChangeText={(v) => setForm({ ...form, quantity: v })}
                  placeholder="0"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                />
                <View style={s.unitSuffix}>
                  <Text style={s.unitSuffixText}>{form.unit}</Text>
                </View>
              </View>
            </View>

            <Text style={s.label}>
              1 Birlik Narxi (so‘m) <Text style={s.req}>*</Text>
            </Text>
            <TextInput
              value={form.unitCost}
              onChangeText={(v) => setForm({ ...form, unitCost: v })}
              placeholder="0"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              style={s.input}
            />
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Jami summa:</Text>
              <Text style={s.totalValue}>{fmtMoney(qty * cost)}</Text>
            </View>

            <Text style={s.label}>Minimal Xavfsiz Zaxira</Text>
            <TextInput
              value={form.minThreshold}
              onChangeText={(v) => setForm({ ...form, minThreshold: v })}
              placeholder="0"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              style={s.input}
            />
            <Text style={s.hint}>
              Zaxira shundan kamayganda ogohlantirish beriladi
            </Text>

            <View style={s.timeBox}>
              <Text style={s.timeTitle}>
                Kirim Sana va Vaqti (O‘zbekiston vaqti bilan avtomatik)
              </Text>
              <View style={s.rowCenter}>
                <Text style={s.timeValue}>
                  {editing
                    ? formatDateTime(str(editing, 'last_restocked'))
                    : displayTashkent()}
                </Text>
                <Text style={s.autoBadge}>✓ Avtomatik (Toshkent vaqti)</Text>
              </View>
            </View>

            {formError ? <Text style={s.error}>{formError}</Text> : null}

            <View style={s.modalActions}>
              <Btn title="Bekor qilish" onPress={close} ghost style={{ flex: 1 }} />
              <Btn
                title={editing ? 'O‘zgarishlarni Saqlash' : 'Kirimni Saqlash'}
                onPress={save}
                busy={saving}
                style={{ flex: 1.4 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      <OptionsModal
        visible={pickTarget === 'unit'}
        title="O‘lchov Birligi"
        value={form.unit}
        options={UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
        colors={colors}
        onClose={() => setPickTarget(null)}
        onPick={(v) => setForm((f) => ({ ...f, unit: v }))}
      />
      <OptionsModal
        visible={pickTarget === 'payment'}
        title="To‘lov Usuli"
        value={form.paymentMethod}
        options={PAYMENTS}
        colors={colors}
        onClose={() => setPickTarget(null)}
        onPick={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
      />
    </Modal>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
      alignItems: 'center',
      gap: 10,
      paddingBottom: 12,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    modalIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gold + '22',
      borderWidth: 1,
      borderColor: c.gold + '4D',
    },
    modalTitle: { color: c.text, fontSize: 16, fontWeight: '900' },
    modalSub: { color: c.muted, fontSize: 11, marginTop: 2 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    closeText: { color: c.text, fontSize: 14, fontWeight: '800' },
    label: {
      color: c.muted,
      fontSize: 11,
      marginBottom: 6,
      marginTop: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    req: { color: c.red, fontWeight: '900' },
    input: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      marginBottom: 4,
    },
    inputText: { color: c.text, fontSize: 14, fontWeight: '700' },
    suggestBox: {
      backgroundColor: c.bg,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 6,
      overflow: 'hidden',
    },
    suggestItem: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    suggestText: { color: c.text, fontSize: 13, fontWeight: '700' },
    suggestHint: { color: c.muted, fontSize: 11, marginTop: 2 },
    amberBox: {
      backgroundColor: c.gold + '12',
      borderColor: c.gold + '40',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: 6,
    },
    qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unitSuffix: {
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: c.gold + '26',
      borderWidth: 1,
      borderColor: c.gold + '59',
    },
    unitSuffixText: { color: c.gold, fontSize: 12, fontWeight: '900' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    totalLabel: { color: c.muted, fontSize: 12, fontWeight: '700' },
    totalValue: { color: c.gold, fontSize: 15, fontWeight: '900' },
    hint: { color: c.muted, fontSize: 11, marginTop: 4 },
    timeBox: {
      backgroundColor: c.input,
      borderColor: c.gold + '59',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: 14,
    },
    timeTitle: {
      color: c.gold,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    timeValue: { color: c.text, fontSize: 14, fontWeight: '900' },
    autoBadge: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: c.green + '1F',
      borderWidth: 1,
      borderColor: c.green + '59',
      color: c.green,
      fontSize: 10,
      fontWeight: '900',
      overflow: 'hidden',
    },
    rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    error: { color: c.red, fontSize: 13, marginBottom: 8 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
    mono: {
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
  });
