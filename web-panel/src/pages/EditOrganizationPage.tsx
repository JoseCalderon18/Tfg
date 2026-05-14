import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const TIPOS_ORGANIZACION = [
  { value: "FIRE_DEPT", label: "Departamento de Bomberos" },
  { value: "POLICE", label: "Departamento de Policia" },
  { value: "RESCUE", label: "Servicio de Rescate" },
  { value: "MEDICAL", label: "Servicio Medico" },
  { value: "OTHER", label: "Otra organizacion" },
  { value: "GOV", label: "Agencia Gubernamental" },
  { value: "NGO", label: "Organización No Gubernamental" },
  { value: "PRIVATE", label: "Empresa Privada" },
  { value: "CIVIL_PROTECTION", label: "Protección Civil" },
  { value: "VOLUNTEER", label: "Voluntarios" },
];


export default function EditOrganizationPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!id) return;

    setError("");

    const datosOrganizacion = {
        name: nombre.trim(),
        org_type: tipo,
        contact_email: email.trim() || null,
        contact_phone: telefono.trim() || null,
        address: direccion.trim() || null,
        is_active: isActive,
    };

    const respuesta = await apiFetch(`/organizations/${id}/`, {
        method: "PATCH",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify(datosOrganizacion),
    });

    if (!respuesta.ok) {
        let detalle = "No se pudo guardar la organizacion.";
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
          // Si no hay JSON legible, dejamos el mensaje por defecto.
        }
        setError(detalle);
        return;
        }
    navigate("/vieworganizations");
    }


  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Organizacion no valida.");
        setCargando(false);
        return;
      }

      const respuestaYo = await apiFetch("/auth/panel/me/");
      if (!respuestaYo.ok) {
        navigate("/", { replace: true });
        return;
      }

      const datosYo = await respuestaYo.json();
      if (!datosYo.has_panel_full_access) {
        navigate("/", { replace: true });
        return;
      }

      const respuestaOrganizacion = await apiFetch(`/organizations/${id}/`);
      if (!respuestaOrganizacion.ok) {
        setError("No se pudo cargar la organizacion.");
        setCargando(false);
        return;
      }

      const organizacion = await respuestaOrganizacion.json();

      setNombre(organizacion.name ?? "");
      setTipo(organizacion.org_type ?? "OTHER");
      setEmail(organizacion.contact_email ?? "");
      setTelefono(organizacion.contact_phone ?? "");
      setDireccion(organizacion.address ?? "");
      setIsActive(Boolean(organizacion.is_active));

      setCargando(false);
    })();
  }, [id, navigate]);

  if (cargando) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100">
        <p className="text-slate-300">Cargando organizacion...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
        <p className="text-sm text-slate-400">Administración</p>
            <h1 className="text-2xl font-bold">Editar organizacion</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/vieworganizations")}
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

          <div className="mb-6">
            <p className="text-sm text-slate-400">
              Modifica los datos generales, la informacion de contacto y el estado operativo de la organizacion.
            </p>
          </div>

          <form className="space-y-6" onSubmit={manejarEnvio}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre de la organizacion</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  placeholder="Ej. Unidad Operativa Madrid Norte"
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de organizacion</label>
                <select
                  value={tipo}
                  onChange={(evento) => setTipo(evento.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecciona un tipo</option>
                  {TIPOS_ORGANIZACION.map((tipoOrganizacion) => (
                    <option key={tipoOrganizacion.value} value={tipoOrganizacion.value}>
                      {tipoOrganizacion.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Correo de contacto</label>
                <input
                  type="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  placeholder="contacto@organizacion.local"
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Telefono de contacto</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(evento) => setTelefono(evento.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Direccion</label>
              <textarea
                rows={4}
                value={direccion}
                onChange={(evento) => setDireccion(evento.target.value)}
                placeholder="Introduce la direccion completa de la organizacion"
                className="w-full rounded-xl bg-slate-950/40 px-4 py-3 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/30 p-4 ring-1 ring-slate-800">
                <p className="text-sm font-medium text-slate-200">Estado operativo</p>
                <p className="mt-1 text-xs text-slate-400">
                  Marca si la organizacion esta disponible y activa dentro del sistema.
                </p>
                <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(evento) => setIsActive(evento.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950/40"
                  />
                  Organizacion activa
                </label>
              </div>

              <div className="rounded-2xl bg-slate-950/30 p-4 ring-1 ring-slate-800">
                <p className="text-sm font-medium text-slate-200">Resumen visual</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-slate-800">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Nombre</span>
                    <span className="mt-1 block text-slate-200">{nombre || "Pendiente de cargar"}</span>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-slate-800">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Tipo</span>
                    <span className="mt-1 block text-slate-200">
                      {TIPOS_ORGANIZACION.find((tipoOrganizacion) => tipoOrganizacion.value === tipo)?.label || "Pendiente de cargar"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/vieworganizations")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 transition hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
