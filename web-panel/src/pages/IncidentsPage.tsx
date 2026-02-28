const kpis = [
  { label: "Incidentes activos", value: "2", tone: "text-emerald-600" },
  { label: "Criticos", value: "1", tone: "text-red-600" },
  { label: "Recursos desplegados", value: "18", tone: "text-blue-600" },
  { label: "Tiempo de respuesta promedio", value: "05:12 min", tone: "text-slate-900" },
];

function IncidentCard({
  title,
  severity,
  commander,
  started,
  elapsed,
  location,
  details,
  alerts,
}: {
  title: string;
  severity: string;
  commander: string;
  started: string;
  elapsed: string;
  location: string;
  details: string;
  alerts?: { time: string; message: string }[];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
            {severity}
          </span>
          <button className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Cerrar
          </button>
          <button
            type="button"
            aria-label="Mas opciones"
            className="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            ...
          </button>
        </div>
      </header>

      {/* CONTENIDO: izquierda (info) + derecha (alertas) */}
      <div className="grid gap-0 lg:grid-cols-[1.7fr_1fr]">
        {/* IZQUIERDA */}
        <div className="px-5 py-4">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Live</p>

            <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-900">Responsable:</span>{" "}
                {commander}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Inicio:</span>{" "}
                {started}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Duracion:</span>{" "}
                {elapsed}
              </p>
              <p className="truncate">
                <span className="font-semibold text-slate-900">Ubicacion:</span>{" "}
                {location}
              </p>
            </div>

            <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
              <p>
                <span className="block text-xs text-slate-500">Fuerzas</span>
                <span className="font-semibold text-slate-900">
                  5 terrestres / 2 aereas
                </span>
              </p>
              <p>
                <span className="block text-xs text-slate-500">Personal</span>
                <span className="font-semibold text-slate-900">18 / 36</span>
              </p>
              <p>
                <span className="block text-xs text-slate-500">Ala</span>
                <span className="font-semibold text-slate-900">
                  12 drones / 10 apoyo
                </span>
              </p>
            </div>

            <p className="text-sm text-slate-700">{details}</p>

            {/* "Mapa" placeholder */}
            <div className="h-40 rounded-xl bg-gradient-to-br from-emerald-100 via-sky-100 to-slate-200 ring-1 ring-slate-200" />
          </div>
        </div>

        {/* DERECHA: ALERTAS */}
        <aside className="border-t border-slate-200 bg-slate-50 px-5 py-4 lg:border-t-0 lg:border-l">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Alertas</p>
            {alerts?.length ? (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                {alerts.length}
              </span>
            ) : null}
          </div>

          {!alerts?.length ? (
            <p className="text-sm text-slate-600">Sin alertas registradas.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {alerts.map((a, i) => (
                <div key={`${a.time}-${i}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-600">{a.time}</p>
                  <p className="mt-1 text-sm text-slate-800">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
        <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Asignar recursos
        </button>
        <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Enviar alerta
        </button>
        <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
          Escalar emergencia
        </button>
        <button className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Ver
        </button>
      </footer>
    </article>
  );
}

export default function IncidentsPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold text-slate-900">Incidentes</h1>
        <button className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700">
          Nuevo incidente
        </button>
      </div>

      <section className="mb-6 grid overflow-hidden border border-slate-200 bg-white shadow-sm md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border-b border-slate-200 p-3 md:border-b-0 md:border-r last:border-r-0"
          >
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6">
        <div className="space-y-5">
          <IncidentCard
            title="Forest Fire - Zone A"
            severity="Critico"
            commander="Cpt. Jimenez"
            started="2024-01-15 14:30"
            elapsed="0h 25m"
            location="Near Oakwood Forest, Zone A"
            details="Flames is spreading rapidly due to high winds. Evacuation in progress."
            alerts={[
              { time: "15:20", message: "Evacuacion de residentes en progreso." },
              { time: "15:00", message: "Se emitio alerta de incendio forestal." },
              { time: "14:45", message: "Se detecto humo cerca del bosque de Oakwood." },
            ]}
          />

          <IncidentCard
            title="Missing Person Search"
            severity="Alto"
            commander="Lt. Herrera"
            started="2024-01-15 10:00"
            elapsed="5h 55m"
            location="Near Rivertown Park"
            details="Se encontro una pista de calzado cerca del rio. Busqueda activa."
            alerts={[
              { time: "15:50", message: "Se encontro una pista de calzado cerca del rio." },
              { time: "15:28", message: "Dron termino busqueda cerca del rio." },
              { time: "15:10", message: "Se emitio alerta regional." },
              { time: "14:45", message: "Despliegue de unidad K-9 en area boscosa." },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
