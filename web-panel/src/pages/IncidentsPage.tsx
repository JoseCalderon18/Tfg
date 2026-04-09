import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LatLngTuple } from "leaflet";
import { apiFetch } from "../utils/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import MapaMiniUnidad from "../components/MapaMiniUnidad";

type RespuestaUsuario = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type IncidenteApiFila = {
  id: string;
  name: string;
  incident_type: string;
  status: string;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  created_by?: string | null;
  owner_organization?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
};

type IncidenteFila = IncidenteApiFila & {
  parsedLocation: LatLngTuple | null;
};

type AlertaApiRow = {
  id: string;
  incident?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AlertaFila = {
  id: string;
  idIncidente: string | null;
  tipo: string;
  severidad: number;
  estado: string;
  titulo: string;
  descripcion: string | null;
  creadaPor: string | null;
  creadaEn: string | null;
  actualizadaEn: string | null;
};

const TAMANO_TILE = 256;
const ZOOM_MAPA_PDF = 13;
const ANCHO_MAPA_PDF = 900;
const ALTO_MAPA_PDF = 450;

function extraerCoordenadas(location: unknown): LatLngTuple | null {
  if (!location) return null;

  if (Array.isArray(location) && location.length >= 2) {
    const lon = Number(location[0]);
    const lat = Number(location[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
  }

  if (typeof location === "object") {
    const obj = location as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lon = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }

    if (obj.x !== undefined && obj.y !== undefined) {
      const lon = Number(obj.x);
      const lat = Number(obj.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  if (typeof location === "string") {
    // Handles formats like "SRID=4326;POINT (-3.70 40.41)" or "POINT(-3.70 40.41)"
    const match = location.match(
      /POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i
    );

    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  return null;
}

function convertirLatLngAPixelGlobal(latitud: number, longitud: number, zoom: number) {
  const escala = TAMANO_TILE * 2 ** zoom;
  const senoLatitud = Math.sin((latitud * Math.PI) / 180);

  return {
    x: ((longitud + 180) / 360) * escala,
    y:
      (0.5 - Math.log((1 + senoLatitud) / (1 - senoLatitud)) / (4 * Math.PI)) * escala,
  };
}

async function cargarTileComoBitmap(url: string) {
  const respuesta = await fetch(url, { mode: "cors" });
  if (!respuesta.ok) {
    throw new Error("No se pudo cargar el tile del mapa.");
  }

  const imagenBlob = await respuesta.blob();
  return createImageBitmap(imagenBlob);
}

async function generarImagenMapaIncidente(incidente: IncidenteFila): Promise<string | null> {
  if (!incidente.parsedLocation) return null;

  const [latitud, longitud] = incidente.parsedLocation;
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO_MAPA_PDF;
  canvas.height = ALTO_MAPA_PDF;

  const contexto = canvas.getContext("2d");
  if (!contexto) return null;

  contexto.fillStyle = "#0f172a";
  contexto.fillRect(0, 0, canvas.width, canvas.height);

  const totalTiles = 2 ** ZOOM_MAPA_PDF;
  const centro = convertirLatLngAPixelGlobal(latitud, longitud, ZOOM_MAPA_PDF);
  const origenX = centro.x - canvas.width / 2;
  const origenY = centro.y - canvas.height / 2;
  const tileInicialX = Math.floor(origenX / TAMANO_TILE);
  const tileFinalX = Math.floor((origenX + canvas.width - 1) / TAMANO_TILE);
  const tileInicialY = Math.floor(origenY / TAMANO_TILE);
  const tileFinalY = Math.floor((origenY + canvas.height - 1) / TAMANO_TILE);

  let algunTileDibujado = false;

  for (let tileY = tileInicialY; tileY <= tileFinalY; tileY += 1) {
    if (tileY < 0 || tileY >= totalTiles) continue;

    for (let tileX = tileInicialX; tileX <= tileFinalX; tileX += 1) {
      const tileXNormalizado = ((tileX % totalTiles) + totalTiles) % totalTiles;
      const urlTile = `https://tile.openstreetmap.org/${ZOOM_MAPA_PDF}/${tileXNormalizado}/${tileY}.png`;

      try {
        const imagenTile = await cargarTileComoBitmap(urlTile);
        const destinoX = tileX * TAMANO_TILE - origenX;
        const destinoY = tileY * TAMANO_TILE - origenY;
        contexto.drawImage(imagenTile, destinoX, destinoY, TAMANO_TILE, TAMANO_TILE);
        algunTileDibujado = true;
      } catch {
        // Si falla un tile concreto seguimos con los demas para no romper el PDF completo.
      }
    }
  }

  if (!algunTileDibujado) return null;

  const posicionMarcadorX = centro.x - origenX;
  const posicionMarcadorY = centro.y - origenY;

  contexto.fillStyle = "#ef4444";
  contexto.strokeStyle = "#ffffff";
  contexto.lineWidth = 4;
  contexto.beginPath();
  contexto.arc(posicionMarcadorX, posicionMarcadorY, 14, 0, Math.PI * 2);
  contexto.fill();
  contexto.stroke();

  contexto.fillStyle = "rgba(15, 23, 42, 0.78)";
  contexto.fillRect(18, 18, 180, 32);
  contexto.fillStyle = "#ffffff";
  contexto.font = "bold 20px sans-serif";
  contexto.fillText("Mapa del incidente", 28, 40);

  return canvas.toDataURL("image/png");
}

async function geocodificarInverso(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        pedestrian?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        country?: string;
      };
    };

    const address = data.address;
    if (!address) return data.display_name ?? null;

    const streetName = address.road || address.pedestrian || "";
    const houseNumber = address.house_number || "";
    const city =
      address.city || address.town || address.village || address.municipality || "";
    const country = address.country || "";

    const street = [streetName, houseNumber].filter(Boolean).join(" ").trim();
    const parts = [street, city, country].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : data.display_name ?? null;
  } catch {
    return null;
  }
}

function normalizarIncidentes(raw: unknown): IncidenteFila[] {
  const source = Array.isArray(raw)
    ? raw
    : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as Partial<IncidenteApiFila>)
    .filter((row) => typeof row?.id === "string" && typeof row?.name === "string")
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      incident_type: typeof row.incident_type === "string" ? row.incident_type : "OTHER",
      status: typeof row.status === "string" ? row.status : "OPEN",
      description: row.description ?? null,
      location: row.location ?? null,
      parsedLocation: extraerCoordenadas(row.location),
      location_address: row.location_address ?? null,
      created_by: row.created_by ?? null,
      owner_organization: row.owner_organization ?? null,
      started_at: row.started_at ?? null,
      ended_at: row.ended_at ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      is_active: Boolean(row.is_active ?? row.status === "OPEN"),
    }));
}

function normalizarAlertas(crudo: unknown): AlertaFila[] {
  const origen = Array.isArray(crudo)
    ? crudo
    : (crudo as { results?: unknown[] } | null)?.results ?? [];

  return origen
    .map((item) => item as Partial<AlertaApiRow>)
    .filter((alerta) => typeof alerta?.id === "string")
    .map((alerta) => ({
      id: alerta.id as string,
      idIncidente: typeof alerta.incident === "string" ? alerta.incident : null,
      tipo: typeof alerta.alert_type === "string" ? alerta.alert_type : "OTHER",
      severidad:
        typeof alerta.severity === "number" && !Number.isNaN(alerta.severity) ? alerta.severity : 3,
      estado: typeof alerta.status === "string" ? alerta.status : "OPEN",
      titulo: typeof alerta.title === "string" && alerta.title.trim() ? alerta.title : "Alerta sin titulo",
      descripcion: typeof alerta.description === "string" ? alerta.description : null,
      creadaPor: typeof alerta.created_by === "string" ? alerta.created_by : null,
      creadaEn: typeof alerta.created_at === "string" ? alerta.created_at : null,
      actualizadaEn: typeof alerta.updated_at === "string" ? alerta.updated_at : null,
    }));
}

function agruparAlertasPorIncidente(alertas: AlertaFila[]) {
  return alertas.reduce<Record<string, AlertaFila[]>>((acumulado, alerta) => {
    if (!alerta.idIncidente) return acumulado;

    if (!acumulado[alerta.idIncidente]) {
      acumulado[alerta.idIncidente] = [];
    }

    acumulado[alerta.idIncidente].push(alerta);
    return acumulado;
  }, {});
}

function obtenerEtiquetaTipoAlerta(tipo: string) {
  switch (tipo) {
    case "SOS":
      return "SOS";
    case "MAN_DOWN":
      return "Operativo caido";
    case "LOST":
      return "Operativo desorientado";
    case "GEOFENCE":
      return "Fuera de zona";
    case "ANOMALY":
      return "Anomalia";
    default:
      return "Otra";
  }
}

function obtenerEtiquetaEstadoAlerta(estado: string) {
  switch (estado) {
    case "OPEN":
      return "Abierta";
    case "ACK":
      return "Reconocida";
    case "CLOSED":
      return "Cerrada";
    default:
      return "Sin estado";
  }
}

function obtenerClasesEstadoAlerta(estado: string) {
  switch (estado) {
    case "OPEN":
      return "bg-red-500/15 text-red-200 ring-red-500/30";
    case "ACK":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "CLOSED":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-200 ring-slate-500/30";
  }
}
function obtenerTextoSeveridadAlerta(severidad: number) {
  if (severidad <= 1) return "Critica";
  if (severidad === 2) return "Muy alta";
  if (severidad === 3) return "Alta";
  if (severidad === 4) return "Media";
  return "Informativa";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
}

function obtenerEtiquetaTipoIncidente(tipo: string) {
  switch (tipo) {
    case "SEARCH":
      return "Búsqueda de personas";
    case "MEDICAL":
      return "Emergencia médica";
    case "WILDFIRE":
      return "Incendio forestal";
    case "RESCUE":
      return "Rescate de persona desaparecida";
    case "NATURAL_DISASTER":
      return "Desastre natural";
    default:
      return "Otro";
  }
}
function obtenerEtiquetaEstado(tipo: string){
  switch (tipo) {
    case "OPEN":
      return "Abierto";
    case "CLOSED":
      return "Cerrado";
    case "TRIAGE":
      return "Evaluacion";
    default:
      return "Desconocido";
  }
}
export default function IncidentsPage() {
  const navegar = useNavigate();
  const INCIDENTES_POR_PAGINA = 10;

  const [ubicacionResuelta, setUbicacionResuelta] = useState<string>("");
  const [resolviendoUbicacion, setResolviendoUbicacion] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [consulta, setConsulta] = useState("");
  const [incidentes, setIncidentes] = useState<IncidenteFila[]>([]);
  const [soloIncidentesAbiertos, setSoloIncidentesAbiertos] = useState(false);
  const [incidentesEvaluacion, setIncidentesEvaluacion] = useState(false);
  const [alertasPorIncidente, setAlertasPorIncidente] = useState<Record<string, AlertaFila[]>>({});
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [errorAlertas, setErrorAlertas] = useState("");
  const [incidenteSeleccionadoId, setIncidenteSeleccionadoId] = useState<string>("");
  const [incidenteEliminandoId, setIncidenteEliminandoId] = useState<string>("");
  const [incidentePendienteEliminarId, setIncidentePendienteEliminarId] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState(1);


  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/auth/panel/me/");
      if (!meRes.ok) {
        navegar("/login", { replace: true });
        return;
      }

      const meData = (await meRes.json()) as RespuestaUsuario;
      if (!meData.has_panel_full_access) {
        navegar("/login", { replace: true });
        return;
      }

      const incidentesRes = await apiFetch("/incidents/");
      if (!incidentesRes.ok) {
        setErrorMensaje("No se pudo cargar la lista de incidentes.");
        setCargando(false);
        return;
      }

      const data = (await incidentesRes.json()) as unknown;
      const lista = normalizarIncidentes(data);
      setIncidentes(lista);
      setIncidenteSeleccionadoId(lista[0]?.id ?? "");

      const respuestaAlertas = await apiFetch("/alerts/");
      if (!respuestaAlertas.ok) {
        setErrorAlertas("No se pudieron cargar las alertas relacionadas.");
        setCargandoAlertas(false);
        setCargando(false);
        return;
      }

      const datosAlertas = (await respuestaAlertas.json()) as unknown;
      const alertasNormalizadas = normalizarAlertas(datosAlertas);
      setAlertasPorIncidente(agruparAlertasPorIncidente(alertasNormalizadas));
      setErrorAlertas("");
      setCargandoAlertas(false);
      setCargando(false);
    })();
  }, [navegar]);

  const incidentesFiltrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return incidentes.filter((incidente) => {
      const coincideBusqueda =
        !q ||
        `${incidente.name} ${incidente.incident_type} ${incidente.status} ${incidente.location_address ?? ""}`
          .toLowerCase()
          .includes(q);

      const coincideAbiertos = !soloIncidentesAbiertos || incidente.status === "OPEN";
      const coincideEvaluacion = !incidentesEvaluacion || incidente.status === "TRIAGE";

      return coincideBusqueda && coincideAbiertos && coincideEvaluacion;
    });
  }, [consulta, incidentes, soloIncidentesAbiertos, incidentesEvaluacion]);

  async function exportarIncidentesPdf() {
    if (incidentesFiltrados.length === 0) {
      setErrorMensaje("No hay incidentes para exportar.");
      return;
    }

    setErrorMensaje("");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    let posicionY = 14;

    for (let indice = 0; indice < incidentesFiltrados.length; indice += 1) {
      const incidente = incidentesFiltrados[indice];
      const coordenadasTexto = incidente.parsedLocation
        ? `${incidente.parsedLocation[0]}, ${incidente.parsedLocation[1]}`
        : "-";
      const imagenMapa = await generarImagenMapaIncidente(incidente);

      const descripcionTexto = incidente.description || "Sin descripcion.";
      const direccionTexto = incidente.location_address || "-";

      if (posicionY > 20) {
        posicionY += 6;
      }

      autoTable(pdf, {
        startY: posicionY,
        theme: "grid",
        head: [[
          "Nombre",
          "Tipo",
          "Estado",
          "Organizacion",
          "Direccion",
          "Coordenadas",
          "Descripcion",
        ]],
        body: [[
          incidente.name,
          obtenerEtiquetaTipoIncidente(incidente.incident_type),
          obtenerEtiquetaEstado(incidente.status),
          incidente.owner_organization || "-",
          direccionTexto,
          coordenadasTexto,
          descripcionTexto,
        ]],
        styles: {
          fontSize: 8,
          cellPadding: 2.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 32 },
          2: { cellWidth: 22 },
          3: { cellWidth: 34 },
          4: { cellWidth: 62 },
          5: { cellWidth: 35 },
          6: { cellWidth: 70 },
        },
        margin: { left: 14, right: 14 },
      });

      const ultimaTabla = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
      const finalTablaY = ultimaTabla?.finalY ?? posicionY + 20;
      const alturaMapa = imagenMapa ? 65 : 14;
      const espacioNecesario = finalTablaY + 8 + alturaMapa + 10;

      if (espacioNecesario > 200) {
        pdf.addPage();
        posicionY = 14;

        autoTable(pdf, {
          startY: posicionY,
          theme: "grid",
          head: [[
            "Nombre",
            "Tipo",
            "Estado",
            "Organizacion",
            "Direccion",
            "Coordenadas",
            "Descripcion",
          ]],
          body: [[
            incidente.name,
            obtenerEtiquetaTipoIncidente(incidente.incident_type),
            obtenerEtiquetaEstado(incidente.status),
            incidente.owner_organization || "-",
            direccionTexto,
            coordenadasTexto,
            descripcionTexto,
          ]],
          styles: {
            fontSize: 8,
            cellPadding: 2.2,
            overflow: "linebreak",
            valign: "middle",
          },
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 32 },
            2: { cellWidth: 22 },
            3: { cellWidth: 34 },
            4: { cellWidth: 62 },
            5: { cellWidth: 35 },
            6: { cellWidth: 70 },
          },
          margin: { left: 14, right: 14 },
        });
      }

      const tablaActual = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
      const posicionMapa = (tablaActual?.finalY ?? posicionY + 20) + 8;

      pdf.setFontSize(10);
      pdf.text(`Mapa del incidente ${indice + 1}`, 14, posicionMapa);

      if (imagenMapa) {
        pdf.addImage(imagenMapa, "PNG", 14, posicionMapa + 4, 120, 65);
        posicionY = posicionMapa + 75;
      } else if (!incidente.parsedLocation) {
        pdf.text("Este incidente no tiene coordenadas disponibles.", 14, posicionMapa + 8);
        posicionY = posicionMapa + 18;
      } else {
        pdf.text("No se pudo generar el mapa de este incidente.", 14, posicionMapa + 8);
        posicionY = posicionMapa + 18;
      }

      if (posicionY > 185 && indice < incidentesFiltrados.length - 1) {
        pdf.addPage();
        posicionY = 14;
      }
    }

    const fecha = new Date().toISOString().slice(0, 10);
    pdf.save(`incidentes-${fecha}.pdf`);
  }

  const resumenKpis = useMemo(() => {
    const incidentesAbiertos = incidentes.filter((incidente) => incidente.status === "OPEN").length;
    const incidentesEnEvaluacion = incidentes.filter((incidente) => incidente.status === "TRIAGE").length;
    const incidentesCerrados = incidentes.filter((incidente) => incidente.status === "CLOSED").length;

    return { incidentesAbiertos, incidentesEnEvaluacion, incidentesCerrados };
  }, [incidentes]);

  const totalPaginas = Math.max(1, Math.ceil(incidentesFiltrados.length / INCIDENTES_POR_PAGINA));

  const incidentesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * INCIDENTES_POR_PAGINA;
    const fin = inicio + INCIDENTES_POR_PAGINA;
    return incidentesFiltrados.slice(inicio, fin);
  }, [incidentesFiltrados, paginaActual, INCIDENTES_POR_PAGINA]);

  const incidenteSeleccionado =
    incidentesFiltrados.find((incidente) => incidente.id === incidenteSeleccionadoId) ??
    incidentesFiltrados[0] ??
    null;
  const alertasDelIncidenteSeleccionado = incidenteSeleccionado
    ? alertasPorIncidente[incidenteSeleccionado.id] ?? []
    : [];

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  useEffect(() => {
    let cancelled = false;

    async function loadUbicacionResuelta() {
      if (!incidenteSeleccionado?.parsedLocation) {
        setUbicacionResuelta("");
        setResolviendoUbicacion(false);
        return;
      }

      const [lat, lon] = incidenteSeleccionado.parsedLocation;

      setResolviendoUbicacion(true);
      setUbicacionResuelta("");

      const result = await geocodificarInverso(lat, lon);

      if (!cancelled) {
        setUbicacionResuelta(result || "");
        setResolviendoUbicacion(false);
      }
    }

    loadUbicacionResuelta();

    return () => {
      cancelled = true;
    };
  }, [incidenteSeleccionado]);

  useEffect(() => {
    if (!incidentePendienteEliminarId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !incidenteEliminandoId) {
        setIncidentePendienteEliminarId("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [incidentePendienteEliminarId, incidenteEliminandoId]);

  const incidentePendienteEliminar =
    incidentes.find((incidente) => incidente.id === incidentePendienteEliminarId) ?? null;

  async function prepararEliminarIncidente(incidentId: string) {
    setIncidentePendienteEliminarId(incidentId);
    return;
  }

  async function confirmarEliminarIncidente(incidentId: string) {
    if (incidenteEliminandoId) return;

    setErrorMensaje("");
    setIncidenteEliminandoId(incidentId);
    try {
      const res = await apiFetch(`/incidents/${incidentId}/`, { method: "DELETE" });
      if (!res.ok) {
        let detail: string = "No se pudo borrar el incidente.";
        try {
          const data = (await res.json()) as Record<string, unknown>;
          const detailMessage = data["detail"];
          if (typeof detailMessage === "string") detail = detailMessage;
        } catch {
          // keep fallback
        }
        setErrorMensaje(detail);
        return;
      }
      setIncidentePendienteEliminarId("");
    } finally {
      setIncidenteEliminandoId("");
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando incidentes...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold">Incidentes</h1>
          </div>

                  <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportarIncidentesPdf}
            className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-surface-2)]"
            style={{ cursor: "pointer" }}
          >
            Exportar PDF
          </button>


          <button
            type="button"
            onClick={() => navegar("/createincident")}
            className="rounded-xl bg-[color:var(--cm-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ cursor: "pointer" }}
          >
            Nuevo incidente
          </button>
        </div>

        </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              Incidentes abiertos
            </p>
            <p className="mt-3 text-3xl font-bold text-[color:var(--cm-danger)]">
              {resumenKpis.incidentesAbiertos}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Operativos activos ahora mismo.
            </p>
          </article>

          <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              En evaluacion
            </p>
            <p className="mt-3 text-3xl font-bold text-[color:var(--cm-warning)]">
              {resumenKpis.incidentesEnEvaluacion}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Incidentes pendientes de clasificacion.
            </p>
          </article>

          <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">
              Cerrados
            </p>
            <p className="mt-3 text-3xl font-bold text-[color:var(--cm-success)]">
              {resumenKpis.incidentesCerrados}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">
              Incidentes finalizados y archivados.
            </p>
          </article>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-3.5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <input
                type="text"
                value={consulta}
                onChange={(e) => {
                  setConsulta(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por nombre, tipo, estado o ubicacion..."
                className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
              />
            </div>
            

            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)]">
                <input
                  type="checkbox"
                  checked={soloIncidentesAbiertos}
                  onChange={(e) => {
                    setSoloIncidentesAbiertos(e.target.checked);
                    setPaginaActual(1);
                  }}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]"
                />
                Solo abiertos
              </label>

              <label className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm text-[color:var(--cm-text)]">
                <input
                  type="checkbox"
                  checked={incidentesEvaluacion}
                  onChange={(e) => {
                    setIncidentesEvaluacion(e.target.checked);
                    setPaginaActual(1);
                  }}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]"
                />
                Solo en evaluacion
              </label>
            </div>
          </div>
        </div>

        

        {errorMensaje && (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">
            {errorMensaje}
          </div>
        )}

        <div className="mt-4 grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
          <section className="overflow-x-auto rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <table className="min-w-[1120px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Estado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Organizacion</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Inicio</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em]">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {incidentesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--cm-text-muted)]">
                      No hay incidentes para mostrar.
                    </td>
                  </tr>
                ) : (
                  incidentesPaginados.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => setIncidenteSeleccionadoId(incident.id)}
                      className={`cursor-pointer border-t border-[color:var(--cm-border)] transition hover:bg-[color:var(--cm-surface-2)]/60 ${
                        incidenteSeleccionado?.id === incident.id ? "bg-[color:var(--cm-surface-2)]/70" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-medium">{incident.name}</td>
                      <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                        {incident.incident_type === "SEARCH" ? "Búsqueda de personas"
                          : incident.incident_type === "MEDICAL" ? "Emergencia médica"
                          : incident.incident_type === "WILDFIRE" ? "Incendio forestal"
                          : incident.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                          : incident.incident_type === "NATURAL_DISASTER" ? "Desastre natural"
                          : "Otro"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                            incident.status === "CLOSED"
                              ? "cm-badge-success"
                              : incident.status === "TRIAGE"
                              ? "cm-badge-warning"
                              : "cm-badge-danger"
                          }`}
                        >
                          {incident.status === "OPEN"
                        ? "Abierto"
                        : incident.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluacion"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)]">
                        {incident.owner_organization || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-[color:var(--cm-text-muted)] whitespace-nowrap">
                        {formatDate(incident.started_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navegar(`/editIncident/${incident.id}`);
                            }}
                            className="rounded-lg bg-[color:var(--cm-info)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void prepararEliminarIncidente(incident.id);
                            }}
                            disabled={Boolean(incidenteEliminandoId)}
                            className="rounded-lg bg-[color:var(--cm-danger)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                          >
                            {incidenteEliminandoId === incident.id ? "Borrando..." : "Borrar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {incidentesFiltrados.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-[color:var(--cm-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--cm-text-muted)]">
                  Pagina {paginaActual} de {totalPaginas} · Mostrando {incidentesPaginados.length} de {incidentesFiltrados.length} incidentes
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
            )}
          </section>

          <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        {incidenteSeleccionado ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">{incidenteSeleccionado.name}</h2>
            </div>

            {!incidentePendienteEliminarId && incidenteSeleccionado.parsedLocation && (
              <MapaMiniUnidad
                latitud={incidenteSeleccionado.parsedLocation[0]}
                longitud={incidenteSeleccionado.parsedLocation[1]}
                etiqueta={
                  incidenteSeleccionado.name
                    ? `Ubicacion del incidente ${incidenteSeleccionado.name}`
                    : "Ubicacion del incidente"
                }
              />
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.incident_type === "SEARCH"
                        ? "Búsqueda de personas"
                        : incidenteSeleccionado.incident_type === "MEDICAL"
                        ? "Emergencia médica"
                        : incidenteSeleccionado.incident_type === "WILDFIRE"
                        ? "Incendio forestal"
                        : incidenteSeleccionado.incident_type === "RESCUE"
                        ? "Rescate de persona desaparecida"
                        : incidenteSeleccionado.incident_type === "NATURAL_DISASTER"
                        ? "Desastre natural"
                        : "Otro"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Estado</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.status === "OPEN"
                        ? "Abierto"
                        : incidenteSeleccionado.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluacion"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Activo</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.is_active ? "Si" : "No"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Organizacion</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.owner_organization || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-400">Descripcion</p>
                    <p className="text-slate-100">{incidenteSeleccionado.description || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Direccion</p>
                    <p className="text-slate-100">{incidenteSeleccionado.location_address || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Ubicacion legible</p>
                    <p className="text-slate-100">
                      {resolviendoUbicacion
                        ? "Buscando direccion..."
                        : ubicacionResuelta || incidenteSeleccionado.location_address || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Coordenadas</p>
                    <p className="text-slate-100">
                      {incidenteSeleccionado.parsedLocation
                        ? `${incidenteSeleccionado.parsedLocation[0]}, ${incidenteSeleccionado.parsedLocation[1]}`
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Creado por</p>
                    <p className="text-slate-100">{incidenteSeleccionado.created_by || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Inicio</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.started_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Fin</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.ended_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Creado</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Actualizado</p>
                    <p className="text-slate-100">{formatDate(incidenteSeleccionado.updated_at)}</p>
                  </div>
                </div>
              </div>

              <section className="rounded-2xl bg-slate-950/45 p-4 ring-1 ring-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Seguimiento operativo</p>
                    <h3 className="text-lg font-bold text-slate-100">Alertas relacionadas</h3>
                  </div>
                  <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
                    {alertasDelIncidenteSeleccionado.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {cargandoAlertas ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                      Cargando alertas del incidente...
                    </div>
                  ) : errorAlertas ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                      {errorAlertas}
                    </div>
                  ) : alertasDelIncidenteSeleccionado.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                      Este incidente no tiene alertas asociadas.
                    </div>
                  ) : (
                    alertasDelIncidenteSeleccionado.map((alerta) => (
                      <article
                        key={alerta.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {obtenerEtiquetaTipoAlerta(alerta.tipo)}
                            </p>
                            <h4 className="mt-1 text-sm font-semibold text-slate-100">
                              {alerta.titulo}
                            </h4>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${obtenerClasesEstadoAlerta(alerta.estado)}`}
                          >
                            {obtenerEtiquetaEstadoAlerta(alerta.estado)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-200 ring-1 ring-slate-700">
                            Severidad {alerta.severidad}: {obtenerTextoSeveridadAlerta(alerta.severidad)}
                          </span>
                          <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-300 ring-1 ring-slate-700">
                            {alerta.creadaPor || "Sin autor"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {alerta.descripcion || "Sin descripcion adicional."}
                        </p>

                        <div className="mt-3 text-xs text-slate-500">
                          <p>Creada: {formatDate(alerta.creadaEn)}</p>
                          <p>Actualizada: {formatDate(alerta.actualizadaEn)}</p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No hay incidentes para mostrar.</p>
        )}
      </aside>
        </div>
      </div>

      {incidentePendienteEliminar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar confirmacion"
            onClick={() => {
              if (!incidenteEliminandoId) setIncidentePendienteEliminarId("");
            }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-incident-title"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/50 ring-1 ring-white/5"
          >
            <div className="pointer-events-none absolute inset-0 opacity-80">
              <div className="absolute -top-10 left-10 h-32 w-32 rounded-full bg-red-500/20 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-orange-400/10 blur-3xl" />
            </div>

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
                  <span className="text-2xl font-bold text-red-200">!</span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/80">
                    Confirmacion de borrado
                  </p>
                  <h2 id="delete-incident-title" className="mt-2 text-2xl font-bold text-slate-50">
                    Eliminar incidente
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Vas a eliminar <span className="font-semibold text-white">{incidentePendienteEliminar.name}</span>.
                    Esta accion es permanente y el incidente dejara de estar disponible en el panel.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800">
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-slate-400">Tipo</p>
                    {incidentePendienteEliminar.incident_type === "SEARCH" ? ("Búsqueda de personas")
                    : incidentePendienteEliminar.incident_type === "MEDICAL" ? "Emergencia médica" 
                    : incidentePendienteEliminar.incident_type === "WILDFIRE" ? "Incendio forestal"
                    : incidentePendienteEliminar.incident_type === "RESCUE" ? "Rescate de persona desaparecida"
                    : incidentePendienteEliminar.incident_type === "NATURAL_DISASTER" ? "Desastre natural" 
                    : incidentePendienteEliminar.incident_type === "OTHER" ? "Otro"
                    : "Tipo de incidente no válido"}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-slate-400">Estado</p>
                    {incidentePendienteEliminar.status === "OPEN"
                        ? "Abierto"
                        : incidentePendienteEliminar.status === "CLOSED"
                        ? "Cerrado"
                        : "Evaluacion"}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIncidentePendienteEliminarId("")}
                  disabled={Boolean(incidenteEliminandoId)}
                  className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarEliminarIncidente(incidentePendienteEliminar.id)}
                  disabled={Boolean(incidenteEliminandoId)}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {incidenteEliminandoId === incidentePendienteEliminar.id ? "Eliminando..." : "Si, eliminar incidente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
