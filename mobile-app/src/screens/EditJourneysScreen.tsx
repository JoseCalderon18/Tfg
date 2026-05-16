import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

const JORNADAS_POR_PAGINA = 5;

type JornadaApi = {
  id: number;
  created_at?: string | null;
  user?: string | null;
  user_id?: string | null;
  account_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: unknown;
};

type RespuestaListaJornadas = JornadaApi[] | { results?: JornadaApi[] };

function normalizarLista(payload: RespuestaListaJornadas) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function perteneceAlUsuarioActual(jornada: JornadaApi, usuario: { id?: string; profile_id?: string } | null | undefined) {
  if (!usuario) {
    return false;
  }

  return (
    jornada.account_user_id === usuario.id ||
    jornada.user_id === usuario.profile_id ||
    jornada.user_id === usuario.id ||
    (!jornada.account_user_id && !jornada.user_id)
  );
}

function formatearFecha(valor?: string | null) {
  if (!valor) {
    return 'En curso';
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

function convertirAValorLocal(valor?: string | null) {
  if (!valor) {
    return '';
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  const completarDosDigitos = (siguiente: number) => String(siguiente).padStart(2, '0');
  return `${fecha.getFullYear()}-${completarDosDigitos(fecha.getMonth() + 1)}-${completarDosDigitos(fecha.getDate())} ${completarDosDigitos(fecha.getHours())}:${completarDosDigitos(fecha.getMinutes())}`;
}

function analizarFecha(valor: string, nombreCampo: string) {
  const valorLimpio = valor.trim();
  if (!valorLimpio) {
    return null;
  }

  const valorNormalizado = valorLimpio.includes('T') ? valorLimpio : valorLimpio.replace(' ', 'T');
  const fecha = new Date(valorNormalizado);

  if (Number.isNaN(fecha.getTime())) {
    throw new Error(`${nombreCampo} no tiene un formato valido. Usa YYYY-MM-DD HH:mm.`);
  }

  return fecha.toISOString();
}

function convertirNotasATexto(notas: unknown) {
  if (!notas) {
    return '';
  }

  if (typeof notas === 'string') {
    return notas;
  }

  if (typeof notas === 'object' && !Array.isArray(notas)) {
    const candidata = notas as { text?: unknown; note?: unknown; notes?: unknown; description?: unknown };
    const valor = candidata.text ?? candidata.note ?? candidata.notes ?? candidata.description;
    return typeof valor === 'string' ? valor : '';
  }

  return '';
}

function construirNotasEditadas(notasExistentes: unknown, textoNotas: string) {
  const textoLimpio = textoNotas.trim();

  if (notasExistentes && typeof notasExistentes === 'object' && !Array.isArray(notasExistentes)) {
    return {
      ...(notasExistentes as Record<string, unknown>),
      text: textoLimpio || null,
    };
  }

  return textoLimpio || null;
}

async function leerMensajeError(respuesta: Response) {
  try {
    const payload = await parseJsonResponse<{ detail?: string; error?: string } | Record<string, unknown>>(respuesta);
    if ('detail' in payload && typeof payload.detail === 'string') {
      return payload.detail;
    }
    if ('error' in payload && typeof payload.error === 'string') {
      return payload.error;
    }
    return `No se pudo guardar la jornada (${respuesta.status}).`;
  } catch {
    return `No se pudo guardar la jornada (${respuesta.status}).`;
  }
}

function obtenerPaginaDeJornada(jornadas: JornadaApi[], idJornada: number | null) {
  if (!idJornada) {
    return 1;
  }

  const indice = jornadas.findIndex((jornada) => jornada.id === idJornada);
  if (indice < 0) {
    return 1;
  }

  return Math.floor(indice / JORNADAS_POR_PAGINA) + 1;
}

export default function PantallaEditarJornadas({ navigation }: any) {
  const { token, user: usuario } = useAuth();
  const [jornadas, setJornadas] = useState<JornadaApi[]>([]);
  const [idJornadaSeleccionada, setIdJornadaSeleccionada] = useState<number | null>(null);
  const [textoFechaInicio, setTextoFechaInicio] = useState('');
  const [textoFechaFin, setTextoFechaFin] = useState('');
  const [textoObservaciones, setTextoObservaciones] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const idJornadaSeleccionadaRef = useRef<number | null>(null);

  const totalPaginas = Math.max(1, Math.ceil(jornadas.length / JORNADAS_POR_PAGINA));
  const indiceInicioPagina = (paginaActual - 1) * JORNADAS_POR_PAGINA;
  const jornadasPaginadas = jornadas.slice(indiceInicioPagina, indiceInicioPagina + JORNADAS_POR_PAGINA);

  const jornadaSeleccionada = useMemo(
    () => jornadas.find((jornada) => jornada.id === idJornadaSeleccionada) ?? null,
    [jornadas, idJornadaSeleccionada]
  );

  const cargarJornadas = useCallback(async (esRefresco = false) => {
    if (!token || !usuario) {
      setError('No hay una sesion activa.');
      setCargando(false);
      return;
    }

    if (esRefresco) {
      setRefrescando(true);
    } else {
      setCargando(true);
    }

    setError(null);

    try {
      const respuesta = await apiFetch('/journeys/?ordering=-created_at', { token, timeoutMs: 12000 });

      if (!respuesta.ok) {
        throw new Error(await leerMensajeError(respuesta));
      }

      const payload = await parseJsonResponse<RespuestaListaJornadas>(respuesta);
      const siguientesJornadas = normalizarLista(payload).filter((jornada) => perteneceAlUsuarioActual(jornada, usuario));
      setJornadas(siguientesJornadas);

      const idSeleccionadaActual = idJornadaSeleccionadaRef.current;
      const siguienteSeleccionada = idSeleccionadaActual
        ? siguientesJornadas.find((jornada) => jornada.id === idSeleccionadaActual) ?? siguientesJornadas[0] ?? null
        : siguientesJornadas[0] ?? null;

      idJornadaSeleccionadaRef.current = siguienteSeleccionada?.id ?? null;
      setIdJornadaSeleccionada(siguienteSeleccionada?.id ?? null);
      setPaginaActual(obtenerPaginaDeJornada(siguientesJornadas, siguienteSeleccionada?.id ?? null));

      if (siguienteSeleccionada) {
        setTextoFechaInicio(convertirAValorLocal(siguienteSeleccionada.start_date));
        setTextoFechaFin(convertirAValorLocal(siguienteSeleccionada.end_date));
        setTextoObservaciones(convertirNotasATexto(siguienteSeleccionada.notes));
      }
    } catch (siguienteError) {
      setError(siguienteError instanceof Error ? siguienteError.message : 'No se pudieron cargar las jornadas.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [token, usuario]);

  useEffect(() => {
    void cargarJornadas();
  }, [cargarJornadas]);

  function seleccionarJornada(jornada: JornadaApi) {
    idJornadaSeleccionadaRef.current = jornada.id;
    setIdJornadaSeleccionada(jornada.id);
    setTextoFechaInicio(convertirAValorLocal(jornada.start_date));
    setTextoFechaFin(convertirAValorLocal(jornada.end_date));
    setTextoObservaciones(convertirNotasATexto(jornada.notes));
  }

  async function guardarJornada() {
    if (!token || !jornadaSeleccionada) {
      Alert.alert('Jornada requerida', 'Selecciona una jornada para editar.');
      return;
    }

    setGuardando(true);
    try {
      const fechaInicio = analizarFecha(textoFechaInicio, 'La fecha de inicio');
      const fechaFin = analizarFecha(textoFechaFin, 'La fecha de fin');

      if (!fechaInicio) {
        throw new Error('La fecha de inicio es obligatoria.');
      }

      if (fechaFin && new Date(fechaFin).getTime() < new Date(fechaInicio).getTime()) {
        throw new Error('La fecha de fin no puede ser anterior al inicio.');
      }

      const respuesta = await apiFetch(`/journeys/${jornadaSeleccionada.id}/`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          start_date: fechaInicio,
          end_date: fechaFin,
          notes: construirNotasEditadas(jornadaSeleccionada.notes, textoObservaciones),
        }),
      });

      if (!respuesta.ok) {
        throw new Error(await leerMensajeError(respuesta));
      }

      const jornadaActualizada = await parseJsonResponse<JornadaApi>(respuesta);
      setJornadas((actuales) => actuales.map((jornada) => (jornada.id === jornadaActualizada.id ? jornadaActualizada : jornada)));
      idJornadaSeleccionadaRef.current = jornadaActualizada.id;
      setIdJornadaSeleccionada(jornadaActualizada.id);
      setPaginaActual(obtenerPaginaDeJornada(jornadas, jornadaActualizada.id));
      setTextoFechaInicio(convertirAValorLocal(jornadaActualizada.start_date));
      setTextoFechaFin(convertirAValorLocal(jornadaActualizada.end_date));
      setTextoObservaciones(convertirNotasATexto(jornadaActualizada.notes));

      Alert.alert('Jornada actualizada', 'Los cambios se han guardado correctamente.');
    } catch (siguienteError) {
      Alert.alert('Error', siguienteError instanceof Error ? siguienteError.message : 'No se pudo guardar la jornada.');
    } finally {
      setGuardando(false);
    }
  }

  function irPaginaAnterior() {
    setPaginaActual((actual) => Math.max(1, actual - 1));
  }

  function irPaginaSiguiente() {
    setPaginaActual((actual) => Math.min(totalPaginas, actual + 1));
  }

  const renderizarContenido = () => {
    if (cargando) {
      return (
        <View style={estilos.stateBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={estilos.stateText}>Cargando jornadas...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={estilos.stateCard}>
          <Text style={estilos.stateTitle}>No se pudieron cargar</Text>
          <Text style={estilos.stateText}>{error}</Text>
          <TouchableOpacity style={estilos.primaryButton} onPress={() => cargarJornadas()}>
            <Text style={estilos.primaryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (jornadas.length === 0) {
      return (
        <View style={estilos.stateCard}>
          <Text style={estilos.stateTitle}>Sin jornadas</Text>
          <Text style={estilos.stateText}>Todavia no hay jornadas registradas para este usuario.</Text>
        </View>
      );
    }

    return (
      <>
        <View style={estilos.card}>
          <View style={estilos.cardHeader}>
            <Text style={estilos.cardTitle}>Jornadas</Text>
            <Text style={estilos.counterText}>{jornadas.length} total</Text>
          </View>

          {jornadasPaginadas.map((jornada) => {
            const estaSeleccionada = jornada.id === idJornadaSeleccionada;
            return (
              <TouchableOpacity
                key={jornada.id}
                style={[estilos.journeyItem, estaSeleccionada && estilos.journeyItemActive]}
                onPress={() => seleccionarJornada(jornada)}
              >
                <View style={estilos.journeyHeader}>
                  <Text style={estilos.journeyTitle}>Jornada #{jornada.id}</Text>
                  <Text style={[estilos.statusPill, jornada.end_date ? estilos.statusClosed : estilos.statusOpen]}>
                    {jornada.end_date ? 'Finalizada' : 'Activa'}
                  </Text>
                </View>
                <Text style={estilos.journeyMeta}>Fecha de inicio: {formatearFecha(jornada.start_date)}</Text>
                <Text style={estilos.journeyMeta}>Fecha de fin: {formatearFecha(jornada.end_date)}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={estilos.paginationBar}>
            <TouchableOpacity
              style={[estilos.paginationButton, paginaActual === 1 && estilos.paginationButtonDisabled]}
              onPress={irPaginaAnterior}
              disabled={paginaActual === 1}
            >
              <Text style={[estilos.paginationButtonText, paginaActual === 1 && estilos.paginationButtonTextDisabled]}>
                Anterior
              </Text>
            </TouchableOpacity>
            <Text style={estilos.paginationText}>Pagina {paginaActual} de {totalPaginas}</Text>
            <TouchableOpacity
              style={[estilos.paginationButton, paginaActual === totalPaginas && estilos.paginationButtonDisabled]}
              onPress={irPaginaSiguiente}
              disabled={paginaActual === totalPaginas}
            >
              <Text style={[estilos.paginationButtonText, paginaActual === totalPaginas && estilos.paginationButtonTextDisabled]}>
                Siguiente
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={estilos.card}>
          <Text style={estilos.cardTitle}>Editar jornada seleccionada</Text>
          <Text style={estilos.helpText}>Formato de fecha: YYYY-MM-DD HH:mm. Deja la fecha de fin vacia si la jornada sigue en curso.</Text>

          <Text style={estilos.inputLabel}>Fecha de inicio</Text>
          <TextInput
            value={textoFechaInicio}
            onChangeText={setTextoFechaInicio}
            placeholder="2026-05-08 09:30"
            placeholderTextColor={colors.textMuted}
            style={estilos.input}
            autoCapitalize="none"
          />

          <Text style={estilos.inputLabel}>Fecha de fin</Text>
          <TextInput
            value={textoFechaFin}
            onChangeText={setTextoFechaFin}
            placeholder="Vacio si sigue en curso"
            placeholderTextColor={colors.textMuted}
            style={estilos.input}
            autoCapitalize="none"
          />

          <Text style={estilos.inputLabel}>Observaciones</Text>
          <TextInput
            value={textoObservaciones}
            onChangeText={setTextoObservaciones}
            placeholder="Observaciones de la jornada"
            placeholderTextColor={colors.textMuted}
            style={[estilos.input, estilos.textArea]}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={[estilos.primaryButton, guardando && estilos.disabledButton]} onPress={guardarJornada} disabled={guardando}>
            {guardando ? <ActivityIndicator color={colors.white} /> : <Text style={estilos.primaryButtonText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={estilos.container}>
      <View style={estilos.header}>
        <View style={estilos.headerText}>
          <Text style={estilos.title}>Editar jornadas</Text>
          <Text style={estilos.subtitle}>{usuario?.username ?? 'Operativo'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={estilos.content}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => cargarJornadas(true)} tintColor={colors.primary} />
        }
      >
        {renderizarContenido()}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  stateBox: {
    marginTop: 42,
    alignItems: 'center',
    gap: 12,
  },
  stateCard: {
    marginTop: 26,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  stateText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  counterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  journeyItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  journeyItemActive: {
    backgroundColor: colors.primarySoft,
    borderTopColor: colors.primary,
  },
  journeyHeader: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  journeyMeta: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  statusOpen: {
    backgroundColor: colors.success,
  },
  statusClosed: {
    backgroundColor: colors.textMuted,
  },
  paginationBar: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paginationButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 88,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  paginationButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  paginationButtonTextDisabled: {
    color: colors.textMuted,
  },
  paginationText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  helpText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  inputLabel: {
    marginTop: 12,
    marginBottom: 7,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  textArea: {
    minHeight: 110,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 150,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});

