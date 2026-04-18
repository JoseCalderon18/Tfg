import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';

type JourneyApi = {
  id: number;
  end_date?: string | null;
  notes?: unknown;
  user_id?: string | null;
  account_user_id?: string | null;
};

type BreakEntry = {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  started_at: string;
};

function buildNextNotes(existingNotes: unknown, entry: BreakEntry) {
  const base =
    existingNotes && typeof existingNotes === 'object' && !Array.isArray(existingNotes)
      ? { ...(existingNotes as Record<string, unknown>) }
      : {};

  const currentBreaks = Array.isArray(base.breaks) ? [...base.breaks] : [];
  currentBreaks.push(entry);

  return {
    ...base,
    breaks: currentBreaks,
    last_break_started_at: entry.started_at,
  };
}

export default function StartBreakScreen({ navigation }: any) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Pendiente de registrar');
  const [breakNotes, setBreakNotes] = useState('');

  useEffect(() => {
    void requestPermission();
  }, []);

  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionGranted(status === 'granted');
  }

  async function loadActiveJourney() {
    if (!token || !user) {
      throw new Error('No hay una sesion activa para registrar el descanso.');
    }

    const response = await apiFetch('/journeys/', { token });
    if (!response.ok) {
      throw new Error('No se pudo consultar la jornada activa.');
    }

    const payload = await parseJsonResponse<JourneyApi[] | { results?: JourneyApi[] }>(response);
    const journeys = Array.isArray(payload) ? payload : payload.results ?? [];

    const activeJourney = journeys.find(
      (item) =>
        !item.end_date &&
        (item.account_user_id === user.id || item.user_id === user.profile_id || item.user_id === user.id)
    );

    if (!activeJourney) {
      throw new Error('Necesitas una jornada activa antes de iniciar un descanso.');
    }

    return activeJourney;
  }

  async function registerBreak() {
    if (!permissionGranted) {
      Alert.alert('Permiso requerido', 'Debes permitir el acceso a la ubicacion para guardar el descanso.');
      return;
    }

    setLoading(true);
    try {
      const journey = await loadActiveJourney();
      const currentLocation = await Location.getCurrentPositionAsync({});
      const startedAt = new Date().toISOString();
      const nextNotes = buildNextNotes(journey.notes, {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        title: 'Descanso en campo',
        description: breakNotes.trim() || undefined,
        started_at: startedAt,
      });

      const response = await apiFetch(`/journeys/${journey.id}/`, {
        method: 'PATCH',
        token,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: nextNotes }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'No se pudo registrar el descanso.');
      }

      setLocationLabel(`${currentLocation.coords.latitude.toFixed(5)}, ${currentLocation.coords.longitude.toFixed(5)}`);

      Alert.alert('Descanso registrado', 'Se ha guardado el punto de descanso en la jornada activa.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo registrar el descanso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>Pausa operativa</Text>
        <Text style={styles.title}>Registrar descanso</Text>
        <Text style={styles.subtitle}>
          Guarda la ubicacion actual del operativo para que aparezca en el recorrido de la jornada.
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ubicacion</Text>
          <Text style={styles.infoValue}>{locationLabel}</Text>
        </View>

        <Text style={styles.inputLabel}>Notas del descanso</Text>
        <TextInput
          value={breakNotes}
          onChangeText={setBreakNotes}
          placeholder="Ej. parada para hidratacion o reorganizacion del equipo"
          placeholderTextColor="#94A3B8"
          multiline
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={registerBreak} disabled={loading}>
          {loading ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.primaryButtonText}>Guardar descanso</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    borderRadius: 999,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#111827',
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },
  eyebrow: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 10,
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
  },
  infoRow: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    padding: 14,
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    marginTop: 6,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  inputLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  input: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
});
