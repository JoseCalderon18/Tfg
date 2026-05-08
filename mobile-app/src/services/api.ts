import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEPLOYED_API_BASE_URL = 'https://tfg-backend-jrrn.onrender.com/api';

const LOCAL_API_HOST =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_ANDROID_API_HOST
    : process.env.EXPO_PUBLIC_IOS_API_HOST;

function getExpoHostApiUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    null;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0];

  if (!host) {
    return null;
  }

  return `http://${host}:8000/api`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? (LOCAL_API_HOST ? `${LOCAL_API_HOST}/api` : DEPLOYED_API_BASE_URL);

type ApiAuthHandlers = {
  refreshAccessToken: () => Promise<string | null>;
};

let apiAuthHandlers: ApiAuthHandlers | null = null;

type ApiOptions = RequestInit & {
  token?: string | null;
  timeoutMs?: number;
};

export class ApiConnectionError extends Error {
  attemptedUrls: string[];

  constructor(message: string, attemptedUrls: string[]) {
    super(message);
    this.name = 'ApiConnectionError';
    this.attemptedUrls = attemptedUrls;
  }
}

export class ApiResponseParseError extends Error {
  status: number;
  contentType: string;
  bodyPreview: string;

  constructor(response: Response, bodyText: string) {
    const contentType = response.headers.get('Content-Type') ?? '';
    const bodyPreview = bodyText.replace(/\s+/g, ' ').trim().slice(0, 180);
    super(
      `La API respondio con un formato no valido (HTTP ${response.status}).` +
        (contentType ? ` Content-Type: ${contentType}.` : '') +
        (bodyPreview ? ` Respuesta: ${bodyPreview}` : '')
    );
    this.name = 'ApiResponseParseError';
    this.status = response.status;
    this.contentType = contentType;
    this.bodyPreview = bodyPreview;
  }
}

export function setApiAuthHandlers(handlers: ApiAuthHandlers | null) {
  apiAuthHandlers = handlers;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getFallbackApiUrls() {
  const urls: string[] = [];

  const expoHostApiUrl = getExpoHostApiUrl();
  if (
    !process.env.EXPO_PUBLIC_API_BASE_URL &&
    LOCAL_API_HOST &&
    expoHostApiUrl &&
    expoHostApiUrl !== API_BASE_URL &&
    !urls.includes(expoHostApiUrl)
  ) {
    urls.push(expoHostApiUrl);
  }

  return urls;
}

export function getApiDebugUrls() {
  return [API_BASE_URL, ...getFallbackApiUrls()];
}

// Cliente base para llamadas autenticadas y publicas hacia Django.
export async function apiFetch(path: string, options: ApiOptions = {}) {
  const { timeoutMs = 30000, ...requestOptions } = options;
  const buildFetchOptions = (tokenOverride?: string | null) => {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (tokenOverride) {
      headers.set('Authorization', `Bearer ${tokenOverride}`);
    }

    return {
      ...requestOptions,
      headers,
    } satisfies RequestInit;
  };

  const runRequest = async (tokenOverride?: string | null) => {
    const fetchOptions = buildFetchOptions(tokenOverride);
    const urls = getApiDebugUrls();
    const attemptedUrls: string[] = [];

    for (const baseUrl of urls) {
      const requestUrl = `${baseUrl}${path}`;
      attemptedUrls.push(requestUrl);
      try {
        return await fetchWithTimeout(requestUrl, fetchOptions, timeoutMs);
      } catch {
        // Probamos con la siguiente URL fallback si el tunel o la red tardan demasiado.
      }
    }

    throw new ApiConnectionError('No se pudo conectar con la API.', attemptedUrls);
  };

  const initialToken = options.token ?? null;
  const response = await runRequest(initialToken);

  if (
    response.status === 401 &&
    initialToken &&
    apiAuthHandlers &&
    path !== '/auth/refresh/'
  ) {
    const nextToken = await apiAuthHandlers.refreshAccessToken();
    if (nextToken && nextToken !== initialToken) {
      return runRequest(nextToken);
    }
  }

  return response;
}

// Utilidad para parsear respuestas JSON con manejo uniforme de errores.
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiResponseParseError(response, text);
  }
}
