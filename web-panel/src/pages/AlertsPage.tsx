import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";

type AlertRow = {
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

function getAlertBadge(type?: string | null) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN") return "cm-badge-alert";
  if (type === "GEOFENCE") return "cm-badge-warning";
  if (type === "OTHER") return "cm-badge-special";
  return "cm-badge-info";
}

function getStatusBadge(status?: string | null) {
  if (status === "OPEN") return "cm-badge-danger";
  if (status === "ACK") return "cm-badge-alert";
  if (status === "CLOSED") return "cm-badge-success";
  return "cm-badge-warning";
}

function getSeverityLabel(severity?: number | null) {
  if ((severity ?? 5) <= 1) return "Critica";
  if ((severity ?? 5) === 2) return "Alta";
  if ((severity ?? 5) === 3) return "Media";
  if ((severity ?? 5) === 4) return "Baja";
  return "Informativa";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await apiFetch("/alerts/");
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as { results?: AlertRow[] } | AlertRow[];
      setAlerts(Array.isArray(payload) ? payload : payload.results ?? []);
      setLoading(false);
    })();
  }, []);

  const filteredAlerts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return alerts;
    return alerts.filter((alert) =>
      `${alert.alert_type ?? ""} ${alert.title ?? ""} ${alert.status ?? ""} ${alert.created_by ?? ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [alerts, query]);

  const kpis = useMemo(() => {
    const open = alerts.filter((alert) => alert.status === "OPEN").length;
    const ack = alerts.filter((alert) => alert.status === "ACK").length;
    const closed = alerts.filter((alert) => alert.status === "CLOSED").length;
    const critical = alerts.filter((alert) => (alert.severity ?? 5) <= 2 && alert.status !== "CLOSED").length;
    return { open, ack, closed, critical };
  }, [alerts]);

  if (loading) {
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
            <span className="cm-badge-danger rounded-full px-3 py-1">Critico</span>
            <span className="cm-badge-alert rounded-full px-3 py-1">Alerta</span>
            <span className="cm-badge-warning rounded-full px-3 py-1">Revision</span>
            <span className="cm-badge-success rounded-full px-3 py-1">Resuelto</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Abiertas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-danger)]">{kpis.open}</p></div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Reconocidas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-alert)]">{kpis.ack}</p></div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Criticas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-warning)]">{kpis.critical}</p></div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Cerradas</p><p className="mt-1 text-2xl font-bold text-[color:var(--cm-success)]">{kpis.closed}</p></div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-3.5">
          <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tipo, titulo, estado o creador..." className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]" />
        </div>

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
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60">
                  <td className="px-4 py-3.5">
                    <span className={`${getAlertBadge(alert.alert_type)} rounded-full px-2.5 py-1 text-xs`}>
                      {alert.alert_type || "OTHER"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{alert.title || "Alerta sin titulo"}</td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {getSeverityLabel(alert.severity)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${getStatusBadge(alert.status)} rounded-full px-2.5 py-1 text-xs`}>
                      {alert.status || "OPEN"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alert.created_by || "Sistema"}
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-alert)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                        ACK
                      </button>
                      <button className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                    No hay alertas para mostrar con ese filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
