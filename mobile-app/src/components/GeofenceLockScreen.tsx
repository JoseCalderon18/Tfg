import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useLocation } from '../context/LocationContext';
import { colors } from '../theme';

function formatReadableAddress(address: Location.LocationGeocodedAddress) {
  const street = [address.street, address.streetNumber].filter(Boolean).join(' ').trim();
  const city = address.city || address.subregion || address.region;
  const parts = [street, city, address.country].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : null;
}

export default function GeofenceLockScreen() {
  const {
    geofenceStatus,
    isCheckingWorkarea,
    location,
    refreshWorkareaDetection,
  } = useLocation();
  const visible = geofenceStatus.hasWorkarea && !geofenceStatus.inside;
  const [readableLocation, setReadableLocation] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  useEffect(() => {
    if (!visible || !location) {
      setReadableLocation(null);
      setIsResolvingLocation(false);
      return;
    }

    let cancelled = false;
    setIsResolvingLocation(true);

    void Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    })
      .then((addresses) => {
        if (cancelled) {
          return;
        }

        const nextReadableLocation = addresses[0] ? formatReadableAddress(addresses[0]) : null;
        setReadableLocation(nextReadableLocation);
      })
      .catch(() => {
        if (!cancelled) {
          setReadableLocation(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingLocation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, visible]);

  const lastLocationText = location
    ? readableLocation ??
      (isResolvingLocation
        ? 'Buscando ubicacion...'
        : `Lat ${location.coords.latitude.toFixed(6)} | Lng ${location.coords.longitude.toFixed(6)}`)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Fuera de la zona asignada</Text>
        <Text style={styles.message}>
          {geofenceStatus.message ?? 'Has salido del area de trabajo. Vuelve dentro del workarea para continuar.'}
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.label}>Estado</Text>
          <Text style={styles.value}>Alerta enviada al centro operativo</Text>

          {location ? (
            <>
              <Text style={styles.label}>Ultima ubicacion</Text>
              <Text style={styles.value}>{lastLocationText}</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, isCheckingWorkarea ? styles.refreshButtonDisabled : null]}
          onPress={refreshWorkareaDetection}
          disabled={isCheckingWorkarea}
        >
          <Text style={styles.refreshButtonText}>
            {isCheckingWorkarea ? 'Actualizando...' : 'Actualizar zona'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Esta pantalla se cerrara automaticamente cuando vuelvas dentro del area de trabajo.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 28,
  },
  statusBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 15,
    marginTop: 4,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  refreshButtonDisabled: {
    opacity: 0.65,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 24,
    textAlign: 'center',
  },
});
