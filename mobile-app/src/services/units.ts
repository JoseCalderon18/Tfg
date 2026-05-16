import { apiFetch, parseJsonResponse } from './api';

export interface Unit {
  id: string;
  name: string;
  type: string;
  vehicle_id: string;
  status: 'DISPONIBLE' | 'EN_VIAJE' | 'EN_MANTENIMIENTO' | 'OFFLINE' | 'CARGANDO';
  driver?: { id: string; first_name: string; last_name: string };
  fuel_level: number;
  battery_level: number;
  total_mileage: number;
  is_active: boolean;
  consumption_alert: string[];
  created_at: string;
  updated_at: string;
}

export interface UnitDetail extends Unit {
  organization: string;
  status_history: StatusHistory[];
  recent_consumption: ConsumptionRecord[];
  location_history: LocationAudit[];
}

export interface StatusHistory {
  id: string;
  unit: string;
  status_anterior: string;
  status_nuevo: string;
  driver?: { id: string; first_name: string; last_name: string };
  razon?: string;
  created_by?: { id: string; first_name: string; last_name: string };
  created_at: string;
}

export interface ConsumptionRecord {
  id: string;
  unit: string;
  fuel_level: number;
  battery_level: number;
  fuel_consumed_since_last: number;
  distance_km: number;
  duration_minutes: number;
  fuel_consumption_rate: number;
  battery_consumption_rate: number;
  estimated_range: number | null;
  created_at: string;
}

export interface LocationAudit {
  id: string;
  unit: string;
  location_lat: number;
  location_lng: number;
  accuracy_m?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  recorded_at: string;
  created_at: string;
}

export interface UnitStats {
  total_units: number;
  available_units: number;
  units_in_transit: number;
  units_in_maintenance: number;
  offline_units: number;
  units_low_fuel: number;
  units_low_battery: number;
  average_fuel_level: number;
  average_battery_level: number;
}

async function unitsApi<T>(path: string, token: string, options: RequestInit = {}) {
  const response = await apiFetch(path, {
    ...options,
    token,
  });

  if (!response.ok) {
    let detail = 'Error al comunicarse con la API de unidades.';
    try {
      const payload = await parseJsonResponse<{ detail?: string; error?: string }>(response);
      detail = payload.detail ?? payload.error ?? detail;
    } catch {
      // Si la respuesta no es JSON, devolvemos el mensaje generico.
    }
    throw new Error(detail);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Obtener lista de unidades
 */
export async function getUnits(
  token: string,
  filters?: {
    status?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
) {
  const query = new URLSearchParams();
  if (filters?.status) query.append('status', filters.status);
  if (filters?.type) query.append('type', filters.type);
  if (filters?.search) query.append('search', filters.search);
  if (filters?.limit) query.append('limit', filters.limit.toString());
  if (filters?.offset) query.append('offset', filters.offset.toString());

  const url = query.toString() ? `/units/?${query}` : '/units/';

  return unitsApi<{ results: Unit[]; count: number; next?: string; previous?: string }>(url, token);
}

/**
 * Obtener detalles de una unidad
 */
export async function getUnitDetail(token: string, unitId: string) {
  return unitsApi<UnitDetail>(`/units/${unitId}/`, token);
}

/**
 * Obtener estadísticas de unidades
 */
export async function getUnitsStats(token: string) {
  return unitsApi<UnitStats>('/units/stats/', token);
}

/**
 * Cambiar estado de una unidad
 */
export async function changeUnitStatus(
  token: string,
  unitId: string,
  data: {
    status_nuevo: string;
    driver?: string;
    razon?: string;
  }
) {
  return unitsApi<StatusHistory>(`/units/${unitId}/change_status/`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Registrar consumo de recursos
 */
export async function recordConsumption(
  token: string,
  unitId: string,
  data: {
    fuel_level: number;
    battery_level: number;
    fuel_consumed_since_last?: number;
    distance_km?: number;
    duration_minutes?: number;
  }
) {
  return unitsApi<UnitDetail>(`/units/${unitId}/record_consumption/`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Obtener historial de ubicaciones de una unidad
 */
export async function getLocationHistory(
  token: string,
  unitId: string,
  filters?: {
    limit?: number;
    date?: string;
  }
) {
  const query = new URLSearchParams();
  if (filters?.limit) query.append('limit', filters.limit.toString());
  if (filters?.date) query.append('date', filters.date);

  const url = query.toString()
    ? `/units/${unitId}/location_history/?${query}`
    : `/units/${unitId}/location_history/`;

  return unitsApi<LocationAudit[]>(url, token);
}

/**
 * Obtener historial de consumo de una unidad
 */
export async function getConsumptionHistory(
  token: string,
  unitId: string,
  filters?: {
    limit?: number;
    date?: string;
  }
) {
  const query = new URLSearchParams();
  if (filters?.limit) query.append('limit', filters.limit.toString());
  if (filters?.date) query.append('date', filters.date);

  const url = query.toString()
    ? `/units/${unitId}/consumption_history/?${query}`
    : `/units/${unitId}/consumption_history/`;

  return unitsApi<ConsumptionRecord[]>(url, token);
}

/**
 * Obtener historial de cambios de estado de una unidad
 */
export async function getStatusHistory(
  token: string,
  unitId: string,
  filters?: {
    limit?: number;
  }
) {
  const query = new URLSearchParams();
  if (filters?.limit) query.append('limit', filters.limit.toString());

  const url = query.toString()
    ? `/units/${unitId}/status_history/?${query}`
    : `/units/${unitId}/status_history/`;

  return unitsApi<StatusHistory[]>(url, token);
}
