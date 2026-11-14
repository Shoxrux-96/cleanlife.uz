import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCanAdminWrite } from '../../auth';
import { Muted, Screen } from '../../components';
import { elevation, radius, spacing } from '../../design';
import { colors, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Item = {
  route: string;
  title: string;
  sub: string;
  icon: string;
  tint: string;
  params?: Record<string, unknown>;
};

// Admin uchun to'liq HR hub (barcha xodimlar bo'yicha boshqaruv)
const ADMIN_MENU: Item[] = [
  { route: 'Employees', title: 'Xodimlar',         sub: 'Roʻyxat va loginlar',  icon: '👥', tint: '#A78BFA' },
  { route: 'Payroll',   title: 'Ish haqi',         sub: 'Oylik va toʻlovlar',   icon: '💵', tint: '#34D399' },
  { route: 'Bonuses',   title: 'Bonuslar',         sub: 'Mukofotlar',           icon: '🎁', tint: '#F59E0B' },
  { route: 'Payroll',   title: 'Davomat',          sub: 'Kunlik nazorat',       icon: '📋', tint: '#22D3EE',
    params: { tab: 'davomat', single: true } },
  { route: 'Checkin',   title: 'Face ID kirish',   sub: 'Ish joyida qayd etish', icon: '',   tint: '#38BDF8' },
  { route: 'Stats',     title: 'Shaxsiy davomat',  sub: 'Oylik tarix',          icon: '📅', tint: '#C084FC' },
];

// Oddiy xodim (manager/driver/basic) uchun — faqat shaxsiy ma'lumot
const STAFF_MENU: Item[] = [
  { route: 'Checkin',   title: 'Face ID kirish',   sub: 'Ish joyida qayd etish', icon: '',   tint: '#38BDF8' },
  { route: 'MyPayroll', title: 'Mening maoshim',   sub: 'Shaxsiy oylik',        icon: '💵', tint: '#34D399' },
  { route: 'MyBonuses', title: 'Mening bonuslarim',sub: 'Shaxsiy mukofotlar',   icon: '🎁', tint: '#F59E0B' },
  { route: 'Stats',     title: 'Mening davomatim', sub: 'Oylik tarix',          icon: '📅', tint: '#C084FC' },
];

export const HrHubScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const canEdit = useCanAdminWrite();
  const MENU = canEdit ? ADMIN_MENU : STAFF_MENU;

  const navigation = useNavigation<any>();

  return (
    <Screen>
      <View style={s.heroCard}>
        <Text style={s.heroTitle}>{canEdit ? "HR bo'limi" : 'Mening ma’lumotlarim'}</Text>
        <Muted style={{ marginTop: 4 }}>
          {canEdit
            ? 'Xodimlar, ish haqi, bonuslar va davomat nazorati — bitta joyda.'
            : 'Shaxsiy maoshingiz, bonuslaringiz va davomatingizni shu yerdan ko‘ring.'}
        </Muted>
      </View>
      <View style={s.grid}>
        {MENU.map((m) => (
          <TouchableOpacity
            key={`${m.route}:${m.title}`}
            activeOpacity={0.85}
            style={s.card}
            onPress={() => navigation.navigate(m.route, m.params)}
          >
            <View
              pointerEvents="none"
              style={[s.cardGlow, { backgroundColor: m.tint + '14' }]}
            />
            {m.icon ? (
              <View style={[s.iconWrap, { backgroundColor: m.tint + '20', borderColor: m.tint + '66' }]}>
                <Text style={s.icon}>{m.icon}</Text>
              </View>
            ) : null}
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

const makeStyles = (colors: Palette) => StyleSheet.create({
  heroCard: {
    backgroundColor: colors.gold + '10',
    borderWidth: 1,
    borderColor: colors.gold + '33',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTitle: { color: colors.gold, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  roBanner: {
    backgroundColor: colors.gold + '18',
    borderWidth: 1,
    borderColor: colors.gold + '55',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  roBannerText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  card: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  title: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },
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
