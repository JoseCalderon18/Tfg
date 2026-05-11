import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";
import { getAlertSeverityBadge, getAlertStatusBadge } from "../utils/statusColors";
import { ConfirmDialog, DataTable, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, Pagination, SearchBar } from "../components/ui";

type FilaAlerta = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  location?: unknown;
  lat?: number | null;
  lng?: number | null;
};

type IncidenteAlerta = {
  id: string;
  name?: string | null;
  status?: string | null;
  location?: unknown;
};

type IncidenteNormalizado = {
  id: string;
  name: string;
  status: string;
  coords: LatLngTuple | null;
};

type FormularioAlerta = {
  incident: string;
  alert_type: string;
  severity: number;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  SOS: "SOS Emergencia",
  MAN_DOWN: "Operativo caido",
  FIRE_SPREAD: "Cambio de fuego",
  SMOKE: "Humo en incidente",
  INJURY: "Operativo herido",
  DEATH: "Operativo fallecido",
  EVACUATION: "Evacuacion de zona",
  MEDICAL: "Emergencia medica",
  TRAPPED: "Operativo atrapado",
  VEHICLE: "Incidente vehicular",
  ANIMAL: "Animal peligroso",
  ANIMAL_INJURY: "Animal herido",
  LOW_SUPPLIES: "Recursos bajos",
  COMM_LOSS: "Perdida de comunicacion",
  HAZARD: "Peligro ambiental",
  FATIGUE: "Fatiga extrema",
  WEATHER: "Clima peligroso",
  LOST: "Operativo perdido",
  GEOFENCE: "Fuera de zona segura",
  ANOMALY: "Anomalia detectada",
  BATERY: "Bateria baja",
  MOVEMENT: "Inmovilidad prolongada",
  OTHER: "Otro",
};

const ALERT_TYPE_OPTIONS = Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const SEVERITY_OPTIONS = [
  { value: 1, label: "Critica" },
  { value: 2, label: "Alta" },
  { value: 3, label: "Media" },
  { value: 4, label: "Baja" },
  { value: 5, label: "Informativa" },
];

const FORMULARIO_ALERTA_INICIAL: FormularioAlerta = {
  incident: "",
  alert_type: "SOS",
  severity: 3,
  title: "",
  description: "",
  latitude: "",
  longitude: "",
};

function obtenerEtiquetaTipoAlerta(type?: string | null) {
  if (!type) return "Desconocido";
  return ALERT_TYPE_LABELS[type] ?? type;
}

function obtenerBadgeAlerta(type?: string | null) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN" || type === "INJURY" || type === "DEATH" || type === "TRAPPED") return "cm-badge-alert";
  if (type === "GEOFENCE" || type === "FIRE_SPREAD" || type === "SMOKE" || type === "WEATHER" || type === "HAZARD") return "cm-badge-warning";
  if (type === "BATERY" || type === "MOVEMENT") return "cm-badge-warning";
  if (type === "OTHER") return "cm-badge-special";
  return "cm-badge-info";
}

function obtenerBadgeEstado(status?: string | null) {
  return getAlertStatusBadge(status);
}

function obtenerEtiquetaSeveridad(severity?: number | null) {
  if ((severity ?? 5) <= 1) return "Crítica";
  if ((severity ?? 5) === 2) return "Alta";
  if ((severity ?? 5) === 3) return "Media";
  if ((severity ?? 5) === 4) return "Baja";
  return "Informativa";
}

const ALERTAS_POR_PAGINA = 10;

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

function extraerCoordenadas(location: unknown, latValue?: number | null, lngValue?: number | null): LatLngTuple | null {
  if (latValue != null && lngValue != null && esLatLngValido(latValue, lngValue)) return [latValue, lngValue];

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

function normalizarIncidentes(payload: unknown): IncidenteNormalizado[] {
  return normalizarArray<IncidenteAlerta>(payload)
    .filter((incidente) => Boolean(incidente.id))
    .map((incidente) => ({
      id: String(incidente.id),
      name: String(incidente.name ?? "Incidente sin nombre"),
      status: String(incidente.status ?? "OPEN"),
      coords: extraerCoordenadas(incidente.location),
    }));
}

function SelectorMapaAlerta({ value, onPick }: { value: LatLngTuple | null; onPick: (coords: LatLngTuple) => void }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return value ? (
    <CircleMarker center={value} radius={9} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.85, weight: 3 }}>
      <Popup>Ubicacion seleccionada para la alerta</Popup>
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
        map.fitBounds(L.latLngBounds(points), { padding: [26, 26], maxZoom: 13 });
      }
    }, 80);
  }, [map, points]);
  return null;
}

export default function AlertsPage() {
  const navegar = useNavigate();
  const [alertas, setAlertas] = useState<FilaAlerta[]>([]);
  const [incidentes, setIncidentes] = useState<IncidenteNormalizado[]>([]);
  const [consulta, setConsulta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [creandoAlerta, setCreandoAlerta] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [exitoMensaje, setExitoMensaje] = useState("");
  const [formularioAlerta, setFormularioAlerta] = useState<FormularioAlerta>(FORMULARIO_ALERTA_INICIAL);
  const [alertaPendienteEliminarId, setAlertaPendienteEliminarId] = useState("");
  const [alertaEliminandoId, setAlertaEliminandoId] = useState("");
  const [alertaActualizandoId, setAlertaActualizandoId] = useState("");

  useEffect(() => {
    (async () => {
      const [alertasResponse, incidentesResponse] = await Promise.all([apiFetch("/alerts/"), apiFetch("/incidents/")]);
      if (!alertasResponse.ok || !incidentesResponse.ok) {
        setErrorMensaje("No se pudieron cargar las alertas o incidentes.");
        setCargando(false);
        return;
      }
      const alertasPayload = (await alertasResponse.json()) as { results?: FilaAlerta[] } | FilaAlerta[];
      const incidentesNormalizados = normalizarIncidentes((await incidentesResponse.json()) as unknown);
      setAlertas(Array.isArray(alertasPayload) ? alertasPayload : alertasPayload.results ?? []);
      setIncidentes(incidentesNormalizados);
      setFormularioAlerta((prev) => {
        if (prev.incident || incidentesNormalizados.length === 0) return prev;
        const incidente = incidentesNormalizados[0];
        return {
          ...prev,
          incident: incidente.id,
          latitude: incidente.coords ? String(incidente.coords[0]) : "",
          longitude: incidente.coords ? String(incidente.coords[1]) : "",
        };
      });
      setErrorMensaje("");
      setCargando(false);
    })();
  }, []);

  const alertasFiltradas = useMemo(() => {
    const normalized = consulta.trim().toLowerCase();
    if (!normalized) return alertas;
    return alertas.filter((alerta) =>
      `${alerta.alert_type ?? ""} ${obtenerEtiquetaTipoAlerta(alerta.alert_type)} ${alerta.title ?? ""} ${alerta.status ?? ""} ${alerta.created_by ?? ""}`
        .concat(` ${alerta.description ?? ""}`)
        .toLowerCase()
        .includes(normalized)
    );
  }, [alertas, consulta]);

  const totalPaginas = Math.max(1, Math.ceil(alertasFiltradas.length / ALERTAS_POR_PAGINA));

  const alertasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ALERTAS_POR_PAGINA;
    return alertasFiltradas.slice(inicio, inicio + ALERTAS_POR_PAGINA);
  }, [alertasFiltradas, paginaActual]);

  const indicadores = useMemo(() => {
    const abiertas = alertas.filter((alerta) => alerta.status === "OPEN").length;
    const reconocidas = alertas.filter((alerta) => alerta.status === "ACK").length;
    const cerradas = alertas.filter((alerta) => alerta.status === "CLOSED").length;
    const criticas = alertas.filter((alerta) => (alerta.severity ?? 5) <= 2 && alerta.status !== "CLOSED").length;
    return { abiertas, reconocidas, cerradas, criticas };
  }, [alertas]);

  useEffect(() => {
    setPaginaActual(1);
  }, [consulta]);

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  useEffect(() => {
    if (!alertaPendienteEliminarId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !alertaEliminandoId) {
        setAlertaPendienteEliminarId("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [alertaPendienteEliminarId, alertaEliminandoId]);

  const alertaPendienteEliminar = alertas.find((alerta) => alerta.id === alertaPendienteEliminarId) ?? null;
  const coordenadasFormulario = useMemo(() => {
    const lat = Number(formularioAlerta.latitude);
    const lng = Number(formularioAlerta.longitude);
    if (!formularioAlerta.latitude || !formularioAlerta.longitude || Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (!esLatLngValido(lat, lng)) return null;
    return [lat, lng] as LatLngTuple;
  }, [formularioAlerta.latitude, formularioAlerta.longitude]);

  const centroMapaFormulario =
    coordenadasFormulario ?? incidentes.find((incidente) => incidente.coords)?.coords ?? ([40.4168, -3.7038] as LatLngTuple);

  function actualizarFormularioAlerta(parcial: Partial<FormularioAlerta>) {
    setFormularioAlerta((prev) => ({ ...prev, ...parcial }));
  }

  function seleccionarIncidente(incidentId: string) {
    const incidente = incidentes.find((item) => item.id === incidentId);
    setFormularioAlerta((prev) => ({
      ...prev,
      incident: incidentId,
      latitude: incidente?.coords ? String(incidente.coords[0]) : prev.latitude,
      longitude: incidente?.coords ? String(incidente.coords[1]) : prev.longitude,
    }));
  }

  async function crearAlerta(event: FormEvent) {
    event.preventDefault();
    if (creandoAlerta) return;

    setErrorMensaje("");
    setExitoMensaje("");

    const lat = Number(formularioAlerta.latitude);
    const lng = Number(formularioAlerta.longitude);

    if (!formularioAlerta.title.trim()) {
      setErrorMensaje("El titulo de la alerta es obligatorio.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng) || !esLatLngValido(lat, lng)) {
      setErrorMensaje("Selecciona una ubicacion valida en el mapa o escribe coordenadas validas.");
      return;
    }

    setCreandoAlerta(true);
    try {
      const response = await apiFetch("/alerts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: formularioAlerta.incident || null,
          alert_type: formularioAlerta.alert_type,
          severity: formularioAlerta.severity,
          title: formularioAlerta.title.trim(),
          description: formularioAlerta.description.trim(),
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        let detail = "No se pudo crear la alerta.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          const firstKey = Object.keys(data)[0];
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else if (firstKey) {
            const value = data[firstKey];
            detail = Array.isArray(value) ? `${firstKey}: ${String(value[0])}` : `${firstKey}: ${String(value)}`;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensaje(detail);
        return;
      }

      const nuevaAlerta = (await response.json()) as FilaAlerta;
      setAlertas((prev) => [nuevaAlerta, ...prev]);
      setFormularioAlerta((prev) => ({
        ...FORMULARIO_ALERTA_INICIAL,
        incident: prev.incident,
        latitude: prev.latitude,
        longitude: prev.longitude,
      }));
      setExitoMensaje("Alerta creada correctamente.");
    } finally {
      setCreandoAlerta(false);
    }
  }

  async function prepararEliminarAlerta(alertId: string) {
    setAlertaPendienteEliminarId(alertId);
  }

  async function confirmarEliminarAlerta(alertId: string) {
    if (alertaEliminandoId) return;

    setErrorMensaje("");
    setAlertaEliminandoId(alertId);
    try {
      const response = await apiFetch(`/alerts/${alertId}/`, { method: "DELETE" });
      if (!response.ok) {
        let detail = "No se pudo borrar la alerta.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensaje(detail);
        return;
      }

      setAlertas((prev) => prev.filter((alerta) => alerta.id !== alertId));
      setAlertaPendienteEliminarId("");
    } finally {
      setAlertaEliminandoId("");
    }
  }

  async function actualizarEstadoAlerta(alertId: string, accion: "acknowledge" | "close") {
    if (alertaActualizandoId) return;

    setErrorMensaje("");
    setAlertaActualizandoId(alertId);
    try {
      const response = await apiFetch(`/alerts/${alertId}/${accion}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accion === "acknowledge" ? { ack_notes: "" } : { close_notes: "" }),
      });

      if (!response.ok) {
        let detail = accion === "acknowledge" ? "No se pudo reconocer la alerta." : "No se pudo cerrar la alerta.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else if (typeof data.error === "string") {
            detail = data.error;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensaje(detail);
        return;
      }

      const alertaActualizada = (await response.json()) as FilaAlerta;
      setAlertas((prev) => prev.map((alerta) => (alerta.id === alertId ? { ...alerta, ...alertaActualizada } : alerta)));
    } finally {
      setAlertaActualizandoId("");
    }
  }

  if (cargando) {
    return <LoadingState label="Cargando alertas..." />;
  }

  return (
    <div className="cm-shell cm-page">
      <div className="w-full">
        <PageHeader
          eyebrow="Alertas"
          title="Centro de alertas operativas"
          description="Vista operativa con prioridades visuales, más registros y búsqueda para análisis rápido."
          actions={
            <div className="flex flex-wrap gap-2 text-xs">
            <span className="cm-badge-success rounded-full px-3 py-1">Abierta</span>
            <span className="cm-badge-warning rounded-full px-3 py-1">Evaluación</span>
            <span className="cm-badge-neutral rounded-full px-3 py-1">Cerrada</span>
            </div>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Abiertas" value={indicadores.abiertas} tone="success" />
          <MetricCard label="Reconocidas" value={indicadores.reconocidas} tone="warning" />
          <MetricCard label="Críticas" value={indicadores.criticas} tone="danger" />
          <MetricCard label="Cerradas" value={indicadores.cerradas} />
        </div>

        {exitoMensaje ? <div className="cm-badge-success mt-4 rounded-xl p-3 text-sm">{exitoMensaje}</div> : null}
        {errorMensaje ? <ErrorBanner message={errorMensaje} className="mt-4" /> : null}

        <section className="mt-5 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Nueva alerta</p>
              <h2 className="mt-2 text-xl font-bold">Crear alerta desde el panel</h2>
              <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                Registra una alerta manual con descripcion y ubicacion operativa.
              </p>
            </div>
            <span className={`${obtenerBadgeAlerta(formularioAlerta.alert_type)} rounded-full px-3 py-1 text-xs`}>
              {obtenerEtiquetaTipoAlerta(formularioAlerta.alert_type)}
            </span>
          </div>

          <form onSubmit={crearAlerta} className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Incidente relacionado</label>
                <select
                  value={formularioAlerta.incident}
                  onChange={(event) => seleccionarIncidente(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                >
                  <option value="">Sin incidente</option>
                  {incidentes.map((incidente) => (
                    <option key={incidente.id} value={incidente.id}>
                      {incidente.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Tipo de alerta</label>
                <select
                  value={formularioAlerta.alert_type}
                  onChange={(event) => actualizarFormularioAlerta({ alert_type: event.target.value })}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                >
                  {ALERT_TYPE_OPTIONS.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Titulo</label>
                <input
                  value={formularioAlerta.title}
                  onChange={(event) => actualizarFormularioAlerta({ title: event.target.value })}
                  placeholder="Ej. Humo denso en ladera norte"
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Severidad</label>
                <select
                  value={formularioAlerta.severity}
                  onChange={(event) => actualizarFormularioAlerta({ severity: Number(event.target.value) })}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                >
                  {SEVERITY_OPTIONS.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Descripcion</label>
                <textarea
                  value={formularioAlerta.description}
                  onChange={(event) => actualizarFormularioAlerta({ description: event.target.value })}
                  rows={4}
                  placeholder="Describe lo que ocurre, unidades afectadas, zona concreta o instrucciones para el equipo..."
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Latitud</label>
                <input
                  value={formularioAlerta.latitude}
                  onChange={(event) => actualizarFormularioAlerta({ latitude: event.target.value })}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Longitud</label>
                <input
                  value={formularioAlerta.longitude}
                  onChange={(event) => actualizarFormularioAlerta({ longitude: event.target.value })}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--cm-info)]"
                  inputMode="decimal"
                />
              </div>

              <div className="flex items-end md:col-span-2">
                <button type="submit" disabled={creandoAlerta} className="cm-btn cm-btn-danger w-full md:w-auto">
                  {creandoAlerta ? "Creando alerta..." : "Crear alerta"}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[color:var(--cm-border)]">
              <MapContainer center={centroMapaFormulario} zoom={coordenadasFormulario ? 13 : 6} scrollWheelZoom style={{ height: "360px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <AjustarMapa points={coordenadasFormulario ? [coordenadasFormulario] : []} />
                <SelectorMapaAlerta
                  value={coordenadasFormulario}
                  onPick={(coords) =>
                    actualizarFormularioAlerta({
                      latitude: coords[0].toFixed(6),
                      longitude: coords[1].toFixed(6),
                    })
                  }
                />
              </MapContainer>
            </div>
          </form>
        </section>

        <SearchBar
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          onClear={() => setConsulta("")}
          placeholder="Buscar por tipo, título, estado o creador..."
          resultLabel={`${alertasFiltradas.length} de ${alertas.length} alertas`}
        />

        {alertasFiltradas.length === 0 ? (
          <EmptyState
            title="No hay alertas para mostrar"
            description={consulta ? "Prueba con otra búsqueda o limpia el filtro." : "Cuando haya alertas aparecerán en este listado."}
          />
        ) : (
          <div className="mt-4 grid gap-3 md:hidden">
            {alertasPaginadas.map((alerta) => (
              <article key={alerta.id} className="cm-card cm-card-pad">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{alerta.title || "Alerta sin título"}</h2>
                    <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                      {alerta.created_by || "Sistema"} · {alerta.created_at ? new Date(alerta.created_at).toLocaleString() : "-"}
                    </p>
                  </div>
                  <span className={`${obtenerBadgeEstado(alerta.status)} shrink-0 rounded-full px-2.5 py-1 text-xs`}>
                    {alerta.status === "OPEN" ? "Abierta" : alerta.status === "ACK" ? "Evaluación" : alerta.status === "CLOSED" ? "Cerrada" : "Desconocida"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`${obtenerBadgeAlerta(alerta.alert_type)} rounded-full px-2.5 py-1 text-xs`}>
                    {obtenerEtiquetaTipoAlerta(alerta.alert_type)}
                  </span>
                  <span className={`${getAlertSeverityBadge(alerta.severity)} rounded-full px-2.5 py-1 text-xs`}>
                    {obtenerEtiquetaSeveridad(alerta.severity)}
                  </span>
                </div>
                {alerta.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[color:var(--cm-text-muted)]">{alerta.description}</p>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navegar(`/editAlert/${alerta.id}`)} className="cm-btn cm-btn-primary">
                    Ver
                  </button>
                  <button type="button" onClick={() => prepararEliminarAlerta(alerta.id)} className="cm-btn cm-btn-danger">
                    Eliminar
                  </button>
                  {alerta.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => void actualizarEstadoAlerta(alerta.id, "acknowledge")}
                      disabled={alertaActualizandoId === alerta.id}
                      className="cm-btn cm-btn-warning"
                    >
                      Reconocer
                    </button>
                  ) : null}
                  {alerta.status !== "CLOSED" ? (
                    <button
                      type="button"
                      onClick={() => void actualizarEstadoAlerta(alerta.id, "close")}
                      disabled={alertaActualizandoId === alerta.id}
                      className="cm-btn cm-btn-success"
                    >
                      Cerrar
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <DataTable minWidth="1220px" wrapperClassName="mt-4 hidden md:block">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Titulo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Descripcion</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Severidad</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Creada por</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Fecha</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alertasPaginadas.map((alerta) => (
                <tr key={alerta.id}>
                  <td className="px-4 py-3.5">
                    <span className={`${obtenerBadgeAlerta(alerta.alert_type)} rounded-full px-2.5 py-1 text-xs`}>
                      {obtenerEtiquetaTipoAlerta(alerta.alert_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{alerta.title || "Alerta sin titulo"}</td>
                  <td className="max-w-md px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                    <p className="line-clamp-2">{alerta.description || "-"}</p>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`${getAlertSeverityBadge(alerta.severity)} rounded-full px-2.5 py-1 text-xs`}>
                      {obtenerEtiquetaSeveridad(alerta.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${obtenerBadgeEstado(alerta.status)} rounded-full px-2.5 py-1 text-xs`}>
                      {alerta.status === "OPEN"
                        ? "Abierta"
                        : alerta.status === "ACK"
                        ? "Evaluación"
                        : alerta.status === "CLOSED"
                        ? "Cerrada"
                        : "Desconocida"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alerta.created_by || "Sistema"}
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alerta.created_at ? new Date(alerta.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navegar(`/editAlert/${alerta.id}`)}
                    className="cm-btn cm-btn-sm cm-btn-primary"
                      >
                        Ver
                      </button>
                      {alerta.status === "OPEN" ? (
                        <button
                          type="button"
                          onClick={() => void actualizarEstadoAlerta(alerta.id, "acknowledge")}
                          disabled={alertaActualizandoId === alerta.id}
                          className="cm-btn cm-btn-sm cm-btn-warning"
                        >
                          {alertaActualizandoId === alerta.id ? "Guardando..." : "Reconocer"}
                        </button>
                      ) : null}
                      {alerta.status !== "CLOSED" ? (
                        <button
                          type="button"
                          onClick={() => void actualizarEstadoAlerta(alerta.id, "close")}
                          disabled={alertaActualizandoId === alerta.id}
                          className="cm-btn cm-btn-sm cm-btn-success"
                        >
                          {alertaActualizandoId === alerta.id ? "Guardando..." : "Cerrar"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => prepararEliminarAlerta(alerta.id)}
                        className="cm-btn cm-btn-sm cm-btn-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {alertasFiltradas.length === 0 ? <EmptyState colSpan={8} title="No hay alertas para mostrar" /> : null}
            </tbody>
          </DataTable>

        <Pagination
          page={paginaActual}
          totalPages={totalPaginas}
          visibleCount={alertasPaginadas.length}
          totalCount={alertasFiltradas.length}
          itemLabel="alertas"
          onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
          onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
        />
      </div>

      <ConfirmDialog
        open={Boolean(alertaPendienteEliminar)}
        eyebrow="Eliminar alerta"
        title="¿Quieres borrar esta alerta?"
        confirmLabel={alertaEliminandoId === alertaPendienteEliminar?.id ? "Borrando..." : "Confirmar borrado"}
        isBusy={Boolean(alertaEliminandoId)}
        onCancel={() => setAlertaPendienteEliminarId("")}
        onConfirm={() => {
          if (alertaPendienteEliminar) void confirmarEliminarAlerta(alertaPendienteEliminar.id);
        }}
      >
        <p>
          Se eliminará definitivamente la alerta
          {alertaPendienteEliminar?.title ? ` "${alertaPendienteEliminar.title}"` : ""}.
        </p>
        <p>Esta acción no se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  );
}
