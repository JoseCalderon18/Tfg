import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { apiFetch } from "../utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Incident = {
  id: string;
  name: string;
  incident_type: string;
  status: string;
  description?: string;
  location: {
    type: string;
    coordinates: [number, number];
  } | null;
  location_address?: string;
};

type OpenMeteoWeather = {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relativehumidity_2m: number[];
    precipitation: number[];
    windspeed_10m: number[];
  };
};

type OpenWeatherOneCall = {
  current: {
    dt: number;
    temp: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{ id: number; main: string; description: string }>;
  };
  hourly: Array<{ dt: number; temp: number; humidity: number; wind_speed: number }>;
  alerts?: Array<{ sender_name: string; event: string; description: string }>;
};

function getFireRisk(temp: number, humidity: number, wind: number, precipitation: number) {
  if (precipitation > 0.5) return "Bajo";
  if (temp >= 35 && humidity <= 25 && wind >= 20) return "Muy alto";
  if (temp >= 30 && humidity <= 30 && wind >= 15) return "Alto";
  if (temp >= 25 && humidity <= 40) return "Moderado";
  return "Bajo";
}

export default function WeatherPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [openMeteo, setOpenMeteo] = useState<OpenMeteoWeather | null>(null);
  const [openWeather, setOpenWeather] = useState<OpenWeatherOneCall | null>(null);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? incidents[0],
    [incidents, selectedIncidentId]
  );

  const location = useMemo(() => {
    const coords = selectedIncident?.location?.coordinates;
    if (!coords || coords.length !== 2) return null;
    return { lat: coords[1], lng: coords[0] };
  }, [selectedIncident]);

  const locationLabel = selectedIncident?.location_address ?? "Ubicación desconocida";

  const currentConditions = useMemo(() => {
    if (!openMeteo) return null;

    const { current_weather, hourly } = openMeteo;
    const index = hourly.time.findIndex((t) => t === current_weather.time);

    const humidity = index >= 0 ? hourly.relativehumidity_2m[index] : hourly.relativehumidity_2m[0];
    const precipitation = index >= 0 ? hourly.precipitation[index] : hourly.precipitation[0];
    const wind = index >= 0 ? hourly.windspeed_10m[index] : hourly.windspeed_10m[0];

    return {
      temp: current_weather.temperature,
      wind,
      humidity,
      precipitation,
      risk: getFireRisk(current_weather.temperature, humidity, wind, precipitation),
      time: current_weather.time,
      weatherCode: current_weather.weathercode,
    };
  }, [openMeteo]);

  const chartData = useMemo(() => {
    if (!openMeteo) return null;

    const labels = openMeteo.hourly.time.slice(0, 24).map((t) =>
      new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );

    return {
      labels,
      datasets: [
        {
          label: "Temperatura (°C)",
          data: openMeteo.hourly.temperature_2m.slice(0, 24),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          yAxisID: "y1",
        },
        {
          label: "Humedad (%)",
          data: openMeteo.hourly.relativehumidity_2m.slice(0, 24),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          yAxisID: "y2",
        },
        {
          label: "Viento (km/h)",
          data: openMeteo.hourly.windspeed_10m.slice(0, 24),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.2)",
          yAxisID: "y2",
        },
      ],
    };
  }, [openMeteo]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const incidentsRes = await apiFetch("/incidents/?page=1&limit=50");
        const incidentsData = await incidentsRes.json();
        const items: Incident[] = Array.isArray(incidentsData) ? incidentsData : incidentsData.results || [];
        setIncidents(items);
        setSelectedIncidentId(items[0]?.id ?? null);
      } catch (err: any) {
        console.error(err);
        setError("No se pudieron cargar los incidentes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!location) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(location.lat));
        url.searchParams.set("longitude", String(location.lng));
        url.searchParams.set("current_weather", "true");
        url.searchParams.set(
          "hourly",
          "temperature_2m,relativehumidity_2m,precipitation,windspeed_10m"
        );
        url.searchParams.set("timezone", "auto");

        const weatherRes = await fetch(url.toString());
        if (!weatherRes.ok) throw new Error(`Weather API error: ${weatherRes.status}`);
        const weatherData = (await weatherRes.json()) as OpenMeteoWeather;
        setOpenMeteo(weatherData);

        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (apiKey) {
          const owUrl = new URL("https://api.openweathermap.org/data/2.5/onecall");
          owUrl.searchParams.set("lat", String(location.lat));
          owUrl.searchParams.set("lon", String(location.lng));
          owUrl.searchParams.set("units", "metric");
          owUrl.searchParams.set("appid", apiKey);

          const owRes = await fetch(owUrl.toString());
          if (owRes.ok) {
            const owData = (await owRes.json()) as OpenWeatherOneCall;
            setOpenWeather(owData);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Error cargando datos meteorológicos");
      } finally {
        setLoading(false);
      }
    })();
  }, [location]);

  return (
    <div className="cm-shell min-h-screen">
      <div className="relative z-10 w-full px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Meteorología</p>
            <h1 className="text-2xl font-bold tracking-tight">Estado del tiempo</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
            <h2 className="text-base font-semibold">Incidentes</h2>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Selecciona un incidente para centrar el pronóstico.
            </p>
            <div className="mt-4 max-h-[60vh] overflow-auto space-y-2">
              {loading && !incidents.length ? (
                <div className="text-sm text-[color:var(--cm-text-muted)]">Cargando...</div>
              ) : incidents.length === 0 ? (
                <div className="text-sm text-[color:var(--cm-text-muted)]">No hay incidentes.</div>
              ) : (
                incidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    className={`w-full text-left rounded-xl px-3 py-2 transition ${
                      incident.id === selectedIncidentId
                        ? "bg-[color:var(--cm-info)]/20 ring-1 ring-[color:var(--cm-info)]"
                        : "hover:bg-[color:var(--cm-info)]/10"
                    }`}
                    onClick={() => setSelectedIncidentId(incident.id)}
                  >
                    <p className="font-semibold">{incident.name}</p>
                    <p className="text-xs text-[color:var(--cm-text-muted)]">
                      {incident.incident_type} · {incident.status}
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {loading ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
                  <span className="text-[color:var(--cm-text-muted)]">Cargando datos meteorológicos...</span>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <p className="text-sm text-[color:var(--cm-danger)]">{error}</p>
              </div>
            ) : !openMeteo ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <p className="text-sm text-[color:var(--cm-text-muted)]">No hay datos de meteorología disponibles.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[color:var(--cm-text-muted)]">Ubicación</p>
                      <h2 className="text-xl font-semibold">{locationLabel}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[color:var(--cm-text-muted)]">Datos: Open-Meteo</p>
                      {import.meta.env.VITE_OPENWEATHER_API_KEY && (
                        <p className="text-xs text-[color:var(--cm-text-muted)]">+ OpenWeather</p>
                      )}
                    </div>
                  </div>

                  {currentConditions && (
                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      <div className="grid gap-3">
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Temperatura</p>
                          <p className="text-3xl font-semibold">{currentConditions.temp.toFixed(1)}°C</p>
                        </div>
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Humedad</p>
                          <p className="text-3xl font-semibold">{currentConditions.humidity}%</p>
                        </div>
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Viento</p>
                          <p className="text-3xl font-semibold">{currentConditions.wind.toFixed(1)} km/h</p>
                        </div>
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Precipitación</p>
                          <p className="text-3xl font-semibold">{currentConditions.precipitation.toFixed(1)} mm</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Riesgo de incendio</p>
                        <p className="mt-2 text-3xl font-semibold">{currentConditions.risk}</p>
                        <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
                          {currentConditions.risk === "Muy alto" &&
                            "Condiciones muy secas y viento fuerte. Evita trabajar con fuego abierto y refuerza precauciones."}
                          {currentConditions.risk === "Alto" &&
                            "Condiciones favorables para que el fuego se propague rápidamente. Mantén vigilancia y planes de contingencia."}
                          {currentConditions.risk === "Moderado" &&
                            "Condiciones de riesgo medio. Mantén medidas preventivas y revisa el pronóstico."}
                          {currentConditions.risk === "Bajo" &&
                            "Condiciones de bajo riesgo. Mantén precaución normal."}
                        </p>
                        <p className="mt-3 text-xs text-[color:var(--cm-text-muted)]">
                          Actualizado: {new Date(currentConditions.time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {chartData && (
                    <div className="mt-6">
                      <h3 className="text-base font-semibold">Tendencia (24h)</h3>
                      <div className="mt-3">
                        <Line
                          data={chartData}
                          options={{
                            responsive: true,
                            interaction: {
                              mode: "index",
                              intersect: false,
                            },
                            scales: {
                              x: { display: true, title: { display: true, text: "Hora" } },
                              y1: {
                                type: "linear",
                                display: true,
                                position: "left",
                                title: { display: true, text: "Temperatura (°C)" },
                              },
                              y2: {
                                type: "linear",
                                display: true,
                                position: "right",
                                grid: { drawOnChartArea: false },
                                title: { display: true, text: "Humedad / Viento" },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {openWeather && (
                    <div className="mt-6 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                      <h3 className="text-base font-semibold">Datos OpenWeather</h3>
                      <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
                        Datos alternativos de la API OpenWeather (requiere VITE_OPENWEATHER_API_KEY).
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Temperatura</p>
                          <p className="text-2xl font-semibold">{openWeather.current.temp.toFixed(1)}°C</p>
                        </div>
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Humedad</p>
                          <p className="text-2xl font-semibold">{openWeather.current.humidity}%</p>
                        </div>
                        <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs text-[color:var(--cm-text-muted)]">Viento</p>
                          <p className="text-2xl font-semibold">{openWeather.current.wind_speed.toFixed(1)} km/h</p>
                        </div>
                      </div>
                      {openWeather.alerts?.length ? (
                        <div className="mt-4 rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                          <p className="text-xs font-semibold">Alertas</p>
                          {openWeather.alerts.map((alert, idx) => (
                            <div key={idx} className="mt-2">
                              <p className="text-sm font-semibold">{alert.event}</p>
                              <p className="text-xs text-[color:var(--cm-text-muted)]">{alert.sender_name}</p>
                              <p className="text-xs mt-1 text-[color:var(--cm-text-muted)]">{alert.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
