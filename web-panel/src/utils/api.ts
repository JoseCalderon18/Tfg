import { getCookie } from "./csrf";

const API = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const csrf = getCookie("csrftoken");

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (csrf) headers.set("X-CSRFToken", csrf);

  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}
