import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from './theme-context';
import { Palette } from './theme';
import { elevation, radius, spacing, typography } from './design';

/** Status pill — har joyda ishlatiladigan rang bilan nishonli badge. */
export const Pill: React.FC<{
  label: string;
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'muted';
  solid?: boolean;
  style?: ViewStyle;
}> = ({ label, tone = 'gold', solid, style }) => {
  const { colors } = useAppTheme();
  const map: Record<string, string> = {
    gold: colors.gold,
    green: colors.green,
    red: colors.red,
    blue: colors.blue,
    muted: colors.muted,
  };
  const c = map[tone];
  return (
    <View
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: c + (solid ? '' : '55'),
          backgroundColor: solid ? c : c + '1F',
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: solid ? '#000' : c, ...typography.tiny }}>{label}</Text>
    </View>
  );
};

/** KPI katak — raqam + yorliq + ixtiyoriy belgi. Dashboard'larda ishlatiladi. */
export const StatCard: React.FC<{
  value: string | number;
  label: string;
  tone?: 'gold' | 'green' | 'red' | 'blue' | 'neutral';
  icon?: string;
  compact?: boolean;
  style?: ViewStyle;
}> = ({ value, label, tone = 'neutral', icon, compact, style }) => {
  const { colors } = useAppTheme();
  const map: Record<string, string> = {
    gold: colors.gold,
    green: colors.green,
    red: colors.red,
    blue: colors.blue,
    neutral: colors.text,
  };
  const c = map[tone];
  const accent = tone === 'neutral' ? colors.cardBorder : c;
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: accent + (tone === 'neutral' ? '' : '55'),
          borderRadius: radius.lg,
          padding: compact ? spacing.md : spacing.lg,
          ...elevation.sm,
        },
        style,
      ]}
    >
      {icon ? <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text> : null}
      <Text style={{ color: c, fontSize: compact ? 18 : 22, fontWeight: '900' }}>{String(value)}</Text>
      <Text style={{ color: colors.muted, ...typography.tiny, marginTop: 4 }}>{label}</Text>
    </View>
  );
};

/** Yangi avlod Btn — variantlar + icon + loading holati. */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: BtnVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, variant = 'primary', icon, disabled, loading, full, style }) => {
  const { colors } = useAppTheme();
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: full ? 'stretch' : 'auto',
    opacity: disabled || loading ? 0.5 : 1,
  };
  let bg = colors.gold, fg: string = '#000', border = colors.gold;
  if (variant === 'secondary') { bg = 'transparent'; fg = colors.gold; border = colors.gold; }
  if (variant === 'ghost') { bg = 'transparent'; fg = colors.text; border = colors.cardBorder; }
  if (variant === 'danger') { bg = 'transparent'; fg = colors.red; border = colors.red + '77'; }
  const style1: ViewStyle = {
    ...base,
    backgroundColor: bg,
    borderColor: border,
    ...(variant === 'primary' ? elevation.sm : {}),
  };
  return (
    <TouchableOpacity activeOpacity={0.85} disabled={disabled || loading} onPress={onPress} style={[style1, style]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Text style={{ fontSize: 16 }}>{icon}</Text> : null}
          <Text style={{ color: fg, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 }}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

/** Bo'lim sarlavhasi — bir xil typography. */
export const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm }}>
      <Text style={{ color: colors.text, ...typography.h3 }}>{children}</Text>
      {action}
    </View>
  );
};

/** Elevated Card variant — soya bilan. */
export const ElevatedCard: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: radius.lg,
          padding: spacing.lg,
          ...elevation.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/** Faol holatni bildiradigan rang indikator. */
export const Dot: React.FC<{ tone?: 'green' | 'red' | 'gold' | 'muted' }> = ({ tone = 'green' }) => {
  const { colors } = useAppTheme();
  const map: Record<string, string> = {
    green: colors.green,
    red: colors.red,
    gold: colors.gold,
    muted: colors.muted,
  };
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: map[tone] }} />;
};
