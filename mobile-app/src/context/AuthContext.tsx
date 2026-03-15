import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch, parseJsonResponse } from '../services/api';

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
 * Interface que define el contexto de autenticación
 * @property user - Datos del usuario autenticado
 * @property token - Token JWT de autenticación
 * @property login - Función asíncrona para iniciar sesión
 * @property logout - Función asíncrona para cerrar sesión
 * @property isLoading - Indica si está cargando el estado inicial
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

// Creación del contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider que envuelve la aplicación y proporciona el contexto de autenticación
 * Maneja el estado de sesión del usuario y persistencia en almacenamiento seguro
 * 
 * @param children - Componentes hijos que tendrán acceso al contexto
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado global de autenticación para la app móvil
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar autenticación almacenada al iniciar
  useEffect(() => {
    loadStoredAuth();
  }, []);

  /**
   * Carga el token y usuario almacenados en SecureStore
   * Se ejecuta automáticamente al montar el provider
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
   * Inicia sesión con credenciales
   * 
   * @param username - Nombre de usuario
   * @param password - Contraseña
   */
  const login = async (username: string, password: string) => {
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password.trim()) {
      throw new Error('Introduce usuario y contraseña.');
    }

    const response = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        username: normalizedUsername,
        password,
      }),
    });

    const payload = await parseJsonResponse<{
      access?: string;
      refresh?: string;
      user?: User;
      error?: string;
    }>(response);

    if (!response.ok || !payload.access || !payload.user) {
      throw new Error(payload.error ?? 'No se pudo iniciar sesión.');
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
   * Cierra la sesión del usuario
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
 * Hook personalizado para acceder al contexto de autenticación
 * 
 * @returns El contexto de autenticación
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
