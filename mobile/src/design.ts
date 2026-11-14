/** Markaziy dizayn tokenlari — spacing, radius, typography, elevation.
 *  Fayl kichik — rangdan tashqari barcha vizual qoidalar shu yerda. */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '900' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '800' as const },
  h3: { fontSize: 15, fontWeight: '800' as const },
  body: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  tiny: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

export const elevation = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

/** Soft mint/sage gradient — asosiy aksent chiroyli ko'rinishi uchun. */
export const goldGradientStops = ['#A8D9C8', '#8AC9B6', '#5F9E8B'] as const;
