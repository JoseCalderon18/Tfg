import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

interface LightningStrike {
  lat: number;
  lon: number;
  timestamp: string;
  intensity: number | null;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, positions]);

  return null;
}

export default function LightningMapPage() {
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrikes = async () => {
      try {
        const response = await apiFetch("/lightning/latest/");
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data: LightningStrike[] = await response.json();
        setStrikes(data);
      } catch (err) {
        console.error("Error fetching lightning strikes:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchStrikes();
  }, []);

  const positions: [number, number][] = strikes.map(strike => [strike.lat, strike.lon]);

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
          <p className="text-[color:var(--cm-text-muted)]">Cargando rayos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error al cargar rayos</p>
          <p className="text-sm text-[color:var(--cm-text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      {/* Un fondo bonito */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-yellow-400 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-orange-400 blur-3xl" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col">
        {/* La cabecera */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-400/15 ring-1 ring-yellow-400/35">
              <span className="font-bold text-yellow-600">⚡</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Sistema de detección</p>
              <h1 className="text-2xl font-bold tracking-tight">Mapa de rayos</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="cm-badge-info inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              {strikes.length} rayos detectados
            </span>
          </div>
        </div>

        {/* El mapa interactivo */}
        <div className="flex-1 min-h-0 px-4 pb-4 lg:px-5 lg:pb-5 2xl:px-6">
          <div className="h-[calc(100vh-120px)] w-full rounded-2xl overflow-hidden border border-[color:var(--cm-border)] relative">
            {strikes.length === 0 && (
              <div className="absolute inset-0 bg-[color:var(--cm-surface)] flex items-center justify-center z-50">
                <div className="text-center">
                  <p className="text-[color:var(--cm-text-muted)] mb-2">No hay rayos detectados</p>
                  <p className="text-xs text-[color:var(--cm-text-muted)]">Última actualización: {new Date().toLocaleString()}</p>
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
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {positions.length > 0 && <FitBounds positions={positions} />}
              {strikes.map((strike, index) => (
                <Marker
                  key={`${strike.timestamp}-${index}`}
                  position={[strike.lat, strike.lon]}
                  icon={L.icon({
                    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg">⚡ Rayo detectado</h3>
                      <p className="text-sm text-gray-600">
                        <strong>Hora:</strong> {new Date(strike.timestamp).toLocaleString()}
                      </p>
                      {strike.intensity && (
                        <p className="text-sm text-gray-600">
                          <strong>Intensidad:</strong> {strike.intensity} kA
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Coordenadas: {strike.lat.toFixed(4)}, {strike.lon.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}