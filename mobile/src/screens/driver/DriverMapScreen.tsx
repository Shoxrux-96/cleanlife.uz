import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Platform } from 'react-native';
// react-native-maps faqat telefonda (webda codegen yo'q).
// Expo Go da native modul yo'q — try/catch shart, aks holda
// butun ilova qora ekranda qotib qoladi.
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {
    MapView = null;
    Marker = null;
  }
}
import * as Location from 'expo-location';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Btn, Card, Empty, H1, Loader, Muted, Screen } from '../../components';
import { colors, fmtMoney } from '../../theme';

type Rec = Record<string, unknown>;

const str = (r: Rec, k: string): string => String(r[k] ?? '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
};
const idOf = (r: Rec): number | string => (r.id as number | string) ?? '';

const WAREHOUSE: [number, number] = [41.335, 69.245];
const TASHKENT: [number, number] = [41.311, 69.2405];

const pad = (n: number): string => String(n).padStart(2, '0');
const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const isMine = (r: Rec, name: string): boolean => {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return str(r, 'driver_name').toLowerCase().includes(n);
};

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && !Number.isNaN(v)
    ? v
    : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
      ? Number(v)
      : null;

const tripCoords = (r: Rec): [number, number] => {
  const la = numOrNull(r.lat);
  const ln = numOrNull(r.lng);
  if (la !== null && ln !== null) return [la, ln];
  const hay = `${str(r, 'destination_address')} ${str(r, 'client_name')}`.toLowerCase();
  if (hay.includes('mustaqillik') || hay.includes('sulton'))
    return [41.3195, 69.2825];
  if (hay.includes('bunyodkor') || hay.includes('rayhon'))
    return [41.2845, 69.2155];
  if (hay.includes('rustaveli') || hay.includes('aroma'))
    return [41.2985, 69.2612];
  if (hay.includes('chilonzor')) return [41.275, 69.205];
  if (hay.includes('yunusobod')) return [41.365, 69.289];
  if (hay.includes('mirobod') || hay.includes('nukus'))
    return [41.295, 69.278];
  if (hay.includes('sergeli')) return [41.225, 69.22];
  let h = 0;
  for (let i = 0; i < hay.length; i++) h = (h * 31 + hay.charCodeAt(i)) % 9973;
  const dLat = ((h % 60) - 30) / 1000;
  const dLng = (((h >> 3) % 60) - 30) / 1000;
  return [TASHKENT[0] + dLat, TASHKENT[1] + dLng];
};

const statusLabel = (st: string): string => {
  if (st === 'kutilmoqda') return 'Kutilmoqda';
  if (st === 'yolda') return "Yo'lda";
  if (st === 'yetkazildi') return 'Yetkazildi';
  return st || '—';
};

const pinColor = (st: string): string => {
  if (st === 'yetkazildi') return colors.green;
  if (st === 'yolda') return colors.blue;
  return colors.gold;
};

const phoneOf = (r: Rec): string =>
  str(r, 'phone') ||
  str(r, 'client_phone') ||
  str(r, 'phone_number') ||
  str(r, 'client_phone_number');

export const DriverMapScreen: React.FC = () => {
  const { session } = useAuth();
  const name = session?.name ?? '';

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = (await api.deliveries.list()) as Rec[];
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await Location.getCurrentPositionAsync({});
      }
    } catch {
      // Joylashuv ixtiyoriy — xatoni jim yutamiz.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = useMemo(() => localToday(), []);

  const myTrips = useMemo(
    () =>
      items.filter(
        (r) =>
          isMine(r, name) &&
          (String(r.created_at ?? '').slice(0, 10) === today ||
            str(r, 'status') === 'yolda' ||
            str(r, 'status') === 'kutilmoqda'),
      ),
    [items, name, today],
  );

  const selected = useMemo(
    () => myTrips.find((r) => String(r.id) === selectedId) ?? null,
    [myTrips, selectedId],
  );

  const changeStatus = async (r: Rec, next: 'yolda' | 'yetkazildi') => {
    setBusyId(idOf(r));
    try {
      await api.deliveries.changeStatus(idOf(r), next);
      await load(true);
    } catch (e) {
      Alert.alert(
        'Xatolik',
        e instanceof Error ? e.message : 'Holatni o‘zgartirishda xatolik.',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <Screen>
        <H1>Xarita</H1>
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Xarita</H1>
      <Muted>
        Omborxona va bugungi reyslaringiz. Belgini yoki ro‘yxatni bosing.
      </Muted>
      {error ? (
        <Card>
          <Text style={s.error}>{error}</Text>
          <Btn title="Qayta urinish" onPress={() => load()} ghost />
        </Card>
      ) : null}

      <View style={s.mapWrap}>
        {MapView ? (
          <MapView
          style={s.map}
          showsUserLocation
          initialRegion={{
            latitude: TASHKENT[0],
            longitude: TASHKENT[1],
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
        >
          <Marker
            coordinate={{ latitude: WAREHOUSE[0], longitude: WAREHOUSE[1] }}
            title="Omborxona"
            description="Asosiy ombor"
            pinColor={colors.gold}
          />
          {myTrips.map((r) => {
            const [la, ln] = tripCoords(r);
            return (
              <Marker
                key={String(r.id)}
                coordinate={{ latitude: la, longitude: ln }}
                title={str(r, 'trip_code') || str(r, 'client_name')}
                description={str(r, 'destination_address')}
                pinColor={pinColor(str(r, 'status'))}
                onPress={() => setSelectedId(String(r.id))}
              />
            );
          })}
          </MapView>
        ) : (
          <View style={[s.map, { alignItems: 'center', justifyContent: 'center' }]}>
            <Muted>Xarita faqat telefonda ko‘rinadi. Ro‘yxatdan foydalaning.</Muted>
          </View>
        )}
      </View>

      {selected ? (
        <Card>
          <View style={s.head}>
            <Text style={s.code}>
              {str(selected, 'trip_code') || 'Reys'}
            </Text>
            <View
              style={[
                s.badge,
                { borderColor: pinColor(str(selected, 'status')) },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  { color: pinColor(str(selected, 'status')) },
                ]}
              >
                {statusLabel(str(selected, 'status'))}
              </Text>
            </View>
          </View>
          <Text style={s.line}>
            Mijoz: {str(selected, 'client_name') || '—'}
          </Text>
          {str(selected, 'destination_address') ? (
            <Muted>{str(selected, 'destination_address')}</Muted>
          ) : null}
          {phoneOf(selected) ? (
            <Text style={s.line}>Telefon: {phoneOf(selected)}</Text>
          ) : null}
          <Text style={s.fee}>{fmtMoney(num(selected.delivery_fee))}</Text>
          <View style={s.row}>
            <TouchableOpacity
              style={s.smallBtn}
              disabled={busyId === idOf(selected)}
              onPress={() => changeStatus(selected, 'yolda')}
            >
              <Text style={s.smallBtnText}>Yo‘lda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.smallBtn}
              disabled={busyId === idOf(selected)}
              onPress={() => changeStatus(selected, 'yetkazildi')}
            >
              <Text style={s.smallBtnText}>Yetkazildi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.smallBtn}
              onPress={() => setSelectedId(null)}
            >
              <Text style={[s.smallBtnText, { color: colors.muted }]}>
                Yopish
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : null}

      <FlatList
        data={myTrips}
        keyExtractor={(r) => String(r.id)}
        showsVerticalScrollIndicator={false}
        style={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          <Empty text="Xaritada ko‘rsatiladigan reyslar yo‘q." />
        }
        renderItem={({ item }) => {
          const st = str(item, 'status');
          const active = String(item.id) === selectedId;
          return (
            <TouchableOpacity
              onPress={() =>
                setSelectedId((cur) =>
                  cur === String(item.id) ? null : String(item.id),
                )
              }
            >
              <View style={[s.row1, active && s.rowActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.codeSmall}>
                    {str(item, 'trip_code') || '—'}
                  </Text>
                  <Text style={s.client}>
                    {str(item, 'client_name') || '—'}
                  </Text>
                  {str(item, 'destination_address') ? (
                    <Text style={s.addr}>
                      {str(item, 'destination_address')}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[s.badge, { borderColor: pinColor(st) }]}
                >
                  <Text style={[s.badgeText, { color: pinColor(st) }]}>
                    {statusLabel(st)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <Btn title="Yangilash" onPress={() => load(true)} busy={refreshing} ghost />
    </Screen>
  );
};

const s = StyleSheet.create({
  mapWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    marginTop: 12,
  },
  map: { width: '100%', height: 260 },
  list: { marginTop: 12, maxHeight: 320 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  codeSmall: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  line: { color: colors.text, fontSize: 14, marginTop: 4 },
  fee: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  rowActive: { borderColor: colors.gold },
  client: { color: colors.text, fontSize: 14, marginTop: 2 },
  addr: { color: colors.muted, fontSize: 12, marginTop: 2 },
  error: { color: colors.red, fontSize: 14, marginBottom: 8, textAlign: 'center' },
});
