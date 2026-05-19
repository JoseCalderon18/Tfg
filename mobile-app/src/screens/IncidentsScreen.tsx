import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth, type User } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type Incident = {
  id: string;
  name: string;
  incident_type?: string | null;
  status?: string | null;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  owner_organization?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  is_active?: boolean;
};

type IncidentListResponse = Incident[] | { results?: Incident[] };

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  RESOLVED: 'Resuelto',
  TRIAGE: 'En evaluacion',
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

function getStatusBadgeStyle(status: string | null | undefined, isActive?: boolean) {

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

function normalizeIncidentList(payload: IncidentListResponse) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.results ?? [];
}

function extractCoordinates(location: unknown): [number, number] | null {
  if (!location) {
    return null;
  }

  if (Array.isArray(location) && location.length >= 2) {
    const longitude = Number(location[0]);
    const latitude = Number(location[1]);
    if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
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
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return [latitude, longitude];
      }
    }

    if (value.x !== undefined && value.y !== undefined) {
      const longitude = Number(value.x);
      const latitude = Number(value.y);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return [latitude, longitude];
      }
    }

    if (value.lat !== undefined && value.lng !== undefined) {
      const latitude = Number(value.lat);
      const longitude = Number(value.lng);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return [latitude, longitude];
      }
    }

    if (value.latitude !== undefined && value.longitude !== undefined) {
      const latitude = Number(value.latitude);
      const longitude = Number(value.longitude);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return [latitude, longitude];
      }
    }
  }

  if (typeof location === 'string') {
    const match = location.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const longitude = Number(match[1]);
      const latitude = Number(match[3]);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return [latitude, longitude];
      }
    }
  }

  return null;
}

function formatCoordinates(coordinates: [number, number] | null) {
  if (!coordinates) {
    return 'Sin ubicacion registrada';
  }

  const [latitude, longitude] = coordinates;
  return `Latitud: ${latitude.toFixed(6)} | Longitud: ${longitude.toFixed(6)}`;
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`
    );

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        pedestrian?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        country?: string;
      };
    };

    const address = data.address;
    if (!address) {
      return data.display_name ?? '';
    }

    const street = [address.road || address.pedestrian || '', address.house_number || '']
      .filter(Boolean)
      .join(' ')
      .trim();
    const city = address.city || address.town || address.village || address.municipality || '';
    const parts = [street, city, address.country || ''].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : data.display_name ?? '';
  } catch {
    return '';
  }
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'No se pudieron cargar los incidentes.';
  }

  try {
    const payload = JSON.parse(text) as { detail?: string; error?: string };
    return payload.detail ?? payload.error ?? 'No se pudieron cargar los incidentes.';
  } catch {
    return 'El servidor no devolvio una respuesta valida.';
  }
}

export default function IncidentsScreen({ navigation }: any) {
  const { token, user, updateUser } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readableLocations, setReadableLocations] = useState<Record<string, string>>({});
  const [resolvingLocationIds, setResolvingLocationIds] = useState<Record<string, boolean>>({});

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    const response = await apiFetch('/auth/me/', { token, timeoutMs: 12000 });
    if (!response.ok) {
      return null;
    }

    const currentUser = await parseJsonResponse<User>(response);
    await updateUser(currentUser);
    return currentUser;
  }, [token, updateUser]);

  const loadIncidents = useCallback(async (refreshing = false) => {
    if (!token) {
      setError('No hay sesion activa.');
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
      const currentUser = user?.organization_id ? user : await refreshCurrentUser();

      if (!currentUser?.organization_id) {
        setIncidents([]);
        return;
      }

      const organizationId = encodeURIComponent(currentUser.organization_id);
      const response = await apiFetch(`/incidents/?owner_organization=${organizationId}`, {
        token,
        timeoutMs: 12000,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as IncidentListResponse;
      setIncidents(normalizeIncidentList(payload));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudieron cargar los incidentes.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshCurrentUser, token, user]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  useEffect(() => {
    const incidentsToResolve = incidents.filter((incident) => {
      if (readableLocations[incident.id]) {
        return false;
      }

      return Boolean(extractCoordinates(incident.location));
    });

    if (incidentsToResolve.length === 0) {
      return;
    }

    let cancelled = false;

    setResolvingLocationIds((current) => {
      const next = { ...current };
      incidentsToResolve.forEach((incident) => {
        next[incident.id] = true;
      });
      return next;
    });

    incidentsToResolve.forEach((incident) => {
      const coordinates = extractCoordinates(incident.location);
      if (!coordinates) {
        return;
      }

      const [latitude, longitude] = coordinates;
      void reverseGeocode(latitude, longitude).then((address) => {
        if (cancelled) {
          return;
        }

        if (address) {
          setReadableLocations((current) => ({
            ...current,
            [incident.id]: address,
          }));
        }

        setResolvingLocationIds((current) => ({
          ...current,
          [incident.id]: false,
        }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [incidents, readableLocations]);

  const getReadableLocation = (incident: Incident) => {
    if (readableLocations[incident.id]) {
      return readableLocations[incident.id];
    }

    if (resolvingLocationIds[incident.id]) {
      return 'Buscando direccion...';
    }

    if (incident.location_address) {
      return incident.location_address;
    }

    return formatCoordinates(extractCoordinates(incident.location));
  };

  const renderContent = () => {
    if (!user?.organization_id) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Sin organizacion asignada</Text>
          <Text style={styles.emptyText}>
            Tu usuario operativo no tiene organizacion, asi que no hay incidentes disponibles.
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Cargando incidentes...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No se pudieron cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadIncidents()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (incidents.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Sin incidentes asignados</Text>
          <Text style={styles.emptyText}>
            No hay incidentes asignados a {user.organization_name ?? 'tu organizacion'}.
          </Text>
        </View>
      );
    }

    return incidents.map((incident) => (
      <View key={incident.id} style={styles.incidentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Text style={styles.incidentName}>{incident.name || 'Incidente sin nombre'}</Text>
            <Text style={styles.incidentOrganization}>
              {incident.owner_organization ?? user.organization_name ?? 'Organizacion asignada'}
            </Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(incident.status, incident.is_active)]}>
            <Text style={styles.statusBadgeText}>{getLabel(incident.status, STATUS_LABELS)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tipo</Text>
          <Text style={styles.metaValue}>{getLabel(incident.incident_type, TYPE_LABELS)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Ubicacion</Text>
          <Text style={styles.metaValue}>{getReadableLocation(incident)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Inicio</Text>
          <Text style={styles.metaValue}>{formatDate(incident.started_at ?? incident.created_at)}</Text>
        </View>

        {incident.description ? (
          <Text style={styles.description}>{incident.description}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.openIncidentButton}
          onPress={() => navigation.navigate('Incident', { incidentId: incident.id })}
        >
          <Text style={styles.openIncidentButtonText}>Abrir incidente</Text>
        </TouchableOpacity>

      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Incidentes</Text>
          <Text style={styles.subtitle}>{user?.organization_name ?? 'Organizacion del operativo'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadIncidents(true)}
            tintColor={colors.primary}
          />
        }
      >
        {renderContent()}
      </ScrollView>
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
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  loadingBox: {
    marginTop: 42,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyBox: {
    marginTop: 26,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  incidentCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitleGroup: {
    flex: 1,
  },
  incidentName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  incidentOrganization: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
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
  metaRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  description: {
    marginTop: 12,
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  openIncidentButton: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  openIncidentButtonText: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
});
