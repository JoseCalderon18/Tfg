import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { apiFetch } from "../utils/api";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, positions]);

  return null;
}


type MeResponse = {
  authenticated: boolean;
  email?: string;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

type Incident = {
  id: string;
  name: string;
  incident_type: string;
  status: string;
  description?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  } | null;
  location_address?: string;
  created_by: string;
  owner_organization?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type IncidentWeather = {
  solar?: number; // W/m² (shortwave radiation)
  soilMoisture?: number; // m³/m³ percent
  fireIndex?: number; // Fire Weather Index
  updatedAt: string;
};

type LayerType = "solar" | "soil" | "ignition";

  const tileUrls: Record<LayerType, string> = {
    solar: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    soil: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
    ignition: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  };

export default function DashboardPage() {
  // Estado local del dashboard
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentWeather, setIncidentWeather] = useState<Record<string, IncidentWeather>>({});
  const [activeLayer, setActiveLayer] = useState<LayerType>("ignition");
  const navigate = useNavigate();

  const positionedIncidents = useMemo(() =>
    incidents
      .filter((incident) => incident.location && incident.location.coordinates)
      .map((incident) => ({
        incident,
        latLng: [incident.location!.coordinates[1], incident.location!.coordinates[0]] as [number, number],
      })),
    [incidents]
  );

  const positions = useMemo(() => positionedIncidents.map((p) => p.latLng), [positionedIncidents]);


  // Carga inicial de sesion y permisos de panel
  useEffect(() => {
    (async () => {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const data = (await res.json()) as MeResponse;

      if (!data.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      setMe(data);

      // Cargar incidentes
      const incidentsRes = await apiFetch("/incidents/");
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        const incidentItems: Incident[] = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.results || [];

        setIncidents(incidentItems);
      } else {
        console.error("Error cargando incidentes:", incidentsRes.status);
      }

      setLoading(false);
    })();
  }, [navigate]);

  // Carga datos meteorologicos especializados por incidente (para capas)
  useEffect(() => {
    if (!positionedIncidents.length) return;

    const fetchWeatherForIncident = async (incidentId: string, lat: number, lng: number) => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lng));
        url.searchParams.set("hourly", "fire_weather_index,shortwave_radiation,soil_moisture_0_1cm");
        url.searchParams.set("current_weather", "true");
        url.searchParams.set("timezone", "auto");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
        const data = await res.json();

        const timeIndex = data.hourly.time.findIndex((t: string) => t === data.current_weather.time);
        const fireIndex = timeIndex >= 0 ? data.hourly.fire_weather_index[timeIndex] : undefined;
        const solar = timeIndex >= 0 ? data.hourly.shortwave_radiation[timeIndex] : undefined;
        const soil = timeIndex >= 0 ? data.hourly.soil_moisture_0_1cm[timeIndex] : undefined;

        setIncidentWeather((prev) => ({
          ...prev,
          [incidentId]: {
            fireIndex,
            solar,
            soilMoisture: soil,
            updatedAt: data.current_weather.time,
          },
        }));
      } catch (err) {
        // Silencioso: no rompa la carga principal
      }
    };

    positionedIncidents.slice(0, 25).forEach(({ incident, latLng }) => {
      fetchWeatherForIncident(incident.id, latLng[0], latLng[1]);
    });
  }, [positionedIncidents]);

  // Accion de cierre de sesion desde dashboard
  async function handleLogout() {
    await apiFetch("/auth/panel/logout/", { method: "POST" });
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
          <p className="text-[color:var(--cm-text-muted)]">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      {/* Fondo decorativo del centro de mando */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[color:var(--cm-danger)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[color:var(--cm-info)] blur-3xl" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header principal */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--cm-danger)]/15 ring-1 ring-[color:var(--cm-danger)]/35">
              <span className="font-bold text-[color:var(--cm-text)]">EM</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Centro de mando</p>
              <h1 className="text-2xl font-bold tracking-tight">Mapa de incidencias</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="cm-badge-success inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operativo
            </span>
            <span className="cm-badge-info rounded-full px-3 py-1 text-xs">
              {me?.email ?? "Supervisor"}
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveLayer("solar")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeLayer === "solar"
                    ? "border-[color:var(--cm-warning)] bg-[color:var(--cm-warning)]/15"
                    : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] hover:border-[color:var(--cm-warning)]/50 hover:bg-[color:var(--cm-surface-2)]"
                }`}
                type="button"
              >
                Radiación
              </button>
              <button
                onClick={() => setActiveLayer("soil")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeLayer === "soil"
                    ? "border-[color:var(--cm-info)] bg-[color:var(--cm-info)]/15"
                    : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] hover:border-[color:var(--cm-info)]/50 hover:bg-[color:var(--cm-surface-2)]"
                }`}
                type="button"
              >
                Humedad
              </button>
              <button
                onClick={() => setActiveLayer("ignition")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeLayer === "ignition"
                    ? "border-[color:var(--cm-danger)] bg-[color:var(--cm-danger)]/15"
                    : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] hover:border-[color:var(--cm-danger)]/50 hover:bg-[color:var(--cm-surface-2)]"
                }`}
                type="button"
              >
                Ignición
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:border-[color:var(--cm-danger)]/50 hover:bg-[color:var(--cm-surface-2)]"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mapa de incidentes */}
        <div className="flex-1 min-h-0 px-4 pb-4 lg:px-5 lg:pb-5 2xl:px-6">
          <div className="h-[calc(100vh-120px)] w-full rounded-2xl overflow-hidden border border-[color:var(--cm-border)] relative">
            {incidents.length === 0 && (
              <div className="absolute inset-0 bg-[color:var(--cm-surface)] flex items-center justify-center z-50">
                <div className="text-center">
                  <p className="text-[color:var(--cm-text-muted)] mb-2">No hay incidentes cargados</p>
                  <p className="text-xs text-[color:var(--cm-text-muted)]">Total incidentes: {incidents.length}</p>
                </div>
              </div>
            )}
            {incidents.length > 0 && positionedIncidents.length === 0 && (
              <div className="absolute inset-0 bg-[color:var(--cm-surface)] flex items-center justify-center z-50">
                <div className="text-center">
                  <p className="text-[color:var(--cm-text-muted)] mb-2">No hay incidentes con ubicación</p>
                  <p className="text-xs text-[color:var(--cm-text-muted)]">Total incidentes: {incidents.length}</p>
                </div>
              </div>
            )}
            <MapContainer
              center={positions.length ? positions[0] : [40.4168, -3.7038]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={tileUrls[activeLayer]}
              />
              {positions.length > 0 && <FitBounds positions={positions} />}
              {positionedIncidents.map(({ incident, latLng }) => {
                const weather = incidentWeather[incident.id];

                return (
                  <Marker key={incident.id} position={latLng}>
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-lg">{incident.name}</h3>
                        <p className="text-sm text-gray-600">{incident.incident_type}</p>
                        <p className="text-sm">Estado: {incident.status}</p>
                        {incident.description && (
                          <p className="text-sm mt-2">{incident.description}</p>
                        )}
                        {incident.location_address && (
                          <p className="text-sm mt-1">{incident.location_address}</p>
                        )}
                        {weather && (
                          <p className="text-xs text-gray-500 mt-2">
                            Última actualización: {new Date(weather.updatedAt).toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Creado: {new Date(incident.created_at).toLocaleString()}
                        </p>
                        <Link
                          to={`/incidents`}
                          className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                        >
                          Ver detalles →
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
