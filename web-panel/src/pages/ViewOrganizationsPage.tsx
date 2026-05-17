import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, PageHeader, PaginationBar, SearchInput, TableShell } from "../components/ui";
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
    return (
      <div className="cm-shell min-h-screen grid place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando organizaciones...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <PageHeader
          eyebrow="Administración"
          title="Organizaciones"
          actions={
            <>
              <Button onClick={() => navigate("/")}>Volver</Button>
              <Button tone="primary" onClick={() => navigate("/createorganization")}>
                Crear organizacion
              </Button>
            </>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card as="article" className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Organizaciones</p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--cm-info)]">{organizationKpis.totalOrganizations}</p>
          </Card>

          <Card as="article" className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              {organizacionSeleccionada ? `Miembros · ${organizacionSeleccionada.name}` : "Miembros"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--cm-success)]">{organizationKpis.totalMembers}</p>
          </Card>

          <Card as="article" className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              {organizacionSeleccionada ? `Incidentes · ${organizacionSeleccionada.name}` : "Incidentes"}
            </p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--cm-warning)]">{organizationKpis.totalIncidents}</p>
          </Card>
        </div>

        <div className="mt-4">
          <SearchInput
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por nombre, tipo o contacto..."
          />
        </div>

        {error && (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4">
          <TableShell minWidth="1220px">
            <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
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
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                    No hay organizaciones para mostrar.
                  </td>
                </tr>
              ) : (
                organizacionesPaginadas.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => setOrganizacionSeleccionadaId(org.id)}
                    className={`border-t border-[color:var(--cm-border)] transition cursor-pointer hover:bg-[color:var(--cm-surface-2)]/60 ${
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
                      <Badge tone={org.is_active ? "success" : "warning"}>{org.is_active ? "Activa" : "Inactiva"}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                      {org.created_at ? new Date(org.created_at).toLocaleString() : "Fecha desconocida"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Button
                          tone="primary"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/editorganization/${org.id}`);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          tone="danger"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            void prepararEliminarOrganizacion(org.id);
                          }}
                          disabled={Boolean(organizacionEliminandoId)}
                        >
                          {organizacionEliminandoId === org.id ? "Borrando..." : "Borrar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>
        </div>

        {filteredOrganizations.length > 0 && (
          <div className="mt-4">
            <PaginationBar
              page={paginaActual}
              totalPages={totalPaginas}
              visibleCount={organizacionesPaginadas.length}
              totalCount={filteredOrganizations.length}
              itemLabel="organizaciones"
              onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
              onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
            />
          </div>
        )}
      </div>

      {organizacionPendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="organizacion-eliminar-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
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
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-surface-2)]/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarEliminarOrganizacion(organizacionPendienteEliminar.id)}
                disabled={Boolean(organizacionEliminandoId)}
                className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
