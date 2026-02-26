import { create } from "zustand";
import { apiFetch } from "../utils/api";

interface User {
  id: string;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,

  login: async (email: string, password: string) => {
    const csrfBootstrap = await apiFetch("/auth/panel/login/", { method: "GET" });
    if (!csrfBootstrap.ok) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    const body = new URLSearchParams();
    body.append("email", email.trim().toLowerCase());
    body.append("password", password);

    const loginRes = await apiFetch("/auth/panel/login/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!loginRes.ok) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    const meRes = await apiFetch("/auth/panel/me/");
    if (!meRes.ok) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    const me = await meRes.json();
    const isSupervisor = me?.role === "SUPERVISOR";
    if (!isSupervisor) {
      set({ user: null, isAuthenticated: false });
      return false;
    }

    set({
      isAuthenticated: true,
      user: {
        id: me.id ?? "",
        username: me.username ?? "",
        email: me.email ?? "",
        role: me.role,
      },
    });
    return true;
  },

  logout: async () => {
    await apiFetch("/auth/panel/logout/", { method: "POST" });
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await apiFetch("/auth/panel/me/");
      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return;
      }

      const me = await res.json();
      const isSupervisor = me?.role === "SUPERVISOR";

      if (!isSupervisor) {
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return;
      }

      set({
        isAuthenticated: true,
        isCheckingAuth: false,
        user: {
          id: me.id ?? "",
          username: me.username ?? "",
          email: me.email ?? "",
          role: me.role,
        },
      });
    } catch {
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },
}));
