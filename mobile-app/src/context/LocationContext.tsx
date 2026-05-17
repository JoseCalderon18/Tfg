import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking } from 'react-native';
import { User, useAuth } from './AuthContext';
import { useOfflineSync } from './OfflineSyncContext';
import { apiFetch, parseJsonResponse, API_BASE_URL } from '../services/api';
import { computeRouteDistanceKm, estimateCalories, suggestFoodsForCalories } from '../services/calories';
import {
  procesarInmovilidadSegundoPlano,
  registrarPuntoMovimientoJornada,
} from '../services/journeyActivity';

const BACKGROUND_WORKAREA_TASK = 'background-workarea-detection';

type BackgroundLocationTaskData = {
  locations?: Location.LocationObject[];
};

async function sendBackgroundLocationUpdate(nextLocation: Location.LocationObject) {
  const storedToken = await SecureStore.getItemAsync('token');
  const storedIncident = await SecureStore.getItemAsync('activeIncidentId');
  if (!storedToken) {
    return;
  }

  const payload = {
    latitude: nextLocation.coords.latitude,
    longitude: nextLocation.coords.longitude,
    accuracy_m: nextLocation.coords.accuracy,
    altitude: nextLocation.coords.altitude,
    speed: nextLocation.coords.speed,
    recorded_at: new Date(nextLocation.timestamp).toISOString(),
    incident: storedIncident ?? null,
  };

  await apiFetch('/tracking/point/', {
    method: 'POST',
    token: storedToken,
    body: JSON.stringify(payload),
    timeoutMs: 10000,
  });

  await apiFetch('/workareas/check-position/', {
    method: 'POST',
    token: storedToken,
    body: JSON.stringify({
      lat: nextLocation.coords.latitude,
      lng: nextLocation.coords.longitude,
    }),
    timeoutMs: 10000,
  });
}

TaskManager.defineTask(BACKGROUND_WORKAREA_TASK, ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as BackgroundLocationTaskData | undefined)?.locations ?? [];
  const lastLocation = locations[locations.length - 1];

  if (lastLocation) {
    void sendBackgroundLocationUpdate(lastLocation).catch(() => undefined);
    void procesarInmovilidadSegundoPlano(lastLocation).catch(() => undefined);
  }
});

/**
 * Interface que define el contexto de ubicacion
 * @property location - Objeto con la ultima ubicacion conocida
 * @property isTracking - Indica si el seguimiento esta activo
 * @property startTracking - Inicia el seguimiento de ubicacion
 * @property stopTracking - Detiene el seguimiento de ubicacion
 * @property errorMsg - Mensaje de error si ocurre alguno
 */
interface LocationContextType {
  location: Location.LocationObject | null;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  foregroundPermissionStatus: Location.PermissionStatus | null;
  backgroundPermissionStatus: Location.PermissionStatus | null;
  hasRequiredLocationPermissions: boolean;
  refreshLocationPermissions: () => Promise<void>;
  requestLocationPermissions: () => Promise<boolean>;
  openLocationSettings: () => Promise<void>;
  refreshWorkareaDetection: () => Promise<GeofenceStatus | null>;
  errorMsg: string | null;
  isCheckingWorkarea: boolean;
  geofenceStatus: GeofenceStatus;
  // Live calorie/distance info while tracking
  routeDistanceKm: number;
  routeDurationHours: number;
  estimatedKcal: number;
  foodSuggestions: Array<{ name: string; kcal: number; portion?: string }>;
  shiftHoursLimit: number;
  isOverShift: boolean;
  fatigueWarningMessage: string | null;
  // compañeros en tiempo real
  colleaguesPositions: Record<string, { user_id: string; display_name: string; latitude: number; longitude: number; accuracy?: number | null; timestamp?: string | null }>;
  setActiveIncident: (incidentId: string | null) => Promise<void>;
}

type GeofenceStatus = {
  inside: boolean;
  hasWorkarea: boolean;
  message: string | null;
  alertId?: string | null;
};

const FATIGUE_ALERT_MESSAGES = [
  'Has superado el horario de jornada. Tu cuerpo pide agua, pausa y un poco de compasion. Seguir ahora es una mala idea.',
  'Ya vas fuera de horas. Tu energia esta haciendo horas extra sin pedir permiso y eso es peligroso.',
  'Aviso de cansancio: vas por encima de la jornada. Baja el ritmo antes de que tu cerebro empiece a negociar con una siesta.',
  'Te has pasado de turno. Tu reloj sigue trabajando, pero tus piernas ya estan en modo descanso.',
  'Zona roja de fatiga: llevar mas horas no te hace mas duro, solo mas cansado y mas expuesto a errores.',
];

function extractShiftHours(schedule?: string) {
  if (!schedule) {
    return 8;
  }

  const match = schedule.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    return 8;
  }

  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 8;
}

// Creacion del contexto de ubicacion
const LocationContext = createContext<LocationContextType | undefined>(undefined);

/**
 * Provider que maneja el seguimiento de ubicacion GPS
 * Permite rastrear la posicion del operativo en tiempo real
 * 
 * @param children - Componentes hijos que tendran acceso al contexto
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  // Estado del seguimiento GPS y errores de permisos/envio.
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingWorkarea, setIsCheckingWorkarea] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceStatus>({
    inside: true,
    hasWorkarea: false,
    message: null,
    alertId: null,
  });
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [routePoints, setRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeStartTime, setRouteStartTime] = useState<number | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [routeDurationHours, setRouteDurationHours] = useState<number>(0);
  const [estimatedKcal, setEstimatedKcal] = useState<number>(0);
  const [foodSuggestions, setFoodSuggestions] = useState<Array<{ name: string; kcal: number; portion?: string }>>([]);
  const [foregroundPermissionStatus, setForegroundPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [backgroundPermissionStatus, setBackgroundPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const { token, updateUser, user } = useAuth();
  const { queueTrackingPoint, queueAlert } = useOfflineSync();
  const fatigueAlertSentRef = useRef(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const routeStartTimeRef = useRef<number | null>(null);

  const shiftHoursLimit = useMemo(() => extractShiftHours(user?.operative_schedule), [user?.operative_schedule]);
  const isOverShift = routeDurationHours >= shiftHoursLimit && shiftHoursLimit > 0;
  const hasRequiredLocationPermissions =
    foregroundPermissionStatus === Location.PermissionStatus.GRANTED &&
    backgroundPermissionStatus === Location.PermissionStatus.GRANTED;
  const fatigueWarningMessage = isOverShift
    ? `Has superado el limite de ${shiftHoursLimit} h de jornada. Ojo: el cansancio ya no es una broma, es un riesgo.`
    : null;

  useEffect(() => {
    void refreshLocationPermissions();
  }, []);

  useEffect(() => {
    if (!isTracking || fatigueAlertSentRef.current) {
      return;
    }

    if (!location) {
      return;
    }

    if (routeDurationHours < shiftHoursLimit) {
      return;
    }

    fatigueAlertSentRef.current = true;
    const overHours = Math.max(0, routeDurationHours - shiftHoursLimit);
    const message = FATIGUE_ALERT_MESSAGES[Math.min(FATIGUE_ALERT_MESSAGES.length - 1, Math.floor(overHours * 2))];

    const sendFatigueAlert = async () => {
      try {
        if (!token) {
          return;
        }

        const result = await queueAlert({
          alert_type: 'OTHER',
          severity: 2,
          title: 'Demasiadas horas de jornada',
          description: message,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });

        if (result.ok) {
          Alert.alert(
            'Jornada demasiado larga',
            `${message}\n\n${result.queued ? 'Se ha guardado para enviarse cuando vuelva la conexion.' : 'La alerta se ha enviado correctamente.'}`
          );
        }
      } catch {
        fatigueAlertSentRef.current = false;
      }
    };

    void sendFatigueAlert();
  }, [isTracking, location, queueAlert, routeDurationHours, shiftHoursLimit, token]);

  useEffect(() => {
    locationSubscriptionRef.current = locationSubscription;
  }, [locationSubscription]);

  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }

      void stopBackgroundWorkareaDetection();
    };
  }, []);

  const syncProfileLocation = async (nextLocation: Location.LocationObject) => {
    if (!token) {
      return;
    }

    const response = await apiFetch('/auth/me/', {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        location_lat: nextLocation.coords.latitude,
        location_lng: nextLocation.coords.longitude,
      }),
    });

    if (!response.ok) {
      throw new Error('No se pudo guardar la ubicacion actual en el perfil.');
    }

    const updatedUser = await parseJsonResponse<User>(response);
    await updateUser(updatedUser);
  };

  const sendTrackingPoint = async (nextLocation: Location.LocationObject) => {
    if (!token) {
      return;
    }

    const payload: any = {
      latitude: nextLocation.coords.latitude,
      longitude: nextLocation.coords.longitude,
      accuracy_m: nextLocation.coords.accuracy,
      altitude: nextLocation.coords.altitude,
      speed: nextLocation.coords.speed,
      recorded_at: new Date(nextLocation.timestamp).toISOString(),
    };

    if (activeIncidentId) {
      payload.incident = activeIncidentId;
    }

    const result = await queueTrackingPoint(payload);

    if (!result.ok) {
      setErrorMsg(result.error ?? 'No se pudo enviar la ubicacion al servidor.');
      return;
    }

    if (result.queued) {
      setErrorMsg('Sin conexion: la ubicacion queda guardada para sincronizarse luego.');
      void registrarPuntoMovimientoJornada({
        latitude: nextLocation.coords.latitude,
        longitude: nextLocation.coords.longitude,
      }).catch(() => undefined);
      return;
    }

    void registrarPuntoMovimientoJornada({
      latitude: nextLocation.coords.latitude,
      longitude: nextLocation.coords.longitude,
    }).catch(() => undefined);
    setErrorMsg(null);
  };

  // Real-time colleagues positions via WebSocket
  const [colleaguesPositions, setColleaguesPositions] = useState<Record<string, { user_id: string; display_name: string; latitude: number; longitude: number; accuracy?: number | null; timestamp?: string | null }>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let closed = false;

    const connectWs = async () => {
      if (!token || !activeIncidentId) return;

      // derive ws url from API_BASE_URL
      try {
        const base = API_BASE_URL.replace(/\/api\/?$/, '');
        const wsScheme = base.startsWith('https') ? 'wss' : 'ws';
        const hostPart = base.replace(/^https?:/, '');
        const wsUrl = `${wsScheme}:${hostPart}/ws/locations/`;

        if (wsRef.current) {
          try { wsRef.current.close(); } catch {}
          wsRef.current = null;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ action: 'auth', token }));
          ws.send(JSON.stringify({ action: 'subscribe', incident_id: activeIncidentId }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'position.update' && msg.payload) {
              const p = msg.payload;
                  setColleaguesPositions((prev) => ({
                    ...prev,
                    [p.user_id]: {
                      user_id: p.user_id,
                      display_name: p.display_name ?? '',
                      latitude: Number(p.latitude),
                      longitude: Number(p.longitude),
                      accuracy: p.accuracy ?? null,
                      timestamp: p.timestamp ?? null,
                    },
                  }));
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (closed) return;
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current as any);
          reconnectTimeoutRef.current = setTimeout(() => {
            void connectWs();
          }, 2000) as unknown as number;
        };

        ws.onerror = () => {
          // noop
        };
      } catch {
        if (closed) return;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current as any);
        reconnectTimeoutRef.current = setTimeout(() => {
          void connectWs();
        }, 3000) as unknown as number;
      }
    };

    void connectWs();

    return () => {
      closed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current as any);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [token, activeIncidentId]);

  // Prune stale colleague positions periodically
  useEffect(() => {
    const PRUNE_MS = 3 * 60 * 1000; // 3 minutes for pruning
    const interval = setInterval(() => {
      setColleaguesPositions((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        let changed = false;
        Object.entries(prev).forEach(([k, v]) => {
          if (!v.timestamp) {
            next[k] = v;
            return;
          }
          const ts = Date.parse(v.timestamp);
          if (Number.isNaN(ts)) {
            next[k] = v;
            return;
          }

          const age = now - ts;
          // prune if older than PRUNE_MS
          if (age <= PRUNE_MS) {
            next[k] = v;
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkWorkareaPosition = async (nextLocation: Location.LocationObject): Promise<GeofenceStatus | null> => {
    if (!token) {
      return null;
    }

    try {
      const response = await apiFetch('/workareas/check-position/', {
        method: 'POST',
        token,
        body: JSON.stringify({
          lat: nextLocation.coords.latitude,
          lng: nextLocation.coords.longitude,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = await parseJsonResponse<{
        inside: boolean;
        has_workarea: boolean;
        message?: string;
        alert_id?: string | null;
      }>(response);

      const nextStatus = {
        inside: payload.inside,
        hasWorkarea: payload.has_workarea,
        message: payload.message ?? null,
        alertId: payload.alert_id ?? null,
      };

      setGeofenceStatus(nextStatus);
      return nextStatus;
    } catch {
      // La perdida puntual de conexion no debe detener el tracking.
      return null;
    }
  };

  const refreshWorkareaDetection = async () => {
    try {
      setIsCheckingWorkarea(true);
      const nextLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(nextLocation);
      await sendTrackingPoint(nextLocation);
      return await checkWorkareaPosition(nextLocation);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo actualizar la deteccion del workarea.');
      return null;
    } finally {
      setIsCheckingWorkarea(false);
    }
  };

  const refreshLocationPermissions = async () => {
    const [foreground, background] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);

    setForegroundPermissionStatus(foreground.status);
    setBackgroundPermissionStatus(background.status);
  };

  const requestLocationPermissions = async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    setForegroundPermissionStatus(foreground.status);

    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      setErrorMsg('El seguimiento necesita permiso de ubicacion mientras usas la app.');
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    setBackgroundPermissionStatus(background.status);

    if (background.status !== Location.PermissionStatus.GRANTED) {
      setErrorMsg('El seguimiento en segundo plano necesita permiso de ubicacion siempre activa.');
      Alert.alert(
        'Permiso de ubicacion siempre activa',
        'Android no siempre muestra este permiso dentro de la app. En la pantalla de ajustes, entra en Permisos > Ubicacion y selecciona "Permitir todo el tiempo".',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const openLocationSettings = async () => {
    await Linking.openSettings();
  };

  const startBackgroundWorkareaDetection = async () => {
    const { status } = await Location.getBackgroundPermissionsAsync();
    setBackgroundPermissionStatus(status);
    if (status !== Location.PermissionStatus.GRANTED) {
      setErrorMsg('El seguimiento en segundo plano necesita permiso de ubicacion siempre activa.');
      return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_WORKAREA_TASK);
    if (hasStarted) {
      return;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_WORKAREA_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Emergencias',
        notificationBody: 'Comprobando area de trabajo en segundo plano.',
        notificationColor: '#DC2626',
      },
    });
  };

  const stopBackgroundWorkareaDetection = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_WORKAREA_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_WORKAREA_TASK);
    }
  };

  /**
   * Inicia el seguimiento continuo de la ubicacion
   * Actualiza cada 5 segundos o cada 10 metros de movimiento
   * 
   * TODO: Enviar ubicacion al backend en cada actualizacion
   */
  const startTracking = async () => {
    try {
      fatigueAlertSentRef.current = false;
      const hasPermissions = await requestLocationPermissions();
      if (!hasPermissions) {
        setIsTracking(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      // initialize route tracking
      const startedAtMs = Date.now();
      setRoutePoints([{ latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude }]);
      setRouteStartTime(startedAtMs);
      routeStartTimeRef.current = startedAtMs;
      setRouteDistanceKm(0);
      setRouteDurationHours(0);
      setEstimatedKcal(0);
      setFoodSuggestions([]);
      await syncProfileLocation(currentLocation);
      await sendTrackingPoint(currentLocation);
      await checkWorkareaPosition(currentLocation);
      await startBackgroundWorkareaDetection();

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,  // Alta precision
          timeInterval: 5000,                // Actualizar cada 5 segundos
          distanceInterval: 10,              // O cada 10 metros
        },
        async (newLocation) => {
          setLocation(newLocation);
          await sendTrackingPoint(newLocation);
          await checkWorkareaPosition(newLocation);

          // Update route points and live metrics
          setRoutePoints((prev) => {
            const next = prev.concat({ latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude });
            const dist = computeRouteDistanceKm(next);
            setRouteDistanceKm(dist);

            const start = routeStartTimeRef.current ?? Date.now();
            const durationMs = Date.now() - start;
            const durationH = Math.max(0, durationMs / (1000 * 60 * 60));
            setRouteDurationHours(durationH);

            // Use authenticated user's weight if available
            const userWeight = (user as any)?.weightKg ?? (user as any)?.weight_kg ?? 75;
            const kcal = estimateCalories({ distanceKm: dist, durationHours: durationH, weightKg: userWeight });
            setEstimatedKcal(kcal);
            setFoodSuggestions(suggestFoodsForCalories(kcal));

            return next;
          });
        }
      );
      setLocationSubscription(subscription);
      setIsTracking(true);
      setErrorMsg(null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Error starting tracking');
      setIsTracking(false);
    }
  };

  /**
   * Detiene el seguimiento de ubicacion
   * Elimina la suscripcion a las actualizaciones de GPS
   */
  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    void stopBackgroundWorkareaDetection();
    fatigueAlertSentRef.current = false;
    setRoutePoints([]);
    setRouteStartTime(null);
    routeStartTimeRef.current = null;
    setRouteDistanceKm(0);
    setRouteDurationHours(0);
    setEstimatedKcal(0);
    setFoodSuggestions([]);
    setIsTracking(false);
  };

  const setActiveIncident = async (incidentId: string | null) => {
    setActiveIncidentId(incidentId);
    try {
      if (incidentId) {
        await SecureStore.setItemAsync('activeIncidentId', incidentId);
      } else {
        await SecureStore.deleteItemAsync('activeIncidentId');
      }
    } catch {
      // ignore storage errors
    }
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        isTracking,
        startTracking,
        stopTracking,
        setActiveIncident,
        activeIncidentId,
        colleaguesPositions,
        foregroundPermissionStatus,
        backgroundPermissionStatus,
        hasRequiredLocationPermissions,
        refreshLocationPermissions,
        requestLocationPermissions,
        openLocationSettings,
        refreshWorkareaDetection,
        errorMsg,
        isCheckingWorkarea,
        geofenceStatus,
        routeDistanceKm,
        routeDurationHours,
        estimatedKcal,
        foodSuggestions,
        shiftHoursLimit,
        isOverShift,
        fatigueWarningMessage,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook personalizado para acceder al contexto de ubicacion
 * 
 * @returns El contexto de ubicacion
 * @throws Error si se usa fuera de LocationProvider
 * 
 * @example
 * const { location, isTracking, startTracking } = useLocation();
 */
export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};
