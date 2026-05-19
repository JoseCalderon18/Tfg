import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { User, useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

const UMBRAL_BATERIA_BAJA = 0.15;
const UMBRAL_REACTIVACION = 0.2;
const TIPO_ALERTA_BATERIA = 'BATTERY';
const TITULO_ALERTA_BATERIA = 'Bateria baja del dispositivo';
const CANAL_NOTIFICACION_BATERIA = 'battery-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepararNotificaciones() {
  const permisos = await Notifications.getPermissionsAsync();

  if (!permisos.granted) {
    await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_NOTIFICACION_BATERIA, {
      name: 'Avisos de bateria',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
    });
  }
}

function formatearPorcentajeBateria(nivel: number) {
  return `${Math.max(0, Math.min(100, Math.round(nivel * 100)))}%`;
}

async function obtenerCoordenadasAlerta(ubicacionActual: Location.LocationObject | null, usuarioActual: User | null) {
  if (ubicacionActual) {
    return {
      lat: ubicacionActual.coords.latitude,
      lng: ubicacionActual.coords.longitude,
    };
  }

  const permisos = await Location.getForegroundPermissionsAsync();
  if (permisos.status === Location.PermissionStatus.GRANTED) {
    const ubicacionDispositivo =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }));

    if (ubicacionDispositivo) {
      return {
        lat: ubicacionDispositivo.coords.latitude,
        lng: ubicacionDispositivo.coords.longitude,
      };
    }
  }

  if (usuarioActual?.location_lat != null && usuarioActual?.location_lng != null) {
    return {
      lat: usuarioActual.location_lat,
      lng: usuarioActual.location_lng,
    };
  }

  return null;
}

export default function BatteryAlertMonitor() {
  const { token, user } = useAuth();
  const { location } = useLocation();
  const { queueAlert } = useOfflineSync();
  const avisoMostradoRef = useRef(false);
  const alertaBackendEnviadaRef = useRef(false);
  const procesandoRef = useRef(false);
  const ubicacionRef = useRef<Location.LocationObject | null>(null);
  const tokenRef = useRef<string | null>(null);
  const usuarioRef = useRef<User | null>(null);
  const enviarAlertaRef = useRef(queueAlert);

  useEffect(() => {
    ubicacionRef.current = location;
  }, [location]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    usuarioRef.current = user;
  }, [user]);

  useEffect(() => {
    enviarAlertaRef.current = queueAlert;
  }, [queueAlert]);

  const procesarNivelBateria = async (nivel: number) => {
    if (!tokenRef.current || procesandoRef.current) {
      return;
    }

    if (nivel > UMBRAL_REACTIVACION) {
      avisoMostradoRef.current = false;
      alertaBackendEnviadaRef.current = false;
      return;
    }

    if (nivel > UMBRAL_BATERIA_BAJA) {
      return;
    }

    procesandoRef.current = true;

    const porcentaje = formatearPorcentajeBateria(nivel);
    const descripcion = `El dispositivo del operativo tiene la bateria al ${porcentaje}. Se recomienda cargarlo o sustituir el terminal.`;

    try {
      if (!avisoMostradoRef.current) {
        avisoMostradoRef.current = true;
        Alert.alert(TITULO_ALERTA_BATERIA, descripcion);

        await prepararNotificaciones();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: TITULO_ALERTA_BATERIA,
            body: descripcion,
            sound: true,
          },
          trigger: null,
        });
      }

      if (alertaBackendEnviadaRef.current) {
        return;
      }

      const coordenadas = await obtenerCoordenadasAlerta(ubicacionRef.current, usuarioRef.current);
      if (!coordenadas) {
        return;
      }

      const resultado = await enviarAlertaRef.current({
        alert_type: TIPO_ALERTA_BATERIA,
        severity: 3,
        title: TITULO_ALERTA_BATERIA,
        description: descripcion,
        lat: coordenadas.lat,
        lng: coordenadas.lng,
      });

      if (!resultado.ok) {
        alertaBackendEnviadaRef.current = false;
        return;
      }

      alertaBackendEnviadaRef.current = true;
    } catch {
      alertaBackendEnviadaRef.current = false;
    } finally {
      procesandoRef.current = false;
    }
  };

  useEffect(() => {
    let estaMontado = true;

    const comprobarBateria = async () => {
      const nivel = await Battery.getBatteryLevelAsync();
      if (estaMontado) {
        void procesarNivelBateria(nivel);
      }
    };

    void comprobarBateria();

    const suscripcionBateria = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      void procesarNivelBateria(batteryLevel);
    });

    const suscripcionApp = AppState.addEventListener('change', (estado: AppStateStatus) => {
      if (estado === 'active') {
        void comprobarBateria();
      }
    });

    return () => {
      estaMontado = false;
      suscripcionBateria.remove();
      suscripcionApp.remove();
    };
  }, []);

  return null;
}
