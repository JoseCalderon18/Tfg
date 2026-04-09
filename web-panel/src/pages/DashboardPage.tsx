import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Circle, Polygon } from "react-leaflet";
import { apiFetch } from "../utils/api";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
import L, { type LatLngTuple } from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, positions]);

  return null;
}

type MeResponse = {
  authenticated: boolean;
  email?: string;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
};

type Incident = {
  id: string;
  name: string;
  incident_type: string;
  status: string;
  description?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  } | null;
  location_address?: string;
  created_by: string;
  owner_organization?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type AlertRow = {
  id: string;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  location?: unknown;
  incident?: string | null;
  created_at?: string | null;
};

type PointOfInterestApiRow = {
  id: string;
  name?: string | null;
  poi_type?: string | null;
  description?: string | null;
  incident?: string | null;
  incident_name?: string | null;
  created_by?: string | null;
  created_by_username?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: unknown;
};

type PointOfInterestRow = {
  id: string;
  name: string;
  poiType: string;
  description: string;
  incidentId: string | null;
  incidentName: string | null;
  createdBy: string | null;
  createdByUsername: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  coords: LatLngTuple | null;
};

type WorkAreaApiRow = {
  id: number;
  name?: string | null;
  area_type?: string | null;
  center?: unknown;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_m?: number | null;
  polygon?: unknown;
  polygon_coordinates?: unknown;
  active?: boolean | null;
  created_at?: string | null;
  incident?: string | null;
  incident_name?: string | null;
};

type WorkAreaRow = {
  id: number;
  name: string;
  areaType: "CIRCLE" | "POLYGON";
  center: LatLngTuple | null;
  radiusM: number | null;
  polygon: LatLngTuple[] | null;
  active: boolean;
  createdAt: string | null;
  incidentId: string | null;
  incidentName: string | null;
};

type UserRow = {
  id: string;
  role?: string | null;
  is_active?: boolean;
};

type LayerType = "satellite" | "relief" | "vegetation";

const tileUrls: Record<LayerType, { url: string; attribution: string }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics',
  },
  relief: {
    url: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenTopoMap, &copy; OpenStreetMap contributors',
  },
  vegetation: {
    url: "https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap, Humanitarian OpenStreetMap Team',
  },
};

function isValidLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parsePoint(value: unknown): LatLngTuple | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown; x?: unknown; y?: unknown };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const lng = Number(candidate.coordinates[0]);
      const lat = Number(candidate.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const lng = Number(candidate.x);
      const lat = Number(candidate.y);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
    }
  }

  if (typeof value === "string") {
    const match = value.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
    }
  }

  return null;
}

function parsePolygon(value: unknown): LatLngTuple[] | null {
  if (!value) return null;

  const extractRing = (ring: unknown[]): LatLngTuple[] =>
    ring
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) return null;
        const lng = Number(point[0]);
        const lat = Number(point[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng) || !isValidLatLng(lat, lng)) return null;
        return [lat, lng] as LatLngTuple;
      })
      .filter((point): point is LatLngTuple => Boolean(point));

  if (Array.isArray(value) && value.length > 0) {
    if (Array.isArray(value[0]) && Array.isArray((value[0] as unknown[])[0])) {
      const ring = extractRing(value[0] as unknown[]);
      return ring.length >= 3 ? ring : null;
    }

    const ring = extractRing(value as unknown[]);
    return ring.length >= 3 ? ring : null;
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown };
    if (Array.isArray(candidate.coordinates)) {
      return parsePolygon(candidate.coordinates);
    }
  }

  if (typeof value === "string") {
    const match = value.match(/POLYGON\s*\(\((.+)\)\)/i);
    if (!match) return null;

    const ring = match[1]
      .split(",")
      .map((pair) => pair.trim().split(/\s+/))
      .map((parts) => {
        if (parts.length < 2) return null;
        const lng = Number(parts[0]);
        const lat = Number(parts[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng) || !isValidLatLng(lat, lng)) return null;
        return [lat, lng] as LatLngTuple;
      })
      .filter((point): point is LatLngTuple => Boolean(point));

    return ring.length >= 3 ? ring : null;
  }

  return null;
}

function normalizeWorkAreas(raw: unknown): WorkAreaRow[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as WorkAreaApiRow)
    .filter((row) => typeof row?.id === "number")
    .map((row) => {
      const centerFromPayload =
        row.center_lat != null && row.center_lng != null ? ([row.center_lat, row.center_lng] as LatLngTuple) : parsePoint(row.center);
      const polygon = parsePolygon(row.polygon_coordinates ?? row.polygon);

      return {
        id: row.id,
        name: row.name?.trim() || `Área ${row.id}`,
        areaType: row.area_type === "POLYGON" ? "POLYGON" : "CIRCLE",
        center: centerFromPayload,
        radiusM: typeof row.radius_m === "number" ? row.radius_m : null,
        polygon,
        active: Boolean(row.active),
        createdAt: row.created_at ?? null,
        incidentId: row.incident ?? null,
        incidentName: row.incident_name ?? null,
      };
    });
}

function normalizePointsOfInterest(raw: unknown): PointOfInterestRow[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as PointOfInterestApiRow)
    .filter((row) => typeof row?.id === "string")
    .map((row) => ({
      id: row.id,
      name: row.name?.trim() || "Punto sin nombre",
      poiType: row.poi_type ?? "OTHER",
      description: row.description?.trim() || "Sin descripcion adicional.",
      incidentId: row.incident ?? null,
      incidentName: row.incident_name ?? null,
      createdBy: row.created_by ?? null,
      createdByUsername: row.created_by_username ?? null,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      coords:
        row.latitude != null && row.longitude != null
          ? ([row.latitude, row.longitude] as LatLngTuple)
          : parsePoint(row.location),
    }));
}

function parsePointLocation(location: unknown): [number, number] | null {
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
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[3]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return [lat, lon];
    }
  }

  return null;
}

function incidentStatusBadge(status: string) {
  if (status === "OPEN") return "cm-badge-danger";
  if (status === "TRIAGE") return "cm-badge-warning";
  return "cm-badge-success";
}

function incidentStatusLabel(status: string) {
  if (status === "OPEN") return "Abierto";
  if (status === "TRIAGE") return "En revisión";
  return "Cerrado";
}

function incidentTypeLabel(type: string) {
  if (type === "SEARCH") return "Búsqueda";
  if (type === "MEDICAL") return "Médico";
  if (type === "WILDFIRE") return "Incendio";
  if (type === "RESCUE") return "Rescate";
  if (type === "NATURAL_DISASTER") return "Desastre natural";
  return "Otro";
}

function incidentMarkerColor(status: string) {
  if (status === "OPEN") return "#DC2626";
  if (status === "TRIAGE") return "#EAB308";
  return "#16A34A";
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "cm-map-pin",
    html: `
      <div style="position: relative; width: 40px; height: 48px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 8px 14px rgba(15, 23, 42, 0.45));">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 256 256" fill="${color}">
          <path d="M188,72a60,60,0,1,0-72,58.79V232a12,12,0,0,0,24,0V130.79A60.09,60.09,0,0,0,188,72Zm-60,36a36,36,0,1,1,36-36A36,36,0,0,1,128,108Z"></path>
        </svg>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -34],
  });
}

function poiVisual(poiType?: string | null) {
  switch (poiType) {
    case "HYDRANT":
      return { label: "H2O", bg: "#2563eb", border: "#bfdbfe" };
    case "SETTLEMENT":
      return { label: "CASA", bg: "#92400e", border: "#fcd34d" };
    case "FIREBREAK":
      return { label: "FUE", bg: "#dc2626", border: "#fca5a5" };
    case "WATCHPOINT":
      return { label: "OJO", bg: "#7c3aed", border: "#ddd6fe" };
    case "BASE_STATION":
      return { label: "BASE", bg: "#334155", border: "#cbd5e1" };
    case "EVAC_ROUTE":
      return { label: "EVAC", bg: "#16a34a", border: "#bbf7d0" };
    case "COMMUNICATION_TOWER":
      return { label: "COM", bg: "#0891b2", border: "#a5f3fc" };
    case "CHECKPOINT":
      return { label: "CTRL", bg: "#ca8a04", border: "#fde68a" };
    case "OBSTACLE":
      return { label: "OBS", bg: "#b91c1c", border: "#fecaca" };
    case "BRIDGE":
      return { label: "PTE", bg: "#0f766e", border: "#99f6e4" };
    case "SUPPLY_POINT":
      return { label: "SUM", bg: "#ea580c", border: "#fdba74" };
    case "HELIPAD":
      return { label: "HEL", bg: "#475569", border: "#e2e8f0" };
    default:
      return { label: "POI", bg: "#0f766e", border: "#99f6e4" };
  }
}

function poiMarkerIcon(poiType?: string | null) {
  const visual = poiVisual(poiType);

  return L.divIcon({
    className: "cm-map-pin",
    html: `
      <div style="position: relative; width: 36px; height: 36px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 8px 14px rgba(15, 23, 42, 0.45));">
        <div style="min-width: 30px; height: 30px; padding: 0 6px; border-radius: 9999px; background: ${visual.bg}; border: 3px solid ${visual.border}; display:flex; align-items:center; justify-content:center; color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.04em;">
          ${visual.label}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function alertStatusBadge(status?: string | null) {
  if (status === "OPEN") return "cm-badge-danger";
  if (status === "ACK") return "cm-badge-alert";
  return "cm-badge-success";
}

function alertStatusLabel(status?: string | null) {
  if (status === "OPEN") return "Abierta";
  if (status === "ACK") return "Reconocida";
  if (status === "CLOSED") return "Cerrada";
  return "En revisión";
}

export default function DashboardPage() {
  // Estado principal del centro de control.
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterestRow[]>([]);
  const [units, setUnits] = useState<UserRow[]>([]);
  const [activeLayer, setActiveLayer] = useState<LayerType>("satellite");
  const [search, setSearch] = useState("");
  const [workAreas, setWorkAreas] = useState<WorkAreaRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "TRIAGE" | "CLOSED">("ALL");
  const navigate = useNavigate();

  const positionedIncidents = useMemo(() =>
    incidents
      .filter((incident) => incident.location && incident.location.coordinates)
      .map((incident) => ({
        incident,
        latLng: [incident.location!.coordinates[1], incident.location!.coordinates[0]] as [number, number],
      })),
    [incidents]
  );

  const incidentsFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query && statusFilter === "ALL") return incidents;

    return incidents.filter((incidente) => {
      const matchesQuery = `${incidente.name} ${incidente.incident_type} ${incidente.status} ${incidente.location_address ?? ""}`
        .toLowerCase()
        .includes(query);
      const matchesStatus = statusFilter === "ALL" || incidente.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [incidents, search, statusFilter]);

  const positionedFilteredIncidents = useMemo(
    () =>
      incidentsFiltered
        .filter((incidente) => incidente.location && incidente.location.coordinates)
        .map((incidente) => ({
          incidente,
          latLng: [incidente.location!.coordinates[1], incidente.location!.coordinates[0]] as [number, number],
        })),
    [incidentsFiltered]
  );

  const filteredPositions = useMemo(
    () => positionedFilteredIncidents.map((item) => item.latLng),
    [positionedFilteredIncidents]
  );
  const workAreaPositions = useMemo(
    () =>
      workAreas.flatMap((area) => {
        if (!area.active) return [];
        if (area.areaType === "CIRCLE" && area.center) return [area.center];
        if (area.areaType === "POLYGON" && area.polygon) return area.polygon;
        return [];
      }),
    [workAreas]
  );
  const mapBoundsPositions = useMemo(
    () => [
      ...filteredPositions,
      ...workAreaPositions,
      ...pointsOfInterest
        .filter((point) => point.isActive && point.coords)
        .map((point) => point.coords as LatLngTuple),
    ],
    [filteredPositions, workAreaPositions, pointsOfInterest]
  );

  const kpis = useMemo(() => {
    const abiertas = incidents.filter((incidente) => incidente.status === "OPEN").length;
    const evaluacion = incidents.filter((incidente) => incidente.status === "TRIAGE").length;
    const cerradas = incidents.filter((incidente) => incidente.status === "CLOSED").length;
    const criticas = alerts.filter((alert) => (alert.status ?? "OPEN") !== "CLOSED" && (alert.severity ?? 5) <= 2).length;
    const operativos = units.filter((unit) => unit.is_active && unit.role === "OPERATIVE").length;

    return { abiertas, evaluacion, cerradas, criticas, operativos };
  }, [incidents, alerts, units]);

  const latestIncidents = useMemo(() => incidentsFiltered.slice(0, 5), [incidentsFiltered]);
  const mappedAlerts = useMemo(
    () => alerts.map((alert) => ({ ...alert, parsedLocation: parsePointLocation(alert.location) })).filter((alert) => alert.parsedLocation),
    [alerts]
  );
  const latestAlerts = useMemo(() => alerts.slice(0, 6), [alerts]);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        navigate("/login", { replace: true });
        return;
      }

      const data = (await res.json()) as MeResponse;

      if (!data.has_panel_full_access) {
        navigate("/login", { replace: true });
        return;
      }

      setMe(data);

      const [incidentsRes, alertsRes, unitsRes, workAreasRes, pointsOfInterestRes] = await Promise.all([
        apiFetch("/incidents/"),
        apiFetch("/alerts/"),
        apiFetch("/auth/panel/users/"),
        apiFetch("/workareas/"),
        apiFetch("/points-of-interest/"),
      ]);

      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        const incidentItems: Incident[] = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.results || [];
        setIncidents(incidentItems);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        const alertItems: AlertRow[] = Array.isArray(alertsData)
          ? alertsData
          : alertsData.results || [];
        setAlerts(alertItems);
      }

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json();
        setUnits(Array.isArray(unitsData) ? unitsData : []);
      }

      if (workAreasRes.ok) {
        const workAreasData = await workAreasRes.json();
        setWorkAreas(normalizeWorkAreas(workAreasData));
      }

      if (pointsOfInterestRes.ok) {
        const pointsOfInterestData = await pointsOfInterestRes.json();
        setPointsOfInterest(normalizePointsOfInterest(pointsOfInterestData));
      }

      setLoading(false);
    })();
  }, [navigate]);

  async function handleLogout() {
    await apiFetch("/auth/panel/logout/", { method: "POST" });
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--cm-text-muted)] border-t-transparent" />
          <p className="text-[color:var(--cm-text-muted)]">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[color:var(--cm-danger)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[color:var(--cm-info)] blur-3xl" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 lg:px-5 lg:py-5 2xl:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--cm-danger)]/15 ring-1 ring-[color:var(--cm-danger)]/35">
              <span className="font-bold text-[color:var(--cm-text)]">EM</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Centro de mando</p>
              <h1 className="text-2xl font-bold tracking-tight">Centro de control de emergencias</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="cm-badge-success inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operativo
            </span>
            <span className="cm-badge-info rounded-full px-3 py-1 text-xs">
              {me?.email ?? "Supervisor"}
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveLayer("satellite")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeLayer === "satellite"
                    ? "border-[color:var(--cm-warning)] bg-[color:var(--cm-warning)]/15"
                    : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] hover:border-[color:var(--cm-warning)]/50 hover:bg-[color:var(--cm-surface-2)]"
                }`}
                type="button"
              >
                📡 Satélite
              </button>

              <button
                onClick={() => setActiveLayer("relief")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeLayer === "relief"
                    ? "border-[color:var(--cm-info)] bg-[color:var(--cm-info)]/15"
                    : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] hover:border-[color:var(--cm-info)]/50 hover:bg-[color:var(--cm-surface-2)]"
                }`}
                type="button"
              >
                ⛰️ Relieve
              </button>

              <button
                onClick={() => setActiveLayer("vegetation")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeLayer === "vegetation"
                    ? "border-green-500 bg-green-600/15"
                    : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] hover:border-green-500/50 hover:bg-[color:var(--cm-surface-2)]"
                }`}
                type="button"
              >
                🌲 Vegetación
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:border-[color:var(--cm-danger)]/50 hover:bg-[color:var(--cm-surface-2)]"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 pb-4 lg:px-5 lg:pb-5 2xl:px-6">
          {/* Los números importantes arriba */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Incidentes abiertos</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-danger)]">{kpis.abiertas}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">En evaluación</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-warning)]">{kpis.evaluacion}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Cerrados</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-success)]">{kpis.cerradas}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Alertas críticas</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-alert)]">{kpis.criticas}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativos activos</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-info)]">{kpis.operativos}</p>
            </article>
          </div>

          {/* El mapa y el resumen juntos */}
          <div className="mt-4 grid h-[calc(100vh-255px)] gap-4 xl:grid-cols-[1.8fr_0.95fr]">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Mapa operativo</p>
                  <h2 className="mt-1 text-lg font-bold">Resumen geográfico de incidencias</h2>
                </div>
                <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row">
                  <div className="relative w-full lg:w-[22rem]">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--cm-text-muted)]">
                      🔎
                    </span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por nombre, estado o ubicación"
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] pl-10 pr-3.5 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setStatusFilter("ALL")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "ALL" ? "cm-badge-info" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Todas
                    </button>
                    <button type="button" onClick={() => setStatusFilter("OPEN")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "OPEN" ? "cm-badge-danger" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Abiertas
                    </button>
                    <button type="button" onClick={() => setStatusFilter("TRIAGE")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "TRIAGE" ? "cm-badge-warning" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Revisión
                    </button>
                    <button type="button" onClick={() => setStatusFilter("CLOSED")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "CLOSED" ? "cm-badge-success" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Cerradas
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-[calc(100%-74px)] w-full rounded-2xl overflow-hidden border border-[color:var(--cm-border)] relative">
            <div className="absolute right-3 top-3 z-[500] rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-bg)]/85 p-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Leyenda</p>
              <div className="mt-2 flex flex-col gap-2 text-xs text-[color:var(--cm-text)]">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-danger)]" /> Incidente crítico</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-warning)]" /> Incidente en revisión</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-success)]" /> Incidente resuelto</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-alert)]" /> Alerta operativa</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-cyan-400" /> Area de trabajo</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-teal-600" /> Punto de interes</div>
              </div>
            </div>
            {incidents.length === 0 && (
              <div className="absolute inset-0 bg-[color:var(--cm-surface)] flex items-center justify-center z-50">
                <div className="text-center">
                  <p className="text-[color:var(--cm-text-muted)] mb-2">No hay incidentes cargados</p>
                  <p className="text-xs text-[color:var(--cm-text-muted)]">Total incidentes: {incidents.length}</p>
                </div>
              </div>
            )}
            {incidents.length > 0 && positionedIncidents.length === 0 && (
              <div className="absolute inset-0 bg-[color:var(--cm-surface)] flex items-center justify-center z-50">
                <div className="text-center">
                  <p className="text-[color:var(--cm-text-muted)] mb-2">No hay incidentes con ubicación</p>
                  <p className="text-xs text-[color:var(--cm-text-muted)]">Total incidentes: {incidents.length}</p>
                </div>
              </div>
            )}
            <MapContainer
              center={mapBoundsPositions.length ? mapBoundsPositions[0] : [40.4168, -3.7038]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution={tileUrls[activeLayer].attribution}
                url={tileUrls[activeLayer].url}
              />
              {mapBoundsPositions.length > 0 && <FitBounds positions={mapBoundsPositions} />}
              {workAreas.map((area) => {
                if (!area.active) return null;

                if (area.areaType === "CIRCLE" && area.center && area.radiusM) {
                  return (
                    <Circle
                      key={`workarea-circle-${area.id}`}
                      center={area.center}
                      radius={area.radiusM}
                      pathOptions={{ color: "#06b6d4", fillColor: "#22d3ee", fillOpacity: 0.14, weight: 2 }}
                    >
                      <Popup>
                        <div className="min-w-[220px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Area de trabajo</p>
                          <h3 className="mt-1 font-bold text-base">{area.name}</h3>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-semibold text-cyan-200">
                              Ci­rculo
                            </span>
                            {area.incidentName ? (
                              <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                                {area.incidentName}
                              </span>
                            ) : null}
                          </div>
                          <button onClick={() => navigate(`/editIncident/${area.incidentId}`)}>
                            <span className="mt-3 inline-flex rounded-lg bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-semibold transition hover:brightness-110">
                              Abrir incidente
                            </span>
                          </button>
                          <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">Radio: {Math.round(area.radiusM)} m</p>
                        </div>
                      </Popup>
                    </Circle>
                  );
                }

                if (area.areaType === "POLYGON" && area.polygon && area.polygon.length >= 3) {
                  return (
                    <Polygon
                      key={`workarea-polygon-${area.id}`}
                      positions={area.polygon}
                      pathOptions={{ color: "#06b6d4", fillColor: "#22d3ee", fillOpacity: 0.14, weight: 2 }}
                    >
                      <Popup>
                        <div className="min-w-[220px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ãrea de trabajo</p>
                          <h3 className="mt-1 font-bold text-base">{area.name}</h3>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-semibold text-cyan-200">
                              PolÃ­gono
                            </span>
                            {area.incidentName ? (
                              <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                                {area.incidentName}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">Zona activa de operaciÃ³n</p>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                }

                return null;
              })}
              {pointsOfInterest.map((point) =>
                point.isActive && point.coords ? (
                  <Marker
                    key={`poi-${point.id}`}
                    position={point.coords}
                    icon={poiMarkerIcon(point.poiType)}
                  >
                    <Popup>
                      <div className="min-w-[220px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Punto de interes</p>
                        <h3 className="mt-1 font-bold text-base">{point.name}</h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full bg-teal-500/15 px-2.5 py-1 font-semibold text-teal-200">
                            {point.poiType}
                          </span>
                          {point.incidentName ? (
                            <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                              {point.incidentName}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">{point.description}</p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
              {positionedFilteredIncidents.map(({ incidente, latLng }) => {
                return (
                  <Marker
                    key={incidente.id}
                    position={latLng}
                    icon={markerIcon(incidentMarkerColor(incidente.status))}
                  >
                    <Popup>
                      <div className="min-w-[230px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Incidente</p>
                            <h3 className="mt-1 font-bold text-base">{incidente.name}</h3>
                          </div>
                          <span className={`${incidentStatusBadge(incidente.status)} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                            {incidentStatusLabel(incidente.status)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="cm-badge-info rounded-full px-2.5 py-1 font-semibold">
                            {incidentTypeLabel(incidente.incident_type)}
                          </span>
                          {incidente.owner_organization ? (
                            <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                              {incidente.owner_organization}
                            </span>
                          ) : null}
                        </div>
                        {incidente.description && (
                          <p className="mt-3 text-sm leading-6 text-[color:var(--cm-text-muted)]">{incidente.description}</p>
                        )}
                        {incidente.location_address && (
                          <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">📍 {incidente.location_address}</p>
                        )}
                        <p className="mt-3 text-xs text-[color:var(--cm-text-muted)]">
                          Creado: {new Date(incidente.created_at).toLocaleString()}
                        </p>
                        <Link
                          to={`/editIncident/${incidente.id}`}
                          style={{ color: "white", textDecoration: "none" }}
                          className="mt-3 inline-flex rounded-lg bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-semibold transition hover:brightness-110"
                        >
                          Ver incidente
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {mappedAlerts.map((alert) => (
                <Marker
                  key={`alert-${alert.id}`}
                  position={alert.parsedLocation as [number, number]}
                  icon={markerIcon("#F97316")}
                >
                  <Popup>
                    <div className="min-w-[210px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Alerta</p>
                      <p className="mt-1 font-semibold">{alert.title || "Alerta operativa"}</p>
                      <button>
                        <Link
                          to={`/editAlert/${alert.id}`}
                          style={{ color: "white", textDecoration: "none" }}
                          className="mt-3 inline-flex rounded-lg bg-[color:var(--cm-alert)] px-3 py-1.5 text-xs font-semibold transition hover:brightness-110"
                        >
                          Ver alerta
                        </Link>
                      </button>
                      <br></br>
                      <span className={`${alertStatusBadge(alert.status)} mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                        {alertStatusLabel(alert.status)}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
              </div>
            </section>

            <aside className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Actividad reciente</p>
                    <h2 className="mt-1 text-lg font-bold">Incidentes destacados</h2>
                    <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">Los incidentes destacados son el resumen de los eventos visibles y prioritarios del mapa.</p>
                  </div>
                <Link to="/incidents" className="rounded-lg bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                  Ver todo
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {latestIncidents.length === 0 ? (
                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                    No hay incidentes disponibles para mostrar en el resumen.
                  </div>
                ) : (
                  latestIncidents.map((incident) => {
                    const statusClass = incident.status === "OPEN"
                      ? "cm-badge-danger"
                      : incident.status === "TRIAGE"
                      ? "cm-badge-warning"
                      : "cm-badge-success";

                    return (
                      <article key={incident.id} className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 transition hover:border-[color:var(--cm-info)]/50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-[color:var(--cm-text)]">{incident.name}</h3>
                            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{incident.location_address || "Sin dirección registrada"}</p>
                          </div>
                        <span className={`${statusClass} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>{incidentStatusLabel(incident.status)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--cm-text-muted)]">
                          <span>{incident.incident_type}</span>
                          <span>{new Date(incident.created_at).toLocaleString()}</span>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="mt-5 border-t border-[color:var(--cm-border)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Pulso operativo</p>
                    <h3 className="mt-1 text-base font-bold">Alertas recientes</h3>
                    <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">Flujo inmediato de avisos y estado de respuesta del despliegue.</p>
                  </div>
                  <Link to="/alerts" className="rounded-lg bg-[color:var(--cm-alert)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                    Ver alertas
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {latestAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                      No hay alertas recientes para mostrar.
                    </div>
                  ) : (
                    latestAlerts.map((alert) => (
                      <article key={alert.id} className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3 transition hover:border-[color:var(--cm-alert)]/50">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{alert.title || `Alerta ${alert.id}`}</p>
                            <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">{alert.created_at ? new Date(alert.created_at).toLocaleString() : "Fecha desconocida"}</p>
                          </div>
                          <span className={`${alertStatusBadge(alert.status)} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                            {alertStatusLabel(alert.status)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
