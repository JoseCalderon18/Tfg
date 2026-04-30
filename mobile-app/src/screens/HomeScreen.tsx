import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  greeting: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  username: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryCard: {
    borderColor: colors.primary,
  },
  alertCard: {
    borderColor: colors.warning,
    backgroundColor: '#fffbeb',
  },
  mapCard: {
    borderColor: colors.primary,
    backgroundColor: '#f0f9ff',
  },
  trackingActive: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  trackingInactive: {
    borderColor: colors.danger,
    backgroundColor: '#fef2f2',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  iconText: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.small,
    color: colors.textMuted,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  logoutButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  logoutButtonText: {
    ...typography.subtitle,
    color: colors.white,
    color: colors.text,
  },
});
