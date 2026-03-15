import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { apiFetch } from '../services/api';

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
  errorMsg: string | null;
}

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
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const { token } = useAuth();

  // Solicitar permisos al montar el componente
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
    })();

    // Cleanup: Detener seguimiento al desmontar
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  /**
   * Inicia el seguimiento continuo de la ubicación
   * Actualiza cada 5 segundos o cada 10 metros de movimiento
   * 
   * TODO: Enviar ubicación al backend en cada actualización
   */
  const startTracking = async () => {
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,  // Alta precisión
          timeInterval: 5000,                // Actualizar cada 5 segundos
          distanceInterval: 10,              // O cada 10 metros
        },
        async (newLocation) => {
          setLocation(newLocation);

          if (!token) {
            return;
          }

          try {
            await apiFetch('/tracking/point/', {
              method: 'POST',
              token,
              body: JSON.stringify({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                accuracy_m: newLocation.coords.accuracy,
                altitude: newLocation.coords.altitude,
                speed: newLocation.coords.speed,
                recorded_at: new Date(newLocation.timestamp).toISOString(),
              }),
            });
            setErrorMsg(null);
          } catch {
            setErrorMsg('No se pudo enviar la ubicación al servidor.');
          }
        }
      );
      setLocationSubscription(subscription);
      setIsTracking(true);
    } catch (error) {
      setErrorMsg('Error starting tracking');
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
    setIsTracking(false);
  };

  return (
    <LocationContext.Provider value={{ location, isTracking, startTracking, stopTracking, errorMsg }}>
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
