import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type AlertStatus = 'ALL' | 'OPEN' | 'ACK' | 'CLOSED';

type OperationalAlert = {
  id: string;
  incident?: string | null;
  incident_name?: string | null;
  alert_type?: string | null;
  severity?: number | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

type ListResponse<T> = T[] | { results?: T[] };

const STATUS_FILTERS: { value: AlertStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'OPEN', label: 'Abiertas' },
  { value: 'ACK', label: 'Reconocidas' },
  { value: 'CLOSED', label: 'Cerradas' },
];

const ALERT_TYPE_LABELS: Record<string, string> = {
  SOS: 'SOS',
  MAN_DOWN: 'Operativo caido',
  LOST: 'Operativo perdido',
  GEOFENCE: 'Fuera de zona',
  ANOMALY: 'Anomalia',
  OTHER: 'Otra alerta',
};

const ALERT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  ACK: 'Reconocida',
  CLOSED: 'Cerrada',
};

function normalizeList<T>(payload: ListResponse<T>) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function getLabel(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) {
    return 'Sin definir';
  }

  return labels[value] ?? value.replace(/_/g, ' ');
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortAlerts(alerts: OperationalAlert[]) {
  return [...alerts].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

function getSeverityLabel(severity?: number | null) {
  if ((severity ?? 5) <= 1) return 'Critica';
  if ((severity ?? 5) === 2) return 'Alta';
  if ((severity ?? 5) === 3) return 'Media';
  if ((severity ?? 5) === 4) return 'Baja';
  return 'Informativa';
}

export default function AlertsScreen({ navigation }: any) {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [statusFilter, setStatusFilter] = useState<AlertStatus>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const loadAlerts = useCallback(async (refreshing = false) => {
    if (!token) {
      setError('No hay sesion activa.');
      setIsLoading(false);
      return;
    }

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const response = await apiFetch('/alerts/', { token, timeoutMs: 12000 });
      if (!response.ok) {
        const payload = await parseJsonResponse<{ detail?: string; error?: string }>(response);
        setError(payload.detail ?? payload.error ?? 'No se pudieron cargar las alertas.');
        setAlerts([]);
        return;
      }

      const payload = await parseJsonResponse<ListResponse<OperationalAlert>>(response);
      setAlerts(sortAlerts(normalizeList(payload)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudieron cargar las alertas.');
      setAlerts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const metrics = useMemo(
    () => ({
      open: alerts.filter((item) => item.status === 'OPEN').length,
      ack: alerts.filter((item) => item.status === 'ACK').length,
      closed: alerts.filter((item) => item.status === 'CLOSED').length,
      critical: alerts.filter((item) => (item.severity ?? 5) <= 2 && item.status !== 'CLOSED').length,
    }),
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    if (statusFilter === 'ALL') {
      return alerts;
    }

    return alerts.filter((item) => item.status === statusFilter);
  }, [alerts, statusFilter]);

  const updateAlertStatus = async (alertId: string, action: 'acknowledge' | 'close') => {
    if (!token || updatingId) {
      return;
    }

    setUpdatingId(alertId);
    setError('');

    try {
      const response = await apiFetch(`/alerts/${alertId}/${action}/`, {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'acknowledge' ? { ack_notes: '' } : { close_notes: '' }),
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<{ detail?: string; error?: string }>(response);
        Alert.alert('No se pudo actualizar', payload.detail ?? payload.error ?? 'Intentalo de nuevo.');
        return;
      }

      const updatedAlert = await parseJsonResponse<OperationalAlert>(response);
      setAlerts((current) =>
        sortAlerts(current.map((item) => (item.id === alertId ? { ...item, ...updatedAlert } : item)))
      );
    } catch (nextError) {
      Alert.alert('Error', nextError instanceof Error ? nextError.message : 'No se pudo actualizar la alerta.');
    } finally {
      setUpdatingId('');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Cargando alertas...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No se pudieron cargar</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => loadAlerts()}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredAlerts.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Sin alertas</Text>
          <Text style={styles.stateText}>No hay alertas para el filtro seleccionado.</Text>
        </View>
      );
    }

    return filteredAlerts.map((item) => (
      <View key={item.id} style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleGroup}>
            <Text style={styles.alertTitle}>{item.title || getLabel(item.alert_type, ALERT_TYPE_LABELS)}</Text>
            <Text style={styles.alertMeta}>{item.incident_name || item.incident || 'Sin incidente asociado'}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusBadgeText}>{getLabel(item.status, ALERT_STATUS_LABELS)}</Text>
          </View>
        </View>

        <View style={styles.alertInfoRow}>
          <Text style={[styles.severityBadge, getSeverityStyle(item.severity)]}>
            {getSeverityLabel(item.severity)}
          </Text>
          <Text style={styles.alertDate}>{formatDate(item.created_at)}</Text>
        </View>

        <Text style={styles.alertType}>{getLabel(item.alert_type, ALERT_TYPE_LABELS)}</Text>
        {item.description ? <Text style={styles.alertDescription}>{item.description}</Text> : null}
        <Text style={styles.alertCreator}>Creada por: {item.created_by || 'Sistema'}</Text>

        {item.status !== 'CLOSED' ? (
          <View style={styles.actionsRow}>
            {item.status === 'OPEN' ? (
              <TouchableOpacity
                style={[styles.secondaryButton, updatingId === item.id && styles.disabledButton]}
                disabled={updatingId === item.id}
                onPress={() => void updateAlertStatus(item.id, 'acknowledge')}
              >
                <Text style={styles.secondaryButtonText}>
                  {updatingId === item.id ? 'Guardando...' : 'Reconocer'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, updatingId === item.id && styles.disabledButton]}
              disabled={updatingId === item.id}
              onPress={() => void updateAlertStatus(item.id, 'close')}
            >
              <Text style={styles.primaryButtonText}>
                {updatingId === item.id ? 'Guardando...' : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Visualizar alertas</Text>
          <Text style={styles.subtitle}>Seguimiento y estado de alertas operativas</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadAlerts(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.metricGrid}>
          <Metric label="Abiertas" value={String(metrics.open)} tone="success" />
          <Metric label="Reconocidas" value={String(metrics.ack)} tone="warning" />
          <Metric label="Criticas" value={String(metrics.critical)} tone="danger" />
          <Metric label="Cerradas" value={String(metrics.closed)} tone="muted" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'success' | 'warning' | 'danger' | 'muted' }) {
  const toneStyle =
    tone === 'success'
      ? styles.metricSuccess
      : tone === 'warning'
        ? styles.metricWarning
        : tone === 'danger'
          ? styles.metricDanger
          : styles.metricMuted;

  return (
    <View style={[styles.metricCard, toneStyle]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getStatusStyle(status?: string | null) {
  if (status === 'OPEN') {
    return styles.openBadge;
  }

  if (status === 'ACK') {
    return styles.ackBadge;
  }

  return styles.closedBadge;
}

function getSeverityStyle(severity?: number | null) {
  if ((severity ?? 5) <= 2) {
    return styles.severityHigh;
  }

  if ((severity ?? 5) === 3) {
    return styles.severityMedium;
  }

  return styles.severityLow;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  backButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  metricSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: colors.success,
  },
  metricWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: colors.warning,
  },
  metricDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  metricMuted: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  stateBox: {
    marginTop: 42,
    alignItems: 'center',
    gap: 12,
  },
  stateCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  stateText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertTitleGroup: {
    flex: 1,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  alertMeta: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  openBadge: {
    backgroundColor: colors.success,
  },
  ackBadge: {
    backgroundColor: colors.warning,
  },
  closedBadge: {
    backgroundColor: colors.textMuted,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  alertInfoRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  severityBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  severityHigh: {
    backgroundColor: colors.danger,
  },
  severityMedium: {
    backgroundColor: colors.warning,
  },
  severityLow: {
    backgroundColor: colors.success,
  },
  alertDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  alertType: {
    marginTop: 10,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  alertDescription: {
    marginTop: 8,
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  alertCreator: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
