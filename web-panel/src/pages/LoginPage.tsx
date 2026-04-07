import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [correoElectronico, setCorreoElectronico] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const navegar = useNavigate();
  const { login, isAuthenticated, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      navegar("/", { replace: true });
    }
  }, [isAuthenticated, isCheckingAuth, navegar]);

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);

    const ok = await login(correoElectronico, contrasena);
    setEnviando(false);

    if (!ok) {
      setError("Credenciales invalidas o acceso no autorizado.");
      return;
    }

    navegar("/", { replace: true });
  }

  return (
    <div className="cm-shell relative flex min-h-screen items-center justify-center px-3">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-[10%] top-[12%] h-56 w-56 rounded-full bg-[color:var(--cm-danger)] blur-3xl" />
        <div className="absolute bottom-[12%] right-[8%] h-56 w-56 rounded-full bg-[color:var(--cm-info)] blur-3xl" />
      </div>

      <form
        onSubmit={manejarEnvio}
        className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-2xl"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[color:var(--cm-text)]">Emergency Management</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">Panel de supervision</p>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            value={correoElectronico}
            onChange={(e) => setCorreoElectronico(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
            placeholder="usuario@emergency.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[color:var(--cm-text-muted)]">
            Contrasena
          </label>
          <div className="relative">
            <input
              id="password"
              type={mostrarContrasena ? "text" : "password"}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 pr-12 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)] focus:ring-2 focus:ring-[color:var(--cm-info)]"
              placeholder="********"
            />
            <button
              type="button"
              aria-label={mostrarContrasena ? "Ocultar contrasena" : "Mostrar contrasena"}
              onClick={() => setMostrarContrasena((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-lg text-[color:var(--cm-text-muted)] transition hover:text-[color:var(--cm-text)]"
            >
              {mostrarContrasena ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {error ? <div className="cm-badge-danger rounded-lg p-3 text-sm">{error}</div> : null}

        <button
          type="submit"
          disabled={enviando}
          className="cm-button-primary w-full rounded-lg py-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Iniciando sesion..." : "Iniciar sesion"}
        </button>

        <div className="text-center text-sm text-[color:var(--cm-text-muted)]">
          <p>No recuerdas la password?</p>
          <Link to="/reset-password" className="text-[color:var(--cm-info)] hover:underline">
            Resetear contrasena
          </Link>
        </div>
      </form>
    </div>
  );
}
