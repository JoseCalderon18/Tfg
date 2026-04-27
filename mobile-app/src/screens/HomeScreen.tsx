import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { colors } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { isTracking, startTracking, stopTracking } = useLocation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.username || 'User'}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Tracking</Text>
        <TouchableOpacity
          style={[styles.button, isTracking ? styles.stopButton : styles.startButton]}
          onPress={isTracking ? stopTracking : startTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.alertButton]}
        onPress={() => navigation.navigate('Alert')}
      >
        <Text style={styles.buttonText}>Send SOS Alert</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.mapButton]}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.buttonText}>View Map</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    color: colors.text,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: colors.textSoft,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: colors.success,
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  alertButton: {
    backgroundColor: colors.warning,
  },
  mapButton: {
    backgroundColor: colors.primary,
  },
  logoutButton: {
    backgroundColor: colors.textMuted,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
