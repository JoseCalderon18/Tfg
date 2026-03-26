import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiConnectionError, apiFetch, parseJsonResponse } from '../services/api';

/**
 * Interface que define la estructura de un Usuario
 */
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

/**
 * Interface que define el contexto de autenticacion
 * @property user - Datos del usuario autenticado
 * @property token - Token JWT de autenticacion
 * @property login - Funcion asincrona para iniciar sesion
 * @property logout - Funcion asincrona para cerrar sesion
 * @property isLoading - Indica si esta cargando el estado inicial
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

// Creacion del contexto de autenticacion
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider que envuelve la aplicacion y proporciona el contexto de autenticacion
 * Maneja el estado de sesion del usuario y persistencia en almacenamiento seguro
 *
 * @param children - Componentes hijos que tendran acceso al contexto
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado global de autenticacion para la app movil
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar autenticacion almacenada al iniciar
  useEffect(() => {
    loadStoredAuth();
  }, []);

  /**
   * Carga el token y usuario almacenados en SecureStore
   * Se ejecuta automaticamente al montar el provider
   */
  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Inicia sesion con credenciales
   *
   * @param username - Nombre de usuario
   * @param password - Contrasena
   */
  const login = async (username: string, password: string) => {
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password.trim()) {
      throw new Error('Introduce usuario y contrasena.');
    }

    let response: Response;

    try {
      response = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });
    } catch (error) {
      const detalle =
        error instanceof Error && error.name === 'AbortError'
          ? 'El servidor tardo demasiado en responder.'
          : 'No se pudo conectar con el servidor.';
      const urlsProbadas =
        error instanceof ApiConnectionError && error.attemptedUrls.length > 0
          ? ` URLs probadas: ${error.attemptedUrls.join(', ')}.`
          : '';

      throw new Error(
        `${detalle} Comprueba que el backend esta levantado en el puerto 8000 y ejecutandose en 0.0.0.0:8000 si accedes desde red local.${urlsProbadas} Si usas un movil Android por USB, ejecuta "adb reverse tcp:8000 tcp:8000". Si usas el emulador de Android, configura EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000.`
      );
    }

    const payload = await parseJsonResponse<{
      access?: string;
      refresh?: string;
      user?: User;
      error?: string;
    }>(response);

    if (!response.ok || !payload.access || !payload.user) {
      throw new Error(payload.error ?? 'No se pudo iniciar sesion.');
    }

    await SecureStore.setItemAsync('token', payload.access);
    await SecureStore.setItemAsync('user', JSON.stringify(payload.user));

    if (payload.refresh) {
      await SecureStore.setItemAsync('refreshToken', payload.refresh);
    }

    setToken(payload.access);
    setUser(payload.user);
  };

  /**
   * Cierra la sesion del usuario
   * Elimina los datos del almacenamiento seguro y limpia el estado
   */
  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook personalizado para acceder al contexto de autenticacion
 *
 * @returns El contexto de autenticacion
 * @throws Error si se usa fuera de AuthProvider
 *
 * @example
 * const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
