import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Circle, CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type IncidentOption = {
  id: string;
  name: string;
};

type AreaType = "CIRCLE" | "POLYGON";

type CreateWorkAreaPayload = {
  incident: string;
  name: string;
  area_type: AreaType;
  active: boolean;
  center_lat?: number;
  center_lng?: number;
  radius_m?: number;
  polygon_points?: Array<[number, number]>;
};

const MADRID_CENTER: LatLngTuple = [40.4168, -3.7038];

function normalizeIncidents(raw: unknown): IncidentOption[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? "");
      const name = String(row.name ?? row.title ?? row.incident_name ?? "");
      return { id, name };
    })
    .filter((incident) => incident.id && incident.name);
}

function DrawingEvents({
  areaType,
  onCircleCenterChange,
  onPolygonPointAdd,
}: {
  areaType: AreaType;
  onCircleCenterChange: (point: LatLngTuple) => void;
  onPolygonPointAdd: (point: LatLngTuple) => void;
}) {
  useMapEvents({
    click(event) {
      const point: LatLngTuple = [event.latlng.lat, event.latlng.lng];
      if (areaType === "CIRCLE") {
        onCircleCenterChange(point);
        return;
      }
      onPolygonPointAdd(point);
    },
  });

  return null;
}

function MapViewport({
  areaType,
  circleCenter,
  polygonPoints,
}: {
  areaType: AreaType;
  circleCenter: LatLngTuple | null;
  polygonPoints: LatLngTuple[];
}) {
  const map = useMap();

  useEffect(() => {
    if (areaType === "CIRCLE" && circleCenter) {
      map.setView(circleCenter, 15, { animate: true });
      return;
    }

    if (areaType === "POLYGON" && polygonPoints.length > 0) {
      if (polygonPoints.length === 1) {
        map.setView(polygonPoints[0], 15, { animate: true });
        return;
      }
      map.fitBounds(polygonPoints as LatLngBoundsExpression, { padding: [30, 30], animate: true });
    }
  }, [areaType, circleCenter, polygonPoints, map]);

  return null;
}

export default function NewWorkAreaPage() {
  const navigate = useNavigate();
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [incidentsError, setIncidentsError] = useState("");

  const [incidentId, setIncidentId] = useState("");
  const [name, setName] = useState("");
  const [areaType, setAreaType] = useState<AreaType>("CIRCLE");
  const [radiusM, setRadiusM] = useState("250");
  const [active, setActive] = useState(true);

  const [circleCenter, setCircleCenter] = useState<LatLngTuple | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<LatLngTuple[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setIncidentsLoading(true);
        setIncidentsError("");
        const response = await apiFetch("/incidents/");
        if (!response.ok) {
          setIncidentsError(`No se pudieron cargar los incidentes (HTTP ${response.status}).`);
          return;
        }

        const data = await response.json();
        const list = normalizeIncidents(data);
        setIncidents(list);
      } catch {
        setIncidentsError("Error de red al cargar los incidentes.");
      } finally {
        setIncidentsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!incidentId && incidents.length > 0) {
      setIncidentId(incidents[0].id);
    }
  }, [incidentId, incidents]);

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [incidentId, name, areaType, radiusM, active, circleCenter, polygonPoints]);

  const polygonReady = polygonPoints.length >= 3;
  const parsedRadius = radiusM.trim() ? Number(radiusM) : NaN;
  const selectedIncidentName = useMemo(
    () => incidents.find((incident) => incident.id === incidentId)?.name ?? "",
    [incidentId, incidents]
  );

  function resetGeometry(nextAreaType: AreaType) {
    if (nextAreaType === "CIRCLE") {
      setPolygonPoints([]);
      return;
    }
    setCircleCenter(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!incidentId) {
      setError("Debes seleccionar un incidente.");
      return;
    }

    if (!name.trim()) {
      setError("Debes indicar un nombre para el área de trabajo.");
      return;
    }

    const payload: CreateWorkAreaPayload = {
      incident: incidentId,
      name: name.trim(),
      area_type: areaType,
      active,
    };

    if (areaType === "CIRCLE") {
      if (!circleCenter) {
        setError("Haz clic en el mapa para marcar el centro del círculo.");
        return;
      }
      if (Number.isNaN(parsedRadius) || parsedRadius <= 0) {
        setError("El radio debe ser mayor que 0 metros.");
        return;
      }

      payload.center_lat = circleCenter[0];
      payload.center_lng = circleCenter[1];
      payload.radius_m = parsedRadius;
    }

    if (areaType === "POLYGON") {
      if (!polygonReady) {
        setError("Marca al menos 3 puntos en el mapa para definir el polígono.");
        return;
      }
      payload.polygon_points = polygonPoints.map(([lat, lng]) => [lat, lng]);
    }

    try {
      setSubmitting(true);
      const response = await apiFetch("/workareas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = "No se pudo crear el área de trabajo.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
              const value = data[firstKey];
              detail = Array.isArray(value) ? `${firstKey}: ${String(value[0])}` : `${firstKey}: ${String(value)}`;
            }
          }
        } catch {
          // fallback message
        }
        setError(detail);
        return;
      }

      setSuccess("Área de trabajo creada correctamente.");
      setName("");
      setAreaType("CIRCLE");
      setRadiusM("250");
      setActive(true);
      setCircleCenter(null);
      setPolygonPoints([]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-orange-600 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Operaciones · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Crear nueva área de trabajo</h1>
            <p className="mt-2 text-slate-300">
              Selecciona el incidente y dibuja en el mapa el círculo o polígono exacto que quieres guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/workarea")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Incidente relacionado</label>
                <select
                  value={incidentId}
                  onChange={(event) => setIncidentId(event.target.value)}
                  disabled={incidentsLoading}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {incidents.length === 0 ? (
                    <option value="" className="bg-slate-900">
                      {incidentsLoading ? "Cargando incidentes..." : "Sin incidentes disponibles"}
                    </option>
                  ) : null}
                  {incidents.map((incident) => (
                    <option key={incident.id} value={incident.id} className="bg-slate-900">
                      {incident.name}
                    </option>
                  ))}
                </select>
                {incidentsError ? <p className="mt-1 text-xs text-amber-300">{incidentsError}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre del área</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Perimetro operativo norte"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de área</label>
                <select
                  value={areaType}
                  onChange={(event) => {
                    const nextType = event.target.value as AreaType;
                    setAreaType(nextType);
                    resetGeometry(nextType);
                  }}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="CIRCLE" className="bg-slate-900">
                    Círculo
                  </option>
                  <option value="POLYGON" className="bg-slate-900">
                    Polígono
                  </option>
                </select>
              </div>

              {areaType === "CIRCLE" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Radio en metros</label>
                  <input
                    value={radiusM}
                    onChange={(event) => setRadiusM(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="250"
                  />
                  <p className="mt-1 text-xs text-slate-400">Haz clic en el mapa para colocar el centro del círculo.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-sm font-medium text-slate-300">Dibujo de polígono</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Haz clic en el mapa para ir agregando vértices. Necesitas al menos 3 puntos.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPolygonPoints((current) => current.slice(0, -1))}
                      disabled={polygonPoints.length === 0}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Eliminar ultimo punto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolygonPoints([])}
                      disabled={polygonPoints.length === 0}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Limpiar polígono
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Puntos marcados: {polygonPoints.length}</p>
                </div>
              )}

              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500"
                />
                Área activa al crear
              </label>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                {areaType === "CIRCLE"
                  ? circleCenter
                    ? `Centro marcado en lat ${circleCenter[0].toFixed(6)}, lng ${circleCenter[1].toFixed(6)}.`
                    : "Aún no has marcado el centro del círculo."
                  : polygonReady
                    ? `Polígono listo para guardar con ${polygonPoints.length} vértices.`
                    : `Aún faltan puntos para el polígono. Llevas ${polygonPoints.length} vértices.`}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/workarea")}
                  className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || incidentsLoading}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 hover:bg-orange-500 disabled:opacity-60 transition"
                >
                  {submitting ? "Creando..." : "Crear área de trabajo"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mapa</p>
                <h2 className="mt-1 text-lg font-bold">{name.trim() || "Nueva área de trabajo"}</h2>
                <p className="mt-1 text-sm text-slate-400">{selectedIncidentName || "Selecciona un incidente"}</p>
              </div>
              <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {areaType === "CIRCLE" ? "Modo círculo" : "Modo polígono"}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <MapContainer center={MADRID_CENTER} zoom={13} scrollWheelZoom style={{ height: "620px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <DrawingEvents
                  areaType={areaType}
                  onCircleCenterChange={setCircleCenter}
                  onPolygonPointAdd={(point) => setPolygonPoints((current) => [...current, point])}
                />
                <MapViewport areaType={areaType} circleCenter={circleCenter} polygonPoints={polygonPoints} />

                {circleCenter ? <CircleMarker center={circleCenter} radius={8} pathOptions={{ color: "#f97316", fillColor: "#fb923c", fillOpacity: 1 }} /> : null}

                {areaType === "CIRCLE" && circleCenter && !Number.isNaN(parsedRadius) && parsedRadius > 0 ? (
                  <Circle
                    center={circleCenter}
                    radius={parsedRadius}
                    pathOptions={{ color: "#ea580c", fillColor: "#fb923c", fillOpacity: 0.18, weight: 3 }}
                  />
                ) : null}

                {polygonPoints.map((point, index) => (
                  <CircleMarker
                    key={`${point[0]}-${point[1]}-${index}`}
                    center={point}
                    radius={6}
                    pathOptions={{ color: "#0891b2", fillColor: "#22d3ee", fillOpacity: 1 }}
                  />
                ))}

                {areaType === "POLYGON" && polygonPoints.length === 2 ? (
                  <Polyline positions={polygonPoints} pathOptions={{ color: "#06b6d4", weight: 3 }} />
                ) : null}

                {areaType === "POLYGON" && polygonReady ? (
                  <Polygon positions={polygonPoints} pathOptions={{ color: "#0891b2", fillColor: "#22d3ee", fillOpacity: 0.2, weight: 3 }} />
                ) : null}
              </MapContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
