import "leaflet/dist/leaflet.css";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";

type RespuestaUsuario = {
  authenticated: boolean;
  id?: string;
  username?: string;
  role?: string | null;
  has_panel_full_access?: boolean;
};

type Organizacion = {
  id: string;
  name: string;
};

type TipoIncidente =
  | "WILDFIRE"
  | "SEARCH"
  | "RESCUE"
  | "MEDICAL"
  | "NATURAL_DISASTER"
  | "OTHER";

type EstadoIncidente = "OPEN" | "TRIAGE" | "CLOSED";

type DetalleIncidenteResponse = {
  id: string;
  name?: string | null;
  incident_type?: TipoIncidente | null;
  status?: EstadoIncidente | null;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  created_by?: string | null;
  owner_organization?: string | { id?: string; name?: string } | null;
  owner_organization_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
};

type MensajeIncidente = {
  id: string;
  incident: string;
  author_id: string;
  author_username: string;
  author_name: string;
  author_role?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type ChecklistIncidente = {
  id: number;
  created_at?: string | null;
  checklist: string;
  user_id?: string | null;
  user_username?: string | null;
  user_name?: string | null;
  incident?: string | null;
  is_completed: number | boolean;
};

type DetalleUsuarioAsignado = {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  organization_name?: string | null;
};

type AsignacionIncidente = {
  id: string;
  user?: string | null;
  user_id?: string | null;
  user_detail?: DetalleUsuarioAsignado | null;
  role_in_incident?: string | null;
  role?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  is_active?: boolean | null;
};

type AlertaTimeline = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  acked_by?: string | null;
  acked_at?: string | null;
  ack_notes?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  close_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AuditoriaTimeline = {
  id: string;
  created_at?: string | null;
  description?: string | null;
  created_username?: string | null;
};

type EventoTimeline = {
  id: string;
  fecha: string;
  tipo: "incidente" | "alerta" | "mensaje" | "unidad" | "auditoria";
  titulo: string;
  descripcion?: string;
  actor?: string | null;
  tono: "rojo" | "ambar" | "azul" | "verde" | "violeta" | "gris";
};

const opcionesTipoIncidente: Array<{ value: TipoIncidente; label: string }> = [
  { value: "WILDFIRE", label: "Incendio forestal" },
  { value: "SEARCH", label: "Busqueda de persona" },
  { value: "RESCUE", label: "Rescate" },
  { value: "MEDICAL", label: "Emergencia medica" },
  { value: "NATURAL_DISASTER", label: "Desastre natural" },
  { value: "OTHER", label: "Otro" },
];

const opcionesEstado: Array<{ value: EstadoIncidente; label: string }> = [
  { value: "OPEN", label: "Abierto" },
  { value: "TRIAGE", label: "En evaluacion" },
  { value: "CLOSED", label: "Cerrado" },
];

const etiquetasAlertas: Record<string, string> = {
  FIRE: "Fuego",
  MEDICAL: "Sanitaria",
  RESCUE: "Rescate",
  SECURITY: "Seguridad",
  WEATHER: "Meteorologica",
  OTHER: "Otra",
};

const etiquetasSeveridad: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

function normalizarArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { results?: unknown }).results)) {
    return (raw as { results: T[] }).results;
  }
  return [];
}

function extraerCoordenadas(location: unknown): LatLngTuple | null {
  // Tratamos de entender la ubicación de varias formas que puede venir
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
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  return null;
}

function normalizarOrganizaciones(raw: unknown): Organizacion[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];
  return source
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.uuid ?? "");
      const name = String(row.name ?? row.nombre ?? row.title ?? "");
      return { id, name };
    })
    .filter((org) => org.id && org.name);
}

function formatearFechaTimeline(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatearMomentoTimeline(value?: string | null) {
  if (!value) return { fecha: "", hora: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { fecha: "", hora: "" };

  return {
    fecha: new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
    })
      .format(date)
      .replace(".", ""),
    hora: new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function obtenerNombreAsignado(asignacion: AsignacionIncidente) {
  const detalle = asignacion.user_detail;
  const nombreCompleto = `${detalle?.first_name ?? ""} ${detalle?.last_name ?? ""}`.trim();
  return nombreCompleto || detalle?.username || asignacion.user || detalle?.email || "Unidad sin identificar";
}

function obtenerEtiquetaRol(rol?: string | null) {
  if (!rol) return "Asignacion operativa";
  const etiquetas: Record<string, string> = {
    LEAD: "Responsable",
    OPERATIVE: "Operativo",
    MEDIC: "Sanitario",
    SUPPORT: "Apoyo",
  };
  return etiquetas[rol] ?? rol;
}

function obtenerEtiquetaAlerta(alerta: AlertaTimeline) {
  const tipo = alerta.alert_type ? etiquetasAlertas[alerta.alert_type] ?? alerta.alert_type : "Alerta";
  const severidad = alerta.severity ? etiquetasSeveridad[alerta.severity] ?? alerta.severity : "";
  return severidad ? `${tipo} (${severidad})` : tipo;
}

function fechasDistintas(a?: string | null, b?: string | null) {
  if (!a || !b) return Boolean(a || b);
  const fechaA = new Date(a).getTime();
  const fechaB = new Date(b).getTime();
  if (Number.isNaN(fechaA) || Number.isNaN(fechaB)) return a !== b;
  return Math.abs(fechaA - fechaB) > 1500;
}

function descripcionPerteneceAIncidente(auditoria: AuditoriaTimeline, incidenteId?: string, nombreIncidente?: string) {
  const descripcion = (auditoria.description ?? "").toLowerCase();
  const nombre = (nombreIncidente ?? "").trim().toLowerCase();
  const idNormalizado = (incidenteId ?? "").trim().toLowerCase();

  if (!descripcion) return false;
  if (idNormalizado && descripcion.includes(idNormalizado)) return true;
  if (nombre && descripcion.includes(nombre)) return true;
  return false;
}

function crearEventosTimeline({
  incidente,
  incidenteId,
  nombreIncidente,
  mensajes,
  asignaciones,
  alertas,
  auditorias,
}: {
  incidente: DetalleIncidenteResponse | null;
  incidenteId?: string;
  nombreIncidente: string;
  mensajes: MensajeIncidente[];
  asignaciones: AsignacionIncidente[];
  alertas: AlertaTimeline[];
  auditorias: AuditoriaTimeline[];
}) {
  const eventos: EventoTimeline[] = [];

  if (incidente?.created_at) {
    eventos.push({
      id: `incidente-creado-${incidente.id}`,
      fecha: incidente.created_at,
      tipo: "incidente",
      titulo: "Incidente creado",
      descripcion: nombreIncidente || incidente.name || "Incidente registrado en el panel.",
      actor: incidente.created_by,
      tono: "rojo",
    });
  }

  if (incidente?.started_at && fechasDistintas(incidente.started_at, incidente.created_at)) {
    eventos.push({
      id: `incidente-iniciado-${incidente.id}`,
      fecha: incidente.started_at,
      tipo: "incidente",
      titulo: "Incidente iniciado",
      descripcion: "Se marco el inicio operativo del incidente.",
      actor: incidente.created_by,
      tono: "ambar",
    });
  }

  if (incidente?.updated_at && fechasDistintas(incidente.updated_at, incidente.created_at)) {
    eventos.push({
      id: `incidente-actualizado-${incidente.id}`,
      fecha: incidente.updated_at,
      tipo: "incidente",
      titulo: "Incidente actualizado",
      descripcion: "Se modificaron los datos principales del incidente.",
      actor: null,
      tono: "azul",
    });
  }

  if (incidente?.ended_at) {
    eventos.push({
      id: `incidente-cerrado-${incidente.id}`,
      fecha: incidente.ended_at,
      tipo: "incidente",
      titulo: "Incidente cerrado",
      descripcion: "El incidente quedo marcado como cerrado.",
      actor: null,
      tono: "verde",
    });
  }

  asignaciones.forEach((asignacion) => {
    if (asignacion.joined_at) {
      eventos.push({
        id: `asignacion-${asignacion.id}-alta`,
        fecha: asignacion.joined_at,
        tipo: "unidad",
        titulo: "Unidad asignada",
        descripcion: `${obtenerNombreAsignado(asignacion)} - ${obtenerEtiquetaRol(asignacion.role_in_incident ?? asignacion.role)}`,
        actor: null,
        tono: "verde",
      });
    }
    if (asignacion.left_at) {
      eventos.push({
        id: `asignacion-${asignacion.id}-baja`,
        fecha: asignacion.left_at,
        tipo: "unidad",
        titulo: "Unidad retirada",
        descripcion: obtenerNombreAsignado(asignacion),
        actor: null,
        tono: "gris",
      });
    }
  });

  alertas
    .filter((alerta) => !incidenteId || String(alerta.incident ?? "") === String(incidenteId))
    .forEach((alerta) => {
      if (alerta.created_at) {
        eventos.push({
          id: `alerta-${alerta.id}-creada`,
          fecha: alerta.created_at,
          tipo: "alerta",
          titulo: `Alerta lanzada: ${alerta.title || obtenerEtiquetaAlerta(alerta)}`,
          descripcion: alerta.description || obtenerEtiquetaAlerta(alerta),
          actor: alerta.created_by,
          tono: alerta.severity === "CRITICAL" || alerta.severity === "HIGH" ? "rojo" : "ambar",
        });
      }
      if (alerta.acked_at) {
        eventos.push({
          id: `alerta-${alerta.id}-reconocida`,
          fecha: alerta.acked_at,
          tipo: "alerta",
          titulo: "Alerta reconocida",
          descripcion: alerta.ack_notes || alerta.title || obtenerEtiquetaAlerta(alerta),
          actor: alerta.acked_by,
          tono: "azul",
        });
      }
      if (alerta.closed_at) {
        eventos.push({
          id: `alerta-${alerta.id}-cerrada`,
          fecha: alerta.closed_at,
          tipo: "alerta",
          titulo: "Alerta cerrada",
          descripcion: alerta.close_notes || alerta.title || obtenerEtiquetaAlerta(alerta),
          actor: alerta.closed_by,
          tono: "verde",
        });
      }
    });

  mensajes.forEach((mensaje) => {
    eventos.push({
      id: `mensaje-${mensaje.id}`,
      fecha: mensaje.created_at,
      tipo: "mensaje",
      titulo: "Mensaje en el incidente",
      descripcion: mensaje.content,
      actor: mensaje.author_name || mensaje.author_username,
      tono: "violeta",
    });
  });

  auditorias
    .filter((auditoria) => descripcionPerteneceAIncidente(auditoria, incidenteId, nombreIncidente || incidente?.name || ""))
    .forEach((auditoria) => {
      if (!auditoria.created_at) return;
      eventos.push({
        id: `auditoria-${auditoria.id}`,
        fecha: auditoria.created_at,
        tipo: "auditoria",
        titulo: "Accion registrada",
        descripcion: auditoria.description ?? "",
        actor: auditoria.created_username,
        tono: "gris",
      });
    });

  return eventos
    .filter((evento) => Boolean(evento.fecha) && !Number.isNaN(new Date(evento.fecha).getTime()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

function obtenerClaseEventoTimeline(tono: EventoTimeline["tono"]) {
  const clases: Record<EventoTimeline["tono"], string> = {
    rojo: "border-red-500/50 bg-red-500/10 text-red-100",
    ambar: "border-amber-500/50 bg-amber-500/10 text-amber-100",
    azul: "border-sky-500/50 bg-sky-500/10 text-sky-100",
    verde: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
    violeta: "border-violet-500/50 bg-violet-500/10 text-violet-100",
    gris: "border-slate-600 bg-slate-900/70 text-slate-100",
  };
  return clases[tono];
}

function obtenerEtiquetaTipoEvento(tipo: EventoTimeline["tipo"]) {
  const etiquetas: Record<EventoTimeline["tipo"], string> = {
    incidente: "Incidente",
    alerta: "Alerta",
    mensaje: "Mensaje",
    unidad: "Unidad",
    auditoria: "Auditoria",
  };
  return etiquetas[tipo];
}

function SelectorMapaEditable({
  coords,
  editable,
  onPick,
}: {
  coords: LatLngTuple | null;
  editable: boolean;
  onPick: (value: LatLngTuple) => void;
}) {
  useMapEvents({
    click(event) {
      if (!editable) return;
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return coords ? (
    <CircleMarker center={coords} radius={8} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.85 }} />
  ) : null;
}

export default function EditIncidentPage() {
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [exitoMensaje, setExitoMensaje] = useState("");

  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<RespuestaUsuario | null>(null);
  const [detalleIncidente, setDetalleIncidente] = useState<DetalleIncidenteResponse | null>(null);
  const [mensajes, setMensajes] = useState<MensajeIncidente[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(true);
  const [errorMensajes, setErrorMensajes] = useState("");
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistIncidente[]>([]);
  const [checklistNuevo, setChecklistNuevo] = useState("");
  const [cargandoChecklist, setCargandoChecklist] = useState(true);
  const [errorChecklist, setErrorChecklist] = useState("");
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);
  const [checklistActualizandoId, setChecklistActualizandoId] = useState<number | null>(null);
  const [alertasTimeline, setAlertasTimeline] = useState<AlertaTimeline[]>([]);
  const [asignacionesTimeline, setAsignacionesTimeline] = useState<AsignacionIncidente[]>([]);
  const [auditoriasTimeline, setAuditoriasTimeline] = useState<AuditoriaTimeline[]>([]);
  const [cargandoTimeline, setCargandoTimeline] = useState(true);
  const [errorTimeline, setErrorTimeline] = useState("");

  const [nombre, setNombre] = useState("");
  const [tipoIncidente, setTipoIncidente] = useState<TipoIncidente>("WILDFIRE");
  const [estado, setEstado] = useState<EstadoIncidente>("OPEN");
  const [descripcion, setDescripcion] = useState("");
  const [direccionUbicacion, setDireccionUbicacion] = useState("");
  const [organizacionResponsable, setOrganizacionResponsable] = useState("");

  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [mapaEditable, setMapaEditable] = useState(false);
  const panelMensajesRef = useRef<HTMLDivElement | null>(null);

  const coordenadas = useMemo<LatLngTuple | null>(() => {
    const lat = Number(latitud);
    const lon = Number(longitud);
    if (!Number.isNaN(lat) && !Number.isNaN(lon) && latitud.trim() && longitud.trim()) {
      return [lat, lon];
    }
    return null;
  }, [latitud, longitud]);

  const eventosTimeline = useMemo(
    () =>
      crearEventosTimeline({
        incidente: detalleIncidente,
        incidenteId: id,
        nombreIncidente: nombre,
        mensajes,
        asignaciones: asignacionesTimeline,
        alertas: alertasTimeline,
        auditorias: auditoriasTimeline,
      }),
    [alertasTimeline, asignacionesTimeline, auditoriasTimeline, detalleIncidente, id, mensajes, nombre],
  );

  const resumenTimeline = useMemo(
    () => ({
      alertas: eventosTimeline.filter((evento) => evento.tipo === "alerta").length,
      unidades: eventosTimeline.filter((evento) => evento.tipo === "unidad").length,
      mensajes: eventosTimeline.filter((evento) => evento.tipo === "mensaje").length,
    }),
    [eventosTimeline],
  );

  const resumenChecklist = useMemo(() => {
    const completados = checklist.filter((item) => Boolean(Number(item.is_completed))).length;
    return {
      total: checklist.length,
      completados,
      pendientes: Math.max(0, checklist.length - completados),
      porcentaje: checklist.length ? Math.round((completados / checklist.length) * 100) : 0,
    };
  }, [checklist]);

  useEffect(() => {
    (async () => {
      if (!id) {
        setErrorMensaje("Incidente no valido.");
        setCargando(false);
        return;
      }

      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navegar("/login", { replace: true });
        return;
      }
      const meData = (await meRes.json()) as RespuestaUsuario;
      setUsuarioActual(meData);
      if (!meData.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      const [incidentRes, orgRes] = await Promise.all([apiFetch(`/incidents/${id}/`), apiFetch("/organizations/")]);

      if (!incidentRes.ok) {
        setErrorMensaje("No se pudo cargar el incidente.");
        setCargando(false);
        return;
      }

      const incident = (await incidentRes.json()) as DetalleIncidenteResponse;
      const listaOrganizaciones = orgRes.ok ? normalizarOrganizaciones((await orgRes.json()) as unknown) : [];
      setOrganizaciones(listaOrganizaciones);
      setDetalleIncidente(incident);

      setNombre(String(incident.name ?? ""));

      const tipoInicial = opcionesTipoIncidente.find((opt) => opt.value === incident.incident_type)?.value ?? "WILDFIRE";
      setTipoIncidente(tipoInicial);

      const estadoInicial = opcionesEstado.find((opt) => opt.value === incident.status)?.value ?? "OPEN";
      setEstado(estadoInicial);

      setDescripcion(String(incident.description ?? ""));
      setDireccionUbicacion(String(incident.location_address ?? ""));

      const coordenadasIniciales = extraerCoordenadas(incident.location);
      setLatitud(coordenadasIniciales ? String(coordenadasIniciales[0]) : "");
      setLongitud(coordenadasIniciales ? String(coordenadasIniciales[1]) : "");

      const ownerRaw = incident.owner_organization;
      if (ownerRaw && typeof ownerRaw === "object" && ownerRaw.id) {
        setOrganizacionResponsable(ownerRaw.id);
      } else if (typeof ownerRaw === "string" && listaOrganizaciones.length > 0) {
        const match = listaOrganizaciones.find((org) => org.name.toLowerCase() === ownerRaw.toLowerCase());
        setOrganizacionResponsable(match?.id ?? "");
      }

      setCargando(false);
    })();
  }, [id, navegar]);

  async function cargarMensajes(options?: { silent?: boolean }) {
    if (!id) return;

    if (!options?.silent) {
      setCargandoMensajes(true);
    }

    try {
      const res = await apiFetch(`/incidents/${id}/messages/`);
      if (!res.ok) {
        let detail = "No se pudo cargar el chat del incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string" && data.detail.trim()) {
            detail = data.detail;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as MensajeIncidente[];
      setMensajes(Array.isArray(data) ? data : []);
      setErrorMensajes("");
    } catch (error) {
      setErrorMensajes(error instanceof Error ? error.message : "No se pudo cargar el chat del incidente.");
    } finally {
      if (!options?.silent) {
        setCargandoMensajes(false);
      }
    }
  }

  async function cargarChecklist(options?: { silent?: boolean }) {
    if (!id) return;

    if (!options?.silent) {
      setCargandoChecklist(true);
    }

    try {
      const res = await apiFetch(`/incidents/${id}/checklist/`);
      if (!res.ok) {
        let detail = "No se pudo cargar el checklist del incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string" && data.detail.trim()) {
            detail = data.detail;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        throw new Error(detail);
      }
      setChecklist(normalizarArray<ChecklistIncidente>((await res.json()) as unknown));
      setErrorChecklist("");
    } catch (error) {
      setErrorChecklist(error instanceof Error ? error.message : "No se pudo cargar el checklist del incidente.");
    } finally {
      if (!options?.silent) {
        setCargandoChecklist(false);
      }
    }
  }

  async function cargarDatosTimeline(options?: { silent?: boolean }) {
    if (!id) return;

    if (!options?.silent) {
      setCargandoTimeline(true);
    }

    const cargarEndpoint = async <T,>(url: string) => {
      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error(url);
      }
      return normalizarArray<T>((await res.json()) as unknown);
    };

    try {
      const [alertasRes, asignacionesRes, auditoriasRes] = await Promise.allSettled([
        cargarEndpoint<AlertaTimeline>(`/alerts/?incident=${encodeURIComponent(id)}`),
        cargarEndpoint<AsignacionIncidente>(`/incidents/${id}/assignments/`),
        cargarEndpoint<AuditoriaTimeline>("/auditoria/"),
      ]);

      if (alertasRes.status === "fulfilled") {
        setAlertasTimeline(alertasRes.value);
      }
      if (asignacionesRes.status === "fulfilled") {
        setAsignacionesTimeline(asignacionesRes.value);
      }
      if (auditoriasRes.status === "fulfilled") {
        setAuditoriasTimeline(auditoriasRes.value);
      }

      const fallos = [alertasRes, asignacionesRes, auditoriasRes].filter((resultado) => resultado.status === "rejected");
      setErrorTimeline(fallos.length === 3 ? "No se pudo cargar la linea temporal del incidente." : "");
    } finally {
      if (!options?.silent) {
        setCargandoTimeline(false);
      }
    }
  }

  useEffect(() => {
    if (!id) return;

    void cargarMensajes();
    void cargarChecklist();
    const intervalId = window.setInterval(() => {
      void cargarMensajes({ silent: true });
      void cargarChecklist({ silent: true });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    void cargarDatosTimeline();
    const intervalId = window.setInterval(() => {
      void cargarDatosTimeline({ silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    const panel = panelMensajesRef.current;
    if (!panel) return;
    panel.scrollTop = panel.scrollHeight;
  }, [mensajes]);

  function manejarSeleccionMapa(value: LatLngTuple) {
    setLatitud(value[0].toFixed(6));
    setLongitud(value[1].toFixed(6));
  }

  async function manejarEnvio(event: FormEvent) {
    event.preventDefault();
    if (!id) return;

    setErrorMensaje("");
    setExitoMensaje("");

    if (!nombre.trim()) {
      setErrorMensaje("El nombre del incidente es obligatorio.");
      return;
    }

    if ((latitud.trim() && !longitud.trim()) || (!latitud.trim() && longitud.trim())) {
      setErrorMensaje("Debes informar latitud y longitud juntas.");
      return;
    }

    const latParseada = latitud.trim() ? Number(latitud) : undefined;
    const lonParseada = longitud.trim() ? Number(longitud) : undefined;
    if (latParseada !== undefined && Number.isNaN(latParseada)) {
      setErrorMensaje("Latitud no valida.");
      return;
    }
    if (lonParseada !== undefined && Number.isNaN(lonParseada)) {
      setErrorMensaje("Longitud no valida.");
      return;
    }
    if (latParseada !== undefined && (latParseada < -90 || latParseada > 90)) {
      setErrorMensaje("La latitud debe estar entre -90 y 90.");
      return;
    }
    if (lonParseada !== undefined && (lonParseada < -180 || lonParseada > 180)) {
      setErrorMensaje("La longitud debe estar entre -180 y 180.");
      return;
    }

    const datosEnvio: Record<string, unknown> = {
      name: nombre.trim(),
      incident_type: tipoIncidente,
      status: estado,
      description: descripcion.trim() || null,
      location_address: direccionUbicacion.trim() || null,
      owner_organization: organizacionResponsable || null,
    };

    if (latParseada !== undefined && lonParseada !== undefined) {
      datosEnvio.location = `SRID=4326;POINT (${lonParseada} ${latParseada})`;
    } else {
      datosEnvio.location = null;
    }

    setGuardando(true);
    try {
      const res = await apiFetch(`/incidents/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosEnvio),
      });

      if (!res.ok) {
        let detail = "No se pudo actualizar el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else {
            const firstKey = Object.keys(data ?? {})[0];
            if (firstKey) {
              const value = data[firstKey];
              detail = Array.isArray(value) ? `${firstKey}: ${String(value[0])}` : `${firstKey}: ${String(value)}`;
            }
          }
        } catch {
          // Si no hay detalles claros, usamos el mensaje normal
        }
        setErrorMensaje(detail);
        return;
      }

      let incidenteActualizado: DetalleIncidenteResponse | null = null;
      try {
        incidenteActualizado = (await res.json()) as DetalleIncidenteResponse;
      } catch {
        incidenteActualizado = null;
      }

      setExitoMensaje("Incidente actualizado correctamente.");
      setDetalleIncidente((prev) =>
        incidenteActualizado
          ? incidenteActualizado
          : prev
          ? {
              ...prev,
              name: datosEnvio.name as string,
              incident_type: datosEnvio.incident_type as TipoIncidente,
              status: datosEnvio.status as EstadoIncidente,
              description: datosEnvio.description as string | null,
              location_address: datosEnvio.location_address as string | null,
              location: datosEnvio.location ?? prev.location,
              owner_organization_id: organizacionResponsable || null,
              updated_at: new Date().toISOString(),
            }
          : prev,
      );
      setMapaEditable(false);
      void cargarDatosTimeline({ silent: true });
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEnvioMensaje(event: FormEvent) {
    event.preventDefault();
    if (!id || enviandoMensaje) return;

    const texto = mensajeNuevo.trim();
    if (!texto) return;

    setEnviandoMensaje(true);
    setErrorMensajes("");

    try {
      const res = await apiFetch(`/incidents/${id}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: texto }),
      });

      if (!res.ok) {
        let detail = "No se pudo enviar el mensaje.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else if (Array.isArray(data.content) && typeof data.content[0] === "string") {
            detail = data.content[0];
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensajes(detail);
        return;
      }

      const nuevoMensaje = (await res.json()) as MensajeIncidente;
      setMensajes((prev) => [...prev, nuevoMensaje]);
      setMensajeNuevo("");
    } finally {
      setEnviandoMensaje(false);
    }
  }

  async function manejarCrearChecklist(event: FormEvent) {
    event.preventDefault();
    if (!id || guardandoChecklist) return;

    const texto = checklistNuevo.trim();
    if (!texto) return;

    setGuardandoChecklist(true);
    setErrorChecklist("");

    try {
      const res = await apiFetch(`/incidents/${id}/checklist/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: texto }),
      });

      if (!res.ok) {
        let detail = "No se pudo crear el checklist.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else if (Array.isArray(data.checklist) && typeof data.checklist[0] === "string") {
            detail = data.checklist[0];
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorChecklist(detail);
        return;
      }

      const nuevoItem = (await res.json()) as ChecklistIncidente;
      setChecklist((prev) => [...prev, nuevoItem]);
      setChecklistNuevo("");
      void cargarDatosTimeline({ silent: true });
    } finally {
      setGuardandoChecklist(false);
    }
  }

  async function manejarCambioChecklist(item: ChecklistIncidente, completado: boolean) {
    if (!id || checklistActualizandoId != null) return;

    setChecklistActualizandoId(item.id);
    setErrorChecklist("");

    const estadoAnterior = checklist;
    setChecklist((prev) =>
      prev.map((actual) => (actual.id === item.id ? { ...actual, is_completed: completado ? 1 : 0 } : actual)),
    );

    try {
      const res = await apiFetch(`/incidents/${id}/checklist/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: completado }),
      });

      if (!res.ok) {
        throw new Error("No se pudo actualizar el checklist.");
      }

      const actualizado = (await res.json()) as ChecklistIncidente;
      setChecklist((prev) => prev.map((actual) => (actual.id === actualizado.id ? actualizado : actual)));
      void cargarDatosTimeline({ silent: true });
    } catch (error) {
      setChecklist(estadoAnterior);
      setErrorChecklist(error instanceof Error ? error.message : "No se pudo actualizar el checklist.");
    } finally {
      setChecklistActualizandoId(null);
    }
  }

  async function manejarBorrarChecklist(item: ChecklistIncidente) {
    if (!id || checklistActualizandoId != null) return;

    setChecklistActualizandoId(item.id);
    setErrorChecklist("");

    try {
      const res = await apiFetch(`/incidents/${id}/checklist/${item.id}/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("No se pudo borrar el checklist.");
      }

      setChecklist((prev) => prev.filter((actual) => actual.id !== item.id));
      void cargarDatosTimeline({ silent: true });
    } catch (error) {
      setErrorChecklist(error instanceof Error ? error.message : "No se pudo borrar el checklist.");
    } finally {
      setChecklistActualizandoId(null);
    }
  }

  function formatearFechaMensaje(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <p className="text-slate-300">Cargando incidente...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Operaciones · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Editar incidente</h1>
            <p className="mt-2 text-slate-300">Actualiza los datos del incidente y su localizacion.</p>
          </div>
          <button
            type="button"
            onClick={() => navegar("/incidents")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_30rem]">
          <div className="rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
            {errorMensaje ? (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{errorMensaje}</div>
            ) : null}
            {exitoMensaje ? (
              <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {exitoMensaje}
              </div>
            ) : null}

            <form onSubmit={manejarEnvio} className="space-y-8">
  <section className="rounded-2xl bg-slate-950/30 p-5 ring-1 ring-slate-800">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-100">Información del incidente</h2>
      <p className="mt-1 text-sm text-slate-400">
        Datos principales, clasificación y estado operativo.
      </p>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-300">Nombre del incidente</label>
        <input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de incidente</label>
        <select
          value={tipoIncidente}
          onChange={(event) => {
            setTipoIncidente(event.target.value as TipoIncidente);
          }}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        >
          {opcionesTipoIncidente.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-slate-950/20 p-4 ring-1 ring-slate-800">
        <label className="mb-3 block text-sm font-medium text-slate-300">Estado</label>
        <div className="flex flex-col gap-2 text-sm text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado === "OPEN"}
              onChange={(event) => {
                if (event.target.checked) {
                  setEstado("OPEN");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            Abierto
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado === "CLOSED"}
              onChange={(event) => {
                if (event.target.checked) {
                  setEstado("CLOSED");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            Cerrado
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado === "TRIAGE"}
              onChange={(event) => {
                if (event.target.checked) {
                  setEstado("TRIAGE");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            En evaluación
          </label>
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-300">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          rows={4}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
    </div>
  </section>

  <section className="rounded-2xl bg-slate-950/30 p-5 ring-1 ring-slate-800">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-100">Ubicación</h2>
      <p className="mt-1 text-sm text-slate-400">
        Dirección, coordenadas y localización en mapa.
      </p>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-300">Dirección / ubicación textual</label>
        <input
          value={direccionUbicacion}
          onChange={(event) => setDireccionUbicacion(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Latitud</label>
        <input
          value={latitud}
          onChange={(event) => setLatitud(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          inputMode="decimal"
          placeholder="40.4168"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Longitud</label>
        <input
          value={longitud}
          onChange={(event) => setLongitud(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          inputMode="decimal"
          placeholder="-3.7038"
        />
      </div>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
      <div className="h-72 overflow-hidden rounded-xl ring-1 ring-slate-800">
        <MapContainer
          center={coordenadas ?? [40.4168, -3.7038]}
          zoom={coordenadas ? 13 : 6}
          scrollWheelZoom={mapaEditable}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SelectorMapaEditable coords={coordenadas} editable={mapaEditable} onPick={manejarSeleccionMapa} />
        </MapContainer>
      </div>

      <div className="flex flex-col justify-between rounded-xl bg-slate-950/40 p-4 ring-1 ring-slate-800">
        <div className="space-y-2 text-sm text-slate-300">
          <p className="font-medium text-slate-100">Ubicación del incidente</p>
          <p>
            {coordenadas
              ? `Latitud ${coordenadas[0].toFixed(6)} · Longitud ${coordenadas[1].toFixed(6)}`
              : "Sin coordenadas actuales."}
          </p>
          <p className="text-xs text-slate-400">
            {mapaEditable
              ? "Mapa desbloqueado: haz clic en una zona para fijar la ubicación."
              : "Mapa bloqueado: pulsa el botón para habilitar la selección por mapa."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMapaEditable((prev) => !prev)}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Editar ubicación en mapa
        </button>
      </div>
    </div>
  </section>

  <section className="rounded-2xl bg-slate-950/30 p-5 ring-1 ring-slate-800">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-100">Gestión</h2>
      <p className="mt-1 text-sm text-slate-400">
        Organización asignada y datos de administración.
      </p>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">Organización responsable</label>
      <select
        value={organizacionResponsable}
        onChange={(event) => setOrganizacionResponsable(event.target.value)}
        className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
      >
        <option value="" className="bg-slate-900">
          Sin organización
        </option>
        {organizaciones.map((organization) => (
          <option key={organization.id} value={organization.id} className="bg-slate-900">
            {organization.name}
          </option>
        ))}
      </select>
    </div>
  </section>

  <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-2 sm:flex-row sm:justify-end">
    <button
      type="button"
      onClick={() => navegar("/incidents")}
      className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
    >
      Cancelar
    </button>

    <button
      type="submit"
      disabled={guardando}
      className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
    >
      {guardando ? "Guardando..." : "Guardar cambios"}
    </button>
  </div>
</form>
          </div>

          <aside className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-slate-800 shadow-2xl xl:sticky xl:top-6 xl:self-start">
            <div className="flex flex-col">
              <section className="mb-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 shadow-inner">
                <div className="border-b border-slate-800/80 bg-slate-900/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">Checklist</p>
                      <h2 className="mt-2 text-xl font-bold leading-tight text-slate-100">Checklist operativo</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Tareas del incidente.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-500/30">
                      {resumenChecklist.porcentaje}%
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${resumenChecklist.porcentaje}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
                      <p className="text-lg font-bold text-slate-100">{resumenChecklist.total}</p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Total</p>
                    </div>
                    <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
                      <p className="text-lg font-bold text-emerald-100">{resumenChecklist.completados}</p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Hechos</p>
                    </div>
                    <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
                      <p className="text-lg font-bold text-amber-100">{resumenChecklist.pendientes}</p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Pendientes</p>
                    </div>
                  </div>
                </div>

                {errorChecklist ? (
                  <div className="mx-4 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {errorChecklist}
                  </div>
                ) : null}

                <div className="max-h-80 overflow-y-auto overflow-x-hidden p-4">
                  {cargandoChecklist ? (
                    <div className="grid min-h-32 place-items-center rounded-2xl bg-slate-950/40 text-sm text-slate-400 ring-1 ring-slate-800">
                      Cargando checklist...
                    </div>
                  ) : checklist.length === 0 ? (
                    <div className="grid min-h-32 place-items-center rounded-2xl bg-slate-950/40 px-5 text-center text-sm text-slate-400 ring-1 ring-slate-800">
                      Todavia no hay checks para este incidente.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {checklist.map((item) => {
                        const completado = Boolean(Number(item.is_completed));
                        const actualizando = checklistActualizandoId === item.id;
                        return (
                          <article
                            key={item.id}
                            className={`rounded-2xl border p-3 transition ${
                              completado
                                ? "border-emerald-500/30 bg-emerald-500/10"
                                : "border-slate-800 bg-slate-950/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={completado}
                                disabled={actualizando}
                                onChange={(event) => {
                                  void manejarCambioChecklist(item, event.target.checked);
                                }}
                                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-700 bg-slate-950"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`break-words text-sm font-semibold leading-5 ${
                                    completado ? "text-emerald-100 line-through decoration-emerald-300/70" : "text-slate-100"
                                  }`}
                                >
                                  {item.checklist}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                  {item.user_name || item.user_username || "Usuario"} · {formatearFechaMensaje(item.created_at ?? "")}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={actualizando}
                                onClick={() => {
                                  void manejarBorrarChecklist(item);
                                }}
                                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
                              >
                                Borrar
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <form onSubmit={manejarCrearChecklist} className="border-t border-slate-800 p-4">
                  <textarea
                    value={checklistNuevo}
                    onChange={(event) => setChecklistNuevo(event.target.value)}
                    rows={3}
                    placeholder="Añade una tarea: confirmar ubicación, asignar unidades, revisar comunicaciones..."
                    className="w-full rounded-2xl bg-slate-950/50 px-4 py-3 text-sm text-slate-100 ring-1 ring-slate-800 outline-none transition focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={guardandoChecklist || !checklistNuevo.trim()}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {guardandoChecklist ? "Añadiendo..." : "Añadir check"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="mb-5 shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 shadow-inner">
                <div className="border-b border-slate-800/80 bg-slate-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-red-300/80">Timeline</p>
                    <h2 className="mt-2 text-xl font-bold leading-tight text-slate-100">Acciones del incidente</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Ultimos movimientos, alertas, unidades y mensajes asociados.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 ring-1 ring-red-500/30">
                    {eventosTimeline.length}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
                    <p className="text-lg font-bold text-amber-100">{resumenTimeline.alertas}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Alertas</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
                    <p className="text-lg font-bold text-emerald-100">{resumenTimeline.unidades}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Unidades</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
                    <p className="text-lg font-bold text-violet-100">{resumenTimeline.mensajes}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Mensajes</p>
                  </div>
                </div>
                </div>

                {errorTimeline ? (
                  <div className="mx-4 mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                    {errorTimeline}
                  </div>
                ) : null}

                <div className="max-h-[28rem] overflow-y-auto overflow-x-hidden p-4">
                  {cargandoTimeline ? (
                    <div className="grid min-h-40 place-items-center rounded-2xl bg-slate-950/40 text-sm text-slate-400 ring-1 ring-slate-800">
                      Cargando linea temporal...
                    </div>
                  ) : eventosTimeline.length === 0 ? (
                    <div className="grid min-h-40 place-items-center rounded-2xl bg-slate-950/40 px-6 text-center text-sm text-slate-400 ring-1 ring-slate-800">
                      Todavia no hay acciones registradas para este incidente.
                    </div>
                  ) : (
                    <ol className="relative space-y-4 border-l border-slate-800 pl-5">
                      {eventosTimeline.slice(0, 80).map((evento) => {
                        const momento = formatearMomentoTimeline(evento.fecha);
                        return (
                        <li key={evento.id} className="relative min-w-0">
                          <span
                            className={`absolute -left-[1.68rem] top-4 h-3.5 w-3.5 rounded-full border-2 ring-4 ring-slate-950 ${obtenerClaseEventoTimeline(
                              evento.tono,
                            )}`}
                          />
                          <article
                            className={`min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm ${obtenerClaseEventoTimeline(evento.tono)}`}
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-950/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 ring-1 ring-white/10">
                                    {obtenerEtiquetaTipoEvento(evento.tipo)}
                                  </span>
                                  {evento.actor ? (
                                    <span className="max-w-full truncate text-[11px] text-slate-400">{evento.actor}</span>
                                  ) : null}
                                </div>
                                <p className="mt-2 break-words text-sm font-semibold leading-5 text-slate-50">
                                  {evento.titulo}
                                </p>
                              </div>
                              <time
                                className="shrink-0 rounded-xl bg-slate-950/50 px-2.5 py-1.5 text-right ring-1 ring-white/10"
                                title={formatearFechaTimeline(evento.fecha)}
                              >
                                <span className="block text-[11px] font-semibold text-slate-200">{momento.fecha}</span>
                                <span className="block text-[11px] text-slate-500">{momento.hora}</span>
                              </time>
                            </div>
                            {evento.descripcion ? (
                              <p className="mt-3 max-h-28 overflow-hidden break-words text-sm leading-6 text-slate-200">
                                {evento.descripcion}
                              </p>
                            ) : null}
                          </article>
                        </li>
                      );
                      })}
                    </ol>
                  )}
                </div>
              </section>

              <div className="border-b border-slate-800 pb-4">
                <p className="text-xs uppercase tracking-[0.22em] text-sky-300/80">Mensajeria</p>
                <h2 className="mt-2 text-xl font-bold text-slate-100">Chat del incidente</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Canal rapido para coordinacion y seguimiento entre los miembros del operativo.
                </p>
              </div>

              {errorMensajes ? (
                <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMensajes}
                </div>
              ) : null}

              <div
                ref={panelMensajesRef}
                className="mt-4 h-72 min-h-[18rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-950/40 p-3 ring-1 ring-slate-800"
              >
                {cargandoMensajes ? (
                  <div className="grid h-full min-h-[16rem] place-items-center text-sm text-slate-400">
                    Cargando mensajes...
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="grid h-full min-h-[16rem] place-items-center text-center text-sm text-slate-400">
                    Todavia no hay mensajes en este incidente. El primer mensaje quedara registrado aqui.
                  </div>
                ) : (
                  mensajes.map((mensaje) => {
                    const esPropio = Boolean(usuarioActual?.id) && usuarioActual?.id === mensaje.author_id;
                    return (
                      <article
                        key={mensaje.id}
                        className={`max-w-[92%] rounded-2xl px-4 py-3 ring-1 ${
                          esPropio
                            ? "ml-auto bg-sky-500/15 text-slate-100 ring-sky-500/30"
                            : "bg-slate-900/80 text-slate-100 ring-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{mensaje.author_name || mensaje.author_username}</p>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              {mensaje.author_role === "SUPERVISOR"
                                ? "Supervisor"
                                : mensaje.author_role === "ADMIN"
                                ? "Administrador"
                                : "Operativo"}
                            </p>
                          </div>
                          <time className="text-[11px] text-slate-400">{formatearFechaMensaje(mensaje.created_at)}</time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{mensaje.content}</p>
                      </article>
                    );
                  })
                )}
              </div>

              <form onSubmit={manejarEnvioMensaje} className="mt-4 space-y-3">
                <textarea
                  value={mensajeNuevo}
                  onChange={(event) => setMensajeNuevo(event.target.value)}
                  rows={4}
                  placeholder="Escribe una actualizacion, instruccion o comentario para el equipo..."
                  className="w-full rounded-2xl bg-slate-950/40 px-4 py-3 text-sm text-slate-100 ring-1 ring-slate-800 outline-none transition focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Los mensajes se actualizan automaticamente cada pocos segundos.
                  </p>
                  <button
                    type="submit"
                    disabled={enviandoMensaje || !mensajeNuevo.trim()}
                    className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviandoMensaje ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
