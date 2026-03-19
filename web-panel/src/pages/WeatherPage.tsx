import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";

type Incidente = {
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

type MeteoOpenMeteo = {
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

type MeteoOpenWeather = {
  current: {
    temp: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{ id: number; main: string; description: string }>;
  };
  alerts?: Array<{ sender_name: string; event: string; description: string }>;
};

function calcularRiesgoIncendio(temperatura: number, humedad: number, viento: number, precipitacion: number) {
  if (precipitacion > 0.5) return "Bajo";
  if (temperatura >= 35 && humedad <= 25 && viento >= 20) return "Muy alto";
  if (temperatura >= 30 && humedad <= 30 && viento >= 15) return "Alto";
  if (temperatura >= 25 && humedad <= 40) return "Moderado";
  return "Bajo";
}

export default function WeatherPage() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [incidenteSeleccionadoId, setIncidenteSeleccionadoId] = useState<string | null>(null);
  const [datosOpenMeteo, setDatosOpenMeteo] = useState<MeteoOpenMeteo | null>(null);
  const [datosOpenWeather, setDatosOpenWeather] = useState<MeteoOpenWeather | null>(null);

  const incidenteSeleccionado = useMemo(
    () => incidentes.find((incidente) => incidente.id === incidenteSeleccionadoId) ?? incidentes[0],
    [incidentes, incidenteSeleccionadoId]
  );

  const ubicacion = useMemo(() => {
    const coordenadas = incidenteSeleccionado?.location?.coordinates;
    if (!coordenadas || coordenadas.length !== 2) return null;
    return { lat: coordenadas[1], lng: coordenadas[0] };
  }, [incidenteSeleccionado]);

  const etiquetaUbicacion = incidenteSeleccionado?.location_address ?? "Ubicacion desconocida";

  const condicionesActuales = useMemo(() => {
    if (!datosOpenMeteo) return null;

    const { current_weather, hourly } = datosOpenMeteo;
    const indiceHoraActual = hourly.time.findIndex((hora) => hora === current_weather.time);

    const humedad = indiceHoraActual >= 0 ? hourly.relativehumidity_2m[indiceHoraActual] : hourly.relativehumidity_2m[0];
    const precipitacion = indiceHoraActual >= 0 ? hourly.precipitation[indiceHoraActual] : hourly.precipitation[0];
    const viento = indiceHoraActual >= 0 ? hourly.windspeed_10m[indiceHoraActual] : hourly.windspeed_10m[0];

    return {
      temperatura: current_weather.temperature,
      humedad,
      precipitacion,
      viento,
      riesgo: calcularRiesgoIncendio(current_weather.temperature, humedad, viento, precipitacion),
      hora: current_weather.time,
    };
  }, [datosOpenMeteo]);

  const resumenHorario = useMemo(() => {
    if (!datosOpenMeteo) return [];

    return datosOpenMeteo.hourly.time.slice(0, 12).map((hora, indice) => ({
      hora: new Date(hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temperatura: datosOpenMeteo.hourly.temperature_2m[indice],
      humedad: datosOpenMeteo.hourly.relativehumidity_2m[indice],
      viento: datosOpenMeteo.hourly.windspeed_10m[indice],
      precipitacion: datosOpenMeteo.hourly.precipitation[indice],
    }));
  }, [datosOpenMeteo]);

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        setError(null);

        const respuestaIncidentes = await apiFetch("/incidents/?page=1&limit=50");
        const datosIncidentes = await respuestaIncidentes.json();
        const items: Incidente[] = Array.isArray(datosIncidentes) ? datosIncidentes : datosIncidentes.results || [];

        setIncidentes(items);
        setIncidenteSeleccionadoId(items[0]?.id ?? null);
      } catch (errorCargando) {
        console.error(errorCargando);
        setError("No se pudieron cargar los incidentes.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ubicacion) return;

    (async () => {
      try {
        setCargando(true);
        setError(null);

        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(ubicacion.lat));
        url.searchParams.set("longitude", String(ubicacion.lng));
        url.searchParams.set("current_weather", "true");
        url.searchParams.set("hourly", "temperature_2m,relativehumidity_2m,precipitation,windspeed_10m");
        url.searchParams.set("timezone", "auto");

        const respuestaMeteo = await fetch(url.toString());
        if (!respuestaMeteo.ok) {
          throw new Error(`Weather API error: ${respuestaMeteo.status}`);
        }

        const datosMeteo = (await respuestaMeteo.json()) as MeteoOpenMeteo;
        setDatosOpenMeteo(datosMeteo);

        const apiKeyOpenWeather = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (apiKeyOpenWeather) {
          const urlOpenWeather = new URL("https://api.openweathermap.org/data/2.5/onecall");
          urlOpenWeather.searchParams.set("lat", String(ubicacion.lat));
          urlOpenWeather.searchParams.set("lon", String(ubicacion.lng));
          urlOpenWeather.searchParams.set("units", "metric");
          urlOpenWeather.searchParams.set("appid", apiKeyOpenWeather);

          const respuestaOpenWeather = await fetch(urlOpenWeather.toString());
          if (respuestaOpenWeather.ok) {
            const datosOpenWeatherApi = (await respuestaOpenWeather.json()) as MeteoOpenWeather;
            setDatosOpenWeather(datosOpenWeatherApi);
          } else {
            setDatosOpenWeather(null);
          }
        } else {
          setDatosOpenWeather(null);
        }
      } catch (errorMeteo: any) {
        console.error(errorMeteo);
        setError(errorMeteo?.message ?? "Error cargando datos meteorologicos.");
      } finally {
        setCargando(false);
      }
    })();
  }, [ubicacion]);

  return (
    <div className="cm-shell min-h-screen">
      <div className="relative z-10 w-full px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Meteorologia</p>
            <h1 className="text-2xl font-bold tracking-tight">Estado del tiempo</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
            <h2 className="text-base font-semibold">Incidentes</h2>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Selecciona un incidente para centrar la informacion meteorologica.
            </p>

            <div className="mt-4 max-h-[60vh] space-y-2 overflow-auto">
              {cargando && !incidentes.length ? (
                <div className="text-sm text-[color:var(--cm-text-muted)]">Cargando...</div>
              ) : incidentes.length === 0 ? (
                <div className="text-sm text-[color:var(--cm-text-muted)]">No hay incidentes.</div>
              ) : (
                incidentes.map((incidente) => (
                  <button
                    key={incidente.id}
                    type="button"
                    onClick={() => setIncidenteSeleccionadoId(incidente.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left transition ${
                      incidente.id === incidenteSeleccionadoId
                        ? "bg-[color:var(--cm-info)]/20 ring-1 ring-[color:var(--cm-info)]"
                        : "hover:bg-[color:var(--cm-info)]/10"
                    }`}
                  >
                    <p className="font-semibold">{incidente.name}</p>
                    <p className="text-xs text-[color:var(--cm-text-muted)]">
                      {incidente.incident_type} · {incidente.status}
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {cargando ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
                  <span className="text-[color:var(--cm-text-muted)]">Cargando datos meteorologicos...</span>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <p className="text-sm text-[color:var(--cm-danger)]">{error}</p>
              </div>
            ) : !datosOpenMeteo ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <p className="text-sm text-[color:var(--cm-text-muted)]">No hay datos meteorologicos disponibles.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-[color:var(--cm-text-muted)]">Ubicacion</p>
                    <h2 className="text-xl font-semibold">{etiquetaUbicacion}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[color:var(--cm-text-muted)]">Datos: Open-Meteo</p>
                    {import.meta.env.VITE_OPENWEATHER_API_KEY ? (
                      <p className="text-xs text-[color:var(--cm-text-muted)]">+ OpenWeather</p>
                    ) : null}
                  </div>
                </div>

                {condicionesActuales ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-3">
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Temperatura</p>
                        <p className="text-3xl font-semibold">{condicionesActuales.temperatura.toFixed(1)} C</p>
                      </div>
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Humedad</p>
                        <p className="text-3xl font-semibold">{condicionesActuales.humedad}%</p>
                      </div>
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Viento</p>
                        <p className="text-3xl font-semibold">{condicionesActuales.viento.toFixed(1)} km/h</p>
                      </div>
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Precipitacion</p>
                        <p className="text-3xl font-semibold">{condicionesActuales.precipitacion.toFixed(1)} mm</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                      <p className="text-xs text-[color:var(--cm-text-muted)]">Riesgo de incendio</p>
                      <p className="mt-2 text-3xl font-semibold">{condicionesActuales.riesgo}</p>
                      <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
                        {condicionesActuales.riesgo === "Muy alto" &&
                          "Condiciones muy secas y viento fuerte. Refuerza la vigilancia y evita trabajos con fuego abierto."}
                        {condicionesActuales.riesgo === "Alto" &&
                          "Condiciones favorables para la propagacion del fuego. Mantene medidas preventivas reforzadas."}
                        {condicionesActuales.riesgo === "Moderado" &&
                          "Condiciones de riesgo medio. Revisa el pronostico y mantene precaucion."}
                        {condicionesActuales.riesgo === "Bajo" &&
                          "Condiciones de bajo riesgo. Mantene precaucion normal."}
                      </p>
                      <p className="mt-3 text-xs text-[color:var(--cm-text-muted)]">
                        Actualizado: {new Date(condicionesActuales.hora).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : null}

                {resumenHorario.length ? (
                  <div className="mt-6">
                    <h3 className="text-base font-semibold">Resumen horario</h3>
                    <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--cm-border)]">
                      <div className="grid grid-cols-5 bg-[color:var(--cm-surface-2)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--cm-text-muted)]">
                        <span>Hora</span>
                        <span>Temp.</span>
                        <span>Humedad</span>
                        <span>Viento</span>
                        <span>Lluvia</span>
                      </div>
                      <div className="divide-y divide-[color:var(--cm-border)]">
                        {resumenHorario.map((fila) => (
                          <div key={fila.hora} className="grid grid-cols-5 px-4 py-3 text-sm text-[color:var(--cm-text)]">
                            <span>{fila.hora}</span>
                            <span>{fila.temperatura.toFixed(1)} C</span>
                            <span>{fila.humedad}%</span>
                            <span>{fila.viento.toFixed(1)} km/h</span>
                            <span>{fila.precipitacion.toFixed(1)} mm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {datosOpenWeather ? (
                  <div className="mt-6 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                    <h3 className="text-base font-semibold">Datos OpenWeather</h3>
                    <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
                      Datos alternativos desde OpenWeather si `VITE_OPENWEATHER_API_KEY` esta disponible.
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Temperatura</p>
                        <p className="text-2xl font-semibold">{datosOpenWeather.current.temp.toFixed(1)} C</p>
                      </div>
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Humedad</p>
                        <p className="text-2xl font-semibold">{datosOpenWeather.current.humidity}%</p>
                      </div>
                      <div className="rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Viento</p>
                        <p className="text-2xl font-semibold">{datosOpenWeather.current.wind_speed.toFixed(1)} km/h</p>
                      </div>
                    </div>

                    {datosOpenWeather.alerts?.length ? (
                      <div className="mt-4 rounded-lg bg-[color:var(--cm-surface-2)] p-4">
                        <p className="text-xs font-semibold">Alertas</p>
                        {datosOpenWeather.alerts.map((alerta, indice) => (
                          <div key={indice} className="mt-2">
                            <p className="text-sm font-semibold">{alerta.event}</p>
                            <p className="text-xs text-[color:var(--cm-text-muted)]">{alerta.sender_name}</p>
                            <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">{alerta.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
