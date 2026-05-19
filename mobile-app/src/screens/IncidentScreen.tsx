import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polygon, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type Incident = {
  id: string;
  name?: string | null;
  incident_type?: string | null;
  status?: string | null;
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

type IncidentAlert = {
  id: string;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type WorkArea = {
  id: string;
  name?: string | null;
  area_type?: 'CIRCLE' | 'POLYGON' | string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_m?: number | null;
  polygon_coordinates?: unknown;
  active?: boolean;
};

type ListResponse<T> = T[] | { results?: T[] };
type Point = { latitude: number; longitude: number };

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  RESOLVED: 'Resuelto',
  TRIAGE: 'En evaluacion',
  CANCELLED: 'Cancelado',
};

const LABEL_TIPOS: Record<string, string> = {
  FIRE: 'Incendio',
  MEDICAL: 'Sanitario',
  WILDFIRE: 'Incendio forestal',
  NATURAL_DISASTER: 'Desastre natural',
  RESCUE: 'Rescate',
  SECURITY: 'Seguridad',
  OTHER: 'Otro',
};

const LABEL_TIPO_ALERTA: Record<string, string> = {
  SOS: 'SOS Emergencia',
  MAN_DOWN: 'Operativo caido',
  FIRE_SPREAD: 'Cambio de fuego',
  SMOKE: 'Humo en incidente',
  INJURY: 'Operativo herido',
  DEATH: 'Operativo fallecido',
  EVACUATION: 'Evacuacion',
  MEDICAL: 'Emergencia medica',
  TRAPPED: 'Operativo atrapado',
  VEHICLE: 'Incidente vehicular',
  ANIMAL: 'Animal peligroso',
  ANIMAL_INJURY: 'Animal herido',
  LOW_SUPPLIES: 'Recursos bajos',
  COMM_LOSS: 'Perdida de comunicacion',
  HAZARD: 'Peligro ambiental',
  FATIGUE: 'Fatiga extrema',
  WEATHER: 'Clima peligroso',
  LOST: 'Operativo perdido',
  GEOFENCE: 'Fuera de zona segura',
  ANOMALY: 'Anomalia detectada',
  BATTERY: 'Bateria baja',
  MOVEMENT: 'Inmovilidad prolongada',
  OTHER: 'Otra alerta',
};

const ALERT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  ACK: 'Reconocida',
  CLOSED: 'Cerrada',
};

const DEFAULT_TASKS = [
  'Confirmar zona segura',
  'Revisar comunicaciones',
  'Validar recursos asignados',
  'Reportar estado al mando',
];

function normalizeList<T>(payload: ListResponse<T>) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function getLabel(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) {
    return 'Sin definir';
  }

  return labels[value] ?? value.replace(/_/g, ' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function extractCoordinates(location: unknown): Point | null {
  if (!location) {
    return null;
  }

  if (Array.isArray(location) && location.length >= 2) {
    const longitude = Number(location[0]);
    const latitude = Number(location[1]);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }

  if (typeof location === 'object') {
    const value = location as {
      coordinates?: unknown;
      x?: unknown;
      y?: unknown;
      lat?: unknown;
      lng?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };

    if (Array.isArray(value.coordinates) && value.coordinates.length >= 2) {
      const longitude = Number(value.coordinates[0]);
      const latitude = Number(value.coordinates[1]);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }

    if (value.x !== undefined && value.y !== undefined) {
      const longitude = Number(value.x);
      const latitude = Number(value.y);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }

    const latitudeValue = value.latitude ?? value.lat;
    const longitudeValue = value.longitude ?? value.lng;
    if (latitudeValue !== undefined && longitudeValue !== undefined) {
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }
  }

  if (typeof location === 'string') {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const longitude = Number(match[1]);
      const latitude = Number(match[3]);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }
  }

  return null;
}

function formatCoordinates(point: Point | null) {
  if (!point) {
    return 'Sin coordenadas registradas';
  }

  return `Lat ${point.latitude.toFixed(6)} | Lng ${point.longitude.toFixed(6)}`;
}

function getStatusStyle(status: string | null | undefined, isActive?: boolean) {
  if (status === 'TRIAGE') {
    return styles.triageBadge;
  }

  if (isActive === false || status === 'CLOSED' || status === 'CANCELLED') {
    return styles.inactiveBadge;
  }

  if (status === 'OPEN') {
    return styles.openBadge;
  }

  return styles.defaultBadge;
}

function getAlertStatusStyle(status: string | null | undefined) {
  if (status === 'OPEN') {
    return styles.openBadge;
  }

  if (status === 'ACK') {
    return styles.triageBadge;
  }

  return styles.inactiveBadge;
}

function getEstiloSeveridad(severity: number | null | undefined) {
  if ((severity ?? 0) >= 4) {
    return styles.severityHigh;
  }

  if ((severity ?? 0) >= 3) {
    return styles.severityMedium;
  }

  return styles.severityLow;
}

function sortAlertasPorFecha(alerts: IncidentAlert[]) {
  return [...alerts].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

function parsePolygonCoordinates(value: unknown): Point[] {
  const rawRing =
    Array.isArray(value) && Array.isArray(value[0]) && Array.isArray(value[0][0])
      ? value[0]
      : Array.isArray(value)
        ? value
        : [];

  return rawRing
    .map((item) => {
      if (!Array.isArray(item) || item.length < 2) {
        return null;
      }

      const longitude = Number(item[0]);
      const latitude = Number(item[1]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return { latitude, longitude };
    })
    .filter((point): point is Point => Boolean(point));
}

function buildMapRegion(incidentPoint: Point | null, workareas: WorkArea[]): Region {
  const workareaPoints = workareas.flatMap((workarea) => {
    if (workarea.area_type === 'CIRCLE' && workarea.center_lat && workarea.center_lng) {
      return [{ latitude: workarea.center_lat, longitude: workarea.center_lng }];
    }

    return parsePolygonCoordinates(workarea.polygon_coordinates);
  });

  const points = [...(incidentPoint ? [incidentPoint] : []), ...workareaPoints];
  if (points.length === 0) {
    return {
      latitude: 40.4168,
      longitude: -3.7038,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.8, 0.03),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.8, 0.03),
  };
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await parseJsonResponse<{ detail?: string; error?: string }>(response);
    return payload.detail ?? payload.error ?? 'No se pudo cargar el incidente.';
  } catch {
    return 'El servidor no devolvio una respuesta valida.';
  }
}

export default function IncidentScreen({ navigation, route }: any) {
  const incidentId = route?.params?.incidentId as string | undefined;
  const { token } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [workareas, setWorkareas] = useState<WorkArea[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coordinates = useMemo(() => extractCoordinates(incident?.location), [incident?.location]);
  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === 'OPEN' || alert.status === 'ACK'),
    [alerts]
  );
  const sortedAlerts = useMemo(() => sortAlertasPorFecha(alerts), [alerts]);
  const activeWorkareas = useMemo(() => workareas.filter((workarea) => workarea.active !== false), [workareas]);
  const mapRegion = useMemo(() => buildMapRegion(coordinates, activeWorkareas), [activeWorkareas, coordinates]);

  const loadIncident = useCallback(async (refreshing = false) => {
    if (!token) {
      setError('No hay sesion activa.');
      setIsLoading(false);
      return;
    }

    if (!incidentId) {
      setError('No se recibio el identificador del incidente.');
      setIsLoading(false);
      return;
    }

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const encodedIncidentId = encodeURIComponent(incidentId);
      const [incidentResponse, alertsResponse, workareasResponse] = await Promise.all([
        apiFetch(`/incidents/${encodedIncidentId}/`, { token, timeoutMs: 12000 }),
        apiFetch(`/alerts/?incident=${encodedIncidentId}`, { token, timeoutMs: 12000 }),
        apiFetch(`/workareas/?incident=${encodedIncidentId}`, { token, timeoutMs: 12000 }),
      ]);

      if (!incidentResponse.ok) {
        throw new Error(await readErrorMessage(incidentResponse));
      }

      setIncident(await parseJsonResponse<Incident>(incidentResponse));

      if (alertsResponse.ok) {
        setAlerts(normalizeList(await parseJsonResponse<ListResponse<IncidentAlert>>(alertsResponse)));
      } else {
        setAlerts([]);
      }

      if (workareasResponse.ok) {
        setWorkareas(normalizeList(await parseJsonResponse<ListResponse<WorkArea>>(workareasResponse)));
      } else {
        setWorkareas([]);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo cargar el incidente.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [incidentId, token]);

  useEffect(() => {
    void loadIncident();
  }, [loadIncident]);

  useEffect(() => {
    if (!incidentId) {
      return;
    }

    let cancelled = false;
    void AsyncStorage.getItem(`incident-checklist:${incidentId}`).then((storedValue) => {
      if (cancelled || !storedValue) {
        return;
      }

      try {
        setCheckedTasks(JSON.parse(storedValue) as Record<string, boolean>);
      } catch {
        setCheckedTasks({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  const toggleTask = (task: string) => {
    if (!incidentId) {
      return;
    }

    setCheckedTasks((current) => {
      const next = { ...current, [task]: !current[task] };
      void AsyncStorage.setItem(`incident-checklist:${incidentId}`, JSON.stringify(next));
      return next;
    });
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Cargando incidente...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No se pudo cargar</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => loadIncident()}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!incident) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Incidente no disponible</Text>
          <Text style={styles.stateText}>No se encontraron datos para este incidente.</Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.incidentName}>{incident.name || 'Incidente sin nombre'}</Text>
            <View style={[styles.statusBadge, getStatusStyle(incident.status, incident.is_active)]}>
              <Text style={styles.statusBadgeText}>{getLabel(incident.status, STATUS_LABELS)}</Text>
            </View>
          </View>
          <Text style={styles.incidentType}>{getLabel(incident.incident_type, LABEL_TIPOS)}</Text>
          {incident.description ? <Text style={styles.description}>{incident.description}</Text> : null}
        </View>

        <View style={styles.summaryGrid}>
          <SummaryBox label="Alertas activas" value={String(activeAlerts.length)} tone={activeAlerts.length > 0 ? 'danger' : 'success'} />
          <SummaryBox label="Workareas" value={String(activeWorkareas.length)} tone={activeWorkareas.length > 0 ? 'primary' : 'muted'} />
          <SummaryBox label="Estado" value={incident.is_active === false ? 'Inactivo' : 'Activo'} tone={incident.is_active === false ? 'muted' : 'success'} />
        </View>

        <View style={styles.mapCard}>
          <Text style={styles.cardTitle}>Mapa</Text>
          <View style={styles.mapWrapper}>
            <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion} toolbarEnabled={false}>
              {coordinates ? (
                <Marker coordinate={coordinates} title={incident.name || 'Incidente'} pinColor={colors.danger} />
              ) : null}

              {activeWorkareas.map((workarea) => {
                if (workarea.area_type === 'CIRCLE' && workarea.center_lat && workarea.center_lng && workarea.radius_m) {
                  return (
                    <Circle
                      key={workarea.id}
                      center={{ latitude: workarea.center_lat, longitude: workarea.center_lng }}
                      radius={workarea.radius_m}
                      strokeColor={colors.primary}
                      fillColor="rgba(37, 99, 235, 0.16)"
                    />
                  );
                }

                const polygon = parsePolygonCoordinates(workarea.polygon_coordinates);
                if (polygon.length >= 3) {
                  return (
                    <Polygon
                      key={workarea.id}
                      coordinates={polygon}
                      strokeColor={colors.primary}
                      fillColor="rgba(37, 99, 235, 0.16)"
                    />
                  );
                }

                return null;
              })}
            </MapView>
          </View>
          <Text style={styles.cardValue}>{incident.location_address || 'Sin direccion registrada'}</Text>
          <Text style={styles.cardValue}>{formatCoordinates(coordinates)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos operativos</Text>
          <InfoRow label="Organizacion" value={incident.owner_organization || 'Sin organizacion'} />
          <InfoRow label="Creado por" value={incident.created_by || 'Sin responsable'} />
          <InfoRow label="Inicio" value={formatDate(incident.started_at ?? incident.created_at)} />
          <InfoRow label="Fin" value={formatDate(incident.ended_at)} />
          <InfoRow label="Actualizado" value={formatDate(incident.updated_at)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workarea</Text>
          {activeWorkareas.length === 0 ? (
            <Text style={styles.cardValue}>No hay workareas activas para este incidente.</Text>
          ) : (
            activeWorkareas.map((workarea) => (
              <View key={workarea.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{workarea.name || 'Workarea sin nombre'}</Text>
                <Text style={styles.listMeta}>
                  {workarea.area_type === 'CIRCLE'
                    ? `Circular | Radio ${workarea.radius_m ?? 0} m`
                    : 'Poligonal'}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Checklist de tareas</Text>
            <Text style={styles.cardCount}>
              {DEFAULT_TASKS.filter((task) => checkedTasks[task]).length}/{DEFAULT_TASKS.length}
            </Text>
          </View>
          {DEFAULT_TASKS.map((task) => (
            <TouchableOpacity key={task} style={styles.taskRow} onPress={() => toggleTask(task)}>
              <View style={[styles.taskCheckbox, checkedTasks[task] ? styles.taskCheckboxDone : null]}>
                <Text style={styles.taskCheckboxText}>{checkedTasks[task] ? '✓' : ''}</Text>
              </View>
              <Text style={[styles.taskText, checkedTasks[task] ? styles.taskTextDone : null]}>{task}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Alertas relacionadas</Text>
            <Text style={styles.cardCount}>{alerts.length}</Text>
          </View>
          {alerts.length === 0 ? (
            <Text style={styles.cardValue}>No hay alertas registradas para este incidente.</Text>
          ) : (
            sortedAlerts.map((alert) => (
              <View key={alert.id} style={[styles.listItem, styles.alertItem]}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>{alert.title || getLabel(alert.alert_type, LABEL_TIPO_ALERTA)}</Text>
                  <View style={[styles.smallBadge, getAlertStatusStyle(alert.status)]}>
                    <Text style={styles.smallBadgeText}>{getLabel(alert.status, ALERT_STATUS_LABELS)}</Text>
                  </View>
                </View>
                <View style={styles.alertMetaRow}>
                  <Text style={[styles.severityPill, getEstiloSeveridad(alert.severity)]}>
                    Severidad {alert.severity ?? '-'}
                  </Text>
                  <Text style={styles.alertDate}>{formatDate(alert.created_at)}</Text>
                </View>
                <Text style={styles.listMeta}>{getLabel(alert.alert_type, LABEL_TIPO_ALERTA)}</Text>
                {alert.description ? <Text style={styles.listDescription}>{alert.description}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acciones rapidas</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Map')}>
              <Text style={styles.secondaryButtonText}>Ver mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Companions', { incidentId: incident.id })}>
              <Text style={styles.secondaryButtonText}>Companeros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Alerts', { incidentId: incident.id })}>
              <Text style={styles.secondaryButtonText}>Ver alertas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Alert', { incidentId: incident.id, incidentName: incident.name })}
            >
              <Text style={styles.secondaryButtonText}>Crear alerta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Chat')}>
              <Text style={styles.primaryButtonText}>Abrir chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Detalle de incidente</Text>
          <Text style={styles.subtitle}>{incident?.name ?? incidentId ?? 'Sin identificador'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadIncident(true)}
            tintColor={colors.primary}
          />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone: 'danger' | 'success' | 'primary' | 'muted' }) {
  const toneStyle =
    tone === 'danger'
      ? styles.summaryDanger
      : tone === 'success'
        ? styles.summarySuccess
        : tone === 'primary'
          ? styles.summaryPrimary
          : styles.summaryMuted;

  return (
    <View style={[styles.summaryBox, toneStyle]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  stateBox: {
    marginTop: 42,
    alignItems: 'center',
    gap: 12,
  },
  stateCard: {
    marginTop: 26,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  stateText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  incidentName: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  incidentType: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  description: {
    marginTop: 12,
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  summaryDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  summarySuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: colors.success,
  },
  summaryPrimary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  summaryMuted: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
  },
  openBadge: {
    backgroundColor: colors.success,
  },
  triageBadge: {
    backgroundColor: colors.warning,
  },
  inactiveBadge: {
    backgroundColor: colors.textMuted,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  smallBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  mapCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  mapWrapper: {
    height: 220,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  cardCount: {
    minWidth: 28,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    textAlign: 'center',
  },
  cardValue: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  alertItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  listHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  listTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  listMeta: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  listDescription: {
    marginTop: 7,
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  alertMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  severityPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  severityHigh: {
    backgroundColor: colors.danger,
  },
  severityMedium: {
    backgroundColor: colors.warning,
  },
  severityLow: {
    backgroundColor: colors.success,
  },
  alertDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  taskCheckboxDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  taskCheckboxText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  taskText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  taskTextDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
