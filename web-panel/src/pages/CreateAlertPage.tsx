import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type TipoAlerta = "SOS" | "MAN_DOWN" | "LOST" | "GEOFENCE" | "ANOMALY" | "OTHER";

type IncidenteOpcion = {
  id: string;
  name: string;
  status?: string | null;
};

type AlertaCreada = {
  id?: string;
};

const ALERT_TYPE_OPTIONS: Array<{ value: TipoAlerta; label: string; description: string }> = [
  { value: "SOS", label: "SOS", description: "Emergencia inmediata o peticion directa de ayuda." },
  { value: "MAN_DOWN", label: "Hombre caído", description: "Posible baja, inmovilidad o pérdida de respuesta." },
  { value: "LOST", label: "Pérdida", description: "Operativo desorientado o fuera de referencia." },
  { value: "GEOFENCE", label: "Geofence", description: "Salida o entrada en zona delimitada." },
  { value: "ANOMALY", label: "Anomalía", description: "Lectura irregular o comportamiento no esperado." },
  { value: "OTHER", label: "Otro", description: "Aviso operativo que no encaja en otra categoria." },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: "Crítica", help: "Riesgo alto e intervencion inmediata." },
  { value: 2, label: "Alta", help: "Prioridad elevada con seguimiento urgente." },
  { value: 3, label: "Media", help: "Requiere supervision operativa." },
  { value: 4, label: "Baja", help: "Incidencia menor o preventiva." },
  { value: 5, label: "Informativa", help: "Registro para contexto y trazabilidad." },
];

function normalizarIncidentes(raw: unknown): IncidenteOpcion[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.uuid ?? "");
      const name = String(row.name ?? row.title ?? row.incident_name ?? "");
      const status = typeof row.status === "string" ? row.status : null;
      return { id, name: name || id, status };
    })
    .filter((incident) => incident.id);
}

function extraerError(data: Record<string, unknown>, fallback: string) {
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;

  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;

  const value = data[firstKey];
  if (Array.isArray(value)) return `${firstKey}: ${String(value[0])}`;
  return `${firstKey}: ${String(value)}`;
}

function parseCoordinate(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function CreateAlertPage() {
  const navegar = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [incidentes, setIncidentes] = useState<IncidenteOpcion[]>([]);
  const [errorIncidentes, setErrorIncidentes] = useState("");

  const [incidentId, setIncidentId] = useState("");
  const [alertType, setAlertType] = useState<TipoAlerta>("SOS");
  const [severity, setSeverity] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navegar("/login", { replace: true });
        return;
      }

      const me = (await meRes.json()) as RespuestaUsuario;
      if (!me.authenticated || !me.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      try {
        const incidentsRes = await apiFetch("/incidents/");
        if (!incidentsRes.ok) {
          setErrorIncidentes("No se pudo cargar el listado de incidentes. La alerta se puede crear sin incidente asociado.");
          return;
        }

        const data = (await incidentsRes.json()) as unknown;
        setIncidentes(normalizarIncidentes(data));
        setErrorIncidentes("");
      } finally {
        setCargando(false);
      }
    })();
  }, [navegar]);

  const selectedType = useMemo(
    () => ALERT_TYPE_OPTIONS.find((option) => option.value === alertType) ?? ALERT_TYPE_OPTIONS[0],
    [alertType]
  );

  const selectedSeverity = useMemo(
    () => SEVERITY_OPTIONS.find((option) => option.value === severity) ?? SEVERITY_OPTIONS[1],
    [severity]
  );

  async function manejarEnvio(event: FormEvent) {
    event.preventDefault();
    setErrorMensaje("");

    if (!title.trim()) {
      setErrorMensaje("El titulo de la alerta es obligatorio.");
      return;
    }

    if (!description.trim()) {
      setErrorMensaje("La descripción es obligatoria para que el equipo tenga contexto.");
      return;
    }

    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (parsedLatitude === null || parsedLongitude === null) {
      setErrorMensaje("Debes informar latitud y longitud para ubicar la alerta.");
      return;
    }

    if (Number.isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
      setErrorMensaje("La latitud debe ser un numero entre -90 y 90.");
      return;
    }

    if (Number.isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
      setErrorMensaje("La longitud debe ser un numero entre -180 y 180.");
      return;
    }

    setEnviando(true);
    try {
      const response = await apiFetch("/alerts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: incidentId || null,
          alert_type: alertType,
          severity,
          title: title.trim(),
          description: description.trim(),
          latitude: parsedLatitude,
          longitude: parsedLongitude,
        }),
      });

      if (!response.ok) {
        let detail = "No se pudo crear la alerta.";
        try {
          detail = extraerError((await response.json()) as Record<string, unknown>, detail);
        } catch {
          // keep fallback
        }
        setErrorMensaje(detail);
        return;
      }

      let created: AlertaCreada = {};
      try {
        created = (await response.json()) as AlertaCreada;
      } catch {
        // Some endpoints may return an empty body.
      }

      navegar(created.id ? `/editAlert/${created.id}` : "/alerts", { replace: true });
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Alertas</p>
            <h1 className="mt-1 text-2xl font-bold">Crear alerta operativa</h1>
            <p className="mt-1 max-w-2xl text-sm text-[color:var(--cm-text-muted)]">
              Registra un aviso con severidad, contexto e ubicación para que quede trazado en el centro de alertas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navegar("/alerts")}
            className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-info)]/20"
          >
            Volver a alertas
          </button>
        </div>

        {errorMensaje ? <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">{errorMensaje}</div> : null}

        <form onSubmit={manejarEnvio} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Titulo</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Equipo sin respuesta en sector norte"
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                  maxLength={160}
                  required
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Tipo</span>
                <select
                  value={alertType}
                  onChange={(event) => setAlertType(event.target.value as TipoAlerta)}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                >
                  {ALERT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Severidad</span>
                <select
                  value={severity}
                  onChange={(event) => setSeverity(Number(event.target.value))}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} - {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Incidente asociado</span>
                <select
                  value={incidentId}
                  onChange={(event) => setIncidentId(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                >
                  <option value="">Sin incidente asociado</option>
                  {incidentes.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.name}{incident.status ? ` (${incident.status})` : ""}
                    </option>
                  ))}
                </select>
                {errorIncidentes ? <span className="mt-1 block text-xs text-[color:var(--cm-warning)]">{errorIncidentes}</span> : null}
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Latitud</span>
                <input
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="40.4168"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                  required
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Longitud</span>
                <input
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="-3.7038"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                  required
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-[color:var(--cm-text)]">Descripción</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe que ocurre, a quien afecta y que acción se espera."
                  rows={5}
                  className="w-full resize-y rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                  required
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navegar("/alerts")}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-info)]/20"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="rounded-xl bg-[color:var(--cm-danger)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Creando..." : "Crear alerta"}
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Tipo seleccionado</p>
              <p className="mt-2 text-lg font-bold">{selectedType.label}</p>
              <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{selectedType.description}</p>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Prioridad</p>
              <p className="mt-2 text-lg font-bold">
                {selectedSeverity.value} - {selectedSeverity.label}
              </p>
              <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{selectedSeverity.help}</p>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Trazabilidad</p>
              <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
                Al crearla se guarda como alerta abierta y se redirige al detalle para revisar estado, responsable y ubicación.
              </p>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
