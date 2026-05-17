import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type Incident = {
  id: string;
  name?: string | null;
  status?: string | null;
};

type AlertType =
  | "SOS"
  | "MAN_DOWN"
  | "LOST"
  | "GEOFENCE"
  | "BATERY"
  | "MOVEMENT"
  | "OTHER";

const ALERT_TYPES: Array<{ value: AlertType; label: string }> = [
  { value: "SOS", label: "SOS emergencia" },
  { value: "MAN_DOWN", label: "Hombre caido" },
  { value: "LOST", label: "Operativo perdido" },
  { value: "GEOFENCE", label: "Fuera de zona segura" },
  { value: "BATERY", label: "Bateria baja" },
  { value: "MOVEMENT", label: "Inmovilidad" },
  { value: "OTHER", label: "Otra alerta" },
];

function normalizeList<T>(payload: T[] | { results?: T[] }) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export default function CreateAlertPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [incidentId, setIncidentId] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("SOS");
  const [severity, setSeverity] = useState("3");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await apiFetch("/incidents/?status=OPEN");
        if (response.ok) {
          const payload = (await response.json()) as Incident[] | { results?: Incident[] };
          setIncidents(normalizeList(payload));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === incidentId) ?? null,
    [incidentId, incidents]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const parsedSeverity = Number(severity);
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!Number.isFinite(parsedSeverity) || parsedSeverity < 1 || parsedSeverity > 5) {
      setError("La severidad debe estar entre 1 y 5.");
      return;
    }

    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setError("La latitud no es valida.");
      return;
    }

    if (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setError("La longitud no es valida.");
      return;
    }

    setSending(true);
    try {
      const response = await apiFetch("/alerts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: incidentId || null,
          alert_type: alertType,
          severity: parsedSeverity,
          title: title.trim() || `Alerta ${alertType}`,
          description: description.trim(),
          lat: parsedLat,
          lng: parsedLng,
        }),
      });

      if (!response.ok) {
        let detail = "No se pudo crear la alerta.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          const firstKey = Object.keys(data)[0];
          if (typeof data.detail === "string") detail = data.detail;
          else if (firstKey) detail = `${firstKey}: ${String(data[firstKey])}`;
        } catch {
          // keep fallback
        }
        setError(detail);
        return;
      }

      setSuccess("Alerta creada correctamente.");
      setTitle("");
      setDescription("");
      setLat("");
      setLng("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Alertas</p>
            <h1 className="mt-1 text-2xl font-bold">Crear alerta operativa</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Registra una alerta manual y vincularla a un incidente abierto cuando corresponda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/alerts")}
            className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold hover:bg-[color:var(--cm-surface-2)]"
          >
            Volver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5">
          {error ? <div className="cm-badge-danger mb-4 rounded-xl p-3 text-sm">{error}</div> : null}
          {success ? <div className="cm-badge-success mb-4 rounded-xl p-3 text-sm">{success}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Incidente</span>
              <select
                value={incidentId}
                onChange={(event) => setIncidentId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
              >
                <option value="">{loading ? "Cargando incidentes..." : "Sin incidente asociado"}</option>
                {incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.name || incident.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Tipo</span>
              <select
                value={alertType}
                onChange={(event) => setAlertType(event.target.value as AlertType)}
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
              >
                {ALERT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Titulo</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
                placeholder={selectedIncident ? `Alerta en ${selectedIncident.name}` : "Titulo de la alerta"}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Severidad</span>
              <input
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                type="number"
                min={1}
                max={5}
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Latitud</span>
              <input
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
                placeholder="40.4168"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Longitud</span>
              <input
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                inputMode="decimal"
                required
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
                placeholder="-3.7038"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-[color:var(--cm-text-muted)]">Descripcion</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="mt-1 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2.5 outline-none focus:border-[color:var(--cm-info)]"
                placeholder="Describe la situacion, riesgos y contexto operativo."
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/alerts")}
              className="rounded-xl border border-[color:var(--cm-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[color:var(--cm-surface-2)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {sending ? "Creando..." : "Crear alerta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
