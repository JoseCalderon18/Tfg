import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, PageHeader, PaginationBar, SearchInput, TableShell } from "../components/ui";
import { apiFetch } from "../utils/api";
import { STATUS_COLOR, getAlertSeverityBadge, getAlertStatusBadge } from "../utils/statusColors";

type FilaAlerta = {
  id: string;
  incident?: string | null;
  incident_name?: string | null;
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
  return getAlertStatusBadge(status);
}

function obtenerTonoBadge(clase: string) {
  if (clase === "cm-badge-danger") return "danger";
  if (clase === "cm-badge-alert") return "alert";
  if (clase === "cm-badge-warning") return "warning";
  if (clase === "cm-badge-success") return "success";
  if (clase === "cm-badge-special") return "special";
  if (clase === "cm-badge-info") return "info";
  return "neutral";
}

function obtenerEtiquetaSeveridad(severity?: number | null) {
  if ((severity ?? 5) <= 1) return "Crítica";
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
  const [alertaActualizandoId, setAlertaActualizandoId] = useState("");

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
      `${alerta.alert_type ?? ""} ${alerta.title ?? ""} ${alerta.status ?? ""} ${alerta.created_by ?? ""} ${alerta.incident_name ?? ""}`
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

  async function actualizarEstadoAlerta(alertId: string, accion: "acknowledge" | "close") {
    if (alertaActualizandoId) return;

    setErrorMensaje("");
    setAlertaActualizandoId(alertId);
    try {
      const response = await apiFetch(`/alerts/${alertId}/${accion}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accion === "acknowledge" ? { ack_notes: "" } : { close_notes: "" }),
      });

      if (!response.ok) {
        let detail = accion === "acknowledge" ? "No se pudo reconocer la alerta." : "No se pudo cerrar la alerta.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (typeof data.detail === "string") {
            detail = data.detail;
          } else if (typeof data.error === "string") {
            detail = data.error;
          }
        } catch {
          // mantenemos el mensaje por defecto
        }
        setErrorMensaje(detail);
        return;
      }

      const alertaActualizada = (await response.json()) as FilaAlerta;
      setAlertas((prev) => prev.map((alerta) => (alerta.id === alertId ? { ...alerta, ...alertaActualizada } : alerta)));
    } finally {
      setAlertaActualizandoId("");
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
        <PageHeader
          eyebrow="Alertas"
          title="Centro de alertas operativas"
          description="Vista operativa con prioridades visuales, más registros y búsqueda para análisis rápido."
          actions={
            <>
              <Button tone="danger" onClick={() => navegar("/createAlert")}>
                Crear alerta
              </Button>
              <Badge tone="danger" className="px-3">Abierta</Badge>
              <Badge tone="warning" className="px-3">Evaluación</Badge>
              <Badge tone="neutral" className="px-3">Cerrada</Badge>
            </>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Abiertas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-danger)]">{indicadores.abiertas}</p></Card>
          <Card className="px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Reconocidas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-warning)]">{indicadores.reconocidas}</p></Card>
          <Card className="px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Críticas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-danger)]">{indicadores.criticas}</p></Card>
          <Card className="px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Cerradas</p><p className="mt-1 text-2xl font-bold" style={{ color: STATUS_COLOR.cerrado }}>{indicadores.cerradas}</p></Card>
        </div>

        <div className="mt-4">
          <SearchInput
            value={consulta}
            onChange={(event) => setConsulta(event.target.value)}
            placeholder="Buscar por tipo, titulo, estado o creador..."
          />
        </div>

        {errorMensaje ? (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {errorMensaje}
          </div>
        ) : null}

        <div className="mt-4">
          <TableShell
            minWidth="1220px"
            footer={
              alertasFiltradas.length > 0 ? (
                <PaginationBar
                  page={paginaActual}
                  totalPages={totalPaginas}
                  visibleCount={alertasPaginadas.length}
                  totalCount={alertasFiltradas.length}
                  itemLabel="alertas"
                  onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                  onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                />
              ) : null
            }
          >
            <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Titulo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Incidente</th>
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
                    <Badge tone={obtenerTonoBadge(obtenerBadgeAlerta(alerta.alert_type))}>
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
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{alerta.title || "Alerta sin titulo"}</td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                    {alerta.incident_name || alerta.incident || "Sin incidente"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Badge tone={obtenerTonoBadge(getAlertSeverityBadge(alerta.severity))}>
                      {obtenerEtiquetaSeveridad(alerta.severity)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={obtenerTonoBadge(obtenerBadgeEstado(alerta.status))}>
                      {alerta.status === "OPEN"
                        ? "Abierta"
                        : alerta.status === "ACK"
                        ? "Evaluación"
                        : alerta.status === "CLOSED"
                        ? "Cerrada"
                        : "Desconocida"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alerta.created_by || "Sistema"}
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alerta.created_at ? new Date(alerta.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <Button tone="primary" size="sm" onClick={() => navegar(`/editAlert/${alerta.id}`)}>
                        Ver
                      </Button>
                      {alerta.status === "OPEN" ? (
                        <Button
                          tone="warning"
                          size="sm"
                          onClick={() => void actualizarEstadoAlerta(alerta.id, "acknowledge")}
                          disabled={alertaActualizandoId === alerta.id}
                        >
                          {alertaActualizandoId === alerta.id ? "Guardando..." : "Reconocer"}
                        </Button>
                      ) : null}
                      {alerta.status !== "CLOSED" ? (
                        <Button
                          tone="success"
                          size="sm"
                          onClick={() => void actualizarEstadoAlerta(alerta.id, "close")}
                          disabled={alertaActualizandoId === alerta.id}
                        >
                          {alertaActualizandoId === alerta.id ? "Guardando..." : "Cerrar"}
                        </Button>
                      ) : null}
                      <Button tone="danger" size="sm" onClick={() => prepararEliminarAlerta(alerta.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {alertasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                    No hay alertas para mostrar con ese filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </TableShell>
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
              Esta acción no se puede deshacer.
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
