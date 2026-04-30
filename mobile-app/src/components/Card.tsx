import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, shadows, borderRadius, spacing } from '../theme';

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
  const Component = onPress ? TouchableOpacity : View;
  
  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return styles.cardSuccess;
      case 'warning':
        return styles.cardWarning;
      case 'danger':
        return styles.cardDanger;
      case 'info':
        return styles.cardInfo;
      default:
        return styles.cardDefault;
    }
  };

  return (
    <Component
      style={[
        styles.card,
        elevated && shadows.md,
        getVariantStyle(),
        active && styles.cardActive,
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  cardDefault: {
    borderColor: colors.border,
  },
  cardSuccess: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  cardWarning: {
    borderColor: colors.warning,
    backgroundColor: '#fffbeb',
  },
  cardDanger: {
    borderColor: colors.danger,
    backgroundColor: '#fef2f2',
  },
  cardInfo: {
    borderColor: colors.primary,
    backgroundColor: '#f0f9ff',
  },
  cardActive: {
    borderWidth: 2,
  },
});
