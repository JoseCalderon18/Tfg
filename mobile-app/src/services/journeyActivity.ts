import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from './api';

export const TIEMPO_INMOVILIDAD_MS = 10 * 60 * 1000;
export const CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS = 30;
export const DISTANCIA_MINIMA_MOVIMIENTO_METROS = 20;
export const TIPO_ALERTA_INMOVILIDAD = 'ANOMALY';
export const ACCION_CONFIRMAR_INMOVILIDAD = 'SIGO_AQUI_MOVEMENT';
export const CATEGORIA_NOTIFICACION_INMOVILIDAD = 'movement-confirmation';
export const CANAL_NOTIFICACION_INMOVILIDAD = 'movement-alerts';

const CLAVE_ESTADO_JORNADA = 'journey_activity_state';

export type Coordenadas = {
  latitude: number;
  longitude: number;
};

export type EstadoActividadJornada = {
  journeyId: number;
  startedAt: string;
  active: boolean;
  inBreak: boolean;
  breakStartedAt?: string | null;
  lastMovementAt: string;
  lastPoint: Coordenadas | null;
  movementWarningStartedAt?: string | null;
  movementAlertSentAt?: string | null;
};

export function extraerCoordenadas(ubicacion: Location.LocationObject | null): Coordenadas | null {
  if (!ubicacion) {
    return null;
  }

  const { latitude, longitude } = ubicacion.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function calcularDistanciaMetros(origen: Coordenadas, destino: Coordenadas) {
  const radioTierraMetros = 6371000;
  const latitudOrigen = (origen.latitude * Math.PI) / 180;
  const latitudDestino = (destino.latitude * Math.PI) / 180;
  const diferenciaLatitud = ((destino.latitude - origen.latitude) * Math.PI) / 180;
  const diferenciaLongitud = ((destino.longitude - origen.longitude) * Math.PI) / 180;

  const valorHaversine =
    Math.sin(diferenciaLatitud / 2) * Math.sin(diferenciaLatitud / 2) +
    Math.cos(latitudOrigen) *
      Math.cos(latitudDestino) *
      Math.sin(diferenciaLongitud / 2) *
      Math.sin(diferenciaLongitud / 2);

  return radioTierraMetros * 2 * Math.atan2(Math.sqrt(valorHaversine), Math.sqrt(1 - valorHaversine));
}

export async function obtenerEstadoActividadJornada() {
  const raw = await SecureStore.getItemAsync(CLAVE_ESTADO_JORNADA);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as EstadoActividadJornada;
  } catch {
    await SecureStore.deleteItemAsync(CLAVE_ESTADO_JORNADA);
    return null;
  }
}

export async function guardarEstadoActividadJornada(estado: EstadoActividadJornada) {
  await SecureStore.setItemAsync(CLAVE_ESTADO_JORNADA, JSON.stringify(estado));
}

export async function limpiarEstadoActividadJornada() {
  await SecureStore.deleteItemAsync(CLAVE_ESTADO_JORNADA);
}

export async function registrarInicioJornadaActividad(params: {
  journeyId: number;
  startedAt: string;
  point: Coordenadas | null;
}) {
  const inicio = new Date(params.startedAt);
  const startedAt = Number.isNaN(inicio.getTime()) ? new Date().toISOString() : inicio.toISOString();

  await guardarEstadoActividadJornada({
    journeyId: params.journeyId,
    startedAt,
    active: true,
    inBreak: false,
    breakStartedAt: null,
    lastMovementAt: startedAt,
    lastPoint: params.point,
    movementWarningStartedAt: null,
    movementAlertSentAt: null,
  });
}

export async function registrarInicioDescansoJornada(startedAt: string) {
  const estado = await obtenerEstadoActividadJornada();
  if (!estado) {
    return;
  }

  await guardarEstadoActividadJornada({
    ...estado,
    inBreak: true,
    breakStartedAt: startedAt,
    movementWarningStartedAt: null,
  });
}

export async function registrarRetomarJornada(point: Coordenadas | null) {
  const estado = await obtenerEstadoActividadJornada();
  if (!estado) {
    return;
  }

  await guardarEstadoActividadJornada({
    ...estado,
    inBreak: false,
    breakStartedAt: null,
    lastMovementAt: new Date().toISOString(),
    lastPoint: point ?? estado.lastPoint,
    movementWarningStartedAt: null,
    movementAlertSentAt: null,
  });
}

export async function registrarFinJornadaActividad() {
  await limpiarEstadoActividadJornada();
}

export async function registrarPuntoMovimientoJornada(point: Coordenadas) {
  const estado = await obtenerEstadoActividadJornada();
  if (!estado || !estado.active || estado.inBreak) {
    return estado;
  }

  if (!estado.lastPoint) {
    const siguiente = {
      ...estado,
      lastPoint: point,
      lastMovementAt: estado.lastMovementAt || estado.startedAt || new Date().toISOString(),
    };
    await guardarEstadoActividadJornada(siguiente);
    return siguiente;
  }

  const distancia = calcularDistanciaMetros(estado.lastPoint, point);
  if (distancia < DISTANCIA_MINIMA_MOVIMIENTO_METROS) {
    return estado;
  }

  const siguiente = {
    ...estado,
    lastPoint: point,
    lastMovementAt: new Date().toISOString(),
    movementWarningStartedAt: null,
    movementAlertSentAt: null,
  };
  await guardarEstadoActividadJornada(siguiente);
  return siguiente;
}

export function estaInmovil(estado: EstadoActividadJornada, ahoraMs = Date.now()) {
  const ultimoMovimientoMs = new Date(estado.lastMovementAt || estado.startedAt).getTime();
  return Number.isFinite(ultimoMovimientoMs) && ahoraMs - ultimoMovimientoMs >= TIEMPO_INMOVILIDAD_MS;
}

export async function marcarAvisoInmovilidadIniciado() {
  const estado = await obtenerEstadoActividadJornada();
  if (!estado) {
    return null;
  }

  const siguiente = {
    ...estado,
    movementWarningStartedAt: new Date().toISOString(),
  };
  await guardarEstadoActividadJornada(siguiente);
  return siguiente;
}

export async function confirmarPresenciaJornada(point: Coordenadas | null) {
  const estado = await obtenerEstadoActividadJornada();
  if (!estado) {
    return;
  }

  await guardarEstadoActividadJornada({
    ...estado,
    lastPoint: point ?? estado.lastPoint,
    lastMovementAt: new Date().toISOString(),
    movementWarningStartedAt: null,
    movementAlertSentAt: null,
  });
}

export async function prepararNotificacionesInmovilidad() {
  const permisos = await Notifications.getPermissionsAsync();

  if (!permisos.granted) {
    await Notifications.requestPermissionsAsync();
  }

  await Notifications.setNotificationCategoryAsync(CATEGORIA_NOTIFICACION_INMOVILIDAD, [
    {
      identifier: ACCION_CONFIRMAR_INMOVILIDAD,
      buttonTitle: 'Sigo aqui',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_NOTIFICACION_INMOVILIDAD, {
      name: 'Avisos de inmovilidad',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
    });
  }
}

export async function notificarAvisoInmovilidad() {
  await prepararNotificacionesInmovilidad();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sin movimiento detectado',
      body: 'Pulsa "Sigo aqui" en la app antes de que termine la cuenta atras.',
      sound: true,
      categoryIdentifier: CATEGORIA_NOTIFICACION_INMOVILIDAD,
    },
    trigger: null,
  });
}

export async function notificarAlertaInmovilidadEnviada() {
  await prepararNotificacionesInmovilidad();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Alerta de inmovilidad enviada',
      body: 'Se ha enviado una alerta de anomalia por inmovilidad prolongada.',
      sound: true,
    },
    trigger: null,
  });
}

export async function enviarAlertaInmovilidadDirecta(params: { token: string; point: Coordenadas }) {
  const response = await apiFetch('/alerts/', {
    method: 'POST',
    token: params.token,
    body: JSON.stringify({
      alert_type: TIPO_ALERTA_INMOVILIDAD,
      severity: 3,
      title: 'Inmovilidad prolongada',
      description: 'El dispositivo lleva 10 minutos sin movimiento y no se confirmo presencia tras 30 segundos.',
      lat: params.point.latitude,
      lng: params.point.longitude,
    }),
    timeoutMs: 10000,
  });

  if (!response.ok) {
    throw new Error('No se pudo enviar la alerta de inmovilidad.');
  }
}

export async function marcarAlertaInmovilidadEnviada() {
  const estado = await obtenerEstadoActividadJornada();
  if (!estado) {
    return;
  }

  await guardarEstadoActividadJornada({
    ...estado,
    movementAlertSentAt: new Date().toISOString(),
    movementWarningStartedAt: null,
  });
}

export async function procesarInmovilidadSegundoPlano(location: Location.LocationObject) {
  const point = extraerCoordenadas(location);
  if (!point) {
    return;
  }

  const estadoDespuesMovimiento = await registrarPuntoMovimientoJornada(point);
  if (!estadoDespuesMovimiento || !estadoDespuesMovimiento.active || estadoDespuesMovimiento.inBreak) {
    return;
  }

  if (estadoDespuesMovimiento.movementAlertSentAt) {
    return;
  }

  if (!estaInmovil(estadoDespuesMovimiento)) {
    return;
  }

  if (!estadoDespuesMovimiento.movementWarningStartedAt) {
    await marcarAvisoInmovilidadIniciado();
    await notificarAvisoInmovilidad();
    return;
  }

  const avisoMs = new Date(estadoDespuesMovimiento.movementWarningStartedAt).getTime();
  if (!Number.isFinite(avisoMs) || Date.now() - avisoMs < CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS * 1000) {
    return;
  }

  const token = await SecureStore.getItemAsync('token');
  if (!token) {
    return;
  }

  await enviarAlertaInmovilidadDirecta({ token, point });
  await marcarAlertaInmovilidadEnviada();
  await notificarAlertaInmovilidadEnviada();
}
