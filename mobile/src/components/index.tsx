import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

export const Screen: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <SafeAreaView style={[s.screen, style]}>{children}</SafeAreaView>
);

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const H1: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[s.h1, style]}>{children}</Text>
);

export const Muted: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[s.muted, style]}>{children}</Text>
);

export const Loader: React.FC = () => (
  <View style={s.loader}>
    <ActivityIndicator size="large" color={colors.gold} />
  </View>
);

export const Empty: React.FC<{ text?: string }> = ({ text = 'Ma’lumot yo’q' }) => (
  <View style={s.empty}>
    <Muted>{text}</Muted>
  </View>
);

export const Btn: React.FC<{
  title: string;
  onPress?: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, busy, disabled, style }) => (
  <TouchableOpacity
    style={[s.btn, disabled && s.btnDisabled, style]}
    onPress={onPress}
    disabled={disabled || busy}
  >
    {busy ? (
      <ActivityIndicator color="#000" />
    ) : (
      <Text style={s.btnText}>{title}</Text>
    )}
  </TouchableOpacity>
);

export const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
}> = ({ label, value, onChange, placeholder, secure }) => (
  <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      secureTextEntry={secure}
      autoCapitalize="none"
    />
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  h1: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  muted: { color: colors.muted, fontSize: 13 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.input,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontSize: 15,
  },
});


