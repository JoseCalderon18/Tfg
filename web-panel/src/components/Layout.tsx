import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Layout() {
  // Aquí tenemos el estado de login de todo el panel
  const { user, logout, isAuthenticated, isCheckingAuth } = useAuthStore();

  // Mientras comprobamos si el usuario está logueado, mostramos carga
  if (isCheckingAuth) {
    return <div className="cm-shell min-h-screen p-6">Cargando...</div>;
  }

  // Si no está logueado, lo mandamos a la página de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="cm-shell flex h-screen">
      {/* El menú de la izquierda */}
      <aside className="relative w-60 border-r border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] text-[color:var(--cm-text)]">
        <div className="border-b border-white/6 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--cm-text-muted)]">Emergency</p>
          <h1 className="mt-1 text-lg font-bold">Panel de emergencias</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{user?.username}</p>
        </div>
        <nav className="mt-4 space-y-1 px-2">
          <Link to="/" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-info)]/25">
            Inicio
          </Link>
          <Link to="/weather" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-info)]/25">
            Meteorología
          </Link>
          <Link to="/lightning" className="block rounded-xl px-3 py-2.5 transition hover:bg-yellow-400/25">
            Rayos
          </Link>
          <Link to="/incidents" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-danger)]/20">
            Incidentes
          </Link>
          <Link to="/alerts" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-alert)]/20">
            Alertas
          </Link>
          <Link to="/viewunidades" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-warning)]/20">
            Unidades
          </Link>
          <Link to="/vieworganizations" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-info)]/25">
            Organizaciones
          </Link>
          <Link to="/viewusers" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-accent)]/20">
            Usuarios
          </Link>
          <Link to="/workarea" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-info)]/25">
            Areas de trabajo
          </Link>
          <Link to="/points" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-info)]/25">
            Puntos de interés
          </Link>
          <Link to="/journeys" className="block rounded-xl px-3 py-2.5 transition hover:bg-[color:var(--cm-info)]/25">
            Jornadas
          </Link>
        </nav>
        <div className="absolute bottom-0 w-full p-3">
          {/* Botón para salir */}
          <button
            onClick={() => void logout()}
            className="w-full rounded-xl bg-[color:var(--cm-danger)] py-2.5 text-white transition hover:brightness-110"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Aquí va lo que muestra cada página */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
