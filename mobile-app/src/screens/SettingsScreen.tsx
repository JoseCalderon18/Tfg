import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getApiDebugUrls } from '../services/api';

export default function SettingsScreen({ navigation }: any) {
  const urls = getApiDebugUrls();

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Configuracion operativa</Text>
      <Text style={styles.subtitle}>Referencia rapida para conexion y uso en terreno.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>URLs de API detectadas</Text>
        {urls.map((url) => (
          <Text key={url} style={styles.cardValue}>{url}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Buenas practicas</Text>
        <Text style={styles.tip}>- Activa el GPS antes de iniciar jornada.</Text>
        <Text style={styles.tip}>- En Android por USB usa `adb reverse tcp:8000 tcp:8000`.</Text>
        <Text style={styles.tip}>- Registra descansos para que queden reflejados en la ruta.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-end',
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  title: {
    marginTop: 28,
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#CBD5E1',
    fontSize: 14,
  },
  card: {
    marginTop: 20,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardValue: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
  },
  tip: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
});
