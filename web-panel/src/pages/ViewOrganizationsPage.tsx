import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { DataTable, EmptyState, ErrorBanner, LoadingState, Pagination, SearchBar } from "../components/ui";

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

function obtenerEtiquetaTipoOrganizacion(tipo: string) {
  switch (tipo) {
    case "FIRE_DEPT":
      return "Departamento de Bomberos";
    case "MEDICAL":
      return "Servicio Médico";
    case "POLICE":
      return "Departamento de Policía";
    case "RESCUE":
      return "Servicio de Rescate";
    case "GOV":
      return "Agencia Gubernamental";
    case "NGO":
      return "Organización No Gubernamental";
    case "PRIVATE":
      return "Empresa Privada";
    case "CIVIL_PROTECTION":
      return "Protección Civil";
    case "VOLUNTEER":
      return "Voluntarios";
    case "OTHER":
      return "Otro";
    default:
      return tipo;
  }
}

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
  const [organizacionSeleccionadaId, setOrganizacionSeleccionadaId] = useState("");
  const [organizacionPendienteEliminarId, setOrganizacionPendienteEliminarId] = useState("");
  const [organizacionEliminandoId, setOrganizacionEliminandoId] = useState("");

  const organizacionSeleccionada = useMemo(
    () => organizations.find((org) => org.id === organizacionSeleccionadaId) ?? null,
    [organizations, organizacionSeleccionadaId]
  );

  const organizationKpis = useMemo(() => {
    const totalMembers = organizations.reduce((acc, org) => acc + (org.member_count ?? 0), 0);
    const totalIncidents = organizations.reduce((acc, org) => acc + (org.incident_count ?? 0), 0);

    return {
      totalOrganizations: organizations.length,
      totalMembers: organizacionSeleccionada?.member_count ?? totalMembers,
      totalIncidents: organizacionSeleccionada?.incident_count ?? totalIncidents,
    };
  }, [organizations, organizacionSeleccionada]);

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navigate("/", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as MeResponse;
      if (!meData.has_panel_full_access) {
        navigate("/", { replace: true });
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

  useEffect(() => {
    if (!organizacionSeleccionadaId) {
      return;
    }

    const organizacionExiste = organizations.some((org) => org.id === organizacionSeleccionadaId);
    if (!organizacionExiste) {
      setOrganizacionSeleccionadaId("");
    }
  }, [organizations, organizacionSeleccionadaId]);

  useEffect(() => {
    if (!organizacionPendienteEliminarId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !organizacionEliminandoId) {
        setOrganizacionPendienteEliminarId("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [organizacionPendienteEliminarId, organizacionEliminandoId]);

  const organizacionPendienteEliminar =
    organizations.find((org) => org.id === organizacionPendienteEliminarId) ?? null;

  async function prepararEliminarOrganizacion(organizationId: string) {
    setOrganizacionPendienteEliminarId(organizationId);
  }

  async function confirmarEliminarOrganizacion(organizationId: string) {
    if (organizacionEliminandoId) return;

    setError("");
    setOrganizacionEliminandoId(organizationId);
    try {
      const response = await apiFetch(`/organizations/${organizationId}/`, { method: "DELETE" });
      if (!response.ok) {
        let detail = "No se pudo borrar la organizacion.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          }
        } catch {
          // mantenemos el fallback
        }
        setError(detail);
        return;
      }

      setOrganizations((prev) => prev.filter((org) => org.id !== organizationId));
      setOrganizacionPendienteEliminarId("");
    } finally {
      setOrganizacionEliminandoId("");
    }
  }

  if (loading) {
    return <LoadingState label="Cargando organizaciones..." />;
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="cm-page w-full">
        <div className="cm-page-header">
          <div>
            <p className="cm-eyebrow">Administración</p>
            <h1 className="cm-page-title">Organizaciones</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="cm-btn cm-btn-secondary"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => navigate("/createorganization")}
              className="cm-btn cm-btn-primary"
            >
              Crear organizacion
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <article className="cm-metric-card">
            <p className="cm-eyebrow">Organizaciones</p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--cm-info)]">{organizationKpis.totalOrganizations}</p>
          </article>

          <article className="cm-metric-card">
            <p className="cm-eyebrow">
              {organizacionSeleccionada ? `Miembros · ${organizacionSeleccionada.name}` : "Miembros"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--cm-success)]">{organizationKpis.totalMembers}</p>
          </article>

          <article className="cm-metric-card">
            <p className="cm-eyebrow">
              {organizacionSeleccionada ? `Incidentes · ${organizacionSeleccionada.name}` : "Incidentes"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--cm-warning)]">{organizationKpis.totalIncidents}</p>
          </article>
        </div>

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
          placeholder="Buscar por nombre, tipo o contacto..."
          resultLabel={`${filteredOrganizations.length} de ${organizations.length} organizaciones`}
        />

        {error ? <ErrorBanner message={error} className="mt-4" /> : null}

        {filteredOrganizations.length === 0 ? (
          <EmptyState
            title="No hay organizaciones para mostrar"
            description={query ? "Prueba con otra búsqueda o limpia el filtro." : "Cuando haya organizaciones aparecerán en este listado."}
          />
        ) : (
          <div className="mt-4 grid gap-3 md:hidden">
            {organizacionesPaginadas.map((org) => (
              <article key={org.id} className="cm-card cm-card-pad">
                <button
                  type="button"
                  onClick={() => setOrganizacionSeleccionadaId(org.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{org.name}</h2>
                      <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{obtenerEtiquetaTipoOrganizacion(org.org_type)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ring-1 ${org.is_active ? "cm-badge-success" : "cm-badge-warning"}`}>
                      {org.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-[color:var(--cm-text-muted)]">
                    <p className="break-all">Email: {org.contact_email || "-"}</p>
                    <p>Teléfono: {org.contact_phone || "-"}</p>
                    <p>Dirección: {org.address || "-"}</p>
                    <p>Creada: {org.created_at ? new Date(org.created_at).toLocaleString() : "Fecha desconocida"}</p>
                  </div>
                </button>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navigate(`/editorganization/${org.id}`)} className="cm-btn cm-btn-primary">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void prepararEliminarOrganizacion(org.id)}
                    disabled={Boolean(organizacionEliminandoId)}
                    className="cm-btn cm-btn-danger"
                  >
                    {organizacionEliminandoId === org.id ? "Borrando..." : "Borrar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <DataTable minWidth="1220px" wrapperClassName="mt-4 hidden md:block">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Nombre</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Telefono</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Direccion</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Creada</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.length === 0 ? (
                <EmptyState colSpan={8} title="No hay organizaciones para mostrar" />
              ) : (
                organizacionesPaginadas.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => setOrganizacionSeleccionadaId(org.id)}
                    className={`cursor-pointer ${
                      organizacionSeleccionadaId === org.id ? "bg-[color:var(--cm-surface-2)]/70" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">{org.name}</td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                      {obtenerEtiquetaTipoOrganizacion(org.org_type)}
                    </td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{org.contact_email || "-"}</td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{org.contact_phone || "-"}</td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">{org.address || "-"}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                          org.is_active ? "cm-badge-success" : "cm-badge-warning"
                        }`}
                      >
                        {org.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                      {org.created_at ? new Date(org.created_at).toLocaleString() : "Fecha desconocida"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/editorganization/${org.id}`);
                          }}
                          className="cm-btn cm-btn-sm cm-btn-primary"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void prepararEliminarOrganizacion(org.id);
                          }}
                          disabled={Boolean(organizacionEliminandoId)}
                          className="cm-btn cm-btn-sm cm-btn-danger"
                        >
                          {organizacionEliminandoId === org.id ? "Borrando..." : "Borrar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </DataTable>

        <Pagination
          page={paginaActual}
          totalPages={totalPaginas}
          visibleCount={organizacionesPaginadas.length}
          totalCount={filteredOrganizations.length}
          itemLabel="organizaciones"
          onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
          onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
        />
      </div>

      {organizacionPendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="organizacion-eliminar-titulo"
        >
          <div className="cm-card w-full max-w-md p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Eliminar organizacion</p>
            <h2 id="organizacion-eliminar-titulo" className="mt-2 text-xl font-bold text-[color:var(--cm-text)]">
              ¿Quieres borrar esta organizacion?
            </h2>
            <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
              Se eliminara definitivamente la organizacion
              {organizacionPendienteEliminar.name ? ` "${organizacionPendienteEliminar.name}"` : ""}.
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOrganizacionPendienteEliminarId("")}
                disabled={Boolean(organizacionEliminandoId)}
                className="cm-btn cm-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarEliminarOrganizacion(organizacionPendienteEliminar.id)}
                disabled={Boolean(organizacionEliminandoId)}
                className="cm-btn cm-btn-danger"
              >
                {organizacionEliminandoId === organizacionPendienteEliminar.id ? "Borrando..." : "Confirmar borrado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
