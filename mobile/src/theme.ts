export const colors = {
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

export const fmtMoney = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(v)) return '0';
  return v.toLocaleString('uz-UZ') + " so'm";
};
