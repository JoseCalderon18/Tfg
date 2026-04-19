import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

interface PointOfInterest {
  id: string;
  name: string;
  emoji: string;
  description: string;
  poiType: string;
}

const POINTS_OF_INTEREST: PointOfInterest[] = [
  {
    id: '1',
    name: 'Hidratación',
    emoji: '🚰',
    description: 'Ubicacion de hidrantes disponibles',
    poiType: 'HYDRANT',
  },
  {
    id: '2',
    name: 'Asentamiento',
    emoji: '🏠',
    description: 'Zonas de asentamiento y viviendas',
    poiType: 'SETTLEMENT',
  },
  {
    id: '3',
    name: 'Cortafuegos',
    emoji: '🔥',
    description: 'Lineas de cortafuegos',
    poiType: 'FIREBREAK',
  },
  {
    id: '4',
    name: 'Puntos de Vigilancia',
    emoji: '👁️',
    description: 'Torres y puntos de vigilancia',
    poiType: 'WATCHPOINT',
  },
  {
    id: '5',
    name: 'Estaciones Base',
    emoji: '🏢',
    description: 'Campamentos y estaciones base',
    poiType: 'BASE_STATION',
  },
  {
    id: '6',
    name: 'Vias de Evacuacion',
    emoji: '🚪',
    description: 'Rutas de evacuacion recomendadas',
    poiType: 'EVAC_ROUTE',
  },
  {
    id: '7',
    name: 'Antenas de Comunicacion',
    emoji: '📡',
    description: 'Ubicacion de antenas de comunicacion',
    poiType: 'COMMUNICATION_TOWER',
  },
  {
    id: '8',
    name: 'Puntos de Control',
    emoji: '🛑',
    description: 'Puntos de control para acceso y seguridad',
    poiType: 'CHECKPOINT',
  },
  {
    id: '9',
    name: 'Helisuperficies',
    emoji: '🚁',
    description: 'Zonas aptas para aterrizaje de helicópteros',
    poiType: 'HELIPAD',
  },
  {
    id: '10',
    name: 'Obstaculos',
    emoji: '🌳',
    description: 'Arboles caidos u otros obstaculos sobre la ruta',
    poiType: 'OBSTACLE',
  },
  {
    id: '11',
    name: 'Puente o Paso Elevado',
    emoji: '🌉',
    description: 'Puentes o pasos elevados en la zona',
    poiType: 'BRIDGE',
  },
  {
    id: '12',
    name: 'Punto de Suministro',
    emoji: '📦',
    description: 'Almacenes o puntos de suministros disponibles',
    poiType: 'SUPPLY_POINT',
  },
  {
    id: '13',
    name: 'Otro punto operativo',
    emoji: '🧭',
    description: 'Referencia adicional util para el operativo',
    poiType: 'OTHER',
  },
  {
    id: '14',
    name: 'Zona de apoyo logistico',
    emoji: '⛺',
    description: 'Area auxiliar temporal para apoyo o reagrupacion',
    poiType: 'BASE_STATION',
  }
];

export default function PointsOfInterestScreen({ navigation }: any) {
  const { token } = useAuth();
  const { queuePointOfInterest } = useOfflineSync();
  const [savingPointId, setSavingPointId] = useState<string | null>(null);
  const isSaving = savingPointId !== null;

  const savePointOfInterest = async (point: PointOfInterest) => {
    if (!token) {
      Alert.alert('Sesion requerida', 'Debes iniciar sesion para guardar un punto de interes.');
      return;
    }

    setSavingPointId(point.id);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicacion para marcar el punto.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      const result = await queuePointOfInterest({
        name: point.name,
        poi_type: point.poiType,
        description: point.description,
        created_at: new Date().toISOString(),
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (!result.ok) {
        Alert.alert('Error', result.error ?? 'No se pudo guardar el punto de interes.');
        return;
      }

      Alert.alert(
        result.queued ? 'Punto en cola' : 'Exito',
        result.queued
          ? `El punto de ${point.name} se guardo localmente y se sincronizara cuando vuelva la conexion.`
          : `Punto de ${point.name} guardado correctamente.`
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error guardando el punto.');
    } finally {
      setSavingPointId(null);
    }
  };

  const handleSelectPoint = (point: PointOfInterest) => {
    Alert.alert(
      `${point.emoji} ${point.name}`,
      point.description,
      [
        {
          text: 'Ver en mapa',
          onPress: () => {
            navigation.goBack();
          },
        },
        {
          text: savingPointId === point.id ? 'Guardando...' : 'Marcar como punto',
          onPress: () => {
            void savePointOfInterest(point);
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const renderPointCard = ({ item }: { item: PointOfInterest }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectPoint(item)}
      activeOpacity={0.7}
      disabled={isSaving}
    >
      <View style={styles.cardContent}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
        <Text style={styles.arrow}>{savingPointId === item.id ? '…' : '›'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Puntos de Interes</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={POINTS_OF_INTEREST}
        renderItem={renderPointCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        scrollEnabled
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Selecciona un punto y usa "Marcar como punto" para guardarlo en la base de datos.
        </Text>
      </View>

      {isSaving ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Añadiendo punto de interes...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B6B',
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B6B',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 15,
  },
  emoji: {
    fontSize: 32,
    marginRight: 15,
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 28,
    color: '#BDC3C7',
    marginLeft: 10,
  },
  footer: {
    backgroundColor: '#2C3E50',
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'white',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
});
