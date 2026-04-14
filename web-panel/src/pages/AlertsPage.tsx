import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type FilaAlerta = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

function obtenerBadgeAlerta(type?: string | null) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN") return "cm-badge-alert";
  if (type === "GEOFENCE") return "cm-badge-warning";
  if (type === "OTHER") return "cm-badge-special";
  return "cm-badge-info";
}

function obtenerBadgeEstado(status?: string | null) {
  if (status === "OPEN") return "cm-badge-danger";
  if (status === "ACK") return "cm-badge-alert";
  if (status === "CLOSED") return "cm-badge-success";
  return "cm-badge-warning";
}

function obtenerEtiquetaSeveridad(severity?: number | null) {
  if ((severity ?? 5) <= 1) return "Critica";
  if ((severity ?? 5) === 2) return "Alta";
  if ((severity ?? 5) === 3) return "Media";
  if ((severity ?? 5) === 4) return "Baja";
  return "Informativa";
}

const ALERTAS_POR_PAGINA = 10;

export default function AlertsPage() {
  const navegar = useNavigate();
  const [alertas, setAlertas] = useState<FilaAlerta[]>([]);
  const [consulta, setConsulta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [alertaPendienteEliminarId, setAlertaPendienteEliminarId] = useState("");
  const [alertaEliminandoId, setAlertaEliminandoId] = useState("");

  useEffect(() => {
    (async () => {
      const response = await apiFetch("/alerts/");
      if (!response.ok) {
        setErrorMensaje("No se pudieron cargar las alertas.");
        setCargando(false);
        return;
      }
      const payload = (await response.json()) as { results?: FilaAlerta[] } | FilaAlerta[];
      setAlertas(Array.isArray(payload) ? payload : payload.results ?? []);
      setErrorMensaje("");
      setCargando(false);
    })();
  }, []);

  const alertasFiltradas = useMemo(() => {
    const normalized = consulta.trim().toLowerCase();
    if (!normalized) return alertas;
    return alertas.filter((alerta) =>
      `${alerta.alert_type ?? ""} ${alerta.title ?? ""} ${alerta.status ?? ""} ${alerta.created_by ?? ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [alertas, consulta]);

  const totalPaginas = Math.max(1, Math.ceil(alertasFiltradas.length / ALERTAS_POR_PAGINA));

  const alertasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ALERTAS_POR_PAGINA;
    return alertasFiltradas.slice(inicio, inicio + ALERTAS_POR_PAGINA);
  }, [alertasFiltradas, paginaActual]);

  const indicadores = useMemo(() => {
    const abiertas = alertas.filter((alerta) => alerta.status === "OPEN").length;
    const reconocidas = alertas.filter((alerta) => alerta.status === "ACK").length;
    const cerradas = alertas.filter((alerta) => alerta.status === "CLOSED").length;
    const criticas = alertas.filter((alerta) => (alerta.severity ?? 5) <= 2 && alerta.status !== "CLOSED").length;
    return { abiertas, reconocidas, cerradas, criticas };
  }, [alertas]);

  useEffect(() => {
    setPaginaActual(1);
  }, [consulta]);

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  useEffect(() => {
    if (!alertaPendienteEliminarId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !alertaEliminandoId) {
        setAlertaPendienteEliminarId("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [alertaPendienteEliminarId, alertaEliminandoId]);

  const alertaPendienteEliminar = alertas.find((alerta) => alerta.id === alertaPendienteEliminarId) ?? null;

  async function prepararEliminarAlerta(alertId: string) {
    setAlertaPendienteEliminarId(alertId);
  }

  async function confirmarEliminarAlerta(alertId: string) {
    if (alertaEliminandoId) return;

    setErrorMensaje("");
    setAlertaEliminandoId(alertId);
    try {
      const response = await apiFetch(`/alerts/${alertId}/`, { method: "DELETE" });
      if (!response.ok) {
        let detail = "No se pudo borrar la alerta.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensaje(detail);
        return;
      }

      setAlertas((prev) => prev.filter((alerta) => alerta.id !== alertId));
      setAlertaPendienteEliminarId("");
    } finally {
      setAlertaEliminandoId("");
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando alertas...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      <div className="w-full">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Alertas</p>
            <h1 className="mt-1 text-2xl font-bold">Centro de alertas operativas</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Vista operativa con prioridades visuales, mas registros y busqueda para analisis rapido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="cm-badge-danger rounded-full px-3 py-1">Abierta</span>
            <span className="cm-badge-alert rounded-full px-3 py-1">Evaluación</span>
            <span className="cm-badge-success rounded-full px-3 py-1">Cerrada</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Abiertas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-danger)]">{indicadores.abiertas}</p></div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Reconocidas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-alert)]">{indicadores.reconocidas}</p></div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Criticas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-warning)]">{indicadores.criticas}</p></div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Cerradas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-success)]">{indicadores.cerradas}</p></div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-3.5">
          <input
            type="text"
            value={consulta}
            onChange={(event) => setConsulta(event.target.value)}
            placeholder="Buscar por tipo, titulo, estado o creador..."
            className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
          />
        </div>

        {errorMensaje ? (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {errorMensaje}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <table className="min-w-[1220px] w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Titulo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Severidad</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Creada por</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Fecha</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alertasPaginadas.map((alerta) => (
                <tr key={alerta.id} className="border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60">
                  <td className="px-4 py-3.5">
                    <span className={`${obtenerBadgeAlerta(alerta.alert_type)} rounded-full px-2.5 py-1 text-xs`}>
                      {alerta.alert_type === "SOS"
                        ? "SOS"
                        : alerta.alert_type === "MAN_DOWN"
                        ? "Hombre caido"
                        : alerta.alert_type === "GEOFENCE"
                        ? "Geofence"
                        : alerta.alert_type === "LOST"
                        ? "Perdida"
                        : alerta.alert_type === "ANOMALY"
                        ? "Anomalia"
                        : alerta.alert_type === "OTHER"
                        ? "Otro"
                        : "Desconocido"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{alerta.title || "Alerta sin titulo"}</td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {obtenerEtiquetaSeveridad(alerta.severity)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${obtenerBadgeEstado(alerta.status)} rounded-full px-2.5 py-1 text-xs`}>
                      {alerta.status === "OPEN"
                        ? "Abierta"
                        : alerta.status === "ACK"
                        ? "Evaluación"
                        : alerta.status === "CLOSED"
                        ? "Cerrada"
                        : "Desconocida"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alerta.created_by || "Sistema"}
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alerta.created_at ? new Date(alerta.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navegar(`/editAlert/${alerta.id}`)}
                        className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => prepararEliminarAlerta(alerta.id)}
                        className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-danger)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {alertasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                    No hay alertas para mostrar con ese filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {alertasFiltradas.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-[color:var(--cm-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[color:var(--cm-text-muted)]">
                Pagina {paginaActual} de {totalPaginas} · Mostrando {alertasPaginadas.length} de {alertasFiltradas.length} alertas
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                  disabled={paginaActual === 1}
                  className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-info)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-info)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {alertaPendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alerta-eliminar-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Eliminar alerta</p>
            <h2 id="alerta-eliminar-titulo" className="mt-2 text-xl font-bold text-[color:var(--cm-text)]">
              ¿Quieres borrar esta alerta?
            </h2>
            <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
              Se eliminara definitivamente la alerta
              {alertaPendienteEliminar.title ? ` "${alertaPendienteEliminar.title}"` : ""}.
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Esta accion no se puede deshacer.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAlertaPendienteEliminarId("")}
                disabled={Boolean(alertaEliminandoId)}
                className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-2.5 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-surface-2)]/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarEliminarAlerta(alertaPendienteEliminar.id)}
                disabled={Boolean(alertaEliminandoId)}
                className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {alertaEliminandoId === alertaPendienteEliminar.id ? "Borrando..." : "Confirmar borrado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
