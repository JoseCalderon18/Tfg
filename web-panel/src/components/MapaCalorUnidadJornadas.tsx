import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";

type JornadaApi = {
  id: number;
  user?: string | null;
  account_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location_start?: unknown;
  location_stop?: unknown;
  notes?: unknown;
};

type JornadaUnidad = JornadaApi & {
  inicioCoords: LatLngTuple | null;
  descansoCoords: LatLngTuple | null;
  notasTexto: string;
};

type PuntoCalor = {
  coords: LatLngTuple;
  intensidad: number;
  tipo: "inicio" | "paso" | "descanso" | "actual";
};

type MapaCalorUnidadJornadasProps = {
  unidadId?: string;
  nombreUnidad?: string;
  posicionActual?: LatLngTuple | null;
};

function esLatLngValido(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function normalizarArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { results?: unknown }).results)) {
    return (raw as { results: T[] }).results;
  }
  return [];
}

function extraerPunto(value: unknown): LatLngTuple | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const lng = Number(candidate.coordinates[0]);
      const lat = Number(candidate.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const lng = Number(candidate.x);
      const lat = Number(candidate.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }
  }

  if (typeof value === "string") {
    const match = value.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && esLatLngValido(lat, lng)) return [lat, lng];
    }
  }

  return null;
}

function normalizarNotas(notes: unknown) {
  if (!notes) return "";
  if (typeof notes === "string") return notes.trim();
  if (Array.isArray(notes)) return notes.map((note) => String(note).trim()).filter(Boolean).join("\n");
  if (typeof notes === "object") return JSON.stringify(notes, null, 2);
  return String(notes).trim();
}

function normalizarJornadas(payload: unknown, unidadId?: string): JornadaUnidad[] {
  return normalizarArray<JornadaApi>(payload)
    .filter((jornada) => typeof jornada.id === "number")
    .filter((jornada) => !unidadId || !jornada.account_user_id || String(jornada.account_user_id) === String(unidadId))
    .map((jornada) => ({
      ...jornada,
      inicioCoords: extraerPunto(jornada.location_start),
      descansoCoords: extraerPunto(jornada.location_stop),
      notasTexto: normalizarNotas(jornada.notes),
    }));
}

function formatearFecha(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function interpolarTramo(inicio: LatLngTuple, fin: LatLngTuple, pasos = 7): PuntoCalor[] {
  return Array.from({ length: pasos }, (_, index) => {
    const factor = (index + 1) / (pasos + 1);
    return {
      coords: [inicio[0] + (fin[0] - inicio[0]) * factor, inicio[1] + (fin[1] - inicio[1]) * factor] as LatLngTuple,
      intensidad: 0.3,
      tipo: "paso" as const,
    };
  });
}

function construirPuntosCalor(jornadas: JornadaUnidad[], posicionActual?: LatLngTuple | null) {
  const puntos: PuntoCalor[] = [];

  jornadas.forEach((jornada) => {
    if (jornada.inicioCoords) {
      puntos.push({ coords: jornada.inicioCoords, intensidad: 0.6, tipo: "inicio" });
    }
    if (jornada.descansoCoords) {
      puntos.push({ coords: jornada.descansoCoords, intensidad: 0.95, tipo: "descanso" });
    }
    if (jornada.inicioCoords && jornada.descansoCoords) {
      puntos.push(...interpolarTramo(jornada.inicioCoords, jornada.descansoCoords));
    }
  });

  if (posicionActual) {
    puntos.push({ coords: posicionActual, intensidad: 0.75, tipo: "actual" });
  }

  return puntos;
}

function obtenerColorCalor(tipo: PuntoCalor["tipo"], alpha: number) {
  const colores: Record<PuntoCalor["tipo"], [number, number, number]> = {
    inicio: [34, 197, 94],
    paso: [249, 115, 22],
    descanso: [59, 130, 246],
    actual: [244, 63, 94],
  };
  const [r, g, b] = colores[tipo];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function CapaCalorCanvas({ puntos }: { puntos: PuntoCalor[] }) {
  const map = useMap();

  useEffect(() => {
    const canvas = L.DomUtil.create("canvas", "leaflet-unit-heatmap-layer") as HTMLCanvasElement;
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.mixBlendMode = "screen";

    const pane = map.getPanes().overlayPane;
    pane.appendChild(canvas);

    const pintar = () => {
      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
      canvas.width = size.x;
      canvas.height = size.y;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, size.x, size.y);
      puntos.forEach((punto) => {
        const layerPoint = map.latLngToLayerPoint(punto.coords);
        const x = layerPoint.x - topLeft.x;
        const y = layerPoint.y - topLeft.y;
        const radio = 34 + punto.intensidad * 34;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radio);
        gradient.addColorStop(0, obtenerColorCalor(punto.tipo, 0.46 * punto.intensidad));
        gradient.addColorStop(0.45, obtenerColorCalor(punto.tipo, 0.2 * punto.intensidad));
        gradient.addColorStop(1, obtenerColorCalor(punto.tipo, 0));
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radio, 0, Math.PI * 2);
        context.fill();
      });
    };

    pintar();
    map.on("move zoom resize moveend zoomend", pintar);

    return () => {
      map.off("move zoom resize moveend zoomend", pintar);
      canvas.remove();
    };
  }, [map, puntos]);

  return null;
}

function AjustarMapa({ puntos }: { puntos: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => {
      map.invalidateSize();
      if (puntos.length === 1) {
        map.setView(puntos[0], 13);
      } else if (puntos.length > 1) {
        map.fitBounds(L.latLngBounds(puntos), { padding: [24, 24], maxZoom: 13 });
      }
    }, 80);
  }, [map, puntos]);

  return null;
}

export default function MapaCalorUnidadJornadas({
  unidadId,
  nombreUnidad,
  posicionActual,
}: MapaCalorUnidadJornadasProps) {
  const [jornadas, setJornadas] = useState<JornadaUnidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarJornadas() {
      if (!unidadId) {
        setJornadas([]);
        setCargando(false);
        return;
      }

      setCargando(true);
      setError("");

      try {
        const response = await apiFetch(`/journeys/?account_user=${encodeURIComponent(unidadId)}`);
        if (!response.ok) {
          throw new Error("No se pudieron cargar las jornadas de la unidad.");
        }
        const data = await response.json();
        if (!cancelado) {
          setJornadas(normalizarJornadas(data, unidadId));
        }
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las jornadas de la unidad.");
          setJornadas([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarJornadas();

    return () => {
      cancelado = true;
    };
  }, [unidadId]);

  const puntosCalor = useMemo(() => construirPuntosCalor(jornadas, posicionActual), [jornadas, posicionActual]);
  const rutas = useMemo(
    () => jornadas.filter((jornada) => jornada.inicioCoords && jornada.descansoCoords).slice(0, 30),
    [jornadas],
  );
  const puntosMapa = useMemo(() => puntosCalor.map((punto) => punto.coords), [puntosCalor]);
  const centroMapa = puntosMapa[0] ?? posicionActual ?? ([40.4168, -3.7038] as LatLngTuple);
  const jornadasFinalizadas = jornadas.filter((jornada) => Boolean(jornada.end_date)).length;
  const zonasDescanso = jornadas.filter((jornada) => Boolean(jornada.descansoCoords)).length;
  const jornadasConRuta = rutas.length;

  if (cargando) {
    return (
      <div className="grid h-80 place-items-center rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] text-sm text-[color:var(--cm-text-muted)]">
        Cargando mapa de calor de jornadas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[color:var(--cm-danger)]/30 bg-[color:var(--cm-danger)]/10 p-4 text-sm text-[color:var(--cm-danger)]">
        {error}
      </div>
    );
  }

  if (puntosCalor.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-5 text-sm text-[color:var(--cm-text-muted)]">
        Esta unidad aun no tiene jornadas con ubicaciones de inicio o descanso.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <p className="text-lg font-bold text-[color:var(--cm-text)]">{jornadas.length}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">Jornadas</p>
        </div>
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <p className="text-lg font-bold text-[color:var(--cm-text)]">{zonasDescanso}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">Descansos</p>
        </div>
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <p className="text-lg font-bold text-[color:var(--cm-text)]">{jornadasConRuta}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">Rutas</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--cm-border)]">
        <MapContainer center={centroMapa} zoom={12} scrollWheelZoom={false} style={{ height: "360px", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CapaCalorCanvas puntos={puntosCalor} />
          <AjustarMapa puntos={puntosMapa} />

          {rutas.map((jornada) => (
            <Polyline
              key={`ruta-${jornada.id}`}
              positions={[jornada.inicioCoords as LatLngTuple, jornada.descansoCoords as LatLngTuple]}
              pathOptions={{ color: "#f97316", weight: 2, opacity: 0.45, dashArray: "6 8" }}
            />
          ))}

          {jornadas.slice(0, 18).map((jornada) => (
            <Fragment key={`jornada-${jornada.id}`}>
              {jornada.inicioCoords ? (
                <CircleMarker
                  center={jornada.inicioCoords}
                  radius={5}
                  pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.85, weight: 2 }}
                >
                  <Popup>
                    <strong>Inicio jornada #{jornada.id}</strong>
                    <br />
                    {formatearFecha(jornada.start_date)}
                    {jornada.notasTexto ? (
                      <>
                        <br />
                        {jornada.notasTexto}
                      </>
                    ) : null}
                  </Popup>
                </CircleMarker>
              ) : null}

              {jornada.descansoCoords ? (
                <CircleMarker
                  center={jornada.descansoCoords}
                  radius={6}
                  pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <strong>Descanso / fin jornada #{jornada.id}</strong>
                    <br />
                    {formatearFecha(jornada.end_date)}
                  </Popup>
                </CircleMarker>
              ) : null}
            </Fragment>
          ))}

          {posicionActual ? (
            <CircleMarker
              center={posicionActual}
              radius={7}
              pathOptions={{ color: "#f43f5e", fillColor: "#f43f5e", fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>Posicion actual de {nombreUnidad || "la unidad"}</Popup>
            </CircleMarker>
          ) : null}
        </MapContainer>
      </div>

      <div className="grid gap-2 text-xs text-[color:var(--cm-text-muted)] sm:grid-cols-2">
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <span className="font-semibold text-emerald-400">Verde:</span> inicio de jornada.
        </div>
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <span className="font-semibold text-blue-400">Azul:</span> descanso o fin de jornada.
        </div>
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <span className="font-semibold text-orange-400">Naranja:</span> paso estimado entre inicio y fin.
        </div>
        <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-3 py-2">
          <span className="font-semibold text-rose-400">Rojo:</span> posicion actual.
        </div>
      </div>

      <p className="text-xs leading-5 text-[color:var(--cm-text-muted)]">
        Mapa calculado con {jornadasFinalizadas} jornadas finalizadas. 
      </p>
    </div>
  );
}
