import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, H1, Muted, Screen } from '../../components';
import { colors } from '../../theme';

const MENU: Array<{ route: string; title: string; sub: string }> = [
  { route: 'SiteMessages', title: 'Xabarlar', sub: 'Saytdan kelgan murojaatlar' },
  { route: 'SiteContact', title: 'Kontakt ma’lumotlar', sub: 'Telefon, manzil, ish vaqti' },
  { route: 'SitePortfolio', title: 'Portfolio', sub: 'Loyihalar va mijoz ishlari' },
  { route: 'SiteSlider', title: 'Slayder', sub: 'Bosh sahifa slayderi' },
];

export const SiteCmsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <Screen>
      <H1>Sayt CMS</H1>
      <Card>
        <Text style={s.infoTitle}>Sayt boshqaruvi</Text>
        <Muted>
          Bu yerdagi o‘zgarishlar saytni jonli yangilaydi — ma’lumotlar veb bilan bir bazadan olinadi.
        </Muted>
      </Card>
      <Card>
        {MENU.map((m, i) => (
          <TouchableOpacity
            key={m.route}
            style={[s.row, i === MENU.length - 1 && { borderBottomWidth: 0 }]}
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
    </Screen>
  );
};

const s = StyleSheet.create({
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
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
});
