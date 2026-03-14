const demoAlerts = [
  {
    id: "a-01",
    type: "SOS",
    title: "Incendio forestal activo en perimetro norte",
    severity: "Critica",
    status: "Open",
    created: "Hace 2 min",
  },
  {
    id: "a-02",
    type: "MAN_DOWN",
    title: "Operativo inmovilizado en zona de rescate",
    severity: "Alta",
    status: "ACK",
    created: "Hace 5 min",
  },
  {
    id: "a-03",
    type: "GEOFENCE",
    title: "Unidad fuera de perimetro seguro",
    severity: "Media",
    status: "Review",
    created: "Hace 9 min",
  },
  {
    id: "a-04",
    type: "SYSTEM",
    title: "Comunicacion restablecida con brigada sur",
    severity: "Info",
    status: "Closed",
    created: "Hace 15 min",
  },
];

function getAlertBadge(type: string) {
  if (type === "SOS") return "cm-badge-danger";
  if (type === "MAN_DOWN") return "cm-badge-alert";
  if (type === "GEOFENCE") return "cm-badge-warning";
  if (type === "SYSTEM") return "cm-badge-info";
  return "cm-badge-special";
}

function getStatusBadge(status: string) {
  if (status === "Open") return "cm-badge-danger";
  if (status === "ACK") return "cm-badge-alert";
  if (status === "Review") return "cm-badge-warning";
  return "cm-badge-success";
}

export default function AlertsPage() {
  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      {/* Cabecera principal de alertas */}
      <div className="w-full">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Alertas</p>
            <h1 className="mt-1 text-2xl font-bold">Centro de alertas operativas</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Vista de referencia para probar prioridades visuales, severidad y estado de respuesta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="cm-badge-danger rounded-full px-3 py-1">Critico</span>
            <span className="cm-badge-alert rounded-full px-3 py-1">Alerta</span>
            <span className="cm-badge-warning rounded-full px-3 py-1">Revision</span>
            <span className="cm-badge-success rounded-full px-3 py-1">Resuelto</span>
          </div>
        </div>

        {/* Resumen superior */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Abiertas</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--cm-danger)]">12</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">En atencion</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--cm-alert)]">8</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Revision</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--cm-warning)]">5</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Cerradas</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--cm-success)]">19</p>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Titulo</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Severidad</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Creada</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {demoAlerts.map((alert) => (
                <tr key={alert.id} className="border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60">
                  <td className="px-4 py-3.5">
                    <span className={`${getAlertBadge(alert.type)} rounded-full px-2.5 py-1 text-xs`}>{alert.type}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap">{alert.title}</td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{alert.severity}</td>
                  <td className="px-4 py-3.5">
                    <span className={`${getStatusBadge(alert.status)} rounded-full px-2.5 py-1 text-xs`}>{alert.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">{alert.created}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-alert)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                        ACK
                      </button>
                      <button className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
