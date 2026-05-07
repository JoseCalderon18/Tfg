import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";
import MapaMiniUnidad from "../components/MapaMiniUnidad";
import { getIncidentStatusBadge } from "../utils/statusColors";

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type IncidenteApiFila = {
  id: string;
  name: string;
  incident_type: string;
  status: string;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  created_by?: string | null;
  owner_organization?: string | null;
  owner_organization_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
};

type IncidenteFila = IncidenteApiFila & {
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

type UsuarioOperativo = {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  organization_id?: string;
  organization_name?: string;
}

type AsignacionUnidad = {
  id: string;
  incident: string;
  user?: string;
  user_id?: string;
  user_detail?: UsuarioOperativo;
  role?: string;
  role_in_incident?: string;
}

type RespuestaPaginada<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

function extraerCoordenadas(location: unknown): LatLngTuple | null {
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

async function geocodificarInverso(lat: number, lon: number): Promise<string | null> {
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

function normalizarIncidentes(raw: unknown): IncidenteFila[] {
  const source = Array.isArray(raw)
    ? raw
    : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as Partial<IncidenteApiFila>)
    .filter((row) => typeof row?.id === "string" && typeof row?.name === "string")
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      incident_type: typeof row.incident_type === "string" ? row.incident_type : "OTHER",
      status: typeof row.status === "string" ? row.status : "OPEN",
      description: row.description ?? null,
      location: row.location ?? null,
      parsedLocation: extraerCoordenadas(row.location),
      location_address: row.location_address ?? null,
      created_by: row.created_by ?? null,
      owner_organization: row.owner_organization ?? null,
      owner_organization_id: row.owner_organization_id ?? null,
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

function normalizarUsuarios(crudo: unknown): UsuarioOperativo[] {
  if (Array.isArray(crudo)) return crudo as UsuarioOperativo[];
  if (crudo && typeof crudo === "object" && Array.isArray((crudo as RespuestaPaginada<UsuarioOperativo>).results)) {
    return (crudo as RespuestaPaginada<UsuarioOperativo>).results ?? [];
  }
  return [];
}

function obtenerResultadosPaginadosUsuarios(crudo: unknown): UsuarioOperativo[] | null {
  if (crudo && typeof crudo === "object" && Array.isArray((crudo as RespuestaPaginada<UsuarioOperativo>).results)) {
    return (crudo as RespuestaPaginada<UsuarioOperativo>).results ?? [];
  }
  return null;
}

async function cargarTodasLasUnidadesOperativas(): Promise<UsuarioOperativo[]> {
  const unidadesAcumuladas: UsuarioOperativo[] = [];
  let urlSiguiente: string | null = "/users/";

  while (urlSiguiente) {
    const respuesta = urlSiguiente.startsWith("http")
      ? await fetch(urlSiguiente, {
          headers: { Accept: "application/json" },
          credentials: "include",
        })
      : await apiFetch(urlSiguiente);

    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar los usuarios.");
    }

    const datos = (await respuesta.json()) as unknown;
    const resultadosPaginados = obtenerResultadosPaginadosUsuarios(datos);

    if (resultadosPaginados) {
      unidadesAcumuladas.push(...resultadosPaginados);
      urlSiguiente = (datos as RespuestaPaginada<UsuarioOperativo>).next ?? null;
      continue;
    }

    return normalizarUsuarios(datos).filter(
      (usuario) => usuario.role === "OPERATIVE" || usuario.role === "SUPERVISOR"
    );
  }

  return unidadesAcumuladas.filter(
    (usuario) => usuario.role === "OPERATIVE" || usuario.role === "SUPERVISOR"
  );
}

function obtenerIdUsuarioAsignado(asignacion: AsignacionUnidad) {
  return asignacion.user_id ?? asignacion.user_detail?.id ?? "";
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
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30";
    case "ACK":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "CLOSED":
      return "bg-slate-400/15 text-slate-200 ring-slate-400/30";
    default:
      return "bg-slate-500/15 text-slate-200 ring-slate-500/30";
  }
}
function obtenerTextoSeveridadAlerta(severidad: number) {
  if (severidad <= 1) return "Crítica";
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

export function obtenerEtiquetaTipoIncidente(tipo: string) {
  switch (tipo) {
    case "SEARCH":
      return "Búsqueda de personas";
    case "MEDICAL":
      return "Emergencia médica";
    case "WILDFIRE":
      return "Incendio forestal";
    case "RESCUE":
      return "Rescate de persona desaparecida";
    case "NATURAL_DISASTER":
      return "Desastre natural";
    default:
      return "Otro";
  }
}
export function obtenerEtiquetaEstado(tipo: string){
  switch (tipo) {
    case "OPEN":
      return "Abierto";
    case "CLOSED":
      return "Cerrado";
    case "TRIAGE":
      return "Evaluación";
    default:
      return "Desconocido";
  }
}
export default function IncidentsPage() {
  const navegar = useNavigate();
  const INCIDENTES_POR_PAGINA = 10;
  const UNIDADES_POR_PAGINA_MODAL = 5;

  const [ubicacionResuelta, setUbicacionResuelta] = useState<string>("");
  const [resolviendoUbicacion, setResolviendoUbicacion] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [consulta, setConsulta] = useState("");
  const [incidentes, setIncidentes] = useState<IncidenteFila[]>([]);
  const [soloIncidentesAbiertos, setSoloIncidentesAbiertos] = useState(false);
  const [incidentesEvaluacion, setIncidentesEvaluacion] = useState(false);
  const [alertasPorIncidente, setAlertasPorIncidente] = useState<Record<string, AlertaFila[]>>({});
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [errorAlertas, setErrorAlertas] = useState("");
  const [incidenteSeleccionadoId, setIncidenteSeleccionadoId] = useState<string>("");
  const [incidenteEliminandoId, setIncidenteEliminandoId] = useState<string>("");
  const [incidenteActualizandoId, setIncidenteActualizandoId] = useState<string>("");
  const [incidentePendienteEliminarId, setIncidentePendienteEliminarId] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioOperativo[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionUnidad[]>([]);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);
  const [errorAsignaciones, setErrorAsignaciones] = useState("");
  const [paginaAsignadas, setPaginaAsignadas] = useState(1);
  const [paginaDisponibles, setPaginaDisponibles] = useState(1);

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navegar("/login", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as RespuestaUsuario;
      if (!meData.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      const incidentesRes = await apiFetch("/incidents/");
      if (!incidentesRes.ok) {
        setErrorMensaje("No se pudo cargar la lista de incidentes.");
        setCargando(false);
        return;
      }

      const data = (await incidentesRes.json()) as unknown;
      const lista = normalizarIncidentes(data);
      setIncidentes(lista);
      setIncidenteSeleccionadoId(lista[0]?.id ?? "");

      const respuestaAlertas = await apiFetch("/alerts/");
      if (!respuestaAlertas.ok) {
        setErrorAlertas("No se pudieron cargar las alertas relacionadas.");
        setCargandoAlertas(false);
        setCargando(false);
        return;
      }

      const datosAlertas = (await respuestaAlertas.json()) as unknown;
      const alertasNormalizadas = normalizarAlertas(datosAlertas);
      setAlertasPorIncidente(agruparAlertasPorIncidente(alertasNormalizadas));
      setErrorAlertas("");
      setCargandoAlertas(false);
      setCargando(false);
    })();
  }, [navegar]);

  const incidentesFiltrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return incidentes.filter((incidente) => {
      const coincideBusqueda =
        !q ||
        `${incidente.name} ${incidente.incident_type} ${incidente.status} ${incidente.location_address ?? ""}`
          .toLowerCase()
          .includes(q);

      const coincideAbiertos = !soloIncidentesAbiertos || incidente.status === "OPEN";
      const coincideEvaluacion = !incidentesEvaluacion || incidente.status === "TRIAGE";

      return coincideBusqueda && coincideAbiertos && coincideEvaluacion;
    });
  }, [consulta, incidentes, soloIncidentesAbiertos, incidentesEvaluacion]);

  const resumenKpis = useMemo(() => {
    const incidentesAbiertos = incidentes.filter((incidente) => incidente.status === "OPEN").length;
    const incidentesEnEvaluacion = incidentes.filter((incidente) => incidente.status === "TRIAGE").length;
    const incidentesCerrados = incidentes.filter((incidente) => incidente.status === "CLOSED").length;

    return { incidentesAbiertos, incidentesEnEvaluacion, incidentesCerrados };
  }, [incidentes]);

  const totalPaginas = Math.max(1, Math.ceil(incidentesFiltrados.length / INCIDENTES_POR_PAGINA));

  const incidentesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * INCIDENTES_POR_PAGINA;
    const fin = inicio + INCIDENTES_POR_PAGINA;
    return incidentesFiltrados.slice(inicio, fin);
  }, [incidentesFiltrados, paginaActual, INCIDENTES_POR_PAGINA]);

  const incidenteSeleccionado =
    incidentesFiltrados.find((incidente) => incidente.id === incidenteSeleccionadoId) ??
    incidentesFiltrados[0] ??
    null;
  const alertasDelIncidenteSeleccionado = incidenteSeleccionado
    ? alertasPorIncidente[incidenteSeleccionado.id] ?? []
    : [];
  const usuariosDisponiblesSinAsignar = useMemo(() => {
    const usuariosAsignadosIds = new Set(asignaciones.map(obtenerIdUsuarioAsignado).filter(Boolean));
    return usuariosDisponibles.filter((usuario) => !usuariosAsignadosIds.has(usuario.id));
  }, [asignaciones, usuariosDisponibles]);

  const totalPaginasAsignadas = Math.max(1, Math.ceil(asignaciones.length / UNIDADES_POR_PAGINA_MODAL));
  const asignacionesPaginadas = useMemo(() => {
    const inicio = (paginaAsignadas - 1) * UNIDADES_POR_PAGINA_MODAL;
    return asignaciones.slice(inicio, inicio + UNIDADES_POR_PAGINA_MODAL);
  }, [asignaciones, paginaAsignadas, UNIDADES_POR_PAGINA_MODAL]);

  const totalPaginasDisponibles = Math.max(1, Math.ceil(usuariosDisponiblesSinAsignar.length / UNIDADES_POR_PAGINA_MODAL));
  const usuariosDisponiblesPaginados = useMemo(() => {
    const inicio = (paginaDisponibles - 1) * UNIDADES_POR_PAGINA_MODAL;
    return usuariosDisponiblesSinAsignar.slice(inicio, inicio + UNIDADES_POR_PAGINA_MODAL);
  }, [usuariosDisponiblesSinAsignar, paginaDisponibles, UNIDADES_POR_PAGINA_MODAL]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  useEffect(() => {
    if (!modalAsignarAbierto || !incidenteSeleccionado) return;

    setPaginaAsignadas(1);
    setPaginaDisponibles(1);
    void cargarDatosAsignacion(incidenteSeleccionado.id);
  }, [modalAsignarAbierto, incidenteSeleccionado?.id]);

  useEffect(() => {
    if (paginaAsignadas > totalPaginasAsignadas) {
      setPaginaAsignadas(totalPaginasAsignadas);
    }
  }, [paginaAsignadas, totalPaginasAsignadas]);

  useEffect(() => {
    if (paginaDisponibles > totalPaginasDisponibles) {
      setPaginaDisponibles(totalPaginasDisponibles);
    }
  }, [paginaDisponibles, totalPaginasDisponibles]);

  useEffect(() => {
    let cancelled = false;

    async function loadUbicacionResuelta() {
      if (!incidenteSeleccionado?.parsedLocation) {
        setUbicacionResuelta("");
        setResolviendoUbicacion(false);
        return;
      }

      const [lat, lon] = incidenteSeleccionado.parsedLocation;

      setResolviendoUbicacion(true);
      setUbicacionResuelta("");

      const result = await geocodificarInverso(lat, lon);

      if (!cancelled) {
        setUbicacionResuelta(result || "");
        setResolviendoUbicacion(false);
      }
    }

    loadUbicacionResuelta();

    return () => {
      cancelled = true;
    };
  }, [incidenteSeleccionado]);

  useEffect(() => {
    if (!incidentePendienteEliminarId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !incidenteEliminandoId) {
        setIncidentePendienteEliminarId("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [incidentePendienteEliminarId, incidenteEliminandoId]);

  const incidentePendienteEliminar =
    incidentes.find((incidente) => incidente.id === incidentePendienteEliminarId) ?? null;

  async function prepararEliminarIncidente(incidentId: string) {
    setIncidentePendienteEliminarId(incidentId);
    return;
  }

  async function confirmarEliminarIncidente(incidentId: string) {
    if (incidenteEliminandoId) return;

    setErrorMensaje("");
    setIncidenteEliminandoId(incidentId);
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
        setErrorMensaje(detail);
        return;
      }
      setIncidentes((prev) => prev.filter((incidente) => incidente.id !== incidentId));
      if (incidenteSeleccionadoId === incidentId) {
        setIncidenteSeleccionadoId("");
      }
      setIncidentePendienteEliminarId("");
    } finally {
      setIncidenteEliminandoId("");
    }
  }

  async function cargarDatosAsignacion(incidentId: string) {
    setCargandoAsignaciones(true);
    setErrorAsignaciones("");

    try {
      const [usuariosCombinados, asignacionesRes] = await Promise.all([
        cargarTodasLasUnidadesOperativas(),
        apiFetch(`/incidents/${incidentId}/assignments/`),
      ]);

      if (!asignacionesRes.ok) {
        setErrorAsignaciones("No se pudieron cargar los datos de asignación.");
        return;
      }

      const asignacionesData = await asignacionesRes.json();

      setUsuariosDisponibles(usuariosCombinados);
      setAsignaciones(
        Array.isArray(asignacionesData) ? asignacionesData : asignacionesData.results ?? []
      );
    } catch {
      setErrorAsignaciones("No se pudieron cargar los datos de asignación.");
    } finally {
      setCargandoAsignaciones(false);
    }
  }

  async function asignarUsuario(userId: string) {
    if (!incidenteSeleccionado) return;

    const res = await apiFetch(`/incidents/${incidenteSeleccionado.id}/assignments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userId }),
    });

    if (!res.ok) {
      setErrorAsignaciones("No se pudo asignar el usuario.");
      return;
    }

    await cargarDatosAsignacion(incidenteSeleccionado.id);
  }

  async function quitarUsuario(assignmentId: string) {
    if (!incidenteSeleccionado) return;

    const res = await apiFetch(`/incidents/${incidenteSeleccionado.id}/remove_assignment/`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId }),
    });

    if (!res.ok) {
      setErrorAsignaciones("No se pudo quitar el usuario.");
      return;
    }

    await cargarDatosAsignacion(incidenteSeleccionado.id);
  }

  async function cerrarIncidente(incidentId: string) {
    if (incidenteActualizandoId) return;

    setErrorMensaje("");
    setIncidenteActualizandoId(incidentId);
    try {
      const res = await apiFetch(`/incidents/${incidentId}/close/`, { method: "POST" });
      if (!res.ok) {
        let detail = "No se pudo cerrar el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") detail = data.detail;
          else if (typeof data.error === "string") detail = data.error;
        } catch {
          // keep fallback
        }
        setErrorMensaje(detail);
        return;
      }

      const incidenteActualizado = normalizarIncidentes([await res.json()])[0];
      if (!incidenteActualizado) return;

      setIncidentes((prev) =>
        prev.map((incidente) => (incidente.id === incidentId ? incidenteActualizado : incidente))
      );
    } finally {
      setIncidenteActualizandoId("");
    }
  }

  if (cargando) {
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

                  <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navegar("/createincident")}
            className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ cursor: "pointer" }}
          >
            Nuevo incidente
          </button>
        </div>

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
                value={consulta}
                onChange={(e) => {
                  setConsulta(e.target.value);
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

        

        {errorMensaje && (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {errorMensaje}
          </div>
        )}

        <div className="mt-4 grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
          <section className="overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <table className="min-w-[1120px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
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
                {incidentesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                      No hay incidentes para mostrar.
                    </td>
                  </tr>
                ) : (
                  incidentesPaginados.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => setIncidenteSeleccionadoId(incident.id)}
                      className={`cursor-pointer border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60 ${
                        incidenteSeleccionado?.id === incident.id ? "bg-[color:var(--cm-surface-2)]/70" : ""
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
                        <span className={`rounded-full px-2.5 py-1 text-xs ring-1 ${getIncidentStatusBadge(incident.status)}`}>
                          {incident.status === "OPEN"
                        ? "Abierto"
                        : incident.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluación"}
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
                              navegar(`/editIncident/${incident.id}`);
                            }}
                            className="rounded-lg bg-[color:var(--cm-info)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                          >
                            Editar
                          </button>
                          {incident.status !== "CLOSED" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void cerrarIncidente(incident.id);
                              }}
                              disabled={Boolean(incidenteActualizandoId)}
                              className="rounded-lg bg-[color:var(--cm-success)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                            >
                              {incidenteActualizandoId === incident.id ? "Cerrando..." : "Cerrar"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void prepararEliminarIncidente(incident.id);
                            }}
                            disabled={Boolean(incidenteEliminandoId)}
                            className="rounded-lg bg-[color:var(--cm-danger)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                          >
                            {incidenteEliminandoId === incident.id ? "Borrando..." : "Borrar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {incidentesFiltrados.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-[color:var(--cm-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--cm-text-muted)]">
                  Página {paginaActual} de {totalPaginas} · Mostrando {incidentesPaginados.length} de {incidentesFiltrados.length} incidentes
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
        {incidenteSeleccionado ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-slate-100">{incidenteSeleccionado.name}</h2>
              <button 
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                  onClick={() => setModalAsignarAbierto(true)}
                >
                Asignar unidad 
              </button>
            </div>

            {!incidentePendienteEliminarId && !modalAsignarAbierto && incidenteSeleccionado.parsedLocation && (
              <MapaMiniUnidad
                latitud={incidenteSeleccionado.parsedLocation[0]}
                longitud={incidenteSeleccionado.parsedLocation[1]}
                etiqueta={
                  incidenteSeleccionado.name
                    ? `Ubicacion del incidente ${incidenteSeleccionado.name}`
                    : "Ubicacion del incidente"
                }
              />
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.incident_type === "SEARCH"
                        ? "Búsqueda de personas"
                        : incidenteSeleccionado.incident_type === "MEDICAL"
                        ? "Emergencia médica"
                        : incidenteSeleccionado.incident_type === "WILDFIRE"
                        ? "Incendio forestal"
                        : incidenteSeleccionado.incident_type === "RESCUE"
                        ? "Rescate de persona desaparecida"
                        : incidenteSeleccionado.incident_type === "NATURAL_DISASTER"
                        ? "Desastre natural"
                        : "Otro"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Estado</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.status === "OPEN"
                        ? "Abierto"
                        : incidenteSeleccionado.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluación"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Activo</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.is_active ? "Si" : "No"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Organizacion</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.owner_organization || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-400">Descripcion</p>
                    <p className="text-slate-100">{incidenteSeleccionado.description || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Direccion</p>
                    <p className="text-slate-100">{incidenteSeleccionado.location_address || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Ubicacion legible</p>
                    <p className="text-slate-100">
                      {resolviendoUbicacion
                        ? "Buscando direccion..."
                        : ubicacionResuelta || incidenteSeleccionado.location_address || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Coordenadas</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.parsedLocation
                        ? `${incidenteSeleccionado.parsedLocation[0]}, ${incidenteSeleccionado.parsedLocation[1]}`
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Creado por</p>
                    <p className="text-slate-100">{incidenteSeleccionado.created_by || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Inicio</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.started_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Fin</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.ended_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Creado</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Actualizado</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.updated_at)}</p>
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

      {incidentePendienteEliminar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar confirmacion"
            onClick={() => {
              if (!incidenteEliminandoId) setIncidentePendienteEliminarId("");
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
                    Vas a eliminar <span className="font-semibold text-white">{incidentePendienteEliminar.name}</span>.
              Esta acción es permanente y el incidente dejará de estar disponible en el panel.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800">
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    {incidentePendienteEliminar.incident_type === "SEARCH" ? ("Búsqueda de personas")
                    : incidentePendienteEliminar.incident_type === "MEDICAL" ? "Emergencia médica" 
                    : incidentePendienteEliminar.incident_type === "WILDFIRE" ? "Incendio forestal"
                    : incidentePendienteEliminar.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                    : incidentePendienteEliminar.incident_type === "NATURAL_DISASTER" ? "Desastre natural" 
                    : incidentePendienteEliminar.incident_type === "OTHER" ? "Otro"
                    : "Tipo de incidente no válido"}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-slate-400">Estado</p>
                    {incidentePendienteEliminar.status === "OPEN"
                        ? "Abierto"
                        : incidentePendienteEliminar.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluación"}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIncidentePendienteEliminarId("")}
                  disabled={Boolean(incidenteEliminandoId)}
                  className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarEliminarIncidente(incidentePendienteEliminar.id)}
                  disabled={Boolean(incidenteEliminandoId)}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {incidenteEliminandoId === incidentePendienteEliminar.id ? "Eliminando..." : "Si, eliminar incidente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {modalAsignarAbierto && incidenteSeleccionado ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      aria-label="Cerrar modal"
      onClick={() => setModalAsignarAbierto(false)}
      className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
    />

    <div className="relative w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Unidad operativa
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            Asignar unidad a {incidenteSeleccionado.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setModalAsignarAbierto(false)}
          className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Cerrar
        </button>
      </div>

      {errorAsignaciones && (
        <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-500/30">
          {errorAsignaciones}
        </div>
      )}

      {cargandoAsignaciones ? (
        <p className="mt-6 text-sm text-slate-400">Cargando usuarios...</p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="font-semibold text-slate-100">
              Usuarios asignados
            </h3>

            <div className="mt-3 space-y-3">
              {asignaciones.length === 0 ? (
                <p className="rounded-xl bg-slate-950/60 p-4 text-sm text-slate-400">
                  Todavía no hay usuarios asignados.
                </p>
              ) : (
                asignacionesPaginadas.map((asignacion) => {
                  const usuario = asignacion.user_detail;
                  const asignacionDeOrganizacion = Boolean(
                    incidenteSeleccionado.owner_organization_id &&
                    usuario?.organization_id === incidenteSeleccionado.owner_organization_id
                  );

                  return (
                    <article
                      key={asignacion.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800"
                    >
                      <div>
                        <p className="font-medium text-slate-100">
                          {usuario
                            ? `${usuario.first_name ?? ""} ${usuario.last_name ?? ""}`.trim() ||
                              usuario.username ||
                              usuario.email
                            : asignacion.user ?? asignacion.user_id}
                        </p>
                        <p className="text-xs text-slate-400">
                          {usuario?.role ?? asignacion.role ?? asignacion.role_in_incident ?? "Sin rol"}
                        </p>
                      </div>

                      {asignacionDeOrganizacion ? (
                        <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
                          Organizacion
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void quitarUsuario(asignacion.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                        >
                          Quitar
                        </button>
                      )}
                    </article>
                  );
                })
              )}
            </div>
            {asignaciones.length > UNIDADES_POR_PAGINA_MODAL ? (
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>
                  Pagina {paginaAsignadas} de {totalPaginasAsignadas}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaAsignadas((pagina) => Math.max(1, pagina - 1))}
                    disabled={paginaAsignadas === 1}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaAsignadas((pagina) => Math.min(totalPaginasAsignadas, pagina + 1))}
                    disabled={paginaAsignadas === totalPaginasAsignadas}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="font-semibold text-slate-100">
              Operativos y supervisores disponibles
            </h3>

            <div className="mt-3 space-y-3">
              {usuariosDisponiblesSinAsignar.length === 0 ? (
                <p className="rounded-xl bg-slate-950/60 p-4 text-sm text-slate-400">
                  No hay usuarios disponibles para anadir.
                </p>
              ) : (
                usuariosDisponiblesPaginados.map((usuario) => (
                  <article
                    key={usuario.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {`${usuario.first_name ?? ""} ${usuario.last_name ?? ""}`.trim() ||
                          usuario.username ||
                          usuario.email}
                      </p>
                      <p className="text-xs text-slate-400">
                        {usuario.role ?? "Sin rol"}
                        {usuario.organization_name ? ` - ${usuario.organization_name}` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void asignarUsuario(usuario.id)}
                      className="rounded-lg bg-[color:var(--cm-success)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                    >
                      Añadir
                    </button>
                  </article>
                ))
              )}
            </div>
            {usuariosDisponiblesSinAsignar.length > UNIDADES_POR_PAGINA_MODAL ? (
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>
                  Pagina {paginaDisponibles} de {totalPaginasDisponibles}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaDisponibles((pagina) => Math.max(1, pagina - 1))}
                    disabled={paginaDisponibles === 1}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaDisponibles((pagina) => Math.min(totalPaginasDisponibles, pagina + 1))}
                    disabled={paginaDisponibles === totalPaginasDisponibles}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  </div>
) : null}
    </div>
  );
}
