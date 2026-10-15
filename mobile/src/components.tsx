import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors } from './theme';

export const Screen: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <View style={s.screen}>{children}</View>;

export const Card: React.FC<{ children: React.ReactNode; style?: object }> = ({
  children,
  style,
}) => <View style={[s.card, style]}>{children}</View>;

export const H1: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={s.h1}>{children}</Text>
);

export const Muted: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={s.muted}>{children}</Text>;

export const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  secure?: boolean;
  multiline?: boolean;
}> = ({ label, value, onChange, placeholder, keyboard, secure, multiline }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      keyboardType={keyboard}
      secureTextEntry={secure}
      multiline={multiline}
      style={[s.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
    />
  </View>
);

export const Btn: React.FC<{
  title: string;
  onPress: () => void;
  busy?: boolean;
  danger?: boolean;
  ghost?: boolean;
}> = ({ title, onPress, busy, danger, ghost }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={busy}
    style={[
      s.btn,
      danger && s.btnDanger,
      ghost && s.btnGhost,
      busy && { opacity: 0.6 },
    ]}
  >
    {busy ? (
      <ActivityIndicator color={danger || ghost ? colors.gold : '#000'} />
    ) : (
      <Text
        style={[
          s.btnText,
          (danger || ghost) && { color: colors.gold },
        ]}
      >
        {title}
      </Text>
    )}
  </TouchableOpacity>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <View style={s.empty}>
    <Text style={s.muted}>{text}</Text>
  </View>
);

export const Loader: React.FC = () => (
  <View style={s.center}>
    <ActivityIndicator size="large" color={colors.gold} />
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  h1: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 13 },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.input,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDanger: { backgroundColor: 'transparent', borderColor: colors.red, borderWidth: 1 },
  btnGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  empty: { padding: 30, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
