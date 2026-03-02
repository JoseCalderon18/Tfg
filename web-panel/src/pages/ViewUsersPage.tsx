import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  role?: string;
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
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as MeResponse;
      if (meData.role !== "SUPERVISOR") {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <p className="text-slate-300">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Administracion</p>
            <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
          >
            Volver
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por username, email o rol..."
            className="w-full rounded-xl bg-slate-950/40 px-4 py-2.5 text-slate-100 ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-2xl bg-slate-900/60 ring-1 ring-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/90 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Creado</th>
                <th className="px-4 py-3 text-left">Editar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-800/80">
                    <td className="px-4 py-3 font-medium text-slate-100">{u.username}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>
                    <td className="px-4 py-3 text-slate-300">{u.role ?? "Sin rol asignado"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                            : "bg-slate-500/15 text-slate-300 ring-slate-500/30"
                        }`}
                      >
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : "Fecha desconocida"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/edituser/${u.id}`)}
                        className="rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 transition"
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
      </div>
    </div>
  );
}
