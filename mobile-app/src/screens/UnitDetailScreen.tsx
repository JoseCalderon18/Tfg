import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useUnits } from '../context/UnitsContext';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import * as unitsService from '../services/units';
import { useAuth } from '../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function UnitDetailScreen({ route, navigation }: any) {
  const { unitId } = route.params;
  const { token } = useAuth();
  const { selectedUnit, fetchUnitDetail, changeUnitStatus, loading, error } = useUnits();
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [consumptionHistory, setConsumptionHistory] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchUnitDetail(unitId);
    loadHistories();
  }, [unitId]);

  const loadHistories = async () => {
    if (!token) return;
    try {
      setLoadingHistory(true);
      const [locations, consumption, statuses] = await Promise.all([
        unitsService.getLocationHistory(token, unitId, { limit: 20 }),
        unitsService.getConsumptionHistory(token, unitId, { limit: 10 }),
        unitsService.getStatusHistory(token, unitId, { limit: 10 }),
      ]);
      setLocationHistory(locations);
      setConsumptionHistory(consumption);
      setStatusHistory(statuses);
    } catch (err) {
      console.error('Error loading histories:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    Alert.alert(
      'Cambiar estado',
      `Cambiar a ${newStatus}?`,
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            changeUnitStatus(unitId, newStatus)
              .then(() => {
                Alert.alert('Éxito', 'Estado actualizado');
              })
              .catch((err) => {
                Alert.alert('Error', 'No se pudo cambiar el estado');
              });
          },
        },
      ]
    );
  };

  if (loading && !selectedUnit) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!selectedUnit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar la unidad</Text>
      </View>
    );
  }

  const statusColors: { [key: string]: string } = {
    DISPONIBLE: colors.success,
    EN_VIAJE: colors.info,
    EN_MANTENIMIENTO: colors.warning,
    OFFLINE: colors.danger,
    CARGANDO: colors.info,
  };

  const statusLabels: { [key: string]: string } = {
    DISPONIBLE: 'Disponible',
    EN_VIAJE: 'En viaje',
    EN_MANTENIMIENTO: 'En mantenimiento',
    OFFLINE: 'Offline',
    CARGANDO: 'Cargando',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con info básica */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.unitName}>{selectedUnit.name}</Text>
            <Text style={styles.vehicleId}>{selectedUnit.vehicle_id}</Text>
          </View>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: statusColors[selectedUnit.status] },
            ]}
          >
            <Text style={styles.statusTextLarge}>{statusLabels[selectedUnit.status]}</Text>
          </View>
        </View>

        {/* Información de recursos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recursos</Text>

          <View style={styles.resourceCard}>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceLabel}>Combustible</Text>
              <View style={styles.resourceBar}>
                <View
                  style={[
                    styles.resourceFill,
                    {
                      width: `${selectedUnit.fuel_level}%`,
                      backgroundColor:
                        selectedUnit.fuel_level > 20 ? colors.success : colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.resourcePercentage}>{selectedUnit.fuel_level.toFixed(1)}%</Text>
            </View>

            <View style={styles.resourceItem}>
              <Text style={styles.resourceLabel}>Batería</Text>
              <View style={styles.resourceBar}>
                <View
                  style={[
                    styles.resourceFill,
                    {
                      width: `${selectedUnit.battery_level}%`,
                      backgroundColor:
                        selectedUnit.battery_level > 15 ? colors.success : colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.resourcePercentage}>{selectedUnit.battery_level.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Kilometraje</Text>
              <Text style={styles.statValue}>{selectedUnit.total_mileage.toFixed(1)} km</Text>
            </View>
          </View>
        </View>

        {/* Información del conductor */}
        {selectedUnit.driver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conductor</Text>
            <View style={styles.driverCard}>
              <Text style={styles.driverName}>
                {selectedUnit.driver.first_name} {selectedUnit.driver.last_name}
              </Text>
            </View>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.availableButton]}
              onPress={() => handleStatusChange('DISPONIBLE')}
            >
              <Text style={styles.actionButtonText}>Disponible</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.transitButton]}
              onPress={() => handleStatusChange('EN_VIAJE')}
            >
              <Text style={styles.actionButtonText}>En Viaje</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.maintenanceButton]}
              onPress={() => handleStatusChange('EN_MANTENIMIENTO')}
            >
              <Text style={styles.actionButtonText}>Mantenimiento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.chargingButton]}
              onPress={() => handleStatusChange('CARGANDO')}
            >
              <Text style={styles.actionButtonText}>Cargando</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Historial de consumo reciente */}
        {consumptionHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consumo Reciente</Text>
            {consumptionHistory.slice(0, 3).map((record) => (
              <View key={record.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyDate}>
                    {new Date(record.created_at).toLocaleString('es-ES')}
                  </Text>
                  <Text style={styles.historyDetail}>
                    Combustible: {record.fuel_level.toFixed(1)}% | Batería:{' '}
                    {record.battery_level.toFixed(1)}%
                  </Text>
                  {record.distance_km > 0 && (
                    <Text style={styles.historyDetail}>
                      Distancia: {record.distance_km.toFixed(1)} km | Consumo:{' '}
                      {record.fuel_consumption_rate.toFixed(2)}/km
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Historial de cambios de estado */}
        {statusHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cambios de Estado Recientes</Text>
            {statusHistory.slice(0, 5).map((record) => (
              <View key={record.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyDate}>
                    {new Date(record.created_at).toLocaleString('es-ES')}
                  </Text>
                  <Text style={styles.historyDetail}>
                    {record.status_anterior} → {record.status_nuevo}
                  </Text>
                  {record.razon && (
                    <Text style={styles.historyDetail}>Razón: {record.razon}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleSection: {
    flex: 1,
  },
  unitName: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  vehicleId: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  statusBadgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.md,
  },
  statusTextLarge: {
    ...typography.body2,
    color: colors.surface,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  resourceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  resourceItem: {
    marginBottom: spacing.md,
  },
  resourceLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  resourceBar: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  resourceFill: {
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  resourcePercentage: {
    ...typography.heading3,
    color: colors.text,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.heading3,
    color: colors.text,
  },
  driverCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  driverName: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionButtonText: {
    ...typography.body2,
    color: colors.surface,
    fontWeight: 'bold',
  },
  availableButton: {
    backgroundColor: colors.success,
  },
  transitButton: {
    backgroundColor: colors.info,
  },
  maintenanceButton: {
    backgroundColor: colors.warning,
  },
  chargingButton: {
    backgroundColor: colors.info,
  },
  historyItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  historyDetail: {
    ...typography.body2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body2,
    color: colors.danger,
  },
});
