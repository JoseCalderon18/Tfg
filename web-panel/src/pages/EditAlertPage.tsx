import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MapaMiniUnidad from "../components/MapaMiniUnidad";
import { apiFetch } from "../utils/api";

type UsuarioResumen = {
  id?: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
};

type PanelUserDetail = UsuarioResumen & {
  id: string;
};

type PanelUserListRow = {
  id: string;
  username?: string;
  email?: string;
};

type AlertDetail = {
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
  { value: "MAN_DOWN", label: "Hombre caido" },
  { value: "LOST", label: "Perdida / desorientado" },
  { value: "GEOFENCE", label: "Geofence" },
  { value: "ANOMALY", label: "Anomalia" },
  { value: "OTHER", label: "Otro" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Abierta" },
  { value: "ACK", label: "Reconocida" },
  { value: "CLOSED", label: "Cerrada" },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: "Critica" },
  { value: 2, label: "Alta" },
  { value: 3, label: "Media" },
  { value: 4, label: "Baja" },
  { value: 5, label: "Informativa" },
];

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
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

function formatDate(value?: string | null) {
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

function getUserLabel(user?: UsuarioResumen | null) {
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

function looksLikeUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toUserSummary(
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
      id: rawId ?? (typeof rawUser === "string" && looksLikeUuid(rawUser) ? rawUser : undefined),
      display_name: rawName ?? (typeof rawUser === "string" && !looksLikeUuid(rawUser) ? rawUser : undefined),
    };
  }

  return null;
}

function getStatusBadge(status?: string | null) {
  if (status === "OPEN") return "cm-badge-danger";
  if (status === "ACK") return "cm-badge-alert";
  if (status === "CLOSED") return "cm-badge-success";
  return "cm-badge-warning";
}

function getAlertBadge(type?: string | null) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN") return "cm-badge-alert";
  if (type === "GEOFENCE") return "cm-badge-warning";
  if (type === "OTHER") return "cm-badge-special";
  return "cm-badge-info";
}

function parseLocation(location: unknown): { lat: number; lng: number } | null {
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

function getLocationText(location: unknown, lat: number | null, lng: number | null) {
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUnlocked, setEditingUnlocked] = useState(false);

  const [incidentId, setIncidentId] = useState("");
  const [alertType, setAlertType] = useState("OTHER");
  const [severity, setSeverity] = useState(3);
  const [status, setStatus] = useState("OPEN");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationValue, setLocationValue] = useState("");
  const [readableLocation, setReadableLocation] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [ackNotes, setAckNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [ackedAt, setAckedAt] = useState<string | null>(null);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<UsuarioResumen | null>(null);
  const [ackedBy, setAckedBy] = useState<UsuarioResumen | null>(null);
  const [closedBy, setClosedBy] = useState<UsuarioResumen | null>(null);

  const parsedLocation = useMemo(() => parseLocation(locationValue), [locationValue]);

  const summary = useMemo(
    () => ({
      alertTypeLabel:
        ALERT_TYPE_OPTIONS.find((option) => option.value === alertType)?.label ?? "Sin tipo",
      severityLabel: SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? "Sin severidad",
      statusLabel: STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Sin estado",
    }),
    [alertType, severity, status]
  );

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Alerta no valida.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch(`/alerts/${id}/`);
        if (!response.ok) {
          setError("No se pudo cargar la alerta.");
          setLoading(false);
          return;
        }

        const alert = (await response.json()) as AlertDetail;
        setIncidentId(alert.incident ?? "");
        setAlertType(alert.alert_type ?? "OTHER");
        setSeverity(alert.severity ?? 3);
        setStatus(alert.status ?? "OPEN");
        setTitle(alert.title ?? "");
        setDescription(alert.description ?? "");
        setLat(alert.lat ?? null);
        setLng(alert.lng ?? null);
        setLocationValue(getLocationText(alert.location, alert.lat ?? null, alert.lng ?? null));
        setAckNotes(alert.ack_notes ?? "");
        setCloseNotes(alert.close_notes ?? "");
        setCreatedAt(alert.created_at ?? null);
        setUpdatedAt(alert.updated_at ?? null);
        setAckedAt(alert.acked_at ?? null);
        setClosedAt(alert.closed_at ?? null);
        setCreatedBy(toUserSummary(alert.created_by, alert.created_by_id, alert.created_by_name));
        setAckedBy(toUserSummary(alert.acked_by, alert.acked_by_id, alert.acked_by_name));
        setClosedBy(toUserSummary(alert.closed_by, alert.closed_by_id, alert.closed_by_name));
      } catch {
        setError("Error de red al cargar la alerta.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const userRefs = [createdBy, ackedBy, closedBy].filter(Boolean) as UsuarioResumen[];

    if (userRefs.length === 0) return;

    let cancelled = false;

    async function hydrateUsers() {
      let userList: PanelUserListRow[] = [];
      try {
        const listResponse = await apiFetch("/auth/panel/users/");
        if (listResponse.ok) {
          const listPayload = (await listResponse.json()) as { results?: PanelUserListRow[] } | PanelUserListRow[];
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
          return looksLikeUuid(value) && !usersById.has(value) && array.indexOf(value) === index;
        });

      const detailResponses = await Promise.all(
        idsToFetch.map(async (userId) => {
          try {
            const response = await apiFetch(`/auth/panel/users/${userId}/`);
            if (!response.ok) return null;
            return (await response.json()) as PanelUserDetail;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const mapped = new Map(
        detailResponses
          .filter((user): user is PanelUserDetail => Boolean(user?.id))
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

      setCreatedBy((current) => resolveUser(current));
      setAckedBy((current) => resolveUser(current));
      setClosedBy((current) => resolveUser(current));
    }

    void hydrateUsers();

    return () => {
      cancelled = true;
    };
  }, [createdBy?.id, createdBy?.display_name, ackedBy?.id, ackedBy?.display_name, closedBy?.id, closedBy?.display_name]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadableLocation() {
      const resolvedLat = parsedLocation?.lat ?? lat;
      const resolvedLng = parsedLocation?.lng ?? lng;

      if (resolvedLat == null || resolvedLng == null) {
        setReadableLocation("");
        setResolvingLocation(false);
        return;
      }

      setResolvingLocation(true);
      const resolved = await reverseGeocode(resolvedLat, resolvedLng);

      if (!cancelled) {
        setReadableLocation(resolved || "");
        setResolvingLocation(false);
      }
    }

    void loadReadableLocation();

    return () => {
      cancelled = true;
    };
  }, [parsedLocation, lat, lng]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) {
      setError("Alerta no valida.");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await apiFetch(`/alerts/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: incidentId || null,
          alert_type: alertType,
          severity,
          status,
          title: title.trim(),
          description: description.trim(),
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
          // Mostramos el mensaje por defecto si la respuesta no trae JSON valido.
        }
        setError(detail);
        return;
      }

      const updatedAlert = (await response.json()) as AlertDetail;
      setIncidentId(updatedAlert.incident ?? "");
      setAlertType(updatedAlert.alert_type ?? "OTHER");
      setSeverity(updatedAlert.severity ?? 3);
      setStatus(updatedAlert.status ?? "OPEN");
      setTitle(updatedAlert.title ?? "");
      setDescription(updatedAlert.description ?? "");
      setLat(updatedAlert.lat ?? null);
      setLng(updatedAlert.lng ?? null);
      setLocationValue(getLocationText(updatedAlert.location, updatedAlert.lat ?? null, updatedAlert.lng ?? null));
      setAckNotes(updatedAlert.ack_notes ?? "");
      setCloseNotes(updatedAlert.close_notes ?? "");
      setCreatedAt(updatedAlert.created_at ?? null);
      setUpdatedAt(updatedAlert.updated_at ?? null);
      setAckedAt(updatedAlert.acked_at ?? null);
      setClosedAt(updatedAlert.closed_at ?? null);
      setCreatedBy(toUserSummary(updatedAlert.created_by, updatedAlert.created_by_id, updatedAlert.created_by_name));
      setAckedBy(toUserSummary(updatedAlert.acked_by, updatedAlert.acked_by_id, updatedAlert.acked_by_name));
      setClosedBy(toUserSummary(updatedAlert.closed_by, updatedAlert.closed_by_id, updatedAlert.closed_by_name));
      setEditingUnlocked(false);
      setSuccess("Alerta guardada correctamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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
                Consulta la informacion de la alerta y su ubicacion antes de habilitar cambios.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/alerts")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Volver a alertas
            </button>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
            <div className="space-y-4">
              {error ? <div className="cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}
              {success ? <div className="cm-badge-success rounded-xl p-3 text-sm">{success}</div> : null}

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Identificacion</p>
                  <h2 className="mt-2 text-xl font-bold">Datos principales</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Titulo</label>
                    <input
                      value={title}
                      disabled={!editingUnlocked}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Tipo de alerta</label>
                    <select
                      value={alertType}
                      disabled={!editingUnlocked}
                      onChange={(event) => setAlertType(event.target.value)}
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
                      value={status}
                      disabled={!editingUnlocked}
                      onChange={(event) => setStatus(event.target.value)}
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
                      value={severity}
                      disabled={!editingUnlocked}
                      onChange={(event) => setSeverity(Number(event.target.value))}
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
                      value={getUserLabel(createdBy)}
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
                      disabled={!incidentId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(249,115,22,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/40 disabled:cursor-not-allowed disabled:border-[color:var(--cm-border)] disabled:bg-[color:var(--cm-surface-2)] disabled:text-[color:var(--cm-text-muted)] disabled:shadow-none"
                      onClick={() => {
                        setError("");
                        if (!incidentId) {
                          setError("No hay un incidente relacionado para abrir.");
                          return;
                        }
                        navigate(`/editIncident/${incidentId}`);
                      }}
                    >
                      <span className="text-base leading-none">↗</span>
                      {incidentId ? "Abrir incidente relacionado" : "Sin incidente relacionado"}
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Usuario creador</label>
                    <input
                      value={getUserLabel(createdBy)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Dirección</label>
                    <input
                      value={
                        resolvingLocation
                          ? "Buscando direccion..."
                          : readableLocation || locationValue || "No hay ubicacion registrada"
                      }
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de creación</label>
                    <input
                      value={formatDate(createdAt)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de actualización</label>
                    <input
                      value={formatDate(updatedAt)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de reconocimiento</label>
                    <input
                      value={formatDate(ackedAt)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de cierre</label>
                    <input
                      value={formatDate(closedAt)}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Contenido</p>
                  <h2 className="mt-2 text-xl font-bold">Descripcion y seguimiento</h2>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Descripcion</label>
                    <textarea
                      value={description}
                      disabled={!editingUnlocked}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas de reconocimiento</label>
                    <textarea
                      value={ackNotes}
                      disabled
                      rows={4}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas de cierre</label>
                    <textarea
                      value={closeNotes}
                      disabled
                      rows={4}
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicacion</p>
                  <h2 className="mt-2 text-xl font-bold">Posicion registrada</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Latitud</label>
                    <input
                      value={parsedLocation?.lat ?? lat ?? ""}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Longitud</label>
                    <input
                      value={parsedLocation?.lng ?? lng ?? ""}
                      disabled
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <MapaMiniUnidad
                    latitud={parsedLocation?.lat ?? lat}
                    longitud={parsedLocation?.lng ?? lng}
                    etiqueta={title ? `Ubicacion de la alerta: ${title}` : "Ubicacion de la alerta"}
                  />
                </div>

                <div className="mt-4 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicacion legible</p>
                  <p className="mt-1 font-medium">
                    {(parsedLocation?.lat ?? lat) == null || (parsedLocation?.lng ?? lng) == null
                      ? "No hay coordenadas registradas"
                      : resolvingLocation
                      ? "Buscando direccion..."
                      : readableLocation || "No se pudo resolver una direccion legible"}
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
                      <span className={`${getAlertBadge(alertType)} rounded-full px-2.5 py-1 text-xs`}>
                        {summary.alertTypeLabel}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado</p>
                    <p className="mt-1 font-medium">
                      <span className={`${getStatusBadge(status)} rounded-full px-2.5 py-1 text-xs`}>
                        {summary.statusLabel}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Severidad</p>
                    <p className="mt-1 font-medium">{summary.severityLabel}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Trazabilidad</p>
                <h2 className="mt-2 text-lg font-bold">Fechas y responsables</h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Creada</p>
                    <p className="mt-1 font-medium">{formatDate(createdAt)}</p>
                  </div>

                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ultima actualizacion</p>
                    <p className="mt-1 font-medium">{formatDate(updatedAt)}</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-info)]/40 bg-gradient-to-r from-[color:var(--cm-info)] to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,182,212,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-info)]/50"
              onClick={() => setEditingUnlocked((value) => !value)}
            >
              {editingUnlocked ? "Bloquear edicion" : "Desbloquear edicion"}
            </button>

            <button
              type="submit"
              disabled={!editingUnlocked || saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
