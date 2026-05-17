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

type VistaMeteo = "wind" | "clouds" | "rain";

function construirWindyUrl(lat: number, lng: number, vista: VistaMeteo) {
  const search = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    zoom: "8",
    level: "surface",
    overlay: vista,
    product: "ecmwf",
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "true",
    type: "map",
    location: "coordinates",
    detail: "true",
    detailLat: String(lat),
    detailLon: String(lng),
    metricWind: "kmh",
    metricTemp: "C",
    radarRange: "-1",
  });

  return `https://embed.windy.com/embed2.html?${search.toString()}`;
}

function etiquetaVista(vista: VistaMeteo) {
  switch (vista) {
    case "clouds":
      return "Nubosidad";
    case "rain":
      return "Lluvia";
    default:
      return "Viento";
  }
}
function obtenerEtiquetaTipoIncidente(tipo: string) {
  switch (tipo) {
    case "SOS":
      return "SOS";
    case "SEARCH":
      return "Búsqueda";
    case "MEDICAL":
      return "Emergencia médica";
    case "WILDFIRE":
      return "Incendio forestal";
    case "NATURAL_DISASTER":
      return "Desastre natural";
    case "MAN_DOWN":
      return "Operativo caído";
    case "LOST":
      return "Operativo desorientado";
    case "GEOFENCE":
      return "Fuera de zona";
    case "ANOMALY":
      return "Anomalía";
    default:
      return "Otra";
  }
}

export default function WeatherPage() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [incidenteSeleccionadoId, setIncidenteSeleccionadoId] = useState<string | null>(null);
  const [vistaMeteo, setVistaMeteo] = useState<VistaMeteo>("wind");

  const incidenteSeleccionado = useMemo(
    () => incidentes.find((incidente) => incidente.id === incidenteSeleccionadoId) ?? incidentes[0],
    [incidentes, incidenteSeleccionadoId]
  );

  const ubicacion = useMemo(() => {
    const coordenadas = incidenteSeleccionado?.location?.coordinates;
    if (!coordenadas || coordenadas.length !== 2) return null;
    return { lat: coordenadas[1], lng: coordenadas[0] };
  }, [incidenteSeleccionado]);

  const mapaUrl = useMemo(() => {
    if (!ubicacion) return "";
    return construirWindyUrl(ubicacion.lat, ubicacion.lng, vistaMeteo);
  }, [ubicacion, vistaMeteo]);

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

  return (
    <div className="cm-shell min-h-screen">
      <div className="relative z-10 w-full px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Meteorología</p>
            <h1 className="text-2xl font-bold tracking-tight">Mapa meteorológico</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Visualización directa con Windy para viento, nubosidad y lluvia.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-1 text-xs shadow-lg">
            {(["wind", "clouds", "rain"] as VistaMeteo[]).map((vista) => (
              <button
                key={vista}
                type="button"
                onClick={() => setVistaMeteo(vista)}
                className={`rounded-full px-3 py-1.5 transition ${
                  vistaMeteo === vista ? "bg-[color:var(--cm-info)] text-white" : "text-[color:var(--cm-text-muted)] hover:text-[color:var(--cm-text)]"
                }`}
              >
                {etiquetaVista(vista)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[250px_1fr]">
          <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 xl:sticky xl:top-5 xl:h-[calc(100vh-7rem)] xl:overflow-hidden">
            <h2 className="text-base font-semibold">Incidentes</h2>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Selecciona un incidente para centrar el mapa meteorológico.
            </p>

            <div className="mt-4 max-h-[60vh] space-y-2 overflow-auto xl:max-h-[calc(100%-3.75rem)]">
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
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      incidente.id === incidenteSeleccionado?.id
                        ? "bg-[color:var(--cm-info)]/20 ring-1 ring-[color:var(--cm-info)]"
                        : "hover:bg-[color:var(--cm-info)]/10"
                    }`}
                  >
                    <p className="font-semibold leading-5">{incidente.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">
                      {incidente.incident_type} · {incidente.status}
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-4">
            {cargando ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
                  <span className="text-[color:var(--cm-text-muted)]">Preparando mapa meteorológico...</span>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <p className="text-sm text-[color:var(--cm-danger)]">{error}</p>
              </div>
            ) : !incidenteSeleccionado || !ubicacion ? (
              <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6">
                <p className="text-sm text-[color:var(--cm-text-muted)]">El incidente seleccionado no tiene coordenadas disponibles.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Incidente activo</p>
                    <h2 className="mt-1 text-2xl font-semibold">{incidenteSeleccionado.name}</h2>
                    <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
                      {incidenteSeleccionado.location_address || "Sin dirección disponible"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Vista activa</p>
                    <h3 className="mt-1 text-2xl font-semibold">{etiquetaVista(vistaMeteo)}</h3>
                    <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
                      Coordenadas {ubicacion.lat.toFixed(4)}, {ubicacion.lng.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-2xl">
                  <div className="flex flex-col gap-2 border-b border-[color:var(--cm-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">Windy</h3>
                    </div>
                  </div>

                  <div className="relative h-[74vh] min-h-[620px] w-full bg-slate-950">
                    <iframe title="Mapa meteorológico Windy" src={mapaUrl} className="h-full w-full" loading="lazy" />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Modo de uso</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--cm-text-muted)]">
                      Cambia entre viento, nubosidad y lluvia desde el selector superior. El visor se recentra automaticamente al cambiar de incidente.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado del incidente</p>
                    <p className="mt-2 text-lg font-semibold">
                      {incidenteSeleccionado.status === "OPEN" ? "Abierto" :
                      incidenteSeleccionado.status === "CLOSED" ? "Cerrado" : 
                      incidenteSeleccionado.status === "TRIAGE" ? "En evaluación" : incidenteSeleccionado.status}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">Tipo: 
                      {obtenerEtiquetaTipoIncidente(incidenteSeleccionado.incident_type)}
                      </p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
