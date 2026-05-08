import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { registrarInicioDescansoJornada, registrarRetomarJornada } from '../services/journeyActivity';
import { colors } from '../theme';

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
  ended_at?: string;
  end_latitude?: number;
  end_longitude?: number;
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
    last_break_finished_at: null,
    is_on_break: true,
  };
}

function isBreakActive(notes: unknown) {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
    return false;
  }

  const candidate = notes as {
    is_on_break?: unknown;
    breaks?: unknown;
    last_break_started_at?: unknown;
    last_break_finished_at?: unknown;
  };

  if (candidate.is_on_break === true) {
    return true;
  }

  if (Array.isArray(candidate.breaks) && candidate.breaks.length > 0) {
    const lastBreak = candidate.breaks[candidate.breaks.length - 1] as { ended_at?: unknown };
    return !lastBreak.ended_at;
  }

  return Boolean(candidate.last_break_started_at && !candidate.last_break_finished_at);
}

function buildResumeNotes(existingNotes: unknown, endedAt: string, latitude: number, longitude: number) {
  const base =
    existingNotes && typeof existingNotes === 'object' && !Array.isArray(existingNotes)
      ? { ...(existingNotes as Record<string, unknown>) }
      : {};

  const currentBreaks = Array.isArray(base.breaks) ? [...base.breaks] : [];
  const lastBreak = currentBreaks[currentBreaks.length - 1];

  if (lastBreak && typeof lastBreak === 'object' && !Array.isArray(lastBreak)) {
    currentBreaks[currentBreaks.length - 1] = {
      ...(lastBreak as Record<string, unknown>),
      ended_at: endedAt,
      end_latitude: latitude,
      end_longitude: longitude,
    };
  }

  return {
    ...base,
    breaks: currentBreaks,
    last_break_finished_at: endedAt,
    is_on_break: false,
  };
}

export default function StartBreakScreen({ navigation }: any) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [activeJourney, setActiveJourney] = useState<JourneyApi | null>(null);
  const [breakActive, setBreakActive] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Pendiente de registrar');
  const [breakNotes, setBreakNotes] = useState('');

  useEffect(() => {
    void requestPermission();
  }, []);

  useEffect(() => {
    void refreshActiveJourney();
  }, [token, user]);

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

  async function refreshActiveJourney() {
    setScreenLoading(true);
    try {
      const journey = await loadActiveJourney();
      setActiveJourney(journey);
      setBreakActive(isBreakActive(journey.notes));
    } catch (error) {
      setActiveJourney(null);
      setBreakActive(false);
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo consultar la jornada activa.');
    } finally {
      setScreenLoading(false);
    }
  }

  async function registerBreak() {
    if (!permissionGranted) {
      Alert.alert('Permiso requerido', 'Debes permitir el acceso a la ubicacion para guardar el descanso.');
      return;
    }

    setLoading(true);
    try {
      const journey = await loadActiveJourney();
      if (isBreakActive(journey.notes)) {
        setActiveJourney(journey);
        setBreakActive(true);
        Alert.alert('Descanso en curso', 'Ya hay un descanso iniciado. Puedes retomar la jornada desde esta pantalla.');
        return;
      }

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

      const updatedJourney = await parseJsonResponse<JourneyApi>(response);
      setActiveJourney(updatedJourney);
      setBreakActive(true);
      setLocationLabel(`${currentLocation.coords.latitude.toFixed(5)}, ${currentLocation.coords.longitude.toFixed(5)}`);
      await registrarInicioDescansoJornada(startedAt);

      Alert.alert('Descanso registrado', 'La jornada queda en descanso hasta que pulses Retomar jornada.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo registrar el descanso.');
    } finally {
      setLoading(false);
    }
  }

  async function resumeJourney() {
    const journey = activeJourney ?? (await loadActiveJourney());
    if (!journey) {
      Alert.alert('Sin jornada', 'No hay una jornada activa para retomar.');
      return;
    }

    if (!permissionGranted) {
      Alert.alert('Permiso requerido', 'Debes permitir el acceso a la ubicacion para retomar la jornada.');
      return;
    }

    setLoading(true);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      const endedAt = new Date().toISOString();
      const nextNotes = buildResumeNotes(
        journey.notes,
        endedAt,
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

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
        throw new Error(errorText || 'No se pudo retomar la jornada.');
      }

      const updatedJourney = await parseJsonResponse<JourneyApi>(response);
      setActiveJourney(updatedJourney);
      setBreakActive(false);
      setLocationLabel(`${currentLocation.coords.latitude.toFixed(5)}, ${currentLocation.coords.longitude.toFixed(5)}`);
      await registrarRetomarJornada({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      Alert.alert('Jornada retomada', 'El descanso se ha cerrado y vuelve a contar el control de movimiento.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo retomar la jornada.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Pausa operativa</Text>
        <Text style={styles.title}>{breakActive ? 'Descanso en curso' : 'Registrar descanso'}</Text>
        <Text style={styles.subtitle}>
          {breakActive
            ? 'Pulsa Retomar jornada cuando vuelvas a estar operativo. Mientras tanto no se enviaran alertas por inmovilidad.'
            : 'Guarda la ubicacion actual del operativo para que aparezca en el recorrido de la jornada.'}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ubicacion</Text>
          <Text style={styles.infoValue}>{locationLabel}</Text>
        </View>

        {!breakActive ? (
          <>
            <Text style={styles.inputLabel}>Notas del descanso</Text>
            <TextInput
              value={breakNotes}
              onChangeText={setBreakNotes}
              placeholder="Ej. parada para hidratacion o reorganizacion del equipo"
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
            />
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, breakActive ? styles.resumeButton : null]}
          onPress={breakActive ? resumeJourney : registerBreak}
          disabled={loading || screenLoading}
        >
          {loading || screenLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{breakActive ? 'Retomar jornada' : 'Guardar descanso'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 10,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  infoRow: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    marginTop: 6,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: colors.success,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
