import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

export default function EditUnitPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [nombreUsuario, setNombreUsuario] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("OPERATIVE");
  const [organizacion, setOrganizacion] = useState("");
  const [supervisorAsignado, setSupervisorAsignado] = useState("");
  const [dispositivoAsignado, setDispositivoAsignado] = useState("");
  const [estadoOperativo, setEstadoOperativo] = useState("DISPONIBLE");
  const [incidenteActual, setIncidenteActual] = useState("");
  const [ultimaUbicacion, setUltimaUbicacion] = useState("");
  const [especialidadPrincipal, setEspecialidadPrincipal] = useState("");
  const [horarioOperativo, setHorarioOperativo] = useState("");
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");
  const [notasOperativas, setNotasOperativas] = useState("");
  const [unidadActiva, setUnidadActiva] = useState(true);

  const resumenUnidad = useMemo(() => {
    return {
      etiquetaRol: OPCIONES_ROL.find((opcion) => opcion.value === rol)?.label ?? "Sin rol",
      etiquetaEstado:
        OPCIONES_ESTADO.find((opcion) => opcion.value === estadoOperativo)?.label ?? "Sin estado",
    };
  }, [rol, estadoOperativo]);

  return (
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
            <button
              type="button"
              className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Guardar cambios
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-4">
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
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="usuario_operativo_01"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Correo</label>
                  <input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="operativo@equipo.local"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Teléfono</label>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Rol</label>
                  <select
                    value={rol}
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
                  <input
                    value={organizacion}
                    onChange={(e) => setOrganizacion(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Unidad Operativa Madrid Norte"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Supervisor asignado</label>
                  <input
                    value={supervisorAsignado}
                    onChange={(e) => setSupervisorAsignado(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="supervisor_01"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Dispositivo asignado</label>
                  <input
                    value={dispositivoAsignado}
                    onChange={(e) => setDispositivoAsignado(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Terminal 014 · ANDROID"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Incidente actual</label>
                  <input
                    value={incidenteActual}
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
                    onChange={(e) => setEspecialidadPrincipal(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Rescate, comunicaciones, primeros auxilios..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Horario operativo</label>
                  <input
                    value={horarioOperativo}
                    onChange={(e) => setHorarioOperativo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Guardia 24h / Turno mañana"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Última ubicación conocida</label>
                  <input
                    value={ultimaUbicacion}
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
                    onChange={(e) => setContactoEmergencia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Teléfono de emergencia</label>
                  <input
                    value={telefonoEmergencia}
                    onChange={(e) => setTelefonoEmergencia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas operativas</label>
                  <textarea
                    value={notasOperativas}
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
                  <p className="mt-1 font-medium">{organizacion || "Sin organización"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado administrativo</p>
              <h2 className="mt-2 text-lg font-bold">Activación en sistema</h2>

              <label className="mt-4 inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={unidadActiva}
                  onChange={(e) => setUnidadActiva(e.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"
                />
                Unidad activa en el sistema
              </label>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Uso recomendado</p>
              <h2 className="mt-2 text-lg font-bold">Ideas para ampliar</h2>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--cm-text-muted)]">
                <li>Histórico de ubicaciones y mapa de seguimiento.</li>
                <li>Asignación a incidentes activos y supervisor real.</li>
                <li>Dispositivo, batería y última sincronización.</li>
                <li>Checklist de perfil completo y preparación operativa.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
