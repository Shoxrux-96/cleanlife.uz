import React, {  useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth';
import { Btn, Card, Field, Screen } from '../components';
import { colors, Palette } from '../theme';
import { useAppTheme } from '../theme-context';

export const LoginScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Login va parolni kiriting.');
      return;
    }
    setBusy(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kirishda xatolik.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={s.wrap}>
        <Text style={s.logo}>CLEAN LIFE</Text>
        <Text style={s.sub}>ERP • Mobil ilova</Text>
        <Card style={{ width: '100%', marginTop: 24 }}>
          <Field
            label="Login"
            value={username}
            onChange={setUsername}
            placeholder="admin yoki xodim logini"
          />
          <Field
            label="Parol"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            secure
          />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Btn title="Kirish" onPress={submit} busy={busy} />
        </Card>
        <Text style={s.hint}>
          Admin — to‘liq boshqaruv. Xodim — davomat va daromad.
        </Text>
      </View>
    </Screen>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { color: colors.gold, fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  sub: { color: colors.muted, marginTop: 4, letterSpacing: 2 },
  error: { color: colors.red, marginBottom: 8, fontSize: 13 },
  hint: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});
