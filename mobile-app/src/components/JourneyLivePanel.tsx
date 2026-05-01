import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { getJourneyNutritionPlan } from '../services/calories';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

function formatDuration(hours: number) {
  if (!hours || hours <= 0) return '0 m';
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} h ${m} m`;
}

export default function JourneyLivePanel() {
  const { user } = useAuth();
  const {
    isTracking,
    routeDistanceKm,
    routeDurationHours,
    estimatedKcal,
    isOverShift,
    fatigueWarningMessage,
    shiftHoursLimit,
  } = useLocation();

  const shiftProgress = shiftHoursLimit > 0 ? routeDurationHours / shiftHoursLimit : 0;
  const journeyTone = useMemo(() => {
    if (!isTracking) {
      return {
        label: 'Pausado',
        colors: {
          background: colors.warning,
          backgroundSoft: '#FEF3C7',
          border: '#F59E0B',
          text: '#92400E',
        },
      };
    }

    if (shiftProgress >= 1.2) {
      return {
        label: 'Rojo',
        colors: {
          background: colors.danger,
          backgroundSoft: '#FEE2E2',
          border: colors.danger,
          text: '#991B1B',
        },
      };
    }

    if (shiftProgress >= 0.8) {
      return {
        label: 'Amarillo',
        colors: {
          background: colors.warning,
          backgroundSoft: '#FFFBEB',
          border: '#F59E0B',
          text: '#92400E',
        },
      };
    }

    return {
      label: 'Verde',
      colors: {
        background: colors.success,
        backgroundSoft: '#F0FDF4',
        border: colors.success,
        text: '#166534',
      },
    };
  }, [isTracking, shiftProgress]);

  const nutritionPlan = useMemo(
    () => getJourneyNutritionPlan({ durationHours: routeDurationHours, estimatedKcal, nutritionPreference: user?.nutrition_preference }),
    [estimatedKcal, routeDurationHours, user?.nutrition_preference]
  );

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: journeyTone.colors.border,
          backgroundColor: journeyTone.colors.backgroundSoft,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Estado en vivo</Text>
          <Text style={styles.subtitle}>{isTracking ? 'La jornada esta en marcha' : 'Inicia el GPS para ver datos en directo'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: journeyTone.colors.background }]}>
          <Text style={[styles.badgeText, { color: journeyTone.colors.text }]}>{journeyTone.label}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Distancia</Text>
          <Text style={styles.metricValue}>{routeDistanceKm.toFixed(2)} km</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Duracion</Text>
          <Text style={styles.metricValue}>{formatDuration(routeDurationHours)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Gasto estimado</Text>
          <Text style={styles.metricValue}>{estimatedKcal} kcal</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Ritmo</Text>
          <Text style={styles.metricValue}>{isOverShift ? 'Fatiga' : 'Normal'}</Text>
        </View>
      </View>

      {isOverShift ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Aviso de cansancio</Text>
          <Text style={styles.warningText}>{fatigueWarningMessage}</Text>
        </View>
      ) : null}

      <View style={styles.nutritionBox}>
        <Text style={styles.nutritionTitle}>{nutritionPlan.headline}</Text>
        <Text style={styles.nutritionNote}>{nutritionPlan.note}</Text>
        <View style={styles.suggestionList}>
          {nutritionPlan.suggestions.slice(0, 4).map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.suggestionRow}>
              <Text style={styles.suggestionBullet}>-</Text>
              <Text style={styles.suggestionText}>
                {item.name}{item.portion ? ` (${item.portion})` : ''} | {item.kcal} kcal
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricBox: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  metricLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '800',
  },
  warningBox: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
  },
  warningTitle: {
    color: '#92400E',
    fontWeight: '800',
    marginBottom: 4,
  },
  warningText: {
    color: '#78350F',
    ...typography.small,
  },
  nutritionBox: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  nutritionTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '800',
  },
  nutritionNote: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  suggestionList: {
    gap: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  suggestionBullet: {
    color: colors.primary,
    fontWeight: '900',
    width: 12,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    ...typography.small,
  },
});
