import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type IncidentApiRow = {
  id: string;
  name: string;
  incident_type: string;
  status: string;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  created_by?: string | null;
  owner_organization?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
};

type IncidentRow = IncidentApiRow & {
  parsedLocation: LatLngTuple | null;
};

type AlertaApiRow = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AlertaFila = {
  id: string;
  idIncidente: string | null;
  tipo: string;
  severidad: number;
  estado: string;
  titulo: string;
  descripcion: string | null;
  creadaPor: string | null;
  creadaEn: string | null;
  actualizadaEn: string | null;
};

function parsePointLocation(location: unknown): LatLngTuple | null {
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lon = Number(location[0]);
    const lat = Number(location[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
  }

  if (typeof location === "object") {
    const obj = location as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lon = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }

    if (obj.x !== undefined && obj.y !== undefined) {
      const lon = Number(obj.x);
      const lat = Number(obj.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  if (typeof location === "string") {
    // Handles formats like "SRID=4326;POINT (-3.70 40.41)" or "POINT(-3.70 40.41)"
    const match = location.match(
      /POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i
    );

    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        pedestrian?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        country?: string;
      };
    };

    const address = data.address;
    if (!address) return data.display_name ?? null;

    const streetName = address.road || address.pedestrian || "";
    const houseNumber = address.house_number || "";
    const city =
      address.city || address.town || address.village || address.municipality || "";
    const country = address.country || "";

    const street = [streetName, houseNumber].filter(Boolean).join(" ").trim();
    const parts = [street, city, country].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : data.display_name ?? null;
  } catch {
    return null;
  }
}

function normalizeIncidents(raw: unknown): IncidentRow[] {
  const source = Array.isArray(raw)
    ? raw
    : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as Partial<IncidentApiRow>)
    .filter((row) => typeof row?.id === "string" && typeof row?.name === "string")
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      incident_type: typeof row.incident_type === "string" ? row.incident_type : "OTHER",
      status: typeof row.status === "string" ? row.status : "OPEN",
      description: row.description ?? null,
      location: row.location ?? null,
      parsedLocation: parsePointLocation(row.location),
      location_address: row.location_address ?? null,
      created_by: row.created_by ?? null,
      owner_organization: row.owner_organization ?? null,
      started_at: row.started_at ?? null,
      ended_at: row.ended_at ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      is_active: Boolean(row.is_active ?? row.status === "OPEN"),
    }));
}

function normalizarAlertas(crudo: unknown): AlertaFila[] {
  const origen = Array.isArray(crudo)
    ? crudo
    : (crudo as { results?: unknown[] } | null)?.results ?? [];

  return origen
    .map((item) => item as Partial<AlertaApiRow>)
    .filter((alerta) => typeof alerta?.id === "string")
    .map((alerta) => ({
      id: alerta.id as string,
      idIncidente: typeof alerta.incident === "string" ? alerta.incident : null,
      tipo: typeof alerta.alert_type === "string" ? alerta.alert_type : "OTHER",
      severidad:
        typeof alerta.severity === "number" && !Number.isNaN(alerta.severity) ? alerta.severity : 3,
      estado: typeof alerta.status === "string" ? alerta.status : "OPEN",
      titulo: typeof alerta.title === "string" && alerta.title.trim() ? alerta.title : "Alerta sin titulo",
      descripcion: typeof alerta.description === "string" ? alerta.description : null,
      creadaPor: typeof alerta.created_by === "string" ? alerta.created_by : null,
      creadaEn: typeof alerta.created_at === "string" ? alerta.created_at : null,
      actualizadaEn: typeof alerta.updated_at === "string" ? alerta.updated_at : null,
    }));
}

function agruparAlertasPorIncidente(alertas: AlertaFila[]) {
  return alertas.reduce<Record<string, AlertaFila[]>>((acumulado, alerta) => {
    if (!alerta.idIncidente) return acumulado;

    if (!acumulado[alerta.idIncidente]) {
      acumulado[alerta.idIncidente] = [];
    }

    acumulado[alerta.idIncidente].push(alerta);
    return acumulado;
  }, {});
}

function obtenerEtiquetaTipoAlerta(tipo: string) {
  switch (tipo) {
    case "SOS":
      return "SOS";
    case "MAN_DOWN":
      return "Operativo caido";
    case "LOST":
      return "Operativo desorientado";
    case "GEOFENCE":
      return "Fuera de zona";
    case "ANOMALY":
      return "Anomalia";
    default:
      return "Otra";
  }
}

function obtenerEtiquetaEstadoAlerta(estado: string) {
  switch (estado) {
    case "OPEN":
      return "Abierta";
    case "ACK":
      return "Reconocida";
    case "CLOSED":
      return "Cerrada";
    default:
      return "Sin estado";
  }
}

function obtenerClasesEstadoAlerta(estado: string) {
  switch (estado) {
    case "OPEN":
      return "bg-red-500/15 text-red-200 ring-red-500/30";
    case "ACK":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "CLOSED":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-200 ring-slate-500/30";
  }
}

function obtenerTextoSeveridadAlerta(severidad: number) {
  if (severidad <= 1) return "Critica";
  if (severidad === 2) return "Muy alta";
  if (severidad === 3) return "Alta";
  if (severidad === 4) return "Media";
  return "Informativa";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
}

function IncidentMiniMap({ incident }: { incident: IncidentRow }) {
  if (!incident.parsedLocation) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-slate-800 bg-slate-950/50 text-sm text-slate-400">
        Este incidente no tiene coordenadas en el campo location.
      </div>
    );
  }

  return (
    <div className="h-56 overflow-hidden rounded-xl ring-1 ring-slate-800">
      <MapContainer
        center={incident.parsedLocation}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={incident.parsedLocation}
          radius={8}
          pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.8 }}
        >
          <Popup>{incident.name}</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const INCIDENTES_POR_PAGINA = 10;

  const [resolvedLocation, setResolvedLocation] = useState<string>("");
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [soloIncidentesAbiertos, setSoloIncidentesAbiertos] = useState(false);
  const [incidentesEvaluacion, setIncidentesEvaluacion] = useState(false);
  const [alertasPorIncidente, setAlertasPorIncidente] = useState<Record<string, AlertaFila[]>>({});
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [errorAlertas, setErrorAlertas] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [deletingIncidentId, setDeletingIncidentId] = useState<string>("");
  const [pendingDeleteIncidentId, setPendingDeleteIncidentId] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as MeResponse;
      if (!meData.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      const incidentsRes = await apiFetch("/incidents/");
      if (!incidentsRes.ok) {
        setError("No se pudo cargar la lista de incidentes.");
        setLoading(false);
        return;
      }

      const data = (await incidentsRes.json()) as unknown;
      const list = normalizeIncidents(data);
      setIncidents(list);
      setSelectedIncidentId(list[0]?.id ?? "");

      const respuestaAlertas = await apiFetch("/alerts/");
      if (!respuestaAlertas.ok) {
        setErrorAlertas("No se pudieron cargar las alertas relacionadas.");
        setCargandoAlertas(false);
        setLoading(false);
        return;
      }

      const datosAlertas = (await respuestaAlertas.json()) as unknown;
      const alertasNormalizadas = normalizarAlertas(datosAlertas);
      setAlertasPorIncidente(agruparAlertasPorIncidente(alertasNormalizadas));
      setErrorAlertas("");
      setCargandoAlertas(false);
      setLoading(false);
    })();
  }, [navigate]);

  const filteredIncidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((incident) => {
      const coincideBusqueda =
        !q ||
        `${incident.name} ${incident.incident_type} ${incident.status} ${incident.location_address ?? ""}`
          .toLowerCase()
          .includes(q);

      const coincideAbiertos = !soloIncidentesAbiertos || incident.status === "OPEN";
      const coincideEvaluacion = !incidentesEvaluacion || incident.status === "TRIAGE";

      return coincideBusqueda && coincideAbiertos && coincideEvaluacion;
    });
  }, [query, incidents, soloIncidentesAbiertos, incidentesEvaluacion]);

  const resumenKpis = useMemo(() => {
    const incidentesAbiertos = incidents.filter((incident) => incident.status === "OPEN").length;
    const incidentesEnEvaluacion = incidents.filter((incident) => incident.status === "TRIAGE").length;
    const incidentesCerrados = incidents.filter((incident) => incident.status === "CLOSED").length;

    return { incidentesAbiertos, incidentesEnEvaluacion, incidentesCerrados };
  }, [incidents]);

  const totalPaginas = Math.max(1, Math.ceil(filteredIncidents.length / INCIDENTES_POR_PAGINA));

  const incidentesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * INCIDENTES_POR_PAGINA;
    const fin = inicio + INCIDENTES_POR_PAGINA;
    return filteredIncidents.slice(inicio, fin);
  }, [filteredIncidents, paginaActual, INCIDENTES_POR_PAGINA]);

  const selectedIncident =
    filteredIncidents.find((incident) => incident.id === selectedIncidentId) ??
    filteredIncidents[0] ??
    null;
  const alertasDelIncidenteSeleccionado = selectedIncident
    ? alertasPorIncidente[selectedIncident.id] ?? []
    : [];

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  useEffect(() => {
    let cancelled = false;

    async function loadResolvedLocation() {
      if (!selectedIncident?.parsedLocation) {
        setResolvedLocation("");
        setResolvingLocation(false);
        return;
      }

      const [lat, lon] = selectedIncident.parsedLocation;

      setResolvingLocation(true);
      setResolvedLocation("");

      const result = await reverseGeocode(lat, lon);

      if (!cancelled) {
        setResolvedLocation(result || "");
        setResolvingLocation(false);
      }
    }

    loadResolvedLocation();

    return () => {
      cancelled = true;
    };
  }, [selectedIncident]);

  useEffect(() => {
    if (!pendingDeleteIncidentId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !deletingIncidentId) {
        setPendingDeleteIncidentId("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [pendingDeleteIncidentId, deletingIncidentId]);

  const pendingDeleteIncident =
    incidents.find((incident) => incident.id === pendingDeleteIncidentId) ?? null;

  async function handleDeleteIncident(incidentId: string) {
    setPendingDeleteIncidentId(incidentId);
    return;

  }

  async function confirmDeleteIncident(incidentId: string) {
    if (deletingIncidentId) return;

    setError("");
    setDeletingIncidentId(incidentId);
    try {
      const res = await apiFetch(`/incidents/${incidentId}/`, { method: "DELETE" });
      if (!res.ok) {
        let detail: string = "No se pudo borrar el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          const detailMessage = data["detail"];
          if (typeof detailMessage === "string") detail = detailMessage;
        } catch {
          // keep fallback
        }
        setError(detail);
        return;
      }

      setIncidents((prev) => {
        const next = prev.filter((incident) => incident.id !== incidentId);
        setSelectedIncidentId((currentSelectedId) => {
          if (currentSelectedId !== incidentId) return currentSelectedId;
          return next[0]?.id ?? "";
        });
        return next;
      });
      setPendingDeleteIncidentId("");
    } finally {
      setDeletingIncidentId("");
    }
  }

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando incidentes...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold">Incidentes</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/createincident")}
            className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Nuevo incidente
          </button>
        </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              Incidentes abiertos
            </p>
            <p className="mt-3 text-3xl font-bold text-[color:var(--cm-danger)]">
              {resumenKpis.incidentesAbiertos}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Operativos activos ahora mismo.
            </p>
          </article>

          <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              En evaluacion
            </p>
            <p className="mt-3 text-3xl font-bold text-[color:var(--cm-warning)]">
              {resumenKpis.incidentesEnEvaluacion}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Incidentes pendientes de clasificacion.
            </p>
          </article>

          <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              Cerrados
            </p>
            <p className="mt-3 text-3xl font-bold text-[color:var(--cm-success)]">
              {resumenKpis.incidentesCerrados}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Incidentes finalizados y archivados.
            </p>
          </article>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-3.5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por nombre, tipo, estado o ubicacion..."
                className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)]">
                <input
                  type="checkbox"
                  checked={soloIncidentesAbiertos}
                  onChange={(e) => {
                    setSoloIncidentesAbiertos(e.target.checked);
                    setPaginaActual(1);
                  }}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]"
                />
                Solo abiertos
              </label>

              <label className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)]">
                <input
                  type="checkbox"
                  checked={incidentesEvaluacion}
                  onChange={(e) => {
                    setIncidentesEvaluacion(e.target.checked);
                    setPaginaActual(1);
                  }}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]"
                />
                Solo en evaluacion
              </label>
            </div>
          </div>
        </div>

        

        {error && (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
          <section className="overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <table className="min-w-[1120px] w-full text-sm">
              <thead className="bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Organizacion</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Inicio</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                      No hay incidentes para mostrar.
                    </td>
                  </tr>
                ) : (
                  incidentesPaginados.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      className={`cursor-pointer border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60 ${
                        selectedIncident?.id === incident.id ? "bg-[color:var(--cm-surface-2)]/70" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-medium">{incident.name}</td>
                      <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                        {incident.incident_type === "SEARCH" ? "Búsqueda de personas"
                          : incident.incident_type === "MEDICAL" ? "Emergencia médica"
                          : incident.incident_type === "WILDFIRE" ? "Incendio forestal"
                          : incident.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                          : incident.incident_type === "NATURAL_DISASTER" ? "Desastre natural"
                          : "Otro"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                            incident.status === "CLOSED"
                              ? "cm-badge-success"
                              : incident.status === "TRIAGE"
                              ? "cm-badge-warning"
                              : "cm-badge-danger"
                          }`}
                        >
                          {incident.status === "OPEN"
                        ? "Abierto"
                        : incident.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluacion"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                        {incident.owner_organization || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                        {formatDate(incident.started_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/editIncident/${incident.id}`);
                            }}
                            className="rounded-xl bg-[color:var(--cm-info)] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteIncident(incident.id);
                            }}
                            disabled={Boolean(deletingIncidentId)}
                            className="rounded-xl bg-[color:var(--cm-danger)] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                          >
                            {deletingIncidentId === incident.id ? "Borrando..." : "Borrar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredIncidents.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-[color:var(--cm-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--cm-text-muted)]">
                  Pagina {paginaActual} de {totalPaginas} · Mostrando {incidentesPaginados.length} de {filteredIncidents.length} incidentes
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                    disabled={paginaActual === 1}
                    className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-info)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-info)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        {selectedIncident ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">{selectedIncident.name}</h2>
            </div>

            {!pendingDeleteIncidentId && (
              <IncidentMiniMap incident={selectedIncident} />
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    <p className="text-slate-100">
                      {selectedIncident.incident_type === "SEARCH"
                        ? "Búsqueda de personas"
                        : selectedIncident.incident_type === "MEDICAL"
                        ? "Emergencia médica"
                        : selectedIncident.incident_type === "WILDFIRE"
                        ? "Incendio forestal"
                        : selectedIncident.incident_type === "RESCUE"
                        ? "Rescate de persona desaparecida"
                        : selectedIncident.incident_type === "NATURAL_DISASTER"
                        ? "Desastre natural"
                        : "Otro"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Estado</p>
                    <p className="text-slate-100">
                      {selectedIncident.status === "OPEN"
                        ? "Abierto"
                        : selectedIncident.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluacion"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Activo</p>
                    <p className="text-slate-100">
                      {selectedIncident.is_active ? "Si" : "No"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Organizacion</p>
                    <p className="text-slate-100">
                      {selectedIncident.owner_organization || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-400">Descripcion</p>
                    <p className="text-slate-100">{selectedIncident.description || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Direccion</p>
                    <p className="text-slate-100">{selectedIncident.location_address || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Ubicacion legible</p>
                    <p className="text-slate-100">
                      {resolvingLocation
                        ? "Buscando direccion..."
                        : resolvedLocation || selectedIncident.location_address || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Coordenadas</p>
                    <p className="text-slate-100">
                      {selectedIncident.parsedLocation
                        ? `${selectedIncident.parsedLocation[0]}, ${selectedIncident.parsedLocation[1]}`
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Creado por</p>
                    <p className="text-slate-100">{selectedIncident.created_by || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Inicio</p>
                    <p className="text-slate-100">{formatDate(selectedIncident.started_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Fin</p>
                    <p className="text-slate-100">{formatDate(selectedIncident.ended_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Creado</p>
                    <p className="text-slate-100">{formatDate(selectedIncident.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Actualizado</p>
                    <p className="text-slate-100">{formatDate(selectedIncident.updated_at)}</p>
                  </div>
                </div>
              </div>

              <section className="rounded-2xl bg-slate-950/45 p-4 ring-1 ring-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Seguimiento operativo</p>
                    <h3 className="text-lg font-bold text-slate-100">Alertas relacionadas</h3>
                  </div>
                  <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
                    {alertasDelIncidenteSeleccionado.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {cargandoAlertas ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                      Cargando alertas del incidente...
                    </div>
                  ) : errorAlertas ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                      {errorAlertas}
                    </div>
                  ) : alertasDelIncidenteSeleccionado.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                      Este incidente no tiene alertas asociadas.
                    </div>
                  ) : (
                    alertasDelIncidenteSeleccionado.map((alerta) => (
                      <article
                        key={alerta.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {obtenerEtiquetaTipoAlerta(alerta.tipo)}
                            </p>
                            <h4 className="mt-1 text-sm font-semibold text-slate-100">
                              {alerta.titulo}
                            </h4>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${obtenerClasesEstadoAlerta(alerta.estado)}`}
                          >
                            {obtenerEtiquetaEstadoAlerta(alerta.estado)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-200 ring-1 ring-slate-700">
                            Severidad {alerta.severidad}: {obtenerTextoSeveridadAlerta(alerta.severidad)}
                          </span>
                          <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-300 ring-1 ring-slate-700">
                            {alerta.creadaPor || "Sin autor"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {alerta.descripcion || "Sin descripcion adicional."}
                        </p>

                        <div className="mt-3 text-xs text-slate-500">
                          <p>Creada: {formatDate(alerta.creadaEn)}</p>
                          <p>Actualizada: {formatDate(alerta.actualizadaEn)}</p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No hay incidentes para mostrar.</p>
        )}
      </aside>
        </div>
      </div>

      {pendingDeleteIncident ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar confirmacion"
            onClick={() => {
              if (!deletingIncidentId) setPendingDeleteIncidentId("");
            }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-incident-title"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/50 ring-1 ring-white/5"
          >
            <div className="pointer-events-none absolute inset-0 opacity-80">
              <div className="absolute -top-10 left-10 h-32 w-32 rounded-full bg-red-500/20 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-orange-400/10 blur-3xl" />
            </div>

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
                  <span className="text-2xl font-bold text-red-200">!</span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/80">
                    Confirmacion de borrado
                  </p>
                  <h2 id="delete-incident-title" className="mt-2 text-2xl font-bold text-slate-50">
                    Eliminar incidente
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Vas a eliminar <span className="font-semibold text-white">{pendingDeleteIncident.name}</span>.
                    Esta accion es permanente y el incidente dejara de estar disponible en el panel.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800">
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    {pendingDeleteIncident.incident_type === "SEARCH" ? ("Búsqueda de personas")
                    : pendingDeleteIncident.incident_type === "MEDICAL" ? "Emergencia médica" 
                    : pendingDeleteIncident.incident_type === "WILDFIRE" ? "Incendio forestal"
                    : pendingDeleteIncident.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                    : pendingDeleteIncident.incident_type === "NATURAL_DISASTER" ? "Desastre natural" 
                    : pendingDeleteIncident.incident_type === "OTHER" ? "Otro"
                    : "Tipo de incidente no válido"}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-slate-400">Estado</p>
                    {pendingDeleteIncident.status === "OPEN"
                        ? "Abierto"
                        : pendingDeleteIncident.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluacion"}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingDeleteIncidentId("")}
                  disabled={Boolean(deletingIncidentId)}
                  className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteIncident(pendingDeleteIncident.id)}
                  disabled={Boolean(deletingIncidentId)}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingIncidentId === pendingDeleteIncident.id ? "Eliminando..." : "Si, eliminar incidente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
