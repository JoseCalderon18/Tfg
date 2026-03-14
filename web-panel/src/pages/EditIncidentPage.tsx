import "leaflet/dist/leaflet.css";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type Organization = {
  id: string;
  name: string;
};

type IncidentType =
  | "WILDFIRE"
  | "SEARCH"
  | "RESCUE"
  | "MEDICAL"
  | "NATURAL_DISASTER"
  | "OTHER";

type IncidentStatus = "OPEN" | "TRIAGE" | "CLOSED";

type IncidentDetailResponse = {
  id: string;
  name?: string | null;
  incident_type?: IncidentType | null;
  status?: IncidentStatus | null;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  owner_organization?: string | { id?: string; name?: string } | null;
};

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
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  return null;
}

function normalizeOrganizations(raw: unknown): Organization[] {
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

function EditableMapPicker({
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [name, setName] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType>("WILDFIRE");
  const [status, setStatus] = useState<IncidentStatus>("OPEN");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [ownerOrganization, setOwnerOrganization] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapEditable, setMapEditable] = useState(false);

  const coords = useMemo<LatLngTuple | null>(() => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lon) && latitude.trim() && longitude.trim()) {
      return [lat, lon];
    }
    return null;
  }, [latitude, longitude]);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Incidente no valido.");
        setLoading(false);
        return;
      }

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

      const [incidentRes, orgRes] = await Promise.all([apiFetch(`/incidents/${id}/`), apiFetch("/organizations/")]);

      if (!incidentRes.ok) {
        setError("No se pudo cargar el incidente.");
        setLoading(false);
        return;
      }

      const incident = (await incidentRes.json()) as IncidentDetailResponse;
      const list = orgRes.ok ? normalizeOrganizations((await orgRes.json()) as unknown) : [];
      setOrganizations(list);

      setName(String(incident.name ?? ""));

      const initialType = incidentTypeOptions.find((opt) => opt.value === incident.incident_type)?.value ?? "WILDFIRE";
      setIncidentType(initialType);

      const initialStatus = statusOptions.find((opt) => opt.value === incident.status)?.value ?? "OPEN";
      setStatus(initialStatus);

      setDescription(String(incident.description ?? ""));
      setLocationAddress(String(incident.location_address ?? ""));

      const parsed = parsePointLocation(incident.location);
      setLatitude(parsed ? String(parsed[0]) : "");
      setLongitude(parsed ? String(parsed[1]) : "");

      const ownerRaw = incident.owner_organization;
      if (ownerRaw && typeof ownerRaw === "object" && ownerRaw.id) {
        setOwnerOrganization(ownerRaw.id);
      } else if (typeof ownerRaw === "string" && list.length > 0) {
        const match = list.find((org) => org.name.toLowerCase() === ownerRaw.toLowerCase());
        setOwnerOrganization(match?.id ?? "");
      }

      setLoading(false);
    })();
  }, [id, navigate]);

  function handleMapPick(value: LatLngTuple) {
    setLatitude(value[0].toFixed(6));
    setLongitude(value[1].toFixed(6));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id) return;

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("El nombre del incidente es obligatorio.");
      return;
    }

    if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
      setError("Debes informar latitud y longitud juntas.");
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude) : undefined;
    const parsedLon = longitude.trim() ? Number(longitude) : undefined;
    if (parsedLat !== undefined && Number.isNaN(parsedLat)) {
      setError("Latitud no valida.");
      return;
    }
    if (parsedLon !== undefined && Number.isNaN(parsedLon)) {
      setError("Longitud no valida.");
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

    const payload: Record<string, unknown> = {
      name: name.trim(),
      incident_type: incidentType,
      status: status,
      description: description.trim() || null,
      location_address: locationAddress.trim() || null,
      owner_organization: ownerOrganization || null,
    };

    if (parsedLat !== undefined && parsedLon !== undefined) {
      payload.location = `SRID=4326;POINT (${parsedLon} ${parsedLat})`;
    } else {
      payload.location = null;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/incidents/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          // keep fallback
        }
        setError(detail);
        return;
      }

      setSuccess("Incidente actualizado correctamente.");
      setMapEditable(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Operaciones · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Editar incidente</h1>
            <p className="mt-2 text-slate-300">Actualiza los datos del incidente y su localizacion.</p>
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
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-8">
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de incidente</label>
        <select
          value={incidentType}
          onChange={(event) => {
            setIncidentType(event.target.value as IncidentType);
          }}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        >
          {incidentTypeOptions.map((opt) => (
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
              checked={status === "OPEN"}
              onChange={(event) => {
                if (event.target.checked) {
                  setStatus("OPEN");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            Abierto
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={status === "CLOSED"}
              onChange={(event) => {
                if (event.target.checked) {
                  setStatus("CLOSED");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            Cerrado
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={status === "TRIAGE"}
              onChange={(event) => {
                if (event.target.checked) {
                  setStatus("TRIAGE");
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
          value={description}
          onChange={(event) => setDescription(event.target.value)}
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
          value={locationAddress}
          onChange={(event) => setLocationAddress(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Latitud</label>
        <input
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          inputMode="decimal"
          placeholder="40.4168"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Longitud</label>
        <input
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          inputMode="decimal"
          placeholder="-3.7038"
        />
      </div>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
      <div className="h-72 overflow-hidden rounded-xl ring-1 ring-slate-800">
        <MapContainer
          center={coords ?? [40.4168, -3.7038]}
          zoom={coords ? 13 : 6}
          scrollWheelZoom={mapEditable}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <EditableMapPicker coords={coords} editable={mapEditable} onPick={handleMapPick} />
        </MapContainer>
      </div>

      <div className="flex flex-col justify-between rounded-xl bg-slate-950/40 p-4 ring-1 ring-slate-800">
        <div className="space-y-2 text-sm text-slate-300">
          <p className="font-medium text-slate-100">Ubicación del incidente</p>
          <p>
            {coords
              ? `Latitud ${coords[0].toFixed(6)} · Longitud ${coords[1].toFixed(6)}`
              : "Sin coordenadas actuales."}
          </p>
          <p className="text-xs text-slate-400">
            {mapEditable
              ? "Mapa desbloqueado: haz clic en una zona para fijar la ubicación."
              : "Mapa bloqueado: pulsa el botón para habilitar la selección por mapa."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMapEditable((prev) => !prev)}
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
        value={ownerOrganization}
        onChange={(event) => setOwnerOrganization(event.target.value)}
        className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
      >
        <option value="" className="bg-slate-900">
          Sin organización
        </option>
        {organizations.map((organization) => (
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
      onClick={() => navigate("/incidents")}
      className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
    >
      Cancelar
    </button>

    <button
      type="submit"
      disabled={saving}
      className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
    >
      {saving ? "Guardando..." : "Guardar cambios"}
    </button>
  </div>
</form>
        </div>
      </div>
    </div>
  );
}
