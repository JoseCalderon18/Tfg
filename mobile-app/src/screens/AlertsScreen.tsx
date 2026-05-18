import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type MobileAlert = {
  id: string;
  incident?: string | null;
  incident_name?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type ListResponse<T> = T[] | { results?: T[] };

const ALERT_TYPE_LABELS: Record<string, string> = {
  SOS: 'SOS',
  MAN_DOWN: 'Hombre caido',
  LOST: 'Operativo perdido',
  GEOFENCE: 'Fuera de zona segura',
  ANOMALY: 'Anomalia detectada',
  FIRE_SPREAD: 'Cambio de fuego',
  SMOKE: 'Humo en incidente',
  INJURY: 'Operativo herido',
  DEATH: 'Operativo fallecido',
  EVACUATION: 'Evacuacion',
  MEDICAL: 'Emergencia medica',
  TRAPPED: 'Operativo atrapado',
  VEHICLE: 'Incidente vehicular',
  ANIMAL: 'Animal peligroso',
  ANIMAL_INJURY: 'Animal herido',
  LOW_SUPPLIES: 'Recursos bajos',
  COMM_LOSS: 'Perdida de comunicacion',
  HAZARD: 'Peligro ambiental',
  FATIGUE: 'Fatiga extrema',
  WEATHER: 'Clima peligroso',
  BATTERY: 'Bateria baja',
  MOVEMENT: 'Inmovilidad prolongada',
  OTHER: 'Otra alerta',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  ACK: 'Reconocida',
  CLOSED: 'Cerrada',
};

function normalizeList<T>(payload: ListResponse<T>) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function getLabel(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) return 'Sin definir';
  return labels[value] ?? value.replace(/_/g, ' ');
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-ES');
}

function getStatusStyle(status?: string | null) {
  if (status === 'OPEN') return styles.openBadge;
  if (status === 'ACK') return styles.ackBadge;
  return styles.closedBadge;
}

export default function AlertsScreen({ navigation, route }: any) {
  const incidentId = route?.params?.incidentId as string | undefined;
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<MobileAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((left, right) => {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightTime - leftTime;
      }),
    [alerts]
  );

  const loadAlerts = useCallback(async (asRefresh = false) => {
    if (!token) {
      setError('No hay sesion activa.');
      setLoading(false);
      return;
    }

    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const path = incidentId ? `/alerts/?incident=${encodeURIComponent(incidentId)}` : '/alerts/my_alerts/';
      const response = await apiFetch(path, { token, timeoutMs: 12000 });
      if (!response.ok) {
        throw new Error('No se pudieron cargar las alertas.');
      }

      setAlerts(normalizeList(await parseJsonResponse<ListResponse<MobileAlert>>(response)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Error cargando alertas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [incidentId, token]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Alertas</Text>
          <Text style={styles.subtitle}>{incidentId ? 'Del incidente seleccionado' : 'Creadas por mi usuario'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAlerts(true)} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Cargando alertas...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No se pudo cargar</Text>
            <Text style={styles.cardText}>{error}</Text>
          </View>
        ) : sortedAlerts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sin alertas</Text>
            <Text style={styles.cardText}>No hay alertas registradas para esta vista.</Text>
          </View>
        ) : (
          sortedAlerts.map((alert) => (
            <View key={alert.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.alertTitle}>{alert.title || getLabel(alert.alert_type, ALERT_TYPE_LABELS)}</Text>
                <View style={[styles.statusBadge, getStatusStyle(alert.status)]}>
                  <Text style={styles.statusBadgeText}>{getLabel(alert.status, STATUS_LABELS)}</Text>
                </View>
              </View>
              <Text style={styles.cardText}>{getLabel(alert.alert_type, ALERT_TYPE_LABELS)} · Severidad {alert.severity ?? '-'}</Text>
              <Text style={styles.cardText}>{alert.incident_name || alert.incident || 'Sin incidente asociado'}</Text>
              <Text style={styles.cardText}>{formatDate(alert.created_at)}</Text>
              {alert.description ? <Text style={styles.description}>{alert.description}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: { backgroundColor: colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  backButtonText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 4, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  content: { padding: 18, paddingBottom: 32, gap: 12 },
  stateBox: { marginTop: 42, alignItems: 'center', gap: 12 },
  stateText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  alertTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800' },
  cardText: { marginTop: 8, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  description: { marginTop: 10, color: colors.textSoft, fontSize: 14, lineHeight: 20 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  openBadge: { backgroundColor: colors.success },
  ackBadge: { backgroundColor: colors.warning },
  closedBadge: { backgroundColor: colors.textMuted },
  statusBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
