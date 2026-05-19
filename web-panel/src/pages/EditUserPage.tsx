import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import TourButton from "../components/TourGuide";

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
  is_active: boolean;
  created_at?: string;
};

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
  const [estaActivo, setEstaActivo] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Usuario no valido.");
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

      const respuestaUsuario = await apiFetch(`/auth/panel/users/${id}/`);
      if (!respuestaUsuario.ok) {
        setError("No se pudo cargar el usuario.");
        setCargando(false);
        return;
      }

      const usuario = (await respuestaUsuario.json()) as RespuestaDetalleUsuario;
      setUsername(usuario.username ?? "");
      setEmail(usuario.email ?? "");
      setNombre(usuario.first_name ?? "");
      setApellido(usuario.last_name ?? "");
      setTelefono(usuario.phone ?? "");
      setEstaActivo(Boolean(usuario.is_active));
      setCargando(false);
    })();
  }, [id, navigate]);

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
      datosFormulario.append("is_active", String(estaActivo));

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
      setEstaActivo(Boolean(usuarioActualizado.is_active));
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
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
        <p className="text-sm text-slate-400">Administración</p>
            <h1 className="text-2xl font-bold">Editar usuario</h1>
            <p className="mt-1 text-sm text-slate-400">
              Aqui solo se modifican los datos basicos almacenados en la tabla users.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TourButton
              steps={[
                {
                  selector: '[data-tour="edit-user-form"]',
                  title: "Editar datos del usuario",
                  description: "Modifica el nombre de usuario, email, rol y organización asignada. También puedes cambiar la contraseña o activar/desactivar la cuenta desde este formulario. Pulsa Guardar cambios para confirmar.",
                },
              ]}
            />
            <button
              type="button"
              onClick={() => navigate("/viewusers")}
              className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 transition hover:bg-slate-800"
            >
              Volver
            </button>
          </div>
        </div>

        <div data-tour="edit-user-form" className="mt-6 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800">
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
                <label className="mb-1 block text-sm font-medium text-slate-300">Telefono</label>
                <input
                  value={telefono}
                  onChange={(evento) => setTelefono(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
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
