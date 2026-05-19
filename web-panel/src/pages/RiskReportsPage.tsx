import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";

import { ConfirmDialog, DataTable, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, Pagination, SearchBar } from "../components/ui";
import { apiFetch } from "../utils/api";

type SeveridadRiesgo = "LOW" | "MEDIUM" | "HIGH";

type IncidenteApi = {
  id: string;
  name?: string | null;
  status?: string | null;
  location?: unknown;
  location_address?: string | null;
};

type IncidenteOpcion = {
  id: string;
  name: string;
  status: string;
  coords: LatLngTuple | null;
  locationAddress: string | null;
};

type ReporteRiesgo = {
  id: string;
  incident: string;
  incident_name?: string | null;
  reported_by?: string | null;
  reported_by_id?: string | null;
  location?: unknown;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  severity: SeveridadRiesgo;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  coords: LatLngTuple | null;
};

type AlertaRiesgoApi = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  location?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

type EntradaRiesgo = ReporteRiesgo & {
  origen: "reporte" | "alerta";
  origenId: string;
  alert_type?: string | null;
  alert_status?: string | null;
  duplicadoConReporteId?: string | null;
};

type FormularioRiesgo = {
  incident: string;
  description: string;
  severity: SeveridadRiesgo;
  latitude: string;
  longitude: string;
};

const REPORTES_POR_PAGINA = 10;

const FORMULARIO_INICIAL: FormularioRiesgo = {
  incident: "",
  description: "",
  severity: "MEDIUM",
  latitude: "",
  longitude: "",
};

const OPCIONES_SEVERIDAD: Array<{ value: SeveridadRiesgo; label: string }> = [
  { value: "LOW", label: "Bajo" },
  { value: "MEDIUM", label: "Medio" },
  { value: "HIGH", label: "Alto" },
];

const TIPOS_ALERTA_RIESGO = new Set([
  "FIRE_SPREAD",
  "SMOKE",
  "EVACUATION",
  "ANIMAL",
  "ANIMAL_INJURY",
  "LOW_SUPPLIES",
  "HAZARD",
  "WEATHER",
  "GEOFENCE",
  "ANOMALY",
]);

const ETIQUETAS_ALERTA_RIESGO: Record<string, string> = {
  FIRE_SPREAD: "Cambio de fuego",
  SMOKE: "Humo en incidente",
  EVACUATION: "Evacuacion de zona",
  ANIMAL: "Animal peligroso",
  ANIMAL_INJURY: "Animal herido",
  LOW_SUPPLIES: "Recursos bajos",
  HAZARD: "Peligro ambiental",
  WEATHER: "Clima peligroso",
  GEOFENCE: "Fuera de zona segura",
  ANOMALY: "Anomalia detectada",
};

function normalizarArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

function esLatLngValido(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function extraerCoordenadas(location: unknown, latitude?: number | null, longitude?: number | null): LatLngTuple | null {
  if (latitude != null && longitude != null && esLatLngValido(latitude, longitude)) {
    return [latitude, longitude];
  }

  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lng = Number(location[0]);
    const lat = Number(location[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
  }

  if (typeof location === "object") {
    const candidate = location as { coordinates?: unknown; x?: unknown; y?: unknown; lat?: unknown; lng?: unknown };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const lng = Number(candidate.coordinates[0]);
      const lat = Number(candidate.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const lng = Number(candidate.x);
      const lat = Number(candidate.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }

    if (candidate.lat !== undefined && candidate.lng !== undefined) {
      const lat = Number(candidate.lat);
      const lng = Number(candidate.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }
  }

  if (typeof location === "string") {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }
  }

  return null;
}

function obtenerTexto(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const candidate = value as { name?: unknown; username?: unknown; id?: unknown };
    return obtenerTexto(candidate.name) || obtenerTexto(candidate.username) || obtenerTexto(candidate.id);
  }
  return "";
}

function normalizarIncidentes(payload: unknown): IncidenteOpcion[] {
  return normalizarArray<IncidenteApi>(payload)
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: String(item.id),
      name: obtenerTexto(item.name) || "Incidente sin nombre",
      status: obtenerTexto(item.status) || "OPEN",
      coords: extraerCoordenadas(item.location),
      locationAddress: obtenerTexto(item.location_address) || null,
    }));
}

function normalizarReportes(payload: unknown): ReporteRiesgo[] {
  return normalizarArray<Record<string, unknown>>(payload)
    .filter((item) => typeof item.id === "string")
    .map((item) => {
      const latitude = typeof item.latitude === "number" ? item.latitude : Number(item.latitude);
      const longitude = typeof item.longitude === "number" ? item.longitude : Number(item.longitude);
      const coords = extraerCoordenadas(
        item.location,
        Number.isNaN(latitude) ? null : latitude,
        Number.isNaN(longitude) ? null : longitude,
      );

      return {
        id: String(item.id),
        incident: obtenerTexto(item.incident),
        incident_name: obtenerTexto(item.incident_name) || null,
        reported_by: obtenerTexto(item.reported_by) || null,
        reported_by_id: obtenerTexto(item.reported_by_id) || null,
        location: item.location,
        latitude: coords?.[0] ?? null,
        longitude: coords?.[1] ?? null,
        description: obtenerTexto(item.description) || "Sin descripcion",
        severity: (obtenerTexto(item.severity) || "MEDIUM") as SeveridadRiesgo,
        is_active: Boolean(item.is_active),
        created_at: obtenerTexto(item.created_at) || null,
        updated_at: obtenerTexto(item.updated_at) || null,
        coords,
      };
    });
}

function severidadAlertaARiesgo(severity?: number | null): SeveridadRiesgo {
  if ((severity ?? 3) <= 2) return "HIGH";
  if ((severity ?? 3) === 3) return "MEDIUM";
  return "LOW";
}

function normalizarAlertasRiesgo(payload: unknown, incidentes: IncidenteOpcion[]): EntradaRiesgo[] {
  const incidentesPorId = new Map(incidentes.map((incidente) => [incidente.id, incidente]));

  return normalizarArray<AlertaRiesgoApi>(payload)
    .filter((alerta) => Boolean(alerta.id) && TIPOS_ALERTA_RIESGO.has(String(alerta.alert_type ?? "")))
    .map((alerta) => {
      const incidentId = obtenerTexto(alerta.incident);
      const incidente = incidentesPorId.get(incidentId);
      const tipo = String(alerta.alert_type ?? "");
      const tituloTipo = ETIQUETAS_ALERTA_RIESGO[tipo] ?? tipo;
      const coords = extraerCoordenadas(alerta.location);

      return {
        id: `alerta-${alerta.id}`,
        origenId: alerta.id,
        origen: "alerta" as const,
        incident: incidentId,
        incident_name: incidente?.name ?? null,
        reported_by: obtenerTexto(alerta.created_by) || null,
        reported_by_id: null,
        location: alerta.location,
        latitude: coords?.[0] ?? null,
        longitude: coords?.[1] ?? null,
        description: [alerta.title || tituloTipo, alerta.description].filter(Boolean).join(" - "),
        severity: severidadAlertaARiesgo(alerta.severity),
        is_active: alerta.status !== "CLOSED",
        created_at: alerta.created_at ?? null,
        updated_at: alerta.updated_at ?? null,
        coords,
        alert_type: tipo,
        alert_status: alerta.status ?? null,
      };
    });
}

function redondearCoord(value: number) {
  return value.toFixed(4);
}

function normalizarTextoDuplicado(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
}

function claveZonaRiesgo(item: Pick<EntradaRiesgo, "incident" | "coords" | "description">) {
  if (item.coords) {
    return `${item.incident}|${redondearCoord(item.coords[0])}|${redondearCoord(item.coords[1])}`;
  }
  return `${item.incident}|${normalizarTextoDuplicado(item.description)}`;
}

function distanciaMetros(a: LatLngTuple, b: LatLngTuple) {
  const radioTierra = 6371000;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const deltaLat = ((b[0] - a[0]) * Math.PI) / 180;
  const deltaLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radioTierra * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function unirRiesgosSinDuplicados(reportes: ReporteRiesgo[], alertas: EntradaRiesgo[]): EntradaRiesgo[] {
  const reportesComoEntradas: EntradaRiesgo[] = reportes.map((reporte) => ({
    ...reporte,
    origen: "reporte",
    origenId: reporte.id,
  }));

  const clavesReportes = new Map(reportesComoEntradas.map((reporte) => [claveZonaRiesgo(reporte), reporte]));
  const alertasNoDuplicadas = alertas.filter((alerta) => {
    const duplicadoPorClave = clavesReportes.get(claveZonaRiesgo(alerta));
    if (duplicadoPorClave) return false;

    return !reportesComoEntradas.some((reporte) => {
      if (reporte.incident !== alerta.incident || !reporte.coords || !alerta.coords) return false;
      return distanciaMetros(reporte.coords, alerta.coords) <= 75;
    });
  });

  return [...reportesComoEntradas, ...alertasNoDuplicadas].sort((a, b) => {
    const fechaA = new Date(a.created_at ?? "").getTime();
    const fechaB = new Date(b.created_at ?? "").getTime();
    return (Number.isNaN(fechaB) ? 0 : fechaB) - (Number.isNaN(fechaA) ? 0 : fechaA);
  });
}

function etiquetaSeveridad(severity: string) {
  if (severity === "HIGH") return "Alto";
  if (severity === "MEDIUM") return "Medio";
  if (severity === "LOW") return "Bajo";
  return severity || "-";
}

function claseSeveridad(severity: string) {
  if (severity === "HIGH") return "cm-badge-danger";
  if (severity === "MEDIUM") return "cm-badge-warning";
  return "cm-badge-success";
}

function colorSeveridad(severity: string, activo = true) {
  if (!activo) return "#64748b";
  if (severity === "HIGH") return "#ef4444";
  if (severity === "MEDIUM") return "#f59e0b";
  return "#22c55e";
}

function formatearFecha(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-ES");
}

function SelectorMapaRiesgo({
  value,
  onPick,
}: {
  value: LatLngTuple | null;
  onPick: (coords: LatLngTuple) => void;
}) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return value ? (
    <CircleMarker center={value} radius={9} pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.85, weight: 3 }}>
      <Popup>Ubicacion seleccionada para el reporte</Popup>
    </CircleMarker>
  ) : null;
}

function AjustarMapa({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 13 });
      }
    }, 80);
  }, [map, points]);

  return null;
}

export default function RiskReportsPage() {
  const [reportes, setReportes] = useState<ReporteRiesgo[]>([]);
  const [alertasRiesgo, setAlertasRiesgo] = useState<EntradaRiesgo[]>([]);
  const [incidentes, setIncidentes] = useState<IncidenteOpcion[]>([]);
  const [consulta, setConsulta] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [exitoMensaje, setExitoMensaje] = useState("");
  const [formulario, setFormulario] = useState<FormularioRiesgo>(FORMULARIO_INICIAL);
  const [creando, setCreando] = useState(false);
  const [actualizandoId, setActualizandoId] = useState("");
  const [reportePendienteEliminarId, setReportePendienteEliminarId] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setErrorMensaje("");

    try {
      const [reportesRes, incidentesRes, alertasRes] = await Promise.all([
        apiFetch("/risk-reports/"),
        apiFetch("/incidents/"),
        apiFetch("/alerts/"),
      ]);
      if (!reportesRes.ok || !incidentesRes.ok || !alertasRes.ok) {
        throw new Error("No se pudieron cargar los reportes de riesgo.");
      }

      const incidentesNormalizados = normalizarIncidentes((await incidentesRes.json()) as unknown);
      setReportes(normalizarReportes((await reportesRes.json()) as unknown));
      setAlertasRiesgo(normalizarAlertasRiesgo((await alertasRes.json()) as unknown, incidentesNormalizados));
      setIncidentes(incidentesNormalizados);
      setFormulario((prev) => (prev.incident ? prev : { ...prev, incident: incidentesNormalizados[0]?.id ?? "" }));
    } catch (error) {
      setErrorMensaje(error instanceof Error ? error.message : "No se pudieron cargar los reportes de riesgo.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();
  }, []);

  const reportePendienteEliminar = reportes.find((reporte) => reporte.id === reportePendienteEliminarId) ?? null;
  const entradasRiesgo = useMemo(() => unirRiesgosSinDuplicados(reportes, alertasRiesgo), [alertasRiesgo, reportes]);

  const reportesFiltrados = useMemo(() => {
    const normalized = consulta.trim().toLowerCase();
    return entradasRiesgo.filter((reporte) => {
      const coincideTexto =
        !normalized ||
        `${reporte.description} ${reporte.incident_name ?? ""} ${reporte.reported_by ?? ""} ${reporte.severity} ${reporte.alert_type ?? ""} ${reporte.origen}`
          .toLowerCase()
          .includes(normalized);
      const coincideSeveridad = !filtroSeveridad || reporte.severity === filtroSeveridad;
      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" && reporte.is_active) ||
        (filtroEstado === "inactivos" && !reporte.is_active);
      return coincideTexto && coincideSeveridad && coincideEstado;
    });
  }, [consulta, entradasRiesgo, filtroEstado, filtroSeveridad]);

  const totalPaginas = Math.max(1, Math.ceil(reportesFiltrados.length / REPORTES_POR_PAGINA));
  const reportesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * REPORTES_POR_PAGINA;
    return reportesFiltrados.slice(inicio, inicio + REPORTES_POR_PAGINA);
  }, [paginaActual, reportesFiltrados]);

  const indicadores = useMemo(() => {
    const activos = entradasRiesgo.filter((reporte) => reporte.is_active).length;
    const altos = entradasRiesgo.filter((reporte) => reporte.is_active && reporte.severity === "HIGH").length;
    const medios = entradasRiesgo.filter((reporte) => reporte.is_active && reporte.severity === "MEDIUM").length;
    const inactivos = entradasRiesgo.filter((reporte) => !reporte.is_active).length;
    const desdeAlertas = entradasRiesgo.filter((reporte) => reporte.origen === "alerta").length;
    return { activos, altos, medios, inactivos, desdeAlertas };
  }, [entradasRiesgo]);

  const puntosMapa = useMemo(
    () => reportesFiltrados.filter((reporte) => reporte.coords).map((reporte) => reporte.coords as LatLngTuple),
    [reportesFiltrados],
  );

  const posicionSeleccionada = useMemo(() => {
    const lat = Number(formulario.latitude);
    const lng = Number(formulario.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng) || !formulario.latitude || !formulario.longitude) return null;
    return [lat, lng] as LatLngTuple;
  }, [formulario.latitude, formulario.longitude]);

  const centroMapa = posicionSeleccionada ?? puntosMapa[0] ?? incidentes.find((incidente) => incidente.coords)?.coords ?? ([40.4168, -3.7038] as LatLngTuple);

  useEffect(() => {
    setPaginaActual(1);
  }, [consulta, filtroEstado, filtroSeveridad]);

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  function actualizarFormulario(parcial: Partial<FormularioRiesgo>) {
    setFormulario((prev) => ({ ...prev, ...parcial }));
  }

  function seleccionarIncidente(incidentId: string) {
    const incidente = incidentes.find((item) => item.id === incidentId);
    setFormulario((prev) => ({
      ...prev,
      incident: incidentId,
      latitude: prev.latitude || (incidente?.coords ? String(incidente.coords[0]) : ""),
      longitude: prev.longitude || (incidente?.coords ? String(incidente.coords[1]) : ""),
    }));
  }

  async function crearReporte(event: FormEvent) {
    event.preventDefault();
    if (creando) return;

    setErrorMensaje("");
    setExitoMensaje("");

    const lat = Number(formulario.latitude);
    const lng = Number(formulario.longitude);

    if (!formulario.incident) {
      setErrorMensaje("Selecciona un incidente para el reporte.");
      return;
    }
    if (!formulario.description.trim()) {
      setErrorMensaje("La descripcion del riesgo es obligatoria.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng) || !esLatLngValido(lat, lng)) {
      setErrorMensaje("Selecciona una ubicacion valida en el mapa o escribe coordenadas validas.");
      return;
    }

    const duplicadoExistente = entradasRiesgo.find((entrada) => {
      if (!entrada.is_active || entrada.incident !== formulario.incident || !entrada.coords) return false;
      return distanciaMetros(entrada.coords, [lat, lng]) <= 75;
    });

    if (duplicadoExistente) {
      setErrorMensaje(
        `Ya existe ${duplicadoExistente.origen === "alerta" ? "una alerta de riesgo" : "un reporte de riesgo"} activo en esa zona. Gestiona el existente para evitar duplicados.`,
      );
      return;
    }

    setCreando(true);
    try {
      const response = await apiFetch("/risk-reports/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: formulario.incident,
          description: formulario.description.trim(),
          severity: formulario.severity,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        let detail = "No se pudo crear el reporte de riesgo.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          const firstKey = Object.keys(data)[0];
          if (typeof data.detail === "string") detail = data.detail;
          else if (firstKey) detail = Array.isArray(data[firstKey]) ? `${firstKey}: ${String((data[firstKey] as unknown[])[0])}` : `${firstKey}: ${String(data[firstKey])}`;
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensaje(detail);
        return;
      }

      const nuevoReporte = normalizarReportes([await response.json()])[0];
      setReportes((prev) => [nuevoReporte, ...prev]);
      setFormulario((prev) => ({ ...FORMULARIO_INICIAL, incident: prev.incident }));
      setExitoMensaje("Reporte de riesgo creado correctamente.");
    } finally {
      setCreando(false);
    }
  }

  async function cambiarEstadoReporte(reporte: ReporteRiesgo) {
    if (actualizandoId) return;

    setActualizandoId(reporte.id);
    setErrorMensaje("");
    setExitoMensaje("");

    try {
      const action = reporte.is_active ? "deactivate" : "activate";
      const response = await apiFetch(`/risk-reports/${reporte.id}/${action}/`, { method: "POST" });
      if (!response.ok) {
        throw new Error(reporte.is_active ? "No se pudo desactivar el reporte." : "No se pudo reactivar el reporte.");
      }
      const actualizado = normalizarReportes([await response.json()])[0];
      setReportes((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
    } catch (error) {
      setErrorMensaje(error instanceof Error ? error.message : "No se pudo actualizar el reporte.");
    } finally {
      setActualizandoId("");
    }
  }

  async function cerrarAlertaRiesgo(alerta: EntradaRiesgo) {
    if (actualizandoId || alerta.origen !== "alerta" || !alerta.is_active) return;

    setActualizandoId(alerta.id);
    setErrorMensaje("");
    setExitoMensaje("");

    try {
      const response = await apiFetch(`/alerts/${alerta.origenId}/close/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close_notes: "Cerrada desde modulo de reportes de riesgo." }),
      });
      if (!response.ok) {
        throw new Error("No se pudo cerrar la alerta de riesgo.");
      }

      const actualizada = normalizarAlertasRiesgo([await response.json()], incidentes)[0];
      setAlertasRiesgo((prev) => prev.map((item) => (item.origenId === actualizada.origenId ? actualizada : item)));
    } catch (error) {
      setErrorMensaje(error instanceof Error ? error.message : "No se pudo cerrar la alerta de riesgo.");
    } finally {
      setActualizandoId("");
    }
  }

  async function cambiarEstadoEntrada(entrada: EntradaRiesgo) {
    if (entrada.origen === "alerta") {
      await cerrarAlertaRiesgo(entrada);
      return;
    }
    await cambiarEstadoReporte(entrada);
  }

  async function confirmarEliminarReporte() {
    if (!reportePendienteEliminar || actualizandoId) return;

    setActualizandoId(reportePendienteEliminar.id);
    setErrorMensaje("");
    setExitoMensaje("");

    try {
      const response = await apiFetch(`/risk-reports/${reportePendienteEliminar.id}/`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("No se pudo eliminar el reporte de riesgo.");
      }
      setReportes((prev) => prev.filter((item) => item.id !== reportePendienteEliminar.id));
      setReportePendienteEliminarId("");
    } catch (error) {
      setErrorMensaje(error instanceof Error ? error.message : "No se pudo eliminar el reporte de riesgo.");
    } finally {
      setActualizandoId("");
    }
  }

  if (cargando) {
    return <LoadingState label="Cargando reportes de riesgo..." />;
  }

  return (
    <div className="cm-shell cm-page">
      <PageHeader
        eyebrow="Riesgo"
        title="Reportes de riesgo"
        description="Modulo operativo que unifica risk_reports con alertas de tipo riesgo para registrar peligros sin duplicarlos."
        actions={
          <button
            type="button"
            onClick={() => void cargarDatos()}
            className="cm-btn cm-btn-secondary"
          >
            Recargar
          </button>
        }
      />

      {errorMensaje ? <ErrorBanner message={errorMensaje} className="mt-4" /> : null}
      {exitoMensaje ? <div className="cm-badge-success mt-4 rounded-xl p-3 text-sm">{exitoMensaje}</div> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Activos" value={indicadores.activos} tone="success" />
        <MetricCard label="Riesgo alto" value={indicadores.altos} tone="danger" />
        <MetricCard label="Riesgo medio" value={indicadores.medios} tone="warning" />
        <MetricCard label="Desde alertas" value={indicadores.desdeAlertas} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <SearchBar
                value={consulta}
                onChange={(event) => setConsulta(event.target.value)}
                onClear={() => setConsulta("")}
                placeholder="Buscar por descripcion, incidente, severidad o usuario..."
                resultLabel={`${reportesFiltrados.length} de ${entradasRiesgo.length} riesgos`}
              />
              <select
                value={filtroSeveridad}
                onChange={(event) => setFiltroSeveridad(event.target.value)}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cm-info)]"
              >
                <option value="">Todas las severidades</option>
                {OPCIONES_SEVERIDAD.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cm-info)]"
              >
                <option value="activos">Solo activos</option>
                <option value="inactivos">Solo inactivos</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]">
            <MapContainer center={centroMapa} zoom={puntosMapa.length ? 11 : 6} scrollWheelZoom style={{ height: "430px", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <AjustarMapa points={[...puntosMapa, ...(posicionSeleccionada ? [posicionSeleccionada] : [])]} />
              {reportesFiltrados.map((reporte) =>
                reporte.coords ? (
                  <CircleMarker
                    key={reporte.id}
                    center={reporte.coords}
                    radius={reporte.severity === "HIGH" ? 11 : reporte.severity === "MEDIUM" ? 9 : 7}
                    pathOptions={{
                      color: colorSeveridad(reporte.severity, reporte.is_active),
                      fillColor: colorSeveridad(reporte.severity, reporte.is_active),
                      fillOpacity: reporte.is_active ? 0.72 : 0.35,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <strong>{etiquetaSeveridad(reporte.severity)}</strong>
                      <br />
                      {reporte.origen === "alerta" ? "Alerta de riesgo" : "Reporte de riesgo"}
                      <br />
                      {reporte.incident_name || "Incidente"}
                      <br />
                      {reporte.description}
                    </Popup>
                  </CircleMarker>
                ) : null,
              )}
              <SelectorMapaRiesgo
                value={posicionSeleccionada}
                onPick={(coords) => {
                  actualizarFormulario({ latitude: coords[0].toFixed(6), longitude: coords[1].toFixed(6) });
                }}
              />
            </MapContainer>
          </div>

          {reportesFiltrados.length === 0 ? (
            <EmptyState
              title="No hay reportes de riesgo"
              description="Ajusta los filtros o crea un reporte nuevo desde el formulario."
            />
          ) : (
            <div className="grid gap-3 md:hidden">
              {reportesPaginados.map((reporte) => (
                <article key={reporte.id} className="cm-card cm-card-pad">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold">{reporte.incident_name || "Incidente"}</h2>
                      <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{reporte.description}</p>
                    </div>
                    <span className={`${claseSeveridad(reporte.severity)} shrink-0 rounded-full px-2.5 py-1 text-xs`}>
                      {etiquetaSeveridad(reporte.severity)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void cambiarEstadoEntrada(reporte)}
                      disabled={reporte.origen === "alerta" && !reporte.is_active}
                      className="cm-btn cm-btn-sm cm-btn-secondary"
                    >
                      {reporte.origen === "alerta"
                        ? reporte.is_active
                          ? "Cerrar alerta"
                          : "Alerta cerrada"
                        : reporte.is_active
                        ? "Desactivar"
                        : "Reactivar"}
                    </button>
                    {reporte.origen === "reporte" ? (
                      <button type="button" onClick={() => setReportePendienteEliminarId(reporte.id)} className="cm-btn cm-btn-sm cm-btn-danger">
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          <DataTable minWidth="1050px" wrapperClassName="hidden md:block">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Incidente</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Descripcion</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Severidad</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Origen</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Reportado por</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Fecha</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportesPaginados.map((reporte) => (
                <tr key={reporte.id}>
                  <td className="px-4 py-3.5 font-medium">{reporte.incident_name || reporte.incident}</td>
                  <td className="max-w-md px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                    <p className="line-clamp-2">{reporte.description}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${claseSeveridad(reporte.severity)} rounded-full px-2.5 py-1 text-xs`}>
                      {etiquetaSeveridad(reporte.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${reporte.origen === "alerta" ? "cm-badge-warning" : "cm-badge-info"} rounded-full px-2.5 py-1 text-xs`}>
                      {reporte.origen === "alerta" ? "Alerta" : "Reporte"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${reporte.is_active ? "cm-badge-success" : "cm-badge-neutral"} rounded-full px-2.5 py-1 text-xs`}>
                      {reporte.origen === "alerta"
                        ? reporte.is_active
                          ? "Alerta activa"
                          : "Alerta cerrada"
                        : reporte.is_active
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">{reporte.reported_by || "Usuario"}</td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{formatearFecha(reporte.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actualizandoId === reporte.id}
                        onClick={() => void cambiarEstadoEntrada(reporte)}
                        className="cm-btn cm-btn-sm cm-btn-secondary"
                      >
                        {reporte.origen === "alerta"
                          ? reporte.is_active
                            ? "Cerrar alerta"
                            : "Cerrada"
                          : reporte.is_active
                          ? "Desactivar"
                          : "Reactivar"}
                      </button>
                      {reporte.origen === "reporte" ? (
                        <button
                          type="button"
                          onClick={() => setReportePendienteEliminarId(reporte.id)}
                          className="cm-btn cm-btn-sm cm-btn-danger"
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {reportesFiltrados.length === 0 ? <EmptyState colSpan={8} title="No hay riesgos para mostrar" /> : null}
            </tbody>
          </DataTable>

          <Pagination
            page={paginaActual}
            totalPages={totalPaginas}
            visibleCount={reportesPaginados.length}
            totalCount={reportesFiltrados.length}
            itemLabel="riesgos"
            onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
            onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Nuevo riesgo</p>
            <h2 className="mt-2 text-xl font-bold">Crear reporte</h2>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Selecciona el incidente, describe el peligro y pulsa en el mapa para fijar la ubicacion.
            </p>

            <form onSubmit={crearReporte} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Incidente</label>
                <select
                  value={formulario.incident}
                  onChange={(event) => seleccionarIncidente(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                >
                  <option value="">Selecciona un incidente</option>
                  {incidentes.map((incidente) => (
                    <option key={incidente.id} value={incidente.id}>
                      {incidente.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Severidad</label>
                <div className="grid grid-cols-3 gap-2">
                  {OPCIONES_SEVERIDAD.map((opcion) => (
                    <label
                      key={opcion.value}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-semibold transition ${
                        formulario.severity === opcion.value
                          ? `${claseSeveridad(opcion.value)} border-transparent`
                          : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="risk-severity"
                        value={opcion.value}
                        checked={formulario.severity === opcion.value}
                        onChange={() => actualizarFormulario({ severity: opcion.value })}
                        className="sr-only"
                      />
                      {opcion.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Descripcion del riesgo</label>
                <textarea
                  value={formulario.description}
                  onChange={(event) => actualizarFormulario({ description: event.target.value })}
                  rows={5}
                  placeholder="Ej. Camino bloqueado, humo denso, zona de desprendimiento, cable caido..."
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Latitud</label>
                  <input
                    value={formulario.latitude}
                    onChange={(event) => actualizarFormulario({ latitude: event.target.value })}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Longitud</label>
                  <input
                    value={formulario.longitude}
                    onChange={(event) => actualizarFormulario({ longitude: event.target.value })}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creando}
                className="cm-btn cm-btn-danger w-full"
              >
                {creando ? "Creando..." : "Crear reporte de riesgo"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Leyenda</p>
            <div className="mt-4 space-y-2 text-sm text-[color:var(--cm-text-muted)]">
              <p><span className="font-semibold text-red-400">Rojo:</span> riesgo alto activo.</p>
              <p><span className="font-semibold text-amber-400">Amarillo:</span> riesgo medio activo.</p>
              <p><span className="font-semibold text-emerald-400">Verde:</span> riesgo bajo activo.</p>
              <p><span className="font-semibold text-slate-400">Gris:</span> riesgo desactivado o alerta cerrada.</p>
              <p>Las alertas de tipo riesgo se integran aqui y se ocultan si ya existe un reporte en la misma zona.</p>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(reportePendienteEliminar)}
        eyebrow="Eliminar riesgo"
        title="¿Quieres borrar este reporte?"
        confirmLabel={actualizandoId === reportePendienteEliminar?.id ? "Borrando..." : "Confirmar borrado"}
        isBusy={Boolean(actualizandoId)}
        onCancel={() => setReportePendienteEliminarId("")}
        onConfirm={() => void confirmarEliminarReporte()}
      >
        <p>Se eliminara definitivamente el reporte de riesgo seleccionado.</p>
        <p>Esta accion no se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  );
}
