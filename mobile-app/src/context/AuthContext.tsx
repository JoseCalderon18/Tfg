import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiConnectionError, apiFetch, parseJsonResponse, setApiAuthHandlers } from '../services/api';

/**
 * Interface que define la estructura de un Usuario
 */
export interface User {
  id: string;
  profile_id?: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active?: boolean;
  created_at?: string;
  role?: string | null;
  emergency_contact?: string;
  emergency_phone?: string;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string;
  medical_notes?: string[];
  organization_id?: string;
  organization_name?: string;
  dni?: string;
  avatar?: string;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  birth_date?: string;
  specialties?: string[];
  operative_schedule?: string;
  operative_status?: string;
  blood_type?: string;
  device_id?: string;
  assigned_supervisor_id?: string;
}

/**
 * Interface que define el contexto de autenticacion
 * @property user - Datos del usuario autenticado
 * @property token - Token JWT de autenticacion
 * @property login - Funcion asincrona para iniciar sesion
 * @property logout - Funcion asincrona para cerrar sesion
 * @property refreshAccessToken - Renueva el token de acceso con el refresh token
 * @property isLoading - Indica si esta cargando el estado inicial
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (nextUser: User) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let secureStoreModule: SecureStoreModule | null | undefined;

function getSecureStore(): SecureStoreModule | null {
  if (secureStoreModule !== undefined) {
    return secureStoreModule;
  }

  try {
    secureStoreModule = require('expo-secure-store') as SecureStoreModule;
  } catch (error) {
    console.warn('SecureStore unavailable, falling back to AsyncStorage:', error);
    secureStoreModule = null;
  }

  return secureStoreModule;
}

async function readAuthItem(key: string): Promise<string | null> {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      return await secureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`SecureStore get failed for ${key}, using AsyncStorage fallback:`, error);
    }
  }

  return AsyncStorage.getItem(key);
}

async function writeAuthItem(key: string, value: string): Promise<void> {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      await secureStore.setItemAsync(key, value);
      return;
    } catch (error) {
      console.warn(`SecureStore set failed for ${key}, using AsyncStorage fallback:`, error);
    }
  }

  await AsyncStorage.setItem(key, value);
}

async function removeAuthItem(key: string): Promise<void> {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      await secureStore.deleteItemAsync(key);
      return;
    } catch (error) {
      console.warn(`SecureStore delete failed for ${key}, using AsyncStorage fallback:`, error);
    }
  }

  await AsyncStorage.removeItem(key);
}

async function clearStoredAuth() {
  await removeAuthItem('token');
  await removeAuthItem('refreshToken');
  await removeAuthItem('user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const clearAuthState = useCallback(async () => {
    await clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      const storedRefreshToken = await readAuthItem('refreshToken');
      if (!storedRefreshToken) {
        await clearAuthState();
        return null;
      }

      try {
        const response = await apiFetch('/auth/refresh/', {
          method: 'POST',
          body: JSON.stringify({ refresh: storedRefreshToken }),
        });

        const payload = await parseJsonResponse<{ access?: string; refresh?: string }>(response);
        if (!response.ok || !payload.access) {
          await clearAuthState();
          return null;
        }

        await writeAuthItem('token', payload.access);
        if (payload.refresh) {
          await writeAuthItem('refreshToken', payload.refresh);
        }

        setToken(payload.access);
        return payload.access;
      } catch {
        await clearAuthState();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [clearAuthState]);

  const loadStoredAuth = useCallback(async () => {
    try {
      const storedToken = await readAuthItem('token');
      const storedUser = await readAuthItem('user');

      if (!storedToken || !storedUser) {
        setToken(null);
        setUser(null);
        return;
      }

      try {
        let activeToken = storedToken;
        let response = await apiFetch('/auth/me/', { token: activeToken, timeoutMs: 8000 });

        if (response.status === 401) {
          const refreshedToken = await refreshAccessToken();
          if (!refreshedToken) {
            return;
          }

          activeToken = refreshedToken;
          response = await apiFetch('/auth/me/', { token: activeToken, timeoutMs: 8000 });
        }

        if (!response.ok) {
          await clearAuthState();
          return;
        }

        const currentUser = await parseJsonResponse<User>(response);
        setToken(activeToken);
        setUser(currentUser);
      } catch {
        await clearAuthState();
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      await clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState, refreshAccessToken]);

  useEffect(() => {
    void loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    setApiAuthHandlers({ refreshAccessToken });
    return () => {
      setApiAuthHandlers(null);
    };
  }, [refreshAccessToken]);

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

    if (payload.refresh) {
      await writeAuthItem('refreshToken', payload.refresh);
    }

    let currentUser = payload.user;
    try {
      const currentUserResponse = await apiFetch('/auth/me/', { token: payload.access, timeoutMs: 8000 });
      if (currentUserResponse.ok) {
        currentUser = await parseJsonResponse<User>(currentUserResponse);
      }
    } catch {
      // El login ya trae usuario; si el refresco falla, mantenemos ese payload.
    }

    await writeAuthItem('token', payload.access);
    await writeAuthItem('user', JSON.stringify(currentUser));

    setToken(payload.access);
    setUser(currentUser);
  };

  const logout = async () => {
    await clearAuthState();
  };

  const updateUser = useCallback(async (nextUser: User) => {
    await writeAuthItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, refreshAccessToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
