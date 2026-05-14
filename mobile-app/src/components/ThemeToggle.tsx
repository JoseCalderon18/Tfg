import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, borderRadius } from '../theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Claro', icon: '☀️' },
  { mode: 'dark', label: 'Oscuro', icon: '🌙' },
  { mode: 'system', label: 'Sistema', icon: '⚙️' },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Tema</Text>
      <View style={styles.buttonGroup}>
        {THEME_OPTIONS.map(({ mode: themeMode, label, icon }) => (
          <TouchableOpacity
            key={themeMode}
            style={[
              styles.button,
              {
                backgroundColor:
                  mode === themeMode ? colors.primary : colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
            onPress={() => void setMode(themeMode)}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: mode === themeMode ? '#fff' : colors.text,
                },
              ]}
            >
              {icon} {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
