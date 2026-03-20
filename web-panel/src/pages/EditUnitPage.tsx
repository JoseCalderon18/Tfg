import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import MapaMiniUnidad from "../components/MapaMiniUnidad";


const OPCIONES_ROL = [
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERATIVE", label: "Operativo" },
];

const OPCIONES_ESTADO = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "EN_INCIDENTE", label: "En incidente" },
  { value: "DESCONECTADA", label: "Desconectada" },
  { value: "NO_DISPONIBLE", label: "No disponible" },
];

type RespuestaDetalleUnidad = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: "SUPERVISOR" | "OPERATIVE";
  is_active: boolean;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_notes?: string[];
  organization_id?: string;
  specialties?: string[];
  operative_schedule?: string;
  device_id?: string;
  assigned_supervisor_id?: string;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string;
};

type OpcionOrganizacion = {
  id: string;
  name: string;
};

type OpcionSupervisor = {
  id: string;
  username: string;
  display_name: string;
};

type OpcionDispositivo = {
  id: string;
  name: string;
  platform: string;
  user_id: string;
};

type RespuestaOpcionesFormulario = {
  organizations: OpcionOrganizacion[];
  supervisors: OpcionSupervisor[];
  devices: OpcionDispositivo[];
};

export default function EditUnitPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [nombreReal, setNombreReal] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("OPERATIVE");
  const [organizacion, setOrganizacion] = useState("");
  const [dispositivoAsignado, setDispositivoAsignado] = useState("");
  const [estadoOperativo, setEstadoOperativo] = useState("DISPONIBLE");
  const [incidenteActual, setIncidenteActual] = useState("");
  const [ultimaUbicacion, setUltimaUbicacion] = useState("");
  const [latitudUbicacionActual, setLatitudUbicacionActual] = useState<number | null>(null);
  const [longitudUbicacionActual, setLongitudUbicacionActual] = useState<number | null>(null);
  const [direccionLegible, setDireccionLegible] = useState("");
  const [especialidadPrincipal, setEspecialidadPrincipal] = useState("");
  const [horarioOperativo, setHorarioOperativo] = useState("");
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");
  const [notasOperativas, setNotasOperativas] = useState("");
  const [unidadActiva, setUnidadActiva] = useState(true);
  const [organizacionId, setOrganizacionId] = useState("");
  const [supervisorAsignadoId, setSupervisorAsignadoId] = useState("");
  const [dispositivoAsignadoId, setDispositivoAsignadoId] = useState("");
  const [opcionesFormulario, setOpcionesFormulario] = useState<RespuestaOpcionesFormulario>({
    organizations: [],
    supervisors: [],
    devices: [],
  });

  const resumenUnidad = useMemo(() => {
    return {
      etiquetaRol: OPCIONES_ROL.find((opcion) => opcion.value === rol)?.label ?? "Sin rol",
      etiquetaEstado:
        OPCIONES_ESTADO.find((opcion) => opcion.value === estadoOperativo)?.label ?? "Sin estado",
    };
  }, [rol, estadoOperativo]);

  const [edicionDesbloqueada, setEdicionDesbloqueada] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Unidad no valida.");
        setCargando(false);
        return;
      }

      try {
        const [respuestaOpciones, respuestaUnidad] = await Promise.all([
          apiFetch("/auth/panel/users/form-options/"),
          apiFetch(`/auth/panel/users/${id}/`),
        ]);

        if (!respuestaOpciones.ok || !respuestaUnidad.ok) {
          setError("No se pudieron cargar los datos de la unidad.");
          setCargando(false);
          return;
        }

        const opciones = (await respuestaOpciones.json()) as RespuestaOpcionesFormulario;
        const unidad = (await respuestaUnidad.json()) as RespuestaDetalleUnidad;
        setOpcionesFormulario(opciones);

        const organizacionEncontrada = (opciones.organizations ?? []).find(
          (opcion) => opcion.id === (unidad.organization_id ?? "")
        );
        const dispositivoEncontrado = (opciones.devices ?? []).find(
          (opcion) => opcion.id === (unidad.device_id ?? "")
        );

        setNombreUsuario(unidad.username ?? "");
        setNombreReal(`${unidad.first_name ?? ""} ${unidad.last_name ?? ""}`.trim());
        setCorreo(unidad.email ?? "");
        setTelefono(unidad.phone ?? "");
        setRol(unidad.role ?? "OPERATIVE");
        setOrganizacionId(unidad.organization_id ?? "");
        setSupervisorAsignadoId(unidad.assigned_supervisor_id ?? "");
        setDispositivoAsignadoId(unidad.device_id ?? "");
        setOrganizacion(organizacionEncontrada?.name ?? "");
        setDispositivoAsignado(
          dispositivoEncontrado ? `${dispositivoEncontrado.name} · ${dispositivoEncontrado.platform}` : ""
        );
        setEspecialidadPrincipal((unidad.specialties ?? [])[0] ?? "");
        setHorarioOperativo(unidad.operative_schedule ?? "");
        setLatitudUbicacionActual(unidad.location_lat ?? null);
        setLongitudUbicacionActual(unidad.location_lng ?? null);
        setDireccionLegible(unidad.location_address ?? "");
        setContactoEmergencia(unidad.emergency_contact ?? "");
        setTelefonoEmergencia(unidad.emergency_phone ?? "");
        setNotasOperativas((unidad.medical_notes ?? []).join("\n"));
        setUnidadActiva(Boolean(unidad.is_active));
      } catch {
        setError("Error de red al cargar la unidad.");
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  async function manejarGuardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!id) {
      setError("Unidad no valida.");
      return;
    }

    setError("");
    setExito("");
    setGuardando(true);

    try {
      const datosFormulario = new FormData();
      datosFormulario.append("username", nombreUsuario.trim());
      datosFormulario.append("email", correo.trim());
      datosFormulario.append("phone", telefono.trim());
      datosFormulario.append("role", rol);
      datosFormulario.append("is_active", String(unidadActiva));
      datosFormulario.append("emergency_contact", contactoEmergencia.trim());
      datosFormulario.append("emergency_phone", telefonoEmergencia.trim());
      datosFormulario.append("location_lat", latitudUbicacionActual?.toString() ?? "");
      datosFormulario.append("location_lng", longitudUbicacionActual?.toString() ?? "");
      datosFormulario.append(
        "medical_notes",
        JSON.stringify(
          notasOperativas
            .split("\n")
            .map((valor) => valor.trim())
            .filter(Boolean)
        )
      );
      datosFormulario.append("organization_id", organizacionId);
      datosFormulario.append(
        "specialties",
        JSON.stringify(
          [especialidadPrincipal]
            .map((valor) => valor.trim())
            .filter(Boolean)
        )
      );
      datosFormulario.append("operative_schedule", horarioOperativo.trim());
      datosFormulario.append("device_id", dispositivoAsignadoId);
      datosFormulario.append("assigned_supervisor_id", supervisorAsignadoId);

      const respuesta = await apiFetch(`/auth/panel/users/${id}/`, {
        method: "PATCH",
        body: datosFormulario,
      });

      if (!respuesta.ok) {
        let detalle = "No se pudo guardar la unidad.";
        try {
          const datosError = await respuesta.json();
          if (datosError?.detail) {
            detalle = String(datosError.detail);
          } else if (typeof datosError === "object" && datosError !== null) {
            const primeraClave = Object.keys(datosError)[0];
            if (primeraClave) {
              const valor = (datosError as Record<string, unknown>)[primeraClave];
              detalle = Array.isArray(valor)
                ? `${primeraClave}: ${String(valor[0])}`
                : `${primeraClave}: ${String(valor)}`;
            }
          }
        } catch {
          // Ignoramos errores de parseo para mostrar el mensaje por defecto.
        }
        setError(detalle);
        return;
      }

      const unidadActualizada = (await respuesta.json()) as RespuestaDetalleUnidad;
      const organizacionActualizada = (opcionesFormulario.organizations ?? []).find(
        (opcion) => opcion.id === (unidadActualizada.organization_id ?? "")
      );
      const dispositivoActualizado = (opcionesFormulario.devices ?? []).find(
        (opcion) => opcion.id === (unidadActualizada.device_id ?? "")
      );

      setNombreUsuario(unidadActualizada.username ?? "");
      setCorreo(unidadActualizada.email ?? "");
      setTelefono(unidadActualizada.phone ?? "");
      setRol(unidadActualizada.role ?? "OPERATIVE");
      setUnidadActiva(Boolean(unidadActualizada.is_active));
      setContactoEmergencia(unidadActualizada.emergency_contact ?? "");
      setTelefonoEmergencia(unidadActualizada.emergency_phone ?? "");
      setHorarioOperativo(unidadActualizada.operative_schedule ?? "");
      setEspecialidadPrincipal((unidadActualizada.specialties ?? [])[0] ?? "");
      setNotasOperativas((unidadActualizada.medical_notes ?? []).join("\n"));
      setLatitudUbicacionActual(unidadActualizada.location_lat ?? null);
      setLongitudUbicacionActual(unidadActualizada.location_lng ?? null);
      setDireccionLegible(unidadActualizada.location_address ?? "");
      setOrganizacionId(unidadActualizada.organization_id ?? "");
      setSupervisorAsignadoId(unidadActualizada.assigned_supervisor_id ?? "");
      setDispositivoAsignadoId(unidadActualizada.device_id ?? "");
      setOrganizacion(organizacionActualizada?.name ?? organizacion);
      setDispositivoAsignado(
        dispositivoActualizado ? `${dispositivoActualizado.name} · ${dispositivoActualizado.platform}` : dispositivoAsignado
      );
      setExito("Unidad guardada correctamente.");
      setEdicionDesbloqueada(false);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando unidad...</p>
      </div>
    );
  }

  return (
    <form onSubmit={manejarGuardar}>
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold">Editar unidad</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Base de trabajo para centralizar la información completa de una unidad operativa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/viewunidades")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Volver a unidades
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-4">
            {error ? <div className="cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}
            {exito ? <div className="cm-badge-success rounded-xl p-3 text-sm">{exito}</div> : null}
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Identidad</p>
                <h2 className="mt-2 text-xl font-bold">Datos principales</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Nombre de usuario</label>
                  <input
                    value={nombreUsuario}
                    disabled = {true}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="usuario_operativo_01"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Correo</label>
                  <input
                    value={correo}
                    disabled ={true}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="operativo@equipo.local"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Nombre real</label>
                  <input
                    value={nombreReal}
                    disabled ={true}
                    onChange={(e) => setNombreReal(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Nombre Apellido"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Teléfono</label>
                  <input
                    value={telefono}
                    disabled ={true}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Rol</label>
                  <select
                    value={rol}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setRol(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {OPCIONES_ROL.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Asignación</p>
                <h2 className="mt-2 text-xl font-bold">Estructura y logística</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Organización</label>
                  <select
                    value={organizacionId}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => {
                      const nuevaOrganizacionId = e.target.value;
                      const organizacionSeleccionada = (opcionesFormulario.organizations ?? []).find(
                        (opcion) => opcion.id === nuevaOrganizacionId
                      );
                      setOrganizacionId(nuevaOrganizacionId);
                      setOrganizacion(organizacionSeleccionada?.name ?? "");
                    }}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="">Sin organizaciÃ³n</option>
                    {(opcionesFormulario.organizations ?? []).map((organizacionOpcion) => (
                      <option key={organizacionOpcion.id} value={organizacionOpcion.id}>
                        {organizacionOpcion.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Supervisor asignado</label>
                  <select
                    value={supervisorAsignadoId}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => {
                      const nuevoSupervisorId = e.target.value;
                      setSupervisorAsignadoId(nuevoSupervisorId);
                    }}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="">Sin supervisor</option>
                    {(opcionesFormulario.supervisors ?? []).map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.display_name || supervisor.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Dispositivo asignado</label>
                  <select
                    value={dispositivoAsignadoId}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => {
                      const nuevoDispositivoId = e.target.value;
                      const dispositivoSeleccionado = (opcionesFormulario.devices ?? []).find(
                        (opcion) => opcion.id === nuevoDispositivoId
                      );
                      setDispositivoAsignadoId(nuevoDispositivoId);
                      setDispositivoAsignado(
                        dispositivoSeleccionado
                          ? `${dispositivoSeleccionado.name} · ${dispositivoSeleccionado.platform}`
                          : ""
                      );
                    }}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="">Sin dispositivo</option>
                    {(opcionesFormulario.devices ?? []).map((dispositivo) => (
                      <option key={dispositivo.id} value={dispositivo.id}>
                        {dispositivo.name} · {dispositivo.platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Incidente actual</label>
                  <input
                    value={incidenteActual}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setIncidenteActual(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Incendio forestal #04"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativa</p>
                <h2 className="mt-2 text-xl font-bold">Capacidad y situación actual</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Estado operativo</label>
                  <select
                    value={estadoOperativo}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setEstadoOperativo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {OPCIONES_ESTADO.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Especialidad principal</label>
                  <input
                    value={especialidadPrincipal}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setEspecialidadPrincipal(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Rescate, comunicaciones, primeros auxilios..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Horario operativo</label>
                  <input
                    value={horarioOperativo}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setHorarioOperativo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Guardia 24h / Turno mañana"
                  />
                </div>  

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Direccion registrada</label>
                  <input
                    value={ultimaUbicacion}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setUltimaUbicacion(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="40.4168, -3.7038 · Madrid"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Seguridad</p>
                <h2 className="mt-2 text-xl font-bold">Contacto y notas</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Contacto de emergencia</label>
                  <input
                    value={contactoEmergencia}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setContactoEmergencia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Teléfono de emergencia</label>
                  <input
                    value={telefonoEmergencia}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setTelefonoEmergencia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas operativas</label>
                  <textarea
                    value={notasOperativas}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setNotasOperativas(e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Observaciones, limitaciones, recordatorios logísticos, etc."
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Resumen</p>
              <h2 className="mt-2 text-lg font-bold">Lectura rápida de la unidad</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Usuario</p>
                  <p className="mt-1 font-medium">{nombreUsuario || "Sin nombre cargado"}</p>
                </div>

                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Rol</p>
                  <p className="mt-1 font-medium">{resumenUnidad.etiquetaRol}</p>
                </div>

                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado</p>
                  <p className="mt-1 font-medium">{resumenUnidad.etiquetaEstado}</p>
                </div>

                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Organización</p>
                  <p className="mt-1 font-medium">{organizacion || "Sin organizacion"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicacion</p>
              <h2 className="mt-2 text-lg font-bold">Posicion actual</h2>

              <div className="mt-4">
                <MapaMiniUnidad
                  latitud={latitudUbicacionActual}
                  longitud={longitudUbicacionActual}
                  etiqueta={nombreUsuario ? `Ubicacion actual de ${nombreReal} (${nombreUsuario})` : "Ubicacion actual de la unidad"}
                />
              </div>

              <div className="mt-3 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Coordenadas</p>
                <p className="mt-1 font-medium">
                  {latitudUbicacionActual != null && longitudUbicacionActual != null
                    ? `${latitudUbicacionActual.toFixed(5)}, ${longitudUbicacionActual.toFixed(5)}`
                    : "Sin coordenadas registradas"}
                </p>
              </div>
              <div className="mt-3 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Direccion legible</p>
                <p className="mt-1 font-medium">{direccionLegible || "No hay direccion disponible"}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado administrativo</p>
              <h2 className="mt-2 text-lg font-bold">Activación en sistema</h2>

              <label className="mt-4 inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={unidadActiva}
                  disabled ={!edicionDesbloqueada}
                  onChange={(e) => setUnidadActiva(e.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"
                />
                Unidad activa en el sistema
              </label>
            </section>

          </aside>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-info)]/40 bg-gradient-to-r from-[color:var(--cm-info)] to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,182,212,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-info)]/50"
            onClick={() => setEdicionDesbloqueada((valor) => !valor)}
          >
            {edicionDesbloqueada ? "Bloquear edición" : "Desbloquear edición"}
          </button>
          <button
            type="submit"
            disabled={!edicionDesbloqueada || guardando}
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
    </form>
  );
}
