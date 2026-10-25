import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Screen, Card, Muted, Btn, Loader } from '../../components';
import { Palette } from '../../theme';
import { useAppTheme } from '../../theme-context';

type Rec = Record<string, unknown>;

const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const toHHMM = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// 2 ta koordinata orasidagi masofa, metrda (Haversine)
const haversine = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const inWindow = (now: Date, start: string, end: string, grace: number): {ok: boolean; late: boolean} => {
  if (!start || !end) return { ok: true, late: false };
  const [sh, sm] = start.split(':').map((x) => parseInt(x, 10));
  const [eh, em] = end.split(':').map((x) => parseInt(x, 10));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = (sh || 0) * 60 + (sm || 0);
  const endMin = (eh || 0) * 60 + (em || 0);
  const g = Number.isFinite(grace) ? grace : 10;
  if (nowMin < startMin - 15) return { ok: false, late: false };
  if (nowMin > endMin) return { ok: false, late: false };
  return { ok: true, late: nowMin > startMin + g };
};

// ===== face-api.js dinamik yuklash (web uchun) =====
const FACEAPI_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.min.js';
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model';

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('No DOM'));
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).__loaded) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script fail')));
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => { (el as any).__loaded = true; resolve(); };
    el.onerror = () => reject(new Error('script fail'));
    document.head.appendChild(el);
  });

let faceApiPromise: Promise<any> | null = null;
const loadFaceApi = (): Promise<any> => {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    await loadScript(FACEAPI_URL);
    const fa = (window as any).faceapi;
    if (!fa) throw new Error('face-api yuklanmadi');
    await fa.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
    await fa.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
    await fa.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
    return fa;
  })().catch((e) => {
    faceApiPromise = null;
    throw e;
  });
  return faceApiPromise;
};

// Deskriptorlar o'rtasidagi masofa
const euclid = (a: Float32Array, b: Float32Array): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
};

// ===== Web Camera (video + canvas, react-native-web uchun DOM elementi) =====
const WebFaceScanner: React.FC<{
  colors: Palette;
  ovalW: number;
  ovalH: number;
  avatarUrl: string;
  onCapture: (payload: { distance: number; snapshot: string }) => void;
  onError: (msg: string) => void;
  active: boolean;
}> = ({ colors, ovalW, ovalH, avatarUrl, onCapture, onError, active }) => {
  const containerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>("Modellar yuklanmoqda...");
  const [progress, setProgress] = useState<number>(0); // 0..100
  const [matched, setMatched] = useState<boolean>(false);
  const stableFramesRef = useRef<number>(0);
  const matchedRef = useRef<boolean>(false);
  const refDescriptorRef = useRef<Float32Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  // Containerga video DOM elementini joylash (RN-Web muhiti)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const host = containerRef.current;
    if (!host) return;

    const v = document.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    v.muted = true;
    v.style.position = 'absolute';
    v.style.top = '0';
    v.style.left = '0';
    v.style.width = '100%';
    v.style.height = '100%';
    v.style.objectFit = 'cover';
    v.style.transform = 'scaleX(-1)'; // mirror
    v.style.background = '#000';
    host.appendChild(v);
    videoRef.current = v;

    return () => {
      try { host.removeChild(v); } catch { /* ignore */ }
      videoRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    let cancelled = false;
    matchedRef.current = false;
    stableFramesRef.current = 0;
    setMatched(false);
    setProgress(0);

    (async () => {
      try {
        setStatus('Modellar yuklanmoqda...');
        const fa = await loadFaceApi();
        if (cancelled) return;

        // Admin yuklagan rasmdan descriptor
        if (avatarUrl) {
          try {
            setStatus("Admin rasmi tahlil qilinmoqda...");
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const im = new Image();
              im.crossOrigin = 'anonymous';
              im.onload = () => resolve(im);
              im.onerror = () => reject(new Error("Admin rasmini yuklab bo'lmadi"));
              im.src = avatarUrl;
            });
            const det = await fa
              .detectSingleFace(img, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (det && det.descriptor) {
              refDescriptorRef.current = det.descriptor as Float32Array;
            } else {
              onError('Admin rasmidan yuz topilmadi. Admin aniqroq 3×4 rasm yuklashi kerak.');
              return;
            }
          } catch (e) {
            onError(e instanceof Error ? e.message : 'Admin rasmi tahlili xatosi.');
            return;
          }
        } else {
          onError('Admin siz uchun 3×4 rasm yuklamagan.');
          return;
        }

        if (cancelled) return;

        setStatus('Kameraga ruxsat so\'ralmoqda...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("Yuzingizni halqa ichiga to'g'rilang");

        const refDesc = refDescriptorRef.current!;
        const tick = async () => {
          if (cancelled || matchedRef.current) return;
          const v = videoRef.current;
          if (!v || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          try {
            const result = await fa
              .detectSingleFace(v, new fa.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 }))
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (result && result.descriptor) {
              // Yuz joyi — ring markazida bo'lishi kerak
              const box = result.detection.box;
              const cx = box.x + box.width / 2;
              const cy = box.y + box.height / 2;
              const vw = v.videoWidth || 480;
              const vh = v.videoHeight || 480;
              const offX = Math.abs(cx / vw - 0.5);
              const offY = Math.abs(cy / vh - 0.5);
              const sizeOk = box.width > vw * 0.35 && box.width < vw * 0.85;
              const centered = offX < 0.15 && offY < 0.15;
              if (!sizeOk) {
                setStatus(box.width < vw * 0.35 ? "Yaqinroq keling..." : "Biroz uzoqlashing...");
                stableFramesRef.current = 0;
                setProgress(0);
              } else if (!centered) {
                setStatus("Yuzni halqa markaziga to'g'rilang");
                stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
                setProgress(Math.min(99, stableFramesRef.current * 20));
              } else {
                const dist = euclid(refDesc, result.descriptor as Float32Array);
                if (dist < 0.55) {
                  stableFramesRef.current += 1;
                  const p = Math.min(100, stableFramesRef.current * 25);
                  setProgress(p);
                  setStatus(`Yuz aniqlandi — ${Math.round((1 - dist) * 100)}% mos`);
                  if (stableFramesRef.current >= 4) {
                    matchedRef.current = true;
                    setMatched(true);
                    // Snapshot
                    const canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 320;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.translate(canvas.width, 0);
                      ctx.scale(-1, 1);
                      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                    }
                    const snap = canvas.toDataURL('image/jpeg', 0.75);
                    onCapture({ distance: dist, snapshot: snap });
                    return;
                  }
                } else {
                  stableFramesRef.current = 0;
                  setProgress(0);
                  setStatus(`Mos emas — ${Math.round((1 - dist) * 100)}% o'xshashlik`);
                }
              }
            } else {
              stableFramesRef.current = 0;
              setProgress(0);
              setStatus("Yuzingizni halqa ichiga to'g'rilang");
            }
          } catch {
            /* skip frame */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : 'Kamera xatosi');
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, avatarUrl, onCapture, onError, stop]);

  const ringColor = matched ? colors.green : progress > 50 ? colors.gold : '#D4AF37';
  const stageW = ovalW + 80;
  const stageH = ovalH + 80;

  // Oval shaklidagi "oyna" oq mask ichida — kameraning qolgan qismini box-shadow bilan yashiramiz
  const maskStyle: any = Platform.OS === 'web'
    ? { boxShadow: '0 0 0 2000px #FFFFFF' }
    : {};

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.stage, { width: stageW, height: stageH, backgroundColor: '#FFFFFF' }]}>
        {/* Kamera video — orqa fonda, oq mask uni berkitadi */}
        <View
          ref={containerRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Oval oyna: box-shadow bilan atrofini oq qiladi */}
        <View
          style={[
            styles.ovalWindow,
            {
              width: ovalW,
              height: ovalH,
              borderColor: ringColor,
            },
            maskStyle,
          ]}
          pointerEvents="none"
        />

        {/* Progress indikator — ovaldan tashqarida, pastki o'ngda */}
        {progress > 0 && !matched ? (
          <View style={[styles.progressBadge, { backgroundColor: ringColor }]} pointerEvents="none">
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        ) : null}
        {matched ? (
          <View style={[styles.progressBadge, { backgroundColor: colors.green }]} pointerEvents="none">
            <Text style={styles.progressText}>✓</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.status, { color: matched ? colors.green : '#1A1715' }]}>
        {matched ? '✓ Tasdiqlandi' : status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 20,
  },
  ovalWindow: {
    borderRadius: 9999,
    borderWidth: 3,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  progressBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  progressText: {
    color: '#1A1715',
    fontSize: 13,
    fontWeight: '900',
  },
  status: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export const CheckinScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { session } = useAuth();
  const employeeId = session?.employeeId;
  const employeeName = session?.name ?? '';

  const [settings, setSettings] = useState<Rec | null>(null);
  const [employee, setEmployee] = useState<Rec | null>(null);
  const [company, setCompany] = useState<Rec | null>(null);
  const [todayRec, setTodayRec] = useState<Rec | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const autoStartedRef = useRef<boolean>(false);

  const loadAll = useCallback(async () => {
    setInitLoading(true);
    try {
      const [st, emp, comp, atts] = await Promise.all([
        api.attendance.settings().catch(() => null),
        employeeId ? api.employees.get(employeeId).catch(() => null) : Promise.resolve(null),
        api.company.get().catch(() => null),
        api.attendance.list().catch(() => []),
      ]);
      setSettings(st);
      setEmployee(emp);
      setCompany(comp);
      const today = toLocalDate(new Date());
      const mine =
        (atts as Rec[]).find(
          (r) =>
            String(r.date ?? '') === today &&
            String(r.employee_name ?? '') === employeeName,
        ) ?? null;
      setTodayRec(mine);
    } finally {
      setInitLoading(false);
    }
  }, [employeeId, employeeName]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Ekran ochilganda avtomatik kamerani ishga tushirish
  useEffect(() => {
    if (initLoading) return;
    if (autoStartedRef.current) return;
    if (!employeeId) return;
    if (todayRec) return; // allaqachon davomatdan o'tgan
    autoStartedRef.current = true;
    // kichik kechikish — holat yangilangandan keyin
    const t = setTimeout(() => { void startScan(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initLoading, employeeId, todayRec]);

  const workStart = String(settings?.work_start_time ?? '');
  const workEnd = String(settings?.work_end_time ?? '');
  const grace = Number(settings?.grace_minutes ?? 10);
  const radius = Number(settings?.radius_m ?? 100);
  const companyLat = Number(company?.lat ?? NaN);
  const companyLng = Number(company?.lng ?? NaN);
  const avatarUrl = String(employee?.avatar ?? '');
  const now = new Date();
  const timeState = inWindow(now, workStart, workEnd, grace);

  const startScan = async () => {
    setMsg(null);
    setDistanceM(null);
    if (!employeeId) {
      setMsg({ ok: false, text: "Hisobingiz xodimga bog'lanmagan." });
      return;
    }
    if (!avatarUrl) {
      setMsg({ ok: false, text: "Admin siz uchun 3×4 rasm yuklamagan. Face ID ishlashi uchun admin profilingizga rasm yuklashi kerak." });
      return;
    }
    try {
      // 1) Vaqt
      if (!timeState.ok) {
        setMsg({ ok: false, text: `Ish vaqti emas (${workStart || '—'} — ${workEnd || '—'}).` });
        return;
      }
      // 2) Lokatsiya
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setMsg({ ok: false, text: 'Joylashuv ruxsati berilmadi.' });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      if (Number.isFinite(companyLat) && Number.isFinite(companyLng)) {
        const d = haversine(latitude, longitude, companyLat, companyLng);
        setDistanceM(d);
        if (d > radius) {
          setMsg({ ok: false, text: `Ish joyidan juda uzoqdasiz (${Math.round(d)} m / ruxsat ${radius} m).` });
          return;
        }
      }
      // 3) Face scan
      if (Platform.OS !== 'web') {
        // Native: biometric fallback
        try {
          const hasHw = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHw && enrolled) {
            const res = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Shaxsingizni tasdiqlang',
            });
            if (!res.success) {
              setMsg({ ok: false, text: 'Biometriya tasdiqlanmadi.' });
              return;
            }
          }
        } catch { /* ignore */ }
        await submitCheckin({ latitude, longitude, faceVerified: true });
        return;
      }
      setScanning(true);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Xato yuz berdi." });
    }
  };

  const submitCheckin = async (p: { latitude: number; longitude: number; faceVerified: boolean }) => {
    if (!employeeId) return;
    setBusy(true);
    try {
      await api.attendance.checkin({
        employee_id: employeeId,
        lat: p.latitude,
        lng: p.longitude,
        face_verified: p.faceVerified,
      });
      setMsg({
        ok: true,
        text: timeState.late
          ? "Davomat qayd qilindi — biroz kechikdingiz."
          : "Davomat muvaffaqiyatli qayd qilindi.",
      });
      await loadAll();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Davomatni saqlab bo'lmadi." });
    } finally {
      setBusy(false);
      setScanning(false);
    }
  };

  const onFaceCapture = useCallback(async (payload: { distance: number }) => {
    if (!coords) return;
    await submitCheckin({ latitude: coords.lat, longitude: coords.lng, faceVerified: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  const onFaceError = useCallback((text: string) => {
    setMsg({ ok: false, text });
    setScanning(false);
  }, []);

  if (initLoading) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  if (!employeeId) {
    return (
      <Screen>
        <Card>
          <Text style={s.errorTitle}>Hisob sozlanmagan</Text>
          <Text style={s.body}>
            Sizning hisobingiz biror xodimga bog'lanmagan. Iltimos, adminga murojaat qiling.
          </Text>
        </Card>
      </Screen>
    );
  }

  const alreadyChecked = Boolean(todayRec);

  // Allaqachon davomatdan o'tgan — minimal tasdiq
  if (alreadyChecked) {
    return (
      <View style={s.fullWhite}>
        <View style={s.doneBadge}>
          <Text style={s.doneCheck}>✓</Text>
        </View>
        <Text style={s.doneTitle}>Davomatdan o'tdingiz</Text>
        <Text style={s.doneTime}>{String(todayRec?.check_in ?? '')}</Text>
      </View>
    );
  }

  // Xato / shart bajarilmagan holat — kichik xabar, qayta urinish
  if (!scanning && msg && !msg.ok) {
    return (
      <View style={s.fullWhite}>
        <Text style={s.errIcon}>⚠️</Text>
        <Text style={s.errTitle}>{msg.text}</Text>
        <TouchableOpacity onPress={() => { setMsg(null); void startScan(); }} style={s.retryBtn}>
          <Text style={s.retryText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Asosiy: faqat oval ichida kamera, qolgan hamma joy oq
  return (
    <View style={s.fullWhite}>
      {scanning ? (
        <WebFaceScanner
          colors={colors}
          ovalW={260}
          ovalH={340}
          avatarUrl={avatarUrl}
          onCapture={onFaceCapture}
          onError={onFaceError}
          active={scanning}
        />
      ) : (
        <Loader />
      )}
    </View>
  );
};

const Preview: React.FC<{ url: string; size: number }> = ({ url, size }) => {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const host = ref.current;
    if (!host) return;
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '9999px';
    host.appendChild(img);
    return () => {
      try { host.removeChild(img); } catch { /* */ }
    };
  }, [url]);

  return (
    <View ref={ref} style={{ width: size, height: size, borderRadius: 9999, overflow: 'hidden', backgroundColor: '#000' }} />
  );
};

const ConditionCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  ok: boolean;
  warn?: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: Palette;
}> = ({ icon, label, value, ok, warn, styles: s, colors }) => {
  const col = !ok ? colors.red : warn ? colors.gold : colors.green;
  return (
    <View style={[s.condCard, { borderColor: col + '55', backgroundColor: col + '12' }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={s.condLabel}>{label}</Text>
      <Text style={[s.condValue, { color: col }]} numberOfLines={1}>{value}</Text>
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fullWhite: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    doneBadge: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    doneCheck: { color: '#FFFFFF', fontSize: 56, fontWeight: '900', lineHeight: 64 },
    doneTitle: { color: '#1A1715', fontSize: 20, fontWeight: '900', marginBottom: 6 },
    doneTime: { color: '#6B7280', fontSize: 15, fontWeight: '700' },
    errIcon: { fontSize: 48, marginBottom: 14 },
    errTitle: { color: '#1A1715', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: '#1A1715',
    },
    retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    scannerWrap: {
      alignItems: 'center',
      marginVertical: 12,
    },
    previewRing: {
      width: 300,
      height: 300,
      borderRadius: 9999,
      borderWidth: 3,
      padding: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewPlaceholder: {
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    previewHint: { color: c.muted, fontSize: 12, marginTop: 6, fontWeight: '600' },
    previewBadge: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: c.bg,
    },
    previewBadgeText: { color: '#1A1715', fontSize: 20, fontWeight: '900' },
    previewName: { color: c.text, fontSize: 18, fontWeight: '900', marginTop: 14 },
    previewTime: { color: c.muted, fontSize: 13, marginTop: 4, fontWeight: '600' },

    condRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    condCard: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      alignItems: 'center',
    },
    condLabel: { color: c.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },
    condValue: { fontSize: 13, fontWeight: '900', marginTop: 2 },

    cardTitle: {
      color: c.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    body: { color: c.text, fontSize: 15, marginBottom: 4 },
    big: { color: c.gold, fontSize: 34, fontWeight: '900', marginBottom: 4 },
    errorTitle: { color: c.red, fontSize: 16, fontWeight: '800', marginBottom: 6 },
    footer: { color: c.faint, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  });
