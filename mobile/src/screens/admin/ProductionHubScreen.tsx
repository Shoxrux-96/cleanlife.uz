import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Muted, Screen } from '../../components';
import { elevation, radius, spacing } from '../../design';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Item = { route: string; title: string; sub: string; icon: string; tint: string };

const MENU: Item[] = [
  { route: 'MaterialIntake', title: 'Materiallar',       sub: 'Xom-ashyo kirimi',    icon: '📥', tint: '#8B5CF6' },
  { route: 'ReadyProducts',  title: 'Tayyor Mahsulotlar',sub: 'Katalog va tannarx',  icon: '🏷️', tint: '#A855F7' },
  { route: 'Warehouse',      title: 'Omborxona',         sub: 'Qoldiq monitoringi',  icon: '🏬', tint: '#34D399' },
  { route: 'Calculator',     title: 'Kalkulyator',       sub: 'Tannarx hisobi',      icon: '🧮', tint: '#22D3EE' },
];

export const ProductionHubScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  return (
    <Screen>
      <View style={s.heroCard}>
        <Text style={s.heroTitle}>Ishlab chiqarish</Text>
        <Muted style={{ marginTop: 4 }}>
          Materiallar, tayyor mahsulotlar, ombor va tannarx hisobi.
        </Muted>
      </View>
      <View style={s.grid}>
        {MENU.map((m) => (
          <TouchableOpacity
            key={m.route}
            activeOpacity={0.85}
            style={s.card}
            onPress={() => navigation.navigate(m.route)}
          >
            <View pointerEvents="none" style={[s.cardGlow, { backgroundColor: m.tint + '14' }]} />
            <View style={[s.iconWrap, { backgroundColor: m.tint + '20', borderColor: m.tint + '66' }]}>
              <Text style={s.icon}>{m.icon}</Text>
            </View>
            <Text style={s.title} numberOfLines={2}>{m.title}</Text>
            <Text style={s.sub} numberOfLines={1}>{m.sub}</Text>
            <View style={[s.cardArrow, { backgroundColor: m.tint + '22', borderColor: m.tint + '55' }]}>
              <Text style={[s.cardArrowText, { color: m.tint }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
};

const makeStyles = (c: Palette) => StyleSheet.create({
  heroCard: {
    backgroundColor: c.gold + '10',
    borderWidth: 1,
    borderColor: c.gold + '33',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTitle: { color: c.gold, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  card: {
    width: '48.5%',
    backgroundColor: c.card,
    borderRadius: radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...elevation.sm,
  },
  cardGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 24 },
  title: { color: c.text, fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  sub: { color: c.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },
  cardArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArrowText: { fontSize: 14, fontWeight: '900' },
});
