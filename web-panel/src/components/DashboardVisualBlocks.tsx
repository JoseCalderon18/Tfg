type LayerType = "satellite" | "relief" | "vegetation";

type DashboardHeaderProps = {
  email?: string;
  activeLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
  onLogout: () => void;
};

const LAYER_OPTIONS: Array<{ id: LayerType; label: string; activeClass: string; hoverClass: string }> = [
  {
    id: "satellite",
    label: "Satélite",
    activeClass: "border-[color:var(--cm-warning)] bg-[color:var(--cm-warning)]/15",
    hoverClass: "hover:border-[color:var(--cm-warning)]/50",
  },
  {
    id: "relief",
    label: "Relieve",
    activeClass: "border-[color:var(--cm-info)] bg-[color:var(--cm-info)]/15",
    hoverClass: "hover:border-[color:var(--cm-info)]/50",
  },
  {
    id: "vegetation",
    label: "Vegetación",
    activeClass: "border-green-500 bg-green-600/15",
    hoverClass: "hover:border-green-500/50",
  },
];

export function DashboardHeader({ email, activeLayer, onLayerChange, onLogout }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5 lg:py-5 2xl:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--cm-danger)]/15 ring-1 ring-[color:var(--cm-danger)]/35">
          <span className="font-bold text-[color:var(--cm-text)]">EM</span>
        </div>
        <div>
          <p className="cm-eyebrow">Centro de mando</p>
          <h1 className="cm-page-title">Centro de control de emergencias</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="cm-badge-success inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Operativo
        </span>
        <span className="cm-badge-info rounded-full px-3 py-1 text-xs">{email ?? "Supervisor"}</span>

        <div className="flex flex-wrap gap-2">
          {LAYER_OPTIONS.map((layer) => (
            <button
              key={layer.id}
              onClick={() => onLayerChange(layer.id)}
              className={`cm-btn cm-btn-secondary ${
                activeLayer === layer.id
                  ? layer.activeClass
                  : `${layer.hoverClass} hover:bg-[color:var(--cm-surface-2)]`
              }`}
              type="button"
            >
              {layer.label}
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="cm-btn cm-btn-secondary hover:border-[color:var(--cm-danger)]/50" type="button">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

type DashboardKpisProps = {
  kpis: {
    abiertas: number;
    evaluacion: number;
    cerradas: number;
    criticas: number;
    operativos: number;
  };
  closedColor: string;
};

export function DashboardKpis({ kpis, closedColor }: DashboardKpisProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <article className="cm-metric-card">
        <p className="cm-eyebrow">Incidentes abiertos</p>
        <p className="mt-2 text-3xl font-bold text-[color:var(--cm-success)]">{kpis.abiertas}</p>
      </article>
      <article className="cm-metric-card">
        <p className="cm-eyebrow">En evaluación</p>
        <p className="mt-2 text-3xl font-bold text-[color:var(--cm-warning)]">{kpis.evaluacion}</p>
      </article>
      <article className="cm-metric-card">
        <p className="cm-eyebrow">Cerrados</p>
        <p className="mt-2 text-3xl font-bold" style={{ color: closedColor }}>
          {kpis.cerradas}
        </p>
      </article>
      <article className="cm-metric-card">
        <p className="cm-eyebrow">Alertas críticas</p>
        <p className="mt-2 text-3xl font-bold text-[color:var(--cm-danger)]">{kpis.criticas}</p>
      </article>
      <article className="cm-metric-card">
        <p className="cm-eyebrow">Operativos activos</p>
        <p className="mt-2 text-3xl font-bold text-[color:var(--cm-info)]">{kpis.operativos}</p>
      </article>
    </div>
  );
}

type DashboardEmptyPanelProps = {
  title: string;
  detail?: string;
};

export function DashboardEmptyPanel({ title, detail }: DashboardEmptyPanelProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[color:var(--cm-surface)]">
      <div className="text-center">
        <p className="mb-2 text-[color:var(--cm-text-muted)]">{title}</p>
        {detail ? <p className="text-xs text-[color:var(--cm-text-muted)]">{detail}</p> : null}
      </div>
    </div>
  );
}

type DashboardMapLegendProps = {
  closedColor: string;
};

export function DashboardMapLegend({ closedColor }: DashboardMapLegendProps) {
  return (
    <div className="absolute right-3 top-3 z-[500] rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-bg)]/85 p-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Leyenda</p>
      <div className="mt-2 flex flex-col gap-2 text-xs text-[color:var(--cm-text)]">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-success)]" /> Incidente abierto</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-warning)]" /> Incidente en revisión</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: closedColor }} /> Incidente cerrado</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-alert)]" /> Alerta operativa</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-danger)]" /> Nivel crítico</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-cyan-400" /> Área de trabajo</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-teal-600" /> Punto de interés</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" /> Inicio de jornada</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /> Fin de jornada</div>
        <div className="flex items-center gap-2"><span className="h-2 w-4 border-2 border-purple-400 bg-purple-400/20" /> Rutas de usuarios</div>
      </div>
    </div>
  );
}
