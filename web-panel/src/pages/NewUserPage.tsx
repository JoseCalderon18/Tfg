import { useEffect, useState } from "react";
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

const ENDPOINT_CREAR_USUARIO = "/auth/panel/users/create/";

export default function NewUserPage() {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);

  // Form
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UX
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string>("");
  const [enviado, setEnviado] = useState<string>("");

  // Guard: solo SUPERVISOR
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
      setCargando(false);
    })();
  }, [navegar]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviado("");

    if (!usuario.trim()) {
      setError("El username es obligatorio.");
      return;
    }
    if (!email.trim()) {
      setError("El email es obligatorio.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        username: usuario.trim(),
        email: email.trim(),
        password,
      };

      const res = await apiFetch(ENDPOINT_CREAR_USUARIO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = "No se pudo crear el usuario.";
        try {
          const data = await res.json();
          if (data?.detail) detail = String(data.detail);
          else if (typeof data === "object") {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
              const v = (data as any)[firstKey];
              detail = Array.isArray(v) ? `${firstKey}: ${v[0]}` : `${firstKey}: ${String(v)}`;
            }
          }
        } catch {
          // ignore parse errors
        }
        setError(detail);
        return;
      }

      setEnviado("Usuario operativo creado correctamente.");
      setUsuario("");
      setEmail("");
      setPassword("");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return <LoadingState />;
  }

  return (
    <div className="cm-shell cm-page">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Administración · Supervisores"
          title="Crear usuario operativo"
          description="Este usuario tendrá rol OPERATIVE y podrá usar el sistema operativo."
          actions={
            <button type="button" onClick={() => navegar("/dashboard")} className="cm-btn cm-btn-secondary">
              Volver
            </button>
          }
        />

        {error ? <ErrorBanner message={error} /> : null}
        {enviado ? <SuccessBanner message={enviado} /> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="Datos de acceso" description="Credenciales principales del usuario operativo.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="cm-field-label">Username</label>
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

              <div className="sm:col-span-2">
                <label className="cm-field-label">Contraseña</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cm-input"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  type="password"
                  required
                />
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--cm-text-muted)]">
                  <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-bg)] px-3 py-1">
                    Recomendado: 12+ caracteres
                  </span>
                  <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-bg)] px-3 py-1">
                    Incluye mayúsculas, números y símbolo
                  </span>
                </div>
              </div>
            </div>
          </FormSection>

          <FormActions>
            <button type="button" onClick={() => navegar("/dashboard")} className="cm-btn cm-btn-secondary">
              Cancelar
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
