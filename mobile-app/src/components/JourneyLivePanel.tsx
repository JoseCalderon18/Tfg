import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  const {
    isTracking,
    routeDistanceKm,
    routeDurationHours,
    estimatedKcal,
    isOverShift,
    fatigueWarningMessage,
  } = useLocation();

  const nutritionPlan = useMemo(
    () => getJourneyNutritionPlan({ durationHours: routeDurationHours, estimatedKcal }),
    [estimatedKcal, routeDurationHours]
  );

  return (
    <View style={[styles.card, isTracking ? styles.trackingActive : styles.trackingInactive]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Estado en vivo</Text>
          <Text style={styles.subtitle}>{isTracking ? 'La jornada está en marcha' : 'Inicia el GPS para ver datos en directo'}</Text>
        </View>
        <View style={[styles.badge, isTracking ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{isTracking ? 'Activo' : 'Pausado'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Distancia</Text>
          <Text style={styles.metricValue}>{routeDistanceKm.toFixed(2)} km</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Duración</Text>
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
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>
                {item.name}{item.portion ? ` (${item.portion})` : ''} · {item.kcal} kcal
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
  trackingActive: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  trackingInactive: {
    borderColor: colors.danger,
    backgroundColor: '#fef2f2',
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
  badgeActive: {
    backgroundColor: colors.success,
  },
  badgeInactive: {
    backgroundColor: colors.warning,
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
