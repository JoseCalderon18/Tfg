import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import {
  ACCION_CONFIRMAR_INMOVILIDAD,
  CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS,
  EstadoActividadJornada,
  estaInmovil,
  extraerCoordenadas,
  marcarAlertaInmovilidadEnviada,
  marcarAvisoInmovilidadIniciado,
  notificarAlertaInmovilidadEnviada,
  notificarAvisoInmovilidad,
  obtenerEstadoActividadJornada,
  confirmarPresenciaJornada,
  registrarPuntoMovimientoJornada,
  TIPO_ALERTA_INMOVILIDAD,
} from '../services/journeyActivity';
import { borderRadius, colors, shadows, spacing } from '../theme';

const TITULO_AVISO_INMOVILIDAD = 'Sin movimiento detectado';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function MovementAlertMonitor() {
  const { token } = useAuth();
  const { location } = useLocation();
  const { queueAlert } = useOfflineSync();
  const [avisoVisible, setAvisoVisible] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS);
  const [estadoJornada, setEstadoJornada] = useState<EstadoActividadJornada | null>(null);
  const ubicacionRef = useRef<Location.LocationObject | null>(null);
  const enviandoAlertaRef = useRef(false);

  useEffect(() => {
    ubicacionRef.current = location;
  }, [location]);

  const confirmarPresencia = useCallback(async () => {
    const coordenadas = extraerCoordenadas(ubicacionRef.current) ?? estadoJornada?.lastPoint ?? null;
    await confirmarPresenciaJornada(coordenadas);
    const estadoActualizado = await obtenerEstadoActividadJornada();
    setEstadoJornada(estadoActualizado);
    setAvisoVisible(false);
    setSegundosRestantes(CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS);
  }, [estadoJornada?.lastPoint]);

  const enviarAlertaInmovilidad = useCallback(
    async (estado: EstadoActividadJornada) => {
      if (!token || enviandoAlertaRef.current || estado.movementAlertSentAt) {
        return;
      }

      const coordenadas = extraerCoordenadas(ubicacionRef.current) ?? estado.lastPoint;
      if (!coordenadas) {
        return;
      }

      enviandoAlertaRef.current = true;
      setAvisoVisible(false);

      try {
        const descripcion =
          'El dispositivo lleva 10 minutos sin movimiento y no se confirmo presencia tras 30 segundos.';

        const resultado = await queueAlert({
          alert_type: TIPO_ALERTA_INMOVILIDAD,
          severity: 3,
          title: 'Inmovilidad prolongada',
          description: descripcion,
          lat: coordenadas.latitude,
          lng: coordenadas.longitude,
        });

        if (resultado.ok) {
          await marcarAlertaInmovilidadEnviada();
          await notificarAlertaInmovilidadEnviada();
          setEstadoJornada(await obtenerEstadoActividadJornada());
        }
      } finally {
        enviandoAlertaRef.current = false;
      }
    },
    [queueAlert, token]
  );

  useEffect(() => {
    const coordenadas = extraerCoordenadas(location);
    if (!coordenadas) {
      return;
    }

    void registrarPuntoMovimientoJornada(coordenadas)
      .then((estadoActualizado) => {
        if (estadoActualizado) {
          setEstadoJornada(estadoActualizado);
        }
      })
      .catch(() => undefined);
  }, [location]);

  useEffect(() => {
    const suscripcion = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === ACCION_CONFIRMAR_INMOVILIDAD) {
        void confirmarPresencia();
      }
    });

    return () => suscripcion.remove();
  }, [confirmarPresencia]);

  useEffect(() => {
    if (!token) {
      setAvisoVisible(false);
      setEstadoJornada(null);
      return undefined;
    }

    const revisarInmovilidad = async () => {
      const estado = await obtenerEstadoActividadJornada();
      setEstadoJornada(estado);

      if (!estado?.active || estado.inBreak || estado.movementAlertSentAt) {
        setAvisoVisible(false);
        return;
      }

      if (estado.movementWarningStartedAt) {
        const inicioAvisoMs = new Date(estado.movementWarningStartedAt).getTime();
        const segundosTranscurridos = Number.isFinite(inicioAvisoMs)
          ? Math.floor((Date.now() - inicioAvisoMs) / 1000)
          : 0;
        const restantes = Math.max(0, CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS - segundosTranscurridos);
        setSegundosRestantes(restantes);
        setAvisoVisible(true);

        if (restantes <= 0) {
          await enviarAlertaInmovilidad(estado);
        }
        return;
      }

      if (estaInmovil(estado)) {
        const siguienteEstado = await marcarAvisoInmovilidadIniciado();
        setEstadoJornada(siguienteEstado);
        setSegundosRestantes(CUENTA_ATRAS_INMOVILIDAD_SEGUNDOS);
        setAvisoVisible(true);
        await notificarAvisoInmovilidad();
      }
    };

    void revisarInmovilidad().catch(() => undefined);
    const intervaloId = setInterval(() => {
      void revisarInmovilidad().catch(() => undefined);
    }, 1000);

    return () => clearInterval(intervaloId);
  }, [enviarAlertaInmovilidad, token]);

  return (
    <Modal transparent visible={avisoVisible} animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.titulo}>{TITULO_AVISO_INMOVILIDAD}</Text>
          <Text style={styles.descripcion}>
            No se detecta movimiento desde hace 10 minutos de jornada activa. Confirma que sigues activo para evitar
            enviar una alerta.
          </Text>
          <View style={styles.cuentaAtras}>
            <Text style={styles.cuentaAtrasNumero}>{segundosRestantes}</Text>
            <Text style={styles.cuentaAtrasTexto}>segundos restantes</Text>
          </View>
          <TouchableOpacity style={styles.botonConfirmar} onPress={confirmarPresencia} activeOpacity={0.86}>
            <Text style={styles.botonConfirmarTexto}>Sigo aqui</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    ...shadows.lg,
  },
  titulo: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  descripcion: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  cuentaAtras: {
    alignSelf: 'center',
    minWidth: 136,
    minHeight: 136,
    borderRadius: borderRadius.full,
    backgroundColor: colors.dangerSoft,
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  cuentaAtrasNumero: {
    color: colors.danger,
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
  },
  cuentaAtrasTexto: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  botonConfirmar: {
    minHeight: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  botonConfirmarTexto: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
});
