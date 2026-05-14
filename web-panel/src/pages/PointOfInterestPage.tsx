import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngTuple } from "leaflet";

import { apiFetch } from "../utils/api";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type PointOfInterestApiRow = {
  id: string;
  name?: string | null;
  poi_type?: string | null;
  description?: string | null;
  incident?: string | null;
  incident_name?: string | null;
  created_by?: string | null;
  created_by_username?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: unknown;
};

type PointOfInterestRow = {
  id: string;
  name: string;
  poiType: string;
  description: string;
  incidentId: string | null;
  incidentName: string | null;
  createdBy: string | null;
  createdByUsername: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  coords: LatLngTuple | null;
};

function isValidLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parsePoint(value: unknown, latitude?: number | null, longitude?: number | null): LatLngTuple | null {
  if (latitude != null && longitude != null && isValidLatLng(latitude, longitude)) {
    return [latitude, longitude];
  }

  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown; x?: unknown; y?: unknown; lat?: unknown; lng?: unknown };

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

    if (candidate.lat !== undefined && candidate.lng !== undefined) {
      const lat = Number(candidate.lat);
      const lng = Number(candidate.lng);
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

function normalizePoints(raw: unknown): PointOfInterestRow[] {
  const source = Array.isArray(raw)
    ? raw
    : (raw as { results?: PointOfInterestApiRow[] } | null)?.results ?? [];

  return source
    .map((item) => item as PointOfInterestApiRow)
    .filter((row) => typeof row?.id === "string")
    .map((row) => ({
      id: row.id,
      name: row.name?.trim() || "Punto sin nombre",
      poiType: row.poi_type ?? "OTHER",
      description: row.description?.trim() || "Sin descripcion adicional.",
      incidentId: row.incident ?? null,
      incidentName: row.incident_name ?? null,
      createdBy: row.created_by ?? null,
      createdByUsername: row.created_by_username ?? null,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      coords: parsePoint(row.location, row.latitude ?? null, row.longitude ?? null),
    }));
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

function getPoiTypeLabel(value: string) {
  switch (value) {
    case "HYDRANT":
      return "Hidrante";
    case "SETTLEMENT":
      return "Asentamiento";
    case "FIREBREAK":
      return "Cortafuegos";
    case "WATCHPOINT":
      return "Punto de vigilancia";
    case "BASE_STATION":
      return "Estacion base";
    case "EVAC_ROUTE":
      return "Via de evacuacion";
    default:
      return "Otro";
  }
}

function FitToMarkers({ points }: { points: PointOfInterestRow[] }) {
  const map = useMap();

  useEffect(() => {
    const coords = points.map((point) => point.coords).filter((point): point is LatLngTuple => Boolean(point));
    if (!coords.length) return;

    if (coords.length === 1) {
      map.setView(coords[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(coords.map((coord) => L.latLng(coord[0], coord[1])));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, animate: true });
  }, [map, points]);

  return null;
}


export default function PointOfInterestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [points, setPoints] = useState<PointOfInterestRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [puntoPendienteEliminarId, setPuntoPendienteEliminarId] = useState<string | null>(null);
  const [puntoEliminandoId, setPuntoEliminandoId] = useState<string | null>(null);

  function prepararEliminarPuntoInteres(id: string) {
    setPuntoPendienteEliminarId(id);
  }

  async function eliminarPuntoInteres(id: string) {
    if (puntoEliminandoId) return;

    setError("");
    setPuntoEliminandoId(id);

    try {
      const response = await apiFetch(`/points-of-interest/${id}/`, { method: "DELETE" });
      if (!response.ok) {
        let detail = "No se pudo eliminar el punto de interes.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          }
        } catch {
          // mantenemos el fallback
        }
        setError(detail);
        return;
      }

      setPoints((prev) => prev.filter((point) => point.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      setPuntoPendienteEliminarId(null);
    } catch {
      setError("Error de red al eliminar el punto de interes. Intenta de nuevo.");
    } finally {
      setPuntoEliminandoId(null);
    }
  }
  useEffect(() => {
    (async () => {
      try {
        const meRes = await apiFetch("/auth/panel/me/");
        if (!meRes.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const meData = (await meRes.json()) as RespuestaUsuario;
        if (!meData.has_panel_full_access) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await apiFetch("/points-of-interest/");
        if (!response.ok) {
          setError("No se pudieron cargar los puntos de interes.");
          setLoading(false);
          return;
        }

        const rows = normalizePoints(await response.json());
        setPoints(rows);
        setSelectedId(rows[0]?.id ?? null);
      } catch {
        setError("Error de red al cargar puntos de interes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return points;

    return points.filter((point) =>
      `${point.name} ${point.poiType} ${point.description} ${point.createdByUsername ?? ""} ${point.incidentName ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [points, search]);

  const selectedPoint =
    filteredPoints.find((point) => point.id === selectedId) ??
    points.find((point) => point.id === selectedId) ??
    null;

  const puntoPendienteEliminar =
    points.find((point) => point.id === puntoPendienteEliminarId) ?? null;

  useEffect(() => {
    if (!selectedPoint && filteredPoints[0]) {
      setSelectedId(filteredPoints[0].id);
    }
  }, [filteredPoints, selectedPoint]);

  const center = selectedPoint?.coords ?? filteredPoints[0]?.coords ?? ([40.4168, -3.7038] as LatLngTuple);

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando puntos de interes...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Terreno</p>
          <h1 className="mt-1 text-2xl font-bold">Puntos de interés</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
            Mapa general de referencias operativas registradas por las unidades.
          </p>
        </div>
      </div>

      {error ? <div className="mt-4 cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, tipo, operativo o incidente..."
              className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
            />
            <div className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text-muted)]">
              Puntos visibles: <span className="font-semibold text-[color:var(--cm-text)]">{filteredPoints.length}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[color:var(--cm-border)]">
            <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "640px", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitToMarkers points={filteredPoints} />

              {filteredPoints.map((point) =>
                point.coords ? (
                  <Marker
                    key={point.id}
                    position={point.coords}
                    eventHandlers={{ click: () => setSelectedId(point.id) }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold">{point.name}</p>
                        <p>{getPoiTypeLabel(point.poiType)}</p>
                        <p>Operativo: {point.createdByUsername ?? point.createdBy ?? "No disponible"}</p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          {!selectedPoint ? (
            <div className="grid h-full min-h-[320px] place-items-center text-sm text-[color:var(--cm-text-muted)]">
              Selecciona un punto de interes en el mapa para ver su informacion.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Detalle del punto</p>
                <h2 className="mt-2 text-xl font-bold">{selectedPoint.name}</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Tipo</p>
                  <p className="mt-1 font-medium">{getPoiTypeLabel(selectedPoint.poiType)}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado</p>
                  <p className="mt-1 font-medium">{selectedPoint.isActive ? "Activo" : "Inactivo"}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativo</p>
                  <p className="mt-1 font-medium">{selectedPoint.createdByUsername ?? selectedPoint.createdBy ?? "-"}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Incidente</p>
                  <p className="mt-1 font-medium">{selectedPoint.incidentName ?? "Sin incidente asociado"}</p>
                </div>
              </div>

              <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Descripcion</p>
                <p className="mt-2 text-sm leading-6">{selectedPoint.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Creado</p>
                  <p className="mt-1 font-medium">{formatDate(selectedPoint.createdAt)}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Actualizado</p>
                  <p className="mt-1 font-medium">{formatDate(selectedPoint.updatedAt)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Coordenadas</p>
                <p className="mt-1 font-medium">
                  {selectedPoint.coords ? `${selectedPoint.coords[0]}, ${selectedPoint.coords[1]}` : "No disponibles"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedPoint.incidentId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/editIncident/${selectedPoint.incidentId}`)}
                    className="rounded-xl bg-[color:var(--cm-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Abrir incidente relacionado
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => prepararEliminarPuntoInteres(selectedPoint.id)}
                  disabled={Boolean(puntoEliminandoId)}
                  className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {puntoEliminandoId === selectedPoint.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          )}
        </section>
        <div>
          <button type="button" onClick={() => navigate("/createPointOfInterest")} className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
            Crear nuevo punto de interes
          </button>
        </div>
      </div>

      {puntoPendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/55 px-4 lg:px-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="punto-eliminar-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:mr-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Eliminar punto de interes</p>
            <h2 id="punto-eliminar-titulo" className="mt-2 text-xl font-bold text-[color:var(--cm-text)]">
              ¿Quieres borrar este punto de interes?
            </h2>
            <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
              Se eliminara definitivamente
              {puntoPendienteEliminar.name ? ` "${puntoPendienteEliminar.name}"` : ""}.
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPuntoPendienteEliminarId(null)}
                disabled={Boolean(puntoEliminandoId)}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-surface-2)]/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void eliminarPuntoInteres(puntoPendienteEliminar.id)}
                disabled={Boolean(puntoEliminandoId)}
                className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {puntoEliminandoId === puntoPendienteEliminar.id ? "Borrando..." : "Confirmar borrado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
