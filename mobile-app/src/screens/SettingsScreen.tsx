import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useOfflineSync } from '../context/OfflineSyncContext';
import { getApiDebugUrls } from '../services/api';
import { borderRadius, colors, shadows, spacing } from '../theme';

export default function SettingsScreen({ navigation }: any) {
  const urls = getApiDebugUrls();
  const { pendingCount, isSyncing, lastSyncedAt, lastError, flushQueue } = useOfflineSync();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuracion operativa</Text>
        <Text style={styles.subtitle}>Referencia rapida para conexion y uso en terreno.</Text>
      </View>

      <View style={[styles.card, styles.syncCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Estado de sincronizacion</Text>
          <View style={[styles.statusIndicator, isSyncing ? styles.syncingStatus : styles.syncedStatus]} />
        </View>

        <Text style={styles.cardValue}>Elementos en cola: {pendingCount}</Text>
        <Text style={styles.cardValue}>Estado: {isSyncing ? 'Sincronizando...' : 'En espera'}</Text>
        <Text style={styles.cardValue}>
          Ultima sincronizacion: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Sin registros'}
        </Text>

        {lastError ? <Text style={styles.errorText}>Error: {lastError}</Text> : null}

        <TouchableOpacity style={styles.syncButton} onPress={() => void flushQueue()} disabled={isSyncing}>
          <Text style={styles.syncButtonText}>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>URLs de API detectadas</Text>
        <View style={styles.urlContainer}>
          {urls.length > 0 ? (
            urls.map((url) => (
              <Text key={url} style={styles.urlValue}>
                {url}
              </Text>
            ))
          ) : (
            <Text style={styles.cardValue}>No se han detectado URLs.</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Buenas practicas</Text>
        <View style={styles.tipsContainer}>
          <Text style={styles.tip}>- Activa el GPS antes de iniciar jornada.</Text>
          <Text style={styles.tip}>- Verifica que la URL detectada apunte al backend desplegado.</Text>
          <Text style={styles.tip}>- Registra descansos para que queden reflejados en la ruta.</Text>
          <Text style={styles.tip}>- Manten la app en primer plano durante operaciones criticas.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.md,
  },
  syncCard: {
    borderColor: colors.primary,
  },
  cardHeader: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
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
  cardValue: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
    color: colors.textSoft,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  syncButtonText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    fontWeight: '700',
  },
  urlContainer: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  urlValue: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontFamily: 'Courier',
  },
  tipsContainer: {
    gap: spacing.md,
  },
  tip: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSoft,
  },
});
