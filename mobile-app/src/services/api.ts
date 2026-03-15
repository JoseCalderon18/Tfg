import { Platform } from 'react-native';

// Resolvemos host base segun plataforma para facilitar pruebas locales con Expo.
const DEFAULT_API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? `${DEFAULT_API_HOST}/api`;

type ApiOptions = RequestInit & {
  token?: string | null;
};

// Cliente base para llamadas autenticadas y públicas hacia Django.
export async function apiFetch(path: string, options: ApiOptions = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

// Utilidad para parsear respuestas JSON con manejo uniforme de errores.
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}
