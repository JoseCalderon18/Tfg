import { Platform } from 'react-native';

// En Android fisico por USB + `adb reverse`, 127.0.0.1 apunta al backend del PC.
// Para emulador se puede usar EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000
const DEFAULT_LOCAL_API_HOST = 'http://127.0.0.1:8000';

const DEFAULT_API_HOST =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_ANDROID_API_HOST ?? DEFAULT_LOCAL_API_HOST
    : process.env.EXPO_PUBLIC_IOS_API_HOST ?? 'http://localhost:8000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? `${DEFAULT_API_HOST}/api`;

type ApiOptions = RequestInit & {
  token?: string | null;
  timeoutMs?: number;
};

// Cliente base para llamadas autenticadas y públicas hacia Django.
export async function apiFetch(path: string, options: ApiOptions = {}) {
  const { timeoutMs = 10000, ...requestOptions } = options;
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions: RequestInit = {
    ...requestOptions,
    headers,
    signal: requestOptions.signal ?? controller.signal,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (
      Platform.OS === 'android' &&
      !process.env.EXPO_PUBLIC_API_BASE_URL &&
      !process.env.EXPO_PUBLIC_ANDROID_API_HOST &&
      DEFAULT_API_HOST === DEFAULT_LOCAL_API_HOST
    ) {
      try {
        const fallbackResponse = await fetch(`http://10.0.2.2:8000/api${path}`, fetchOptions);
        clearTimeout(timeoutId);
        return fallbackResponse;
      } catch (fallbackError) {
        clearTimeout(timeoutId);
        throw fallbackError;
      }
    }

    clearTimeout(timeoutId);
    throw error;
  }
}

// Utilidad para parsear respuestas JSON con manejo uniforme de errores.
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}
