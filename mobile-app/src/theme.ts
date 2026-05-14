export const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#64748B',
  textSoft: '#475569',
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  success: '#16A34A',
  warning: '#EAB308',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  overlay: 'rgba(15, 23, 42, 0.55)',
  white: '#FFFFFF',
};

export const darkColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceMuted: '#334155',
  border: '#475569',
  borderStrong: '#64748B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textSoft: '#CBD5E1',
  primary: '#3B82F6',
  primarySoft: '#1E3A8A',
  success: '#22C55E',
  warning: '#FACC15',
  danger: '#EF4444',
  dangerSoft: '#7F1D1D',
  overlay: 'rgba(255, 255, 255, 0.15)',
  white: '#FFFFFF',
};

export const colors = lightColors;

export function getColors(isDark: boolean) {
  return isDark ? darkColors : lightColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
  },
  heading2: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  heading3: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};
