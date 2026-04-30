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
    fontWeight: '700',
  },
  title: {
    marginTop: 28,
    color: colors.text,
    fontSize: 30,
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
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
    borderColor: colors.border,
                Última sincronización:{'\n'}
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Sin registros'}
    gap: 10,
              {lastError && <Text style={styles.errorText}>❌ Error: {lastError}</Text>}
              <TouchableOpacity style={styles.syncButton} onPress={() => void flushQueue()} activeOpacity={0.85}>
                <Text style={styles.syncButtonText}>🔄 Sincronizar ahora</Text>
              </TouchableOpacity>
            </View>

            {/* API URLs Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔗 URLs de API detectadas</Text>
              <View style={styles.urlContainer}>
                {urls.length > 0 ? (
                  urls.map((url) => (
                    <Text key={url} style={styles.urlValue}>{url}</Text>
                  ))
                ) : (
                  <Text style={styles.cardValue}>Sin URLs detectadas</Text>
                )}
              </View>
    fontSize: 14,
    textTransform: 'uppercase',
            {/* Best Practices Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💡 Recomendaciones</Text>
              <View style={styles.tipsContainer}>
                <Text style={styles.tip}>📍 Activa el GPS antes de iniciar jornada</Text>
                <Text style={styles.tip}>💻 En Android por USB usa <Text style={styles.tipCode}>adb reverse tcp:8000 tcp:8000</Text></Text>
                <Text style={styles.tip}>⏸️ Registra descansos para que queden reflejados en la ruta</Text>
                <Text style={styles.tip}>⚡ Mantén la app en primer plano durante operaciones</Text>
              </View>
            </View>
  },
            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
              activeOpacity={0.85}
            >
              <Text style={styles.backButtonText}>← Volver</Text>
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
