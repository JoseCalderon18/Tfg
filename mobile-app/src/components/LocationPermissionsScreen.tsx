import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useLocation } from '../context/LocationContext';
import { colors } from '../theme';

function formatPermissionStatus(status: Location.PermissionStatus | null) {
  if (status === Location.PermissionStatus.GRANTED) {
    return 'Concedido';
  }

  if (status === Location.PermissionStatus.DENIED) {
    return 'Denegado';
  }

  if (status === Location.PermissionStatus.UNDETERMINED) {
    return 'Pendiente';
  }

  return 'Sin comprobar';
}

export default function LocationPermissionsScreen() {
  const {
    foregroundPermissionStatus,
    backgroundPermissionStatus,
    hasRequiredLocationPermissions,
    refreshLocationPermissions,
    requestLocationPermissions,
    openLocationSettings,
  } = useLocation();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void refreshLocationPermissions();
  }, []);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      await requestLocationPermissions();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshLocationPermissions();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Modal visible={!hasRequiredLocationPermissions} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Permisos incompletos</Text>
        <Text style={styles.message}>
          La app necesita ubicacion mientras esta abierta y ubicacion siempre activa para mantener el
          seguimiento, comprobar el workarea y avisar si sales de la zona asignada aunque la pantalla se bloquee.
        </Text>

        <View style={styles.statusBox}>
          <PermissionRow label="Ubicacion en uso" value={formatPermissionStatus(foregroundPermissionStatus)} />
          <PermissionRow label="Ubicacion en segundo plano" value={formatPermissionStatus(backgroundPermissionStatus)} />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isRequesting ? styles.disabledButton : null]}
          onPress={handleRequestPermissions}
          disabled={isRequesting}
        >
          {isRequesting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Permitir ubicacion</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={openLocationSettings}>
          <Text style={styles.secondaryButtonText}>Abrir ajustes de la app</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.textButton, isRefreshing ? styles.disabledButton : null]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <Text style={styles.textButtonText}>{isRefreshing ? 'Comprobando...' : 'Ya lo he cambiado'}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          En Android, si el sistema no muestra el permiso de segundo plano, entra en Ajustes y selecciona
          Permitir todo el tiempo en Ubicacion.
        </Text>
      </View>
    </Modal>
  );
}

function PermissionRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.permissionRow}>
      <Text style={styles.permissionLabel}>{label}</Text>
      <Text style={styles.permissionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: colors.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
    textAlign: 'center',
  },
  statusBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 18,
    padding: 16,
  },
  permissionRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  permissionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  permissionValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  textButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  textButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 22,
    textAlign: 'center',
  },
});
