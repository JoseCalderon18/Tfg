import { create } from "zustand";
import { apiFetch, setCsrfToken } from "../utils/api";

interface User {
  id: string;
  profile_id?: string;
  username: string;
  email: string;
  role: string;
}

interface PanelMeResponse {
  id?: string;
  profile_id?: string | null;
  username?: string;
  email?: string;
  role?: string;
  is_superuser?: boolean;
  has_panel_full_access?: boolean;
}

interface PanelCsrfResponse {
  csrfToken?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Aquí ponemos cómo empezamos, sin usuario y verificando si está logueado
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,

  login: async (email: string, password: string) => {
    // Primero, pedimos una cookie especial para poder hacer login seguro
    const csrfBootstrap = await apiFetch("/auth/panel/login/", { method: "GET" });
    if (!csrfBootstrap.ok) {
      set({ user: null, isAuthenticated: false });
      return false;
    }
    const csrfData = (await csrfBootstrap.json().catch(() => ({}))) as PanelCsrfResponse;
    const csrfToken = csrfData.csrfToken ?? "";
    setCsrfToken(csrfToken);

    // Después, mandamos el email y contraseña del supervisor
    const body = new URLSearchParams();
    body.append("email", email.trim().toLowerCase());
    body.append("password", password);

    const loginRes = await apiFetch("/auth/panel/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body,
    });

    if (!loginRes.ok) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    // Finalmente, comprobamos que la sesión es válida y que tiene permisos para el panel
    const meRes = await apiFetch("/auth/panel/me/");
    if (!meRes.ok) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    const me = (await meRes.json()) as PanelMeResponse;
    const hasPanelAccess = Boolean(me?.has_panel_full_access);
    if (!hasPanelAccess) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    set({
      isAuthenticated: true,
      user: {
        id: me.id ?? "",
        profile_id: me.profile_id ?? "",
        username: me.username ?? "",
        email: me.email ?? "",
        role: me.role ?? (me.is_superuser ? "SUPERUSER" : ""),
      },
    });
    return true;
  },

  logout: async () => {
    // Cerramos la sesión en el servidor y limpiamos todo aquí
    await apiFetch("/auth/panel/logout/", { method: "POST" }).catch(() => undefined);
    setCsrfToken("");
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    // Al abrir la app, vemos si ya hay una sesión activa
    set({ isCheckingAuth: true });
    try {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return;
      }

      const me = (await res.json()) as PanelMeResponse;
      const hasPanelAccess = Boolean(me?.has_panel_full_access);

      if (!hasPanelAccess) {
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return;
      }

      set({
        isAuthenticated: true,
        isCheckingAuth: false,
        user: {
          id: me.id ?? "",
          profile_id: me.profile_id ?? "",
          username: me.username ?? "",
          email: me.email ?? "",
          role: me.role ?? (me.is_superuser ? "SUPERUSER" : ""),
        },
      });
    } catch {
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },
}));
