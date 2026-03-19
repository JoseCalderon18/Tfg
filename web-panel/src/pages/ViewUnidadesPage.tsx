import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type UnidadOperativa = {
  id: string;
  username: string;
  email: string;
  role?: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
  especialidades?: string[];
  dni?: string;
};

type UnidadOperativaApi = UnidadOperativa & {
  specialties?: string[];
};

type PagedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

function normalizeUnits(payload: unknown): UnidadOperativa[] {
  if (Array.isArray(payload)) {
    return (payload as UnidadOperativaApi[]).map((unidad) => ({
      ...unidad,
      especialidades: Array.isArray(unidad.especialidades)
        ? unidad.especialidades
        : Array.isArray(unidad.specialties)
          ? unidad.specialties
          : [],
    }));
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as PagedResponse<UnidadOperativaApi>).results)) {
    return ((payload as PagedResponse<UnidadOperativaApi>).results ?? []).map((unidad) => ({
      ...unidad,
      especialidades: Array.isArray(unidad.especialidades)
        ? unidad.especialidades
        : Array.isArray(unidad.specialties)
          ? unidad.specialties
          : [],
    }));
  }

  return [];
}

function obtenerResultadosPaginados(payload: unknown): UnidadOperativaApi[] | null {
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as PagedResponse<UnidadOperativaApi>).results)
  ) {
    return (payload as PagedResponse<UnidadOperativaApi>).results ?? [];
  }

  return null;
}

async function cargarTodasLasUnidades(): Promise<{ unidades: UnidadOperativa[]; total: number }> {
  const unidadesAcumuladas: UnidadOperativaApi[] = [];
  let urlSiguiente: string | null = "/users/";
  let totalRegistros = 0;

  while (urlSiguiente) {
    const respuesta = urlSiguiente.startsWith("http")
      ? await fetch(urlSiguiente, {
          headers: { Accept: "application/json" },
          credentials: "include",
        })
      : await apiFetch(urlSiguiente);

    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar las unidades.");
    }

    const datos = (await respuesta.json()) as unknown;
    const resultadosPaginados = obtenerResultadosPaginados(datos);

    if (resultadosPaginados) {
      unidadesAcumuladas.push(...resultadosPaginados);
      totalRegistros = Number((datos as PagedResponse<UnidadOperativaApi>).count ?? unidadesAcumuladas.length);
      urlSiguiente = (datos as PagedResponse<UnidadOperativaApi>).next ?? null;
      continue;
    }

    const unidadesNormalizadas = normalizeUnits(datos);
    return {
      unidades: unidadesNormalizadas,
      total: Array.isArray(datos) ? unidadesNormalizadas.length : totalRegistros || unidadesNormalizadas.length,
    };
  }

  return {
    unidades: normalizeUnits(unidadesAcumuladas),
    total: totalRegistros || unidadesAcumuladas.length,
  };
}

function obtenerEtiquetaRol(role?: string) {
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "OPERATIVE") return "Operativo";
  if (role === "ADMIN") return;
  return "Sin rol";
}

function obtenerClaseRol(role?: string) {
  if (role === "SUPERVISOR") return "bg-sky-500/15 text-sky-200 ring-sky-500/30";
  if (role === "OPERATIVE") return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
  if (role === "ADMIN") return "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30";
  return "bg-slate-500/15 text-slate-300 ring-slate-500/30";
}

export function ViewUnidadesPage() {
  const navigate = useNavigate();

  const [unidades, setUnidades] = useState<UnidadOperativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchEspecialidad, setSearchEspecialidad] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [filtroRol, setFiltroRol] = useState<"TODAS" | "SUPERVISOR" | "OPERATIVE" | "ADMIN">("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "ACTIVAS" | "INACTIVAS">("TODAS");

  useEffect(() => {
    (async () => {
      try {
        const { unidades: unidadesCargadas, total: totalCargado } = await cargarTodasLasUnidades();
        setUnidades(unidadesCargadas);
        setTotal(totalCargado);
      } catch {
        setError("Error de red al cargar unidades.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unidadesFiltradas = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryEspecialidad = searchEspecialidad.trim().toLowerCase();

    return unidades.filter((unidad) => {
      if (unidad.role === "ADMIN") {
        return false;
      }

      const coincideTexto =
        !query ||
        unidad.username.toLowerCase().includes(query) ||
        unidad.email.toLowerCase().includes(query) ||
        unidad.dni?.toLowerCase().includes(query) ||
        (unidad.organization_name ?? "").toLowerCase().includes(query) ||
        (unidad.especialidades ?? []).some((esp) => esp.toLowerCase().includes(query)) ||
        (unidad.role ?? "").toLowerCase().includes(query);

      const coincideEspecialidad =
        !queryEspecialidad ||
        (unidad.especialidades ?? []).some((esp) => esp.toLowerCase().includes(queryEspecialidad));

      const coincideRol = filtroRol === "TODAS" || unidad.role === filtroRol;
      const coincideEstado =
        filtroEstado === "TODAS" ||
        (filtroEstado === "ACTIVAS" && unidad.is_active) ||
        (filtroEstado === "INACTIVAS" && !unidad.is_active);

      return coincideTexto && coincideEspecialidad && coincideRol && coincideEstado;
    });
  }, [search, searchEspecialidad, unidades, filtroRol, filtroEstado]);

  const metricas = useMemo(() => {
    const unidadesOperativas = unidades.filter((unidad) => unidad.role !== "ADMIN");
    const supervisores = unidadesOperativas.filter((unidad) => unidad.role === "SUPERVISOR").length;
    const operativos = unidadesOperativas.filter((unidad) => unidad.role === "OPERATIVE").length;
    const admins = unidades.filter((unidad) => unidad.role === "ADMIN").length;
    const activas = unidadesOperativas.filter((unidad) => unidad.is_active).length;
    const inactivas = unidadesOperativas.length - activas;
    const sinOrganizacion = unidadesOperativas.filter((unidad) => !unidad.organization_name).length;

    return {
      supervisores,
      operativos,
      admins,
      activas,
      inactivas,
      sinOrganizacion,
    };
  }, [unidades]);

  const organizacionesResumen = useMemo(() => {
    const conteo = new Map<string, number>();

    unidadesFiltradas.forEach((unidad) => {
      const organizacion = unidad.organization_name ?? "Sin organizacion";
      conteo.set(organizacion, (conteo.get(organizacion) ?? 0) + 1);
    });

    return Array.from(conteo.entries())
      .map(([organizacion, cantidad]) => ({ organizacion, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [unidadesFiltradas]);

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando unidades operativas...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold lg:text-3xl">Centro de unidades</h1>
            <p className="mt-1 max-w-3xl text-sm text-[color:var(--cm-text-muted)]">
              Vista de prueba para supervisar operativos y supervisores del sistema, detectar huecos de organización y revisar disponibilidad.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/viewusers")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Ver usuarios
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Total cargado</p>
            <p className="mt-2 text-2xl font-bold">{total}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Activas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{metricas.activas}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Inactivas</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{metricas.inactivas}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Supervisores</p>
            <p className="mt-2 text-2xl font-bold">{metricas.supervisores}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativos</p>
            <p className="mt-2 text-2xl font-bold">{metricas.operativos}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Sin organización</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">{metricas.sinOrganizacion}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 2xl:grid-cols-[1.65fr_0.95fr]">
          <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuario, email, dni, rol u organización"
                className="min-w-0 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-accent)]"
              />
              <input
                value={searchEspecialidad}
                onChange={(e) => setSearchEspecialidad(e.target.value)}
                placeholder="Buscar por especialidad"
                className="min-w-0 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-accent)]"
              />

              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value as typeof filtroRol)}
                className="min-w-0 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-accent)]"
              >
                <option value="TODAS">Todos los roles</option>
                <option value="SUPERVISOR">Supervisores</option>
                <option value="OPERATIVE">Operativos</option>
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
                className="min-w-0 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-accent)]"
              >
                <option value="TODAS">Todos los estados</option>
                <option value="ACTIVAS">Solo activas</option>
                <option value="INACTIVAS">Solo inactivas</option>
              </select>
            </div>

            {error ? <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">{error}</div> : null}

            <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Unidad</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Correo</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">DNI</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Rol operativo</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Organización</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Disponibilidad</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Especialidades</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Alta</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {unidadesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                        No hay unidades para mostrar.
                      </td>
                    </tr>
                  ) : (
                    unidadesFiltradas.map((unidad) => (
                      <tr key={unidad.id} className="border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60">
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-[color:var(--cm-text)]">{unidad.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{unidad.email}</td>
                        <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{unidad.dni}</td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-2.5 py-1 text-xs ring-1 ${obtenerClaseRol(unidad.role)}`}>
                            {obtenerEtiquetaRol(unidad.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">{unidad.organization_name ?? "Sin organizacion"}</td>
                        <td className="px-4 py-3">
                          <span className={unidad.is_active ? "cm-badge-success rounded-full px-2.5 py-1 text-xs" : "cm-badge-warning rounded-full px-2.5 py-1 text-xs"}>
                            {unidad.is_active ? "Disponible" : "No disponible"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {unidad.especialidades?.map((esp, index) => (
                              <span key={index} className="rounded-full bg-[color:var(--cm-info)] px-2.5 py-1 text-xs text-white">
                                {esp}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{new Date(unidad.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/editunit/${unidad.id}`)}
                            className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                          >
                            Abrir ficha
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Lectura rápida</p>
              <h2 className="mt-2 text-lg font-bold">Estado del despliegue</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Coincidencias actuales</p>
                  <p className="mt-1 text-2xl font-bold">{unidadesFiltradas.length}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Supervisores</p>
                  <p className="mt-1 text-2xl font-bold">{metricas.supervisores}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativos</p>
                  <p className="mt-1 text-2xl font-bold">{metricas.operativos}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativos sin organización</p>
                  <p className="mt-1 text-2xl font-bold">{metricas.sinOrganizacion}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Top organizaciones</p>
              <h2 className="mt-2 text-lg font-bold">Concentración de unidades</h2>
              <div className="mt-4 space-y-3">
                {organizacionesResumen.length === 0 ? (
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm text-[color:var(--cm-text-muted)]">
                    No hay datos suficientes para construir el resumen.
                  </div>
                ) : (
                  organizacionesResumen.map((item) => (
                    <div key={item.organizacion} className="flex items-center justify-between rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                      <div>
                        <p className="font-medium text-[color:var(--cm-text)]">{item.organizacion}</p>
                        <p className="text-xs text-[color:var(--cm-text-muted)]">Carga operativa actual</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--cm-info)]/15 px-3 py-1 text-sm font-semibold text-[color:var(--cm-info)] ring-1 ring-[color:var(--cm-info)]/30">
                        {item.cantidad}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
