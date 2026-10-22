import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Muted, Screen } from '../../components';
import { colors, Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Item = { route: string; title: string; sub: string; icon: string; tint: string };

const MENU: Item[] = [
  {
    route: 'Employees',
    title: 'Xodimlar',
    sub: 'Roʻyxat va loginlar',
    icon: '👥',
    tint: '#A78BFA',
  },
  {
    route: 'Payroll',
    title: 'Ish haqi',
    sub: 'Oylik va toʻlovlar',
    icon: '💵',
    tint: '#34D399',
  },
  {
    route: 'Bonuses',
    title: 'Bonuslar',
    sub: 'Mukofotlar',
    icon: '🎁',
    tint: '#F59E0B',
  },
  {
    route: 'Attendance',
    title: 'Davomat',
    sub: 'Oylik nazorat',
    icon: '📅',
    tint: '#22D3EE',
  },
];

export const HrHubScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const navigation = useNavigation<any>();

  return (
    <Screen>
      <Card>
        <Muted>
          Xodimlar bazasi, ish haqi, bonuslar va davomat nazorati. Barcha oʻzgarishlar veb-sayt bilan sinxron ishlaydi.
        </Muted>
      </Card>
      <View style={s.grid}>
        {MENU.map((m) => (
          <TouchableOpacity
            key={m.route}
            activeOpacity={0.85}
            style={s.card}
            onPress={() => navigation.navigate(m.route)}
          >
            <View style={[s.iconWrap, { backgroundColor: m.tint + '22', borderColor: m.tint + '55' }]}>
              <Text style={s.icon}>{m.icon}</Text>
            </View>
            <Text style={s.title} numberOfLines={2}>{m.title}</Text>
            <Text style={s.sub} numberOfLines={1}>{m.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 26 },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
