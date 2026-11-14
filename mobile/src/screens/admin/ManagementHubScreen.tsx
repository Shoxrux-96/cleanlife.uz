import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCanAdminWrite } from '../../auth';
import { Muted, Screen } from '../../components';
import { elevation, radius, spacing } from '../../design';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Item = {
  route: string;
  title: string;
  sub: string;
  icon: string;
  tint: string;
  params?: Record<string, unknown>;
};

// Faqat admin ko'radigan kartalar
const ADMIN_ONLY_ROUTES = new Set(['Finance', 'Reports']);

const FULL_MENU: Item[] = [
  { route: 'Clients',      title: 'Mijozlar',       sub: "Mijozlar bazasi",       icon: '🤝', tint: '#60A5FA' },
  { route: 'Orders',       title: 'Buyurtmalar',    sub: 'Yangi va joriy',        icon: '📦', tint: '#34D399' },
  { route: 'Waybills',     title: 'Yuk xatlari',    sub: 'TTN va hujjatlar',      icon: '📄', tint: '#F59E0B' },
  { route: 'Deliveries',   title: 'Yetkazish',      sub: 'Reyslar va haydovchi',  icon: '🚚', tint: '#A78BFA' },
  { route: 'Finance',      title: 'Moliya',         sub: "Kirim-chiqim",          icon: '💰', tint: '#FBBF24' },
  { route: 'Reports',      title: 'Hisobotlar',     sub: 'Umumiy ko‘rsatkichlar', icon: '📊', tint: '#22D3EE' },
  { route: 'SiteContent',  title: 'Sayt kontenti',  sub: 'Portfolio, aloqa',      icon: '🌐', tint: '#F472B6' },
  { route: 'Messages',     title: 'Xabarlar',       sub: 'Mijoz murojaatlari',    icon: '✉️', tint: '#FB7185' },
];

export const ManagementHubScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const canEdit = useCanAdminWrite();
  // Non-admin xodimlar Moliya va Hisobotlar kartalarini ko'rmaydi
  const MENU = canEdit ? FULL_MENU : FULL_MENU.filter((m) => !ADMIN_ONLY_ROUTES.has(m.route));

  return (
    <Screen>
      <View style={s.heroCard}>
        <Text style={s.heroTitle}>Boshqaruv markazi</Text>
        <Muted style={{ marginTop: 4 }}>
          Barcha modullar bir joyda — mijozlar, buyurtmalar, moliya va sayt kontenti.
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
            {/* Dekorativ orqa fon */}
            <View
              pointerEvents="none"
              style={[
                s.cardGlow,
                { backgroundColor: m.tint + '14' },
              ]}
            />
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
