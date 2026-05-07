import { useMemo, useState } from "react";
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
      { label: "Usuarios", to: "/viewusers" },
      { label: "Auditoría" },
      { label: "Reportes", to: "/reports" },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeSectionIds = useMemo(
    () =>
      NAVIGATION_SECTIONS.filter((section) =>
        section.items.some(
          (item) => item.to && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
        )
      ).map((section) => section.id),
    [location.pathname]
  );

  if (isCheckingAuth) {
    return (
      <div className="cm-loading-state">
        <div className="cm-loading-inline">
          <span className="cm-spinner" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]
    );
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] text-[color:var(--cm-text)] shadow-2xl lg:shadow-none">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--cm-text-muted)]">Emergencias</p>
            <h1 className="mt-1 text-lg font-bold">Panel de emergencias</h1>
            <p className="mt-1 truncate text-sm text-[color:var(--cm-text-muted)]">{user?.username}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsMobileMenuOpen(false)}
            className="cm-btn cm-btn-secondary cm-btn-sm lg:hidden"
          >
            ×
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {NAVIGATION_SECTIONS.map((section) => {
          const isOpen = openSections.includes(section.id);
          const isActiveSection = activeSectionIds.includes(section.id);

          return (
            <section
              key={section.id}
              className={`rounded-xl border transition ${
                isActiveSection
                  ? "border-[color:var(--cm-info)] bg-[color:var(--cm-info)]/12 shadow-[inset_3px_0_0_var(--cm-info)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--cm-text)]">
                  {section.label}
                </h2>
                <span
                  aria-hidden="true"
                  className={`text-sm text-[color:var(--cm-text-muted)] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-white/10 px-2 py-2">
                  {section.items.map((item) =>
                    item.to ? (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `mb-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition last:mb-0 ${
                            isActive
                              ? "bg-[color:var(--cm-info)] font-semibold text-white shadow-[inset_3px_0_0_rgba(255,255,255,0.9)]"
                              : "text-[color:var(--cm-text)] hover:bg-[color:var(--cm-info)]/15"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span>{item.label}</span>
                            {isActive ? <span className="text-xs uppercase tracking-[0.14em]">Activo</span> : null}
                          </>
                        )}
                      </NavLink>
                    ) : (
                      <div
                        key={item.label}
                        className="mb-1 rounded-lg px-3 py-2.5 text-sm text-[color:var(--cm-text-muted)] opacity-75 last:mb-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{item.label}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                            Próximamente
                          </span>
                        </div>
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
        <button onClick={() => void logout()} className="cm-btn cm-btn-danger w-full">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="cm-shell h-screen lg:flex">
      <header className="flex h-16 items-center justify-between border-b border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 lg:hidden">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--cm-text-muted)]">Panel</p>
          <p className="text-sm font-semibold">Emergencias</p>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="cm-btn cm-btn-secondary"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-sidebar"
        >
          Menú
        </button>
      </header>

      <div className="hidden lg:block">{sidebar}</div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-sidebar">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative h-full">{sidebar}</div>
        </div>
      ) : null}

      <main className="h-[calc(100vh-4rem)] overflow-auto lg:h-screen lg:flex-1">
        <Outlet />
      </main>
    </div>
  );
}
