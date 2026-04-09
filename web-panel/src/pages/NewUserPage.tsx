import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      {/* Fondo de la página */}
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        {/* La cabecera */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Administración · Supervisores</p>
            <h1 className="text-3xl font-bold tracking-tight">Crear usuario operativo</h1>
            <p className="mt-2 text-slate-300">
              Este usuario tendrá rol <span className="font-semibold text-slate-100">OPERATIVE</span> y podrá usar el sistema operativo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navegar("/dashboard")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        {/* La tarjeta del formulario */}
        <div className="mt-8 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {enviado && (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {enviado}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Username
                </label>
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="operativo01"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="operativo01@emergency.com"
                  autoComplete="email"
                  type="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                type="password"
                required
              />
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-950/40 px-3 py-1 ring-1 ring-slate-800">
                  Recomendado: 12+ caracteres
                </span>
                <span className="rounded-full bg-slate-950/40 px-3 py-1 ring-1 ring-slate-800">
                  Incluye mayúsculas, números y símbolo
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navegar("/dashboard")}
                className="rounded-xl bg-slate-900/60 px-5 py-2.5 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={enviando}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-60 transition"
              >
                {enviando ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
