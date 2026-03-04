import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type IncidentSeverity = "critico" | "alto" | "moderado";
type IncidentState = "activo" | "en_evacuacion" | "sin_responsable" | "cerrado";

type Incident = {
  id: number;
  title: string;
  area: string;
  severity: IncidentSeverity;
  state: IncidentState;
  type: string;
  startedAt: string;
  lastAlert: string;
  resources: {
    ground: number;
    aerial: number;
    peopleAssigned: number;
    peopleRequired: number;
  };
  commander?: string;
};

type ActivityItem = {
  id: number;
  time: string;
  message: string;
};

const KPI_CARDS = [
  { key: "active", label: "Activos", value: "38", tone: "text-teal-600" },
  { key: "critical", label: "Criticos", value: "6", tone: "text-red-600" },
  { key: "owner", label: "Sin responsable", value: "2", tone: "text-slate-700" },
  { key: "evacuation", label: "Con evacuacion", value: "6", tone: "text-cyan-600" },
  { key: "response", label: "Tiempo de respuesta prev", value: "04:52 min", tone: "text-slate-900" },
  { key: "resources", label: "Recursos desplegados", value: "172", tone: "text-blue-600" },
  { key: "sla", label: "SLA en riesgo", value: "6", tone: "text-red-500" },
] as const;

const INCIDENTS_MOCK: Incident[] = [
  {
    id: 1,
    title: "Forest Fire - Zone A",
    area: "Cerca de Oakwood Forest",
    severity: "critico",
    state: "en_evacuacion",
    type: "Incendio",
    startedAt: "2024-01-15 14:30",
    lastAlert: "hace 40 min",
    resources: { ground: 5, aerial: 2, peopleAssigned: 18, peopleRequired: 36 },
    commander: "Supervisor 01",
  },
  {
    id: 2,
    title: "Fine: Exandzie",
    area: "Sector Norte",
    severity: "alto",
    state: "activo",
    type: "Incendio",
    startedAt: "2024-01-15 14:12",
    lastAlert: "hace 20 min",
    resources: { ground: 5, aerial: 2, peopleAssigned: 14, peopleRequired: 22 },
  },
  {
    id: 3,
    title: "Chemal Spill - Highway 22",
    area: "Autovia 22, km 14",
    severity: "moderado",
    state: "activo",
    type: "Quimico",
    startedAt: "2024-01-15 14:30",
    lastAlert: "hace 15 min",
    resources: { ground: 5, aerial: 2, peopleAssigned: 18, peopleRequired: 30 },
  },
  {
    id: 4,
    title: "Car Accident - Downtown",
    area: "Centro urbano",
    severity: "critico",
    state: "sin_responsable",
    type: "Accidente",
    startedAt: "2024-01-15 14:10",
    lastAlert: "hace 5 min",
    resources: { ground: 3, aerial: 0, peopleAssigned: 8, peopleRequired: 20 },
  },
  {
    id: 5,
    title: "Evacuation en progreso",
    area: "Greenfield",
    severity: "moderado",
    state: "en_evacuacion",
    type: "Evacuacion",
    startedAt: "2024-01-15 13:55",
    lastAlert: "hace 5 min",
    resources: { ground: 5, aerial: 2, peopleAssigned: 18, peopleRequired: 45 },
  },
];

const ACTIVITY_MOCK: ActivityItem[] = [
  { id: 1, time: "19:30", message: "Supervisor escalo incendio forestal en Zona A a critico." },
  { id: 2, time: "19:10", message: "Se emitio alerta de incendio forestal y se movilizaron fuerzas." },
  { id: 3, time: "18:45", message: "Operador cerro accidente vehicular en Downtown." },
  { id: 4, time: "18:30", message: "Supervisor asigno 2 ambulancias al incidente de Greenfield." },
];

const FILTERS = [
  { label: "Estado", value: "Critico" },
  { label: "Severidad", value: "Bajo" },
  { label: "Tipo", value: "Mundo" },
  { label: "Zona / Municipio", value: "" },
  { label: "Responsable / Equipo", value: "Etiquetas" },
] as const;

function severityBadge(severity: IncidentSeverity) {
  if (severity === "critico") {
    return "bg-red-100 text-red-700";
  }
  if (severity === "alto") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-teal-100 text-teal-700";
}

function severityLabel(severity: IncidentSeverity) {
  if (severity === "critico") return "Critico";
  if (severity === "alto") return "Alto";
  return "Moderado";
}

function stateLabel(state: IncidentState) {
  if (state === "en_evacuacion") return "Con evacuacion";
  if (state === "sin_responsable") return "Sin responsable";
  if (state === "cerrado") return "Cerrado";
  return "Activo";
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [selectedIncidentId, setSelectedIncidentId] = useState<number>(1);
  const [query, setQuery] = useState("");

  const filteredIncidents = useMemo(() => {
    if (!query.trim()) return INCIDENTS_MOCK;
    const normalizedQuery = query.toLowerCase();
    return INCIDENTS_MOCK.filter((incident) => {
      return (
        incident.title.toLowerCase().includes(normalizedQuery) ||
        incident.area.toLowerCase().includes(normalizedQuery) ||
        incident.type.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

  const selectedIncident =
    filteredIncidents.find((incident) => incident.id === selectedIncidentId) ?? filteredIncidents[0];

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-5 text-5xl font-bold tracking-tight text-slate-900">Incidentes</h1>
        <label className="min-w-[300px] flex-1">
          <span className="sr-only">Buscar incidentes</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar incidentes..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-blue-400 transition focus:ring"
          />
        </label>
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={() => navigate("/createincident")}
        >
          Nuevo incidente
        </button>
      </header>

      <section className="mb-6 grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-7">
        {KPI_CARDS.map((kpi) => (
          <article key={kpi.key} className="border-b border-slate-200 px-4 py-3 sm:border-r xl:border-b-0">
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className={`mt-1 text-4xl font-semibold ${kpi.tone}`}>{kpi.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_430px]">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-4xl font-semibold text-slate-900">Filtros</h2>
          </div>
          <div className="space-y-4 p-4">
            {FILTERS.map((filter) => (
              <label key={filter.label} className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{filter.label}</span>
                <input
                  type="text"
                  defaultValue={filter.value}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-300"
                />
              </label>
            ))}
            <div className="space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Etiquetas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Solo con alertas nuevas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Solo sin recursos asignados
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar lineas"
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button type="button" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                  Sin responsables
                </button>
                <button type="button" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                  Con evacuacion
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold">Incidente</th>
                    <th className="px-4 py-3 text-sm font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-sm font-semibold">Recursos</th>
                    <th className="px-4 py-3 text-sm font-semibold">Ultima alerta</th>
                    <th className="px-4 py-3 text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        selectedIncident?.id === incident.id ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 rounded-full px-3 py-1 text-sm font-semibold ${severityBadge(incident.severity)}`}>
                            {severityLabel(incident.severity)}
                          </span>
                          <div>
                            <p className="text-base font-semibold text-slate-900">{incident.title}</p>
                            <p className="text-sm text-slate-500">
                              {incident.area} · {incident.startedAt}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <p>{incident.type}</p>
                        <p className="text-xs text-slate-500">{stateLabel(incident.state)}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <p>
                          {incident.resources.ground} terrestres / {incident.resources.aerial} aereas
                        </p>
                        <p className="font-semibold text-slate-900">
                          {incident.resources.peopleAssigned} / {incident.resources.peopleRequired}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-800">{incident.lastAlert}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Escalar
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
              <p>
                1 a {filteredIncidents.length} de {filteredIncidents.length}
              </p>
              <p>Pagina 1</p>
            </footer>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-3xl font-semibold text-slate-900">Actividad en tiempo real</h3>
              <nav className="flex gap-3 text-sm text-slate-500">
                <button type="button" className="font-semibold text-blue-600">Todos</button>
                <button type="button">Mi zona</button>
                <button type="button">Incidentes criticos</button>
              </nav>
            </header>
            <ul className="space-y-3 p-4">
              {ACTIVITY_MOCK.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">{item.message}</p>
                  <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{item.time}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-80 border-b border-slate-200 bg-[radial-gradient(circle_at_25%_20%,_#bae6fd,_transparent_35%),radial-gradient(circle_at_70%_45%,_#a7f3d0,_transparent_30%),linear-gradient(160deg,_#f8fafc_0%,_#dbeafe_35%,_#e2e8f0_100%)] px-4 py-3">
            <p className="rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-slate-700 inline-block">
              Mapa (placeholder)
            </p>
          </div>

          {selectedIncident ? (
            <div className="space-y-4 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-4xl font-bold text-slate-900">{selectedIncident.title}</h3>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${severityBadge(selectedIncident.severity)}`}>
                    {severityLabel(selectedIncident.severity)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{selectedIncident.area}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedIncident.startedAt} ({selectedIncident.lastAlert})
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  {selectedIncident.resources.ground} aterr. / {selectedIncident.resources.aerial} drones /{" "}
                  {selectedIncident.resources.peopleAssigned} pers.
                </p>
                <p className="text-slate-500">
                  Equipo requerido: {selectedIncident.resources.peopleRequired} personas
                </p>
                {selectedIncident.commander ? (
                  <p className="mt-1">
                    Responsable: <span className="font-semibold text-slate-900">{selectedIncident.commander}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                  Ver
                </button>
                <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                  Asignar
                </button>
                <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                  Escalar
                </button>
                <button type="button" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                  Cerrar
                </button>
              </div>

              <div>
                <h4 className="mb-2 text-2xl font-semibold text-slate-900">Timeline</h4>
                <ul className="space-y-2 text-sm">
                  <li className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">19:30 · GOF emitio alerta</p>
                    <p className="text-slate-600">Fuerzas terrestres movilizadas.</p>
                  </li>
                  <li className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">19:10 · Se emitio alerta forestal</p>
                    <p className="text-slate-600">Evacuacion en progreso.</p>
                  </li>
                  <li className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">18:45 · Operador cerro incidente</p>
                    <p className="text-slate-600">Accidente vehicular en Downtown.</p>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">No hay incidentes para mostrar.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
