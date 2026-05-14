import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MapaMiniUnidad from "../components/MapaMiniUnidad";
import { apiFetch } from "../utils/api";

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type JourneyApi = {
  id: number;
  created_at?: string | null;
  user?: string | null;
  user_id?: string | null;
  account_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location_start?: unknown;
  location_stop?: unknown;
  notes?: unknown;
};

type UsuarioUnidad = {
  id: string;
  profile_id?: string;
  username: string;
  email: string;
  role?: string;
  organization_name?: string;
  is_active?: boolean;
};

type JourneyRow = JourneyApi & {
  startCoords: { lat: number; lng: number } | null;
  stopCoords: { lat: number; lng: number } | null;
  notesText: string;
};

function extraerCoordenadas(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lng = Number(location[0]);
    const lat = Number(location[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }

  if (typeof location === "object") {
    const obj = location as {
      coordinates?: unknown;
      x?: unknown;
      y?: unknown;
      lat?: unknown;
      lng?: unknown;
      lon?: unknown;
    };

    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lng = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }

    if (obj.x !== undefined && obj.y !== undefined) {
      const lng = Number(obj.x);
      const lat = Number(obj.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }

    if (obj.lat !== undefined && (obj.lng !== undefined || obj.lon !== undefined)) {
      const lat = Number(obj.lat);
      const lng = Number(obj.lng ?? obj.lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
  }

  if (typeof location === "string") {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString("es-ES");
}

function normalizeNotes(notes: unknown) {
  if (typeof notes === "string") return notes.trim();
  if (!notes || typeof notes !== "object") return "";

  const candidate = notes as { text?: unknown };
  if (typeof candidate.text === "string") return candidate.text.trim();

  try {
    return JSON.stringify(notes, null, 2);
  } catch {
    return "";
  }
}

function normalizeJourneys(payload: unknown): JourneyRow[] {
  const source = Array.isArray(payload)
    ? payload
    : (payload as { results?: JourneyApi[] } | null)?.results ?? [];

  return source
    .map((journey) => journey as JourneyApi)
    .filter((journey) => typeof journey.id === "number")
    .map((journey) => ({
      ...journey,
      startCoords: extraerCoordenadas(journey.location_start),
      stopCoords: extraerCoordenadas(journey.location_stop),
      notesText: normalizeNotes(journey.notes),
    }));
}

function normalizeUsers(payload: unknown): UsuarioUnidad[] {
  if (Array.isArray(payload)) return payload as UsuarioUnidad[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: UsuarioUnidad[] }).results)) {
    return (payload as { results?: UsuarioUnidad[] }).results ?? [];
  }
  return [];
}

function obtenerEtiquetaRol(rol?: string) {
  if (rol === "SUPERVISOR") return "Supervisor";
  if (rol === "OPERATIVE") return "Operativo";
  if (rol === "ADMIN") return "Administrador";
  return "Sin rol";
}

export default function JourneysPage() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [jornada, setJornada] = useState<JourneyRow[]>([]);
  const [usuariosPorIDProfile, setUsuariosPorIDProfile] = useState<Record<string, UsuarioUnidad>>({});
  const [jornadaSeleccionadaID, setJornadaSeleccionadaID] = useState<number | null>(null);
  const [jornadaPendienteEliminarID, setJornadaPendienteEliminarID] = useState<number | null>(null);
  const [jornadaEliminandoID, setJornadaEliminandoID] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const TAMAÑO_PAGINA = 10;

  useEffect(() => {
    (async () => {
      try {
        const meRes = await apiFetch("/auth/panel/me/");
        if (!meRes.ok) {
          navigate("/", { replace: true });
          return;
        }

        const meData = (await meRes.json()) as RespuestaUsuario;
        if (!meData.has_panel_full_access) {
          navigate("/", { replace: true });
          return;
        }

        const [journeysRes, usersRes] = await Promise.all([
          apiFetch("/journeys/"),
          apiFetch("/users/"),
        ]);

        if (!journeysRes.ok) {
          setError("No se pudieron cargar las jornadas.");
          setCargando(false);
          return;
        }

        if (!usersRes.ok) {
          setError("No se pudieron cargar los datos de unidades.");
          setCargando(false);
          return;
        }

        const journeysData = normalizeJourneys(await journeysRes.json());
        const usersData = normalizeUsers(await usersRes.json());
        const usersMap = usersData.reduce<Record<string, UsuarioUnidad>>((acc, user) => {
          if (user.profile_id) acc[user.profile_id] = user;
          return acc;
        }, {});

        setJornada(journeysData);
        setUsuariosPorIDProfile(usersMap);
        setJornadaSeleccionadaID(journeysData[0]?.id ?? null);
      } catch {
        setError("Error de red al cargar jornadas.");
      } finally {
        setCargando(false);
      }
    })();
  }, [navigate]);

  const JornadasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return jornada.filter((journey) => {
      const unit = journey.user_id ? usuariosPorIDProfile[journey.user_id] : undefined;
      const hayTexto =
        !q ||
        String(journey.id).includes(q) ||
        (unit?.username ?? "").toLowerCase().includes(q) ||
        (unit?.email ?? "").toLowerCase().includes(q) ||
        (journey.user ?? "").toLowerCase().includes(q) ||
        journey.notesText.toLowerCase().includes(q);

      return hayTexto;
    });
  }, [jornada, busqueda, usuariosPorIDProfile]);

  const JornadaSeleccionada = useMemo(
    () => JornadasFiltradas.find((journey) => journey.id === jornadaSeleccionadaID) ?? JornadasFiltradas[0] ?? null,
    [JornadasFiltradas, jornadaSeleccionadaID]
  );

  useEffect(() => {
    if (!JornadaSeleccionada && JornadasFiltradas[0]) {
      setJornadaSeleccionadaID(JornadasFiltradas[0].id);
    }
  }, [JornadasFiltradas, JornadaSeleccionada]);

  const paginasTotales = Math.max(1, Math.ceil(JornadasFiltradas.length / TAMAÑO_PAGINA));
  const jornadasPaginadas = useMemo(() => {
  const start = (pagina - 1) * TAMAÑO_PAGINA;
    return JornadasFiltradas.slice(start, start + TAMAÑO_PAGINA);
  }, [JornadasFiltradas, pagina]);

  useEffect(() => {
    if (pagina > paginasTotales) setPagina(paginasTotales);
  }, [pagina, paginasTotales]);

  const metricas = useMemo(() => {
    const activas = jornada.filter((journey) => !journey.end_date).length;
    const cerradas = jornada.filter((journey) => Boolean(journey.end_date)).length;
    const conNotas = jornada.filter((journey) => Boolean(journey.notesText)).length;
    return { activas, cerradas, conNotas };
  }, [jornada]);

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando jornadas...</p>
      </div>
    );
  }

  const selectedUser = JornadaSeleccionada?.user_id ? usuariosPorIDProfile[JornadaSeleccionada.user_id] : undefined;
  const jornadaPendienteEliminar =
    jornadaPendienteEliminarID != null
      ? jornada.find((item) => item.id === jornadaPendienteEliminarID) ?? null
      : null;

  async function confirmarEliminarJornada() {
    if (!jornadaPendienteEliminar || jornadaEliminandoID != null) return;

    setError("");
    setJornadaEliminandoID(jornadaPendienteEliminar.id);
    try {
      const response = await apiFetch(`/journeys/${jornadaPendienteEliminar.id}/`, { method: "DELETE" });
      if (!response.ok) {
        let detail = "No se pudo borrar la jornada.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") detail = data.detail;
          else if (typeof data.error === "string") detail = data.error;
        } catch {
          // Mantenemos el mensaje por defecto si la respuesta no es JSON.
        }
        setError(detail);
        return;
      }

      setJornada((current) => current.filter((item) => item.id !== jornadaPendienteEliminar.id));
      setJornadaSeleccionadaID((current) => (current === jornadaPendienteEliminar.id ? null : current));
      setJornadaPendienteEliminarID(null);
    } finally {
      setJornadaEliminandoID(null);
    }
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold lg:text-3xl">Centro de jornadas</h1>
            <p className="mt-1 max-w-3xl text-sm text-[color:var(--cm-text-muted)]">
              Seguimiento de jornadas iniciadas por las unidades, con detalle de notas operativas y ubicaciones de inicio y fin.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/viewunidades")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Ver unidades
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

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Total</p>
            <p className="mt-2 text-2xl font-bold">{jornada.length}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Activas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{metricas.activas}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Finalizadas</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{metricas.cerradas}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Con notas</p>
            <p className="mt-2 text-2xl font-bold text-sky-300">{metricas.conNotas}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
          <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por jornada, unidad, correo o notas"
                className="min-w-0 w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-accent)]"
              />
              <div className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text-muted)]">
                Coincidencias: <span className="font-semibold text-[color:var(--cm-text)]">{JornadasFiltradas.length}</span>
              </div>
            </div>

            {error ? <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">{error}</div> : null}

            <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Jornada</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Unidad</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Correo</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Rol</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Inicio</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Fin</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {jornadasPaginadas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                        No hay jornadas para mostrar.
                      </td>
                    </tr>
                  ) : (
                    jornadasPaginadas.map((journey) => {
                      const unit = journey.user_id ? usuariosPorIDProfile[journey.user_id] : undefined;

                      return (
                        <tr
                          key={journey.id}
                          onClick={() => setJornadaSeleccionadaID(journey.id)}
                          className={`cursor-pointer border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60 ${
                            JornadaSeleccionada?.id === journey.id ? "bg-[color:var(--cm-surface-2)]/70" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5 font-medium">#{journey.id}</td>
                          <td className="px-4 py-3.5">{unit?.username ?? journey.user ?? "Unidad desconocida"}</td>
                          <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">{unit?.email ?? "-"}</td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-full bg-[color:var(--cm-info)]/15 px-2.5 py-1 text-xs text-[color:var(--cm-info)] ring-1 ring-[color:var(--cm-info)]/30">
                              {obtenerEtiquetaRol(unit?.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{formatDate(journey.start_date)}</td>
                          <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{formatDate(journey.end_date)}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={!journey.account_user_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (journey.account_user_id) navigate(`/editunit/${journey.account_user_id}`);
                              }}
                              className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Ver unidad
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setJornadaPendienteEliminarID(journey.id);
                              }}
                              className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-danger)] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Borrar
                            </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[color:var(--cm-text-muted)]">
                Mostrando {JornadasFiltradas.length === 0 ? 0 : (pagina - 1) * TAMAÑO_PAGINA + 1}
                {" - "}
                {Math.min(pagina * TAMAÑO_PAGINA, JornadasFiltradas.length)}
                {" de "}
                {JornadasFiltradas.length} jornadas
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((value) => Math.max(1, value - 1))}
                  disabled={pagina === 1}
                  className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-[color:var(--cm-text-muted)]">
              Página {pagina} de {paginasTotales}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((value) => Math.min(paginasTotales, value + 1))}
                  disabled={pagina === paginasTotales}
                  className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            {JornadaSeleccionada ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Detalle</p>
                  <h2 className="mt-2 text-xl font-bold">Jornada #{JornadaSeleccionada.id}</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Unidad</p>
                    <p className="mt-1 font-medium">{selectedUser?.username ?? JornadaSeleccionada.user ?? "-"}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Correo</p>
                    <p className="mt-1 font-medium">{selectedUser?.email ?? "-"}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Rol</p>
                    <p className="mt-1 font-medium">{obtenerEtiquetaRol(selectedUser?.role)}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Organizacion</p>
                    <p className="mt-1 font-medium">{selectedUser?.organization_name ?? "-"}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Inicio</p>
                    <p className="mt-1 font-medium">{formatDate(JornadaSeleccionada.start_date)}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Fin</p>
                    <p className="mt-1 font-medium">{formatDate(JornadaSeleccionada.end_date)}</p>
                  </div>
                </div>

                <section className="rounded-2xl bg-[color:var(--cm-surface-2)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Notas</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--cm-text)]">
                    {JornadaSeleccionada.notesText || "Esta jornada no tiene notas registradas."}
                  </p>
                </section>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicacion de inicio</p>
                    <MapaMiniUnidad
                      latitud={ JornadaSeleccionada.startCoords?.lat ?? null}
                      longitud={JornadaSeleccionada.startCoords?.lng ?? null}
                      etiqueta="Inicio de la jornada"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicacion de fin</p>
                    <MapaMiniUnidad
                      latitud={JornadaSeleccionada.stopCoords?.lat ?? null}
                      longitud={JornadaSeleccionada.stopCoords?.lng ?? null}
                      etiqueta="Fin de la jornada"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!JornadaSeleccionada.account_user_id}
                  onClick={() => {
                    if (JornadaSeleccionada.account_user_id) navigate(`/editunit/${JornadaSeleccionada.account_user_id}`);
                  }}
                  className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ver unidad
                </button>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--cm-text-muted)]">No hay jornadas para mostrar.</p>
            )}
          </aside>
        </div>
      </div>

      {jornadaPendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journey-delete-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Borrar jornada</p>
            <h2 id="journey-delete-title" className="mt-2 text-xl font-bold text-[color:var(--cm-text)]">
              ¿Quieres borrar esta jornada?
            </h2>
            <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
              Se eliminara definitivamente la jornada #{jornadaPendienteEliminar.id}.
            </p>
              <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">Esta acción no se puede deshacer.</p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setJornadaPendienteEliminarID(null)}
                disabled={jornadaEliminandoID != null}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-surface-2)]/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarEliminarJornada()}
                disabled={jornadaEliminandoID != null}
                className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {jornadaEliminandoID === jornadaPendienteEliminar.id ? "Borrando..." : "Confirmar borrado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
