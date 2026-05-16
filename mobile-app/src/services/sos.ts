import { parseJsonResponse } from './api';
import type { OfflineDispatchResult } from './offlineSync';

export type SosNotificationSummary = {
  incident_id?: string | null;
  incident_message_id?: string | null;
  message_created?: boolean;
  central_notified?: boolean;
  team_notified?: boolean;
};

type QueueAlertFn = (payload: {
  incident: string | null;
  alert_type: string;
  severity: number;
  title: string;
  description: string;
  lat: number;
  lng: number;
}) => Promise<OfflineDispatchResult>;

type SendSosOptions = {
  queueAlert: QueueAlertFn;
  latitude: number;
  longitude: number;
  incidentId?: string | null;
  title?: string;
  description?: string;
  severity?: number;
};

export async function sendSosAlert(options: SendSosOptions) {
  const result = await options.queueAlert({
    incident: options.incidentId ?? null,
    alert_type: 'SOS',
    severity: options.severity ?? 1,
    title: options.title ?? 'SOS operativo',
    description: options.description ?? 'SOS enviado desde el boton principal del operativo.',
    lat: options.latitude,
    lng: options.longitude,
  });

  let notification: SosNotificationSummary | null = null;

  if (result.response) {
    try {
      const payload = await parseJsonResponse<{ notification?: SosNotificationSummary }>(result.response);
      notification = payload.notification ?? null;
    } catch {
      notification = null;
    }
  }

  return {
    ...result,
    notification,
  };
}