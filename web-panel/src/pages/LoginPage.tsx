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
      setError("Credenciales inválidas o acceso no autorizado.");
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
        className="cm-card relative z-10 w-full max-w-md space-y-4 p-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[color:var(--cm-text)]">Emergency Management</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">Panel de supervisión</p>
        </div>

        <div>
          <label htmlFor="email" className="cm-field-label">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={correoElectronico}
            onChange={(e) => setCorreoElectronico(e.target.value)}
            required
            autoComplete="email"
            className="cm-input"
            placeholder="usuario@emergency.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="cm-field-label">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={mostrarContrasena ? "text" : "password"}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="current-password"
              className="cm-input pr-12"
              placeholder="********"
            />
            <button
              type="button"
              aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setMostrarContrasena((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-lg text-[color:var(--cm-text-muted)] transition hover:text-[color:var(--cm-text)]"
            >
              {mostrarContrasena ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        {error ? <div className="cm-error-banner">{error}</div> : null}

        <button
          type="submit"
          disabled={enviando}
          className="cm-btn cm-btn-primary w-full"
        >
          {enviando ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>

        <div className="text-center text-sm text-[color:var(--cm-text-muted)]">
          <p>¿No recuerdas la contraseña?</p>
          <Link to="/reset-password" className="text-[color:var(--cm-info)] hover:underline">
            Restablecer contraseña
          </Link>
        </div>
      </form>
    </div>
  );
}
