import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { shadows, borderRadius, spacing } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  elevated?: boolean;
  active?: boolean;
}

export function Card({
  children,
  onPress,
  style,
  variant = 'default',
  elevated = true,
  active = false,
}: CardProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  
  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return {
          borderColor: colors.success,
          backgroundColor: isDark ? '#1e3a0a' : '#f0fdf4',
        };
      case 'warning':
        return {
          borderColor: colors.warning,
          backgroundColor: isDark ? '#3d2700' : '#fffbeb',
        };
      case 'danger':
        return {
          borderColor: colors.danger,
          backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
        };
      case 'info':
        return {
          borderColor: colors.primary,
          backgroundColor: isDark ? '#0c1e2e' : '#f0f9ff',
        };
      default:
        return {
          borderColor: colors.border,
        };
    }
  };

  const baseCardStyle = {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
  };

  const cardStyle = [
    baseCardStyle,
    elevated && shadows.md,
    getVariantStyle(),
    active && { borderWidth: 2 },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
