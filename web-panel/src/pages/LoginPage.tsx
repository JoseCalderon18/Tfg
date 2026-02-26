import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login, isAuthenticated, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isCheckingAuth, navigate]);

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Emergency Management</h1>
          <p className="text-slate-400 text-sm mt-1">Panel de supervision</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
            placeholder="usuario@emergency.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
            placeholder="********"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-300 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition shadow-lg shadow-red-600/20"
        >
          {isSubmitting ? "Iniciando sesion..." : "Iniciar sesion"}
        </button>
      </form>
    </div>
  );
}
