import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBanner, FormActions, FormSection, LoadingState, PageHeader, SuccessBanner } from "../components/ui";
import { apiFetch } from "../utils/api";
import TourButton from "../components/TourGuide";

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
  { value: "TRIAGE", label: "En evaluación" },
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
      setErrorMensaje("Debes enviar latitud y longitud juntas, o dejar ambas vacías.");
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
    return <LoadingState />;
  }

  return (
    <div className="cm-shell cm-page">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Operaciones · Supervisores"
          title="Crear nuevo incidente"
          description="Completa la información operativa para registrar el incidente."
          actions={
            <div className="flex items-center gap-2">
              <TourButton
                steps={[
                  {
                    selector: '[data-tour="create-incident-form"]',
                    title: "Formulario de incidente",
                    description: "Rellena los campos para registrar el incidente: nombre, tipo de emergencia (incendio, rescate, médico…), estado inicial, descripción y ubicación. Todos los campos marcados son obligatorios. Pulsa Guardar cuando hayas completado el formulario.",
                  },
                ]}
              />
              <button type="button" onClick={() => navegar("/incidents")} className="cm-btn cm-btn-secondary">
                Volver
              </button>
            </div>
          }
        />

        {errorMensaje ? <ErrorBanner message={errorMensaje} /> : null}
        {mensajeExito ? <SuccessBanner message={mensajeExito} /> : null}

        <form data-tour="create-incident-form" onSubmit={manejarEnvio} className="space-y-5">
          <FormSection title="Datos del incidente" description="Información mínima para identificar y clasificar la emergencia.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="cm-field-label">Nombre del incidente</label>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className="cm-input"
                  placeholder="Forest Fire - Zone A"
                  required
                />
              </div>

              <div>
                <label className="cm-field-label">Tipo de incidente</label>
                <select
                  value={tipoIncidente}
                  onChange={(event) => setTipoIncidente(event.target.value as TipoIncidente)}
                  className="cm-select"
                >
                  {opcionesTipoIncidente.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="cm-field-label">Estado inicial</label>
                <select
                  value={estado}
                  onChange={(event) => setEstado(event.target.value as EstadoIncidente)}
                  className="cm-select"
                >
                  {opcionesEstado.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="cm-field-label">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={4}
                  className="cm-textarea"
                  placeholder="Describe situación, riesgos y alcance."
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Ubicación" description="Dirección visible y coordenadas opcionales para ubicar el incidente.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="cm-field-label">Dirección / ubicación textual</label>
                <input
                  value={direccionUbicacion}
                  onChange={(event) => setDireccionUbicacion(event.target.value)}
                  className="cm-input"
                  placeholder="Oakwood Forest, Zona A"
                />
              </div>

              <div>
                <label className="cm-field-label">Latitud</label>
                <input
                  value={latitud}
                  onChange={(event) => setLatitud(event.target.value)}
                  className="cm-input"
                  placeholder="40.4168"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="cm-field-label">Longitud</label>
                <input
                  value={longitud}
                  onChange={(event) => setLongitud(event.target.value)}
                  className="cm-input"
                  placeholder="-3.7038"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-bg)] p-3 text-xs text-[color:var(--cm-text-muted)]">
              {tieneCoordenadas
                ? "Se enviarán coordenadas geográficas para generar el Point en backend."
                : "Si no informas coordenadas, el incidente se guardará sin Point geográfico."}
            </div>
          </FormSection>

          <FormSection title="Organización responsable" description="Selecciona quién gestionará este incidente.">
            <label className="cm-field-label">Organización responsable</label>
            <select
              value={organizacionResponsable}
              onChange={(event) => setOrganizacionResponsable(event.target.value)}
              disabled={cargandoOrganizaciones}
              className="cm-select"
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
            {errorOrganizaciones ? <ErrorBanner message={errorOrganizaciones} className="mt-3" /> : null}
            {!cargandoOrganizaciones && !errorOrganizaciones && organizaciones.length === 0 ? (
              <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
                No hay organizaciones disponibles en la base de datos.
              </p>
            ) : null}
          </FormSection>

          <FormActions>
            <button type="button" onClick={() => navegar("/incidents")} className="cm-btn cm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="cm-btn cm-btn-primary">
              {enviando ? "Creando..." : "Crear incidente"}
            </button>
          </FormActions>
        </form>
      </div>
    </div>
  );
}
