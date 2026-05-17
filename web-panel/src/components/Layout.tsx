import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

type NavigationItem = {
  label: string;
  to?: string;
};

type NavigationSection = {
  id: string;
  label: string;
  items: NavigationItem[];
};

const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: "command-center",
    label: "Centro de mando",
    items: [
      { label: "Inicio", to: "/" },
      { label: "Meteorología", to: "/weather" },
      { label: "Rayos", to: "/lightning" },
    ],
  },
  {
    id: "operations",
    label: "Operaciones",
    items: [
      { label: "Incidentes", to: "/incidents" },
      { label: "Chat", to: "/chats" },
      { label: "Jornadas", to: "/journeys" },
      { label: "Alertas", to: "/alerts" },
    ],
  },
  {
    id: "resources",
    label: "Recursos",
    items: [
      { label: "Unidades", to: "/viewunidades" },
      { label: "Organizaciones", to: "/vieworganizations" },
    ],
  },
  {
    id: "terrain",
    label: "Terreno",
    items: [
      { label: "Áreas de trabajo", to: "/workarea" },
      { label: "Puntos de interés", to: "/points" },
    ],
  },
  {
    id: "administration",
    label: "Administración",
    items: [
      { label: "Ajustes" },
      { label: "Usuarios", to: "/viewusers" },
      { label: "Auditoría" },
      { label: "Reportes" },
    ],
  },
];

function getDefaultOpenSections(pathname: string) {
  const sections = NAVIGATION_SECTIONS.filter((section) =>
    section.items.some((item) => item.to && (pathname === item.to || pathname.startsWith(`${item.to}/`)))
  ).map((section) => section.id);

  return sections.length > 0 ? sections : ["command-center"];
}

export default function Layout() {
  const { user, logout, isAuthenticated, isCheckingAuth } = useAuthStore();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<string[]>(() => getDefaultOpenSections(location.pathname));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeSectionIds = useMemo(
    () =>
      NAVIGATION_SECTIONS.filter((section) =>
        section.items.some(
          (item) => item.to && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
        )
      ).map((section) => section.id),
    [location.pathname]
  );

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  if (isCheckingAuth) {
    return <div className="cm-shell min-h-screen p-6">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]
    );
  };

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">
          Emergency
        </p>
        <h1 className="mt-1 truncate text-base font-bold">Panel de emergencias</h1>
        <p className="mt-0.5 truncate text-xs text-[color:var(--cm-text-muted)]">{user?.username}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAVIGATION_SECTIONS.map((section) => {
          const isOpen = openSections.includes(section.id);
          const isActiveSection = activeSectionIds.includes(section.id);

          return (
            <section key={section.id} className="mb-3 last:mb-0">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  isActiveSection
                    ? "text-[color:var(--cm-info)]"
                    : "text-[color:var(--cm-text-muted)] hover:bg-white/5 hover:text-[color:var(--cm-text)]"
                }`}
              >
                <span>{section.label}</span>
                <span
                  aria-hidden="true"
                  className={`text-xs leading-none transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  v
                </span>
              </button>

              {isOpen ? (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) =>
                    item.to ? (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          `relative block rounded-lg py-2 pl-3 pr-2 text-sm transition ${
                            isActive
                              ? "bg-[color:var(--cm-info)]/18 font-semibold text-white shadow-[inset_3px_0_0_var(--cm-info)]"
                              : "text-[color:var(--cm-text-muted)] hover:bg-white/6 hover:text-[color:var(--cm-text)]"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ) : (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-2 rounded-lg py-2 pl-3 pr-2 text-sm text-[color:var(--cm-text-muted)] opacity-70"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]">
                          Próx.
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg border border-[color:var(--cm-danger)]/45 bg-[color:var(--cm-danger)]/14 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-[color:var(--cm-danger)] hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="cm-shell min-h-screen lg:flex lg:h-screen lg:overflow-hidden">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[color:var(--cm-border)] bg-[color:var(--cm-bg)]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">
            Emergency
          </p>
          <p className="truncate text-sm font-semibold text-[color:var(--cm-text)]">Panel de emergencias</p>
        </div>
        <button
          type="button"
          aria-expanded={isMobileSidebarOpen}
          aria-controls="panel-sidebar"
          onClick={() => setIsMobileSidebarOpen((current) => !current)}
          className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-3 py-2 text-sm font-semibold text-[color:var(--cm-text)]"
        >
          {isMobileSidebarOpen ? "Cerrar" : "Menú"}
        </button>
      </header>

      {isMobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/55 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <aside
        id="panel-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,calc(100vw-2rem))] shrink-0 flex-col border-r border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] text-[color:var(--cm-text)] shadow-[8px_0_24px_rgba(0,0,0,0.26)] transition-transform duration-200 lg:static lg:z-auto lg:h-auto lg:w-64 lg:translate-x-0 lg:shadow-[8px_0_24px_rgba(0,0,0,0.16)] ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
