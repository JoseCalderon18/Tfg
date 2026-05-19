import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type PuntoGeografico = {
  latitude: number;
  longitude: number;
};

type AlertaMovil = {
  id: string;
  incident?: string | null;
  incident_name?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  location?: unknown;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

type OpcionIncidente = {
  id: string;
  name: string;
  status?: string | null;
};

type RespuestaLista<T> = T[] | { results?: T[] };

const ETIQUETAS_TIPO_ALERTA: Record<string, string> = {
  SOS: 'SOS',
  MAN_DOWN: 'Hombre caido',
  LOST: 'Operativo perdido',
  GEOFENCE: 'Fuera de zona segura',
  ANOMALY: 'Anomalia detectada',
  FIRE_SPREAD: 'Cambio de fuego',
  SMOKE: 'Humo en incidente',
  INJURY: 'Operativo herido',
  DEATH: 'Operativo fallecido',
  EVACUATION: 'Evacuacion',
  MEDICAL: 'Emergencia medica',
  TRAPPED: 'Operativo atrapado',
  VEHICLE: 'Incidente vehicular',
  ANIMAL: 'Animal peligroso',
  ANIMAL_INJURY: 'Animal herido',
  LOW_SUPPLIES: 'Recursos bajos',
  COMM_LOSS: 'Perdida de comunicacion',
  HAZARD: 'Peligro ambiental',
  FATIGUE: 'Fatiga extrema',
  WEATHER: 'Clima peligroso',
  BATTERY: 'Bateria baja',
  MOVEMENT: 'Inmovilidad prolongada',
  OTHER: 'Otra alerta',
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  OPEN: 'Abierta',
  ACK: 'Reconocida',
  CLOSED: 'Cerrada',
};

const ALCANCE_ASIGNADAS = 'assigned';
const ALCANCE_MIAS = 'mine';

function normalizarLista<T>(payload: RespuestaLista<T>) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function obtenerEtiqueta(valor: string | null | undefined, etiquetas: Record<string, string>) {
  if (!valor) return 'Sin definir';
  return etiquetas[valor] ?? valor.replace(/_/g, ' ');
}

function formatearFecha(valor?: string | null) {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : fecha.toLocaleString('es-ES');
}

function formatearCoordenadas(punto: PuntoGeografico | null) {
  if (!punto) return 'Sin ubicacion registrada';
  return `${punto.latitude.toFixed(5)}, ${punto.longitude.toFixed(5)}`;
}

function obtenerEtiquetaSeveridad(severidad?: number | null) {
  if (severidad === undefined || severidad === null) return 'Sin severidad';
  if (severidad <= 1) return 'Critica';
  if (severidad === 2) return 'Alta';
  if (severidad === 3) return 'Media';
  return 'Baja';
}

function obtenerEstiloEstado(estado?: string | null) {
  if (estado === 'OPEN') return estilos.insigniaAbierta;
  if (estado === 'ACK') return estilos.insigniaReconocida;
  return estilos.insigniaCerrada;
}

function aNumeroFinito(valor: unknown) {
  const valorNumerico = Number(valor);
  return Number.isFinite(valorNumerico) ? valorNumerico : null;
}

function extraerPuntoDeUbicacion(ubicacion: unknown): PuntoGeografico | null {
  if (!ubicacion) return null;

  if (Array.isArray(ubicacion) && ubicacion.length >= 2) {
    const longitud = aNumeroFinito(ubicacion[0]);
    const latitud = aNumeroFinito(ubicacion[1]);
    return latitud !== null && longitud !== null ? { latitude: latitud, longitude: longitud } : null;
  }

  if (typeof ubicacion === 'string') {
    const coincidenciaPunto = ubicacion.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
    if (coincidenciaPunto) {
      const longitud = aNumeroFinito(coincidenciaPunto[1]);
      const latitud = aNumeroFinito(coincidenciaPunto[2]);
      return latitud !== null && longitud !== null ? { latitude: latitud, longitude: longitud } : null;
    }

    try {
      return extraerPuntoDeUbicacion(JSON.parse(ubicacion));
    } catch {
      return null;
    }
  }

  if (typeof ubicacion === 'object') {
    const objetoUbicacion = ubicacion as Record<string, unknown>;

    if (Array.isArray(objetoUbicacion.coordinates)) {
      return extraerPuntoDeUbicacion(objetoUbicacion.coordinates);
    }

    const latitud =
      aNumeroFinito(objetoUbicacion.latitude) ?? aNumeroFinito(objetoUbicacion.lat) ?? aNumeroFinito(objetoUbicacion.y);
    const longitud =
      aNumeroFinito(objetoUbicacion.longitude) ?? aNumeroFinito(objetoUbicacion.lng) ?? aNumeroFinito(objetoUbicacion.x);

    return latitud !== null && longitud !== null ? { latitude: latitud, longitude: longitud } : null;
  }

  return null;
}

function extraerPuntoAlerta(alerta: AlertaMovil) {
  const latitud = aNumeroFinito(alerta.latitude) ?? aNumeroFinito(alerta.lat);
  const longitud = aNumeroFinito(alerta.longitude) ?? aNumeroFinito(alerta.lng);
  if (latitud !== null && longitud !== null) {
    return { latitude: latitud, longitude: longitud };
  }

  return extraerPuntoDeUbicacion(alerta.location);
}

function quitarAlertasDuplicadas(alertas: AlertaMovil[]) {
  const vistos = new Set<string>();
  return alertas.filter((alerta) => {
    if (vistos.has(alerta.id)) return false;
    vistos.add(alerta.id);
    return true;
  });
}

function TarjetaResumen({ etiqueta, valor }: { etiqueta: string; valor: number | string }) {
  return (
    <View style={estilos.tarjetaResumen}>
      <Text style={estilos.valorResumen}>{valor}</Text>
      <Text style={estilos.etiquetaResumen}>{etiqueta}</Text>
    </View>
  );
}

export default function PantallaAlertas({ navigation, route }: any) {
  const idIncidenteRuta = route?.params?.incidentId as string | undefined;
  const nombreIncidenteRuta = route?.params?.incidentName as string | undefined;
  const { token } = useAuth();
  const [alertas, setAlertas] = useState<AlertaMovil[]>([]);
  const [incidentesAsignados, setIncidentesAsignados] = useState<OpcionIncidente[]>([]);
  const [alcanceSeleccionado, setAlcanceSeleccionado] = useState(idIncidenteRuta ?? ALCANCE_ASIGNADAS);
  const [cargando, setCargando] = useState(true);
  const [cargandoIncidentes, setCargandoIncidentes] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [alertaActualizandoId, setAlertaActualizandoId] = useState('');
  const [error, setError] = useState('');
  const [errorIncidentes, setErrorIncidentes] = useState('');

  const incidenteSeleccionado = incidentesAsignados.find((incidente) => incidente.id === alcanceSeleccionado);
  const etiquetaAlcanceSeleccionado =
    alcanceSeleccionado === ALCANCE_ASIGNADAS
      ? 'Incidentes asignados'
      : alcanceSeleccionado === ALCANCE_MIAS
        ? 'Creadas por mi usuario'
        : incidenteSeleccionado?.name ?? nombreIncidenteRuta ?? 'Incidente seleccionado';

  const alertasOrdenadas = useMemo(
    () =>
      [...alertas].sort((izquierda, derecha) => {
        const tiempoIzquierda = izquierda.created_at ? new Date(izquierda.created_at).getTime() : 0;
        const tiempoDerecha = derecha.created_at ? new Date(derecha.created_at).getTime() : 0;
        return tiempoDerecha - tiempoIzquierda;
      }),
    [alertas]
  );

  const resumen = useMemo(() => {
    const abiertas = alertasOrdenadas.filter((alerta) => alerta.status === 'OPEN').length;
    const criticas = alertasOrdenadas.filter((alerta) => typeof alerta.severity === 'number' && alerta.severity <= 2).length;
    const conUbicacion = alertasOrdenadas.filter((alerta) => Boolean(extraerPuntoAlerta(alerta))).length;
    return { total: alertasOrdenadas.length, abiertas, criticas, conUbicacion };
  }, [alertasOrdenadas]);

  const cargarIncidentesAsignados = useCallback(async () => {
    if (!token) {
      setIncidentesAsignados([]);
      setErrorIncidentes('No hay sesion activa.');
      setCargandoIncidentes(false);
      return;
    }

    setCargandoIncidentes(true);
    setErrorIncidentes('');

    try {
      const respuesta = await apiFetch('/incidents/my_incidents/', { token, timeoutMs: 12000 });
      if (!respuesta.ok) {
        throw new Error('No se pudieron cargar tus incidentes asignados.');
      }

      const datos = normalizarLista(await parseJsonResponse<RespuestaLista<OpcionIncidente>>(respuesta));
      const conIncidenteRuta =
        idIncidenteRuta && !datos.some((incidente) => incidente.id === idIncidenteRuta)
          ? [{ id: idIncidenteRuta, name: nombreIncidenteRuta ?? 'Incidente actual' }, ...datos]
          : datos;
      setIncidentesAsignados(conIncidenteRuta);
    } catch (siguienteError) {
      setIncidentesAsignados(idIncidenteRuta ? [{ id: idIncidenteRuta, name: nombreIncidenteRuta ?? 'Incidente actual' }] : []);
      setErrorIncidentes(siguienteError instanceof Error ? siguienteError.message : 'Error cargando incidentes asignados.');
    } finally {
      setCargandoIncidentes(false);
    }
  }, [idIncidenteRuta, nombreIncidenteRuta, token]);

  const cargarAlertasPorRuta = useCallback(
    async (ruta: string) => {
      const respuesta = await apiFetch(ruta, { token: token ?? undefined, timeoutMs: 12000 });
      if (!respuesta.ok) {
        throw new Error(`No se pudieron cargar las alertas (${respuesta.status}).`);
      }

      return normalizarLista(await parseJsonResponse<RespuestaLista<AlertaMovil>>(respuesta));
    },
    [token]
  );

  const cargarAlertas = useCallback(async (comoRefresco = false) => {
    if (!token) {
      setError('No hay sesion activa.');
      setCargando(false);
      return;
    }

    if (alcanceSeleccionado === ALCANCE_ASIGNADAS && cargandoIncidentes) {
      return;
    }

    if (comoRefresco) setRefrescando(true);
    else setCargando(true);
    setError('');

    try {
      if (alcanceSeleccionado === ALCANCE_ASIGNADAS) {
        if (incidentesAsignados.length === 0) {
          setAlertas([]);
          return;
        }

        const alertasAgrupadas = await Promise.all(
          incidentesAsignados.map((incidente) => cargarAlertasPorRuta(`/alerts/?incident=${encodeURIComponent(incidente.id)}`))
        );
        setAlertas(quitarAlertasDuplicadas(alertasAgrupadas.flat()));
        return;
      }

      const ruta =
        alcanceSeleccionado === ALCANCE_MIAS
          ? '/alerts/my_alerts/'
          : `/alerts/?incident=${encodeURIComponent(alcanceSeleccionado)}`;
      setAlertas(await cargarAlertasPorRuta(ruta));
    } catch (siguienteError) {
      setError(siguienteError instanceof Error ? siguienteError.message : 'Error cargando alertas.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [incidentesAsignados, cargarAlertasPorRuta, cargandoIncidentes, alcanceSeleccionado, token]);

  const refrescarTodo = useCallback(async () => {
    await cargarIncidentesAsignados();
    await cargarAlertas(true);
  }, [cargarAlertas, cargarIncidentesAsignados]);

  const abrirAlertaEnMapa = useCallback(
    (alerta: AlertaMovil) => {
      const punto = extraerPuntoAlerta(alerta);
      if (!punto) return;

      navigation.navigate('Map', {
        focusedAlert: {
          id: alerta.id,
          title: alerta.title || obtenerEtiqueta(alerta.alert_type, ETIQUETAS_TIPO_ALERTA),
          location: punto,
        },
      });
    },
    [navigation]
  );

  const cambiarEstadoAlerta = useCallback(
    async (alerta: AlertaMovil, accion: 'acknowledge' | 'close') => {
      if (!token || alertaActualizandoId) return;

      setAlertaActualizandoId(alerta.id);
      setError('');

      try {
        const respuesta = await apiFetch(`/alerts/${alerta.id}/${accion}/`, {
          method: 'POST',
          token,
          timeoutMs: 12000,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accion === 'acknowledge' ? { ack_notes: '' } : { close_notes: '' }),
        });

        const datos = await parseJsonResponse<AlertaMovil & { detail?: string; error?: string }>(respuesta);

        if (!respuesta.ok) {
          throw new Error(
            datos.detail ||
              datos.error ||
              (accion === 'acknowledge' ? 'No se pudo reconocer la alerta.' : 'No se pudo cerrar la alerta.')
          );
        }

        setAlertas((actuales) => actuales.map((item) => (item.id === alerta.id ? { ...item, ...datos } : item)));
      } catch (siguienteError) {
        const mensaje =
          siguienteError instanceof Error
            ? siguienteError.message
            : accion === 'acknowledge'
              ? 'No se pudo reconocer la alerta.'
              : 'No se pudo cerrar la alerta.';
        setError(mensaje);
        Alert.alert('Error', mensaje);
      } finally {
        setAlertaActualizandoId('');
      }
    },
    [alertaActualizandoId, token]
  );

  const confirmarCierreAlerta = useCallback(
    (alerta: AlertaMovil) => {
      Alert.alert('Cerrar alerta', 'Quieres marcar esta alerta como cerrada?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar', style: 'destructive', onPress: () => void cambiarEstadoAlerta(alerta, 'close') },
      ]);
    },
    [cambiarEstadoAlerta]
  );

  useEffect(() => {
    void cargarIncidentesAsignados();
  }, [cargarIncidentesAsignados]);

  useEffect(() => {
    void cargarAlertas();
  }, [cargarAlertas]);

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.cabecera}>
        <View style={estilos.textoCabecera}>
          <Text style={estilos.titulo}>Alertas registradas</Text>
          <Text style={estilos.subtitulo}>{etiquetaAlcanceSeleccionado}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescarTodo} tintColor={colors.primary} />}
      >
        <View style={estilos.bloqueFiltros}>
          <Text style={estilos.tituloSeccion}>Vista</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filaFiltros}>
            <TouchableOpacity
              style={[estilos.chipFiltro, alcanceSeleccionado === ALCANCE_ASIGNADAS && estilos.chipFiltroActivo]}
              onPress={() => setAlcanceSeleccionado(ALCANCE_ASIGNADAS)}
            >
              <Text style={[estilos.textoChipFiltro, alcanceSeleccionado === ALCANCE_ASIGNADAS && estilos.textoChipFiltroActivo]}>
                Asignadas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.chipFiltro, alcanceSeleccionado === ALCANCE_MIAS && estilos.chipFiltroActivo]}
              onPress={() => setAlcanceSeleccionado(ALCANCE_MIAS)}
            >
              <Text style={[estilos.textoChipFiltro, alcanceSeleccionado === ALCANCE_MIAS && estilos.textoChipFiltroActivo]}>
                Mis alertas
              </Text>
            </TouchableOpacity>
            {incidentesAsignados.map((incidente) => (
              <TouchableOpacity
                key={incidente.id}
                style={[estilos.chipFiltro, alcanceSeleccionado === incidente.id && estilos.chipFiltroActivo]}
                onPress={() => setAlcanceSeleccionado(incidente.id)}
              >
                <Text style={[estilos.textoChipFiltro, alcanceSeleccionado === incidente.id && estilos.textoChipFiltroActivo]}>
                  {incidente.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {cargandoIncidentes ? <Text style={estilos.textoAyuda}>Cargando incidentes asignados...</Text> : null}
          {errorIncidentes ? <Text style={estilos.textoAviso}>{errorIncidentes}</Text> : null}
        </View>

        <View style={estilos.cuadriculaResumen}>
          <TarjetaResumen etiqueta="Total" valor={resumen.total} />
          <TarjetaResumen etiqueta="Abiertas" valor={resumen.abiertas} />
          <TarjetaResumen etiqueta="Criticas" valor={resumen.criticas} />
          <TarjetaResumen etiqueta="Con mapa" valor={resumen.conUbicacion} />
        </View>

        {cargando ? (
          <View style={estilos.cajaEstado}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={estilos.textoEstado}>Cargando alertas...</Text>
          </View>
        ) : error ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>No se pudo cargar</Text>
            <Text style={estilos.textoTarjeta}>{error}</Text>
          </View>
        ) : alertasOrdenadas.length === 0 ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>Sin alertas</Text>
            <Text style={estilos.textoTarjeta}>No hay alertas registradas para esta vista.</Text>
          </View>
        ) : (
          alertasOrdenadas.map((alerta) => {
            const punto = extraerPuntoAlerta(alerta);
            const actualizandoEstaAlerta = alertaActualizandoId === alerta.id;
            const puedeReconocer = alerta.status === 'OPEN';
            const puedeCerrar = alerta.status !== 'CLOSED';
            return (
              <View key={alerta.id} style={estilos.tarjeta}>
                <View style={estilos.cabeceraTarjeta}>
                  <View style={estilos.bloqueTituloTarjeta}>
                    <Text style={estilos.tituloAlerta}>{alerta.title || obtenerEtiqueta(alerta.alert_type, ETIQUETAS_TIPO_ALERTA)}</Text>
                    <Text style={estilos.textoTarjeta}>{obtenerEtiqueta(alerta.alert_type, ETIQUETAS_TIPO_ALERTA)}</Text>
                  </View>
                  <View style={[estilos.insigniaEstado, obtenerEstiloEstado(alerta.status)]}>
                    <Text style={estilos.textoInsigniaEstado}>{obtenerEtiqueta(alerta.status, ETIQUETAS_ESTADO)}</Text>
                  </View>
                </View>

                <View style={estilos.cuadriculaDetalles}>
                  <View style={estilos.itemDetalle}>
                    <Text style={estilos.etiquetaDetalle}>Severidad</Text>
                    <Text style={estilos.valorDetalle}>{obtenerEtiquetaSeveridad(alerta.severity)}</Text>
                  </View>
                  <View style={estilos.itemDetalle}>
                    <Text style={estilos.etiquetaDetalle}>Incidente</Text>
                    <Text style={estilos.valorDetalle}>{alerta.incident_name || alerta.incident || 'Sin incidente'}</Text>
                  </View>
                  <View style={estilos.itemDetalle}>
                    <Text style={estilos.etiquetaDetalle}>Creada</Text>
                    <Text style={estilos.valorDetalle}>{formatearFecha(alerta.created_at)}</Text>
                  </View>
                  <View style={estilos.itemDetalle}>
                    <Text style={estilos.etiquetaDetalle}>Ubicacion</Text>
                    <Text style={estilos.valorDetalle}>{formatearCoordenadas(punto)}</Text>
                  </View>
                </View>

                {alerta.description ? <Text style={estilos.descripcion}>{alerta.description}</Text> : null}

                <TouchableOpacity
                  style={[estilos.botonMapa, !punto && estilos.botonMapaDeshabilitado]}
                  disabled={!punto}
                  onPress={() => abrirAlertaEnMapa(alerta)}
                >
                  <Text style={estilos.textoBotonMapa}>{punto ? 'Abrir alerta en mapa' : 'Sin ubicacion para mapa'}</Text>
                </TouchableOpacity>

                {puedeReconocer || puedeCerrar ? (
                  <View style={estilos.filaAccionesAlerta}>
                    {puedeReconocer ? (
                      <TouchableOpacity
                        style={[estilos.botonAccionAlerta, estilos.botonReconocer, actualizandoEstaAlerta && estilos.botonAccionDeshabilitado]}
                        disabled={actualizandoEstaAlerta}
                        onPress={() => void cambiarEstadoAlerta(alerta, 'acknowledge')}
                      >
                        <Text style={estilos.textoBotonAccionAlerta}>
                          {actualizandoEstaAlerta ? 'Guardando...' : 'Reconocer'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {puedeCerrar ? (
                      <TouchableOpacity
                        style={[estilos.botonAccionAlerta, estilos.botonCerrar, actualizandoEstaAlerta && estilos.botonAccionDeshabilitado]}
                        disabled={actualizandoEstaAlerta}
                        onPress={() => confirmarCierreAlerta(alerta)}
                      >
                        <Text style={estilos.textoBotonAccionAlerta}>
                          {actualizandoEstaAlerta ? 'Guardando...' : 'Cerrar'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textoCabecera: { flex: 1 },
  titulo: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitulo: { marginTop: 4, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  contenido: { padding: 18, paddingBottom: 32, gap: 12 },
  bloqueFiltros: { gap: 8 },
  tituloSeccion: { color: colors.text, fontSize: 15, fontWeight: '800' },
  filaFiltros: { gap: 8, paddingRight: 18 },
  chipFiltro: {
    minHeight: 38,
    maxWidth: 220,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  chipFiltroActivo: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  textoChipFiltro: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  textoChipFiltroActivo: { color: colors.primary },
  textoAyuda: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  textoAviso: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  cuadriculaResumen: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tarjetaResumen: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  valorResumen: { color: colors.text, fontSize: 20, fontWeight: '800' },
  etiquetaResumen: { marginTop: 2, color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  cajaEstado: { marginTop: 42, alignItems: 'center', gap: 12 },
  textoEstado: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  tarjeta: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 },
  cabeceraTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  bloqueTituloTarjeta: { flex: 1 },
  tituloTarjeta: { color: colors.text, fontSize: 18, fontWeight: '800' },
  tituloAlerta: { color: colors.text, fontSize: 17, fontWeight: '800' },
  textoTarjeta: { marginTop: 5, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  cuadriculaDetalles: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemDetalle: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  etiquetaDetalle: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  valorDetalle: { marginTop: 3, color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  descripcion: { marginTop: 12, color: colors.textSoft, fontSize: 14, lineHeight: 20 },
  insigniaEstado: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  insigniaAbierta: { backgroundColor: colors.success },
  insigniaReconocida: { backgroundColor: colors.warning },
  insigniaCerrada: { backgroundColor: colors.textMuted },
  textoInsigniaEstado: { color: colors.white, fontSize: 11, fontWeight: '800' },
  botonMapa: {
    marginTop: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  botonMapaDeshabilitado: { backgroundColor: colors.borderStrong },
  textoBotonMapa: { color: colors.white, fontSize: 14, fontWeight: '800' },
  filaAccionesAlerta: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  botonAccionAlerta: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  botonReconocer: { backgroundColor: colors.warning },
  botonCerrar: { backgroundColor: colors.success },
  botonAccionDeshabilitado: { opacity: 0.65 },
  textoBotonAccionAlerta: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
