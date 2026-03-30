import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

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
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <p className="text-slate-300">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Administracion</p>
            <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => navigate("/newuser")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Crear Usuario
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-3.5">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por username, email o rol..."
            className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
          />
        </div>

        {error && (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : (
                usuariosPaginados.map((u) => (
                  <tr key={u.id} className="border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60">
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
                        className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                      >
                        Editar usuario
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[color:var(--cm-text-muted)]">
              Pagina {paginaActual} de {totalPaginas} · Mostrando {usuariosPaginados.length} de {filteredUsers.length} usuarios
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                disabled={paginaActual === 1}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                disabled={paginaActual === totalPaginas}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
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
