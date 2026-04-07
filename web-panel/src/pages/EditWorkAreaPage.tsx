import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Circle, CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";

type TipoArea = "CIRCLE" | "POLYGON";

type IncidenteOpcion = {
  id: string;
  name: string;
};

type RespuestaAreaTrabajo = {
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

const CENTRO_INICIAL: LatLngTuple = [40.4168, -3.7038];

function esLatLngValido(latitud: number, longitud: number) {
  return latitud >= -90 && latitud <= 90 && longitud >= -180 && longitud <= 180;
}

function parsearPunto(valor: unknown): LatLngTuple | null {
  if (!valor) return null;

  if (Array.isArray(valor) && valor.length >= 2) {
    const longitud = Number(valor[0]);
    const latitud = Number(valor[1]);
    if (!Number.isNaN(latitud) && !Number.isNaN(longitud) && esLatLngValido(latitud, longitud)) {
      return [latitud, longitud];
    }
  }

  if (typeof valor === "object") {
    const candidato = valor as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(candidato.coordinates) && candidato.coordinates.length >= 2) {
      const longitud = Number(candidato.coordinates[0]);
      const latitud = Number(candidato.coordinates[1]);
      if (!Number.isNaN(latitud) && !Number.isNaN(longitud) && esLatLngValido(latitud, longitud)) {
        return [latitud, longitud];
      }
    }

    if (candidato.x !== undefined && candidato.y !== undefined) {
      const longitud = Number(candidato.x);
      const latitud = Number(candidato.y);
      if (!Number.isNaN(latitud) && !Number.isNaN(longitud) && esLatLngValido(latitud, longitud)) {
        return [latitud, longitud];
      }
    }
  }

  if (typeof valor === "string") {
    const coincidencia = valor.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (coincidencia) {
      const longitud = Number(coincidencia[1]);
      const latitud = Number(coincidencia[3]);
      if (!Number.isNaN(latitud) && !Number.isNaN(longitud) && esLatLngValido(latitud, longitud)) {
        return [latitud, longitud];
      }
    }
  }

  return null;
}

function parsearPoligono(valor: unknown): LatLngTuple[] {
  if (!valor) return [];

  const extraerAnillo = (anillo: unknown[]): LatLngTuple[] =>
    anillo
      .map((punto) => {
        if (!Array.isArray(punto) || punto.length < 2) return null;
        const longitud = Number(punto[0]);
        const latitud = Number(punto[1]);
        if (Number.isNaN(latitud) || Number.isNaN(longitud) || !esLatLngValido(latitud, longitud)) return null;
        return [latitud, longitud] as LatLngTuple;
      })
      .filter((punto): punto is LatLngTuple => Boolean(punto));

  if (Array.isArray(valor) && valor.length > 0) {
    if (Array.isArray(valor[0]) && Array.isArray((valor[0] as unknown[])[0])) {
      return extraerAnillo(valor[0] as unknown[]);
    }
    return extraerAnillo(valor as unknown[]);
  }

  if (typeof valor === "object") {
    const candidato = valor as { coordinates?: unknown };
    if (Array.isArray(candidato.coordinates)) {
      return parsearPoligono(candidato.coordinates);
    }
  }

  if (typeof valor === "string") {
    const coincidencia = valor.match(/POLYGON\s*\(\((.+)\)\)/i);
    if (!coincidencia) return [];

    return coincidencia[1]
      .split(",")
      .map((par) => par.trim().split(/\s+/))
      .map((partes) => {
        if (partes.length < 2) return null;
        const longitud = Number(partes[0]);
        const latitud = Number(partes[1]);
        if (Number.isNaN(latitud) || Number.isNaN(longitud) || !esLatLngValido(latitud, longitud)) return null;
        return [latitud, longitud] as LatLngTuple;
      })
      .filter((punto): punto is LatLngTuple => Boolean(punto));
  }

  return [];
}

function normalizarIncidentes(respuesta: unknown): IncidenteOpcion[] {
  const origen = Array.isArray(respuesta) ? respuesta : (respuesta as { results?: unknown[] } | null)?.results ?? [];
  return origen
    .map((item) => {
      const fila = item as Record<string, unknown>;
      return {
        id: String(fila.id ?? ""),
        name: String(fila.name ?? ""),
      };
    })
    .filter((incidente) => incidente.id && incidente.name);
}

function formatearFecha(valor?: string | null) {
  if (!valor) return "No disponible";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerPuntoEnfoque(tipoArea: TipoArea, centro: LatLngTuple | null, puntosPoligono: LatLngTuple[]) {
  if (tipoArea === "CIRCLE" && centro) return centro;
  if (puntosPoligono.length === 0) return null;

  const acumulado = puntosPoligono.reduce(
    (valor, punto) => ({
      latitud: valor.latitud + punto[0],
      longitud: valor.longitud + punto[1],
    }),
    { latitud: 0, longitud: 0 }
  );

  return [acumulado.latitud / puntosPoligono.length, acumulado.longitud / puntosPoligono.length] as LatLngTuple;
}

function EventosDibujoMapa({
  tipoArea,
  edicionDesbloqueada,
  alCambiarCentro,
  alAgregarPuntoPoligono,
}: {
  tipoArea: TipoArea;
  edicionDesbloqueada: boolean;
  alCambiarCentro: (punto: LatLngTuple) => void;
  alAgregarPuntoPoligono: (punto: LatLngTuple) => void;
}) {
  useMapEvents({
    click(evento) {
      if (!edicionDesbloqueada) return;
      const punto: LatLngTuple = [evento.latlng.lat, evento.latlng.lng];
      if (tipoArea === "CIRCLE") {
        alCambiarCentro(punto);
        return;
      }
      alAgregarPuntoPoligono(punto);
    },
  });

  return null;
}

function AjusteMapa({
  tipoArea,
  centroCirculo,
  puntosPoligono,
}: {
  tipoArea: TipoArea;
  centroCirculo: LatLngTuple | null;
  puntosPoligono: LatLngTuple[];
}) {
  const mapa = useMap();

  useEffect(() => {
    if (tipoArea === "CIRCLE" && centroCirculo) {
      mapa.setView(centroCirculo, 15, { animate: true });
      return;
    }

    if (tipoArea === "POLYGON" && puntosPoligono.length > 0) {
      if (puntosPoligono.length === 1) {
        mapa.setView(puntosPoligono[0], 15, { animate: true });
        return;
      }
      mapa.fitBounds(puntosPoligono as LatLngBoundsExpression, { padding: [28, 28], animate: true });
    }
  }, [tipoArea, centroCirculo, puntosPoligono, mapa]);

  return null;
}

export default function EditWorkAreaPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [edicionDesbloqueada, setEdicionDesbloqueada] = useState(false);

  const [incidentes, setIncidentes] = useState<IncidenteOpcion[]>([]);
  const [incidenteId, setIncidenteId] = useState("");
  const [nombreArea, setNombreArea] = useState("");
  const [tipoArea, setTipoArea] = useState<TipoArea>("CIRCLE");
  const [radioMetros, setRadioMetros] = useState("250");
  const [activa, setActiva] = useState(true);
  const [centroCirculo, setCentroCirculo] = useState<LatLngTuple | null>(null);
  const [puntosPoligono, setPuntosPoligono] = useState<LatLngTuple[]>([]);
  const [fechaCreacion, setFechaCreacion] = useState<string | null>(null);
  const [nombreIncidente, setNombreIncidente] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Area de trabajo no valida.");
        setCargando(false);
        return;
      }

      try {
        const [respuestaIncidentes, respuestaArea] = await Promise.all([
          apiFetch("/incidents/"),
          apiFetch(`/workareas/${id}/`),
        ]);

        if (!respuestaIncidentes.ok || !respuestaArea.ok) {
          setError("No se pudo cargar el area de trabajo.");
          setCargando(false);
          return;
        }

        const datosIncidentes = await respuestaIncidentes.json();
        const listaIncidentes = normalizarIncidentes(datosIncidentes);
        const area = (await respuestaArea.json()) as RespuestaAreaTrabajo;

        const centro = area.center_lat != null && area.center_lng != null
          ? ([area.center_lat, area.center_lng] as LatLngTuple)
          : parsearPunto(area.center);
        const poligono = parsearPoligono(area.polygon_coordinates ?? area.polygon);

        setIncidentes(listaIncidentes);
        setIncidenteId(area.incident ?? "");
        setNombreArea(area.name ?? "");
        setTipoArea(area.area_type === "POLYGON" ? "POLYGON" : "CIRCLE");
        setRadioMetros(area.radius_m != null ? String(area.radius_m) : "250");
        setActiva(Boolean(area.active));
        setCentroCirculo(centro);
        setPuntosPoligono(poligono);
        setFechaCreacion(area.created_at ?? null);
        setNombreIncidente(area.incident_name ?? "");
      } catch {
        setError("Error de red al cargar el area de trabajo.");
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  const incidenteSeleccionado = useMemo(
    () => incidentes.find((incidente) => incidente.id === incidenteId)?.name ?? nombreIncidente,
    [incidenteId, incidentes, nombreIncidente]
  );
  const puntoEnfoque = useMemo(
    () => obtenerPuntoEnfoque(tipoArea, centroCirculo, puntosPoligono),
    [tipoArea, centroCirculo, puntosPoligono]
  );
  const poligonoListo = puntosPoligono.length >= 3;

  function manejarCambioTipoArea(nuevoTipo: TipoArea) {
    setTipoArea(nuevoTipo);
    if (nuevoTipo === "CIRCLE") {
      setPuntosPoligono([]);
      return;
    }
    setCentroCirculo(null);
  }

  async function manejarGuardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!id) {
      setError("Area de trabajo no valida.");
      return;
    }

    setError("");
    setExito("");

    if (!incidenteId) {
      setError("Debes seleccionar un incidente.");
      return;
    }

    if (!nombreArea.trim()) {
      setError("Debes indicar un nombre para el area.");
      return;
    }

    const radioParseado = radioMetros.trim() ? Number(radioMetros) : NaN;
    const datosArea: Record<string, unknown> = {
      incident: incidenteId,
      name: nombreArea.trim(),
      area_type: tipoArea,
      active: activa,
    };

    if (tipoArea === "CIRCLE") {
      if (!centroCirculo) {
        setError("Marca el centro del circulo en el mapa.");
        return;
      }
      if (Number.isNaN(radioParseado) || radioParseado <= 0) {
        setError("El radio debe ser mayor que 0 metros.");
        return;
      }

      datosArea.center_lat = centroCirculo[0];
      datosArea.center_lng = centroCirculo[1];
      datosArea.radius_m = radioParseado;
    }

    if (tipoArea === "POLYGON") {
      if (!poligonoListo) {
        setError("Debes marcar al menos 3 puntos para el poligono.");
        return;
      }
      datosArea.polygon_points = puntosPoligono.map(([latitud, longitud]) => [latitud, longitud]);
    }

    setGuardando(true);
    try {
      const respuesta = await apiFetch(`/workareas/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosArea),
      });

      if (!respuesta.ok) {
        let detalle = "No se pudo guardar el area de trabajo.";
        try {
          const datosError = (await respuesta.json()) as Record<string, unknown>;
          if (typeof datosError.detail === "string") {
            detalle = datosError.detail;
          } else {
            const primeraClave = Object.keys(datosError)[0];
            if (primeraClave) {
              const valor = datosError[primeraClave];
              detalle = Array.isArray(valor) ? `${primeraClave}: ${String(valor[0])}` : `${primeraClave}: ${String(valor)}`;
            }
          }
        } catch {
          // usamos el mensaje por defecto
        }
        setError(detalle);
        return;
      }

      const areaActualizada = (await respuesta.json()) as RespuestaAreaTrabajo;
      const centroActualizado = areaActualizada.center_lat != null && areaActualizada.center_lng != null
        ? ([areaActualizada.center_lat, areaActualizada.center_lng] as LatLngTuple)
        : parsearPunto(areaActualizada.center);
      const poligonoActualizado = parsearPoligono(areaActualizada.polygon_coordinates ?? areaActualizada.polygon);

      setIncidenteId(areaActualizada.incident ?? incidenteId);
      setNombreArea(areaActualizada.name ?? nombreArea);
      setTipoArea(areaActualizada.area_type === "POLYGON" ? "POLYGON" : "CIRCLE");
      setRadioMetros(areaActualizada.radius_m != null ? String(areaActualizada.radius_m) : "250");
      setActiva(Boolean(areaActualizada.active));
      setCentroCirculo(centroActualizado);
      setPuntosPoligono(poligonoActualizado);
      setFechaCreacion(areaActualizada.created_at ?? fechaCreacion);
      setNombreIncidente(areaActualizada.incident_name ?? incidenteSeleccionado);
      setExito("Area de trabajo guardada correctamente.");
      setEdicionDesbloqueada(false);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando area de trabajo...</p>
      </div>
    );
  }

  return (
    <form onSubmit={manejarGuardar}>
      <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Work Areas</p>
            <h1 className="mt-1 text-2xl font-bold">Editar area de trabajo</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Revisa, ajusta y guarda la configuracion geografica del area seleccionada.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/workarea")}
            className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
          >
            Volver a areas
          </button>
        </div>

        {error ? <div className="mt-4 cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}
        {exito ? <div className="mt-4 cm-badge-success rounded-xl p-3 text-sm">{exito}</div> : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Identificacion</p>
                <h2 className="mt-2 text-xl font-bold">Datos principales</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Nombre del area</label>
                  <input
                    value={nombreArea}
                    disabled={!edicionDesbloqueada}
                    onChange={(evento) => setNombreArea(evento.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Perimetro operativo norte"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Incidente relacionado</label>
                  <div className="flex items-stretch gap-2">
                    <select
                      value={incidenteId}
                      disabled={!edicionDesbloqueada}
                      onChange={(evento) => setIncidenteId(evento.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    >
                      <option value="">Selecciona un incidente</option>
                      {incidentes.map((incidente) => (
                        <option key={incidente.id} value={incidente.id}>
                          {incidente.name}
                        </option>
                      ))}
                    </select>
                    {incidenteId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/editIncident/${incidenteId}`)}
                        className="shrink-0 rounded-lg bg-[color:var(--cm-info)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--cm-info-hover)]"
                      >
                        Abrir
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Tipo de area</label>
                  <select
                    value={tipoArea}
                    disabled={!edicionDesbloqueada}
                    onChange={(evento) => manejarCambioTipoArea(evento.target.value as TipoArea)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="CIRCLE">Circulo</option>
                    <option value="POLYGON">Poligono</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Estado</label>
                  <label className="mt-2 inline-flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={activa}
                      disabled={!edicionDesbloqueada}
                      onChange={(evento) => setActiva(evento.target.checked)}
                      className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"
                    />
                    Area activa
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Radio en metros</label>
                  <input
                    value={radioMetros}
                    disabled={!edicionDesbloqueada || tipoArea !== "CIRCLE"}
                    onChange={(evento) => setRadioMetros(evento.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)] disabled:opacity-60"
                    placeholder="250"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Geometria</p>
                <h2 className="mt-2 text-xl font-bold">Mapa editable</h2>
                <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                  {tipoArea === "CIRCLE"
                    ? "Haz clic en el mapa para recolocar el centro del circulo."
                    : "Haz clic en el mapa para agregar vertices al poligono."}
                </p>
              </div>

              {tipoArea === "POLYGON" ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!edicionDesbloqueada || puntosPoligono.length === 0}
                    onClick={() => setPuntosPoligono((actual) => actual.slice(0, -1))}
                    className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2 text-sm transition hover:border-[color:var(--cm-info)] disabled:opacity-50"
                  >
                    Eliminar ultimo punto
                  </button>
                  <button
                    type="button"
                    disabled={!edicionDesbloqueada || puntosPoligono.length === 0}
                    onClick={() => setPuntosPoligono([])}
                    className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-2 text-sm transition hover:border-[color:var(--cm-info)] disabled:opacity-50"
                  >
                    Limpiar poligono
                  </button>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-[color:var(--cm-border)]">
                <MapContainer center={puntoEnfoque ?? CENTRO_INICIAL} zoom={13} scrollWheelZoom style={{ height: "520px", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <EventosDibujoMapa
                    tipoArea={tipoArea}
                    edicionDesbloqueada={edicionDesbloqueada}
                    alCambiarCentro={setCentroCirculo}
                    alAgregarPuntoPoligono={(punto) => setPuntosPoligono((actual) => [...actual, punto])}
                  />
                  <AjusteMapa tipoArea={tipoArea} centroCirculo={centroCirculo} puntosPoligono={puntosPoligono} />

                  {centroCirculo ? (
                    <CircleMarker center={centroCirculo} radius={8} pathOptions={{ color: "#f97316", fillColor: "#fb923c", fillOpacity: 1 }} />
                  ) : null}

                  {tipoArea === "CIRCLE" && centroCirculo && Number(radioMetros) > 0 ? (
                    <Circle
                      center={centroCirculo}
                      radius={Number(radioMetros)}
                      pathOptions={{ color: "#ef4444", fillColor: "#f97316", fillOpacity: 0.22, weight: 3 }}
                    />
                  ) : null}

                  {puntosPoligono.map((punto, indice) => (
                    <CircleMarker
                      key={`${punto[0]}-${punto[1]}-${indice}`}
                      center={punto}
                      radius={6}
                      pathOptions={{ color: "#0891b2", fillColor: "#22d3ee", fillOpacity: 1 }}
                    />
                  ))}

                  {tipoArea === "POLYGON" && puntosPoligono.length === 2 ? (
                    <Polyline positions={puntosPoligono} pathOptions={{ color: "#06b6d4", weight: 3 }} />
                  ) : null}

                  {tipoArea === "POLYGON" && poligonoListo ? (
                    <Polygon positions={puntosPoligono} pathOptions={{ color: "#06b6d4", fillColor: "#22d3ee", fillOpacity: 0.2, weight: 3 }} />
                  ) : null}
                </MapContainer>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Resumen</p>
              <h2 className="mt-2 text-lg font-bold">Lectura rapida</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Area</p>
                  <p className="mt-1 font-medium">{nombreArea || "Sin nombre"}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Incidente</p>
                  <p className="mt-1 font-medium">{incidenteSeleccionado || "Sin incidente"}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Tipo</p>
                  <p className="mt-1 font-medium">{tipoArea === "CIRCLE" ? "Circulo" : "Poligono"}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Creada</p>
                  <p className="mt-1 font-medium">{formatearFecha(fechaCreacion)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Posicion</p>
              <h2 className="mt-2 text-lg font-bold">Referencia geografica</h2>

              <div className="mt-4 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Centro</p>
                <p className="mt-1 font-medium">
                  {centroCirculo ? `${centroCirculo[0].toFixed(6)}, ${centroCirculo[1].toFixed(6)}` : "Sin centro definido"}
                </p>
              </div>
              <div className="mt-3 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Vertices del poligono</p>
                <p className="mt-1 font-medium">{puntosPoligono.length}</p>
              </div>
              <div className="mt-3 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Radio</p>
                <p className="mt-1 font-medium">{tipoArea === "CIRCLE" ? `${radioMetros || "0"} m` : "No aplica"}</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-info)]/40 bg-gradient-to-r from-[color:var(--cm-info)] to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,182,212,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-info)]/50"
            onClick={() => setEdicionDesbloqueada((valor) => !valor)}
          >
            {edicionDesbloqueada ? "Bloquear edicion" : "Desbloquear edicion"}
          </button>

          <button
            type="submit"
            disabled={!edicionDesbloqueada || guardando}
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/50 disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
