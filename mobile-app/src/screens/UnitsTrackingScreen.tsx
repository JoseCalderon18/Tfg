import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useUnits } from '../context/UnitsContext';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

export default function UnitsTrackingScreen({ navigation }: any) {
  const { units, stats, loading, error, fetchUnits, refreshAllData } = useUnits();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchUnits();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
    } finally {
      setRefreshing(false);
    }
  };

  const renderUnitCard = ({ item }: { item: any }) => {
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

    const statusColor = statusColors[item.status] || colors.secondary;

    return (
      <TouchableOpacity
        style={styles.unitCard}
        onPress={() => navigation.navigate('UnitDetail', { unitId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.unitName}>{item.name}</Text>
            <Text style={styles.vehicleId}>{item.vehicle_id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabels[item.status]}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Combustible</Text>
              <View style={styles.fuelBar}>
                <View
                  style={[
                    styles.fuelFill,
                    {
                      width: `${item.fuel_level}%`,
                      backgroundColor: item.fuel_level > 20 ? colors.success : colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.percentage}>{item.fuel_level.toFixed(0)}%</Text>
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>Batería</Text>
              <View style={styles.fuelBar}>
                <View
                  style={[
                    styles.fuelFill,
                    {
                      width: `${item.battery_level}%`,
                      backgroundColor: item.battery_level > 15 ? colors.success : colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.percentage}>{item.battery_level.toFixed(0)}%</Text>
            </View>
          </View>

          {item.driver && (
            <View style={styles.driverInfo}>
              <Text style={styles.driverLabel}>Conductor:</Text>
              <Text style={styles.driverName}>
                {item.driver.first_name} {item.driver.last_name}
              </Text>
            </View>
          )}

          {item.consumption_alert && item.consumption_alert.length > 0 && (
            <View style={styles.alertsContainer}>
              {item.consumption_alert.includes('combustible_bajo') && (
                <View style={styles.alert}>
                  <Text style={styles.alertText}>⚠ Combustible bajo</Text>
                </View>
              )}
              {item.consumption_alert.includes('bateria_baja') && (
                <View style={styles.alert}>
                  <Text style={styles.alertText}>⚠ Batería baja</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seguimiento de Unidades</Text>
        {stats && (
          <Text style={styles.subtitle}>
            {stats.available_units} disponibles de {stats.total_units}
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && units.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={units}
          renderItem={renderUnitCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay unidades disponibles</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.heading1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  unitCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  unitName: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  vehicleId: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: 'bold',
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  column: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  fuelBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  fuelFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  percentage: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '600',
  },
  driverInfo: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  driverLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  driverName: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '500',
  },
  alertsContainer: {
    marginTop: spacing.sm,
  },
  alert: {
    backgroundColor: colors.dangerLight || '#FFE5E5',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  alertText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.danger + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.danger,
  },
});
