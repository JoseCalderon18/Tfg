import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type Organizacion = {
  id: string;
  name: string;
};

type DatosIncidenteCrear = {
  name: string;
  incident_type: TipoIncidente;
  status: EstadoIncidente;
  description?: string;
  location_address?: string;
  latitude?: number;
  longitude?: number;
  owner_organization?: string;
};

type TipoIncidente =
  | "WILDFIRE"
  | "SEARCH"
  | "RESCUE"
  | "MEDICAL"
  | "NATURAL_DISASTER"
  | "OTHER";

type EstadoIncidente = "OPEN" | "TRIAGE" | "CLOSED";

const PUNTO_FINAL_CREAR_INCIDENTE = "/incidents/";
const PUNTO_FINAL_ORGANIZACIONES = "/organizations/";

const opcionesTipoIncidente: Array<{ value: TipoIncidente; label: string }> = [
  { value: "WILDFIRE", label: "Incendio forestal" },
  { value: "SEARCH", label: "Búsqueda de persona" },
  { value: "RESCUE", label: "Rescate" },
  { value: "MEDICAL", label: "Emergencia médica" },
  { value: "NATURAL_DISASTER", label: "Desastre natural" },
  { value: "OTHER", label: "Otro" },
];

const opcionesEstado: Array<{ value: EstadoIncidente; label: string }> = [
  { value: "OPEN", label: "Abierto" },
  { value: "TRIAGE", label: "En evaluacion" },
  { value: "CLOSED", label: "Cerrado" },
];

export default function CreateIncidentPage() {
  const navegar = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [cargandoOrganizaciones, setCargandoOrganizaciones] = useState(false);
  const [errorOrganizaciones, setErrorOrganizaciones] = useState("");

  const [nombre, setNombre] = useState("");
  const [tipoIncidente, setTipoIncidente] = useState<TipoIncidente>("WILDFIRE");
  const [estado, setEstado] = useState<EstadoIncidente>("OPEN");
  const [descripcion, setDescripcion] = useState("");
  const [direccionUbicacion, setDireccionUbicacion] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [organizacionResponsable, setOrganizacionResponsable] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  function normalizarOrganizaciones(raw: unknown): Organizacion[] {
    const source = Array.isArray(raw)
      ? raw
      : (raw as { results?: unknown[] } | null)?.results ?? [];

    return source
      .map((item) => {
        const row = item as Record<string, unknown>;
        const id = String(row.id ?? row.uuid ?? "");
        const name = String(row.name ?? row.nombre ?? row.title ?? "");
        return { id, name };
      })
      .filter((org) => org.id && org.name);
  }

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navegar("/login", { replace: true });
        return;
      }

      const me = (await meRes.json()) as RespuestaUsuario;
      if (!me.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      try {
        setCargandoOrganizaciones(true);
        setErrorOrganizaciones("");
        const orgRes = await apiFetch(PUNTO_FINAL_ORGANIZACIONES);
        if (orgRes.ok) {
          const data = (await orgRes.json()) as unknown;
          const lista = normalizarOrganizaciones(data);
          setOrganizaciones(lista);
        } else {
          let detail = `No se pudo cargar el listado de organizaciones (HTTP ${orgRes.status}).`;
          try {
            const data = (await orgRes.json()) as { detail?: string; error?: string };
            if (data?.detail) detail = `${detail} ${data.detail}`;
            else if (data?.error) detail = `${detail} ${data.error}`;
          } catch {
            // mantener el mensaje de fallback
          }
          setErrorOrganizaciones(detail);
        }
      } finally {
        setCargandoOrganizaciones(false);
        setCargando(false);
      }
    })();
  }, [navegar]);

  const tieneCoordenadas = useMemo(() => latitud.trim() !== "" || longitud.trim() !== "", [latitud, longitud]);

  async function manejarEnvio(event: FormEvent) {
    event.preventDefault();
    setErrorMensaje("");
    setMensajeExito("");

    if (!nombre.trim()) {
      setErrorMensaje("El nombre del incidente es obligatorio.");
      return;
    }

    if ((latitud.trim() && !longitud.trim()) || (!latitud.trim() && longitud.trim())) {
      setErrorMensaje("Debes enviar latitud y longitud juntas, o dejar ambas vacias.");
      return;
    }

    const latParseada = latitud.trim() ? Number(latitud) : undefined;
    const lonParseada = longitud.trim() ? Number(longitud) : undefined;

    if (latParseada !== undefined && Number.isNaN(latParseada)) {
      setErrorMensaje("La latitud no es válida.");
      return;
    }
    if (lonParseada !== undefined && Number.isNaN(lonParseada)) {
      setErrorMensaje("La longitud no es válida.");
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

    if (organizaciones.length === 0) {
      setErrorMensaje("No se puede crear un incidente sin cargar el listado de organizaciones. Intenta recargar la página.");
      return;
    }
    if (!organizacionResponsable) {
      setErrorMensaje("Debes seleccionar una organización responsable.");
      return;
    }




    const payload: DatosIncidenteCrear = {
      name: nombre.trim(),
      incident_type: tipoIncidente,
      status: estado,
      description: descripcion.trim() || undefined,
      location_address: direccionUbicacion.trim() || undefined,
      latitude: latParseada,
      longitude: lonParseada,
      owner_organization: organizacionResponsable,
    };


    setEnviando(true);
    try {
      const res = await apiFetch(PUNTO_FINAL_CREAR_INCIDENTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = "No se pudo crear el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          if (typeof data?.detail === "string") {
            detail = data.detail;
          } else {
            const firstKey = Object.keys(data ?? {})[0];
            if (firstKey) {
              const value = data[firstKey];
              detail = Array.isArray(value)
                ? `${firstKey}: ${String(value[0])}`
                : `${firstKey}: ${String(value)}`;
            }
          }
        } catch {
          // keep fallback
        }
        setErrorMensaje(detail);
        return;
      }

      setMensajeExito("Incidente creado correctamente.");
      setNombre("");
      setTipoIncidente("WILDFIRE");
      setEstado("OPEN");
      setDescripcion("");
      setDireccionUbicacion("");
      setLatitud("");
      setLongitud("");
      setOrganizacionResponsable("");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
          <p className="text-slate-300">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Operaciones · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Crear nuevo incidente</h1>
            <p className="mt-2 text-slate-300">Completa la información operativa para registrar el incidente.</p>
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
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {errorMensaje}
            </div>
          ) : null}
          {mensajeExito ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {mensajeExito}
            </div>
          ) : null}

          <form onSubmit={manejarEnvio} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre del incidente</label>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Forest Fire - Zone A"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de incidente</label>
                <select
                  value={tipoIncidente}
                  onChange={(event) => setTipoIncidente(event.target.value as TipoIncidente)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {opcionesTipoIncidente.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Estado inicial</label>
                <select
                  value={estado}
                  onChange={(event) => setEstado(event.target.value as EstadoIncidente)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {opcionesEstado.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Describe situacion, riesgos y alcance."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Dirección / ubicación textual</label>
                <input
                  value={direccionUbicacion}
                  onChange={(event) => setDireccionUbicacion(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Oakwood Forest, Zona A"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Latitud</label>
                <input
                  value={latitud}
                  onChange={(event) => setLatitud(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="40.4168"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Longitud</label>
                <input
                  value={longitud}
                  onChange={(event) => setLongitud(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="-3.7038"
                  inputMode="decimal"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Organización responsable</label>
                <select
                  value={organizacionResponsable}
                  onChange={(event) => setOrganizacionResponsable(event.target.value)}
                  disabled={cargandoOrganizaciones}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="" className="bg-slate-900">
                    {cargandoOrganizaciones ? "Cargando organizaciones..." : "Sin organización"}
                  </option>
                  {organizaciones.map((organization) => (
                    <option key={organization.id} value={organization.id} className="bg-slate-900">
                      {organization.name}
                    </option>
                  ))}
                </select>
                {errorOrganizaciones ? (
                  <p className="mt-1 text-xs text-amber-300">{errorOrganizaciones}</p>
                ) : null}
                {!cargandoOrganizaciones && !errorOrganizaciones && organizaciones.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">
                    No hay organizaciones disponibles en la base de datos.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
              {tieneCoordenadas
                ? "Se enviarán coordenadas geográficas para generar el Point en backend."
                : "Si no informas coordenadas, el incidente se guardará sin Point geográfico."}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navegar("/incidents")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
              >
                {enviando ? "Creando..." : "Crear incidente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
