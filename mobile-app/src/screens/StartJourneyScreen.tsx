import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { registrarInicioJornadaActividad } from '../services/journeyActivity';
import { colors } from '../theme';

type JourneyApi = {
  id: number;
  start_date?: string | null;
};

export default function StartJourneyScreen({ navigation }: any) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [notesText, setNotesText] = useState('');
  const { token, user } = useAuth();
  const { isTracking, startTracking } = useLocation();

  useEffect(() => {
    void requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicacion');
      return;
    }

    setLoading(true);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicacion');
    } finally {
      setLoading(false);
    }
  };

  const startJourney = async () => {
    if (!location) {
      Alert.alert('Ubicacion requerida', 'Debes obtener tu ubicacion actual');
      return;
    }

    if (!token || !user) {
      Alert.alert('Sesion requerida', 'No hay una sesion activa para iniciar la jornada');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/journeys/', {
        method: 'POST',
        token,
        body: JSON.stringify({
          start_date: new Date().toISOString(),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          notes: notesText.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Error al iniciar jornada';

        if (errorText) {
          try {
            const errorData = JSON.parse(errorText) as { detail?: string };
            errorMessage = errorData.detail ?? errorMessage;
          } catch {
            errorMessage = errorText;
          }
        }

        Alert.alert('Error', errorMessage);
        return;
      }

      const createdJourney = await parseJsonResponse<JourneyApi>(response);
      await registrarInicioJornadaActividad({
        journeyId: createdJourney.id,
        startedAt: createdJourney.start_date ?? new Date().toISOString(),
        point: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });

      const trackingStarted = isTracking || (await startTracking());

      Alert.alert(
        'Exito',
        trackingStarted
          ? 'Jornada iniciada y seguimiento GPS activado.'
          : 'Jornada iniciada. Revisa los permisos de ubicacion para activar el seguimiento GPS.',
        [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: colors.text }}>Iniciar jornada</Text>

      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Text style={{ width: 112, fontWeight: '600', color: colors.textSoft }}>
          Usuario actual
        </Text>
        <Text style={{ flex: 1, color: colors.textSoft }}>
          {user?.username ?? 'Sin sesion'}
        </Text>
      </View>

      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Text style={{ width: 56, color: colors.textSoft, fontWeight: '600', paddingTop: 12 }}>
          Notas
        </Text>
        <TextInput
          value={notesText}
          onChangeText={setNotesText}
          placeholder="Escribe unas notas"
          multiline
          style={{
            flex: 1,
            minHeight: 48,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 8,
            backgroundColor: colors.surface,
            color: colors.text,
            paddingHorizontal: 12,
            paddingVertical: 10,
            textAlignVertical: 'top',
          }}
        />
      </View>

      <TouchableOpacity
        onPress={getCurrentLocation}
        disabled={loading}
        style={{
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: colors.white, textAlign: 'center', fontWeight: '600' }}>
          {location ? 'Ubicacion obtenida' : 'Obtener ubicacion actual'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={startJourney}
        disabled={!location || loading}
        style={{
          backgroundColor: location ? colors.success : colors.borderStrong,
          padding: 15,
          borderRadius: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={{ color: colors.white, textAlign: 'center', fontWeight: '600' }}>Confirmar inicio</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
