import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type WorkAreaApiRow = {
  id: number;
  name?: string | null;
  area_type?: string | null;
  center?: unknown;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_m?: number | null;
  polygon?: unknown;
  polygon_coordinates?: unknown;
  active?: boolean | null;
  created_at?: string | null;
  incident?: string | null;
  incident_name?: string | null;
};

type WorkAreaRow = {
  id: number;
  name: string;
  areaType: "CIRCLE" | "POLYGON";
  center: LatLngTuple | null;
  radiusM: number | null;
  polygon: LatLngTuple[] | null;
  active: boolean;
  createdAt: string | null;
  incidentId: string | null;
  incidentName: string | null;
};

function isValidLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parsePoint(value: unknown): LatLngTuple | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const lng = Number(candidate.coordinates[0]);
      const lat = Number(candidate.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const lng = Number(candidate.x);
      const lat = Number(candidate.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
    }
  }

  if (typeof value === "string") {
    const match = value.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
    }
  }

  return null;
}

function parsePolygon(value: unknown): LatLngTuple[] | null {
  if (!value) return null;

  const extractRing = (ring: unknown[]): LatLngTuple[] =>
    ring
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) return null;
        const lng = Number(point[0]);
        const lat = Number(point[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng) || !isValidLatLng(lat, lng)) return null;
        return [lat, lng] as LatLngTuple;
      })
      .filter((point): point is LatLngTuple => Boolean(point));

  if (Array.isArray(value) && value.length > 0) {
    if (Array.isArray(value[0]) && Array.isArray((value[0] as unknown[])[0])) {
      const ring = extractRing(value[0] as unknown[]);
      return ring.length >= 3 ? ring : null;
    }

    const ring = extractRing(value as unknown[]);
    return ring.length >= 3 ? ring : null;
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown };
    if (Array.isArray(candidate.coordinates)) {
      return parsePolygon(candidate.coordinates);
    }
  }

  if (typeof value === "string") {
    const match = value.match(/POLYGON\s*\(\((.+)\)\)/i);
    if (!match) return null;

    const ring = match[1]
      .split(",")
      .map((pair) => pair.trim().split(/\s+/))
      .map((parts) => {
        if (parts.length < 2) return null;
        const lng = Number(parts[0]);
        const lat = Number(parts[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng) || !isValidLatLng(lat, lng)) return null;
        return [lat, lng] as LatLngTuple;
      })
      .filter((point): point is LatLngTuple => Boolean(point));

    return ring.length >= 3 ? ring : null;
  }

  return null;
}

function normalizeWorkAreas(raw: unknown): WorkAreaRow[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as WorkAreaApiRow)
    .filter((row) => typeof row?.id === "number")
    .map((row) => {
      const centerFromPayload =
        row.center_lat != null && row.center_lng != null ? ([row.center_lat, row.center_lng] as LatLngTuple) : parsePoint(row.center);
      const polygon = parsePolygon(row.polygon_coordinates ?? row.polygon);

      return {
        id: row.id,
        name: row.name?.trim() || `Área ${row.id}`,
        areaType: row.area_type === "POLYGON" ? "POLYGON" : "CIRCLE",
        center: centerFromPayload,
        radiusM: typeof row.radius_m === "number" ? row.radius_m : null,
        polygon,
        active: Boolean(row.active),
        createdAt: row.created_at ?? null,
        incidentId: row.incident ?? null,
        incidentName: row.incident_name ?? null,
      };
    });
}

function getAreaTypeLabel(value: WorkAreaRow["areaType"]) {
  return value === "POLYGON" ? "Polígono" : "Círculo";
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

function getAreaFocus(area: WorkAreaRow | null): LatLngTuple | null {
  if (!area) return null;
  if (area.center) return area.center;

  if (area.polygon && area.polygon.length > 0) {
    const totals = area.polygon.reduce(
      (acc, point) => ({
        lat: acc.lat + point[0],
        lng: acc.lng + point[1],
      }),
      { lat: 0, lng: 0 }
    );

    return [totals.lat / area.polygon.length, totals.lng / area.polygon.length];
  }

  return null;
}

function openGoogleMapsInNewTab(point: LatLngTuple | null) {
  if (!point) return;
  const [lat, lng] = point;
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function MapViewport({ area }: { area: WorkAreaRow | null }) {
  const map = useMap();

  useEffect(() => {
    if (!area) return;

    if (area.areaType === "CIRCLE" && area.center) {
      map.setView(area.center, 14, { animate: true });
      return;
    }

    if (area.areaType === "POLYGON" && area.polygon && area.polygon.length >= 3) {
      map.fitBounds(area.polygon as LatLngBoundsExpression, { padding: [28, 28], animate: true });
    }
  }, [area, map]);

  return null;
}

function WorkAreaMap({ area }: { area: WorkAreaRow | null }) {
  const defaultCenter: LatLngTuple = [40.4168, -3.7038];
  const initialCenter = area?.center ?? area?.polygon?.[0] ?? defaultCenter;

  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--cm-border)]">
      <MapContainer center={initialCenter} zoom={13} scrollWheelZoom style={{ height: "420px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport area={area} />

        {area?.areaType === "CIRCLE" && area.center && area.radiusM ? (
          <Circle
            center={area.center}
            radius={area.radiusM}
            pathOptions={{ color: "#ef4444", fillColor: "#f97316", fillOpacity: 0.22, weight: 3 }}
          />
        ) : null}

        {area?.areaType === "POLYGON" && area.polygon && area.polygon.length >= 3 ? (
          <Polygon
            positions={area.polygon}
            pathOptions={{ color: "#06b6d4", fillColor: "#22d3ee", fillOpacity: 0.2, weight: 3 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

export default function WorkAreasPage() {
  const navigate = useNavigate();
  const pageSize = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [workAreas, setWorkAreas] = useState<WorkAreaRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const response = await apiFetch("/workareas/");
        if (!response.ok) {
          setError("No se pudieron cargar las áreas de trabajo.");
          return;
        }

        const data = await response.json();
        const rows = normalizeWorkAreas(data);
        setWorkAreas(rows);
      } catch {
        setError("Error de red al cargar las áreas de trabajo.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredWorkAreas = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workAreas;

    return workAreas.filter((area) =>
      `${area.name} ${area.areaType} ${area.incidentName ?? ""}`.toLowerCase().includes(normalized)
    );
  }, [query, workAreas]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkAreas.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedWorkAreas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWorkAreas.slice(start, start + pageSize);
  }, [currentPage, filteredWorkAreas]);

  const selectedArea =
    filteredWorkAreas.find((area) => area.id === selectedId) ??
    workAreas.find((area) => area.id === selectedId) ??
    null;
  const mapFocus = useMemo(() => getAreaFocus(selectedArea), [selectedArea]);

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Work Areas</p>
          <h1 className="mt-1 text-2xl font-bold">Áreas de trabajo</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
            Selecciona un área para ver su localización en el mapa y revisar sus datos.
          </p>
        </div>
      </div>

      {error ? <div className="mt-4 cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, tipo o incidente..."
            className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
          />

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-8 text-center text-sm text-[color:var(--cm-text-muted)]">
                Cargando áreas de trabajo...
              </div>
            ) : filteredWorkAreas.length === 0 ? (
              <div className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-8 text-center text-sm text-[color:var(--cm-text-muted)]">
                No hay áreas de trabajo para mostrar.
              </div>
            ) : (
              paginatedWorkAreas.map((area) => {
                const selected = selectedArea?.id === area.id;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedId(area.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selected
                        ? "border-[color:var(--cm-info)] bg-[color:var(--cm-info)]/10"
                        : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] hover:border-[color:var(--cm-info)]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[color:var(--cm-text)]">{area.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                          {area.incidentName || "Sin incidente asociado"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${area.active ? "cm-badge-success" : "cm-badge-warning"}`}>
                        {area.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--cm-text-muted)]">
                      <span>{getAreaTypeLabel(area.areaType)}</span>
                      <span>{formatDate(area.createdAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {!loading && filteredWorkAreas.length > 0 ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-4">
              <p className="text-xs text-[color:var(--cm-text-muted)]">
                Mostrando {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredWorkAreas.length)} de {filteredWorkAreas.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 text-sm text-[color:var(--cm-text)] transition hover:border-[color:var(--cm-info)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-[color:var(--cm-text-muted)]">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 text-sm text-[color:var(--cm-text)] transition hover:border-[color:var(--cm-info)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Mapa</p>
              <h2 className="mt-1 text-lg font-bold">{selectedArea?.name || "Área no seleccionada"}</h2>
            </div>

            {selectedArea ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[color:var(--cm-surface-2)] px-3 py-1 text-[color:var(--cm-text-muted)]">
                  {getAreaTypeLabel(selectedArea.areaType)}
                </span>
                <span className="rounded-full bg-[color:var(--cm-surface-2)] px-3 py-1 text-[color:var(--cm-text-muted)]">
                  {selectedArea.incidentName || "Sin incidente"}
                </span>
                <button
                  type="button"
                  onClick={() => openGoogleMapsInNewTab(mapFocus)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={!mapFocus}
                >
                  Abrir en Google Maps
                  {mapFocus && (
                    <span className="ml-2 underline text-blue-200">
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedArea.incidentId) return;
                    navigate(`/editIncident/${selectedArea.incidentId}`);
                  }}
                  disabled={!selectedArea.incidentId}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:bg-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  Abrir incidente relacionado
                  {selectedArea.incidentId ? (
                    <span className="ml-2 underline text-red-200">{selectedArea.incidentName || selectedArea.incidentId}</span>
                    
                  ) : (
                    <span className="ml-2 text-gray-400">(No hay incidente asociado)</span>
                  )}
                </button>
              </div>
            ) : null}
          </div>

          {!selectedArea ? (
            <div className="grid h-[420px] place-items-center rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] text-sm text-[color:var(--cm-text-muted)]">
              Selecciona un área de trabajo para verla en el mapa.
            </div>
          ) : (
            <WorkAreaMap area={selectedArea} />
          )}

          <button
            type="button"
            onClick={() => navigate("/createWorkArea")}
            className="mt-4 ml-auto block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition"
          >
            Crear nueva área de trabajo
          </button>
        </section>
      </div>
    </div>
  );
}
