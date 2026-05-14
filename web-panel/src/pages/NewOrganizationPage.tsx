import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBanner, FormActions, FormSection, LoadingState, PageHeader, SuccessBanner } from "../components/ui";
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
  { value: "POLICE", label: "Policía" },
  { value: "RESCUE", label: "Equipo de rescate" },
  { value: "MEDICAL", label: "Servicios médicos" },
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

  function limpiarFormulario() {
    setNombre("");
    setTipoOrganizacion("OTHER");
    setEmailContacto("");
    setContactPhone("");
    setDireccion("");
    setIsActive(true);
    setError("");
    setEnviado("");
  }

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/", { replace: true });
        return;
      }

      const me = (await meRes.json()) as MeResponse;
      if (!me.has_panel_full_access) {
        navigate("/", { replace: true });
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
      setError("El nombre de la organización es obligatorio.");
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
        let detail = "No se pudo crear la organización.";
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

      setEnviado("Organización creada correctamente.");
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
    return <LoadingState />;
  }

  return (
    <div className="cm-shell cm-page">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Administración · Organizaciones"
          title="Crear nueva organización"
          description="Completa los datos básicos para registrar una organización en el sistema."
          actions={
            <button type="button" onClick={() => navigate("/vieworganizations")} className="cm-btn cm-btn-secondary">
              Volver
            </button>
          }
        />

        {error ? <ErrorBanner message={error} /> : null}
        {enviado ? <SuccessBanner message={enviado} /> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="Datos principales" description="Identificación y tipo operativo de la organización.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="cm-field-label">Nombre de la organización</label>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className="cm-input"
                  placeholder="Unidad Operativa Madrid Norte"
                  required
                />
              </div>

              <div>
                <label className="cm-field-label">Tipo de organización</label>
                <select
                  value={tipoOrganizacion}
                  onChange={(event) => setTipoOrganizacion(event.target.value as TipoOrganzacion)}
                  className="cm-select"
                >
                  {organizacionTipos.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="inline-flex min-h-11 w-full items-center gap-3 rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm text-[color:var(--cm-text)]">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                  />
                  Organización activa
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection title="Contacto y ubicación" description="Datos opcionales para localizar o contactar con la organización.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="cm-field-label">Correo de contacto</label>
                <input
                  type="email"
                  value={emailContacto}
                  onChange={(event) => setEmailContacto(event.target.value)}
                  pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  className="cm-input"
                  placeholder="contacto@organizacion.local"
                />
              </div>

              <div>
                <label className="cm-field-label">Teléfono de contacto</label>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(normalizarTelefono(event.target.value))}
                  inputMode="tel"
                  placeholder="+34600000000"
                  className="cm-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="cm-field-label">Dirección</label>
                <textarea
                  value={direccion}
                  onChange={(event) => setDireccion(event.target.value)}
                  rows={4}
                  className="cm-textarea"
                  placeholder="Calle, número, ciudad y observaciones de sede"
                />
              </div>
            </div>
          </FormSection>

          <FormActions className="sm:justify-between">
            <button type="button" onClick={limpiarFormulario} className="cm-btn cm-btn-secondary">
              Limpiar formulario
            </button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => navigate("/vieworganizations")} className="cm-btn cm-btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={enviando} className="cm-btn cm-btn-primary">
                {enviando ? "Creando..." : "Crear organización"}
              </button>
            </div>
          </FormActions>
        </form>
      </div>
    </div>
  );
}
