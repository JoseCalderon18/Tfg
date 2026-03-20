import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type OrganizationType = "FIRE_DEPT" | "POLICE" | "RESCUE" | "MEDICAL" | "OTHER";

type CreateOrganizationPayload = {
  name: string;
  org_type: OrganizationType;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
};

const CREATE_ORGANIZATION_ENDPOINT = "/organizations/";

const organizationTypeOptions: Array<{ value: OrganizationType; label: string }> = [
  { value: "FIRE_DEPT", label: "Cuerpo de bomberos" },
  { value: "POLICE", label: "Policia" },
  { value: "RESCUE", label: "Equipo de rescate" },
  { value: "MEDICAL", label: "Servicios medicos" },
  { value: "OTHER", label: "Otro" },
];

export default function NewOrganizationPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrganizationType>("OTHER");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      setLoading(false);
    })();
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("El nombre de la organizacion es obligatorio.");
      return;
    }

    const payload: CreateOrganizationPayload = {
      name: name.trim(),
      org_type: orgType,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      address: address.trim() || undefined,
      is_active: isActive,
    };

    setSubmitting(true);
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

      setSuccess("Organizacion creada correctamente.");
      setName("");
      setOrgType("OTHER");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
      setIsActive(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
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
          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre de la organizacion</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unidad Operativa Madrid Norte"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tipo de organizacion</label>
                <select
                  value={orgType}
                  onChange={(event) => setOrgType(event.target.value as OrganizationType)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizationTypeOptions.map((option) => (
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
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
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
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
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
                setName("");
                setOrgType("OTHER");
                setContactEmail("");
                setContactPhone("");
                setAddress("");
                setIsActive(true);
                setError("");
                setSuccess("");
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
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-60 transition"
                >
                {submitting ? "Creando..." : "Crear organizacion"}
                </button>
            </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
