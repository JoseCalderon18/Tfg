import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import type { LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { getIncidentMarkerColor } from "../utils/statusColors";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type RespuestaPaginada<T> = {
  count?: number;
  next?: string | null;
  results?: T[];
};

type UnidadApi = {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  is_active?: boolean;
  specialties?: string[];
  especialidades?: string[];
  operative_status?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
};

type TrackPointApi = {
  id?: string;
  user: string;
  lat?: number | string | null;
  lng?: number | string | null;
  recorded_at?: string | null;
};

type UnidadMapa = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  organizationName: string;
  active: boolean;
  operativeStatus: string;
  specialties: string[];
  position: LatLngTuple | null;
  lastSeen: string | null;
};

type IncidenteApi = {
  id: string;
  name: string;
  incident_type?: string | null;
  status?: string | null;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  owner_organization?: string | null;
  owner_organization_id?: string | null;
  created_at?: string | null;
};

type IncidenteMapa = {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  address: string;
  ownerOrganization: string;
  position: LatLngTuple | null;
  createdAt: string | null;
};

type AlertaApi = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  location?: unknown;
  created_by?: string | null;
  created_at?: string | null;
};

type AlertaMapa = {
  id: string;
  incidentId: string;
  type: string;
  severity: number;
  status: string;
  title: string;
  description: string;
  createdBy: string;
  position: LatLngTuple | null;
  createdAt: string | null;
};

type RecomendacionUnidad = {
  incident: IncidenteMapa;
  unit: UnidadMapa;
  distanceKm: number;
};

const DEFAULT_CENTER: LatLngTuple = [40.4168, -3.7038];
const MAX_RECOMMENDATIONS_PER_INCIDENT = 5;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extraerCoordenadas(location: unknown): LatLngTuple | null {
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lon = toNumber(location[0]);
    const lat = toNumber(location[1]);
    return lat !== null && lon !== null ? [lat, lon] : null;
  }

  if (typeof location === "object") {
    const obj = location as {
      coordinates?: unknown;
      x?: unknown;
      y?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      lat?: unknown;
      lng?: unknown;
    };

    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lon = toNumber(obj.coordinates[0]);
      const lat = toNumber(obj.coordinates[1]);
      return lat !== null && lon !== null ? [lat, lon] : null;
    }

    const lat = toNumber(obj.latitude ?? obj.lat ?? obj.y);
    const lon = toNumber(obj.longitude ?? obj.lng ?? obj.x);
    return lat !== null && lon !== null ? [lat, lon] : null;
  }

  if (typeof location === "string") {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lon = toNumber(match[1]);
      const lat = toNumber(match[3]);
      return lat !== null && lon !== null ? [lat, lon] : null;
    }
  }

  return null;
}

function normalizarArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as RespuestaPaginada<T>).results)) {
    return (payload as RespuestaPaginada<T>).results ?? [];
  }
  return [];
}

async function fetchJson(path: string) {
  const response = await apiFetch(path);
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

async function fetchJsonOrNull(path: string) {
  try {
    return await fetchJson(path);
  } catch {
    return null;
  }
}

function normalizarIncidentes(payload: unknown): IncidenteMapa[] {
  return normalizarArray<IncidenteApi>(payload)
    .filter((incident) => typeof incident.id === "string" && typeof incident.name === "string")
    .map((incident) => ({
      id: incident.id,
      name: incident.name,
      type: incident.incident_type || "OTHER",
      status: incident.status || "OPEN",
      description: incident.description || "",
      address: incident.location_address || "",
      ownerOrganization: incident.owner_organization || "",
      position: extraerCoordenadas(incident.location),
      createdAt: incident.created_at || null,
    }));
}

function normalizarAlertas(payload: unknown): AlertaMapa[] {
  return normalizarArray<AlertaApi>(payload)
    .filter((alert) => typeof alert.id === "string")
    .map((alert) => ({
      id: alert.id,
      incidentId: alert.incident || "",
      type: alert.alert_type || "OTHER",
      severity: typeof alert.severity === "number" ? alert.severity : 5,
      status: alert.status || "OPEN",
      title: alert.title || "Alerta sin titulo",
      description: alert.description || "",
      createdBy: alert.created_by || "",
      position: extraerCoordenadas(alert.location),
      createdAt: alert.created_at || null,
    }));
}

function normalizarUnidades(unitsPayload: unknown, trackingPayload: unknown): UnidadMapa[] {
  const latestPositions = new Map<string, { position: LatLngTuple; recordedAt: string | null }>();

  normalizarArray<TrackPointApi>(trackingPayload).forEach((point) => {
    const lat = toNumber(point.lat);
    const lng = toNumber(point.lng);
    if (typeof point.user === "string" && lat !== null && lng !== null) {
      latestPositions.set(point.user, { position: [lat, lng], recordedAt: point.recorded_at || null });
    }
  });

  return normalizarArray<UnidadApi>(unitsPayload)
    .filter((unit) => unit.role === "OPERATIVE" || unit.role === "SUPERVISOR")
    .map((unit) => {
      const profileLat = toNumber(unit.location_lat);
      const profileLng = toNumber(unit.location_lng);
      const latest = latestPositions.get(unit.id);
      const displayName =
        `${unit.first_name ?? ""} ${unit.last_name ?? ""}`.trim() || unit.username || unit.email || "Unidad sin nombre";

      return {
        id: unit.id,
        username: unit.username,
        email: unit.email || "",
        displayName,
        role: unit.role || "OPERATIVE",
        organizationName: unit.organization_name || "Sin organizacion",
        active: Boolean(unit.is_active),
        operativeStatus: unit.operative_status || "SIN_ESTADO",
        specialties: Array.isArray(unit.specialties) ? unit.specialties : unit.especialidades || [],
        position: latest?.position ?? (profileLat !== null && profileLng !== null ? [profileLat, profileLng] : null),
        lastSeen: latest?.recordedAt ?? null,
      };
    });
}

function distanciaKm(origen: LatLngTuple, destino: LatLngTuple) {
  const radioTierraKm = 6371;
  const lat1 = (origen[0] * Math.PI) / 180;
  const lat2 = (destino[0] * Math.PI) / 180;
  const deltaLat = ((destino[0] - origen[0]) * Math.PI) / 180;
  const deltaLng = ((destino[1] - origen[1]) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return radioTierraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value: number) {
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
}

function obtenerEtiquetaRol(role: string) {
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "OPERATIVE") return "Operativo";
  return "Sin rol";
}

function obtenerEtiquetaEstado(status: string) {
  if (status === "OPEN") return "Abierto";
  if (status === "TRIAGE") return "Evaluacion";
  if (status === "CLOSED") return "Cerrado";
  return "Sin estado";
}

function obtenerEtiquetaTipo(tipo: string) {
  if (tipo === "SEARCH") return "Busqueda";
  if (tipo === "MEDICAL") return "Medica";
  if (tipo === "WILDFIRE") return "Incendio";
  if (tipo === "RESCUE") return "Rescate";
  if (tipo === "NATURAL_DISASTER") return "Desastre";
  return "Otro";
}

function obtenerEtiquetaTipoAlerta(tipo: string) {
  if (tipo === "SOS") return "SOS";
  if (tipo === "MAN_DOWN") return "Operativo caido";
  if (tipo === "GEOFENCE") return "Fuera de zona";
  if (tipo === "INJURY") return "Operativo herido";
  if (tipo === "MEDICAL") return "Emergencia medica";
  if (tipo === "WEATHER") return "Clima peligroso";
  if (tipo === "MOVEMENT") return "Inmovilidad";
  if (tipo === "BATERY") return "Bateria baja";
  return "Otra alerta";
}

function obtenerEtiquetaEstadoAlerta(status: string) {
  if (status === "OPEN") return "Abierta";
  if (status === "ACK") return "Reconocida";
  if (status === "CLOSED") return "Cerrada";
  return "Sin estado";
}

function obtenerColorAlerta(alert: AlertaMapa) {
  if (alert.status === "CLOSED") return "#94a3b8";
  if (alert.severity <= 2 || alert.type === "SOS") return "#dc2626";
  if (alert.severity === 3) return "#f97316";
  return "#eab308";
}

function crearIconoUnidad(role: string, recommended: boolean) {
  const background = recommended ? "#22c55e" : role === "SUPERVISOR" ? "#2563eb" : "#f97316";
  return L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:${background};color:white;font-weight:800;border:2px solid white;box-shadow:0 8px 18px rgba(15,23,42,.35);font-size:12px;">${role === "SUPERVISOR" ? "S" : "U"}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitMap({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 13 });
  }, [map, positions]);

  return null;
}

export default function OpenMapPage() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidenteMapa[]>([]);
  const [unidades, setUnidades] = useState<UnidadMapa[]>([]);
  const [alertas, setAlertas] = useState<AlertaMapa[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [incidentSearch, setIncidentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendationsVisible, setRecommendationsVisible] = useState(false);
  const [assigningKey, setAssigningKey] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [incidentsPayload, panelUnitsPayload, publicUnitsPayload, trackingPayload, alertsPayload] = await Promise.all([
          fetchJsonOrNull("/incidents/"),
          fetchJsonOrNull("/auth/panel/users/"),
          fetchJsonOrNull("/users/"),
          fetchJsonOrNull("/tracking/last/"),
          fetchJsonOrNull("/alerts/"),
        ]);

        if (cancelled) return;

        if (!incidentsPayload) {
          setError("No se pudieron cargar los incidentes.");
        }

        if (!panelUnitsPayload && !publicUnitsPayload) {
          setError("No se pudieron cargar las unidades.");
        }

        const incidentesNormalizados = normalizarIncidentes(incidentsPayload);
        setIncidentes(incidentesNormalizados);
        setUnidades(normalizarUnidades(panelUnitsPayload ?? publicUnitsPayload, trackingPayload));
        setAlertas(normalizarAlertas(alertsPayload));
        setSelectedIncidentId(incidentesNormalizados.find((incident) => incident.status !== "CLOSED")?.id ?? "");
      } catch {
        if (!cancelled) setError("No se pudieron cargar incidentes, unidades o ultimas posiciones.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const incidentesConUbicacion = useMemo(
    () => incidentes.filter((incident) => incident.position),
    [incidentes]
  );

  const unidadesConUbicacion = useMemo(
    () => unidades.filter((unit) => unit.position),
    [unidades]
  );

  const alertasConUbicacion = useMemo(
    () => alertas.filter((alert) => alert.position),
    [alertas]
  );

  const incidentesSeleccionados = useMemo(
    () => incidentes.filter((incident) => incident.id === selectedIncidentId),
    [incidentes, selectedIncidentId]
  );

  const incidentesFiltrados = useMemo(() => {
    const query = incidentSearch.trim().toLowerCase();
    if (!query) return incidentes;
    return incidentes.filter((incident) => incident.name.toLowerCase().includes(query));
  }, [incidentes, incidentSearch]);

  const recomendaciones = useMemo(() => {
    if (!recommendationsVisible) return [];

    return incidentesSeleccionados.flatMap((incident) => {
      if (!incident.position) return [];

      return unidades
        .filter((unit) => unit.position && unit.active && unit.operativeStatus !== "DESCONECTADA")
        .map((unit) => ({
          incident,
          unit,
          distanceKm: distanciaKm(incident.position as LatLngTuple, unit.position as LatLngTuple),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, MAX_RECOMMENDATIONS_PER_INCIDENT);
    });
  }, [incidentesSeleccionados, recommendationsVisible, unidades]);

  const recommendedUnitIds = useMemo(
    () => new Set(recomendaciones.map((recommendation) => recommendation.unit.id)),
    [recomendaciones]
  );

  const mapPositions = useMemo(() => {
    const positions: LatLngTuple[] = [];
    incidentesConUbicacion.forEach((incident) => {
      if (incident.position) positions.push(incident.position);
    });
    unidadesConUbicacion.forEach((unit) => {
      if (unit.position) positions.push(unit.position);
    });
    alertasConUbicacion.forEach((alert) => {
      if (alert.position) positions.push(alert.position);
    });
    return positions;
  }, [alertasConUbicacion, incidentesConUbicacion, unidadesConUbicacion]);

  const resumen = useMemo(() => {
    const disponibles = unidades.filter((unit) => unit.active && unit.position).length;
    const sinUbicacion = unidades.filter((unit) => !unit.position).length;
    const abiertos = incidentes.filter((incident) => incident.status === "OPEN" || incident.status === "TRIAGE").length;
    const alertasActivas = alertas.filter((alert) => alert.status !== "CLOSED").length;
    return { disponibles, sinUbicacion, abiertos, alertasActivas };
  }, [alertas, incidentes, unidades]);

  function selectIncident(incidentId: string) {
    setRecommendationsVisible(false);
    setAssignmentMessage("");
    setSelectedIncidentId(incidentId);
  }

  async function asignarUnidad(recommendation: RecomendacionUnidad) {
    const key = `${recommendation.incident.id}-${recommendation.unit.id}`;
    setAssigningKey(key);
    setAssignmentMessage("");

    try {
      const response = await apiFetch(`/incidents/${recommendation.incident.id}/assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: recommendation.unit.id, role: recommendation.unit.role }),
      });

      if (!response.ok) {
        setAssignmentMessage("No se pudo asignar la unidad. Puede que ya este asignada al incidente.");
        return;
      }

      setAssignmentMessage(`${recommendation.unit.displayName} asignada a ${recommendation.incident.name}.`);
    } catch {
      setAssignmentMessage("No se pudo asignar la unidad por un error de red.");
    } finally {
      setAssigningKey("");
    }
  }

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <div className="cm-loading-inline">
          <span className="cm-spinner" />
          <p>Cargando mapa operativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold lg:text-3xl">Mapa de unidades</h1>
            <p className="mt-1 max-w-3xl text-sm text-[color:var(--cm-text-muted)]">
              Supervisa las unidades con ubicacion registrada y recomienda los equipos mas cercanos al incidente seleccionado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate("/viewunidades")} className="cm-btn cm-btn-secondary">
              Ver unidades
            </button>
            <button
              type="button"
              onClick={() => {
                setRecommendationsVisible(true);
                setAssignmentMessage("");
              }}
              disabled={!incidentesSeleccionados.some((incident) => incident.position)}
              className="cm-btn cm-btn-success"
            >
              Recomendar unidades cercanas
            </button>
          </div>
        </div>

        {error ? <div className="cm-error-banner mt-4">{error}</div> : null}
        {assignmentMessage ? <div className="cm-success-banner mt-4">{assignmentMessage}</div> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="cm-metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Unidades ubicadas</p>
            <p className="mt-2 text-2xl font-bold">{unidadesConUbicacion.length}</p>
          </div>
          <div className="cm-metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Disponibles</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{resumen.disponibles}</p>
          </div>
          <div className="cm-metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Incidentes activos</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{resumen.abiertos}</p>
          </div>
          <div className="cm-metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Alertas activas</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">{resumen.alertasActivas}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
          <section className="overflow-hidden rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]">
            <div className="relative h-[70vh] min-h-[520px]">
              {mapPositions.length === 0 ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-[color:var(--cm-surface)] text-center">
                  <div>
                    <p className="font-semibold">No hay ubicaciones para pintar.</p>
                    <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">Actualiza la ubicacion de una unidad o crea incidentes con coordenadas.</p>
                  </div>
                </div>
              ) : null}

              <MapContainer
                center={mapPositions[0] ?? DEFAULT_CENTER}
                zoom={mapPositions.length ? 8 : 6}
                scrollWheelZoom
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapPositions.length > 0 ? <FitMap positions={mapPositions} /> : null}

                {incidentesConUbicacion.map((incident) => (
                  <CircleMarker
                    key={incident.id}
                    center={incident.position as LatLngTuple}
                    radius={selectedIncidentId === incident.id ? 11 : 8}
                    pathOptions={{
                      color: "#ffffff",
                      weight: selectedIncidentId === incident.id ? 3 : 2,
                      fillColor: getIncidentMarkerColor(incident.status),
                      fillOpacity: 0.9,
                    }}
                    eventHandlers={{ click: () => selectIncident(incident.id) }}
                  >
                    <Popup>
                      <div className="min-w-[210px] text-slate-800">
                        <p className="font-bold">{incident.name}</p>
                        <p className="text-sm">{obtenerEtiquetaTipo(incident.type)} - {obtenerEtiquetaEstado(incident.status)}</p>
                        <p className="mt-2 text-xs">{incident.address || "Sin direccion registrada"}</p>
                        <button
                          type="button"
                          onClick={() => navigate(`/editIncident/${incident.id}`)}
                          className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          Abrir incidente
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {alertasConUbicacion.map((alert) => (
                  <CircleMarker
                    key={alert.id}
                    center={alert.position as LatLngTuple}
                    radius={7}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 2,
                      fillColor: obtenerColorAlerta(alert),
                      fillOpacity: 0.88,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[220px] text-slate-800">
                        <p className="font-bold">{alert.title}</p>
                        <p className="text-sm">
                          {obtenerEtiquetaTipoAlerta(alert.type)} - {obtenerEtiquetaEstadoAlerta(alert.status)}
                        </p>
                        <p className="mt-1 text-xs">Severidad {alert.severity}</p>
                        {alert.description ? <p className="mt-2 text-xs">{alert.description}</p> : null}
                        <button
                          type="button"
                          onClick={() => navigate(`/editAlert/${alert.id}`)}
                          className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                        >
                          Abrir alerta
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {unidadesConUbicacion.map((unit) => (
                  <Marker
                    key={unit.id}
                    position={unit.position as LatLngTuple}
                    icon={crearIconoUnidad(unit.role, recommendedUnitIds.has(unit.id))}
                  >
                    <Popup>
                      <div className="min-w-[220px] text-slate-800">
                        <p className="font-bold">{unit.displayName}</p>
                        <p className="text-sm">{obtenerEtiquetaRol(unit.role)} - {unit.active ? "Activa" : "Inactiva"}</p>
                        <p className="text-xs">{unit.organizationName}</p>
                        <p className="mt-2 text-xs">
                          {unit.lastSeen ? `Ultima posicion: ${new Date(unit.lastSeen).toLocaleString()}` : "Ubicacion de perfil"}
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate(`/editunit/${unit.id}`)}
                          className="mt-3 w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
                        >
                          Abrir unidad
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {recomendaciones.map((recommendation) =>
                  recommendation.incident.position && recommendation.unit.position ? (
                    <Polyline
                      key={`${recommendation.incident.id}-${recommendation.unit.id}`}
                      positions={[recommendation.incident.position, recommendation.unit.position]}
                      pathOptions={{ color: "#22c55e", weight: 2, opacity: 0.6, dashArray: "6 8" }}
                    />
                  ) : null
                )}
              </MapContainer>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="cm-card cm-card-pad">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="mt-1 text-lg font-bold">Incidentes</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncidentId("");
                    setRecommendationsVisible(false);
                  }}
                  className="cm-btn cm-btn-sm cm-btn-secondary"
                >
                  Limpiar
                </button>
              </div>

              <div className="mt-4">
                <input
                  type="search"
                  value={incidentSearch}
                  onChange={(event) => setIncidentSearch(event.target.value)}
                  placeholder="Filtrar por nombre de incidente"
                  className="cm-input text-sm"
                />
              </div>

              <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {incidentes.length === 0 ? (
                  <p className="rounded-lg bg-[color:var(--cm-surface-2)] p-3 text-sm text-[color:var(--cm-text-muted)]">No hay incidentes cargados.</p>
                ) : incidentesFiltrados.length === 0 ? (
                  <p className="rounded-lg bg-[color:var(--cm-surface-2)] p-3 text-sm text-[color:var(--cm-text-muted)]">No hay incidentes con ese nombre.</p>
                ) : (
                  incidentesFiltrados.map((incident) => {
                    const selected = selectedIncidentId === incident.id;
                    return (
                      <label
                        key={incident.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                          selected
                            ? "border-[color:var(--cm-success)] bg-emerald-500/10"
                            : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="openmap-selected-incident"
                          checked={selected}
                          onChange={() => selectIncident(incident.id)}
                          className="mt-1 h-4 w-4 rounded border-[color:var(--cm-border)]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{incident.name}</span>
                          <span className="mt-1 block text-xs text-[color:var(--cm-text-muted)]">
                            {obtenerEtiquetaTipo(incident.type)} - {obtenerEtiquetaEstado(incident.status)}
                          </span>
                          {!incident.position ? (
                            <span className="mt-1 block text-xs text-amber-200">Sin coordenadas</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>

            <section className="cm-card cm-card-pad">
              <h2 className="mt-1 text-lg font-bold">Unidades mas cercanas</h2>

              <div className="mt-4 space-y-3">
                {!recommendationsVisible ? (
                  <p className="rounded-lg bg-[color:var(--cm-surface-2)] p-3 text-sm text-[color:var(--cm-text-muted)]">
                    Selecciona un incidente y pulsa recomendar para calcular las unidades cercanas.
                  </p>
                ) : recomendaciones.length === 0 ? (
                  <p className="rounded-lg bg-[color:var(--cm-surface-2)] p-3 text-sm text-[color:var(--cm-text-muted)]">
                    No hay unidades disponibles con ubicacion para el incidente seleccionado.
                  </p>
                ) : (
                  recomendaciones.map((recommendation) => {
                    const key = `${recommendation.incident.id}-${recommendation.unit.id}`;
                    return (
                      <article key={key} className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{recommendation.unit.displayName}</p>
                            <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                              {obtenerEtiquetaRol(recommendation.unit.role)} - {recommendation.unit.organizationName}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30">
                            {formatDistance(recommendation.distanceKm)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[color:var(--cm-text-muted)]">
                          Incidente: <span className="text-[color:var(--cm-text)]">{recommendation.incident.name}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => void asignarUnidad(recommendation)}
                          disabled={assigningKey === key}
                          className="cm-btn cm-btn-sm cm-btn-success mt-3 w-full"
                        >
                          {assigningKey === key ? "Asignando..." : "Asignar a incidente"}
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="cm-card cm-card-pad">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Leyenda</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--cm-text-muted)]">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-success)]" /> Incidente abierto</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-warning)]" /> Evaluacion</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-info)]" /> Supervisor</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-alert)]" /> Operativo</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-danger)]" /> Alerta critica</span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
