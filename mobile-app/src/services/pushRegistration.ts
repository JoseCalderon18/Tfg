import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch, parseJsonResponse } from './api';
import type { User } from '../context/AuthContext';

function getProjectId() {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants.easConfig as any)?.projectId ??
    null
  );
}

export async function registerPushDevice(token: string, user: User): Promise<User | null> {
  if (!token || !user) {
    return null;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const finalPermissions =
    currentPermissions.status === 'granted'
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== 'granted') {
    return null;
  }

  const projectId = getProjectId();
  const pushTokenResult = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const pushToken = pushTokenResult.data.trim();

  if (!pushToken) {
    return null;
  }

  const response = await apiFetch('/auth/devices/register/', {
    method: 'POST',
    token,
    body: JSON.stringify({
      fcm_token: pushToken,
      device_name: `${Platform.OS} device`,
      platform: Platform.OS.toUpperCase(),
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await parseJsonResponse<{ device_id?: string }>(response);
  if (!payload.device_id) {
    return null;
  }

  return {
    ...user,
    device_id: payload.device_id,
  };
}
