import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";

type RespuestaYo = {
  authenticated: boolean;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

type RespuestaDetalleUsuario = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "SUPERVISOR" | "OPERATIVE";
  is_active: boolean;
  created_at?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_notes?: string[];
  organization_id?: string;
  dni?: string;
  avatar?: string;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  birth_date?: string;
  specialties?: string[];
  operative_schedule?: string;
  blood_type?: string;
  device_id?: string;
  assigned_supervisor_id?: string;
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

const ROLES: Array<RespuestaDetalleUsuario["role"]> = ["SUPERVISOR", "OPERATIVE"];

const OPCIONES_IDIOMA = [
  { value: "", label: "Selecciona un idioma" },
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
];

const OPCIONES_PAIS = [
  { value: "", label: "Selecciona un país" },
  { value: "España", label: "España" },
  { value: "Portugal", label: "Portugal" },
  { value: "Francia", label: "Francia" },
  { value: "Italia", label: "Italia" },
];

const OPCIONES_PROVINCIA = [
  { value: "", label: "Selecciona una provincia" },
  { value: "Madrid", label: "Madrid" },
  { value: "Barcelona", label: "Barcelona" },
  { value: "Valencia", label: "Valencia" },
  { value: "Sevilla", label: "Sevilla" },
];

const OPCIONES_CIUDAD = [
  { value: "", label: "Selecciona una ciudad" },
  { value: "Madrid", label: "Madrid" },
  { value: "Barcelona", label: "Barcelona" },
  { value: "Valencia", label: "Valencia" },
  { value: "Sevilla", label: "Sevilla" },
];

export default function EditUserPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState<RespuestaDetalleUsuario["role"]>("OPERATIVE");
  const [estaActivo, setEstaActivo] = useState(true);
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");
  const [notasMedicas, setNotasMedicas] = useState("");
  const [organizacionId, setOrganizacionId] = useState("");
  const [dni, setDni] = useState("");
  const [archivoAvatar, setArchivoAvatar] = useState<File | null>(null);
  const [vistaAvatar, setVistaAvatar] = useState("");
  const [idioma, setIdioma] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [pais, setPais] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [especialidades, setEspecialidades] = useState("");
  const [horarioOperativo, setHorarioOperativo] = useState("");
  const [grupoSanguineo, setGrupoSanguineo] = useState("");
  const [dispositivoId, setDispositivoId] = useState("");
  const [supervisorAsignadoId, setSupervisorAsignadoId] = useState("");

  const [organizaciones, setOrganizaciones] = useState<OpcionOrganizacion[]>([]);
  const [supervisores, setSupervisores] = useState<OpcionSupervisor[]>([]);
  const [dispositivos, setDispositivos] = useState<OpcionDispositivo[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Usuario no válido.");
        setCargando(false);
        return;
      }

      const respuestaYo = await apiFetch("/auth/panel/me/");
      if (!respuestaYo.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const datosYo = (await respuestaYo.json()) as RespuestaYo;
      if (!datosYo.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      const [respuestaOpciones, respuestaUsuario] = await Promise.all([
        apiFetch("/auth/panel/users/form-options/"),
        apiFetch(`/auth/panel/users/${id}/`),
      ]);

      if (!respuestaOpciones.ok) {
        setError("No se pudieron cargar las opciones del formulario.");
        setCargando(false);
        return;
      }

      if (!respuestaUsuario.ok) {
        setError("No se pudo cargar el usuario.");
        setCargando(false);
        return;
      }

      const datosOpciones = (await respuestaOpciones.json()) as RespuestaOpcionesFormulario;
      const usuario = (await respuestaUsuario.json()) as RespuestaDetalleUsuario;

      setOrganizaciones(datosOpciones.organizations ?? []);
      setSupervisores(datosOpciones.supervisors ?? []);
      setDispositivos(datosOpciones.devices ?? []);

      setUsername(usuario.username ?? "");
      setEmail(usuario.email ?? "");
      setNombre(usuario.first_name ?? "");
      setApellido(usuario.last_name ?? "");
      setTelefono(usuario.phone ?? "");
      setRol(usuario.role ?? "OPERATIVE");
      setEstaActivo(Boolean(usuario.is_active));
      setContactoEmergencia(usuario.emergency_contact ?? "");
      setTelefonoEmergencia(usuario.emergency_phone ?? "");
      setNotasMedicas((usuario.medical_notes ?? []).join("\n"));
      setOrganizacionId(usuario.organization_id ?? "");
      setDni(usuario.dni ?? "");
      setVistaAvatar(usuario.avatar ?? "");
      setIdioma(usuario.language ?? "");
      setCiudad(usuario.city ?? "");
      setProvincia(usuario.province ?? "");
      setPais(usuario.country ?? "");
      setFechaNacimiento(usuario.birth_date ?? "");
      setEspecialidades((usuario.specialties ?? []).join("\n"));
      setHorarioOperativo(usuario.operative_schedule ?? "");
      setGrupoSanguineo(usuario.blood_type ?? "");
      setDispositivoId(usuario.device_id ?? "");
      setSupervisorAsignadoId(usuario.assigned_supervisor_id ?? "");
      setCargando(false);
    })();
  }, [id, navigate]);

  function manejarCambioAvatar(evento: ChangeEvent<HTMLInputElement>) {
    const fichero = evento.target.files?.[0] ?? null;
    setArchivoAvatar(fichero);
    if (fichero) {
      setVistaAvatar(URL.createObjectURL(fichero));
    }
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    if (!id) return;

    setError("");
    setExito("");

    if (!username.trim()) {
      setError("El username es obligatorio.");
      return;
    }

    if (!email.trim()) {
      setError("El email es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      const datosFormulario = new FormData();
      datosFormulario.append("username", username.trim());
      datosFormulario.append("email", email.trim());
      datosFormulario.append("first_name", nombre.trim());
      datosFormulario.append("last_name", apellido.trim());
      datosFormulario.append("phone", telefono.trim());
      datosFormulario.append("role", rol);
      datosFormulario.append("is_active", String(estaActivo));
      datosFormulario.append("emergency_contact", contactoEmergencia.trim());
      datosFormulario.append("emergency_phone", telefonoEmergencia.trim());
      datosFormulario.append("medical_notes", JSON.stringify(notasMedicas.split("\n").map((valor) => valor.trim()).filter(Boolean)));
      datosFormulario.append("organization_id", organizacionId);
      datosFormulario.append("dni", dni.trim());
      datosFormulario.append("language", idioma);
      datosFormulario.append("city", ciudad);
      datosFormulario.append("province", provincia);
      datosFormulario.append("country", pais);
      datosFormulario.append("birth_date", fechaNacimiento);
      datosFormulario.append("specialties", JSON.stringify(especialidades.split("\n").map((valor) => valor.trim()).filter(Boolean)));
      datosFormulario.append("operative_schedule", horarioOperativo.trim());
      datosFormulario.append("blood_type", grupoSanguineo.trim());
      datosFormulario.append("device_id", dispositivoId);
      datosFormulario.append("assigned_supervisor_id", supervisorAsignadoId);

      if (archivoAvatar) {
        datosFormulario.append("avatar", archivoAvatar);
      }

      const respuesta = await apiFetch(`/auth/panel/users/${id}/`, {
        method: "PATCH",
        body: datosFormulario,
      });

      if (!respuesta.ok) {
        let detalle = "No se pudo actualizar el usuario.";
        try {
          const datos = await respuesta.json();
          if (datos?.detail) detalle = String(datos.detail);
          else if (typeof datos === "object") {
            const primeraClave = Object.keys(datos)[0];
            if (primeraClave) {
              const valor = (datos as Record<string, unknown>)[primeraClave];
              detalle = Array.isArray(valor)
                ? `${primeraClave}: ${String(valor[0])}`
                : `${primeraClave}: ${String(valor)}`;
            }
          }
        } catch (errorRespuesta) {
          console.error("Error procesando la respuesta del servidor:", errorRespuesta);
        }
        setError(detalle);
        return;
      }

      const usuarioActualizado = (await respuesta.json()) as RespuestaDetalleUsuario;
      setUsername(usuarioActualizado.username ?? "");
      setEmail(usuarioActualizado.email ?? "");
      setNombre(usuarioActualizado.first_name ?? "");
      setApellido(usuarioActualizado.last_name ?? "");
      setTelefono(usuarioActualizado.phone ?? "");
      setRol(usuarioActualizado.role ?? "OPERATIVE");
      setEstaActivo(Boolean(usuarioActualizado.is_active));
      setContactoEmergencia(usuarioActualizado.emergency_contact ?? "");
      setTelefonoEmergencia(usuarioActualizado.emergency_phone ?? "");
      setNotasMedicas((usuarioActualizado.medical_notes ?? []).join("\n"));
      setOrganizacionId(usuarioActualizado.organization_id ?? "");
      setDni(usuarioActualizado.dni ?? "");
      setVistaAvatar(usuarioActualizado.avatar ?? vistaAvatar);
      setIdioma(usuarioActualizado.language ?? "");
      setCiudad(usuarioActualizado.city ?? "");
      setProvincia(usuarioActualizado.province ?? "");
      setPais(usuarioActualizado.country ?? "");
      setFechaNacimiento(usuarioActualizado.birth_date ?? "");
      setEspecialidades((usuarioActualizado.specialties ?? []).join("\n"));
      setHorarioOperativo(usuarioActualizado.operative_schedule ?? "");
      setGrupoSanguineo(usuarioActualizado.blood_type ?? "");
      setDispositivoId(usuarioActualizado.device_id ?? "");
      setSupervisorAsignadoId(usuarioActualizado.assigned_supervisor_id ?? "");
      setArchivoAvatar(null);
      setExito("Usuario actualizado correctamente.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100">
        <p className="text-slate-300">Cargando usuario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Administración</p>
            <h1 className="text-2xl font-bold">Editar usuario</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/viewusers")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 transition hover:bg-slate-800"
          >
            Volver
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {exito && (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {exito}
            </div>
          )}

          <form onSubmit={manejarEnvio} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Username</label>
                <input
                  value={username}
                  onChange={(evento) => setUsername(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre</label>
                <input
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Apellido</label>
                <input
                  value={apellido}
                  onChange={(evento) => setApellido(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Teléfono</label>
                <input
                  value={telefono}
                  onChange={(evento) => setTelefono(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Rol</label>
                <select
                  value={rol}
                  onChange={(evento) => setRol(evento.target.value as RespuestaDetalleUsuario["role"])}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {ROLES.map((valorRol) => (
                    <option key={valorRol} value={valorRol}>
                      {valorRol === "SUPERVISOR" ? "Supervisor" : "Operativo"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Contacto de emergencia</label>
                <input
                  value={contactoEmergencia}
                  onChange={(evento) => setContactoEmergencia(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Teléfono de emergencia</label>
                <input
                  value={telefonoEmergencia}
                  onChange={(evento) => setTelefonoEmergencia(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Organización</label>
                <select
                  value={organizacionId}
                  onChange={(evento) => setOrganizacionId(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecciona una organización</option>
                  {organizaciones.map((organizacion) => (
                    <option key={organizacion.id} value={organizacion.id}>
                      {organizacion.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">DNI</label>
                <input
                  value={dni}
                  onChange={(evento) => setDni(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={manejarCambioAvatar}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-300 ring-1 ring-slate-800 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Idioma</label>
                <select
                  value={idioma}
                  onChange={(evento) => setIdioma(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {OPCIONES_IDIOMA.map((opcion) => (
                    <option key={opcion.value || "vacio"} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                {vistaAvatar ? (
                  <img
                    src={vistaAvatar}
                    alt="Avatar del usuario"
                    className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-950/40 text-xs text-slate-400 ring-1 ring-slate-800">
                    Sin avatar
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Ciudad</label>
                <select
                  value={ciudad}
                  onChange={(evento) => setCiudad(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {OPCIONES_CIUDAD.map((opcion) => (
                    <option key={opcion.value || "vacio"} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Provincia</label>
                <select
                  value={provincia}
                  onChange={(evento) => setProvincia(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {OPCIONES_PROVINCIA.map((opcion) => (
                    <option key={opcion.value || "vacio"} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">País</label>
                <select
                  value={pais}
                  onChange={(evento) => setPais(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {OPCIONES_PAIS.map((opcion) => (
                    <option key={opcion.value || "vacio"} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(evento) => setFechaNacimiento(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Grupo sanguíneo</label>
                <input
                  value={grupoSanguineo}
                  onChange={(evento) => setGrupoSanguineo(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej. O+"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Especialidad</label>
              <textarea
                value={especialidades}
                onChange={(evento) => setEspecialidades(evento.target.value)}
                className="min-h-[110px] w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Introduce una especialidad por línea"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Notas médicas</label>
              <textarea
                value={notasMedicas}
                onChange={(evento) => setNotasMedicas(evento.target.value)}
                className="min-h-[110px] w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Introduce una nota médica por línea"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Horario operativo</label>
                <input
                  value={horarioOperativo}
                  onChange={(evento) => setHorarioOperativo(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej. Lunes a viernes de 08:00 a 16:00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Dispositivo</label>
                <select
                  value={dispositivoId}
                  onChange={(evento) => setDispositivoId(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecciona un dispositivo</option>
                  {dispositivos.map((dispositivo) => (
                    <option key={dispositivo.id} value={dispositivo.id}>
                      {dispositivo.name} ({dispositivo.platform})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Supervisor asignado</label>
                <select
                  value={supervisorAsignadoId}
                  onChange={(evento) => setSupervisorAsignadoId(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecciona un supervisor</option>
                  {supervisores.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 self-end text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={estaActivo}
                  onChange={(evento) => setEstaActivo(evento.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
                />
                Usuario activo
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/viewusers")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 transition hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:opacity-60"
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
