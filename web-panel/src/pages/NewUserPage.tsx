import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBanner, FormActions, FormSection, LoadingState, PageHeader, SuccessBanner } from "../components/ui";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  email?: string;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

type OpcionOrganizacion = {
  id: string;
  name: string;
};

type OpcionesFormulario = {
  organizations?: OpcionOrganizacion[];
};

const ENDPOINT_CREAR_USUARIO = "/auth/panel/users/create/";

const OPCIONES_ESTADO_OPERATIVO = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "EN_INCIDENTE", label: "En incidente" },
  { value: "DESCONECTADA", label: "Desconectada" },
  { value: "NO_DISPONIBLE", label: "No disponible" },
];

function obtenerDetalleError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;

  const firstKey = Object.keys(record)[0];
  if (!firstKey) return fallback;
  const value = record[firstKey];
  return Array.isArray(value) ? `${firstKey}: ${String(value[0])}` : `${firstKey}: ${String(value)}`;
}

export default function NewUserPage() {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [organizaciones, setOrganizaciones] = useState<OpcionOrganizacion[]>([]);

  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [nombreReal, setNombreReal] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [organizacionId, setOrganizacionId] = useState("");
  const [estadoOperativo, setEstadoOperativo] = useState("DISPONIBLE");
  const [unidadActiva, setUnidadActiva] = useState(true);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState("");

  const fortalezaPassword = useMemo(() => {
    let puntuacion = 0;
    if (password.length >= 8) puntuacion += 1;
    if (password.length >= 12) puntuacion += 1;
    if (/[A-Z]/.test(password)) puntuacion += 1;
    if (/\d/.test(password)) puntuacion += 1;
    if (/[^A-Za-z0-9]/.test(password)) puntuacion += 1;
    if (puntuacion >= 4) return { label: "Fuerte", className: "text-[color:var(--cm-success)]" };
    if (puntuacion >= 2) return { label: "Media", className: "text-[color:var(--cm-warning)]" };
    return { label: "Basica", className: "text-[color:var(--cm-danger)]" };
  }, [password]);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        navegar("/login", { replace: true });
        return;
      }

      const data = (await res.json()) as MeResponse;
      if (!data.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      const opcionesRes = await apiFetch("/auth/panel/users/form-options/");
      if (opcionesRes.ok) {
        const opciones = (await opcionesRes.json()) as OpcionesFormulario;
        setOrganizaciones(opciones.organizations ?? []);
      }

      setCargando(false);
    })();
  }, [navegar]);

  function limpiarFormulario() {
    setUsuario("");
    setEmail("");
    setPassword("");
    setConfirmarPassword("");
    setNombreReal("");
    setTelefono("");
    setDni("");
    setOrganizacionId("");
    setEstadoOperativo("DISPONIBLE");
    setUnidadActiva(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviado("");

    if (!usuario.trim()) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }
    if (!email.trim()) {
      setError("El email es obligatorio.");
      return;
    }
    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmarPassword) {
      setError("La confirmacion de contrasena no coincide.");
      return;
    }

    const partesNombre = nombreReal.trim().split(/\s+/).filter(Boolean);
    const nombre = partesNombre[0] ?? "";
    const apellidos = partesNombre.slice(1).join(" ");

    setEnviando(true);
    try {
      const payload = {
        username: usuario.trim(),
        email: email.trim(),
        password,
        first_name: nombre,
        last_name: apellidos,
        phone: telefono.trim(),
        dni: dni.trim(),
        is_active: unidadActiva,
        organization_id: organizacionId || null,
        operative_status: estadoOperativo,
      };

      const res = await apiFetch(ENDPOINT_CREAR_USUARIO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = "No se pudo crear el usuario.";
        try {
          detail = obtenerDetalleError(await res.json(), detail);
        } catch {
          // mantenemos el fallback
        }
        setError(detail);
        return;
      }

      setEnviado("Usuario operativo creado correctamente.");
      limpiarFormulario();
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
          eyebrow="Administracion"
          title="Crear usuario operativo"
          description="Alta rapida con los datos basicos de la unidad. Los detalles avanzados se pueden completar despues desde la ficha."
          actions={
            <button type="button" onClick={() => navegar("/viewunidades")} className="cm-btn cm-btn-secondary">
              Volver
            </button>
          }
        />

        {error ? <ErrorBanner message={error} /> : null}
        {enviado ? <SuccessBanner message={enviado} /> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="Acceso" description="Credenciales principales para iniciar sesion.">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="cm-field-label">Nombre de usuario</label>
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="cm-input"
                  placeholder="operativo01"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="cm-field-label">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cm-input"
                  placeholder="operativo01@emergency.com"
                  autoComplete="email"
                  type="email"
                  required
                />
              </div>

              <div>
                <label className="cm-field-label">Contrasena</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cm-input"
                  placeholder="Minimo 8 caracteres"
                  autoComplete="new-password"
                  type="password"
                  required
                />
                <p className={`mt-1 text-xs font-semibold ${fortalezaPassword.className}`}>
                  Fortaleza: {fortalezaPassword.label}
                </p>
              </div>

              <div>
                <label className="cm-field-label">Confirmar contrasena</label>
                <input
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="cm-input"
                  autoComplete="new-password"
                  type="password"
                  required
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Datos basicos" description="Informacion minima que se muestra en el centro de unidades.">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="cm-field-label">Nombre real</label>
                <input
                  value={nombreReal}
                  onChange={(e) => setNombreReal(e.target.value)}
                  className="cm-input"
                  placeholder="Nombre Apellido"
                />
              </div>

              <div>
                <label className="cm-field-label">Telefono</label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="cm-input"
                  inputMode="tel"
                  placeholder="+34 600 000 000"
                />
              </div>

              <div>
                <label className="cm-field-label">DNI</label>
                <input value={dni} onChange={(e) => setDni(e.target.value)} className="cm-input" />
              </div>

              <div>
                <label className="cm-field-label">Organizacion</label>
                <select value={organizacionId} onChange={(e) => setOrganizacionId(e.target.value)} className="cm-select">
                  <option value="">Sin organizacion</option>
                  {organizaciones.map((organizacion) => (
                    <option key={organizacion.id} value={organizacion.id}>
                      {organizacion.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="cm-field-label">Estado operativo</label>
                <select value={estadoOperativo} onChange={(e) => setEstadoOperativo(e.target.value)} className="cm-select">
                  {OPCIONES_ESTADO_OPERATIVO.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-3 self-end rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={unidadActiva}
                  onChange={(e) => setUnidadActiva(e.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)]"
                />
                Unidad activa
              </label>
            </div>
          </FormSection>

          <FormActions>
            <button type="button" onClick={() => navegar("/viewunidades")} className="cm-btn cm-btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={limpiarFormulario} disabled={enviando} className="cm-btn cm-btn-secondary">
              Limpiar
            </button>
            <button type="submit" disabled={enviando} className="cm-btn cm-btn-primary">
              {enviando ? "Creando..." : "Crear usuario"}
            </button>
          </FormActions>
        </form>
      </div>
    </div>
  );
}
