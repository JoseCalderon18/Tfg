import { getCookie } from "./csrf";

const API = import.meta.env.VITE_API_BASE_URL ?? "/api";
const IS_ABSOLUTE_API = /^https?:\/\//i.test(API);

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Leemos token CSRF para endpoints de sesion en Django
  const csrf = getCookie("csrftoken");

  // Construimos headers comunes para todas las peticiones
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (csrf) headers.set("X-CSRFToken", csrf);

  // Enviamos cookies de sesion para panel web
  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: IS_ABSOLUTE_API ? "include" : "same-origin",
  });
}
