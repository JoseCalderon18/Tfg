import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getColors, lightColors, darkColors } from '../theme';

export interface ThemedColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSoft: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  white: string;
}

export function useThemeColors(): ThemedColors {
  const { isDark } = useTheme();
  return useMemo(() => getColors(isDark), [isDark]);
}

export function useThemeMode() {
  return useTheme();
}
