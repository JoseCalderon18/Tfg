import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { getAlertSeverityBadge, getAlertStatusBadge } from "../utils/statusColors";
import { ConfirmDialog, DataTable, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, Pagination, SearchBar } from "../components/ui";
import HelpButton from "../components/HelpButton";

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

const ALERT_TYPE_LABELS: Record<string, string> = {
  SOS: "SOS Emergencia",
  MAN_DOWN: "Operativo caido",
  FIRE_SPREAD: "Cambio de fuego",
  SMOKE: "Humo en incidente",
  INJURY: "Operativo herido",
  DEATH: "Operativo fallecido",
  EVACUATION: "Evacuacion de zona",
  MEDICAL: "Emergencia medica",
  TRAPPED: "Operativo atrapado",
  VEHICLE: "Incidente vehicular",
  ANIMAL: "Animal peligroso",
  ANIMAL_INJURY: "Animal herido",
  LOW_SUPPLIES: "Recursos bajos",
  COMM_LOSS: "Perdida de comunicacion",
  HAZARD: "Peligro ambiental",
  FATIGUE: "Fatiga extrema",
  WEATHER: "Clima peligroso",
  BATTERY: "Bateria baja",
  MOVEMENT: "Inmovilidad prolongada",
  LOST: "Operativo perdido",
  GEOFENCE: "Fuera de zona segura",
  ANOMALY: "Anomalia detectada",
  OTHER: "Otro",
};

function obtenerEtiquetaTipoAlerta(type?: string | null) {
  if (!type) return "Desconocido";
  return ALERT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function obtenerBadgeAlerta(type?: string | null) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN" || type === "INJURY" || type === "DEATH" || type === "TRAPPED") return "cm-badge-alert";
  if (type === "GEOFENCE" || type === "FIRE_SPREAD" || type === "SMOKE" || type === "WEATHER" || type === "HAZARD") return "cm-badge-warning";
  if (type === "OTHER") return "cm-badge-special";
  return "cm-badge-info";
}

function obtenerBadgeEstado(status?: string | null) {
  return getAlertStatusBadge(status);
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
      `${alerta.alert_type ?? ""} ${obtenerEtiquetaTipoAlerta(alerta.alert_type)} ${alerta.title ?? ""} ${alerta.status ?? ""} ${alerta.created_by ?? ""}`
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
    return <LoadingState label="Cargando alertas..." />;
  }

  return (
    <div className="cm-shell cm-page">
      <div className="w-full">
        <PageHeader
          eyebrow="Alertas"
          title="Centro de alertas operativas"
          description="Vista operativa con prioridades visuales, más registros y búsqueda para análisis rápido."
          actions={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="cm-badge-success rounded-full px-3 py-1">Abierta</span>
              <span className="cm-badge-warning rounded-full px-3 py-1">Evaluación</span>
              <span className="cm-badge-neutral rounded-full px-3 py-1">Cerrada</span>
              <HelpButton
                title="Alertas operativas"
                content={
                  <>
                    <p>Las alertas se generan automáticamente desde la app móvil o manualmente desde el panel.</p>
                    <p><strong className="text-[color:var(--cm-text)]">SOS</strong> — emergencia crítica activada por el operativo (4 segundos).</p>
                    <p><strong className="text-[color:var(--cm-text)]">GEOFENCE</strong> — el operativo ha salido de su área de trabajo asignada.</p>
                    <p><strong className="text-[color:var(--cm-text)]">MOVEMENT</strong> — movimiento anómalo detectado por el acelerómetro.</p>
                    <p>Usa 'Reconocer' para acusar recibo y 'Cerrar' cuando esté resuelta.</p>
                  </>
                }
              />
            </div>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Abiertas" value={indicadores.abiertas} tone="success" />
          <MetricCard label="Reconocidas" value={indicadores.reconocidas} tone="warning" />
          <MetricCard label="Críticas" value={indicadores.criticas} tone="danger" />
          <MetricCard label="Cerradas" value={indicadores.cerradas} />
        </div>

        <SearchBar
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          onClear={() => setConsulta("")}
          placeholder="Buscar por tipo, título, estado o creador..."
          resultLabel={`${alertasFiltradas.length} de ${alertas.length} alertas`}
        />

        {errorMensaje ? <ErrorBanner message={errorMensaje} className="mt-4" /> : null}

        {alertasFiltradas.length === 0 ? (
          <EmptyState
            title="No hay alertas para mostrar"
            description={consulta ? "Prueba con otra búsqueda o limpia el filtro." : "Cuando haya alertas aparecerán en este listado."}
          />
        ) : (
          <div className="mt-4 grid gap-3 md:hidden">
            {alertasPaginadas.map((alerta) => (
              <article key={alerta.id} className="cm-card cm-card-pad">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{alerta.title || "Alerta sin título"}</h2>
                    <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                      {alerta.created_by || "Sistema"} · {alerta.created_at ? new Date(alerta.created_at).toLocaleString() : "-"}
                    </p>
                  </div>
                  <span className={`${obtenerBadgeEstado(alerta.status)} shrink-0 rounded-full px-2.5 py-1 text-xs`}>
                    {alerta.status === "OPEN" ? "Abierta" : alerta.status === "ACK" ? "Evaluación" : alerta.status === "CLOSED" ? "Cerrada" : "Desconocida"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`${obtenerBadgeAlerta(alerta.alert_type)} rounded-full px-2.5 py-1 text-xs`}>
                    {obtenerEtiquetaTipoAlerta(alerta.alert_type)}
                  </span>
                  <span className={`${getAlertSeverityBadge(alerta.severity)} rounded-full px-2.5 py-1 text-xs`}>
                    {obtenerEtiquetaSeveridad(alerta.severity)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navegar(`/editAlert/${alerta.id}`)} className="cm-btn cm-btn-primary">
                    Ver
                  </button>
                  <button type="button" onClick={() => prepararEliminarAlerta(alerta.id)} className="cm-btn cm-btn-danger">
                    Eliminar
                  </button>
                  {alerta.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => void actualizarEstadoAlerta(alerta.id, "acknowledge")}
                      disabled={alertaActualizandoId === alerta.id}
                      className="cm-btn cm-btn-warning"
                    >
                      Reconocer
                    </button>
                  ) : null}
                  {alerta.status !== "CLOSED" ? (
                    <button
                      type="button"
                      onClick={() => void actualizarEstadoAlerta(alerta.id, "close")}
                      disabled={alertaActualizandoId === alerta.id}
                      className="cm-btn cm-btn-success"
                    >
                      Cerrar
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <DataTable minWidth="1220px" wrapperClassName="mt-4 hidden md:block">
            <thead>
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
                <tr key={alerta.id}>
                  <td className="px-4 py-3.5">
                    <span className={`${obtenerBadgeAlerta(alerta.alert_type)} rounded-full px-2.5 py-1 text-xs`}>
                      {obtenerEtiquetaTipoAlerta(alerta.alert_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{alerta.title || "Alerta sin titulo"}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`${getAlertSeverityBadge(alerta.severity)} rounded-full px-2.5 py-1 text-xs`}>
                      {obtenerEtiquetaSeveridad(alerta.severity)}
                    </span>
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
                    className="cm-btn cm-btn-sm cm-btn-primary"
                      >
                        Ver
                      </button>
                      {alerta.status === "OPEN" ? (
                        <button
                          type="button"
                          onClick={() => void actualizarEstadoAlerta(alerta.id, "acknowledge")}
                          disabled={alertaActualizandoId === alerta.id}
                          className="cm-btn cm-btn-sm cm-btn-warning"
                        >
                          {alertaActualizandoId === alerta.id ? "Guardando..." : "Reconocer"}
                        </button>
                      ) : null}
                      {alerta.status !== "CLOSED" ? (
                        <button
                          type="button"
                          onClick={() => void actualizarEstadoAlerta(alerta.id, "close")}
                          disabled={alertaActualizandoId === alerta.id}
                          className="cm-btn cm-btn-sm cm-btn-success"
                        >
                          {alertaActualizandoId === alerta.id ? "Guardando..." : "Cerrar"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => prepararEliminarAlerta(alerta.id)}
                        className="cm-btn cm-btn-sm cm-btn-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {alertasFiltradas.length === 0 ? <EmptyState colSpan={7} title="No hay alertas para mostrar" /> : null}
            </tbody>
          </DataTable>

        <Pagination
          page={paginaActual}
          totalPages={totalPaginas}
          visibleCount={alertasPaginadas.length}
          totalCount={alertasFiltradas.length}
          itemLabel="alertas"
          onPrevious={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
          onNext={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
        />
      </div>

      <ConfirmDialog
        open={Boolean(alertaPendienteEliminar)}
        eyebrow="Eliminar alerta"
        title="¿Quieres borrar esta alerta?"
        confirmLabel={alertaEliminandoId === alertaPendienteEliminar?.id ? "Borrando..." : "Confirmar borrado"}
        isBusy={Boolean(alertaEliminandoId)}
        onCancel={() => setAlertaPendienteEliminarId("")}
        onConfirm={() => {
          if (alertaPendienteEliminar) void confirmarEliminarAlerta(alertaPendienteEliminar.id);
        }}
      >
        <p>
          Se eliminará definitivamente la alerta
          {alertaPendienteEliminar?.title ? ` "${alertaPendienteEliminar.title}"` : ""}.
        </p>
        <p>Esta acción no se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  );
}
