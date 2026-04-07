import "leaflet/dist/leaflet.css";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type Organizacion = {
  id: string;
  name: string;
};

type TipoIncidente =
  | "WILDFIRE"
  | "SEARCH"
  | "RESCUE"
  | "MEDICAL"
  | "NATURAL_DISASTER"
  | "OTHER";

type EstadoIncidente = "OPEN" | "TRIAGE" | "CLOSED";

type DetalleIncidenteResponse = {
  id: string;
  name?: string | null;
  incident_type?: TipoIncidente | null;
  status?: EstadoIncidente | null;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  owner_organization?: string | { id?: string; name?: string } | null;
};

const opcionesTipoIncidente: Array<{ value: TipoIncidente; label: string }> = [
  { value: "WILDFIRE", label: "Incendio forestal" },
  { value: "SEARCH", label: "Busqueda de persona" },
  { value: "RESCUE", label: "Rescate" },
  { value: "MEDICAL", label: "Emergencia medica" },
  { value: "NATURAL_DISASTER", label: "Desastre natural" },
  { value: "OTHER", label: "Otro" },
];

const opcionesEstado: Array<{ value: EstadoIncidente; label: string }> = [
  { value: "OPEN", label: "Abierto" },
  { value: "TRIAGE", label: "En evaluacion" },
  { value: "CLOSED", label: "Cerrado" },
];

function extraerCoordenadas(location: unknown): LatLngTuple | null {
  // Tratamos de entender la ubicación de varias formas que puede venir
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lon = Number(location[0]);
    const lat = Number(location[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
  }

  if (typeof location === "object") {
    const obj = location as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lon = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }

    if (obj.x !== undefined && obj.y !== undefined) {
      const lon = Number(obj.x);
      const lat = Number(obj.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  if (typeof location === "string") {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  return null;
}

function normalizarOrganizaciones(raw: unknown): Organizacion[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];
  return source
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.uuid ?? "");
      const name = String(row.name ?? row.nombre ?? row.title ?? "");
      return { id, name };
    })
    .filter((org) => org.id && org.name);
}

function SelectorMapaEditable({
  coords,
  editable,
  onPick,
}: {
  coords: LatLngTuple | null;
  editable: boolean;
  onPick: (value: LatLngTuple) => void;
}) {
  useMapEvents({
    click(event) {
      if (!editable) return;
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return coords ? (
    <CircleMarker center={coords} radius={8} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.85 }} />
  ) : null;
}

export default function EditIncidentPage() {
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [exitoMensaje, setExitoMensaje] = useState("");

  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);

  const [nombre, setNombre] = useState("");
  const [tipoIncidente, setTipoIncidente] = useState<TipoIncidente>("WILDFIRE");
  const [estado, setEstado] = useState<EstadoIncidente>("OPEN");
  const [descripcion, setDescripcion] = useState("");
  const [direccionUbicacion, setDireccionUbicacion] = useState("");
  const [organizacionResponsable, setOrganizacionResponsable] = useState("");

  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [mapaEditable, setMapaEditable] = useState(false);

  const coordenadas = useMemo<LatLngTuple | null>(() => {
    const lat = Number(latitud);
    const lon = Number(longitud);
    if (!Number.isNaN(lat) && !Number.isNaN(lon) && latitud.trim() && longitud.trim()) {
      return [lat, lon];
    }
    return null;
  }, [latitud, longitud]);

  useEffect(() => {
    (async () => {
      if (!id) {
        setErrorMensaje("Incidente no valido.");
        setCargando(false);
        return;
      }

      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navegar("/login", { replace: true });
        return;
      }
      const meData = (await meRes.json()) as RespuestaUsuario;
      if (!meData.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      const [incidentRes, orgRes] = await Promise.all([apiFetch(`/incidents/${id}/`), apiFetch("/organizations/")]);

      if (!incidentRes.ok) {
        setErrorMensaje("No se pudo cargar el incidente.");
        setCargando(false);
        return;
      }

      const incident = (await incidentRes.json()) as DetalleIncidenteResponse;
      const listaOrganizaciones = orgRes.ok ? normalizarOrganizaciones((await orgRes.json()) as unknown) : [];
      setOrganizaciones(listaOrganizaciones);

      setNombre(String(incident.name ?? ""));

      const tipoInicial = opcionesTipoIncidente.find((opt) => opt.value === incident.incident_type)?.value ?? "WILDFIRE";
      setTipoIncidente(tipoInicial);

      const estadoInicial = opcionesEstado.find((opt) => opt.value === incident.status)?.value ?? "OPEN";
      setEstado(estadoInicial);

      setDescripcion(String(incident.description ?? ""));
      setDireccionUbicacion(String(incident.location_address ?? ""));

      const coordenadasIniciales = extraerCoordenadas(incident.location);
      setLatitud(coordenadasIniciales ? String(coordenadasIniciales[0]) : "");
      setLongitud(coordenadasIniciales ? String(coordenadasIniciales[1]) : "");

      const ownerRaw = incident.owner_organization;
      if (ownerRaw && typeof ownerRaw === "object" && ownerRaw.id) {
        setOrganizacionResponsable(ownerRaw.id);
      } else if (typeof ownerRaw === "string" && listaOrganizaciones.length > 0) {
        const match = listaOrganizaciones.find((org) => org.name.toLowerCase() === ownerRaw.toLowerCase());
        setOrganizacionResponsable(match?.id ?? "");
      }

      setCargando(false);
    })();
  }, [id, navegar]);

  function manejarSeleccionMapa(value: LatLngTuple) {
    setLatitud(value[0].toFixed(6));
    setLongitud(value[1].toFixed(6));
  }

  async function manejarEnvio(event: FormEvent) {
    event.preventDefault();
    if (!id) return;

    setErrorMensaje("");
    setExitoMensaje("");

    if (!nombre.trim()) {
      setErrorMensaje("El nombre del incidente es obligatorio.");
      return;
    }

    if ((latitud.trim() && !longitud.trim()) || (!latitud.trim() && longitud.trim())) {
      setErrorMensaje("Debes informar latitud y longitud juntas.");
      return;
    }

    const latParseada = latitud.trim() ? Number(latitud) : undefined;
    const lonParseada = longitud.trim() ? Number(longitud) : undefined;
    if (latParseada !== undefined && Number.isNaN(latParseada)) {
      setErrorMensaje("Latitud no valida.");
      return;
    }
    if (lonParseada !== undefined && Number.isNaN(lonParseada)) {
      setErrorMensaje("Longitud no valida.");
      return;
    }
    if (latParseada !== undefined && (latParseada < -90 || latParseada > 90)) {
      setErrorMensaje("La latitud debe estar entre -90 y 90.");
      return;
    }
    if (lonParseada !== undefined && (lonParseada < -180 || lonParseada > 180)) {
      setErrorMensaje("La longitud debe estar entre -180 y 180.");
      return;
    }

    const datosEnvio: Record<string, unknown> = {
      name: nombre.trim(),
      incident_type: tipoIncidente,
      status: estado,
      description: descripcion.trim() || null,
      location_address: direccionUbicacion.trim() || null,
      owner_organization: organizacionResponsable || null,
    };

    if (latParseada !== undefined && lonParseada !== undefined) {
      datosEnvio.location = `SRID=4326;POINT (${lonParseada} ${latParseada})`;
    } else {
      datosEnvio.location = null;
    }

    setGuardando(true);
    try {
      const res = await apiFetch(`/incidents/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosEnvio),
      });

      if (!res.ok) {
        let detail = "No se pudo actualizar el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else {
            const firstKey = Object.keys(data ?? {})[0];
            if (firstKey) {
              const value = data[firstKey];
              detail = Array.isArray(value) ? `${firstKey}: ${String(value[0])}` : `${firstKey}: ${String(value)}`;
            }
          }
        } catch {
          // Si no hay detalles claros, usamos el mensaje normal
        }
        setErrorMensaje(detail);
        return;
      }

      setExitoMensaje("Incidente actualizado correctamente.");
      setMapaEditable(false);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <p className="text-slate-300">Cargando incidente...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Operaciones · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Editar incidente</h1>
            <p className="mt-2 text-slate-300">Actualiza los datos del incidente y su localizacion.</p>
          </div>
          <button
            type="button"
            onClick={() => navegar("/incidents")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
          {errorMensaje ? (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{errorMensaje}</div>
          ) : null}
          {exitoMensaje ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {exitoMensaje}
            </div>
          ) : null}

          <form onSubmit={manejarEnvio} className="space-y-8">
  <section className="rounded-2xl bg-slate-950/30 p-5 ring-1 ring-slate-800">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-100">Información del incidente</h2>
      <p className="mt-1 text-sm text-slate-400">
        Datos principales, clasificación y estado operativo.
      </p>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-300">Nombre del incidente</label>
        <input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de incidente</label>
        <select
          value={tipoIncidente}
          onChange={(event) => {
            setTipoIncidente(event.target.value as TipoIncidente);
          }}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        >
          {opcionesTipoIncidente.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-slate-950/20 p-4 ring-1 ring-slate-800">
        <label className="mb-3 block text-sm font-medium text-slate-300">Estado</label>
        <div className="flex flex-col gap-2 text-sm text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado === "OPEN"}
              onChange={(event) => {
                if (event.target.checked) {
                  setEstado("OPEN");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            Abierto
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado === "CLOSED"}
              onChange={(event) => {
                if (event.target.checked) {
                  setEstado("CLOSED");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            Cerrado
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado === "TRIAGE"}
              onChange={(event) => {
                if (event.target.checked) {
                  setEstado("TRIAGE");
                }
              }}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
            />
            En evaluación
          </label>
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-300">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          rows={4}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
    </div>
  </section>

  <section className="rounded-2xl bg-slate-950/30 p-5 ring-1 ring-slate-800">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-100">Ubicación</h2>
      <p className="mt-1 text-sm text-slate-400">
        Dirección, coordenadas y localización en mapa.
      </p>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-300">Dirección / ubicación textual</label>
        <input
          value={direccionUbicacion}
          onChange={(event) => setDireccionUbicacion(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Latitud</label>
        <input
          value={latitud}
          onChange={(event) => setLatitud(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          inputMode="decimal"
          placeholder="40.4168"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">Longitud</label>
        <input
          value={longitud}
          onChange={(event) => setLongitud(event.target.value)}
          className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          inputMode="decimal"
          placeholder="-3.7038"
        />
      </div>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
      <div className="h-72 overflow-hidden rounded-xl ring-1 ring-slate-800">
        <MapContainer
          center={coordenadas ?? [40.4168, -3.7038]}
          zoom={coordenadas ? 13 : 6}
          scrollWheelZoom={mapaEditable}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SelectorMapaEditable coords={coordenadas} editable={mapaEditable} onPick={manejarSeleccionMapa} />
        </MapContainer>
      </div>

      <div className="flex flex-col justify-between rounded-xl bg-slate-950/40 p-4 ring-1 ring-slate-800">
        <div className="space-y-2 text-sm text-slate-300">
          <p className="font-medium text-slate-100">Ubicación del incidente</p>
          <p>
            {coordenadas
              ? `Latitud ${coordenadas[0].toFixed(6)} · Longitud ${coordenadas[1].toFixed(6)}`
              : "Sin coordenadas actuales."}
          </p>
          <p className="text-xs text-slate-400">
            {mapaEditable
              ? "Mapa desbloqueado: haz clic en una zona para fijar la ubicación."
              : "Mapa bloqueado: pulsa el botón para habilitar la selección por mapa."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMapaEditable((prev) => !prev)}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Editar ubicación en mapa
        </button>
      </div>
    </div>
  </section>

  <section className="rounded-2xl bg-slate-950/30 p-5 ring-1 ring-slate-800">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-100">Gestión</h2>
      <p className="mt-1 text-sm text-slate-400">
        Organización asignada y datos de administración.
      </p>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">Organización responsable</label>
      <select
        value={organizacionResponsable}
        onChange={(event) => setOrganizacionResponsable(event.target.value)}
        className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
      >
        <option value="" className="bg-slate-900">
          Sin organización
        </option>
        {organizaciones.map((organization) => (
          <option key={organization.id} value={organization.id} className="bg-slate-900">
            {organization.name}
          </option>
        ))}
      </select>
    </div>
  </section>

  <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-2 sm:flex-row sm:justify-end">
    <button
      type="button"
      onClick={() => navegar("/incidents")}
      className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
    >
      Cancelar
    </button>

    <button
      type="submit"
      disabled={guardando}
      className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
    >
      {guardando ? "Guardando..." : "Guardar cambios"}
    </button>
  </div>
</form>
        </div>
      </div>
    </div>
  );
}
