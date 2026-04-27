import React, { useCallback, useEffect, useState } from 'react';
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
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

interface PuntosDeInteres {
  id: string;
  name: string;
  emoji: string;
  description: string;
  poiType: string;
}

type GuardarPuntoInteres = {
  id: string;
  name: string;
  poi_type?: string | null;
  description?: string | null;
  incident_name?: string | null;
  created_by_username?: string | null;
  created_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string | null;
  is_active?: boolean;
};

type PointOfInterestListResponse = GuardarPuntoInteres[] | { results?: GuardarPuntoInteres[] };

type Section = 'add' | 'view';

const PUNTOS_DE_INTERES: PuntosDeInteres[] = [
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

function normalizeSavedPoints(payload: PointOfInterestListResponse) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.results ?? [];
}

function getPointCatalogInfo(poiType?: string | null) {
  return PUNTOS_DE_INTERES.find((point) => point.poiType === poiType);
}

function formatPointDate(value?: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'No se pudieron cargar los puntos de interes.';
  }

  try {
    const payload = JSON.parse(text) as { detail?: string; error?: string };
    return payload.detail ?? payload.error ?? 'No se pudieron cargar los puntos de interes.';
  } catch {
    return 'El servidor no devolvio una respuesta valida.';
  }
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`
    );

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        pedestrian?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        country?: string;
      };
    };

    const address = data.address;
    if (!address) {
      return data.display_name ?? '';
    }

    const street = [address.road || address.pedestrian || '', address.house_number || '']
      .filter(Boolean)
      .join(' ')
      .trim();
    const city = address.city || address.town || address.village || address.municipality || '';
    const parts = [street, city, address.country || ''].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : data.display_name ?? '';
  } catch {
    return '';
  }
}

export default function PointsOfInterestScreen({ navigation }: any) {
  const { token } = useAuth();
  const { queuePointOfInterest } = useOfflineSync();
  const [activeSection, setActiveSection] = useState<Section>('add');
  const [savedPoints, setSavedPoints] = useState<GuardarPuntoInteres[]>([]);
  const [loadingSavedPoints, setLoadingSavedPoints] = useState(false);
  const [savedPointsError, setSavedPointsError] = useState<string | null>(null);
  const [readablePointLocations, setReadablePointLocations] = useState<Record<string, string>>({});
  const [resolvingPointLocationIds, setResolvingPointLocationIds] = useState<Record<string, boolean>>({});
  const [savingPointId, setSavingPointId] = useState<string | null>(null);
  const isSaving = savingPointId !== null;

  const loadSavedPoints = useCallback(async () => {
    if (!token) {
      setSavedPoints([]);
      setSavedPointsError('Debes iniciar sesion para ver los puntos de interes.');
      return;
    }

    setLoadingSavedPoints(true);
    setSavedPointsError(null);

    try {
      const response = await apiFetch('/points-of-interest/', { token, timeoutMs: 12000 });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await parseJsonResponse<PointOfInterestListResponse>(response);
      setSavedPoints(normalizeSavedPoints(payload));
    } catch (error) {
      setSavedPoints([]);
      setSavedPointsError(error instanceof Error ? error.message : 'No se pudieron cargar los puntos de interes.');
    } finally {
      setLoadingSavedPoints(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeSection === 'view') {
      void loadSavedPoints();
    }
  }, [activeSection, loadSavedPoints]);

  useEffect(() => {
    if (activeSection !== 'view') {
      return;
    }

    const pointsToResolve = savedPoints.filter((point) => {
      if (point.location_address) {
        return false;
      }

      if (readablePointLocations[point.id]) {
        return false;
      }

      return point.latitude != null && point.longitude != null;
    });

    if (pointsToResolve.length === 0) {
      return;
    }

    let cancelled = false;

    setResolvingPointLocationIds((current) => {
      const next = { ...current };
      pointsToResolve.forEach((point) => {
        next[point.id] = true;
      });
      return next;
    });

    pointsToResolve.forEach((point) => {
      if (point.latitude == null || point.longitude == null) {
        return;
      }

      void reverseGeocode(point.latitude, point.longitude).then((address) => {
        if (cancelled) {
          return;
        }

        if (address) {
          setReadablePointLocations((current) => ({
            ...current,
            [point.id]: address,
          }));
        }

        setResolvingPointLocationIds((current) => ({
          ...current,
          [point.id]: false,
        }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeSection, readablePointLocations, savedPoints]);

  const getReadablePointLocation = (point: GuardarPuntoInteres) => {
    if (point.location_address) {
      return point.location_address;
    }

    if (readablePointLocations[point.id]) {
      return readablePointLocations[point.id];
    }

    if (resolvingPointLocationIds[point.id]) {
      return 'Buscando direccion...';
    }

    return 'Sin direccion detectada';
  };

  const savePointOfInterest = async (point: PuntosDeInteres) => {
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

      if (!result.queued) {
        void loadSavedPoints();
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error guardando el punto.');
    } finally {
      setSavingPointId(null);
    }
  };

  const handleSelectPoint = (point: PuntosDeInteres) => {
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

  const renderPointCard = ({ item }: { item: PuntosDeInteres }) => (
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

  const renderSavedPointCard = ({ item }: { item: GuardarPuntoInteres }) => {
    const catalogInfo = getPointCatalogInfo(item.poi_type);

    return (
      <View style={[styles.card, styles.savedCard]}>
        <View style={styles.cardContent}>
          <Text style={styles.emoji}>{catalogInfo?.emoji ?? '-'}</Text>
          <View style={styles.cardText}>
            <View style={styles.savedHeaderRow}>
              <Text style={styles.cardName}>{item.name || catalogInfo?.name || 'Punto de interes'}</Text>
              <View style={[styles.statusPill, item.is_active === false ? styles.inactivePill : null]}>
                <Text style={styles.statusPillText}>{item.is_active === false ? 'Inactivo' : 'Activo'}</Text>
              </View>
            </View>
            <Text style={styles.cardDescription}>
              {item.description || catalogInfo?.description || 'Sin descripcion'}
            </Text>
            <Text style={styles.savedMeta}>{catalogInfo?.name ?? item.poi_type ?? 'Tipo sin definir'}</Text>
            <Text style={styles.savedMeta}>{getReadablePointLocation(item)}</Text>
            <Text style={styles.savedMeta}>
              {item.incident_name ? `Incidente: ${item.incident_name}` : 'Sin incidente asociado'}
            </Text>
            <Text style={styles.savedMeta}>
              {`Creado por ${item.created_by_username || 'usuario'} · ${formatPointDate(item.created_at)}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSectionHeader = () => (
    <View style={styles.sectionHeader}>
      <TouchableOpacity
        style={[styles.sectionButton, activeSection === 'add' ? styles.sectionButtonActive : null]}
        onPress={() => setActiveSection('add')}
      >
        <Text style={[styles.sectionButtonText, activeSection === 'add' ? styles.sectionButtonTextActive : null]}>
          Anadir
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sectionButton, activeSection === 'view' ? styles.sectionButtonActive : null]}
        onPress={() => setActiveSection('view')}
      >
        <Text style={[styles.sectionButtonText, activeSection === 'view' ? styles.sectionButtonTextActive : null]}>
          Ver puntos
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSavedEmpty = () => {
    if (loadingSavedPoints) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyStateText}>Cargando puntos de interes...</Text>
        </View>
      );
    }

    if (savedPointsError) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No se pudieron cargar</Text>
          <Text style={styles.emptyStateText}>{savedPointsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadSavedPoints()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Sin puntos guardados</Text>
        <Text style={styles.emptyStateText}>Todavia no hay puntos de interes registrados.</Text>
      </View>
    );
  };

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

      {activeSection === 'add' ? (
        <FlatList
          data={PUNTOS_DE_INTERES}
          renderItem={renderPointCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderSectionHeader}
          scrollEnabled
        />
      ) : (
        <FlatList
          data={savedPoints}
          renderItem={renderSavedPointCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderSectionHeader}
          ListEmptyComponent={renderSavedEmpty}
          refreshing={loadingSavedPoints}
          onRefresh={loadSavedPoints}
          scrollEnabled
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {activeSection === 'add'
            ? 'Selecciona un punto y usa "Marcar como punto" para guardarlo en la base de datos.'
            : 'Desliza hacia abajo para actualizar los puntos de interes guardados.'}
        </Text>
      </View>

      {isSaving ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
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
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: colors.text,
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
    color: colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  sectionButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
  },
  sectionButtonActive: {
    backgroundColor: colors.primary,
  },
  sectionButtonText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionButtonTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  savedCard: {
    borderLeftColor: colors.primary,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inactivePill: {
    backgroundColor: colors.textMuted,
  },
  statusPillText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  savedMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSoft,
  },
  arrow: {
    fontSize: 28,
    color: colors.borderStrong,
    marginLeft: 10,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyStateText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    backgroundColor: colors.surface,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.textSoft,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 14,
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
