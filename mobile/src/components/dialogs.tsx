import React, { useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Palette } from '../theme';

export const makeOptionStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 24,
    },
    box: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
    },
    title: { color: c.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      marginBottom: 6,
    },
    optionActive: { borderColor: c.gold + '66', backgroundColor: c.gold + '1A' },
    optionText: { color: c.text, fontSize: 14, fontWeight: '600', flex: 1 },
    optionTextActive: { color: c.gold },
    check: { color: c.gold, fontSize: 15, fontWeight: '800' },
    message: { color: c.muted, fontSize: 14, lineHeight: 20, marginBottom: 16 },
    btnRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    btn: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 11,
      borderWidth: 1,
      minWidth: 110,
      alignItems: 'center',
    },
    btnText: { fontWeight: '800', fontSize: 13 },
    btnPrimary: { backgroundColor: c.gold, borderColor: c.gold },
    btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 13 },
    btnGhost: { backgroundColor: 'transparent', borderColor: c.cardBorder },
    btnGhostText: { color: c.text, fontWeight: '800', fontSize: 13 },
    btnDanger: { backgroundColor: c.red, borderColor: c.red },
    btnDangerText: { color: '#000', fontWeight: '900', fontSize: 13 },
  });

// ---------- Tanlash oynasi (select muqabili) ----------
export const OptionsModal: React.FC<{
  visible: boolean;
  title: string;
  value: string;
  options: { value: string; label: string }[];
  colors: Palette;
  onClose: () => void;
  onPick: (v: string) => void;
}> = ({ visible, title, value, options, colors, onClose, onPick }) => {
  const s = useMemo(() => makeOptionStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.box} activeOpacity={1} onPress={() => {}}>
          <Text style={s.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 340 }}>
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[s.option, value === o.value && s.optionActive]}
                onPress={() => {
                  onPick(o.value);
                  onClose();
                }}
              >
                <Text style={[s.optionText, value === o.value && s.optionTextActive]}>
                  {o.label}
                </Text>
                {value === o.value ? <Text style={s.check}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ---------- Xabar / tasdiqlash oynasi (web'da ham, telefonda ham ishlaydi) ----------
export const DialogModal: React.FC<{
  data: {
    title: string;
    message: string;
    confirm?: { label: string; run: () => void };
  } | null;
  colors: Palette;
  onClose: () => void;
}> = ({ data, colors, onClose }) => {
  const s = useMemo(() => makeOptionStyles(colors), [colors]);
  return (
    <Modal visible={!!data} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.box} activeOpacity={1} onPress={() => {}}>
          <Text style={s.title}>{data?.title ?? ''}</Text>
          <Text style={s.message}>{data?.message ?? ''}</Text>
          <View style={s.btnRow}>
            {data?.confirm ? (
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
                <Text style={s.btnGhostText}>Bekor qilish</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[s.btn, data?.confirm ? s.btnDanger : s.btnPrimary]}
              onPress={() => {
                const run = data?.confirm?.run;
                if (run) void run();
                else onClose();
              }}
            >
              <Text style={[s.btnText, data?.confirm ? s.btnDangerText : s.btnPrimaryText]}>
                {data?.confirm?.label ?? 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
