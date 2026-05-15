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
import { WebView } from 'react-native-webview';

import { useAuth, type User } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type WeatherView = 'wind' | 'clouds' | 'rain';

type Incident = {
  id: string;
  name: string;
  incident_type?: string | null;
  status?: string | null;
  description?: string | null;
  location?: unknown;
  location_address?: string | null;
  owner_organization?: string | null;
};

type IncidentListResponse = Incident[] | { results?: Incident[] };

const WEATHER_VIEWS: Array<{ key: WeatherView; label: string }> = [
  { key: 'wind', label: 'Viento' },
  { key: 'clouds', label: 'Nubosidad' },
  { key: 'rain', label: 'Lluvia' },
];

const TYPE_LABELS: Record<string, string> = {
  FIRE: 'Incendio',
  MEDICAL: 'Sanitario',
  WILDFIRE: 'Incendio forestal',
  NATURAL_DISASTER: 'Desastre natural',
  RESCUE: 'Rescate',
  SECURITY: 'Seguridad',
  OTHER: 'Otro',
};

function normalizeIncidentList(payload: IncidentListResponse) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function getLabel(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) {
    return 'Sin definir';
  }

  return labels[value] ?? value.replace(/_/g, ' ');
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

function buildQuery(params: Record<string, string | number | boolean>) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function buildWindyUrl(latitude: number, longitude: number, view: WeatherView) {
  const params = buildQuery({
    lat: latitude.toFixed(6),
    lon: longitude.toFixed(6),
    detailLat: latitude.toFixed(6),
    detailLon: longitude.toFixed(6),
    width: 650,
    height: 520,
    zoom: 10,
    level: 'surface',
    overlay: view,
    product: 'ecmwf',
    menu: false,
    message: false,
    marker: true,
    calendar: true,
    pressure: false,
    type: 'map',
    location: 'coordinates',
    detail: true,
    metricWind: 'km/h',
    metricTemp: 'C',
    radarRange: -1,
  });

  return `https://embed.windy.com/embed2.html?${params}`;
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'No se pudo cargar la informacion meteorologica.';
  }

  try {
    const payload = JSON.parse(text) as { detail?: string; error?: string };
    return payload.detail ?? payload.error ?? 'No se pudo cargar la informacion meteorologica.';
  } catch {
    return 'El servidor no devolvio una respuesta valida.';
  }
}

export default function WeatherScreen({ navigation }: any) {
  const { token, user, updateUser } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [weatherView, setWeatherView] = useState<WeatherView>('wind');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await apiFetch(`/incidents/?owner_organization=${organizationId}&page=1&limit=50`, {
        token,
        timeoutMs: 12000,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as IncidentListResponse;
      setIncidents(normalizeIncidentList(payload));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo cargar la informacion meteorologica.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshCurrentUser, token, user]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const incidentsWithLocation = useMemo(
    () => incidents.filter((incident) => Boolean(extractCoordinates(incident.location))),
    [incidents]
  );

  useEffect(() => {
    if (incidentsWithLocation.length === 0) {
      setSelectedIncidentId(null);
      return;
    }

    const selectedStillExists = incidentsWithLocation.some((incident) => incident.id === selectedIncidentId);
    if (!selectedStillExists) {
      setSelectedIncidentId(incidentsWithLocation[0].id);
    }
  }, [incidentsWithLocation, selectedIncidentId]);

  const selectedIncident = useMemo(() => {
    return incidentsWithLocation.find((incident) => incident.id === selectedIncidentId) ?? incidentsWithLocation[0];
  }, [incidentsWithLocation, selectedIncidentId]);

  const selectedCoordinates = selectedIncident ? extractCoordinates(selectedIncident.location) : null;
  const windyUrl = selectedCoordinates
    ? buildWindyUrl(selectedCoordinates[0], selectedCoordinates[1], weatherView)
    : null;

  const renderContent = () => {
    if (!user?.organization_id) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Sin organizacion asignada</Text>
          <Text style={styles.emptyText}>
            Tu usuario operativo no tiene organizacion, asi que no hay incidentes para consultar el tiempo.
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Cargando meteorologia...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No se pudo cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadIncidents()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (incidentsWithLocation.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Sin ubicaciones disponibles</Text>
          <Text style={styles.emptyText}>
            No hay incidentes con coordenadas para mostrar capas de viento, lluvia o nubosidad.
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.segmentedControl}>
          {WEATHER_VIEWS.map((item) => {
            const isActive = item.key === weatherView;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                onPress={() => setWeatherView(item.key)}
              >
                <Text style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Incidente de referencia</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.incidentSelector}
        >
          {incidentsWithLocation.map((incident) => {
            const isSelected = incident.id === selectedIncident?.id;
            return (
              <TouchableOpacity
                key={incident.id}
                style={[styles.incidentChip, isSelected && styles.incidentChipActive]}
                onPress={() => setSelectedIncidentId(incident.id)}
              >
                <Text style={[styles.incidentChipTitle, isSelected && styles.incidentChipTitleActive]}>
                  {incident.name || 'Incidente sin nombre'}
                </Text>
                <Text style={[styles.incidentChipMeta, isSelected && styles.incidentChipMetaActive]}>
                  {getLabel(incident.incident_type, TYPE_LABELS)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedIncident && selectedCoordinates ? (
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>{selectedIncident.name || 'Incidente sin nombre'}</Text>
            <Text style={styles.detailText}>
              {selectedIncident.location_address || `${selectedCoordinates[0].toFixed(5)}, ${selectedCoordinates[1].toFixed(5)}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.mapBox}>
          {windyUrl ? (
            <WebView
              key={windyUrl}
              source={{ uri: windyUrl }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.webLoadingText}>Cargando mapa...</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.webLoading}>
              <Text style={styles.webLoadingText}>Selecciona un incidente con coordenadas.</Text>
            </View>
          )}
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
          <Text style={styles.title}>Tiempo</Text>
          <Text style={styles.subtitle}>{user?.organization_name ?? 'Meteorologia operativa'}</Text>
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
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentButtonTextActive: {
    color: colors.white,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  incidentSelector: {
    gap: 10,
    paddingRight: 18,
  },
  incidentChip: {
    width: 210,
    minHeight: 86,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    justifyContent: 'space-between',
  },
  incidentChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  incidentChipTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  incidentChipTitleActive: {
    color: colors.primary,
  },
  incidentChipMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  incidentChipMetaActive: {
    color: colors.primary,
  },
  detailBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  detailText: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  mapBox: {
    height: 430,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: 10,
  },
  webLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
