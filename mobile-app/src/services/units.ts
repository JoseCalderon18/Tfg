import { API_BASE_URL, callApi } from './api';

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

  const url = query.toString() ? `${API_BASE_URL}/units/?${query}` : `${API_BASE_URL}/units/`;

  return callApi(url, {
    method: 'GET',
    token,
  }) as Promise<{ results: Unit[]; count: number; next?: string; previous?: string }>;
}

/**
 * Obtener detalles de una unidad
 */
export async function getUnitDetail(token: string, unitId: string) {
  return callApi(`${API_BASE_URL}/units/${unitId}/`, {
    method: 'GET',
    token,
  }) as Promise<UnitDetail>;
}

/**
 * Obtener estadísticas de unidades
 */
export async function getUnitsStats(token: string) {
  return callApi(`${API_BASE_URL}/units/stats/`, {
    method: 'GET',
    token,
  }) as Promise<UnitStats>;
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
  return callApi(`${API_BASE_URL}/units/${unitId}/change_status/`, {
    method: 'POST',
    token,
    body: data,
  }) as Promise<StatusHistory>;
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
  return callApi(`${API_BASE_URL}/units/${unitId}/record_consumption/`, {
    method: 'POST',
    token,
    body: data,
  }) as Promise<UnitDetail>;
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
    ? `${API_BASE_URL}/units/${unitId}/location_history/?${query}`
    : `${API_BASE_URL}/units/${unitId}/location_history/`;

  return callApi(url, {
    method: 'GET',
    token,
  }) as Promise<LocationAudit[]>;
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
    ? `${API_BASE_URL}/units/${unitId}/consumption_history/?${query}`
    : `${API_BASE_URL}/units/${unitId}/consumption_history/`;

  return callApi(url, {
    method: 'GET',
    token,
  }) as Promise<ConsumptionRecord[]>;
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
    ? `${API_BASE_URL}/units/${unitId}/status_history/?${query}`
    : `${API_BASE_URL}/units/${unitId}/status_history/`;

  return callApi(url, {
    method: 'GET',
    token,
  }) as Promise<StatusHistory[]>;
}
