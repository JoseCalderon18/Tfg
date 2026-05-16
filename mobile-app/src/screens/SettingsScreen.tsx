import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { getApiDebugUrls } from '../services/api';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

type ThemeColorSet = ReturnType<typeof useThemeColors>;

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Sin registros';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(username?: string | null) {
  const cleanName = (username ?? '').trim();
  if (!cleanName) {
    return 'OP';
  }

  return cleanName.slice(0, 2).toUpperCase();
}

export default function SettingsScreen({ navigation }: any) {
  const urls = getApiDebugUrls();
  const { user } = useAuth();
  const { pendingCount, isSyncing, lastSyncedAt, lastError, flushQueue } = useOfflineSync();
  const themeColors = useThemeColors();

  const syncLabel = useMemo(() => {
    if (isSyncing) {
      return 'Sincronizando';
    }

    if (pendingCount > 0) {
      return `${pendingCount} pendiente(s)`;
    }

    return 'Al dia';
  }, [isSyncing, pendingCount]);

  const syncTone = pendingCount > 0 || lastError ? themeColors.warning : themeColors.success;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={[styles.screen, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.backButtonText, { color: themeColors.text }]}>Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: themeColors.primary }]}>Ajustes</Text>
          <Text style={[styles.title, { color: themeColors.text }]}>Configuracion operativa</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            Control rapido de sesion, sincronizacion, conexion y preferencias de la app.
          </Text>
        </View>

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: themeColors.primarySoft, borderColor: themeColors.primary }]}>
            <Text style={[styles.avatarText, { color: themeColors.primary }]}>{getInitials(user?.username)}</Text>
          </View>
          <View style={styles.profileBody}>
            <Text style={[styles.profileName, { color: themeColors.text }]}>{user?.username || 'Usuario operativo'}</Text>
            <Text style={[styles.profileMeta, { color: themeColors.textMuted }]}>
              {user?.role || 'Rol sin definir'} | {user?.organization_name || 'Sin organizacion'}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: syncTone }]}>
            <Text style={styles.statusPillText}>{syncLabel}</Text>
          </View>
        </View>

        <SettingsCard title="Preferencias" themeColors={themeColors}>
          <ThemeToggle />
        </SettingsCard>

        <SettingsCard title="Sincronizacion offline" themeColors={themeColors}>
          <View style={styles.metricGrid}>
            <Metric label="Pendientes" value={String(pendingCount)} themeColors={themeColors} />
            <Metric label="Estado" value={isSyncing ? 'En curso' : 'En espera'} themeColors={themeColors} />
          </View>

          <InfoRow label="Ultima sincronizacion" value={formatDateTime(lastSyncedAt)} themeColors={themeColors} />
          {lastError ? <Text style={[styles.errorText, { color: themeColors.danger }]}>{lastError}</Text> : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: isSyncing ? themeColors.surfaceMuted : themeColors.primary,
              },
            ]}
            onPress={() => void flushQueue()}
            activeOpacity={0.85}
            disabled={isSyncing}
          >
            <Text style={styles.primaryButtonText}>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</Text>
          </TouchableOpacity>
        </SettingsCard>

        <SettingsCard title="Conexion API" themeColors={themeColors}>
          <Text style={[styles.cardDescription, { color: themeColors.textMuted }]}>
            La app intentara estas rutas en orden hasta conectar con el backend.
          </Text>
          {urls.length > 0 ? (
            urls.map((url, index) => (
              <View
                key={url}
                style={[
                  styles.urlRow,
                  {
                    backgroundColor: themeColors.surfaceMuted,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Text style={[styles.urlIndex, { color: themeColors.primary }]}>#{index + 1}</Text>
                <Text style={[styles.urlValue, { color: themeColors.text }]} numberOfLines={2}>
                  {url}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.cardValue, { color: themeColors.textMuted }]}>Sin URLs detectadas</Text>
          )}
        </SettingsCard>

        <SettingsCard title="Preparacion en terreno" themeColors={themeColors}>
          <Tip text="Activa el GPS antes de iniciar jornada." themeColors={themeColors} />
          <Tip text="En Android por USB usa: adb reverse tcp:8000 tcp:8000." themeColors={themeColors} />
          <Tip text="Sincroniza antes de salir si hay operaciones pendientes." themeColors={themeColors} />
          <Tip text="Registra descansos para conservar trazabilidad de la ruta." themeColors={themeColors} />
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsCard({
  title,
  children,
  themeColors,
}: {
  title: string;
  children: React.ReactNode;
  themeColors: ThemeColorSet;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        },
      ]}
    >
      <Text style={[styles.cardTitle, { color: themeColors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Metric({ label, value, themeColors }: { label: string; value: string; themeColors: ThemeColorSet }) {
  return (
    <View style={[styles.metricBox, { backgroundColor: themeColors.surfaceMuted, borderColor: themeColors.border }]}>
      <Text style={[styles.metricValue, { color: themeColors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: themeColors.textMuted }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, themeColors }: { label: string; value: string; themeColors: ThemeColorSet }) {
  return (
    <View style={[styles.infoRow, { borderTopColor: themeColors.border }]}>
      <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: themeColors.text }]}>{value}</Text>
    </View>
  );
}

function Tip({ text, themeColors }: { text: string; themeColors: ThemeColorSet }) {
  return (
    <View style={styles.tipRow}>
      <View style={[styles.tipDot, { backgroundColor: themeColors.primary }]} />
      <Text style={[styles.tip, { color: themeColors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  backButton: {
    minHeight: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.heading2,
    color: colors.text,
  },
  subtitle: {
    ...typography.body2,
    color: colors.textMuted,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  profileBody: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '900',
  },
  profileMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  statusPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cardDescription: {
    ...typography.body2,
  },
  cardValue: {
    ...typography.body2,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  urlRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  urlIndex: {
    width: 28,
    fontSize: 12,
    fontWeight: '900',
  },
  urlValue: {
    flex: 1,
    ...typography.small,
    fontFamily: 'Courier',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  tip: {
    flex: 1,
    ...typography.body2,
  },
});
