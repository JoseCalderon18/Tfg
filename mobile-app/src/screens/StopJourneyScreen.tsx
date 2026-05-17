import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';

import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { computeRouteDistanceKm, estimateCalories, suggestFoodsForCalories } from '../services/calories';
import { registrarFinJornadaActividad } from '../services/journeyActivity';

type JourneyApi = {
  id: number;
  created_at?: string | null;
  user?: string | null;
  user_id?: string | null;
  account_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location_start?: unknown;
  location_stop?: unknown;
  notes?: unknown;
};

type TrackPointApi = {
  id: string;
  location?: unknown;
  recorded_at?: string;
};

type PointCoordinates = {
  latitude: number;
  longitude: number;
};

type PausePoint = PointCoordinates & {
  id: string;
  title: string;
  description?: string;
};

function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function parsePoint(value: unknown): PointCoordinates | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const longitude = Number(value[0]);
    const latitude = Number(value[1]);
    if (isValidCoordinates(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  if (typeof value === 'object') {
    const candidate = value as {
      coordinates?: unknown;
      x?: unknown;
      y?: unknown;
      lat?: unknown;
      lng?: unknown;
      lon?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const longitude = Number(candidate.coordinates[0]);
      const latitude = Number(candidate.coordinates[1]);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const longitude = Number(candidate.x);
      const latitude = Number(candidate.y);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }

    const latitudeValue = candidate.latitude ?? candidate.lat;
    const longitudeValue = candidate.longitude ?? candidate.lng ?? candidate.lon;
    if (latitudeValue !== undefined && longitudeValue !== undefined) {
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  if (typeof value === 'string') {
    const match = value.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const longitude = Number(match[1]);
      const latitude = Number(match[3]);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) return 'Fecha de inicio no disponible';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

function parsePausePoints(notes: unknown): PausePoint[] {
  if (!notes || typeof notes !== 'object') {
    return [];
  }

  const candidate = notes as {
    pauses?: unknown;
    pause_points?: unknown;
    stops?: unknown;
    breaks?: unknown;
  };

  const rawPoints =
    (Array.isArray(candidate.pauses) && candidate.pauses) ||
    (Array.isArray(candidate.pause_points) && candidate.pause_points) ||
    (Array.isArray(candidate.stops) && candidate.stops) ||
    (Array.isArray(candidate.breaks) && candidate.breaks) ||
    [];

  const parsedPoints = rawPoints
    .map((item, index) => {
      const point = parsePoint(item);
      if (!point) return null;

      const entry = item as { title?: unknown; name?: unknown; description?: unknown; label?: unknown };
      return {
        id: `pause-${index + 1}`,
        title:
          (typeof entry.title === 'string' && entry.title.trim()) ||
          (typeof entry.name === 'string' && entry.name.trim()) ||
          (typeof entry.label === 'string' && entry.label.trim()) ||
          `Pausa ${index + 1}`,
        description: typeof entry.description === 'string' ? entry.description.trim() : undefined,
        ...point,
      };
    })
    .filter(Boolean);

  return parsedPoints as PausePoint[];
}

function buildRegion(points: PointCoordinates[]) {
  const fallback = {
    latitude: 40.4168,
    longitude: -3.7038,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  if (!points.length) {
    return fallback;
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
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.6, 0.02),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.6, 0.02),
  };
}

function uniqueValidCoordinates(points: Array<PointCoordinates | null>) {
  const seen = new Set<string>();

  return points.filter((point): point is PointCoordinates => {
    if (!point || !isValidCoordinates(point.latitude, point.longitude)) {
      return false;
    }

    const key = `${point.latitude.toFixed(7)}:${point.longitude.toFixed(7)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default function StopJourneyScreen({ navigation }: any) {
  const mapRef = useRef<MapView | null>(null);
  const [journey, setJourney] = useState<JourneyApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [screenError, setScreenError] = useState('');
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const { token, user } = useAuth();
  const { location: trackedLocation, stopTracking } = useLocation();
  const [manualLocation, setManualLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    void requestLocationPermission();
  }, []);

  useEffect(() => {
    if (token && user) {
      void loadJourneyData();
    } else {
      setScreenLoading(false);
      setScreenError('No hay una sesion activa para consultar la jornada.');
    }
  }, [token, user]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicacion');
      return null;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setManualLocation(currentLocation);
      return currentLocation;
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicacion');
      return null;
    }
  };

  const loadJourneyData = async () => {
    if (!token || !user) return;

    setScreenLoading(true);
    setScreenError('');

    try {
      const [journeysResponse, lastTrackingResponse] = await Promise.all([
        apiFetch('/journeys/', { token }),
        apiFetch('/tracking/last/', { token }),
      ]);

      if (!journeysResponse.ok) {
        setScreenError('No se pudo cargar la jornada activa.');
        setJourney(null);
        return;
      }

      const journeysPayload = await parseJsonResponse<JourneyApi[] | { results?: JourneyApi[] }>(journeysResponse);
      const journeys = Array.isArray(journeysPayload) ? journeysPayload : journeysPayload.results ?? [];
      const activeJourney =
        journeys.find(
          (item) =>
            !item.end_date &&
            (item.account_user_id === user.id || item.user_id === user.profile_id || item.user_id === user.id)
        ) ?? null;

      setJourney(activeJourney);

      if (lastTrackingResponse.ok) {
        const trackingPayload = await parseJsonResponse<TrackPointApi[] | { results?: TrackPointApi[] }>(
          lastTrackingResponse
        );
        const tracks = Array.isArray(trackingPayload) ? trackingPayload : trackingPayload.results ?? [];
        const latestPoint = tracks[0] ? parsePoint(tracks[0].location) : null;

        if (latestPoint) {
          setManualLocation({
            coords: {
              latitude: latestPoint.latitude,
              longitude: latestPoint.longitude,
              accuracy: null,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as Location.LocationObject);
        }
      }

      if (!activeJourney) {
        setScreenError('No hay jornadas iniciadas.');
      }
    } catch (error) {
      setJourney(null);
      setScreenError(error instanceof Error ? error.message : 'Error cargando la jornada.');
    } finally {
      setScreenLoading(false);
    }
  };

  const currentLocation = trackedLocation ?? manualLocation;
  const startPoint = useMemo(() => parsePoint(journey?.location_start), [journey?.location_start]);
  const stopPoint = useMemo(() => parsePoint(journey?.location_stop), [journey?.location_stop]);
  const pausePoints = useMemo(() => parsePausePoints(journey?.notes), [journey?.notes]);
  const operativePoint = currentLocation
    ? parsePoint({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      })
    : null;

  const routeCoordinates = useMemo(() => {
    return uniqueValidCoordinates([
      startPoint,
      ...pausePoints.map((pausePoint) => ({
        latitude: pausePoint.latitude,
        longitude: pausePoint.longitude,
      })),
      operativePoint ?? stopPoint,
    ]);
  }, [operativePoint, pausePoints, startPoint, stopPoint]);

  const mapRegion = useMemo(() => buildRegion(routeCoordinates), [routeCoordinates]);
  const canRenderMap = routeCoordinates.length > 0;
  const canStopJourney = Boolean(journey && !journey.end_date);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !canRenderMap) {
      return;
    }

    mapRef.current.animateToRegion(mapRegion, 400);
  }, [canRenderMap, mapReady, mapRegion]);

  // Calorias estimadas y sugerencias
  const totalDistanceKm = React.useMemo(() => computeRouteDistanceKm(routeCoordinates), [routeCoordinates]);
  const durationHours = React.useMemo(() => {
    if (!journey || !journey.start_date) return 0;
    const start = new Date(journey.start_date).getTime();
    const end = journey.end_date ? new Date(journey.end_date).getTime() : Date.now();
    const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
    return hours;
  }, [journey]);

  const userWeight = (user as any)?.weightKg ?? 75; // default weight; profile can add override later
  const estimatedKcal = React.useMemo(() => estimateCalories({ distanceKm: totalDistanceKm, durationHours, weightKg: userWeight }), [totalDistanceKm, durationHours, userWeight]);
  const foodSuggestions = React.useMemo(() => suggestFoodsForCalories(estimatedKcal), [estimatedKcal]);

  const stopJourney = async () => {
    if (!token || !user) {
      Alert.alert('Sesion requerida', 'No hay una sesion activa para finalizar la jornada');
      return;
    }

    if (!canStopJourney) {
      Alert.alert('Sin jornada iniciada', 'No hay jornadas iniciadas.');
      return;
    }

    const freshLocation = currentLocation ?? (await getCurrentLocation());
    if (!freshLocation) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/journeys/stop-current/', {
        method: 'POST',
        token,
        body: JSON.stringify({
          latitude: freshLocation.coords.latitude,
          longitude: freshLocation.coords.longitude,
          end_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'No se pudo finalizar la jornada.';

        if (errorText) {
          try {
            const errorData = JSON.parse(errorText) as { detail?: string };
            errorMessage = errorData.detail ?? errorMessage;
          } catch {
            errorMessage = errorText;
          }
        }

        Alert.alert('Error', errorMessage);
        return;
      }

      const updatedJourney = await parseJsonResponse<JourneyApi>(response);
      setJourney(updatedJourney);
      await registrarFinJornadaActividad();
      stopTracking();

      Alert.alert('Exito', 'Jornada finalizada correctamente.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>

        {!screenLoading && !canStopJourney ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No hay jornadas iniciadas</Text>
            <Text style={styles.emptyText}>Inicia una jornada antes de intentar finalizarla.</Text>
          </View>
        ) : (
          <>
        <View style={styles.dateCard}>
          <Text style={styles.dateEyebrow}>Inicio de jornada</Text>
          <Text style={styles.dateValue}>{formatDate(journey?.start_date)}</Text>
          <Text style={styles.dateCaption}>
            {screenError || 'Visualiza el inicio, la posicion actual del operativo y las pausas registradas.'}
          </Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Recorrido de la jornada</Text>
            <Text style={styles.mapSubtitle}>
              {`Inicio: ${startPoint ? 1 : 0} · Pausas: ${pausePoints.length} · Ruta: ${routeCoordinates.length} puntos`}
            </Text>
          </View>

          <View style={styles.mapWrapper}>
            {screenLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.stateText}>Cargando datos de la jornada...</Text>
              </View>
            ) : canRenderMap ? (
              <>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={mapRegion}
                  mapType="standard"
                  toolbarEnabled={false}
                  showsCompass
                  showsScale
                  rotateEnabled
                  pitchEnabled={false}
                  loadingEnabled={false}
                  moveOnMarkerPress={false}
                  onMapReady={() => setMapReady(true)}
                >
                  <UrlTile
                    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                    tileSize={256}
                    zIndex={-1}
                  />

                  {startPoint ? (
                    <Marker coordinate={startPoint} title="Inicio de jornada" pinColor="#16A34A" />
                  ) : null}

                  {pausePoints.map((pausePoint) => (
                    <Marker
                      key={pausePoint.id}
                      coordinate={{ latitude: pausePoint.latitude, longitude: pausePoint.longitude }}
                      title={pausePoint.title}
                      description={pausePoint.description}
                      pinColor="#F59E0B"
                    />
                  ))}

                  {operativePoint ? (
                    <Marker coordinate={operativePoint} title="Ubicacion actual" pinColor="#2563EB" />
                  ) : null}

                  {stopPoint && !operativePoint ? (
                    <Marker coordinate={stopPoint} title="Fin de jornada" pinColor="#DC2626" />
                  ) : null}

                  {routeCoordinates.length >= 2 ? (
                    <Polyline coordinates={routeCoordinates} strokeColor="#2563EB" strokeWidth={4} />
                  ) : null}
                </MapView>

                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendStart]} />
                    <Text style={styles.legendText}>Inicio</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendPause]} />
                    <Text style={styles.legendText}>Pausas</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendRoute]} />
                    <Text style={styles.legendText}>Actual</Text>
                  </View>
                </View>
                <Text style={styles.mapAttribution}>© OpenStreetMap contributors</Text>
              </>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.stateTitle}>Sin coordenadas para mostrar</Text>
                <Text style={styles.stateText}>
                  La jornada no tiene ubicacion de inicio, posicion actual o pausas registradas todavia.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Estimación de calorías y sugerencias */}
        <View style={styles.calorieCard}>
          <Text style={styles.calorieTitle}>Estimación energética</Text>
          <Text style={styles.calorieMeta}>{`Distancia: ${totalDistanceKm.toFixed(2)} km · Duración: ${durationHours.toFixed(2)} h`}</Text>
          <Text style={styles.calorieEstimate}>{`${estimatedKcal} kcal estimadas quemadas`}</Text>

          <View style={styles.foodList}>
            {foodSuggestions.slice(0, 5).map((f, idx) => (
              <Text key={`${f.name}-${idx}`} style={styles.foodItem}>{`• ${f.name} — ${f.kcal} kcal${f.portion ? ` · ${f.portion}` : ''}`}</Text>
            ))}
          </View>
          <Text style={styles.calorieNote}>Sugerencia: combina opciones según necesidades energéticas.</Text>
        </View>

        <TouchableOpacity
          onPress={stopJourney}
          disabled={loading || screenLoading || !canStopJourney}
          style={[styles.finishButton, (loading || screenLoading || !canStopJourney) && styles.finishButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.finishButtonText}>Finalizar jornada</Text>
          )}
        </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dateEyebrow: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dateValue: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateCaption: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  mapCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  mapHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  mapSubtitle: {
    color: '#64748B',
    fontSize: 13,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  legend: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#FFFFFFE6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendStart: {
    backgroundColor: '#16A34A',
  },
  legendPause: {
    backgroundColor: '#F59E0B',
  },
  legendRoute: {
    backgroundColor: '#2563EB',
  },
  legendText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  mapAttribution: {
    position: 'absolute',
    right: 10,
    bottom: 56,
    borderRadius: 8,
    backgroundColor: '#FFFFFFD9',
    color: '#334155',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  finishButton: {
    backgroundColor: '#DC2626',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F1D1D',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  finishButtonDisabled: {
    opacity: 0.75,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  calorieCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  calorieTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  calorieMeta: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 6,
  },
  calorieEstimate: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  foodList: {
    marginBottom: 8,
  },
  foodItem: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 4,
  },
  calorieNote: {
    color: '#64748B',
    fontSize: 12,
  },
});
