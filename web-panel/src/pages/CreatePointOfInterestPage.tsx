import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import TourButton from "../components/TourGuide";

type IncidentOption = {
  id: string;
  name: string;
};

type CreatePointOfInterestPayload = {
  name: string;
  poi_type: string;
  description?: string;
  incident?: string | null;
  latitude: number;
  longitude: number;
};

const TIPOS_POI = [
  { value: "HYDRANT", label: "Hidrante" },
  { value: "SETTLEMENT", label: "Asentamiento" },
  { value: "FIREBREAK", label: "Cortafuegos" },
  { value: "WATCHPOINT", label: "Punto de vigilancia" },
  { value: "BASE_STATION", label: "Estacion base" },
  { value: "EVAC_ROUTE", label: "Via de evacuacion" },
  { value: "COMMUNICATION_TOWER", label: "Antena de comunicacion" },
  { value: "CHECKPOINT", label: "Punto de control" },
  { value: "OBSTACLE", label: "Obstaculo" },
  { value: "BRIDGE", label: "Puente o paso elevado" },
  { value: "SUPPLY_POINT", label: "Punto de suministro" },
  { value: "HELIPAD", label: "Helisuperficie" },
  { value: "OTHER", label: "Otro" },
];

const MADRID_CENTER: LatLngTuple = [40.4168, -3.7038];

function normalizarIncidentes(raw: unknown): IncidentOption[] {
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

function EventoPuntosSeleccionados({ onPointChange }: { onPointChange: (point: LatLngTuple) => void }) {
  useMapEvents({
    click(event) {
      onPointChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function MapViewport({ point }: { point: LatLngTuple | null }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    map.setView(point, 15, { animate: true });
  }, [point, map]);

  return null;
}

export default function CreatePointOfInterestPage() {
  const navigate = useNavigate();
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [incidentsError, setIncidentsError] = useState("");

  const [incidentId, setIncidentId] = useState("");
  const [name, setName] = useState("");
  const [poiType, setPoiType] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<LatLngTuple | null>(null);

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
        setIncidents(normalizarIncidentes(data));
      } catch {
        setIncidentsError("Error de red al cargar los incidentes.");
      } finally {
        setIncidentsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setError("");
  }, [incidentId, name, poiType, description, selectedPoint]);

  const selectedIncidentName = useMemo(
    () => incidents.find((incident) => incident.id === incidentId)?.name ?? "",
    [incidentId, incidents]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Debes indicar un nombre para el punto de interes.");
      return;
    }

    if (!selectedPoint) {
      setError("Haz clic en el mapa para marcar la ubicacion del punto.");
      return;
    }

    const payload: CreatePointOfInterestPayload = {
      name: name.trim(),
      poi_type: poiType,
      description: description.trim() || undefined,
      incident: incidentId || null,
      latitude: selectedPoint[0],
      longitude: selectedPoint[1],
    };

    try {
      setSubmitting(true);
      const respuesta = await apiFetch("/points-of-interest/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        let detail = "No se pudo crear el punto de interes.";
        try {
          const data = (await respuesta.json()) as Record<string, unknown>;
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
          // fallback
        }
        setError(detail);
        return;
      }

      setSuccess("Punto de interes creado correctamente.");
      setIncidentId("");
      setName("");
      setPoiType("OTHER");
      setDescription("");
      setSelectedPoint(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Terreno · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Crear nuevo punto de interes</h1>
            <p className="mt-2 text-slate-300">
              Registra una referencia operativa y marca su posicion exacta sobre el mapa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TourButton
              steps={[
                {
                  selector: '[data-tour="create-poi-form"]',
                  title: "Crear punto de interés",
                  description: "Registra un punto de referencia operativo: nombre, tipo (recurso, peligro, punto de reunión…), incidente asociado y posición exacta en el mapa. Haz clic en el mapa para fijar la ubicación o introduce coordenadas manualmente.",
                },
              ]}
            />
            <button
              type="button"
              onClick={() => navigate("/points")}
              className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
            >
              Volver
            </button>
          </div>
        </div>

        <div data-tour="create-poi-form" className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                <p className="font-semibold">{success}</p>
                <p className="mt-1 text-emerald-100/90">
                  El punto de interes se ha creado correctamente y ya esta disponible en el listado.
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Incidente relacionado</label>
                <select
                  value={incidentId}
                  onChange={(event) => setIncidentId(event.target.value)}
                  disabled={incidentsLoading}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="" className="bg-slate-900">
                    {incidentsLoading ? "Cargando incidentes..." : "Sin incidente asociado"}
                  </option>
                  {incidents.map((incident) => (
                    <option key={incident.id} value={incident.id} className="bg-slate-900">
                      {incident.name}
                    </option>
                  ))}
                </select>
                {incidentsError ? <p className="mt-1 text-xs text-amber-300">{incidentsError}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre del punto</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Hidrante sector norte"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de punto</label>
                <select
                  value={poiType}
                  onChange={(event) => setPoiType(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {TIPOS_POI.map((type) => (
                    <option key={type.value} value={type.value} className="bg-slate-900">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Descripcion</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-3 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Anota detalles utiles para el equipo operativo."
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                {selectedPoint
                  ? `Ubicacion marcada en lat ${selectedPoint[0].toFixed(6)}, lng ${selectedPoint[1].toFixed(6)}.`
                  : "Haz clic en el mapa para marcar la ubicacion del punto de interes."}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/points")}
                  className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
                >
                  {submitting ? "Creando..." : "Crear punto de interes"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mapa</p>
                <h2 className="mt-1 text-lg font-bold">{name.trim() || "Nuevo punto de interes"}</h2>
                <p className="mt-1 text-sm text-slate-400">{selectedIncidentName || "Sin incidente asociado"}</p>
              </div>
              <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {TIPOS_POI.find((type) => type.value === poiType)?.label ?? "Tipo sin definir"}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <MapContainer center={MADRID_CENTER} zoom={13} scrollWheelZoom style={{ height: "620px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <EventoPuntosSeleccionados onPointChange={setSelectedPoint} />
                <MapViewport point={selectedPoint} />

                {selectedPoint ? (
                  <>
                    <CircleMarker
                      center={selectedPoint}
                      radius={8}
                      pathOptions={{ color: "#dc2626", fillColor: "#f87171", fillOpacity: 1 }}
                    />
                    <Marker position={selectedPoint} />
                  </>
                ) : null}
              </MapContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
