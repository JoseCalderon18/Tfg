import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type RespuestaPaginada<T> = {
  results?: T[];
};

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

type FilaIncidente = {
  id: string;
  name?: string | null;
  status?: string | null;
  incident_type?: string | null;
  location_address?: string | null;
  created_at?: string | null;
};

type AvisoPanel = {
  id: string;
  tipo: "alerta" | "incidente";
  titulo: string;
  cuerpo: string;
  severidad: "critica" | "aviso" | "info";
  ruta: string;
  creadoEn: string;
};

const INTERVALO_CONSULTA_MS = 15000;
const MAXIMO_AVISOS_VISIBLES = 4;
const MAXIMO_HISTORIAL = 12;

function normalizarArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as RespuestaPaginada<T>).results)) {
    return (payload as RespuestaPaginada<T>).results ?? [];
  }
  return [];
}

function obtenerEtiquetaTipoAlerta(tipo?: string | null) {
  if (tipo === "SOS") return "SOS";
  if (tipo === "MAN_DOWN") return "Operativo caido";
  if (tipo === "LOST") return "Operativo desorientado";
  if (tipo === "GEOFENCE") return "Fuera de zona";
  if (tipo === "INJURY") return "Operativo herido";
  if (tipo === "MEDICAL") return "Emergencia medica";
  if (tipo === "WEATHER") return "Clima peligroso";
  if (tipo === "MOVEMENT") return "Inmovilidad";
  if (tipo === "BATERY") return "Bateria baja";
  return "Alerta";
}

function obtenerEtiquetaTipoIncidente(tipo?: string | null) {
  if (tipo === "SEARCH") return "Busqueda de personas";
  if (tipo === "MEDICAL") return "Emergencia medica";
  if (tipo === "WILDFIRE") return "Incendio forestal";
  if (tipo === "RESCUE") return "Rescate";
  if (tipo === "NATURAL_DISASTER") return "Desastre natural";
  return "Incidente";
}

function debeNotificarAlerta(alerta: FilaAlerta) {
  return alerta.status !== "CLOSED";
}

function debeNotificarIncidente(incidente: FilaIncidente) {
  return incidente.status === "OPEN" || incidente.status === "TRIAGE";
}

function crearAvisoDesdeAlerta(alerta: FilaAlerta): AvisoPanel {
  const esCritica = (alerta.severity ?? 5) <= 2 || alerta.alert_type === "SOS" || alerta.alert_type === "MAN_DOWN";

  return {
    id: `alerta-${alerta.id}`,
    tipo: "alerta",
    titulo: alerta.title || obtenerEtiquetaTipoAlerta(alerta.alert_type),
    cuerpo: `${obtenerEtiquetaTipoAlerta(alerta.alert_type)} - Severidad ${alerta.severity ?? "-"}`,
    severidad: esCritica ? "critica" : "aviso",
    ruta: `/editAlert/${alerta.id}`,
    creadoEn: alerta.created_at || new Date().toISOString(),
  };
}

function crearAvisoDesdeIncidente(incidente: FilaIncidente): AvisoPanel {
  return {
    id: `incidente-${incidente.id}`,
    tipo: "incidente",
    titulo: incidente.name || "Nuevo incidente",
    cuerpo: `${obtenerEtiquetaTipoIncidente(incidente.incident_type)}${incidente.location_address ? ` - ${incidente.location_address}` : ""}`,
    severidad: incidente.status === "TRIAGE" ? "aviso" : "info",
    ruta: `/editIncident/${incidente.id}`,
    creadoEn: incidente.created_at || new Date().toISOString(),
  };
}

function obtenerClasesAviso(severidad: AvisoPanel["severidad"]) {
  if (severidad === "critica") {
    return "border-[color:var(--cm-danger)]/50 bg-[color:var(--cm-danger)]/15 text-red-100";
  }
  if (severidad === "aviso") {
    return "border-[color:var(--cm-warning)]/50 bg-[color:var(--cm-warning)]/15 text-yellow-50";
  }
  return "border-[color:var(--cm-info)]/50 bg-[color:var(--cm-info)]/15 text-blue-50";
}

function puedeUsarNotificacionesNavegador() {
  return typeof window !== "undefined" && "Notification" in window;
}

export default function PanelNotifications() {
  const navigate = useNavigate();
  const [avisosVisibles, setAvisosVisibles] = useState<AvisoPanel[]>([]);
  const [historial, setHistorial] = useState<AvisoPanel[]>([]);
  const [totalAlertasActivas, setTotalAlertasActivas] = useState(0);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<NotificationPermission>(
    puedeUsarNotificacionesNavegador() ? Notification.permission : "denied"
  );
  const idsAlertasConocidas = useRef<Set<string>>(new Set());
  const idsIncidentesConocidos = useRef<Set<string>>(new Set());
  const monitorInicializado = useRef(false);

  const totalSinLeer = avisosVisibles.length;

  const avisoMasReciente = useMemo(() => historial[0] ?? null, [historial]);

  function anadirAvisos(nuevosAvisos: AvisoPanel[]) {
    if (nuevosAvisos.length === 0) return;

    setAvisosVisibles((actuales) => [...nuevosAvisos, ...actuales].slice(0, MAXIMO_AVISOS_VISIBLES));
    setHistorial((actual) => {
      const mezclados = [...nuevosAvisos, ...actual];
      const vistos = new Set<string>();
      return mezclados.filter((aviso) => {
        if (vistos.has(aviso.id)) return false;
        vistos.add(aviso.id);
        return true;
      }).slice(0, MAXIMO_HISTORIAL);
    });

    if (permisoNotificaciones === "granted" && puedeUsarNotificacionesNavegador()) {
      nuevosAvisos.forEach((aviso) => {
        const notificacion = new Notification(aviso.titulo, {
          body: aviso.cuerpo,
          tag: aviso.id,
        });
        notificacion.onclick = () => {
          window.focus();
          navigate(aviso.ruta);
          notificacion.close();
        };
      });
    }
  }

  async function cargarSenales() {
    const [respuestaAlertas, respuestaIncidentes] = await Promise.allSettled([
      apiFetch("/alerts/"),
      apiFetch("/incidents/"),
    ]);

    const nuevosAvisos: AvisoPanel[] = [];

    if (respuestaAlertas.status === "fulfilled" && respuestaAlertas.value.ok) {
      const datosAlertas = (await respuestaAlertas.value.json()) as unknown;
      const alertas = normalizarArray<FilaAlerta>(datosAlertas);
      const alertasActivas = alertas.filter(debeNotificarAlerta);
      setTotalAlertasActivas(alertasActivas.length);

      alertasActivas.forEach((alerta) => {
        if (!alerta.id) return;
        if (!idsAlertasConocidas.current.has(alerta.id)) {
          idsAlertasConocidas.current.add(alerta.id);
          if (monitorInicializado.current) nuevosAvisos.push(crearAvisoDesdeAlerta(alerta));
        }
      });
    }

    if (respuestaIncidentes.status === "fulfilled" && respuestaIncidentes.value.ok) {
      const datosIncidentes = (await respuestaIncidentes.value.json()) as unknown;
      const incidentes = normalizarArray<FilaIncidente>(datosIncidentes);

      incidentes.filter(debeNotificarIncidente).forEach((incidente) => {
        if (!incidente.id) return;
        if (!idsIncidentesConocidos.current.has(incidente.id)) {
          idsIncidentesConocidos.current.add(incidente.id);
          if (monitorInicializado.current) nuevosAvisos.push(crearAvisoDesdeIncidente(incidente));
        }
      });
    }

    if (!monitorInicializado.current) {
      monitorInicializado.current = true;
      return;
    }

    anadirAvisos(nuevosAvisos);
  }

  useEffect(() => {
    let cancelado = false;

    async function ejecutarConsulta() {
      try {
        if (!cancelado) await cargarSenales();
      } catch {
        // El monitor no debe bloquear el panel si una lectura puntual falla.
      }
    }

    void ejecutarConsulta();
    const idIntervalo = window.setInterval(() => void ejecutarConsulta(), INTERVALO_CONSULTA_MS);

    return () => {
      cancelado = true;
      window.clearInterval(idIntervalo);
    };
  }, [permisoNotificaciones]);

  async function solicitarNotificacionesNavegador() {
    if (!puedeUsarNotificacionesNavegador()) return;
    const permiso = await Notification.requestPermission();
    setPermisoNotificaciones(permiso);
  }

  function abrirAviso(aviso: AvisoPanel) {
    setAvisosVisibles((actuales) => actuales.filter((item) => item.id !== aviso.id));
    setPanelAbierto(false);
    navigate(aviso.ruta);
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-3">
        <div className="flex flex-col items-end gap-2">
          {avisosVisibles.map((aviso) => (
            <article
              key={aviso.id}
              className={`w-full rounded-xl border p-3 shadow-2xl shadow-black/30 backdrop-blur ${obtenerClasesAviso(aviso.severidad)}`}
              role="status"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{aviso.titulo}</p>
                  <p className="mt-1 text-xs opacity-90">{aviso.cuerpo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAvisosVisibles((actuales) => actuales.filter((item) => item.id !== aviso.id))}
                  className="rounded-lg px-2 text-sm font-bold opacity-80 hover:bg-white/10"
                  aria-label="Cerrar notificacion"
                >
                  x
                </button>
              </div>
              <button
                type="button"
                onClick={() => abrirAviso(aviso)}
                className="mt-3 w-full rounded-lg bg-white/12 px-3 py-2 text-xs font-semibold transition hover:bg-white/20"
              >
                Abrir
              </button>
            </article>
          ))}
        </div>

        <div className="relative">
          {panelAbierto ? (
            <section className="absolute bottom-12 right-0 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Notificaciones</p>
                  <h2 className="mt-1 text-lg font-bold text-[color:var(--cm-text)]">Actividad del panel</h2>
                </div>
                <span className="rounded-full bg-[color:var(--cm-danger)]/15 px-2.5 py-1 text-xs font-semibold text-red-200 ring-1 ring-[color:var(--cm-danger)]/30">
                  {totalAlertasActivas} alertas
                </span>
              </div>

              {permisoNotificaciones !== "granted" && puedeUsarNotificacionesNavegador() ? (
                <button
                  type="button"
                  onClick={() => void solicitarNotificacionesNavegador()}
                  className="cm-btn cm-btn-primary mt-3 w-full"
                >
                  Activar notificaciones del navegador
                </button>
              ) : null}

              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {historial.length === 0 ? (
                  <p className="rounded-lg bg-[color:var(--cm-surface-2)] p-3 text-sm text-[color:var(--cm-text-muted)]">
                    Aun no hay avisos nuevos durante esta sesion.
                  </p>
                ) : (
                  historial.map((aviso) => (
                    <button
                      key={aviso.id}
                      type="button"
                      onClick={() => abrirAviso(aviso)}
                      className={`w-full rounded-lg border p-3 text-left transition hover:brightness-110 ${obtenerClasesAviso(aviso.severidad)}`}
                    >
                      <p className="truncate text-sm font-semibold">{aviso.titulo}</p>
                      <p className="mt-1 text-xs opacity-90">{aviso.cuerpo}</p>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}

          <button
            type="button"
            onClick={() => setPanelAbierto((valor) => !valor)}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] text-lg font-bold text-[color:var(--cm-text)] shadow-2xl transition hover:bg-[color:var(--cm-surface-2)]"
            aria-label="Abrir notificaciones"
          >
            !
            {(totalSinLeer > 0 || totalAlertasActivas > 0) ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[color:var(--cm-danger)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {totalSinLeer || totalAlertasActivas}
              </span>
            ) : null}
          </button>

          {avisoMasReciente ? (
            <p className="mt-1 max-w-[14rem] truncate text-right text-[10px] text-[color:var(--cm-text-muted)]">
              {avisoMasReciente.titulo}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
