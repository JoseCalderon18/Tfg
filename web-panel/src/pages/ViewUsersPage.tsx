import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { DataTable, ErrorBanner, LoadingState, PageHeader, SearchBar } from "../components/ui";

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
            <>
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
            </>
          }
        />

        <SearchBar
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPaginaActual(1);
          }}
          placeholder="Buscar por username, email o rol..."
        />

        {error ? <ErrorBanner message={error} className="mt-4" /> : null}

        <DataTable minWidth="1050px">
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
                <tr>
                  <td colSpan={6} className="cm-empty-state">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
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

        {filteredUsers.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[color:var(--cm-text-muted)]">
              Página {paginaActual} de {totalPaginas} · Mostrando {usuariosPaginados.length} de {filteredUsers.length} usuarios
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                disabled={paginaActual === 1}
                className="cm-btn cm-btn-secondary"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                disabled={paginaActual === totalPaginas}
                className="cm-btn cm-btn-secondary"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
