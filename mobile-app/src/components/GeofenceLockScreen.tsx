import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useLocation } from '../context/LocationContext';
import { colors } from '../theme';

function formatearDireccionLegible(direccion: Location.LocationGeocodedAddress) {
  const calle = [direccion.street, direccion.streetNumber].filter(Boolean).join(' ').trim();
  const ciudad = direccion.city || direccion.subregion || direccion.region;
  const partes = [calle, ciudad, direccion.country].filter(Boolean);

  return partes.length > 0 ? partes.join(', ') : null;
}

export default function PantallaBloqueoGeofence() {
  const {
    geofenceStatus,
    isCheckingWorkarea,
    location,
    refreshWorkareaDetection,
  } = useLocation();
  const visible = geofenceStatus.hasWorkarea && !geofenceStatus.inside;
  const [ubicacionLegible, setUbicacionLegible] = useState<string | null>(null);
  const [resolviendoUbicacion, setResolviendoUbicacion] = useState(false);

  useEffect(() => {
    if (!visible || !location) {
      setUbicacionLegible(null);
      setResolviendoUbicacion(false);
      return;
    }

    let cancelado = false;
    setResolviendoUbicacion(true);

    void Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    })
      .then((direcciones) => {
        if (cancelado) {
          return;
        }

        const siguienteUbicacionLegible = direcciones[0] ? formatearDireccionLegible(direcciones[0]) : null;
        setUbicacionLegible(siguienteUbicacionLegible);
      })
      .catch(() => {
        if (!cancelado) {
          setUbicacionLegible(null);
        }
      })
      .finally(() => {
        if (!cancelado) {
          setResolviendoUbicacion(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [location, visible]);

  const textoUltimaUbicacion = location
    ? ubicacionLegible ??
      (resolviendoUbicacion
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
      <View style={estilos.container}>
        <Text style={estilos.title}>Fuera de la zona asignada</Text>
        <Text style={estilos.message}>
          {geofenceStatus.message ?? 'Has salido del area de trabajo. Vuelve dentro del workarea para continuar.'}
        </Text>

        <View style={estilos.statusBox}>
          <Text style={estilos.label}>Estado</Text>
          <Text style={estilos.value}>Alerta enviada al centro operativo</Text>

          {location ? (
            <>
              <Text style={estilos.label}>Ultima ubicacion</Text>
              <Text style={estilos.value}>{textoUltimaUbicacion}</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          style={[estilos.refreshButton, isCheckingWorkarea ? estilos.refreshButtonDisabled : null]}
          onPress={refreshWorkareaDetection}
          disabled={isCheckingWorkarea}
        >
          <Text style={estilos.refreshButtonText}>
            {isCheckingWorkarea ? 'Actualizando...' : 'Actualizar zona'}
          </Text>
        </TouchableOpacity>

        <Text style={estilos.footer}>
          Esta pantalla se cerrara automaticamente cuando vuelvas dentro del area de trabajo.
        </Text>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
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
