import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Interface que define la estructura de un Usuario
 * @property id - Identificador único del usuario
 * @property username - Nombre de usuario
 * @property email - Correo electrónico
 * @property role - Rol del usuario (SUPERVISOR, OPERATIVE, etc.)
 */
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

/**
 * Interface que define el estado y acciones de autenticación
 * @property user - Datos del usuario autenticado (null si no hay sesión)
 * @property token - Token JWT de autenticación
 * @property isAuthenticated - Indica si hay una sesión activa
 * @property login - Función para iniciar sesión
 * @property logout - Función para cerrar sesión
 * @property checkAuth - Función para verificar autenticación almacenada
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

/**
 * Store de Zustand para manejo de autenticación
 * 
 * Utiliza persist middleware para guardar el estado en localStorage.
 * Esto permite mantener la sesión activa aunque se recargue la página.
 * 
 * @example
 * const { user, login, logout } = useAuthStore();
 * await login('usuario', 'contraseña');
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Estado inicial
      user: null,
      token: null,
      isAuthenticated: false,
      
      /**
       * Inicia sesión con credenciales
       * TODO: Implementar llamada real a la API
       * @param username - Nombre de usuario
       * @param password - Contraseña
       */
      login: async (username: string, password: string) => {
        console.log('Login:', username, password);
        set({ 
          user: { id: '1', username, email: '', role: 'SUPERVISOR' },
          token: 'fake-token',
          isAuthenticated: true 
        });
      },
      
      /**
       * Cierra la sesión del usuario
       * Limpia todos los datos de autenticación
       */
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      /**
       * Verifica si hay una sesión guardada
       * Se ejecuta al cargar la aplicación
       */
      checkAuth: () => {
        // Verificar autenticación almacenada (persist la maneja automáticamente)
      },
    }),
    {
      name: 'auth-storage', // Nombre en localStorage
    }
  )
);
