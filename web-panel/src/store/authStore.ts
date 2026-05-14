import { create } from "zustand";

interface User {
  id: string;
  profile_id?: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const demoUser: User = {
  id: "demo-panel-user",
  profile_id: "demo-panel-profile",
  username: "admin-prueba",
  email: "admin@prueba.local",
  role: "ADMIN",
};

export const useAuthStore = create<AuthState>((set) => ({
  // Autenticacion desactivada para pruebas: el panel entra siempre con usuario demo.
  user: demoUser,
  isAuthenticated: true,
  isCheckingAuth: false,

  login: async () => {
    set({ user: demoUser, isAuthenticated: true, isCheckingAuth: false });
    return true;
  },

  logout: async () => {
    set({ user: demoUser, isAuthenticated: true, isCheckingAuth: false });
  },

  checkAuth: async () => {
    set({ user: demoUser, isAuthenticated: true, isCheckingAuth: false });
  },
}));
