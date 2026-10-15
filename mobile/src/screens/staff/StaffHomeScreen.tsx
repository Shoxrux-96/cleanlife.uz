import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import {
  Btn,
  Card,
  Empty,
  H1,
  Loader,
  Muted,
  Screen,
} from '../../components';
import { colors } from '../../theme';

type Rec = Record<string, unknown>;

const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const str = (r: Rec, k: string): string => String(r[k] ?? '');

export const StaffHomeScreen: React.FC = () => {
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const name = session?.name ?? 'Xodim';
  const position = session?.position ?? '';
  const today = toLocalDate(new Date());

  const [todayRec, setTodayRec] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const records = await api.attendance.list();
        const mine =
          records.find(
            (r) =>
              String(r.date ?? '') === today &&
              String(r.employee_name ?? '') === (session?.name ?? ''),
          ) ?? null;
        setTodayRec(mine);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Davomatni yuklashda xatolik.',
        );
        setTodayRec(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.name, today],
  );

  useEffect(() => {
    load();
  }, [load]);

  const status = str(todayRec ?? {}, 'status');
  const checkIn = str(todayRec ?? {}, 'check_in');

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
      >
        <H1>Xush kelibsiz</H1>

        <Card>
          <Text style={s.welcome}>{name}</Text>
          {position ? <Muted>{position}</Muted> : null}
          <Text style={s.date}>Bugun: {today}</Text>
        </Card>

        <Card>
          <Text style={s.cardTitle}>Bugungi davomat</Text>
          {loading ? (
            <Loader />
          ) : error ? (
            <View>
              <Text style={s.error}>{error}</Text>
              <Btn title="Qayta urinish" onPress={() => load()} ghost />
            </View>
          ) : todayRec ? (
            <View>
              <Text style={s.big}>{checkIn || '—'}</Text>
              <View style={s.badgeWrap}>
                <Text style={s.badge}>{status || 'qayd qilingan'}</Text>
              </View>
              <Muted>Kirish vaqti va holat qayd etilgan.</Muted>
            </View>
          ) : (
            <Empty text="Bugun davomatdan o'tilmagan" />
          )}
        </Card>

        <Card>
          <Text style={s.cardTitle}>Tezkor o‘tish</Text>
          <View style={s.btnGap}>
            <Btn
              title="Face ID orqali kirish"
              onPress={() => navigation.navigate('FaceID')}
            />
          </View>
          <View style={s.btnGap}>
            <Btn
              title="Davomat hisoboti"
              onPress={() => navigation.navigate('Hisobot')}
              ghost
            />
          </View>
          <Btn
            title="Profil"
            onPress={() => navigation.navigate('Profil')}
            ghost
          />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const s = StyleSheet.create({
  welcome: { color: colors.text, fontSize: 20, fontWeight: '800' },
  date: { color: colors.muted, fontSize: 13, marginTop: 6 },
  cardTitle: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  big: {
    color: colors.gold,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 6,
  },
  badgeWrap: { alignSelf: 'flex-start', marginBottom: 8 },
  badge: {
    color: '#000',
    backgroundColor: colors.green,
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  error: { color: colors.red, fontSize: 14, marginBottom: 8 },
  btnGap: { marginBottom: 8 },
});
