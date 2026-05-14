import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius, spacing, typography, shadows } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
}: ButtonProps) {
  const colors = useThemeColors();

  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.surfaceMuted,
          ...shadows.sm,
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          ...shadows.md,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          ...shadows.md,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning,
          ...shadows.md,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.border,
        };
      default:
        return {
          backgroundColor: colors.primary,
          ...shadows.md,
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          minHeight: 40,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          minHeight: 48,
        };
    }
  };

  const baseButtonStyle = {
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const buttonTextStyle = {
    ...typography.subtitle,
    color: variant === 'outline' ? colors.text : colors.white,
  };

  return (
    <TouchableOpacity
      style={[
        baseButtonStyle,
        getVariantStyle(),
        getSizeStyle(),
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={buttonTextStyle}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
