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

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  RESOLVED: 'Resuelto',
  TRIAGE: 'En evaluacion',
  CANCELLED: 'Cancelado',
};

const TYPE_LABELS: Record<string, string> = {
  FIRE: 'Incendio',
  MEDICAL: 'Sanitario',
  WILDFIRE: 'Incendio forestal',
  NATURAL_DISASTER: 'Desastre natural',
  RESCUE: 'Rescate',
  SECURITY: 'Seguridad',
  OTHER: 'Otro',
};

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

function extractCoordinates(location: unknown): [number, number] | null {
  if (!location) {
    return null;
  }

  if (Array.isArray(location) && location.length >= 2) {
    const longitude = Number(location[0]);
    const latitude = Number(location[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return [latitude, longitude];
    }
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
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [latitude, longitude];
      }
    }

    if (value.x !== undefined && value.y !== undefined) {
      const longitude = Number(value.x);
      const latitude = Number(value.y);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [latitude, longitude];
      }
    }

    const latitudeValue = value.latitude ?? value.lat;
    const longitudeValue = value.longitude ?? value.lng;
    if (latitudeValue !== undefined && longitudeValue !== undefined) {
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [latitude, longitude];
      }
    }
  }

  if (typeof location === 'string') {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const longitude = Number(match[1]);
      const latitude = Number(match[3]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [latitude, longitude];
      }
    }
  }

  return null;
}

function formatCoordinates(coordinates: [number, number] | null) {
  if (!coordinates) {
    return 'Sin coordenadas registradas';
  }

  const [latitude, longitude] = coordinates;
  return `Lat ${latitude.toFixed(6)} | Lng ${longitude.toFixed(6)}`;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await parseJsonResponse<{ detail?: string; error?: string }>(response);
    return payload.detail ?? payload.error ?? 'No se pudo cargar el incidente.';
  } catch {
    return 'El servidor no devolvio una respuesta valida.';
  }
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

export default function IncidentScreen({ navigation, route }: any) {
  const incidentId = route?.params?.incidentId as string | undefined;
  const { token } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coordinates = useMemo(() => extractCoordinates(incident?.location), [incident?.location]);

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
      const response = await apiFetch(`/incidents/${encodeURIComponent(incidentId)}/`, {
        token,
        timeoutMs: 12000,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setIncident(await parseJsonResponse<Incident>(response));
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
          <Text style={styles.incidentType}>{getLabel(incident.incident_type, TYPE_LABELS)}</Text>
          {incident.description ? <Text style={styles.description}>{incident.description}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicacion</Text>
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

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.secondaryButtonText}>Ver mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.primaryButtonText}>Abrir chat</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Detalle de incidente</Text>
          <Text style={styles.subtitle}>{incidentId ?? 'Sin identificador'}</Text>
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
  backButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
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
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
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
  actionsRow: {
    flexDirection: 'row',
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
});
