import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";

type UnidadOperativa = {
  id: string;
  username: string;
  email: string;
  role?: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
};

type PagedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

function normalizeUnits(payload: unknown): UnidadOperativa[] {
  if (Array.isArray(payload)) {
    return payload as UnidadOperativa[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as PagedResponse<UnidadOperativa>).results)) {
    return (payload as PagedResponse<UnidadOperativa>).results ?? [];
  }

  return [];
}

export function ViewUnidadesPage() {
  // Estado local para unidades operativas
  const [unidades, setUnidades] = useState<UnidadOperativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  // Carga inicial desde API de usuarios del panel
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/users/");
        if (!res.ok) {
          setError("No se pudieron cargar las unidades.");
          setLoading(false);
          return;
        }

        const data = (await res.json()) as unknown;
        const normalized = normalizeUnits(data);
        setUnidades(normalized);
        setTotal(Array.isArray(data) ? normalized.length : Number((data as PagedResponse<UnidadOperativa>)?.count ?? normalized.length));
      } catch {
        setError("Error de red al cargar unidades.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtro simple por texto para facilitar pruebas de interfaz
  const unidadesFiltradas = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return unidades;

    return unidades.filter((u) => {
      return (
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.organization_name ?? "").toLowerCase().includes(query) ||
        (u.role ?? "").toLowerCase().includes(query)
      );
    });
  }, [search, unidades]);

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando unidades operativas...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen px-3 py-4 lg:px-4 lg:py-5 2xl:px-5">
      {/* Encabezado y filtro */}
      <div className="w-full">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="mt-1 text-2xl font-bold lg:text-3xl">Unidades operativas</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Vista compacta de usuarios operativos, supervisores y admins disponibles para pruebas del panel.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario, email, rol u organización"
            className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-accent)]"
          />
        </div>

        {/* Resumen superior */}
        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Total cargado</p>
            <p className="mt-1 text-2xl font-bold">{total}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Coincidencias</p>
            <p className="mt-1 text-2xl font-bold">{unidadesFiltradas.length}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Fuente</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--cm-text)]">API `/users/` con paginacion DRF</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Lectura</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--cm-text)]">Tabla expandida para pantallas grandes</p>
          </div>
        </div>

        {/* Mensaje de error */}
        {error ? (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">{error}</div>
        ) : null}

        {/* Tabla principal */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Usuario</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Rol</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Organizacion</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Alta</th>
              </tr>
            </thead>
            <tbody>
              {unidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                    No hay unidades para mostrar.
                  </td>
                </tr>
              ) : (
                unidadesFiltradas.map((unidad) => (
                  <tr key={unidad.id} className="border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60">
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">{unidad.username}</td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{unidad.email}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{unidad.role ?? "Sin rol"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{unidad.organization_name ?? "Sin organizacion"}</td>
                    <td className="px-4 py-3">
                      <span className={unidad.is_active ? "cm-badge-success rounded-full px-2.5 py-1 text-xs" : "cm-badge-warning rounded-full px-2.5 py-1 text-xs"}>
                        {unidad.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{new Date(unidad.created_at).toLocaleString()}</td>
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
