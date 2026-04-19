import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useAuth } from './AuthContext';
import { flushOfflineQueue, getOfflineQueue, OfflineQueueKind, sendOrQueueItem } from '../services/offlineSync';

type SyncPayload = Record<string, unknown>;

type QueueResult = {
  ok: boolean;
  queued: boolean;
  error?: string;
};

type OfflineSyncContextType = {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  queueTrackingPoint: (payload: SyncPayload) => Promise<QueueResult>;
  queueAlert: (payload: SyncPayload) => Promise<QueueResult>;
  queuePointOfInterest: (payload: SyncPayload) => Promise<QueueResult>;
  flushQueue: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

function buildItem(kind: OfflineQueueKind, payload: SyncPayload) {
  if (kind === 'tracking') {
    return {
      kind,
      path: '/tracking/point/',
      method: 'POST' as const,
      body: JSON.stringify(payload),
    };
  }

  if (kind === 'alert') {
    return {
      kind,
      path: '/alerts/',
      method: 'POST' as const,
      body: JSON.stringify(payload),
    };
  }

  return {
    kind,
    path: '/points-of-interest/',
    method: 'POST' as const,
    body: JSON.stringify(payload),
  };
}

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const queue = await getOfflineQueue();
    setPendingCount(queue.length);
  }, []);

  const flushQueue = useCallback(async () => {
    if (!token || isSyncingRef.current) {
      await refreshPendingCount();
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const summary = await flushOfflineQueue(token);
      setPendingCount(summary.pendingCount);
      setLastError(summary.lastError);
      if (summary.lastSyncedAt) {
        setLastSyncedAt(summary.lastSyncedAt);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount, token]);

  const sendWithFallback = useCallback(
    async (kind: OfflineQueueKind, payload: SyncPayload): Promise<QueueResult> => {
      const result = await sendOrQueueItem(buildItem(kind, payload), token);
      await refreshPendingCount();

      if (!result.ok) {
        setLastError(result.error ?? 'No se pudo procesar la operacion.');
        return {
          ok: false,
          queued: false,
          error: result.error,
        };
      }

      if (result.queued) {
        setLastError('Sin conexion: la operacion queda pendiente de sincronizacion.');
      } else {
        setLastError(null);
        setLastSyncedAt(new Date().toISOString());
      }

      return {
        ok: true,
        queued: result.queued,
      };
    },
    [refreshPendingCount, token]
  );

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!token) {
      setIsSyncing(false);
      isSyncingRef.current = false;
      return;
    }

    void flushQueue();
    const intervalId = setInterval(() => {
      void flushQueue();
    }, 15000);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void flushQueue();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [flushQueue, token]);

  const value = useMemo<OfflineSyncContextType>(
    () => ({
      pendingCount,
      isSyncing,
      lastSyncedAt,
      lastError,
      queueTrackingPoint: (payload) => sendWithFallback('tracking', payload),
      queueAlert: (payload) => sendWithFallback('alert', payload),
      queuePointOfInterest: (payload) => sendWithFallback('point_of_interest', payload),
      flushQueue,
    }),
    [flushQueue, isSyncing, lastError, lastSyncedAt, pendingCount, sendWithFallback]
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  }

  return context;
}
