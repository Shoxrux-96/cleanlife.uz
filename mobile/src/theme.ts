export type ThemeName = 'dark' | 'light';

export type Palette = {
  bg: string;
  card: string;
  cardBorder: string;
  gold: string;
  goldDark: string;
  text: string;
  muted: string;
  faint: string;
  green: string;
  red: string;
  blue: string;
  input: string;
};

export const darkColors: Palette = {
  bg: '#121110',
  card: '#1A1815',
  cardBorder: '#332A22',
  gold: '#D4AF37',
  goldDark: '#8C6207',
  text: '#FAF7F2',
  muted: '#A69C8E',
  faint: '#6B6152',
  green: '#34D399',
  red: '#F87171',
  blue: '#64B5F6',
  input: '#141210',
};

export const lightColors: Palette = {
  bg: '#FAF7F2',
  card: '#FFFFFF',
  cardBorder: '#E6DED1',
  gold: '#B3871C',
  goldDark: '#8C6207',
  text: '#1A1715',
  muted: '#6B6152',
  faint: '#A69C8E',
  green: '#059669',
  red: '#DC2626',
  blue: '#2563EB',
  input: '#F3EEE4',
};

export const getPalette = (name: ThemeName): Palette =>
  name === 'light' ? lightColors : darkColors;

// Legacy export — dark palitra. Yangi kod `useAppTheme().colors` ni ishlatadi.
export const colors = darkColors;

export const fmtMoney = (n: number | string): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('uz-UZ') + " so'm";
};
