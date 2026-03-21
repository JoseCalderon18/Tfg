import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type MeResponse = {
  authenticated: boolean;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

type Organization = {
  id: string;
  name: string;
  org_type: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  member_count?: number;
  incident_count?: number;
};

function normalizeOrganizations(raw: unknown): Organization[] {
  const source = Array.isArray(raw)
    ? raw
    : (raw as { results?: unknown[] } | null)?.results ?? [];



  return source
    .map((item) => item as Partial<Organization>)
    .filter((row) => typeof row?.id === "string" && typeof row?.name === "string")
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      org_type: typeof row.org_type === "string" ? row.org_type : "OTHER",
      contact_email: row.contact_email ?? null,
      contact_phone: row.contact_phone ?? null,
      address: row.address ?? null,
      is_active: Boolean(row.is_active),
      member_count: typeof row.member_count === "number" ? row.member_count : 0,
      incident_count: typeof row.incident_count === "number" ? row.incident_count : 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
}

export default function ViewOrganizationsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const organizationKpis = useMemo(() => {
  const totalMembers = organizations.reduce((acc, org) => acc + (org.member_count ?? 0), 0);
  const totalIncidents = organizations.reduce((acc, org) => acc + (org.incident_count ?? 0), 0);

    return {
      totalOrganizations: organizations.length,
      totalMembers,
      totalIncidents,
    };
  }, [organizations]);


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

      const orgsRes = await apiFetch("/organizations/");
      if (!orgsRes.ok) {
        setError("No se pudo cargar la lista de organizaciones.");
        setLoading(false);
        return;
      }

      const data = (await orgsRes.json()) as unknown;
      setOrganizations(normalizeOrganizations(data));
      setLoading(false);
    })();
  }, [navigate]);

  const filteredOrganizations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) =>
      `${org.name} ${org.org_type} ${org.contact_email ?? ""} ${org.contact_phone ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, organizations]);

  const [paginaActual, setPaginaActual] = useState(1);
  const ELEMENTOS_POR_PAGINA = 10;
  const totalPaginas = Math.max(1, Math.ceil(filteredOrganizations.length / ELEMENTOS_POR_PAGINA));
  const organizacionesPaginadas = filteredOrganizations.slice(
    (paginaActual - 1) * ELEMENTOS_POR_PAGINA,
    paginaActual * ELEMENTOS_POR_PAGINA
  );

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <p className="text-slate-300">Cargando organizaciones...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Administracion</p>
            <h1 className="text-2xl font-bold">Organizaciones</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 hover:bg-slate-800 transition"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => navigate("/createorganization")}
              className="rounded-xl bg-blue-500/60 px-4 py-2 text-sm font-semibold ring-1 ring-blue-500 hover:bg-blue-500/80 transition"
            >
              Crear organizacion
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
            <p className="text-sm text-slate-400">Organizaciones</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{organizationKpis.totalOrganizations}</p>
          </article>

          <article className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
            <p className="text-sm text-slate-400">Miembros</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">{organizationKpis.totalMembers}</p>
          </article>

          <article className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
            <p className="text-sm text-slate-400">Incidentes</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{organizationKpis.totalIncidents}</p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por nombre, tipo o contacto..."
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
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Telefono</th>
                <th className="px-4 py-3 text-left">Direccion</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Creada</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No hay organizaciones para mostrar.
                  </td>
                </tr>
              ) : (
                organizacionesPaginadas.map((org) => (
                  <tr key={org.id} className="border-t border-slate-800/80">
                    <td className="px-4 py-3 font-medium text-slate-100">{org.name}</td>
                    <td className="px-4 py-3 text-slate-300">{org.org_type === "FIRE_DEPT" ? "Departamento de Bomberos": 
                    org.org_type === "MEDICAL" ? "Servicio Médico" :
                    org.org_type === "POLICE" ? "Departamento de Policía" :
                    org.org_type === "RESCUE" ? "Servicio de Rescate" :
                    org.org_type === "OTHER" ? "Otro" : org.org_type
                    }</td>
                    <a href={`mailto:${org.contact_email}`} target="_blank" rel="noopener noreferrer">
                      <td className="px-4 py-3 text-slate-300">{org.contact_email || "-"}</td>
                    </a>
                    <td className="px-4 py-3 text-slate-300">{org.contact_phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{org.address || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                          org.is_active
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                            : "bg-slate-500/15 text-slate-300 ring-slate-500/30"
                        }`}
                      >
                        {org.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {org.created_at ? new Date(org.created_at).toLocaleString() : "Fecha desconocida"}
                    </td>
                    <td className="px-4 py-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/editorganization/${org.id}`)}
                        className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                      >Editar</button>
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredOrganizations.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Pagina {paginaActual} de {totalPaginas} · Mostrando {organizacionesPaginadas.length} de {filteredOrganizations.length} organizaciones
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                disabled={paginaActual === 1}
                className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                disabled={paginaActual === totalPaginas}
                className="rounded-xl bg-slate-900/60 px-4 py-2 text-sm font-semibold ring-1 ring-slate-800 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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

