import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type TipoOrganzacion = "FIRE_DEPT" | "POLICE" | "RESCUE" | "MEDICAL" | "OTHER";

type CreateOrganizacion = {
  name: string;
  org_type: TipoOrganzacion;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
};

const CREATE_ORGANIZATION_ENDPOINT = "/organizations/";

const organizacionTipos: Array<{ value: TipoOrganzacion; label: string }> = [
  { value: "FIRE_DEPT", label: "Cuerpo de bomberos" },
  { value: "POLICE", label: "Policia" },
  { value: "RESCUE", label: "Equipo de rescate" },
  { value: "MEDICAL", label: "Servicios medicos" },
  { value: "OTHER", label: "Otro" },
];

export default function NewOrganizationPage() {
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [tipoOrganizacion, setTipoOrganizacion] = useState<TipoOrganzacion>("OTHER");
  const [emailContacto, setEmailContacto] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [direccion, setDireccion] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState("");

  function normalizarTelefono(valor: string) {
    const valorSinLetras = valor.replace(/[^\d+]/g, "");
    const tienePrefijo = valorSinLetras.startsWith("+");
    const soloDigitos = valorSinLetras.replace(/\+/g, "");

    return `${tienePrefijo ? "+" : ""}${soloDigitos}`;
  }

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const me = (await meRes.json()) as MeResponse;
      if (!me.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      setCargando(false);
    })();
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setEnviado("");

    if (!nombre.trim()) {
      setError("El nombre de la organizacion es obligatorio.");
      return;
    }

    const payload: CreateOrganizacion = {
      name: nombre.trim(),
      org_type: tipoOrganizacion,
      contact_email: emailContacto.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      address: direccion.trim() || undefined,
      is_active: isActive,
    };

    setEnviando(true);
    try {
      const res = await apiFetch(CREATE_ORGANIZATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = "No se pudo crear la organizacion.";
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
        setError(detail);
        return;
      }

      setEnviado("Organizacion creada correctamente.");
      setNombre("");
      setTipoOrganizacion("OTHER");
      setEmailContacto("");
      setContactPhone("");
      setDireccion("");
      setIsActive(true);
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
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Administracion · Organizaciones</p>
            <h1 className="text-3xl font-bold tracking-tight">Crear nueva organizacion</h1>
            <p className="mt-2 text-slate-300">Completa los datos basicos para registrar una organizacion en el sistema.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/vieworganizations")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {enviado ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {enviado}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre de la organizacion</label>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unidad Operativa Madrid Norte"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de organizacion</label>
                <select
                  value={tipoOrganizacion}
                  onChange={(event) => setTipoOrganizacion(event.target.value as TipoOrganzacion)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizacionTipos.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                  />
                  Organizacion activa
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Correo de contacto</label>
                <input
                  type="email"
                  value={emailContacto}
                  onChange={(event) => setEmailContacto(event.target.value)}
                  pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contacto@organizacion.local"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Telefono de contacto</label>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(normalizarTelefono(event.target.value))}
                  inputMode="tel"
                  placeholder="+34600000000"
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Direccion</label>
                <textarea
                  value={direccion}
                  onChange={(event) => setDireccion(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Calle, numero, ciudad y observaciones de sede"
                />
              </div>
            </div>
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
            <button
                type="button"
                onClick={() => {
                setNombre("");
                setTipoOrganizacion("OTHER");
                setEmailContacto("");
                setContactPhone("");
                setDireccion("");
                setIsActive(true);
                setError("");
                setEnviado("");
                }}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
            >
                Limpiar formulario
            </button>
            <div className="flex gap-3">
                <button
                type="button"
                onClick={() => navigate("/vieworganizations")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
                >
                Cancelar
                </button>
                <button
                type="submit"
                disabled={enviando}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-60 transition"
                >
                {enviando ? "Creando..." : "Crear organizacion"}
                </button>
            </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
