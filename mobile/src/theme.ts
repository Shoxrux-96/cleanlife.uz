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

// Yangi palitra: soft sage/mint + warm cream — "Clean Life" brandiga mos:
// toza, yangi, ko'zga yoqimli, mayin ranglar. `gold` maydon nomi
// tarixiy sabablarga ko'ra saqlangan, lekin qiymati endi sage/mint tus.

export const darkColors: Palette = {
  bg: '#141B1A',          // chuqur sage-ko'mir
  card: '#1D2624',        // yumshoq qorong'i yashil-kulrang
  cardBorder: '#2D3937',  // noziq border
  gold: '#8AC9B6',        // soft mint — asosiy aksent
  goldDark: '#5F9E8B',    // chuqurroq mint
  text: '#ECF3F0',        // deyarli oq (yashil tusli)
  muted: '#8FA39E',       // mayin yashil-kulrang
  faint: '#5D6D69',       // juda xira
  green: '#6EDBB2',       // muvaffaqiyat (fresh mint)
  red: '#F19B9B',         // mayin coral
  blue: '#8FB8E0',        // mayin sky blue
  input: '#182120',       // card'dan biroz quyuq
};

export const lightColors: Palette = {
  bg: '#F5F2EC',          // issiq cream
  card: '#FFFFFF',        // sof oq
  cardBorder: '#E5EAE6',  // yumshoq sage border
  gold: '#4FA68B',        // o'rtacha mint/sage — asosiy aksent
  goldDark: '#3A7F6B',    // chuqurroq
  text: '#1D2A27',        // chuqur yashil-qora
  muted: '#6B7D78',       // mayin
  faint: '#A5B5B0',       // juda xira
  green: '#3FA07D',       // toza success
  red: '#D97979',         // mayin coral (light mode)
  blue: '#5B8EC4',        // mayin sky
  input: '#F0EBE2',       // cream'dan quyuqroq
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
