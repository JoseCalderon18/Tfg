import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeToggle } from '../components/ThemeToggle';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { getApiDebugUrls } from '../services/api';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

export default function SettingsScreen({ navigation }: any) {
  const urls = getApiDebugUrls();
  const { pendingCount, isSyncing, lastSyncedAt, lastError, flushQueue } = useOfflineSync();
  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={[styles.screen, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Configuracion operativa</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
            Referencia rapida para conexion y uso en terreno.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <ThemeToggle />
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Cuenta</Text>
          <Text style={[styles.cardValue, { color: themeColors.textMuted }]}>
            Cambia la contrasena desde la app sin salir del entorno operativo.
          </Text>
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: themeColors.primary }]}
            onPress={() => navigation.navigate('ResetPassword')}
          >
            <Text style={styles.syncButtonText}>Resetear contrasena</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Estado de sincronizacion</Text>
            <View style={[styles.statusIndicator, isSyncing ? styles.syncingStatus : styles.syncedStatus]} />
          </View>
          <Text style={[styles.cardValue, { color: themeColors.text }]}>Pendientes: {pendingCount}</Text>
          <Text style={[styles.cardValue, { color: themeColors.text }]}>
            Estado: {isSyncing ? 'Sincronizando...' : 'En espera'}
          </Text>
          <Text style={[styles.cardValue, { color: themeColors.text }]}>
            Ultima sincronizacion: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Sin registros'}
          </Text>
          {lastError ? <Text style={[styles.errorText, { color: themeColors.danger }]}>{lastError}</Text> : null}
          <TouchableOpacity style={[styles.syncButton, { backgroundColor: themeColors.primary }]} onPress={() => void flushQueue()}>
            <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>URLs de API detectadas</Text>
          {urls.length > 0 ? (
            urls.map((url) => (
              <Text key={url} style={[styles.urlValue, { color: themeColors.textMuted }]}>
                {url}
              </Text>
            ))
          ) : (
            <Text style={[styles.cardValue, { color: themeColors.textMuted }]}>Sin URLs detectadas</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Buenas practicas</Text>
          <Text style={[styles.tip, { color: themeColors.text }]}>- Activa el GPS antes de iniciar jornada.</Text>
          <Text style={[styles.tip, { color: themeColors.text }]}>- En Android por USB usa adb reverse tcp:8000 tcp:8000.</Text>
          <Text style={[styles.tip, { color: themeColors.text }]}>- Registra descansos para que queden reflejados en la ruta.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: 20,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardValue: {
    ...typography.body,
    color: colors.text,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  syncingStatus: {
    backgroundColor: colors.warning,
  },
  syncedStatus: {
    backgroundColor: colors.success,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  syncButton: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  syncButtonText: {
    ...typography.subtitle,
    color: colors.white,
  },
  urlValue: {
    ...typography.small,
    color: colors.textMuted,
    fontFamily: 'Courier',
    marginBottom: spacing.xs,
  },
  tip: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
});
