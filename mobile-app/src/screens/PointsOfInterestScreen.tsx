import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';

interface PointOfInterest {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const POINTS_OF_INTEREST: PointOfInterest[] = [
  {
    id: '1',
    name: 'Hidrantes',
    emoji: '🚰',
    description: 'Ubicación de hidrantes disponibles',
  },
  {
    id: '2',
    name: 'Asentamiento',
    emoji: '🏠',
    description: 'Zonas de asentamiento y viviendas',
  },
  {
    id: '3',
    name: 'Cortafuegos',
    emoji: '🔥',
    description: 'Líneas de cortafuegos',
  },
  {
    id: '4',
    name: 'Puntos de Vigilancia',
    emoji: '👁️',
    description: 'Torres y puntos de vigilancia',
  },
  {
    id: '5',
    name: 'Estaciones Base',
    emoji: '🏢',
    description: 'Campamentos y estaciones base',
  },
  {
    id: '6',
    name: 'Vías de Evacuación',
    emoji: '🚪',
    description: 'Rutas de evacuación recomendadas',
  },
];

export default function PointsOfInterestScreen({ navigation }: any) {
  const handleSelectPoint = (point: PointOfInterest) => {
    Alert.alert(
      `${point.emoji} ${point.name}`,
      point.description,
      [
        {
          text: 'Ver en mapa',
          onPress: () => {
            console.log(`Mostrando ${point.name} en el mapa`);
            navigation.goBack();
          },
        },
        {
          text: 'Marcar como punto',
          onPress: () => {
            console.log(`Punto marcado: ${point.name}`);
            Alert.alert('Éxito', `Punto de ${point.name} marcado correctamente`);
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
    >
      <View style={styles.cardContent}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Puntos de Interés</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Lista de Puntos */}
      <FlatList
        data={POINTS_OF_INTEREST}
        renderItem={renderPointCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        scrollEnabled={true}
      />

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📌 Selecciona un punto para ver más opciones
        </Text>
      </View>
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
});
