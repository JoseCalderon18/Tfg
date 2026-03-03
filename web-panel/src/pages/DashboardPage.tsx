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
      className="group block rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800 hover:bg-slate-900/80 hover:ring-slate-700 transition shadow-xl shadow-black/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-300">{desc}</p>
        </div>

        {badge ? (
          <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-slate-400">Abrir</span>
        <span className="text-slate-400 group-hover:text-slate-200 transition">→</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const navigate = useNavigate();

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

  async function handleLogout() {
    await apiFetch("/auth/panel/logout/", { method: "POST" });
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
          <p className="text-slate-300">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Fondo suave */}
      <div className="pointer-events-none fixed inset-0 opacity-25">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-600 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600/20 ring-1 ring-red-500/30">
              <span className="text-red-200 font-bold">EM</span>
            </div>
            <div>
              <p className="text-sm text-slate-400">Centro de mando</p>
              <h1 className="text-2xl font-bold tracking-tight">Panel de control de emergencias</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs text-slate-200 ring-1 ring-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operativo
            </span>
            <span className="rounded-full bg-slate-900/60 px-3 py-1 text-xs text-slate-200 ring-1 ring-slate-800">
              {me?.email ?? "Supervisor"}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navegación principal */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardLink
            to="/dashboard"
            title="Dashboard"
            desc="Vista general del sistema y accesos rápidos."
            badge="Inicio"
          />
          <CardLink
            to="/incidents"
            title="Incidentes"
            desc="Gestión y seguimiento de incidentes."
          />
          <CardLink
            to="/alerts"
            title="Alertas"
            desc="Revisar y emitir alertas operativas."
          />
          <CardLink
            to="/map"
            title="Mapa"
            desc="Visualizar recursos e incidentes en el mapa."
            badge="Geo"
          />
          <CardLink
            to="/viewunidades"
            title="Unidades"
            desc="Consultar estado y asignación de unidades."
          />
          <CardLink
            to="/settings"
            title="Ajustes"
            desc="Configuración del panel y preferencias."
          />
          <CardLink
            to="/newuser"
            title="Crear Usuario"
            desc="Crear nuevos usuarios del sistema."
          />
          <CardLink
            to="/viewusers"
            title="Ver Usuarios"
            desc="Ver y gestionar usuarios del sistema."
          />
        </div>

        {/* Barra inferior */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
          <p>Acceso restringido · Solo Supervisores</p>
          <p>Panel Supervisor</p>
        </div>
      </div>
    </div>
  );
}
