import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiConnectionError, apiFetch, parseJsonResponse } from './api';

const OFFLINE_QUEUE_KEY = 'offlineSyncQueue';

export type OfflineQueueKind = 'tracking' | 'alert' | 'point_of_interest';

export type OfflineQueueItem = {
  id: string;
  kind: OfflineQueueKind;
  path: string;
  method: 'POST';
  body: string;
  dedupeKey?: string;
  createdAt: string;
  retryCount?: number;
  lastAttemptAt?: string | null;
  lastError?: string | null;
};

export type OfflineDispatchResult = {
  ok: boolean;
  queued: boolean;
  response?: Response;
  error?: string;
};

export type OfflineSyncSummary = {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
};

function buildQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBodyForDedupe(body: string) {
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

function buildDedupeKey(item: Pick<OfflineQueueItem, 'kind' | 'path' | 'method' | 'body'>) {
  return [item.kind, item.method, item.path, normalizeBodyForDedupe(item.body)].join('|');
}

function markQueueAttempt(item: OfflineQueueItem, error: string): OfflineQueueItem {
  return {
    ...item,
    retryCount: (item.retryCount ?? 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: error,
  };
}

function isOfflineLikeError(error: unknown) {
  return error instanceof ApiConnectionError || (error instanceof Error && error.name === 'AbortError');
}

function getReadableError(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la sincronizacion.';
}

async function readQueue() {
  const rawQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!rawQueue) {
    return [] as OfflineQueueItem[];
  }

  try {
    const parsed = JSON.parse(rawQueue) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as OfflineQueueItem[];
  }
}

async function writeQueue(queue: OfflineQueueItem[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function getOfflineQueue() {
  return readQueue();
}

export async function enqueueOfflineItem(item: Omit<OfflineQueueItem, 'id' | 'createdAt'>) {
  const queue = await readQueue();
  const dedupeKey = item.dedupeKey ?? buildDedupeKey(item);
  const existingItemIndex = queue.findIndex((queuedItem) => (queuedItem.dedupeKey ?? buildDedupeKey(queuedItem)) === dedupeKey);

  if (existingItemIndex >= 0) {
    const existingItem = queue[existingItemIndex];
    const updatedItem = {
      ...existingItem,
      dedupeKey,
      lastAttemptAt: item.lastAttemptAt ?? existingItem.lastAttemptAt ?? null,
      lastError: item.lastError ?? existingItem.lastError ?? null,
    };
    queue[existingItemIndex] = updatedItem;
    await writeQueue(queue);
    return updatedItem;
  }

  const nextItem: OfflineQueueItem = {
    ...item,
    dedupeKey,
    id: buildQueueId(),
    createdAt: new Date().toISOString(),
    retryCount: item.retryCount ?? 0,
    lastAttemptAt: item.lastAttemptAt ?? null,
    lastError: item.lastError ?? null,
  };

  queue.push(nextItem);
  await writeQueue(queue);
  return nextItem;
}

async function shouldQueueResponse(response: Response) {
  if (response.status >= 500) {
    return true;
  }

  if (response.status === 408 || response.status === 429) {
    return true;
  }

  return false;
}

async function getResponseErrorMessage(response: Response) {
  try {
    const payload = await parseJsonResponse<{ detail?: string; error?: string }>(response);
    return payload.detail ?? payload.error ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

export async function sendOrQueueItem(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt'>,
  token: string | null
): Promise<OfflineDispatchResult> {
  if (!token) {
    return {
      ok: false,
      queued: false,
      error: 'No hay sesion activa para sincronizar la operacion.',
    };
  }

  try {
    const response = await apiFetch(item.path, {
      method: item.method,
      token,
      body: item.body,
    });

    if (response.ok) {
      return { ok: true, queued: false, response };
    }

    if (await shouldQueueResponse(response)) {
      const errorMessage = await getResponseErrorMessage(response);
      await enqueueOfflineItem({
        ...item,
        lastAttemptAt: new Date().toISOString(),
        lastError: errorMessage,
      });
      return { ok: true, queued: true, response };
    }

    return {
      ok: false,
      queued: false,
      response,
      error: await getResponseErrorMessage(response),
    };
  } catch (error) {
    if (isOfflineLikeError(error)) {
      await enqueueOfflineItem({
        ...item,
        lastAttemptAt: new Date().toISOString(),
        lastError: getReadableError(error),
      });
      return { ok: true, queued: true };
    }

    return {
      ok: false,
      queued: false,
      error: getReadableError(error),
    };
  }
}

export async function flushOfflineQueue(token: string | null): Promise<OfflineSyncSummary> {
  const queue = await readQueue();

  if (!token) {
    return {
      pendingCount: queue.length,
      syncedCount: 0,
      failedCount: 0,
      lastSyncedAt: null,
      lastError: 'No hay sesion activa para sincronizar.',
    };
  }

  if (queue.length === 0) {
    return {
      pendingCount: 0,
      syncedCount: 0,
      failedCount: 0,
      lastSyncedAt: null,
      lastError: null,
    };
  }

  const remaining: OfflineQueueItem[] = [];
  let syncedCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];

    try {
      const response = await apiFetch(item.path, {
        method: item.method,
        token,
        body: item.body,
      });

      if (response.ok) {
        syncedCount += 1;
        continue;
      }

      if (await shouldQueueResponse(response)) {
        lastError = await getResponseErrorMessage(response);
        remaining.push(markQueueAttempt(item, lastError), ...queue.slice(index + 1));
        failedCount += 1;
        break;
      }

      failedCount += 1;
      lastError = await getResponseErrorMessage(response);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        lastError = getReadableError(error);
        remaining.push(markQueueAttempt(item, lastError), ...queue.slice(index + 1));
        failedCount += 1;
        break;
      }

      failedCount += 1;
      lastError = getReadableError(error);
    }
  }

  await writeQueue(remaining);

  return {
    pendingCount: remaining.length,
    syncedCount,
    failedCount,
    lastSyncedAt: syncedCount > 0 ? new Date().toISOString() : null,
    lastError,
  };
}
