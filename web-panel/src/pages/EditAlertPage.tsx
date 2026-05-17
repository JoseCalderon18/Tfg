import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MapaMiniUnidad from "../components/MapaMiniUnidad";
import { apiFetch } from "../utils/api";
import { getAlertStatusBadge } from "../utils/statusColors";

type UsuarioResumen = {
  id?: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
};

type DetalleUsuarioPanel = UsuarioResumen & {
  id: string;
};

type FilaListaUsuarioPanel = {
  id: string;
  username?: string;
  email?: string;
};

type DetalleAlerta = {
  id: string;
  incident?: string | null;
  location?: unknown;
  created_by?: UsuarioResumen | string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  acked_by?: UsuarioResumen | string | null;
  acked_by_id?: string | null;
  acked_by_name?: string | null;
  acked_at?: string | null;
  ack_notes?: string | null;
  closed_by?: UsuarioResumen | string | null;
  closed_by_id?: string | null;
  closed_by_name?: string | null;
  closed_at?: string | null;
  close_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ALERT_TYPE_OPTIONS = [
  { value: "SOS", label: "SOS" },
  { value: "MAN_DOWN", label: "Hombre caído" },
  { value: "LOST", label: "Pérdida / desorientado" },
  { value: "GEOFENCE", label: "Geofence" },
  { value: "ANOMALY", label: "Anomalía" },
  { value: "OTHER", label: "Otro" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Abierta" },
  { value: "ACK", label: "Reconocida" },
  { value: "CLOSED", label: "Cerrada" },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: "Crítica" },
  { value: 2, label: "Alta" },
  { value: 3, label: "Media" },
  { value: 4, label: "Baja" },
  { value: 5, label: "Informativa" },
];

async function geocodificarInverso(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
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
        postcode?: string;
        country?: string;
      };
    };

    const road = data.address?.road ?? data.address?.pedestrian ?? "";
    const houseNumber = data.address?.house_number ?? "";
    const locality =
      data.address?.city ??
      data.address?.town ??
      data.address?.village ??
      data.address?.municipality ??
      "";
    const state = data.address?.state ?? "";
    const postcode = data.address?.postcode ?? "";
    const country = data.address?.country ?? "";

    const compact = [road && houseNumber ? `${road} ${houseNumber}` : road, locality, state, postcode, country]
      .filter(Boolean)
      .join(", ");

    return compact || data.display_name || null;
  } catch {
    return null;
  }
}

function formatearFecha(value?: string | null) {
  if (!value) return "No disponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerEtiquetaUsuario(user?: UsuarioResumen | null) {
  if (!user) return "No disponible";

  if (user.email?.trim()) return user.email.trim();
  if (user.display_name?.trim()) return user.display_name.trim();

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  if (fullName && user.username) return `${fullName} (${user.username})`;
  if (fullName) return fullName;
  if (user.username) return user.username;
  if (user.email) return user.email;
  return "No disponible";
}

function pareceUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function aResumenUsuario(
  rawUser?: UsuarioResumen | string | null,
  rawId?: string | null,
  rawName?: string | null
): UsuarioResumen | null {
  if (rawUser && typeof rawUser === "object") {
    return {
      ...rawUser,
      id: rawUser.id ?? rawId ?? undefined,
      display_name: rawName ?? rawUser.display_name,
    };
  }

  if (rawId || rawName || typeof rawUser === "string") {
    return {
      id: rawId ?? (typeof rawUser === "string" && pareceUuid(rawUser) ? rawUser : undefined),
      display_name: rawName ?? (typeof rawUser === "string" && !pareceUuid(rawUser) ? rawUser : undefined),
    };
  }

  return null;
}

function obtenerBadgeEstado(status?: string | null) {
  return getAlertStatusBadge(status);
}

function obtenerBadgeAlerta(type?: string | null) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN") return "cm-badge-alert";
  if (type === "GEOFENCE") return "cm-badge-warning";
  if (type === "OTHER") return "cm-badge-special";
  return "cm-badge-info";
}

function analizarUbicacion(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null;

  if (typeof location === "string") {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  if (Array.isArray(location) && location.length >= 2) {
    const lng = Number(location[0]);
    const lat = Number(location[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  if (typeof location === "object") {
    const candidate = location as {
      coordinates?: unknown;
      x?: unknown;
      y?: unknown;
      lat?: unknown;
      lng?: unknown;
      lon?: unknown;
    };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const lng = Number(candidate.coordinates[0]);
      const lat = Number(candidate.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const lng = Number(candidate.x);
      const lat = Number(candidate.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }

    if (candidate.lat !== undefined && (candidate.lng !== undefined || candidate.lon !== undefined)) {
      const lat = Number(candidate.lat);
      const lng = Number(candidate.lng ?? candidate.lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  return null;
}

function obtenerTextoUbicacion(location: unknown, lat: number | null, lng: number | null) {
  if (typeof location === "string" && location.trim()) return location;

  if (location && typeof location === "object") {
    const candidate = location as { coordinates?: unknown; x?: unknown; y?: unknown };
    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      return `POINT (${candidate.coordinates[0]} ${candidate.coordinates[1]})`;
    }
    if (candidate.x !== undefined && candidate.y !== undefined) {
      return `POINT (${candidate.x} ${candidate.y})`;
    }
  }

  if (lat != null && lng != null) {
    return `POINT (${lng} ${lat})`;
  }

  return "";
}

export default function EditAlertPage() {
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [edicionDesbloqueada, setEdicionDesbloqueada] = useState(false);

  const [idIncidente, setIdIncidente] = useState("");
  const [tipoAlerta, setTipoAlerta] = useState("OTHER");
  const [severidad, setSeveridad] = useState(3);
  const [estado, setEstado] = useState("OPEN");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [valorUbicacion, setValorUbicacion] = useState("");
  const [ubicacionLegible, setUbicacionLegible] = useState("");
  const [resolviendoUbicacion, setResolviendoUbicacion] = useState(false);
  const [notasReconocimiento, setNotasReconocimiento] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [creadoEn, setCreadoEn] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [reconocidoEn, setReconocidoEn] = useState<string | null>(null);
  const [cerradoEn, setCerradoEn] = useState<string | null>(null);
  const [creadoPor, setCreadoPor] = useState<UsuarioResumen | null>(null);
  const [reconocidoPor, setReconocidoPor] = useState<UsuarioResumen | null>(null);
  const [cerradoPor, setCerradoPor] = useState<UsuarioResumen | null>(null);

  const ubicacionAnalizada = useMemo(() => analizarUbicacion(valorUbicacion), [valorUbicacion]);

  const resumen = useMemo(
    () => ({
      etiquetaTipoAlerta:
        ALERT_TYPE_OPTIONS.find((option) => option.value === tipoAlerta)?.label ?? "Sin tipo",
      etiquetaSeveridad: SEVERITY_OPTIONS.find((option) => option.value === severidad)?.label ?? "Sin severidad",
      etiquetaEstado: STATUS_OPTIONS.find((option) => option.value === estado)?.label ?? "Sin estado",
    }),
    [tipoAlerta, severidad, estado]
  );

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Alerta no válida.");
        setCargando(false);
        return;
      }

      try {
        const response = await apiFetch(`/alerts/${id}/`);
        if (!response.ok) {
          setError("No se pudo cargar la alerta.");
          setCargando(false);
          return;
        }

        const alerta = (await response.json()) as DetalleAlerta;
        setIdIncidente(alerta.incident ?? "");
        setTipoAlerta(alerta.alert_type ?? "OTHER");
        setSeveridad(alerta.severity ?? 3);
        setEstado(alerta.status ?? "OPEN");
        setTitulo(alerta.title ?? "");
        setDescripcion(alerta.description ?? "");
        setLatitud(alerta.lat ?? null);
        setLongitud(alerta.lng ?? null);
        setValorUbicacion(obtenerTextoUbicacion(alerta.location, alerta.lat ?? null, alerta.lng ?? null));
        setNotasReconocimiento(alerta.ack_notes ?? "");
        setNotasCierre(alerta.close_notes ?? "");
        setCreadoEn(alerta.created_at ?? null);
        setActualizadoEn(alerta.updated_at ?? null);
        setReconocidoEn(alerta.acked_at ?? null);
        setCerradoEn(alerta.closed_at ?? null);
        setCreadoPor(aResumenUsuario(alerta.created_by, alerta.created_by_id, alerta.created_by_name));
        setReconocidoPor(aResumenUsuario(alerta.acked_by, alerta.acked_by_id, alerta.acked_by_name));
        setCerradoPor(aResumenUsuario(alerta.closed_by, alerta.closed_by_id, alerta.closed_by_name));
      } catch {
        setError("Error de red al cargar la alerta.");
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const userRefs = [creadoPor, reconocidoPor, cerradoPor].filter(Boolean) as UsuarioResumen[];

    if (userRefs.length === 0) return;

    let cancelled = false;

    async function hydrateUsers() {
      let userList: FilaListaUsuarioPanel[] = [];
      try {
        const listResponse = await apiFetch("/auth/panel/users/");
        if (listResponse.ok) {
          const listPayload = (await listResponse.json()) as { results?: FilaListaUsuarioPanel[] } | FilaListaUsuarioPanel[];
          userList = Array.isArray(listPayload) ? listPayload : listPayload.results ?? [];
        }
      } catch {
        userList = [];
      }

      const usersById = new Map(userList.map((user) => [user.id, user]));
      const usersByUsername = new Map(
        userList
          .filter((user) => user.username)
          .map((user) => [String(user.username).toLowerCase(), user])
      );

      const idsToFetch = userRefs
        .map((user) => user.id)
        .filter((value, index, array): value is string => {
          if (!value) return false;
          return pareceUuid(value) && !usersById.has(value) && array.indexOf(value) === index;
        });

      const detailResponses = await Promise.all(
        idsToFetch.map(async (userId) => {
          try {
            const response = await apiFetch(`/auth/panel/users/${userId}/`);
            if (!response.ok) return null;
            return (await response.json()) as DetalleUsuarioPanel;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const mapped = new Map(
        detailResponses
          .filter((user): user is DetalleUsuarioPanel => Boolean(user?.id))
          .map((user) => [
            user.id,
            {
              id: user.id,
              username: user.username,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
            } satisfies UsuarioResumen,
          ])
      );

      const resolveUser = (current: UsuarioResumen | null) => {
        if (!current) return current;

        if (current.id && usersById.has(current.id)) {
          const matched = usersById.get(current.id)!;
          return {
            ...current,
            id: matched.id,
            username: matched.username ?? current.username,
            email: matched.email ?? current.email,
          };
        }

        if (current.display_name && usersByUsername.has(current.display_name.toLowerCase())) {
          const matched = usersByUsername.get(current.display_name.toLowerCase())!;
          return {
            ...current,
            id: matched.id,
            username: matched.username ?? current.username,
            email: matched.email ?? current.email,
          };
        }

        if (current.id && mapped.has(current.id)) {
          return { ...current, ...mapped.get(current.id)! };
        }

        return current;
      };

      setCreadoPor((current) => resolveUser(current));
      setReconocidoPor((current) => resolveUser(current));
      setCerradoPor((current) => resolveUser(current));
    }

    void hydrateUsers();

    return () => {
      cancelled = true;
    };
  }, [creadoPor?.id, creadoPor?.display_name, reconocidoPor?.id, reconocidoPor?.display_name, cerradoPor?.id, cerradoPor?.display_name]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadableLocation() {
      const resolvedLat = ubicacionAnalizada?.lat ?? latitud;
      const resolvedLng = ubicacionAnalizada?.lng ?? longitud;

      if (resolvedLat == null || resolvedLng == null) {
        setUbicacionLegible("");
        setResolviendoUbicacion(false);
        return;
      }

      setResolviendoUbicacion(true);
      const resolved = await geocodificarInverso(resolvedLat, resolvedLng);

      if (!cancelled) {
        setUbicacionLegible(resolved || "");
        setResolviendoUbicacion(false);
      }
    }

    void loadReadableLocation();

    return () => {
      cancelled = true;
    };
  }, [ubicacionAnalizada, latitud, longitud]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) {
      setError("Alerta no válida.");
      return;
    }

    setError("");
    setExito("");
    setGuardando(true);

    try {
      const response = await apiFetch(`/alerts/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: idIncidente || null,
          alert_type: tipoAlerta,
          severity: severidad,
          status: estado,
          title: titulo.trim(),
          description: descripcion.trim(),
        }),
      });

      if (!response.ok) {
        let detail = "No se pudo guardar la alerta.";
        try {
          const data = await response.json();
          if (data?.detail) {
            detail = String(data.detail);
          } else if (typeof data === "object" && data !== null) {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
              const value = (data as Record<string, unknown>)[firstKey];
              detail = Array.isArray(value) ? `${firstKey}: ${String(value[0])}` : `${firstKey}: ${String(value)}`;
            }
          }
        } catch {
          // Si la respuesta no es un JSON bueno, usamos el mensaje por defecto
        }
        setError(detail);
        return;
      }

      const alertaActualizada = (await response.json()) as DetalleAlerta;
      setIdIncidente(alertaActualizada.incident ?? "");
      setTipoAlerta(alertaActualizada.alert_type ?? "OTHER");
      setSeveridad(alertaActualizada.severity ?? 3);
      setEstado(alertaActualizada.status ?? "OPEN");
      setTitulo(alertaActualizada.title ?? "");
      setDescripcion(alertaActualizada.description ?? "");
      setLatitud(alertaActualizada.lat ?? null);
      setLongitud(alertaActualizada.lng ?? null);
      setValorUbicacion(obtenerTextoUbicacion(alertaActualizada.location, alertaActualizada.lat ?? null, alertaActualizada.lng ?? null));
      setNotasReconocimiento(alertaActualizada.ack_notes ?? "");
      setNotasCierre(alertaActualizada.close_notes ?? "");
      setCreadoEn(alertaActualizada.created_at ?? null);
      setActualizadoEn(alertaActualizada.updated_at ?? null);
      setReconocidoEn(alertaActualizada.acked_at ?? null);
      setCerradoEn(alertaActualizada.closed_at ?? null);
      setCreadoPor(aResumenUsuario(alertaActualizada.created_by, alertaActualizada.created_by_id, alertaActualizada.created_by_name));
      setReconocidoPor(aResumenUsuario(alertaActualizada.acked_by, alertaActualizada.acked_by_id, alertaActualizada.acked_by_name));
      setCerradoPor(aResumenUsuario(alertaActualizada.closed_by, alertaActualizada.closed_by_id, alertaActualizada.closed_by_name));
      setEdicionDesbloqueada(false);
      setExito("Alerta guardada correctamente.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando alerta...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="cm-shell min-h-screen">
        <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Alertas</p>
              <h1 className="text-2xl font-bold">Detalle de alerta</h1>
              <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                Consulta la información de la alerta y su ubicación antes de habilitar cambios.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navegar("/alerts")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Volver a alertas
            </button>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
            <div className="space-y-4">
              {error ? <div className="cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}
              {exito ? <div className="cm-badge-success rounded-xl p-3 text-sm">{exito}</div> : null}

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Identificacion</p>
                  <h2 className="mt-2 text-xl font-bold">Datos principales</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Titulo</label>
                    <input
                      value={titulo}
                      disabled={!edicionDesbloqueada}
                      onChange={(event) => setTitulo(event.target.value)}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Tipo de alerta</label>
                    <select
                      value={tipoAlerta}
                      disabled={!edicionDesbloqueada}
                      onChange={(event) => setTipoAlerta(event.target.value)}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    >
                      {ALERT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Estado</label>
                    <select
                      value={estado}
                      disabled={!edicionDesbloqueada}
                      onChange={(event) => setEstado(event.target.value)}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Severidad</label>
                    <select
                      value={severidad}
                      disabled={!edicionDesbloqueada}
                      onChange={(event) => setSeveridad(Number(event.target.value))}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    >
                      {SEVERITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Creada por</label>
                    <input
                      value={obtenerEtiquetaUsuario(creadoPor)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Campos de tabla</p>
                  <h2 className="mt-2 text-xl font-bold">Valores de `alerts`</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Abrir incidente</label>
                    <button
                      type="button"
                      disabled={!idIncidente}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(249,115,22,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/40 disabled:cursor-not-allowed disabled:border-[color:var(--cm-border)] disabled:bg-[color:var(--cm-surface-2)] disabled:text-[color:var(--cm-text-muted)] disabled:shadow-none"
                      onClick={() => {
                        setError("");
                        if (!idIncidente) {
                          setError("No hay un incidente relacionado para abrir.");
                          return;
                        }
                        navegar(`/editIncident/${idIncidente}`);
                      }}
                    >
                      <span className="text-base leading-none">↗</span>
                      {idIncidente ? "Abrir incidente relacionado" : "Sin incidente relacionado"}
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Usuario creador</label>
                    <input
                      value={obtenerEtiquetaUsuario(creadoPor)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Dirección</label>
                    <input
                      value={
                        resolviendoUbicacion
                          ? "Buscando dirección..."
                          : ubicacionLegible || valorUbicacion || "No hay ubicación registrada"
                      }
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de creación</label>
                    <input
                      value={formatearFecha(creadoEn)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de actualización</label>
                    <input
                      value={formatearFecha(actualizadoEn)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de reconocimiento</label>
                    <input
                      value={formatearFecha(reconocidoEn)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de cierre</label>
                    <input
                      value={formatearFecha(cerradoEn)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Contenido</p>
                  <h2 className="mt-2 text-xl font-bold">Descripción y seguimiento</h2>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Descripción</label>
                    <textarea
                      value={descripcion}
                      disabled={!edicionDesbloqueada}
                      onChange={(event) => setDescripcion(event.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas de reconocimiento</label>
                    <textarea
                      value={notasReconocimiento}
                      disabled
                      rows={4}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas de cierre</label>
                    <textarea
                      value={notasCierre}
                      disabled
                      rows={4}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicación</p>
                  <h2 className="mt-2 text-xl font-bold">Posición registrada</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Latitud</label>
                    <input
                      value={ubicacionAnalizada?.lat ?? latitud ?? ""}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Longitud</label>
                    <input
                      value={ubicacionAnalizada?.lng ?? longitud ?? ""}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <MapaMiniUnidad
                    latitud={ubicacionAnalizada?.lat ?? latitud}
                    longitud={ubicacionAnalizada?.lng ?? longitud}
                    etiqueta={titulo ? `Ubicación de la alerta: ${titulo}` : "Ubicación de la alerta"}
                  />
                </div>

                <div className="mt-4 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicación legible</p>
                  <p className="mt-1 font-medium">
                    {(ubicacionAnalizada?.lat ?? latitud) == null || (ubicacionAnalizada?.lng ?? longitud) == null
                      ? "No hay coordenadas registradas"
                      : resolviendoUbicacion
                      ? "Buscando dirección..."
                      : ubicacionLegible || "No se pudo resolver una dirección legible"}
                  </p>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Resumen</p>
                <h2 className="mt-2 text-lg font-bold">Lectura rapida</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Tipo</p>
                    <p className="mt-1 font-medium">
                      <span className={`${obtenerBadgeAlerta(tipoAlerta)} rounded-full px-2.5 py-1 text-xs`}>
                        {resumen.etiquetaTipoAlerta}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado</p>
                    <p className="mt-1 font-medium">
                      <span className={`${obtenerBadgeEstado(estado)} rounded-full px-2.5 py-1 text-xs`}>
                        {resumen.etiquetaEstado}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Severidad</p>
                    <p className="mt-1 font-medium">{resumen.etiquetaSeveridad}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Trazabilidad</p>
                <h2 className="mt-2 text-lg font-bold">Fechas y responsables</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Creada</p>
                    <p className="mt-1 font-medium">{formatearFecha(creadoEn)}</p>
                  </div>

                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ultima actualizacion</p>
                    <p className="mt-1 font-medium">{formatearFecha(actualizadoEn)}</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-info)]/40 bg-gradient-to-r from-[color:var(--cm-info)] to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,182,212,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-info)]/50"
              onClick={() => setEdicionDesbloqueada((value) => !value)}
            >
              {edicionDesbloqueada ? "Bloquear edicion" : "Desbloquear edicion"}
            </button>

            <button
              type="submit"
              disabled={!edicionDesbloqueada || guardando}
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
