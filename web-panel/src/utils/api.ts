const API = import.meta.env.VITE_API_BASE_URL ?? "https://tfg-backend-jrrn.onrender.com/api";
const IS_ABSOLUTE_API = /^https?:\/\//i.test(API);

let csrfToken = "";

export function setCsrfToken(token: string | null | undefined) {
  csrfToken = token ?? "";
}

function isUnsafeMethod(method: string | undefined) {
  const normalized = (method ?? "GET").toUpperCase();
  return ["POST", "PUT", "PATCH", "DELETE"].includes(normalized);
}

function buildApiUrl(path: string) {
  if (!/^https?:\/\//i.test(path)) {
    return `${API}${path}`;
  }

  const incoming = new URL(path);
  const apiIndex = incoming.pathname.indexOf("/api/");
  const normalizedPath = apiIndex >= 0 ? incoming.pathname.slice(apiIndex + 4) : incoming.pathname;
  return `${API}${normalizedPath}${incoming.search}`;
}

async function refreshCsrfToken() {
  const response = await fetch(`${API}/auth/panel/login/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: IS_ABSOLUTE_API ? "include" : "same-origin",
  });

  if (!response.ok) return "";

  const data = (await response.json().catch(() => ({}))) as { csrfToken?: string };
  setCsrfToken(data.csrfToken);
  return csrfToken;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (isUnsafeMethod(method) && !headers.has("X-CSRFToken")) {
    const token = csrfToken || await refreshCsrfToken();
    if (token) headers.set("X-CSRFToken", token);
  }

  const requestOptions: RequestInit = {
    ...options,
    method,
    headers,
    credentials: IS_ABSOLUTE_API ? "include" : "same-origin",
  };

  const url = buildApiUrl(path);
  const response = await fetch(url, requestOptions);

  if (response.status === 403 && isUnsafeMethod(method)) {
    const token = await refreshCsrfToken();
    if (token) {
      headers.set("X-CSRFToken", token);
      return fetch(url, requestOptions);
    }
  }

  return response;
}
