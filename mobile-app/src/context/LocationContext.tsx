import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { User, useAuth } from './AuthContext';
import { useOfflineSync } from './OfflineSyncContext';
import { apiFetch, parseJsonResponse } from '../services/api';

const BACKGROUND_WORKAREA_TASK = 'background-workarea-detection';

type BackgroundLocationTaskData = {
  locations?: Location.LocationObject[];
};

async function sendBackgroundLocationUpdate(nextLocation: Location.LocationObject) {
  const storedToken = await SecureStore.getItemAsync('token');
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
  }
});

/**
 * Interface que define el contexto de ubicación
 * @property location - Objeto con la última ubicación conocida
 * @property isTracking - Indica si el seguimiento está activo
 * @property startTracking - Inicia el seguimiento de ubicación
 * @property stopTracking - Detiene el seguimiento de ubicación
 * @property errorMsg - Mensaje de error si ocurre alguno
 */
interface LocationContextType {
  location: Location.LocationObject | null;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  refreshWorkareaDetection: () => Promise<GeofenceStatus | null>;
  errorMsg: string | null;
  isCheckingWorkarea: boolean;
  geofenceStatus: GeofenceStatus;
}

type GeofenceStatus = {
  inside: boolean;
  hasWorkarea: boolean;
  message: string | null;
  alertId?: string | null;
};

// Creación del contexto de ubicación
const LocationContext = createContext<LocationContextType | undefined>(undefined);

/**
 * Provider que maneja el seguimiento de ubicación GPS
 * Permite rastrear la posición del operativo en tiempo real
 * 
 * @param children - Componentes hijos que tendrán acceso al contexto
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  // Estado del seguimiento GPS y errores de permisos/envío.
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
  const { token, updateUser } = useAuth();
  const { queueTrackingPoint } = useOfflineSync();

  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

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

    const result = await queueTrackingPoint({
      latitude: nextLocation.coords.latitude,
      longitude: nextLocation.coords.longitude,
      accuracy_m: nextLocation.coords.accuracy,
      altitude: nextLocation.coords.altitude,
      speed: nextLocation.coords.speed,
      recorded_at: new Date(nextLocation.timestamp).toISOString(),
    });

    if (!result.ok) {
      setErrorMsg(result.error ?? 'No se pudo enviar la ubicacion al servidor.');
      return;
    }

    if (result.queued) {
      setErrorMsg('Sin conexion: la ubicacion queda guardada para sincronizarse luego.');
      return;
    }

    setErrorMsg(null);
  };

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

  const startBackgroundWorkareaDetection = async () => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
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
   * Inicia el seguimiento continuo de la ubicación
   * Actualiza cada 5 segundos o cada 10 metros de movimiento
   * 
   * TODO: Enviar ubicación al backend en cada actualización
   */
  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsTracking(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      await syncProfileLocation(currentLocation);
      await sendTrackingPoint(currentLocation);
      await checkWorkareaPosition(currentLocation);
      await startBackgroundWorkareaDetection();

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,  // Alta precisión
          timeInterval: 5000,                // Actualizar cada 5 segundos
          distanceInterval: 10,              // O cada 10 metros
        },
        async (newLocation) => {
          setLocation(newLocation);
          await sendTrackingPoint(newLocation);
          await checkWorkareaPosition(newLocation);
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
   * Detiene el seguimiento de ubicación
   * Elimina la suscripción a las actualizaciones de GPS
   */
  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    void stopBackgroundWorkareaDetection();
    setIsTracking(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        isTracking,
        startTracking,
        stopTracking,
        refreshWorkareaDetection,
        errorMsg,
        isCheckingWorkarea,
        geofenceStatus,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook personalizado para acceder al contexto de ubicación
 * 
 * @returns El contexto de ubicación
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
