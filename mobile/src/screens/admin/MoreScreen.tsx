import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth';
import { Btn, Card, H1, Muted, Screen } from '../../components';
import { colors } from '../../theme';

const MENU: Array<{ route: string; title: string; sub: string }> = [
  { route: 'Clients', title: 'Mijozlar', sub: "Mijozlar ro'yxati va tahrirlash" },
  { route: 'Waybills', title: 'Yuk xatlari', sub: 'TTN yaratish, holat, o‘chirish' },
  { route: 'Deliveries', title: 'Yetkazmalar', sub: 'Yuk xatlari holati va o‘chirish' },
  { route: 'Employees', title: 'Xodimlar', sub: 'Xodimlar, oylik va loginlar' },
  { route: 'Payroll', title: 'Ish haqi', sub: 'Oylik maoshlar va to‘lovlar' },
  { route: 'Bonuses', title: 'Bonuslar', sub: 'Bonuslar va mukofotlar' },
  { route: 'Warehouse', title: 'Omborxona', sub: 'Qoldiqlar monitoringi' },
  { route: 'Calculator', title: 'Kalkulyator', sub: 'Tannarx hisobi' },
  { route: 'Attendance', title: 'Davomat', sub: 'Oylik davomat nazorati' },
  { route: 'SiteCms', title: 'Sayt CMS', sub: 'Veb-sayt: aloqa, loyihalar, slayder' },
  { route: 'Profile', title: 'Profil', sub: 'Sessiya va chiqish' },
];

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { session, logout } = useAuth();

  return (
    <Screen>
      <H1>Boshqa</H1>
      <Card>
        {MENU.map((m) => (
          <TouchableOpacity
            key={m.route}
            style={s.row}
            onPress={() => navigation.navigate(m.route)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{m.title}</Text>
              <Text style={s.rowSub}>{m.sub}</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card>
        <Text style={s.infoTitle}>Ilova haqida</Text>
        <Muted>Clean Life ERP • Mobil ilova</Muted>
        <Text style={s.version}>Versiya: 1.0.0</Text>
        {session ? (
          <Text style={s.user}>
            {session.name} • {session.role === 'admin' ? 'Admin' : 'Xodim'}
          </Text>
        ) : null}
      </Card>

      <Btn title="Chiqish" onPress={logout} danger />
    </Screen>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  arrow: { color: colors.gold, fontSize: 24, fontWeight: '800', marginLeft: 8 },
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  version: { color: colors.gold, fontSize: 14, fontWeight: '700', marginTop: 6 },
  user: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
