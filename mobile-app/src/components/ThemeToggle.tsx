import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, borderRadius } from '../theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Claro', icon: 'L' },
  { mode: 'dark', label: 'Oscuro', icon: 'D' },
  { mode: 'system', label: 'Sistema', icon: 'S' },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Tema de la aplicacion</Text>
      <View style={styles.buttonGroup}>
        {THEME_OPTIONS.map(({ mode: themeMode, label, icon }) => (
          <TouchableOpacity
            key={themeMode}
            style={[
              styles.button,
              {
                backgroundColor: mode === themeMode ? colors.primary : colors.surfaceMuted,
                borderColor: mode === themeMode ? colors.primary : colors.border,
              },
            ]}
            onPress={() => void setMode(themeMode)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.iconText,
                {
                  color: mode === themeMode ? '#fff' : colors.primary,
                },
              ]}
            >
              {icon}
            </Text>
            <Text
              style={[
                styles.buttonText,
                {
                  color: mode === themeMode ? '#fff' : colors.text,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 58,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '900',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
