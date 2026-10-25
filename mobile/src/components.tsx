import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from './theme-context';
import { Palette } from './theme';

type Children = { children: React.ReactNode };

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg, padding: 16 },
    card: {
      backgroundColor: c.card,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    h1: { color: c.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
    muted: { color: c.muted, fontSize: 13 },
    label: {
      color: c.muted,
      fontSize: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    input: {
      backgroundColor: c.input,
      borderColor: c.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    btn: {
      backgroundColor: c.gold,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 4,
    },
    btnDanger: {
      backgroundColor: 'transparent',
      borderColor: c.red,
      borderWidth: 1,
    },
    btnGhost: {
      backgroundColor: 'transparent',
      borderColor: c.cardBorder,
      borderWidth: 1,
    },
    btnText: { color: '#000', fontWeight: '800', fontSize: 15 },
    empty: { padding: 30, alignItems: 'center' },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg,
    },
  });

const useS = () => {
  const { colors } = useAppTheme();
  return useMemo(() => makeStyles(colors), [colors]);
};

export const Screen: React.FC<Children & { style?: ViewStyle }> = ({
  children,
  style,
}) => {
  const s = useS();
  return <SafeAreaView style={[s.screen, style]}>{children}</SafeAreaView>;
};

export const Card: React.FC<Children & { style?: ViewStyle }> = ({
  children,
  style,
}) => {
  const s = useS();
  return <View style={[s.card, style]}>{children}</View>;
};

export const H1: React.FC<Children> = ({ children }) => {
  const s = useS();
  return <Text style={s.h1}>{children}</Text>;
};

export const Muted: React.FC<Children & { style?: TextStyle }> = ({
  children,
  style,
}) => {
  const s = useS();
  return <Text style={[s.muted, style]}>{children}</Text>;
};

export const Empty: React.FC<{ text?: string }> = ({ text = 'Maʼlumot yoʻq' }) => {
  const s = useS();
  return (
    <View style={s.empty}>
      <Text style={s.muted}>{text}</Text>
    </View>
  );
};

export const Loader: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useS();
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
};

export const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  secure?: boolean;
  multiline?: boolean;
}> = ({ label, value, onChange, placeholder, keyboard, secure, multiline }) => {
  const { colors } = useAppTheme();
  const s = useS();
  return (
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
        autoCapitalize="none"
        autoCorrect={false}
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
};

export const Btn: React.FC<{
  title: string;
  onPress: () => void;
  busy?: boolean;
  danger?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, busy, danger, ghost, disabled, style }) => {
  const { colors } = useAppTheme();
  const s = useS();
  const accent = danger ? colors.red : ghost ? colors.gold : '#000';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy || disabled}
      style={[
        s.btn,
        danger && s.btnDanger,
        ghost && s.btnGhost,
        (busy || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={accent} />
      ) : (
        <Text style={[s.btnText, (danger || ghost) && { color: accent }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
