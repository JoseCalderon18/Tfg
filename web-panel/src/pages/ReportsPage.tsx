import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LatLngTuple } from "leaflet";

import { apiFetch } from "../utils/api";

type PanelMeResponse = {
  authenticated: boolean;
  has_panel_full_access?: boolean;
};

type IncidentRow = {
  id: string;
  name: string;
  incidentType: string;
  status: string;
  description: string | null;
  location: unknown;
  coords: LatLngTuple | null;
  locationAddress: string | null;
  createdBy: string | null;
  ownerOrganization: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isActive: boolean;
};

type AlertRow = {
  id: string;
  incidentId: string | null;
  alertType: string;
  severity: number;
  status: string;
  title: string;
  description: string | null;
  coords: LatLngTuple | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProfileRow = {
  id: string;
  profileId: string | null;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  organizationName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string | null;
};

type JourneyRow = {
  id: number;
  user: string | null;
  userId: string | null;
  accountUserId: string | null;
  startDate: string | null;
  endDate: string | null;
  startCoords: LatLngTuple | null;
  stopCoords: LatLngTuple | null;
  notesText: string;
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

type IncidentMemberRow = {
  userId: string | null;
  user: string | null;
  role: string | null;
  isActive: boolean;
};

type ReportData = {
  incidents: IncidentRow[];
  alerts: AlertRow[];
  profiles: ProfileRow[];
  journeys: JourneyRow[];
  pointsOfInterest: PointOfInterestRow[];
  workAreas: WorkAreaRow[];
  membersByIncidentId: Record<string, IncidentMemberRow[]>;
};

type ExportKind = "incidents" | "alerts" | "profiles" | "journeys" | "points" | "workareas";

type ReportFilter = {
  query: string;
  status: string;
  type: string;
  onlyWithLocation: boolean;
};

type MapMarker = {
  coords: LatLngTuple;
  label?: string;
  color?: string;
};

type MapCircle = {
  center: LatLngTuple;
  radiusM: number;
};

type MapImageOptions = {
  title: string;
  markers?: MapMarker[];
  polyline?: LatLngTuple[];
  polygon?: LatLngTuple[];
  circle?: MapCircle | null;
};

const TILE_SIZE = 256;
const MAP_ZOOM = 13;
const MAP_WIDTH = 900;
const MAP_HEIGHT = 450;

const EMPTY_FILTER: ReportFilter = {
  query: "",
  status: "",
  type: "",
  onlyWithLocation: false,
};

const INITIAL_FILTERS: Record<ExportKind, ReportFilter> = {
  incidents: { ...EMPTY_FILTER },
  alerts: { ...EMPTY_FILTER },
  profiles: { ...EMPTY_FILTER },
  journeys: { ...EMPTY_FILTER },
  points: { ...EMPTY_FILTER },
  workareas: { ...EMPTY_FILTER },
};

function payloadRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)) {
    return ((payload as { results?: T[] }).results ?? []) as T[];
  }
  return [];
}

function payloadHasNext(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { next?: unknown }).next);
}

function appendPage(path: string, page: number) {
  return `${path}${path.includes("?") ? "&" : "?"}page=${page}`;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await apiFetch(appendPage(path, page));
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${path} (HTTP ${response.status}).`);
    }

    const payload = (await response.json()) as unknown;
    rows.push(...payloadRows<T>(payload));

    hasNext = payloadHasNext(payload);
    page += 1;

    if (!hasNext || Array.isArray(payload)) break;
  }

  return rows;
}

function textFromValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const candidate = value as {
      username?: unknown;
      name?: unknown;
      email?: unknown;
      id?: unknown;
    };
    return (
      textFromValue(candidate.username) ??
      textFromValue(candidate.name) ??
      textFromValue(candidate.email) ??
      textFromValue(candidate.id)
    );
  }
  return null;
}

function isValidLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parsePoint(value: unknown, latitude?: number | null, longitude?: number | null): LatLngTuple | null {
  if (latitude != null && longitude != null && isValidLatLng(latitude, longitude)) {
    return [latitude, longitude];
  }

  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && isValidLatLng(lat, lng)) return [lat, lng];
  }

  if (typeof value === "object") {
    const candidate = value as { coordinates?: unknown; x?: unknown; y?: unknown; lat?: unknown; lng?: unknown; lon?: unknown };

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

    if (candidate.lat !== undefined && (candidate.lng !== undefined || candidate.lon !== undefined)) {
      const lat = Number(candidate.lat);
      const lng = Number(candidate.lng ?? candidate.lon);
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

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-ES");
}

function formatCoords(coords: LatLngTuple | null) {
  return coords ? `${coords[0]}, ${coords[1]}` : "-";
}

function matchesQuery(query: string, values: Array<string | number | boolean | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values
    .map((value) => (value == null ? "" : String(value)))
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function uniqueValues<T>(rows: T[], selector: (row: T) => string | null | undefined) {
  return Array.from(new Set(rows.map(selector).filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function normalizeNotes(notes: unknown) {
  if (typeof notes === "string") return notes.trim();
  if (!notes || typeof notes !== "object") return "";

  const candidate = notes as { text?: unknown };
  if (typeof candidate.text === "string") return candidate.text.trim();

  try {
    return JSON.stringify(notes);
  } catch {
    return "";
  }
}

function normalizeIncidents(rows: unknown[]): IncidentRow[] {
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row.id === "string")
    .map((row) => ({
      id: String(row.id),
      name: textFromValue(row.name) || "Incidente sin nombre",
      incidentType: textFromValue(row.incident_type) || "OTHER",
      status: textFromValue(row.status) || "OPEN",
      description: textFromValue(row.description),
      location: row.location ?? null,
      coords: parsePoint(row.location),
      locationAddress: textFromValue(row.location_address),
      createdBy: textFromValue(row.created_by),
      ownerOrganization: textFromValue(row.owner_organization),
      startedAt: textFromValue(row.started_at),
      endedAt: textFromValue(row.ended_at),
      createdAt: textFromValue(row.created_at),
      updatedAt: textFromValue(row.updated_at),
      isActive: Boolean(row.is_active ?? row.status === "OPEN"),
    }));
}

function normalizeAlerts(rows: unknown[]): AlertRow[] {
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row.id === "string")
    .map((row) => ({
      id: String(row.id),
      incidentId: textFromValue(row.incident),
      alertType: textFromValue(row.alert_type) || "OTHER",
      severity: typeof row.severity === "number" ? row.severity : Number(row.severity ?? 3),
      status: textFromValue(row.status) || "OPEN",
      title: textFromValue(row.title) || "Alerta sin titulo",
      description: textFromValue(row.description),
      coords: parsePoint(
        row.location,
        typeof row.lat === "number" ? row.lat : null,
        typeof row.lng === "number" ? row.lng : null
      ),
      createdBy: textFromValue(row.created_by),
      createdAt: textFromValue(row.created_at),
      updatedAt: textFromValue(row.updated_at),
    }));
}

function normalizeProfiles(rows: unknown[]): ProfileRow[] {
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row.id === "string")
    .map((row) => ({
      id: String(row.id),
      profileId: textFromValue(row.profile_id),
      username: textFromValue(row.username) || "Usuario sin nombre",
      email: textFromValue(row.email) || "-",
      firstName: textFromValue(row.first_name),
      lastName: textFromValue(row.last_name),
      role: textFromValue(row.role),
      organizationName: textFromValue(row.organization_name),
      phone: textFromValue(row.phone),
      isActive: Boolean(row.is_active),
      createdAt: textFromValue(row.created_at),
    }));
}

function normalizeJourneys(rows: unknown[]): JourneyRow[] {
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row.id === "number")
    .map((row) => ({
      id: Number(row.id),
      user: textFromValue(row.user),
      userId: textFromValue(row.user_id),
      accountUserId: textFromValue(row.account_user_id),
      startDate: textFromValue(row.start_date),
      endDate: textFromValue(row.end_date),
      startCoords: parsePoint(row.location_start),
      stopCoords: parsePoint(row.location_stop),
      notesText: normalizeNotes(row.notes),
    }));
}

function normalizePoints(rows: unknown[]): PointOfInterestRow[] {
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row.id === "string")
    .map((row) => ({
      id: String(row.id),
      name: textFromValue(row.name) || "Punto sin nombre",
      poiType: textFromValue(row.poi_type) || "OTHER",
      description: textFromValue(row.description) || "Sin descripcion adicional.",
      incidentId: textFromValue(row.incident),
      incidentName: textFromValue(row.incident_name),
      createdBy: textFromValue(row.created_by),
      createdByUsername: textFromValue(row.created_by_username),
      isActive: Boolean(row.is_active),
      createdAt: textFromValue(row.created_at),
      updatedAt: textFromValue(row.updated_at),
      coords: parsePoint(
        row.location,
        typeof row.latitude === "number" ? row.latitude : null,
        typeof row.longitude === "number" ? row.longitude : null
      ),
    }));
}

function normalizeWorkAreas(rows: unknown[]): WorkAreaRow[] {
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row.id === "number")
    .map((row) => {
      const center =
        row.center_lat != null && row.center_lng != null
          ? parsePoint(
              null,
              typeof row.center_lat === "number" ? row.center_lat : Number(row.center_lat),
              typeof row.center_lng === "number" ? row.center_lng : Number(row.center_lng)
            )
          : parsePoint(row.center);

      return {
        id: Number(row.id),
        name: textFromValue(row.name) || `Area ${row.id}`,
        areaType: textFromValue(row.area_type) === "POLYGON" ? "POLYGON" : "CIRCLE",
        center,
        radiusM: typeof row.radius_m === "number" ? row.radius_m : Number(row.radius_m ?? 0) || null,
        polygon: parsePolygon(row.polygon_coordinates ?? row.polygon),
        active: Boolean(row.active),
        createdAt: textFromValue(row.created_at),
        incidentId: textFromValue(row.incident),
        incidentName: textFromValue(row.incident_name),
      };
    });
}

function normalizeMembers(rows: unknown[]): IncidentMemberRow[] {
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      userId: textFromValue(item.user_id),
      user: textFromValue(item.user),
      role: textFromValue(item.role_in_incident),
      isActive: Boolean(item.is_active),
    };
  });
}

function incidentTypeLabel(type: string) {
  switch (type) {
    case "SEARCH":
      return "Busqueda de personas";
    case "MEDICAL":
      return "Emergencia medica";
    case "WILDFIRE":
      return "Incendio forestal";
    case "RESCUE":
      return "Rescate";
    case "NATURAL_DISASTER":
      return "Desastre natural";
    default:
      return "Otro";
  }
}

function incidentStatusLabel(status: string) {
  switch (status) {
    case "OPEN":
      return "Abierto";
    case "CLOSED":
      return "Cerrado";
    case "TRIAGE":
      return "Evaluacion";
    default:
      return status || "-";
  }
}

function alertTypeLabel(type: string) {
  const labels: Record<string, string> = {
    SOS: "SOS",
    MAN_DOWN: "Operativo caido",
    LOST: "Operativo perdido",
    GEOFENCE: "Fuera de zona",
    ANOMALY: "Anomalia",
    FIRE_SPREAD: "Cambio de fuego",
    SMOKE: "Humo",
    INJURY: "Herido",
    WEATHER: "Clima peligroso",
    OTHER: "Otra",
  };
  return labels[type] ?? type;
}

function alertStatusLabel(status: string) {
  if (status === "OPEN") return "Abierta";
  if (status === "ACK") return "Reconocida";
  if (status === "CLOSED") return "Cerrada";
  return status || "-";
}

function roleLabel(role?: string | null) {
  if (role === "ADMIN") return "Administrador";
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "OPERATIVE") return "Operativo";
  return role || "-";
}

function poiTypeLabel(type: string) {
  const labels: Record<string, string> = {
    HYDRANT: "Hidrante",
    SETTLEMENT: "Asentamiento",
    FIREBREAK: "Cortafuegos",
    WATCHPOINT: "Punto de vigilancia",
    BASE_STATION: "Estacion base",
    EVAC_ROUTE: "Via de evacuacion",
    OTHER: "Otro",
  };
  return labels[type] ?? type;
}

function getIncidentLabel(incident: IncidentRow | null | undefined) {
  if (!incident) return "Sin incidente relacionado";
  return `${incident.name} (${incidentStatusLabel(incident.status)})`;
}

function joinIncidentNames(incidents: IncidentRow[]) {
  if (incidents.length === 0) return "Sin incidentes relacionados";
  return incidents.map((incident) => incident.name).join(", ");
}

function createIncidentLookup(incidents: IncidentRow[]) {
  return incidents.reduce<Record<string, IncidentRow>>((acc, incident) => {
    acc[incident.id] = incident;
    return acc;
  }, {});
}

function pixelFromLatLng(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

async function loadTile(url: string) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("No se pudo cargar el tile.");
  return createImageBitmap(await response.blob());
}

function getMapPoints(options: MapImageOptions) {
  return [
    ...(options.markers ?? []).map((marker) => marker.coords),
    ...(options.polyline ?? []),
    ...(options.polygon ?? []),
    ...(options.circle ? [options.circle.center] : []),
  ];
}

function getMapCenter(points: LatLngTuple[]): LatLngTuple | null {
  if (points.length === 0) return null;

  const totals = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point[0],
      lng: acc.lng + point[1],
    }),
    { lat: 0, lng: 0 }
  );

  return [totals.lat / points.length, totals.lng / points.length];
}

function chooseMapZoom(points: LatLngTuple[]) {
  if (points.length <= 1) return MAP_ZOOM;

  for (let zoom = 16; zoom >= 5; zoom -= 1) {
    const pixels = points.map(([lat, lng]) => pixelFromLatLng(lat, lng, zoom));
    const xs = pixels.map((point) => point.x);
    const ys = pixels.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);

    if (width <= MAP_WIDTH - 160 && height <= MAP_HEIGHT - 120) {
      return zoom;
    }
  }

  return 5;
}

function metersToPixels(meters: number, latitude: number, zoom: number) {
  const metersPerPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  return meters / metersPerPixel;
}

async function createMapImage(options: MapImageOptions): Promise<string | null> {
  const points = getMapPoints(options);
  const mapCenter = getMapCenter(points);
  if (!mapCenter) return null;

  const canvas = document.createElement("canvas");
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const zoom = chooseMapZoom(points);
  const totalTiles = 2 ** zoom;
  const center = pixelFromLatLng(mapCenter[0], mapCenter[1], zoom);
  const originX = center.x - canvas.width / 2;
  const originY = center.y - canvas.height / 2;
  const startTileX = Math.floor(originX / TILE_SIZE);
  const endTileX = Math.floor((originX + canvas.width - 1) / TILE_SIZE);
  const startTileY = Math.floor(originY / TILE_SIZE);
  const endTileY = Math.floor((originY + canvas.height - 1) / TILE_SIZE);

  let drewTile = false;

  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    if (tileY < 0 || tileY >= totalTiles) continue;

    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      const normalizedX = ((tileX % totalTiles) + totalTiles) % totalTiles;
      const tileUrl = `https://tile.openstreetmap.org/${zoom}/${normalizedX}/${tileY}.png`;

      try {
        const tile = await loadTile(tileUrl);
        ctx.drawImage(tile, tileX * TILE_SIZE - originX, tileY * TILE_SIZE - originY, TILE_SIZE, TILE_SIZE);
        drewTile = true;
      } catch {
        // Se omite el tile fallido para que el PDF pueda generarse igualmente.
      }
    }
  }

  if (!drewTile) return null;

  const toCanvasPoint = (point: LatLngTuple) => {
    const pixel = pixelFromLatLng(point[0], point[1], zoom);
    return {
      x: pixel.x - originX,
      y: pixel.y - originY,
    };
  };

  if (options.polygon && options.polygon.length >= 3) {
    const polygonPoints = options.polygon.map(toCanvasPoint);
    ctx.fillStyle = "rgba(6, 182, 212, 0.24)";
    ctx.strokeStyle = "#0891b2";
    ctx.lineWidth = 5;
    ctx.beginPath();
    polygonPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (options.circle) {
    const centerPoint = toCanvasPoint(options.circle.center);
    const radiusPixels = Math.max(10, metersToPixels(options.circle.radiusM, options.circle.center[0], zoom));
    ctx.fillStyle = "rgba(249, 115, 22, 0.23)";
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(centerPoint.x, centerPoint.y, radiusPixels, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (options.polyline && options.polyline.length >= 2) {
    const linePoints = options.polyline.map(toCanvasPoint);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    linePoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 6;
    ctx.beginPath();
    linePoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  (options.markers ?? []).forEach((marker) => {
    const markerPoint = toCanvasPoint(marker.coords);
    ctx.fillStyle = marker.color || "#ef4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(markerPoint.x, markerPoint.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (marker.label) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.fillRect(markerPoint.x + 18, markerPoint.y - 18, Math.min(170, marker.label.length * 8 + 18), 28);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(marker.label, markerPoint.x + 27, markerPoint.y + 1);
    }
  });

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(18, 18, Math.min(320, options.title.length * 11 + 26), 32);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(options.title, 28, 40);

  return canvas.toDataURL("image/png");
}

async function createIncidentMapImage(incident: IncidentRow): Promise<string | null> {
  if (!incident.coords) return null;
  return createMapImage({
    title: "Mapa del incidente",
    markers: [{ coords: incident.coords, color: "#ef4444" }],
  });
}

function createPdf(title: string, subtitle: string) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.setFontSize(16);
  pdf.text(title, 14, 14);
  pdf.setFontSize(9);
  pdf.text(subtitle, 14, 21);
  return pdf;
}

function finalTableY(pdf: jsPDF, fallback: number) {
  return (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

function addTable(pdf: jsPDF, startY: number, head: string[], body: string[][], columnStyles?: Record<number, object>) {
  autoTable(pdf, {
    startY,
    theme: "grid",
    head: [head],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 14, right: 14 },
  });
}

function addMapToPdf(pdf: jsPDF, startY: number, title: string, image: string | null, missingMessage: string) {
  let y = startY;
  if (y + 78 > 200) {
    pdf.addPage();
    y = 16;
  }

  pdf.setFontSize(10);
  pdf.text(title, 14, y);

  if (image) {
    pdf.addImage(image, "PNG", 14, y + 4, 120, 65);
    return y + 76;
  }

  pdf.text(missingMessage, 14, y + 8);
  return y + 18;
}

function savePdf(pdf: jsPDF, prefix: string) {
  const date = new Date().toISOString().slice(0, 10);
  pdf.save(`${prefix}-${date}.pdf`);
}

function profileRelatedIncidents(profile: ProfileRow, data: ReportData) {
  const username = profile.username.toLowerCase();
  return data.incidents.filter((incident) => {
    const createdBy = (incident.createdBy || "").toLowerCase();
    const isCreator = Boolean(createdBy && createdBy === username);
    const isMember = (data.membersByIncidentId[incident.id] ?? []).some(
      (member) =>
        member.userId === profile.id ||
        member.userId === profile.profileId ||
        (member.user || "").toLowerCase() === username
    );
    return isCreator || isMember;
  });
}

function journeyRelatedIncidents(journey: JourneyRow, data: ReportData, profilesById: Record<string, ProfileRow>) {
  const profile = journey.accountUserId ? profilesById[journey.accountUserId] : undefined;
  const username = (profile?.username || journey.user || "").toLowerCase();

  return data.incidents.filter((incident) => {
    const createdBy = (incident.createdBy || "").toLowerCase();
    const isCreator = Boolean(username && createdBy === username);
    const isMember = (data.membersByIncidentId[incident.id] ?? []).some(
      (member) =>
        member.userId === journey.accountUserId ||
        member.userId === journey.userId ||
        (username && (member.user || "").toLowerCase() === username)
    );
    return isCreator || isMember;
  });
}

async function fetchIncidentMembers(incidents: IncidentRow[]) {
  const entries = await Promise.all(
    incidents.map(async (incident) => {
      try {
        const response = await apiFetch(`/incidents/${incident.id}/members/`);
        if (!response.ok) return [incident.id, [] as IncidentMemberRow[]] as const;
        const payload = (await response.json()) as unknown;
        return [incident.id, normalizeMembers(payloadRows<unknown>(payload))] as const;
      } catch {
        return [incident.id, [] as IncidentMemberRow[]] as const;
      }
    })
  );

  return entries.reduce<Record<string, IncidentMemberRow[]>>((acc, [incidentId, members]) => {
    acc[incidentId] = members;
    return acc;
  }, {});
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [filters, setFilters] = useState<Record<ExportKind, ReportFilter>>(INITIAL_FILTERS);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await apiFetch("/auth/panel/me/");
        if (!meRes.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const meData = (await meRes.json()) as PanelMeResponse;
        if (!meData.has_panel_full_access) {
          navigate("/login", { replace: true });
          return;
        }

        const [incidentRows, alertRows, profileRows, journeyRows, pointRows, workAreaRows] = await Promise.all([
          fetchAllPages<unknown>("/incidents/"),
          fetchAllPages<unknown>("/alerts/"),
          fetchAllPages<unknown>("/users/"),
          fetchAllPages<unknown>("/journeys/"),
          fetchAllPages<unknown>("/points-of-interest/"),
          fetchAllPages<unknown>("/workareas/"),
        ]);

        const incidents = normalizeIncidents(incidentRows);
        const membersByIncidentId = await fetchIncidentMembers(incidents);

        setData({
          incidents,
          alerts: normalizeAlerts(alertRows),
          profiles: normalizeProfiles(profileRows),
          journeys: normalizeJourneys(journeyRows),
          pointsOfInterest: normalizePoints(pointRows),
          workAreas: normalizeWorkAreas(workAreaRows),
          membersByIncidentId,
        });
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos de reportes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const incidentById = useMemo(() => createIncidentLookup(data?.incidents ?? []), [data?.incidents]);
  const profilesByUserId = useMemo(
    () =>
      (data?.profiles ?? []).reduce<Record<string, ProfileRow>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {}),
    [data?.profiles]
  );

  const filteredIncidents = useMemo(() => {
    const filter = filters.incidents;
    return (data?.incidents ?? []).filter(
      (incident) =>
        (!filter.status || incident.status === filter.status) &&
        (!filter.type || incident.incidentType === filter.type) &&
        (!filter.onlyWithLocation || Boolean(incident.coords)) &&
        matchesQuery(filter.query, [
          incident.name,
          incident.description,
          incident.locationAddress,
          incident.createdBy,
          incident.ownerOrganization,
          incidentStatusLabel(incident.status),
          incidentTypeLabel(incident.incidentType),
        ])
    );
  }, [data?.incidents, filters.incidents]);

  const filteredAlerts = useMemo(() => {
    const filter = filters.alerts;
    return (data?.alerts ?? []).filter(
      (alert) =>
        (!filter.status || alert.status === filter.status) &&
        (!filter.type || alert.alertType === filter.type) &&
        (!filter.onlyWithLocation || Boolean(alert.coords)) &&
        matchesQuery(filter.query, [
          alert.title,
          alert.description,
          alert.createdBy,
          alertStatusLabel(alert.status),
          alertTypeLabel(alert.alertType),
          alert.incidentId ? incidentById[alert.incidentId]?.name : null,
        ])
    );
  }, [data?.alerts, filters.alerts, incidentById]);

  const filteredProfiles = useMemo(() => {
    const filter = filters.profiles;
    return (data?.profiles ?? []).filter(
      (profile) =>
        (!filter.status || (filter.status === "ACTIVE" ? profile.isActive : !profile.isActive)) &&
        (!filter.type || profile.role === filter.type) &&
        matchesQuery(filter.query, [
          profile.username,
          profile.email,
          profile.firstName,
          profile.lastName,
          profile.organizationName,
          profile.phone,
          roleLabel(profile.role),
        ])
    );
  }, [data?.profiles, filters.profiles]);

  const filteredJourneys = useMemo(() => {
    const filter = filters.journeys;
    return (data?.journeys ?? []).filter(
      (journey) =>
        (!filter.status || (filter.status === "ACTIVE" ? !journey.endDate : Boolean(journey.endDate))) &&
        (!filter.onlyWithLocation || Boolean(journey.startCoords || journey.stopCoords)) &&
        matchesQuery(filter.query, [
          journey.id,
          journey.user,
          profilesByUserId[journey.accountUserId || ""]?.username,
          journey.notesText,
          formatDate(journey.startDate),
          formatDate(journey.endDate),
        ])
    );
  }, [data?.journeys, filters.journeys, profilesByUserId]);

  const filteredPoints = useMemo(() => {
    const filter = filters.points;
    return (data?.pointsOfInterest ?? []).filter(
      (point) =>
        (!filter.status || (filter.status === "ACTIVE" ? point.isActive : !point.isActive)) &&
        (!filter.type || point.poiType === filter.type) &&
        (!filter.onlyWithLocation || Boolean(point.coords)) &&
        matchesQuery(filter.query, [
          point.name,
          point.description,
          point.createdBy,
          point.createdByUsername,
          point.incidentName,
          poiTypeLabel(point.poiType),
        ])
    );
  }, [data?.pointsOfInterest, filters.points]);

  const filteredWorkAreas = useMemo(() => {
    const filter = filters.workareas;
    return (data?.workAreas ?? []).filter(
      (area) =>
        (!filter.status || (filter.status === "ACTIVE" ? area.active : !area.active)) &&
        (!filter.type || area.areaType === filter.type) &&
        (!filter.onlyWithLocation || Boolean(area.center || area.polygon)) &&
        matchesQuery(filter.query, [
          area.name,
          area.incidentName,
          area.areaType === "POLYGON" ? "Poligono" : "Circulo",
          area.active ? "Activa" : "Inactiva",
        ])
    );
  }, [data?.workAreas, filters.workareas]);

  const filteredCounts: Record<ExportKind, number> = {
    incidents: filteredIncidents.length,
    alerts: filteredAlerts.length,
    profiles: filteredProfiles.length,
    journeys: filteredJourneys.length,
    points: filteredPoints.length,
    workareas: filteredWorkAreas.length,
  };

  const totalCounts: Record<ExportKind, number> = {
    incidents: data?.incidents.length ?? 0,
    alerts: data?.alerts.length ?? 0,
    profiles: data?.profiles.length ?? 0,
    journeys: data?.journeys.length ?? 0,
    points: data?.pointsOfInterest.length ?? 0,
    workareas: data?.workAreas.length ?? 0,
  };

  const filterOptions = {
    incidents: {
      status: uniqueValues(data?.incidents ?? [], (incident) => incident.status).map((status) => ({
        value: status,
        label: incidentStatusLabel(status),
      })),
      type: uniqueValues(data?.incidents ?? [], (incident) => incident.incidentType).map((type) => ({
        value: type,
        label: incidentTypeLabel(type),
      })),
    },
    alerts: {
      status: uniqueValues(data?.alerts ?? [], (alert) => alert.status).map((status) => ({
        value: status,
        label: alertStatusLabel(status),
      })),
      type: uniqueValues(data?.alerts ?? [], (alert) => alert.alertType).map((type) => ({
        value: type,
        label: alertTypeLabel(type),
      })),
    },
    profiles: {
      status: [
        { value: "ACTIVE", label: "Activos" },
        { value: "INACTIVE", label: "Inactivos" },
      ],
      type: uniqueValues(data?.profiles ?? [], (profile) => profile.role).map((role) => ({
        value: role,
        label: roleLabel(role),
      })),
    },
    journeys: {
      status: [
        { value: "ACTIVE", label: "Activas" },
        { value: "CLOSED", label: "Finalizadas" },
      ],
      type: [],
    },
    points: {
      status: [
        { value: "ACTIVE", label: "Activos" },
        { value: "INACTIVE", label: "Inactivos" },
      ],
      type: uniqueValues(data?.pointsOfInterest ?? [], (point) => point.poiType).map((type) => ({
        value: type,
        label: poiTypeLabel(type),
      })),
    },
    workareas: {
      status: [
        { value: "ACTIVE", label: "Activas" },
        { value: "INACTIVE", label: "Inactivas" },
      ],
      type: [
        { value: "CIRCLE", label: "Circulo" },
        { value: "POLYGON", label: "Poligono" },
      ],
    },
  } satisfies Record<ExportKind, { status: Array<{ value: string; label: string }>; type: Array<{ value: string; label: string }> }>;

  function updateFilter(kind: ExportKind, patch: Partial<ReportFilter>) {
    setFilters((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...patch,
      },
    }));
  }

  function clearFilter(kind: ExportKind) {
    setFilters((current) => ({
      ...current,
      [kind]: { ...EMPTY_FILTER },
    }));
  }

  const reportCards = [
    {
      kind: "incidents" as const,
      title: "Incidentes",
      count: filteredCounts.incidents,
      totalCount: totalCounts.incidents,
      description: "Detalle operativo, ubicacion, mapa y alertas vinculadas.",
    },
    {
      kind: "alerts" as const,
      title: "Alertas",
      count: filteredCounts.alerts,
      totalCount: totalCounts.alerts,
      description: "Alertas con severidad, estado e incidente relacionado.",
    },
    {
      kind: "profiles" as const,
      title: "Profiles",
      count: filteredCounts.profiles,
      totalCount: totalCounts.profiles,
      description: "Usuarios/perfiles con organizacion e incidentes vinculados.",
    },
    {
      kind: "journeys" as const,
      title: "Jornadas",
      count: filteredCounts.journeys,
      totalCount: totalCounts.journeys,
      description: "Inicio, fin, unidad, notas e incidentes de la unidad.",
    },
    {
      kind: "points" as const,
      title: "Puntos de interes",
      count: filteredCounts.points,
      totalCount: totalCounts.points,
      description: "Referencias de terreno con coordenadas e incidente asociado.",
    },
    {
      kind: "workareas" as const,
      title: "Areas de trabajo",
      count: filteredCounts.workareas,
      totalCount: totalCounts.workareas,
      description: "Geocercas operativas con estado e incidente asociado.",
    },
  ];

  async function exportIncidents() {
    if (!data || filteredIncidents.length === 0) {
      setError("No hay incidentes para exportar.");
      return;
    }

    const pdf = createPdf("Reporte de incidentes", `Generado el ${formatDate(new Date().toISOString())}`);
    let y = 28;

    for (let index = 0; index < filteredIncidents.length; index += 1) {
      const incident = filteredIncidents[index];
      const relatedAlerts = data.alerts.filter((alert) => alert.incidentId === incident.id);
      const mapImage = await createIncidentMapImage(incident);

      addTable(
        pdf,
        y,
        ["Nombre", "Tipo", "Estado", "Organizacion", "Direccion", "Coordenadas", "Alertas relacionadas"],
        [[
          incident.name,
          incidentTypeLabel(incident.incidentType),
          incidentStatusLabel(incident.status),
          incident.ownerOrganization || "-",
          incident.locationAddress || "-",
          formatCoords(incident.coords),
          relatedAlerts.length ? relatedAlerts.map((alert) => alert.title).join(", ") : "Sin alertas",
        ]],
        {
          0: { cellWidth: 34 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 32 },
          4: { cellWidth: 56 },
          5: { cellWidth: 34 },
          6: { cellWidth: 76 },
        }
      );

      const tableY = finalTableY(pdf, y + 20);
      const mapY = tableY + 8;
      if (mapY + 78 > 200) {
        pdf.addPage();
        y = 16;
        index -= 1;
        continue;
      }

      pdf.setFontSize(10);
      pdf.text(`Mapa del incidente ${index + 1}`, 14, mapY);

      if (mapImage) {
        pdf.addImage(mapImage, "PNG", 14, mapY + 4, 120, 65);
        y = mapY + 76;
      } else if (!incident.coords) {
        pdf.text("Este incidente no tiene coordenadas disponibles.", 14, mapY + 8);
        y = mapY + 18;
      } else {
        pdf.text("No se pudo generar el mapa de este incidente.", 14, mapY + 8);
        y = mapY + 18;
      }

      if (y > 185 && index < filteredIncidents.length - 1) {
        pdf.addPage();
        y = 16;
      }
    }

    savePdf(pdf, "incidentes");
  }

  async function exportAlerts() {
    if (!data || filteredAlerts.length === 0) {
      setError("No hay alertas para exportar.");
      return;
    }

    const pdf = createPdf("Reporte de alertas", `Generado el ${formatDate(new Date().toISOString())}`);
    let y = 28;

    for (let index = 0; index < filteredAlerts.length; index += 1) {
      const alert = filteredAlerts[index];
      const mapImage = alert.coords
        ? await createMapImage({
            title: "Mapa de la alerta",
            markers: [{ coords: alert.coords, label: alertTypeLabel(alert.alertType), color: "#dc2626" }],
          })
        : null;

      addTable(
        pdf,
        y,
        ["Titulo", "Tipo", "Severidad", "Estado", "Creada por", "Incidente relacionado", "Coordenadas"],
        [[
          alert.title,
          alertTypeLabel(alert.alertType),
          String(alert.severity),
          alertStatusLabel(alert.status),
          alert.createdBy || "-",
          getIncidentLabel(alert.incidentId ? incidentById[alert.incidentId] : null),
          formatCoords(alert.coords),
        ]],
        {
          0: { cellWidth: 44 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 24 },
          4: { cellWidth: 36 },
          5: { cellWidth: 70 },
          6: { cellWidth: 36 },
        }
      );

      y = addMapToPdf(
        pdf,
        finalTableY(pdf, y + 20) + 8,
        `Mapa de la alerta ${index + 1}`,
        mapImage,
        "Esta alerta no tiene coordenadas disponibles."
      );

      if (y > 185 && index < filteredAlerts.length - 1) {
        pdf.addPage();
        y = 16;
      }
    }

    savePdf(pdf, "alertas");
  }

  function exportProfiles() {
    if (!data || filteredProfiles.length === 0) {
      setError("No hay profiles para exportar.");
      return;
    }

    const pdf = createPdf("Reporte de profiles", `Generado el ${formatDate(new Date().toISOString())}`);
    addTable(
      pdf,
      28,
      ["Usuario", "Email", "Nombre", "Rol", "Organizacion", "Estado", "Incidentes relacionados"],
      filteredProfiles.map((profile) => [
        profile.username,
        profile.email,
        [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "-",
        roleLabel(profile.role),
        profile.organizationName || "-",
        profile.isActive ? "Activo" : "Inactivo",
        joinIncidentNames(profileRelatedIncidents(profile, data)),
      ]),
      {
        0: { cellWidth: 34 },
        1: { cellWidth: 46 },
        2: { cellWidth: 36 },
        3: { cellWidth: 28 },
        4: { cellWidth: 38 },
        5: { cellWidth: 22 },
        6: { cellWidth: 80 },
      }
    );
    savePdf(pdf, "profiles");
  }

  async function exportJourneys() {
    if (!data || filteredJourneys.length === 0) {
      setError("No hay jornadas para exportar.");
      return;
    }

    const pdf = createPdf("Reporte de jornadas", `Generado el ${formatDate(new Date().toISOString())}`);
    let y = 28;

    for (let index = 0; index < filteredJourneys.length; index += 1) {
      const journey = filteredJourneys[index];
      const routePoints = [journey.startCoords, journey.stopCoords].filter((point): point is LatLngTuple => Boolean(point));
      const mapImage = routePoints.length
        ? await createMapImage({
            title: "Ruta de la jornada",
            polyline: routePoints.length >= 2 ? routePoints : undefined,
            markers: [
              ...(journey.startCoords ? [{ coords: journey.startCoords, label: "Inicio", color: "#16a34a" }] : []),
              ...(journey.stopCoords ? [{ coords: journey.stopCoords, label: "Fin", color: "#dc2626" }] : []),
            ],
          })
        : null;

      addTable(
        pdf,
        y,
        ["Jornada", "Unidad", "Inicio", "Fin", "Coord. inicio", "Coord. fin", "Incidentes relacionados"],
        [[
          `#${journey.id}`,
          profilesByUserId[journey.accountUserId || ""]?.username || journey.user || "-",
          formatDate(journey.startDate),
          formatDate(journey.endDate),
          formatCoords(journey.startCoords),
          formatCoords(journey.stopCoords),
          joinIncidentNames(journeyRelatedIncidents(journey, data, profilesByUserId)),
        ]],
        {
          0: { cellWidth: 18 },
          1: { cellWidth: 36 },
          2: { cellWidth: 38 },
          3: { cellWidth: 38 },
          4: { cellWidth: 36 },
          5: { cellWidth: 36 },
          6: { cellWidth: 82 },
        }
      );

      y = addMapToPdf(
        pdf,
        finalTableY(pdf, y + 20) + 8,
        `Ruta de la jornada ${index + 1}`,
        mapImage,
        "Esta jornada no tiene coordenadas de inicio o fin disponibles."
      );

      if (y > 185 && index < filteredJourneys.length - 1) {
        pdf.addPage();
        y = 16;
      }
    }

    savePdf(pdf, "jornadas");
  }

  async function exportPoints() {
    if (!data || filteredPoints.length === 0) {
      setError("No hay puntos de interes para exportar.");
      return;
    }

    const pdf = createPdf("Reporte de puntos de interes", `Generado el ${formatDate(new Date().toISOString())}`);
    let y = 28;

    for (let index = 0; index < filteredPoints.length; index += 1) {
      const point = filteredPoints[index];
      const mapImage = point.coords
        ? await createMapImage({
            title: "Mapa del punto de interes",
            markers: [{ coords: point.coords, label: poiTypeLabel(point.poiType), color: "#0ea5e9" }],
          })
        : null;

      addTable(
        pdf,
        y,
        ["Nombre", "Tipo", "Estado", "Operativo", "Coordenadas", "Incidente relacionado", "Creado"],
        [[
          point.name,
          poiTypeLabel(point.poiType),
          point.isActive ? "Activo" : "Inactivo",
          point.createdByUsername || point.createdBy || "-",
          formatCoords(point.coords),
          point.incidentName || getIncidentLabel(point.incidentId ? incidentById[point.incidentId] : null),
          formatDate(point.createdAt),
        ]],
        {
          0: { cellWidth: 42 },
          1: { cellWidth: 34 },
          2: { cellWidth: 22 },
          3: { cellWidth: 34 },
          4: { cellWidth: 36 },
          5: { cellWidth: 72 },
          6: { cellWidth: 40 },
        }
      );

      y = addMapToPdf(
        pdf,
        finalTableY(pdf, y + 20) + 8,
        `Mapa del punto de interes ${index + 1}`,
        mapImage,
        "Este punto de interes no tiene coordenadas disponibles."
      );

      if (y > 185 && index < filteredPoints.length - 1) {
        pdf.addPage();
        y = 16;
      }
    }

    savePdf(pdf, "puntos-de-interes");
  }

  async function exportWorkAreas() {
    if (!data || filteredWorkAreas.length === 0) {
      setError("No hay areas de trabajo para exportar.");
      return;
    }

    const pdf = createPdf("Reporte de areas de trabajo", `Generado el ${formatDate(new Date().toISOString())}`);
    let y = 28;

    for (let index = 0; index < filteredWorkAreas.length; index += 1) {
      const area = filteredWorkAreas[index];
      const mapImage = area.center || area.polygon
        ? await createMapImage({
            title: "Mapa del area de trabajo",
            markers: area.center ? [{ coords: area.center, label: "Centro", color: "#f97316" }] : [],
            polygon: area.areaType === "POLYGON" ? area.polygon ?? undefined : undefined,
            circle: area.areaType === "CIRCLE" && area.center && area.radiusM
              ? { center: area.center, radiusM: area.radiusM }
              : null,
          })
        : null;

      addTable(
        pdf,
        y,
        ["Nombre", "Tipo", "Estado", "Centro", "Radio m", "Vertices", "Incidente relacionado", "Creada"],
        [[
          area.name,
          area.areaType === "POLYGON" ? "Poligono" : "Circulo",
          area.active ? "Activa" : "Inactiva",
          formatCoords(area.center),
          area.radiusM ? String(area.radiusM) : "-",
          area.polygon ? String(area.polygon.length) : "-",
          area.incidentName || getIncidentLabel(area.incidentId ? incidentById[area.incidentId] : null),
          formatDate(area.createdAt),
        ]],
        {
          0: { cellWidth: 38 },
          1: { cellWidth: 24 },
          2: { cellWidth: 22 },
          3: { cellWidth: 34 },
          4: { cellWidth: 18 },
          5: { cellWidth: 18 },
          6: { cellWidth: 72 },
          7: { cellWidth: 38 },
        }
      );

      y = addMapToPdf(
        pdf,
        finalTableY(pdf, y + 20) + 8,
        `Mapa del area de trabajo ${index + 1}`,
        mapImage,
        "Esta area de trabajo no tiene geometria disponible."
      );

      if (y > 185 && index < filteredWorkAreas.length - 1) {
        pdf.addPage();
        y = 16;
      }
    }

    savePdf(pdf, "areas-de-trabajo");
  }

  async function handleExport(kind: ExportKind) {
    if (exporting) return;

    setError("");
    setExporting(kind);
    try {
      if (kind === "incidents") await exportIncidents();
      if (kind === "alerts") await exportAlerts();
      if (kind === "profiles") exportProfiles();
      if (kind === "journeys") await exportJourneys();
      if (kind === "points") await exportPoints();
      if (kind === "workareas") await exportWorkAreas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el PDF.");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Administracion</p>
          <h1 className="mt-1 text-2xl font-bold lg:text-3xl">Reportes PDF</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--cm-text-muted)]">
            Exporta datos operativos con sus incidentes relacionados desde una unica pagina.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
        >
          Recargar datos
        </button>
      </div>

      {error ? <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm">{error}</div> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map((card) => {
          const filter = filters[card.kind];
          const options = filterOptions[card.kind];
          const supportsLocation = card.kind !== "profiles";

          return (
            <article
              key={card.kind}
              className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">PDF</p>
                  <h2 className="mt-2 text-xl font-bold">{card.title}</h2>
                </div>
                <span className="rounded-full bg-[color:var(--cm-surface-2)] px-3 py-1 text-sm font-semibold text-[color:var(--cm-text)] ring-1 ring-[color:var(--cm-border)]">
                  {card.count}/{card.totalCount}
                </span>
              </div>

              <p className="mt-3 min-h-[44px] text-sm leading-6 text-[color:var(--cm-text-muted)]">{card.description}</p>

              <div className="mt-4 space-y-3 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]/45 p-3">
                <input
                  type="text"
                  value={filter.query}
                  onChange={(event) => updateFilter(card.kind, { query: event.target.value })}
                  placeholder="Buscar dentro de este PDF..."
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-3 py-2 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={filter.status}
                    onChange={(event) => updateFilter(card.kind, { status: event.target.value })}
                    className="min-w-0 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-3 py-2 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="">Todos los estados</option>
                    {options.status.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {options.type.length > 0 ? (
                    <select
                      value={filter.type}
                      onChange={(event) => updateFilter(card.kind, { type: event.target.value })}
                      className="min-w-0 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-3 py-2 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                    >
                      <option value="">
                        {card.kind === "profiles" ? "Todos los roles" : "Todos los tipos"}
                      </option>
                      {options.type.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {supportsLocation ? (
                    <label className="inline-flex items-center gap-2 text-sm text-[color:var(--cm-text-muted)]">
                      <input
                        type="checkbox"
                        checked={filter.onlyWithLocation}
                        onChange={(event) => updateFilter(card.kind, { onlyWithLocation: event.target.checked })}
                        className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]"
                      />
                      Solo con localizacion
                    </label>
                  ) : (
                    <span className="text-sm text-[color:var(--cm-text-muted)]">Filtro por rol y estado</span>
                  )}

                  <button
                    type="button"
                    onClick={() => clearFilter(card.kind)}
                    className="rounded-lg border border-[color:var(--cm-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cm-text)] transition hover:bg-[color:var(--cm-surface-2)]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleExport(card.kind)}
                disabled={Boolean(exporting) || card.count === 0}
                className="mt-5 w-full rounded-xl bg-[color:var(--cm-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {exporting === card.kind ? "Generando..." : "Exportar PDF filtrado"}
              </button>
            </article>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5">
        <div className="grid gap-3 text-sm text-[color:var(--cm-text-muted)] md:grid-cols-3">
          <p>
            Incidentes cargados: <span className="font-semibold text-[color:var(--cm-text)]">{data?.incidents.length ?? 0}</span>
          </p>
          <p>
            Alertas vinculadas: <span className="font-semibold text-[color:var(--cm-text)]">{data?.alerts.length ?? 0}</span>
          </p>
          <p>
            Relaciones por miembros: <span className="font-semibold text-[color:var(--cm-text)]">{Object.keys(data?.membersByIncidentId ?? {}).length}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
