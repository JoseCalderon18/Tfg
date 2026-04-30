import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  Polyline,
} from "react-leaflet";
import { Circle, Polygon } from "react-leaflet";
import { apiFetch } from "../utils/api";
import { STATUS_COLOR, getAlertStatusBadge, getIncidentMarkerColor, getIncidentStatusBadge } from "../utils/statusColors";
import "leaflet/dist/leaflet.css";

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

type IncidentMemberRow = {
  id: string;
  user?: string | null;
  user_id?: string | null;
  incident?: string | null;
  role_in_incident?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  is_active?: boolean | null;
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

type JourneyApi = {
  id: number;
  created_at?: string | null;
  user_id? : string | null;
  user?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  account_user_id?: string | null;
  location_start?: unknown;
  location_stop?: unknown;
  notes?: unknown;
}

type JourneyRow = JourneyApi &{
  startCoords: LatLngTuple | null;
  stopCoords: LatLngTuple | null;
  notesText: string;
}

type TrackPointApi = {
  id: string;
  user: string;
  incident: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  accuracy_m: number | null;
  altitude: number | null;
  speed: number | null;
  recorded_at: string;
  created_at: string;
};

type TrackPointRow = {
  id: string;
  user: string;
  incident: string;
  coords: LatLngTuple;
  accuracyM: number | null;
  altitude: number | null;
  speed: number | null;
  recordedAt: string;
  createdAt: string;
};

type UserRow = {
  id: string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean;
  created_at?: string | null;
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

function normalizeJourneyNotes(notes: unknown): string {
  if (!notes) return "Sin notas adicionales.";
  if (typeof notes === "string") return notes.trim() || "Sin notas adicionales.";
  if (Array.isArray(notes)) return notes.map((n) => String(n).trim()).filter(Boolean).join("\n") || "Sin notas adicionales.";
  if (typeof notes === "object") return JSON.stringify(notes, null, 2);
  return String(notes).trim() || "Sin notas adicionales.";
}

function normalizeJourneys(payload: unknown): JourneyRow[] {
  const source = Array.isArray(payload)
    ? payload
    : (payload as { results?: JourneyApi[] } | null)?.results ?? [];

  return source
    .map((journey) => journey as JourneyApi)
    .filter((journey) => typeof journey.id === "number")
    .map((journey) => ({
      ...journey,
      startCoords: parsePoint(journey.location_start),
      stopCoords: parsePoint(journey.location_stop),
      notesText: normalizeJourneyNotes(journey.notes),
    }));
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

function normalizeTrackPoints(raw: unknown): TrackPointRow[] {
  const source = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? [];

  return source
    .map((item) => item as TrackPointApi)
    .filter((row) => typeof row?.id === "string" && row.location?.coordinates)
    .map((row) => ({
      id: row.id,
      user: row.user,
      incident: row.incident,
      coords: [row.location.coordinates[1], row.location.coordinates[0]] as LatLngTuple, // [lat, lng]
      accuracyM: row.accuracy_m,
      altitude: row.altitude,
      speed: row.speed,
      recordedAt: row.recorded_at,
      createdAt: row.created_at,
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
  return getIncidentStatusBadge(status);
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
  return getIncidentMarkerColor(status);
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

function poiTypeLabel(poiType?: string | null) {
  switch (poiType) {
    case "HYDRANT":
      return "Hidrante";
    case "SETTLEMENT":
      return "Asentamiento";
    case "FIREBREAK":
      return "Cortafuegos";
    case "WATCHPOINT":
      return "Punto de vigilancia";
    case "BASE_STATION":
      return "Estacion base";
    case "EVAC_ROUTE":
      return "Via de evacuacion";
    case "COMMUNICATION_TOWER":
      return "Torre de comunicaciones";
    case "CHECKPOINT":
      return "Punto de control";
    case "OBSTACLE":
      return "Obstaculo";
    case "BRIDGE":
      return "Puente";
    case "SUPPLY_POINT":
      return "Punto de suministro";
    case "HELIPAD":
      return "Helipuerto";
    default:
      return "Punto de interes";
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

function journeyStartIcon() {
  return L.divIcon({
    className: "cm-map-pin",
    html: `
      <div style="width: 34px; height: 34px; border-radius: 9999px; background: #16a34a; border: 3px solid #bbf7d0; display:flex; align-items:center; justify-content:center; color: white; font-size: 10px; font-weight: 700;">
        INI
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function journeyStopIcon() {
  return L.divIcon({
    className: "cm-map-pin",
    html: `
      <div style="width: 34px; height: 34px; border-radius: 9999px; background: #dc2626; border: 3px solid #fecaca; display:flex; align-items:center; justify-content:center; color: white; font-size: 10px; font-weight: 700;">
        FIN
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

const userColors = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F8C471", "#82E0AA", "#F1948A", "#85C1E9", "#D7BDE2"
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
}

function alertStatusBadge(status?: string | null) {
  return getAlertStatusBadge(status);
}

function alertStatusLabel(status?: string | null) {
  if (status === "OPEN") return "Abierta";
  if (status === "ACK") return "Reconocida";
  if (status === "CLOSED") return "Cerrada";
  return "En revisión";
}

function userRoleLabel(role?: string | null) {
  if (role === "OPERATIVE") return "Operativo";
  if (role === "COMMAND") return "Mando";
  if (role === "ADMIN") return "Administrador";
  return role || "Sin rol";
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
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [incidentMembers, setIncidentMembers] = useState<IncidentMemberRow[]>([]);
  const [incidentPage, setIncidentPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [resourcePage, setResourcePage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);
  const [incidentsExpanded, setIncidentsExpanded] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [recursosExpandidos, setRecursosExpandidos] = useState(false);
  const [unitsExpanded, setUnitsExpanded] = useState(false);
  const [trackPoints, setTrackPoints] = useState<TrackPointRow[]>([]);
  const [showAllTracks, setShowAllTracks] = useState(true);
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

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  const relatedUserIds = useMemo(
    () =>
      incidentMembers
        .filter((member) => member.is_active !== false && member.user_id)
        .map((member) => member.user_id as string),
    [incidentMembers]
  );

  const visibleIncidents = useMemo(
    () => (selectedIncidentId ? incidentsFiltered.filter((incident) => incident.id === selectedIncidentId) : incidentsFiltered),
    [incidentsFiltered, selectedIncidentId]
  );

  const visibleAlerts = useMemo(
    () => (selectedIncidentId ? alerts.filter((alert) => alert.incident === selectedIncidentId) : alerts),
    [alerts, selectedIncidentId]
  );

  const visiblePointsOfInterest = useMemo(
    () =>
      (selectedIncidentId
        ? pointsOfInterest.filter((point) => point.incidentId === selectedIncidentId)
        : pointsOfInterest),
    [pointsOfInterest, selectedIncidentId]
  );

  const visibleWorkAreas = useMemo(
    () =>
      (selectedIncidentId
        ? workAreas.filter((area) => area.incidentId === selectedIncidentId)
        : workAreas),
    [workAreas, selectedIncidentId]
  );

  const visibleJourneys = useMemo(() => {
    if (!selectedIncidentId) return journeys;
    if (relatedUserIds.length === 0) return [];
    return journeys.filter((journey) =>
      Boolean(journey.account_user_id && relatedUserIds.includes(journey.account_user_id))
    );
  }, [journeys, relatedUserIds, selectedIncidentId]);

  const visibleTrackPoints = useMemo(
    () => {
      if (showAllTracks) return trackPoints;
      if (selectedIncidentId) return trackPoints.filter((point) => point.incident === selectedIncidentId);
      return trackPoints;
    },
    [trackPoints, selectedIncidentId, showAllTracks]
  );

  const visibleUnits = useMemo(() => {
    const operatives = units.filter((unit) => unit.role === "OPERATIVE");
    if (!selectedIncidentId) return operatives;
    if (relatedUserIds.length === 0) return [];
    return operatives.filter((unit) => relatedUserIds.includes(unit.id));
  }, [units, selectedIncidentId, relatedUserIds]);

  const trackPointsByUser = useMemo(() => {
    const grouped: Record<string, TrackPointRow[]> = {};
    visibleTrackPoints.forEach((point) => {
      if (!grouped[point.user]) {
        grouped[point.user] = [];
      }
      grouped[point.user].push(point);
    });
    // Sort each user's points by recorded_at
    Object.keys(grouped).forEach((user) => {
      grouped[user].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    });
    return grouped;
  }, [visibleTrackPoints]);

  const positionedFilteredIncidents = useMemo(
    () =>
      visibleIncidents
        .filter((incidente) => incidente.location && incidente.location.coordinates)
        .map((incidente) => ({
          incidente,
          latLng: [incidente.location!.coordinates[1], incidente.location!.coordinates[0]] as [number, number],
        })),
    [visibleIncidents]
  );

  const filteredPositions = useMemo(
    () => positionedFilteredIncidents.map((item) => item.latLng),
    [positionedFilteredIncidents]
  );

  const journeyStartPositions = useMemo(
        () => visibleJourneys.filter((journey) => journey.startCoords).map((journey) => journey.startCoords as LatLngTuple),
        [visibleJourneys]
      );

      const journeyStopPositions = useMemo(
        () => visibleJourneys.filter((journey) => journey.stopCoords).map((journey) => journey.stopCoords as LatLngTuple),
        [visibleJourneys]
      );

  const workAreaPositions = useMemo(
    () =>
      visibleWorkAreas.flatMap((area) => {
        if (!area.active) return [];
        if (area.areaType === "CIRCLE" && area.center) return [area.center];
        if (area.areaType === "POLYGON" && area.polygon) return area.polygon;
        return [];
      }),
    [visibleWorkAreas]
  );
  const mapBoundsPositions = useMemo(
  () => [
    ...filteredPositions,
    ...workAreaPositions,
    ...visiblePointsOfInterest
      .filter((point) => point.isActive && point.coords)
      .map((point) => point.coords as LatLngTuple),
    ...journeyStartPositions,
    ...journeyStopPositions,
    ...visibleTrackPoints.map((point) => point.coords),
  ],
  [filteredPositions, workAreaPositions, visiblePointsOfInterest, journeyStartPositions, journeyStopPositions, visibleTrackPoints]
);


  const kpis = useMemo(() => {
    const abiertas = incidents.filter((incidente) => incidente.status === "OPEN").length;
    const evaluacion = incidents.filter((incidente) => incidente.status === "TRIAGE").length;
    const cerradas = incidents.filter((incidente) => incidente.status === "CLOSED").length;
    const criticas = alerts.filter((alert) => (alert.status ?? "OPEN") !== "CLOSED" && (alert.severity ?? 5) <= 2).length;
    const operativos = units.filter((unit) => unit.is_active && unit.role === "OPERATIVE").length;

    return { abiertas, evaluacion, cerradas, criticas, operativos };
  }, [incidents, alerts, units]);

  const totalIncidentPages = useMemo(
    () => Math.max(1, Math.ceil(incidentsFiltered.length / 5)),
    [incidentsFiltered]
  );
  const paginatedIncidents = useMemo(() => {
    const start = (incidentPage - 1) * 5;
    return incidentsFiltered.slice(start, start + 5);
  }, [incidentsFiltered, incidentPage]);
  const totalAlertPages = useMemo(
    () => Math.max(1, Math.ceil(visibleAlerts.length / 5)),
    [visibleAlerts]
  );
  const paginatedAlerts = useMemo(() => {
    const start = (alertPage - 1) * 5;
    return visibleAlerts.slice(start, start + 5);
  }, [visibleAlerts, alertPage]);
  const totalResourcePages = useMemo(
    () => Math.max(1, Math.ceil(visiblePointsOfInterest.length / 5)),
    [visiblePointsOfInterest]
  );
  const paginatedResources = useMemo(() => {
    const start = (resourcePage - 1) * 5;
    return visiblePointsOfInterest.slice(start, start + 5);
  }, [visiblePointsOfInterest, resourcePage]);
  const totalUnitPages = useMemo(
    () => Math.max(1, Math.ceil(visibleUnits.length / 5)),
    [visibleUnits]
  );
  const paginatedUnits = useMemo(() => {
    const start = (unitPage - 1) * 5;
    return visibleUnits.slice(start, start + 5);
  }, [visibleUnits, unitPage]);
  const mappedAlerts = useMemo(
    () => visibleAlerts.map((alert) => ({ ...alert, parsedLocation: parsePointLocation(alert.location) })).filter((alert) => alert.parsedLocation),
    [visibleAlerts]
  );

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

      const [incidentsRes, alertsRes, unitsRes, workAreasRes, pointsOfInterestRes, journeysRes] = await Promise.all([
        apiFetch("/incidents/"),
        apiFetch("/alerts/"),
        apiFetch("/auth/panel/users/"),
        apiFetch("/workareas/"),
        apiFetch("/points-of-interest/"),
        apiFetch("/journeys/"),
      ]);

      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        const incidentItems: Incident[] = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.results || [];
        setIncidents(incidentItems);

        // Load track points for all incidents
        const allTrackPoints: TrackPointRow[] = [];
        for (const incident of incidentItems) {
          try {
            const trackRes = await apiFetch(`/tracking/incident/${incident.id}/`);
            if (trackRes.ok) {
              const trackData = await trackRes.json();
              allTrackPoints.push(...normalizeTrackPoints(trackData));
            }
          } catch (error) {
            console.error(`Error loading tracks for incident ${incident.id}:`, error);
          }
        }
        setTrackPoints(allTrackPoints);
      }

      if(journeysRes.ok){
        const journeysData = await journeysRes.json();
        setJourneys(normalizeJourneys(journeysData));
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

  useEffect(() => {
    if (incidentPage > totalIncidentPages) {
      setIncidentPage(totalIncidentPages);
    }
  }, [incidentPage, totalIncidentPages]);

  useEffect(() => {
    if (alertPage > totalAlertPages) {
      setAlertPage(totalAlertPages);
    }
  }, [alertPage, totalAlertPages]);

  useEffect(() => {
    if (resourcePage > totalResourcePages) {
      setResourcePage(totalResourcePages);
    }
  }, [resourcePage, totalResourcePages]);

  useEffect(() => {
    if (unitPage > totalUnitPages) {
      setUnitPage(totalUnitPages);
    }
  }, [unitPage, totalUnitPages]);

  useEffect(() => {
    if (!selectedIncidentId) {
      setIncidentMembers([]);
      return;
    }

    (async () => {
      const response = await apiFetch(`/incidents/${selectedIncidentId}/members/`);

      if (response.ok) {
        const data = await response.json();
        const items: IncidentMemberRow[] = Array.isArray(data) ? data : data.results || [];
        setIncidentMembers(items);
      } else {
        setIncidentMembers([]);
      }
    })();
  }, [selectedIncidentId]);

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
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-success)]">{kpis.abiertas}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">En evaluación</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-warning)]">{kpis.evaluacion}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Cerrados</p>
              <p className="mt-2 text-3xl font-bold" style={{ color: STATUS_COLOR.cerrado }}>{kpis.cerradas}</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Alertas críticas</p>
              <p className="mt-2 text-3xl font-bold text-[color:var(--cm-danger)]">{kpis.criticas}</p>
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
                    <button type="button" onClick={() => setStatusFilter("OPEN")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "OPEN" ? "cm-badge-success" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Abiertas
                    </button>
                    <button type="button" onClick={() => setStatusFilter("TRIAGE")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "TRIAGE" ? "cm-badge-warning" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Revisión
                    </button>
                    <button type="button" onClick={() => setStatusFilter("CLOSED")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusFilter === "CLOSED" ? "cm-badge-neutral" : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"}`}>
                      Cerradas
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-[calc(100%-74px)] w-full rounded-2xl overflow-hidden border border-[color:var(--cm-border)] relative">
            <div className="absolute right-3 top-3 z-[500] rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-bg)]/85 p-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Leyenda</p>
              <div className="mt-2 flex flex-col gap-2 text-xs text-[color:var(--cm-text)]">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-success)]" /> Incidente abierto</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-warning)]" /> Incidente en revisión</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLOR.cerrado }} /> Incidente cerrado</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-alert)]" /> Alerta operativa</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[color:var(--cm-danger)]" /> Nivel crítico</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-cyan-400" /> Area de trabajo</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-teal-600" /> Punto de interes</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" /> Inicio de jornada</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /> Fin de jornada</div>
                <div className="flex items-center gap-2"><span className="h-2 w-4 border-2 border-purple-400 bg-purple-400/20" /> Rutas de usuarios</div>
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
              {visibleWorkAreas.map((area) => {
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
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Area de trabajo</p>
                          <h3 className="mt-1 font-bold text-base">{area.name}</h3>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-semibold text-cyan-200">
                              Poli­gono
                            </span>
                            {area.incidentName ? (
                              <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                                {area.incidentName}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">Zona activa de operacion</p>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                }

                return null;
              })}
              {visiblePointsOfInterest.map((point) =>
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
              {visibleJourneys.map((journey) =>
                journey.startCoords ? (
                  <Marker
                    key={`journey-start-${journey.id}`}
                    position={journey.startCoords}
                    icon={journeyStartIcon()}
                  >
                    <Popup>
                      <div className="min-w-[220px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Inicio de jornada</p>
                        <h3 className="mt-1 font-bold text-base">Jornada #{journey.id}</h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full bg-green-500/15 px-2.5 py-1 font-semibold text-green-200">
                            INI
                          </span>
                          {journey.user ? (
                            <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                              {journey.user}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
                          Inicio: {journey.start_date ? new Date(journey.start_date).toLocaleString() : "Sin fecha"}
                        </p>
                        {journey.notesText ? (
                          <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">{journey.notesText}</p>
                        ) : null}
                        <Link
                          to="/journeys"
                          style={{ color: "white", textDecoration: "none" }}
                          className="mt-3 inline-flex rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold transition hover:brightness-110"
                        >
                          Ver jornadas
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
              {visibleJourneys.map((journey) =>
                journey.stopCoords ? (
                  <Marker
                    key={`journey-stop-${journey.id}`}
                    position={journey.stopCoords}
                    icon={journeyStopIcon()}
                  >
                    <Popup>
                      <div className="min-w-[220px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Fin de jornada</p>
                        <h3 className="mt-1 font-bold text-base">Jornada #{journey.id}</h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-200">
                            FIN
                          </span>
                          {journey.user ? (
                            <span className="rounded-full border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-2.5 py-1 text-[color:var(--cm-text-muted)]">
                              {journey.user}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
                          Fin: {journey.end_date ? new Date(journey.end_date).toLocaleString() : "Sin fecha"}
                        </p>
                        {journey.notesText ? (
                          <p className="mt-2 text-sm text-[color:var(--cm-text-muted)]">{journey.notesText}</p>
                        ) : null}
                        <Link
                          to="/journeys"
                          style={{ color: "white", textDecoration: "none" }}
                          className="mt-3 inline-flex rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold transition hover:brightness-110"
                        >
                          Ver jornadas
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
              {Object.entries(trackPointsByUser).map(([userId, userPoints]) => {
                const color = getUserColor(userId);
                const positions = userPoints.map((point) => point.coords);
                return (
                  <Polyline
                    key={`track-${userId}`}
                    positions={positions}
                    pathOptions={{ color, weight: 3, opacity: 0.8 }}
                  />
                );
              })}
              {visibleTrackPoints.map((point) => (
                <Marker
                  key={`track-point-${point.id}`}
                  position={point.coords}
                  icon={L.divIcon({
                    className: "cm-track-point",
                    html: `
                      <div style="width: 8px; height: 8px; border-radius: 50%; background: ${getUserColor(point.user)}; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);">
                      </div>
                    `,
                    iconSize: [8, 8],
                    iconAnchor: [4, 4],
                  })}
                >
                  <Popup>
                    <div className="min-w-[200px] rounded-2xl bg-[color:var(--cm-bg)] p-3 text-[color:var(--cm-text)]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Punto de rastreo</p>
                      <h3 className="mt-1 font-bold text-base">{point.user}</h3>
                      <div className="mt-3 text-xs text-[color:var(--cm-text-muted)]">
                        <p>Registrado: {new Date(point.recordedAt).toLocaleString()}</p>
                        {point.accuracyM && <p>Precisión: {point.accuracyM.toFixed(1)} m</p>}
                        {point.altitude && <p>Altitud: {point.altitude.toFixed(1)} m</p>}
                        {point.speed !== null && <p>Velocidad: {point.speed.toFixed(1)} m/s</p>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
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
                <button
                  type="button"
                  onClick={() => setIncidentsExpanded((current) => !current)}
                  aria-expanded={incidentsExpanded}
                  className="flex flex-1 items-start justify-between gap-3 rounded-xl text-left transition hover:text-[color:var(--cm-info)]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Actividad reciente</p>
                    <h2 className="mt-1 text-lg font-bold">Incidentes destacados</h2>
                    <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">Lista completa paginada. Al seleccionar un incidente, el mapa muestra solo sus elementos relacionados.</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-sm text-[color:var(--cm-text-muted)] transition-transform ${
                      incidentsExpanded ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {selectedIncident ? (
                    <button
                      type="button"
                      onClick={() => setSelectedIncidentId(null)}
                      className="rounded-lg border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3 py-1.5 text-xs font-semibold transition hover:border-[color:var(--cm-info)]/50"
                    >
                      Mostrar todo
                    </button>
                  ) : null}
                  <Link to="/incidents" className="rounded-lg bg-[color:var(--cm-info)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                    Ver incidentes
                  </Link>
                </div>
              </div>

              {incidentsExpanded ? (
                <>
              <div className="mt-4 space-y-3">
                {paginatedIncidents.length === 0 ? (
                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                    No hay incidentes disponibles para mostrar en el resumen.
                  </div>
                ) : (
                  paginatedIncidents.map((incident) => {
                    const statusClass = getIncidentStatusBadge(incident.status);

                    return (
                      <button
                        key={incident.id}
                        type="button"
                        onClick={() => setSelectedIncidentId((current) => (current === incident.id ? null : incident.id))}
                        className={`w-full rounded-2xl border bg-[color:var(--cm-surface-2)] p-4 text-left transition ${
                          selectedIncidentId === incident.id
                            ? "border-[color:var(--cm-info)] ring-1 ring-[color:var(--cm-info)]/40"
                            : "border-[color:var(--cm-border)] hover:border-[color:var(--cm-info)]/50"
                        }`}
                      >
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
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-4 text-xs text-[color:var(--cm-text-muted)]">
                <button
                  type="button"
                  onClick={() => setIncidentPage((page) => Math.max(1, page - 1))}
                  disabled={incidentPage === 1}
                  className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                  <span>Página {incidentPage} de {totalIncidentPages}</span>
                <button
                  type="button"
                  onClick={() => setIncidentPage((page) => Math.min(totalIncidentPages, page + 1))}
                  disabled={incidentPage === totalIncidentPages}
                  className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
                </>
              ) : null}

              <div className="mt-5 border-t border-[color:var(--cm-border)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAlertsExpanded((current) => !current)}
                    aria-expanded={alertsExpanded}
                    className="flex flex-1 items-start justify-between gap-3 rounded-xl text-left transition hover:text-[color:var(--cm-alert)]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Pulso operativo</p>
                      <h3 className="mt-1 text-base font-bold">Alertas recientes</h3>
                      <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">Flujo inmediato de avisos y estado de respuesta del despliegue.</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-sm text-[color:var(--cm-text-muted)] transition-transform ${
                        alertsExpanded ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                  <Link to="/alerts" className="rounded-lg bg-[color:var(--cm-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                    Ver alertas
                  </Link>
                </div>
                {alertsExpanded ? (
                  <>
                    <div className="mt-3 space-y-2">
                      {paginatedAlerts.length === 0 ? (
                        <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                          No hay alertas recientes para mostrar.
                        </div>
                      ) : (
                        paginatedAlerts.map((alert) => (
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

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-4 text-xs text-[color:var(--cm-text-muted)]">
                      <button
                        type="button"
                        onClick={() => setAlertPage((page) => Math.max(1, page - 1))}
                        disabled={alertPage === 1}
                        className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>
                  <span>Página {alertPage} de {totalAlertPages}</span>
                      <button
                        type="button"
                        onClick={() => setAlertPage((page) => Math.min(totalAlertPages, page + 1))}
                        disabled={alertPage === totalAlertPages}
                        className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </>
                ) : null}
                <div className="mt-5 border-t border-[color:var(--cm-border)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setRecursosExpandidos((current) => !current)}
                    aria-expanded={recursosExpandidos}
                    className="flex flex-1 items-start justify-between gap-3 rounded-xl text-left transition hover:text-[color:var(--cm-alert)]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">INFORMACIÓN OPERATIVA</p>
                      <h3 className="mt-1 text-base font-bold">Recursos operativos</h3>
                      <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">Recursos operativos en la zona, puntos de interes y avisos.</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-sm text-[color:var(--cm-text-muted)] transition-transform ${
                        recursosExpandidos ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                  <Link to="/points" className="rounded-lg bg-[color:var(--cm-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                    Ver recursos
                  </Link>
                </div>
                {recursosExpandidos ? (
                  <>
                    <div className="mt-3 space-y-2">
                      {paginatedResources.length === 0 ? (
                        <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                          No hay puntos de interes para mostrar.
                        </div>
                      ) : (
                        paginatedResources.map((point) => (
                          <article key={point.id} className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3 transition hover:border-[color:var(--cm-info)]/50">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{point.name}</p>
                                <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                                  {poiTypeLabel(point.poiType)}
                                  {point.incidentName ? ` · ${point.incidentName}` : ""}
                                </p>
                                <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                                  {point.createdAt ? new Date(point.createdAt).toLocaleString() : "Fecha desconocida"}
                                </p>
                              </div>
                              <span className={`${point.isActive ? "cm-badge-success" : "cm-badge-warning"} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                                {point.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-[color:var(--cm-text-muted)]">
                              {point.description}
                            </p>
                          </article>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-4 text-xs text-[color:var(--cm-text-muted)]">
                      <button
                        type="button"
                        onClick={() => setResourcePage((page) => Math.max(1, page - 1))}
                        disabled={resourcePage === 1}
                        className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>
                  <span>Página {resourcePage} de {totalResourcePages}</span>
                      <button
                        type="button"
                        onClick={() => setResourcePage((page) => Math.min(totalResourcePages, page + 1))}
                        disabled={resourcePage === totalResourcePages}
                        className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>

                    <div className="hidden mt-5 border-t border-[color:var(--cm-border)] pt-5">
                      <div className="mb-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Unidades</p>
                        <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                          {selectedIncidentId
                            ? "Operativos asociados al incidente seleccionado."
                            : "Operativos disponibles en el sistema."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {paginatedUnits.length === 0 ? (
                          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                            No hay unidades para mostrar.
                          </div>
                        ) : (
                          paginatedUnits.map((unit) => (
                            <article key={unit.id} className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3 transition hover:border-[color:var(--cm-primary)]/50">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">{unit.username || unit.email || `Unidad ${unit.id}`}</p>
                                  <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                                    {userRoleLabel(unit.role)}
                                    {unit.email ? ` · ${unit.email}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                                    {unit.created_at ? new Date(unit.created_at).toLocaleString() : "Fecha desconocida"}
                                  </p>
                                </div>
                                <span className={`${unit.is_active ? "cm-badge-success" : "cm-badge-warning"} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                                  {unit.is_active ? "Activa" : "Inactiva"}
                                </span>
                              </div>
                            </article>
                          ))
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-4 text-xs text-[color:var(--cm-text-muted)]">
                        <button
                          type="button"
                          onClick={() => setUnitPage((page) => Math.max(1, page - 1))}
                          disabled={unitPage === 1}
                          className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Anterior
                        </button>
                  <span>Página {unitPage} de {totalUnitPages}</span>
                        <button
                          type="button"
                          onClick={() => setUnitPage((page) => Math.min(totalUnitPages, page + 1))}
                          disabled={unitPage === totalUnitPages}
                          className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
                </div>

                <div className="mt-5 border-t border-[color:var(--cm-border)] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setUnitsExpanded((current) => !current)}
                      aria-expanded={unitsExpanded}
                      className="flex flex-1 items-start justify-between gap-3 rounded-xl text-left transition hover:text-[color:var(--cm-primary)]"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">UNIDADES</p>
                        <h3 className="mt-1 text-base font-bold">Unidades operativas</h3>
                        <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                          {selectedIncidentId
                            ? "Operativos asociados al incidente seleccionado."
                            : "Operativos disponibles en el sistema."}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-sm text-[color:var(--cm-text-muted)] transition-transform ${
                          unitsExpanded ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    <Link to="/viewunidades" className="rounded-lg bg-[color:var(--cm-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">
                      Ver unidades
                    </Link>
                  </div>

                  {unitsExpanded ? (
                    <>
                      <div className="mt-3 space-y-2">
                        {paginatedUnits.length === 0 ? (
                          <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                            No hay unidades para mostrar.
                          </div>
                        ) : (
                          paginatedUnits.map((unit) => (
                            <article key={unit.id} className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3 transition hover:border-[color:var(--cm-primary)]/50">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">{unit.username || unit.email || `Unidad ${unit.id}`}</p>
                                  <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                                    {userRoleLabel(unit.role)}
                                    {unit.email ? ` · ${unit.email}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">
                                    {unit.created_at ? new Date(unit.created_at).toLocaleString() : "Fecha desconocida"}
                                  </p>
                                </div>
                                <span className={`${unit.is_active ? "cm-badge-success" : "cm-badge-warning"} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                                  {unit.is_active ? "Activa" : "Inactiva"}
                                </span>
                              </div>
                            </article>
                          ))
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-4 text-xs text-[color:var(--cm-text-muted)]">
                        <button
                          type="button"
                          onClick={() => setUnitPage((page) => Math.max(1, page - 1))}
                          disabled={unitPage === 1}
                          className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Anterior
                        </button>
                  <span>Página {unitPage} de {totalUnitPages}</span>
                        <button
                          type="button"
                          onClick={() => setUnitPage((page) => Math.min(totalUnitPages, page + 1))}
                          disabled={unitPage === totalUnitPages}
                          className="rounded-lg border border-[color:var(--cm-border)] px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Siguiente
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
