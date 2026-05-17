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
      { label: "Crear alerta", to: "/createalert" },
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

  return (
    <div className="cm-shell flex h-screen">
      <aside className="relative w-72 border-r border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] text-[color:var(--cm-text)]">
        <div className="border-b border-white/6 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--cm-text-muted)]">Emergency</p>
          <h1 className="mt-1 text-lg font-bold">Panel de emergencias</h1>
          <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{user?.username}</p>
        </div>

        <nav className="mt-4 space-y-3 px-3 pb-24">
          {NAVIGATION_SECTIONS.map((section) => {
            const isOpen = openSections.includes(section.id);
            const isActiveSection = activeSectionIds.includes(section.id);

            return (
              <section
                key={section.id}
                className={`rounded-2xl border transition ${
                  isActiveSection
                    ? "border-[color:var(--cm-info)]/40 bg-[color:var(--cm-info)]/10"
                    : "border-white/8 bg-white/3"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <h2 className="mt-1 text-lg font-bold text-[color:var(--cm-text)]">{section.label}</h2>
                  </div>
                  <span
                    className={`text-lg text-[color:var(--cm-text-muted)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-white/8 px-2 py-2">
                    {section.items.map((item) =>
                      item.to ? (
                        <NavLink
                          key={item.label}
                          to={item.to}
                          end={item.to === "/"}
                          className={({ isActive }) =>
                            `mb-1 block rounded-xl px-3 py-2.5 text-base transition last:mb-0 ${
                              isActive
                                ? "bg-[color:var(--cm-info)]/25 font-semibold text-white"
                                : "text-[color:var(--cm-text)] hover:bg-[color:var(--cm-info)]/15"
                            }`
                          }
                        >
                          {item.label}
                        </NavLink>
                      ) : (
                        <div
                          key={item.label}
                          className="mb-1 rounded-xl px-3 py-2.5 text-base text-[color:var(--cm-text-muted)] opacity-70 last:mb-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span>{item.label}</span>
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
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

        <div className="absolute bottom-0 w-full p-3">
          <button
            onClick={() => void logout()}
            className="w-full rounded-xl bg-[color:var(--cm-danger)] py-2.5 text-white transition hover:brightness-110"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
