import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, SafeAreaView } from 'react-native';

import { useOfflineSync } from '../context/OfflineSyncContext';
import { getApiDebugUrls } from '../services/api';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

export default function SettingsScreen({ navigation }: any) {
  const urls = getApiDebugUrls();
  const { pendingCount, isSyncing, lastSyncedAt, lastError, flushQueue } = useOfflineSync();

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Configuracion operativa</Text>
      <Text style={styles.subtitle}>Referencia rapida para conexion y uso en terreno.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de sincronizacion</Text>
        <Text style={styles.cardValue}>Pendientes: {pendingCount}</Text>
        <Text style={styles.cardValue}>Estado: {isSyncing ? 'Sincronizando...' : 'En espera'}</Text>
        <Text style={styles.cardValue}>
          Ultima sincronizacion: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Sin registros'}
        </Text>
        {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}
        <TouchableOpacity style={styles.syncButton} onPress={() => void flushQueue()}>
          <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>URLs de API detectadas</Text>
        {urls.map((url) => (
          <Text key={url} style={styles.cardValue}>{url}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Buenas practicas</Text>
        <Text style={styles.tip}>- Activa el GPS antes de iniciar jornada.</Text>
        <Text style={styles.tip}>- En Android por USB usa `adb reverse tcp:8000 tcp:8000`.</Text>
        <Text style={styles.tip}>- Registra descansos para que queden reflejados en la ruta.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-end',
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: colors.text,
    padding: spacing.lg,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.xxxl,
    paddingTop: spacing.md,
              <Text style={styles.title}>Configuración operativa</Text>
              <Text style={styles.subtitle}>Referencia rápida para conexión y uso en terreno</Text>
            </View>
  card: {
            {/* Sync Status Card */}
            <View style={[styles.card, styles.syncCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📡 Estado de sincronización</Text>
                <View style={[styles.statusIndicator, isSyncing ? styles.syncingStatus : styles.syncedStatus]} />
              </View>
              <Text style={styles.cardValue}>Elementos en cola: {pendingCount}</Text>
              <Text style={styles.cardValue}>Estado: <Text style={{ fontWeight: '600' }}>{isSyncing ? 'Sincronizando...' : 'En espera'}</Text></Text>
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Sin registros'}
    gap: 10,
              {lastError && <Text style={styles.errorText}>❌ Error: {lastError}</Text>}
    padding: spacing.lg,
    ...shadows.md,
              </TouchableOpacity>
  syncCard: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
            </View>

    marginBottom: spacing.md,
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
                {urls.length > 0 ? (
                  urls.map((url) => (
    ...typography.body,
                ) : (
    marginBottom: spacing.sm,
  },
  urlContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  urlValue: {
    ...typography.small,
    color: colors.textMuted,
    fontFamily: 'Courier',
    marginBottom: spacing.sm,
  },
  tipsContainer: {
    gap: spacing.md,
                )}
              </View>
    ...typography.body,
            {/* Best Practices Card */}
    marginBottom: spacing.md,
  },
  tipCode: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    fontFamily: 'Courier',
    color: colors.primary,
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💡 Recomendaciones</Text>
    ...typography.body,
    color: colors.danger,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: borderRadius.md,
                <Text style={styles.tip}>⏸️ Registra descansos para que queden reflejados en la ruta</Text>
                <Text style={styles.tip}>⚡ Mantén la app en primer plano durante operaciones</Text>
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
            {/* Back Button */}
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
              style={styles.backButton}
              activeOpacity={0.85}
    ...typography.subtitle,
            >
              <Text style={styles.backButtonText}>← Volver</Text>
  backButton: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  backButtonText: {
    ...typography.subtitle,
    color: colors.text,
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  syncButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
