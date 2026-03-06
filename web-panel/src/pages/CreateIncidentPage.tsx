import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type Organization = {
  id: string;
  name: string;
};

type CreateIncidentPayload = {
  name: string;
  incident_type: IncidentType;
  status: IncidentStatus;
  description?: string;
  location_address?: string;
  latitude?: number;
  longitude?: number;
  owner_organization?: string;
};

type IncidentType =
  | "WILDFIRE"
  | "SEARCH"
  | "RESCUE"
  | "MEDICAL"
  | "NATURAL_DISASTER"
  | "OTHER";

type IncidentStatus = "OPEN" | "TRIAGE" | "CLOSED";

const CREATE_INCIDENT_ENDPOINT = "/incidents/";
const ORGANIZATIONS_ENDPOINT = "/organizations/";

const incidentTypeOptions: Array<{ value: IncidentType; label: string }> = [
  { value: "WILDFIRE", label: "Incendio forestal" },
  { value: "SEARCH", label: "Busqueda de persona" },
  { value: "RESCUE", label: "Rescate" },
  { value: "MEDICAL", label: "Emergencia medica" },
  { value: "NATURAL_DISASTER", label: "Desastre natural" },
  { value: "OTHER", label: "Otro" },
];

const statusOptions: Array<{ value: IncidentStatus; label: string }> = [
  { value: "OPEN", label: "Abierto" },
  { value: "TRIAGE", label: "En evaluacion" },
  { value: "CLOSED", label: "Cerrado" },
];

export default function CreateIncidentPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState("");

  const [name, setName] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType>("WILDFIRE");
  const [status, setStatus] = useState<IncidentStatus>("OPEN");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [ownerOrganization, setOwnerOrganization] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function normalizeOrganizations(raw: unknown): Organization[] {
    const source = Array.isArray(raw)
      ? raw
      : (raw as { results?: unknown[] } | null)?.results ?? [];

    return source
      .map((item) => {
        const row = item as Record<string, unknown>;
        const id = String(row.id ?? row.uuid ?? "");
        const name = String(row.name ?? row.nombre ?? row.title ?? "");
        return { id, name };
      })
      .filter((org) => org.id && org.name);
  }

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const me = (await meRes.json()) as MeResponse;
      if (!me.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        setOrganizationsLoading(true);
        setOrganizationsError("");
        const orgRes = await apiFetch(ORGANIZATIONS_ENDPOINT);
        if (orgRes.ok) {
          const data = (await orgRes.json()) as unknown;
          const list = normalizeOrganizations(data);
          setOrganizations(list);
        } else {
          let detail = `No se pudo cargar el listado de organizaciones (HTTP ${orgRes.status}).`;
          try {
            const data = (await orgRes.json()) as { detail?: string; error?: string };
            if (data?.detail) detail = `${detail} ${data.detail}`;
            else if (data?.error) detail = `${detail} ${data.error}`;
          } catch {
            // keep fallback
          }
          setOrganizationsError(detail);
        }
      } finally {
        setOrganizationsLoading(false);
        setLoading(false);
      }
    })();
  }, [navigate]);

  const hasCoords = useMemo(() => latitude.trim() !== "" || longitude.trim() !== "", [latitude, longitude]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("El nombre del incidente es obligatorio.");
      return;
    }

    if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
      setError("Debes enviar latitud y longitud juntas, o dejar ambas vacias.");
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude) : undefined;
    const parsedLon = longitude.trim() ? Number(longitude) : undefined;

    if (parsedLat !== undefined && Number.isNaN(parsedLat)) {
      setError("La latitud no es valida.");
      return;
    }
    if (parsedLon !== undefined && Number.isNaN(parsedLon)) {
      setError("La longitud no es valida.");
      return;
    }
    if (parsedLat !== undefined && (parsedLat < -90 || parsedLat > 90)) {
      setError("La latitud debe estar entre -90 y 90.");
      return;
    }
    if (parsedLon !== undefined && (parsedLon < -180 || parsedLon > 180)) {
      setError("La longitud debe estar entre -180 y 180.");
      return;
    }

    if(organizations === undefined) {
      setError("No se puede crear un incidente sin cargar el listado de organizaciones. Intenta recargar la pagina.");
      return;
    }
    if (!ownerOrganization) {
      setError("Debes seleccionar una organizacion responsable.");
      return;
    }




    const payload: CreateIncidentPayload = {
      name: name.trim(),
      incident_type: incidentType,
      status,
      description: description.trim() || undefined,
      location_address: locationAddress.trim() || undefined,
      latitude: parsedLat,
      longitude: parsedLon,
      owner_organization: ownerOrganization,
    };


    setSubmitting(true);
    try {
      const res = await apiFetch(CREATE_INCIDENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = "No se pudo crear el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data?.detail === "string") {
            detail = data.detail;
          } else {
            const firstKey = Object.keys(data ?? {})[0];
            if (firstKey) {
              const value = data[firstKey];
              detail = Array.isArray(value)
                ? `${firstKey}: ${String(value[0])}`
                : `${firstKey}: ${String(value)}`;
            }
          }
        } catch {
          // keep fallback
        }
        setError(detail);
        return;
      }

      setSuccess("Incidente creado correctamente.");
      setName("");
      setIncidentType("WILDFIRE");
      setStatus("OPEN");
      setDescription("");
      setLocationAddress("");
      setLatitude("");
      setLongitude("");
      setOwnerOrganization("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
          <p className="text-slate-300">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Operaciones · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Crear nuevo incidente</h1>
            <p className="mt-2 text-slate-300">Completa la informacion operativa para registrar el incidente.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/incidents")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre del incidente</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Forest Fire - Zone A"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de incidente</label>
                <select
                  value={incidentType}
                  onChange={(event) => setIncidentType(event.target.value as IncidentType)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {incidentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Estado inicial</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as IncidentStatus)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Descripcion</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Describe situacion, riesgos y alcance."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Direccion / ubicacion textual</label>
                <input
                  value={locationAddress}
                  onChange={(event) => setLocationAddress(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Oakwood Forest, Zona A"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Latitud</label>
                <input
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="40.4168"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Longitud</label>
                <input
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="-3.7038"
                  inputMode="decimal"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Organizacion responsable</label>
                <select
                  value={ownerOrganization}
                  onChange={(event) => setOwnerOrganization(event.target.value)}
                  disabled={organizationsLoading}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="" className="bg-slate-900">
                    {organizationsLoading ? "Cargando organizaciones..." : "Sin organizacion"}
                  </option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id} className="bg-slate-900">
                      {organization.name}
                    </option>
                  ))}
                </select>
                {organizationsError ? (
                  <p className="mt-1 text-xs text-amber-300">{organizationsError}</p>
                ) : null}
                {!organizationsLoading && !organizationsError && organizations.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">
                    No hay organizaciones disponibles en la base de datos.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
              {hasCoords
                ? "Se enviaran coordenadas geograficas para generar el Point en backend."
                : "Si no informas coordenadas, el incidente se guardara sin Point geografico."}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/incidents")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
              >
                {submitting ? "Creando..." : "Crear incidente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
