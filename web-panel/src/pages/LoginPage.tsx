import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  // Estado del formulario de acceso
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navegación y acciones de auth
  const navigate = useNavigate();
  const { login, isAuthenticated, isCheckingAuth } = useAuthStore();

  // Redirección al dashboard cuando ya existe sesión
  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isCheckingAuth, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    // Validación y envío del formulario al backend
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const ok = await login(email, password);
    setIsSubmitting(false);

    if (!ok) {
      setError("Credenciales inválidas o acceso no autorizado.");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="cm-shell relative flex min-h-screen items-center justify-center px-3">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-[10%] top-[12%] h-56 w-56 rounded-full bg-[color:var(--cm-danger)] blur-3xl" />
        <div className="absolute bottom-[12%] right-[8%] h-56 w-56 rounded-full bg-[color:var(--cm-info)] blur-3xl" />
      </div>
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-2xl"
      >
        {/* Encabezado del formulario */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[color:var(--cm-text)]">Emergency Management</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">Panel de supervision</p>
        </div>

        {/* Campo de correo */}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
            placeholder="usuario@emergency.com"
          />
        </div>

        {/* Campo de contraseña */}
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
            placeholder="********"
          />
        </div>

        {/* Mensaje de error de autenticación */}
        {error && (
          <div className="cm-badge-danger rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Botón principal de acceso */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="cm-button-primary w-full rounded-lg py-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Iniciando sesion..." : "Iniciar sesion"}
        </button>
      </form>
    </div>
  );
}
