import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  email?: string;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

function CardLink({
  to,
  title,
  desc,
  badge,
}: {
  to: string;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--cm-info)]/60 hover:bg-[color:var(--cm-surface-2)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--cm-text)]">{title}</h3>
          <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">{desc}</p>
        </div>

        {badge ? (
          <span className="shrink-0 rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-xs font-medium text-[color:var(--cm-text)]">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-[color:var(--cm-text-muted)]">Abrir</span>
        <span className="text-[color:var(--cm-text-muted)] transition">&rarr;</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  // Estado local del dashboard
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const navigate = useNavigate();

  // Carga inicial de sesion y permisos de panel
  useEffect(() => {
    (async () => {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const data = (await res.json()) as MeResponse;

      if (!data.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      setMe(data);
      setLoading(false);
    })();
  }, [navigate]);

  // Accion de cierre de sesion desde dashboard
  async function handleLogout() {
    await apiFetch("/auth/panel/logout/", { method: "POST" });
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
          <p className="text-[color:var(--cm-text-muted)]">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      {/* Fondo decorativo del centro de mando */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[color:var(--cm-danger)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[color:var(--cm-info)] blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
        {/* Header principal */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--cm-danger)]/15 ring-1 ring-[color:var(--cm-danger)]/35">
              <span className="font-bold text-[color:var(--cm-text)]">EM</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Centro de mando</p>
              <h1 className="text-2xl font-bold tracking-tight">Panel de control de emergencias</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="cm-badge-success inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operativo
            </span>
            <span className="cm-badge-info rounded-full px-3 py-1 text-xs">
              {me?.email ?? "Supervisor"}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:border-[color:var(--cm-danger)]/50 hover:bg-[color:var(--cm-surface-2)]"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navegacion principal del panel */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <CardLink to="/" title="Dashboard" desc="Vista general del sistema y accesos rapidos." badge="Inicio" />
          <CardLink to="/incidents" title="Incidentes" desc="Gestion y seguimiento de incidentes criticos y activos." />
          <CardLink to="/alerts" title="Alertas" desc="Revisar avisos, prioridad y respuesta operativa." />
          <CardLink to="/viewunidades" title="Unidades" desc="Consultar disponibilidad, rol y organizacion." />
          <CardLink to="/vieworganizations" title="Organizaciones" desc="Gestionar organismos y entidades asociadas." />
          <CardLink to="/newuser" title="Crear Usuario" desc="Crear nuevos operativos y supervisores." />
          <CardLink to="/viewusers" title="Ver Usuarios" desc="Consultar, filtrar y editar usuarios existentes." />
          <CardLink to="/createincident" title="Crear Incidente" desc="Registrar un incidente con prioridad visual clara." />
        </div>

        {/* Pie del dashboard */}
        <div className="mt-6 flex flex-col gap-2 text-xs text-[color:var(--cm-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Acceso restringido · Solo Supervisores</p>
          <p>Panel Supervisor</p>
        </div>
      </div>
    </div>
  );
}
