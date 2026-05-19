import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type Incident = {
  id: string;
  name?: string | null;
  status?: string | null;
  is_active?: boolean;
};

type IncidentMember = {
  id: string;
  user?: string | { username?: string; first_name?: string; last_name?: string; email?: string } | null;
  role_in_incident?: string | null;
  joined_at?: string | null;
  is_active?: boolean;
};

type ListResponse<T> = T[] | { results?: T[] };

function normalizeList<T>(payload: ListResponse<T>) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function getUserName(user: IncidentMember['user']) {
  if (!user) return 'Companero sin nombre';
  if (typeof user === 'string') return user;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email || 'Companero sin nombre';
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-ES');
}

export default function CompanionsScreen({ navigation, route }: any) {
  const routeIncidentId = route?.params?.incidentId as string | undefined;
  const { token, user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [members, setMembers] = useState<IncidentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const availableMembers = useMemo(() => members.filter((member) => member.is_active !== false), [members]);

  const resolveIncident = useCallback(async () => {
    if (routeIncidentId) return routeIncidentId;
    if (!token || !user?.organization_id) return '';

    const response = await apiFetch(`/incidents/?owner_organization=${encodeURIComponent(user.organization_id)}&status=OPEN`, {
      token,
      timeoutMs: 12000,
    });
    if (!response.ok) return '';

    const incidents = normalizeList(await parseJsonResponse<ListResponse<Incident>>(response));
    const activeIncident = incidents.find((item) => item.is_active !== false) ?? incidents[0];
    setIncident(activeIncident ?? null);
    return activeIncident?.id ?? '';
  }, [routeIncidentId, token, user?.organization_id]);

  const loadMembers = useCallback(async (asRefresh = false) => {
    if (!token) {
      setError('No hay sesion activa.');
      setLoading(false);
      return;
    }

    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const incidentId = await resolveIncident();
      if (!incidentId) {
        setMembers([]);
        setError('Selecciona o abre un incidente para ver sus companeros disponibles.');
        return;
      }

      const [incidentResponse, membersResponse] = await Promise.all([
        apiFetch(`/incidents/${encodeURIComponent(incidentId)}/`, { token, timeoutMs: 12000 }),
        apiFetch(`/incidents/${encodeURIComponent(incidentId)}/members/`, { token, timeoutMs: 12000 }),
      ]);

      if (incidentResponse.ok) {
        setIncident(await parseJsonResponse<Incident>(incidentResponse));
      }

      if (!membersResponse.ok) {
        throw new Error('No se pudieron cargar los companeros del incidente.');
      }

      setMembers(normalizeList(await parseJsonResponse<ListResponse<IncidentMember>>(membersResponse)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Error cargando companeros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveIncident, token]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Companeros</Text>
          <Text style={styles.subtitle}>{incident?.name ?? 'Incidente seleccionado'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMembers(true)} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Cargando companeros...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No disponible</Text>
            <Text style={styles.cardText}>{error}</Text>
          </View>
        ) : availableMembers.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sin companeros disponibles</Text>
            <Text style={styles.cardText}>Este incidente no tiene miembros activos asignados.</Text>
          </View>
        ) : (
          availableMembers.map((member) => (
            <View key={member.id} style={styles.card}>
              <View style={styles.memberTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getUserName(member.user).slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{getUserName(member.user)}</Text>
                  <Text style={styles.memberRole}>{member.role_in_incident || 'OPERATIVE'}</Text>
                </View>
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>Disponible</Text>
                </View>
              </View>
              <Text style={styles.cardText}>Asignado desde {formatDate(member.joined_at)}</Text>
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
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 4, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  content: { padding: 18, paddingBottom: 32, gap: 12 },
  stateBox: { marginTop: 42, alignItems: 'center', gap: 12 },
  stateText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardText: { marginTop: 8, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  memberRole: { marginTop: 3, color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  availableBadge: { borderRadius: 999, backgroundColor: colors.success, paddingHorizontal: 9, paddingVertical: 5 },
  availableBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
