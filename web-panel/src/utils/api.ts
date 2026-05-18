import { getCookie } from "./csrf";

const API = import.meta.env.VITE_API_BASE_URL ?? "https://tfg-backend-jrrn.onrender.com/api";
const IS_ABSOLUTE_API = /^https?:\/\//i.test(API);

export async function apiFetch(path: string, options: RequestInit = {}) {
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
