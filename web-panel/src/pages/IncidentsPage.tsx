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

  const [resolvedLocation, setResolvedLocation] = useState<string>("");
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [deletingIncidentId, setDeletingIncidentId] = useState<string>("");

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
      setLoading(false);
    })();
  }, [navigate]);

  const filteredIncidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return incidents;

    return incidents.filter((incident) =>
      `${incident.name} ${incident.incident_type} ${incident.status} ${incident.location_address ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, incidents]);

  const selectedIncident =
    filteredIncidents.find((incident) => incident.id === selectedIncidentId) ??
    filteredIncidents[0] ??
    null;

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

  async function handleDeleteIncident(incidentId: string) {
    if (deletingIncidentId) return;

    const confirmed = window.confirm("¿Seguro que quieres borrar este incidente? Esta acción no se puede deshacer.");
    if (!confirmed) return;

    setError("");
    setDeletingIncidentId(incidentId);
    try {
      const res = await apiFetch(`/incidents/${incidentId}/`, { method: "DELETE" });
      if (!res.ok) {
        let detail = "No se pudo borrar el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") detail = data.detail;
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
    } finally {
      setDeletingIncidentId("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100">
        <p className="text-slate-300">Cargando incidentes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Operaciones</p>
            <h1 className="text-2xl font-bold">Incidentes</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/createincident")}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Nuevo incidente
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, tipo, estado o ubicacion..."
            className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="overflow-x-auto rounded-2xl bg-slate-900/60 ring-1 ring-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/90 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Organizacion</th>
                  <th className="px-4 py-3 text-left">Inicio</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No hay incidentes para mostrar.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      className={`cursor-pointer border-t border-slate-800/80 hover:bg-slate-800/40 ${
                        selectedIncident?.id === incident.id ? "bg-slate-800/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">{incident.name}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {incident.incident_type === "SEARCH" ? "Búsqueda de personas"
                          : incident.incident_type === "MEDICAL" ? "Emergencia médica"
                          : incident.incident_type === "WILDFIRE" ? "Incendio forestal"
                          : incident.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                          : incident.incident_type === "NATURAL_DISASTER" ? "Desastre natural"
                          : "Otro"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                            incident.status === "CLOSED"
                              ? "bg-slate-500/15 text-slate-300 ring-slate-500/30"
                              : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                          }`}
                        >
                          {incident.status === "OPEN"
                        ? "Abierto"
                        : incident.status === "CLOSED"
                        ? "Cerrado"
                        : "En evaluacion"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {incident.owner_organization || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(incident.started_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/editIncident/${incident.id}`);
                            }}
                            className="rounded-xl bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-500"
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
                            className="rounded-xl bg-rose-700 px-3 py-1 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
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
          </section>

          <aside className="space-y-4 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
            {selectedIncident ? (
              <>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{selectedIncident.name}</h2>
                </div>

                <IncidentMiniMap incident={selectedIncident} />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    <p className="text-slate-100">{selectedIncident.incident_type === "SEARCH" ? "Búsqueda de personas"
                    : selectedIncident.incident_type === "MEDICAL" ? "Emergencia médica" 
                    : selectedIncident.incident_type === "WILDFIRE" ? "Incendio forestal"
                    : selectedIncident.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                    : selectedIncident.incident_type === "NATURAL_DISASTER" ? "Desastre natural" 
                    : "Otro"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Estado</p>
                    <p className="text-slate-100">
                      {selectedIncident.status === "OPEN"
                        ? "Abierto"
                        : selectedIncident.status === "CLOSED"
                        ? "Cerrado"
                        : "En evaluacion"}
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
              </>
            ) : (
              <p className="text-sm text-slate-400">No hay incidentes para mostrar.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
