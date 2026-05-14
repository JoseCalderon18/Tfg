import { getCookie } from "./csrf";

const API = import.meta.env.VITE_API_BASE_URL ?? "https://tfg-backend-jrrn.onrender.com/api";
const IS_ABSOLUTE_API = /^https?:\/\//i.test(API);

const demoPanelUser = {
  id: "demo-panel-user",
  profile_id: "demo-panel-profile",
  username: "admin-prueba",
  email: "admin@prueba.local",
  role: "ADMIN",
  is_superuser: true,
  has_panel_full_access: true,
  authenticated: true,
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (path === "/auth/panel/me/") {
    return jsonResponse(demoPanelUser);
  }

  if (path === "/auth/panel/login/" || path === "/auth/panel/logout/") {
    return jsonResponse({ ok: true, authenticated: true });
  }

  // Cogemos el token especial para evitar ataques, que usa Django
  const csrf = getCookie("csrftoken");

  // Ponemos las cabeceras que van en todas las llamadas
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (csrf) headers.set("X-CSRFToken", csrf);

  // Mandamos las cookies para mantener la sesión en el panel
  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: IS_ABSOLUTE_API ? "include" : "same-origin",
  });
}
