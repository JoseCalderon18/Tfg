import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { DataTable, EmptyState, ErrorBanner, LoadingState, PageHeader, Pagination, SearchBar } from "../components/ui";
import TourButton from "../components/TourGuide";

type MeResponse = {
  authenticated: boolean;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

type UserRow = {
  id: string;
  username: string;
  email: string;
  role?: string;
  is_active: boolean;
  created_at?: string;
};

export default function ViewUsersPage() {
  // Navegación y estado principal de la vista
  const navigate = useNavigate();
  const USUARIOS_POR_PAGINA = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as MeResponse;
      if (!meData.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      const usersRes = await apiFetch("/auth/panel/users/");
      if (!usersRes.ok) {
        setError("No se pudo cargar la lista de usuarios.");
        setLoading(false);
        return;
      }

      const data = (await usersRes.json()) as UserRow[];
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, [navigate]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.username} ${u.email} ${u.role ?? ""}`.toLowerCase().includes(q)
    );
  }, [query, users]);

  const totalPaginas = Math.max(1, Math.ceil(filteredUsers.length / USUARIOS_POR_PAGINA));

  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * USUARIOS_POR_PAGINA;
    const fin = inicio + USUARIOS_POR_PAGINA;
    return filteredUsers.slice(inicio, fin);
  }, [filteredUsers, paginaActual, USUARIOS_POR_PAGINA]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  if (loading) {
    return <LoadingState label="Cargando usuarios..." />;
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="cm-page w-full">
        <PageHeader
          eyebrow="Administración"
          title="Usuarios del sistema"
          actions={
            <div data-tour="users-actions" className="flex items-center gap-2">
              <TourButton
                steps={[
                  {
                    selector: '[data-tour="users-actions"]',
                    title: "Acciones de usuarios",
                    description: "Volver regresa al dashboard principal. Crear Usuario abre el formulario para registrar un nuevo usuario en el sistema con username, email, contraseña y rol.",
                  },
                  {
                    selector: '[data-tour="users-search"]',
                    title: "Búsqueda de usuarios",
                    description: "Escribe el nombre de usuario, correo electrónico o rol para filtrar la lista. El contador muestra cuántos resultados coinciden con tu búsqueda sobre el total.",
                  },
                  {
                    selector: '[data-tour="users-table"]',
                    title: "Tabla de usuarios",
                    description: "Lista completa de usuarios del sistema con su username, email, rol (ADMIN / COMMAND / OPERATIVE), estado activo o inactivo y fecha de registro. Pulsa Editar para modificar los datos o cambiar el estado de la cuenta.",
                  },
                ]}
              />
              <button
                type="button"
                onClick={() => navigate("/")}
                className="cm-btn cm-btn-secondary"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => navigate("/newuser")}
                className="cm-btn cm-btn-primary"
              >
                Crear Usuario
              </button>
            </div>
          }
        />

        <div data-tour="users-search">
          <SearchBar
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPaginaActual(1);
            }}
            onClear={() => {
              setQuery("");
              setPaginaActual(1);
            }}
            placeholder="Buscar por username, email o rol..."
            resultLabel={`${filteredUsers.length} de ${users.length} usuarios`}
          />
        </div>

        {error ? <ErrorBanner message={error} className="mt-4" /> : null}

        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No hay usuarios para mostrar"
            description={query ? "Prueba con otra búsqueda o limpia el filtro." : "Cuando haya usuarios aparecerán en este listado."}
          />
        ) : (
          <div className="mt-4 grid gap-3 md:hidden">
            {usuariosPaginados.map((u) => (
              <article key={u.id} className="cm-card cm-card-pad">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{u.username}</h2>
                    <p className="mt-1 break-all text-sm text-[color:var(--cm-text-muted)]">{u.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ring-1 ${u.is_active ? "cm-badge-success" : "cm-badge-warning"}`}>
                    {u.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[color:var(--cm-text-muted)]">
                  <p>Rol: {u.role ?? "Sin rol asignado"}</p>
                  <p>Creado: {u.created_at ? new Date(u.created_at).toLocaleString() : "Fecha desconocida"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/edituser/${u.id}`)}
                  className="cm-btn cm-btn-primary mt-4 w-full"
                >
                  Editar usuario
                </button>
              </article>
            ))}
          </div>
        )}

        <div data-tour="users-table">
        <DataTable minWidth="1050px" wrapperClassName="mt-4 hidden md:block">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Username</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Rol</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Creado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Editar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <EmptyState colSpan={6} title="No hay usuarios para mostrar" />
              ) : (
                usuariosPaginados.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">{u.username}</td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{u.role ?? "Sin rol asignado"}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                          u.is_active
                            ? "cm-badge-success"
                            : "cm-badge-warning"
                        }`}
                      >
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : "Fecha desconocida"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/edituser/${u.id}`)}
                        className="cm-btn cm-btn-sm cm-btn-primary"
                      >
                        Editar usuario
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </DataTable>
        </div>

        <Pagination
          page={paginaActual}
          totalPages={totalPaginas}
          visibleCount={usuariosPaginados.length}
          totalCount={filteredUsers.length}
          itemLabel="usuarios"
          onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
          onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
        />
      </div>

    </div>
  );
}
