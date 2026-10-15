import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Screen, Card, H1, Muted, Btn, Empty, Loader } from '../../components';
import { colors } from '../../theme';

const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

interface Msg {
  ok: boolean;
  text: string;
}

export const CheckinScreen: React.FC = () => {
  const { session } = useAuth();
  const employeeId = session?.employeeId;
  const employeeName = session?.name ?? '';

  const [settings, setSettings] = useState<Record<string, unknown> | null>(
    null,
  );
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [todayRec, setTodayRec] = useState<Record<string, unknown> | null>(
    null,
  );
  const [statusLoading, setStatusLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [faceNote, setFaceNote] = useState<string | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const [coords, setCoords] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const s = await api.attendance.settings();
      setSettings(s);
    } catch {
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadToday = useCallback(async () => {
    setStatusLoading(true);
    try {
      const today = toLocalDate(new Date());
      const records = await api.attendance.list();
      const mine =
        records.find(
          (r) =>
            String(r.date ?? '') === today &&
            String(r.employee_name ?? '') === employeeName,
        ) ?? null;
      setTodayRec(mine);
    } catch {
      setTodayRec(null);
    } finally {
      setStatusLoading(false);
    }
  }, [employeeName]);

  useEffect(() => {
    loadSettings();
    loadToday();
  }, [loadSettings, loadToday]);

  const handleCheckin = async () => {
    if (!employeeId) return;
    setBusy(true);
    setMsg(null);
    setFaceNote(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocDenied(true);
        setMsg({
          ok: false,
          text: 'Joylashuv ruxsati berilmadi. Davomatdan o‘tish uchun joylashuv shart.',
        });
        return;
      }
      setLocDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setCoords(
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      );

      let faceVerified = false;
      let note: string | null = null;
      try {
        const hasHw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHw && enrolled) {
          const res = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Shaxsingizni tasdiqlang',
            cancelLabel: 'O‘tkazib yuborish',
          });
          if (res.success) {
            faceVerified = true;
          } else {
            note =
              'Biometriya tasdiqlanmadi — tasdiqsiz davom etildi.';
          }
        } else {
          note =
            'Qurilmada biometriya topilmadi — tasdiqsiz davom etildi.';
        }
      } catch {
        note = 'Biometriya ishlamadi — tasdiqsiz davom etildi.';
      }
      setFaceNote(note);

      await api.attendance.checkin({
        employee_id: employeeId,
        lat: latitude,
        lng: longitude,
        face_verified: faceVerified,
      });
      setMsg({
        ok: true,
        text: faceVerified
          ? 'Davomat muvaffaqiyatli qayd qilindi.'
          : 'Davomat qayd qilindi.' + (note ? ` ${note}` : ''),
      });
      await loadToday();
    } catch (e) {
      const text =
        e instanceof Error ? e.message : 'Davomatni saqlab bo‘lmadi.';
      setMsg({ ok: false, text });
    } finally {
      setBusy(false);
    }
  };

  if (!employeeId) {
    return (
      <Screen>
        <H1>Davomat</H1>
        <Card>
          <Text style={s.errorTitle}>Hisob sozlanmagan</Text>
          <Text style={s.body}>
            Sizning hisobingiz biror xodimga bog‘lanmagan. Iltimos, adminga
            murojaat qiling — admin sizning loginingizni xodimlar
            ro‘yxatidagi yozuvga biriktirishi kerak.
          </Text>
        </Card>
      </Screen>
    );
  }

  const workStart = String(settings?.work_start_time ?? '—');
  const workEnd = String(settings?.work_end_time ?? '—');
  const radius = settings?.radius_m != null ? String(settings.radius_m) : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <H1>Davomat</H1>

        <Card>
          <Text style={s.cardTitle}>Ish vaqti</Text>
          {settingsLoading ? (
            <Loader />
          ) : settings ? (
            <View>
              <Text style={s.body}>
                {workStart} — {workEnd}
              </Text>
              {radius ? (
                <Text style={s.small}>Radius: {radius} m</Text>
              ) : null}
              <Muted>Belgilangan vaqtda va hududda bo‘ling.</Muted>
            </View>
          ) : (
            <Muted>Ish vaqti yuklanmadi.</Muted>
          )}
        </Card>

        <Card>
          <Text style={s.cardTitle}>Bugungi holat</Text>
          {statusLoading ? (
            <Loader />
          ) : todayRec ? (
            <View>
              <Text style={s.big}>
                {String(todayRec.check_in ?? '—')}
              </Text>
              <Text style={s.body}>
                Holat:{' '}
                <Text style={s.statusOk}>
                  {String(todayRec.status ?? 'qayd qilingan')}
                </Text>
              </Text>
            </View>
          ) : (
            <Empty text="Bugun hali davomatdan o‘tmadingiz." />
          )}
        </Card>

        {locDenied ? (
          <Card>
            <Text style={s.errorTitle}>Joylashuv o‘chiq</Text>
            <Text style={s.body}>
              Sozlamalar {'>'} Ilovalar {'>'} Brendor {'>'} Ruxsatnomalar{' '}
              {'>'} Joylashuv bo‘limida ruxsat bering, so‘ng qayta urining.
            </Text>
          </Card>
        ) : null}

        {coords ? (
          <Card>
            <Muted>So‘nggi koordinata: {coords}</Muted>
          </Card>
        ) : null}

        {faceNote ? (
          <Card>
            <Muted>{faceNote}</Muted>
          </Card>
        ) : null}

        {msg ? (
          <Card
            style={msg.ok ? s.msgOk : s.msgErr}
          >
            <Text style={msg.ok ? s.msgOkText : s.msgErrText}>
              {msg.text}
            </Text>
          </Card>
        ) : null}

        <View style={s.bigBtnWrap}>
          <Btn
            title={busy ? 'Yuborilmoqda...' : 'Davomatdan o‘tish'}
            onPress={handleCheckin}
            busy={busy}
          />
        </View>
        <Muted>
          Avval joylashuv aniqlanadi, so‘ng yuz/biotasdiq so‘raladi.
        </Muted>
      </ScrollView>
    </Screen>
  );
};

const s = StyleSheet.create({
  cardTitle: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  body: { color: colors.text, fontSize: 15, marginBottom: 4 },
  small: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  big: {
    color: colors.gold,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 4,
  },
  statusOk: { color: colors.green, fontWeight: '700' },
  errorTitle: {
    color: colors.red,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  msgOk: { borderColor: colors.green },
  msgErr: { borderColor: colors.red },
  msgOkText: { color: colors.green, fontSize: 15, fontWeight: '700' },
  msgErrText: { color: colors.red, fontSize: 15, fontWeight: '700' },
  bigBtnWrap: { marginVertical: 12 },
});
