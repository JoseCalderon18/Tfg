import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';

type Incident = {
  id: string;
  name: string;
  location?: {
    coordinates?: [number, number];
  };
};

type AlertItem = {
  id: string;
  title: string;
  location?: {
    coordinates?: [number, number];
  };
};

export default function MapScreen() {
  // Ubicación local y datos remotos para el mapa operativo.
  const { location } = useLocation();
  const { token } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Cargamos capas operativas remotas para enriquecer el mapa base.
    (async () => {
      try {
        const [incidentsRes, alertsRes] = await Promise.all([
          apiFetch('/incidents/', { token }),
          apiFetch('/alerts/open/', { token }),
        ]);

        if (incidentsRes.ok) {
          const payload = await parseJsonResponse<{ results?: Incident[] } | Incident[]>(incidentsRes);
          setIncidents(Array.isArray(payload) ? payload : payload.results ?? []);
        }

        if (alertsRes.ok) {
          const payload = await parseJsonResponse<AlertItem[]>(alertsRes);
          setAlerts(Array.isArray(payload) ? payload : []);
        }
      } catch {
        // El mapa sigue siendo usable aunque falle la carga de capas remotas.
      }
    })();
  }, [token]);

  const initialRegion = useMemo(() => ({
    latitude: location?.coords.latitude || 40.4168,
    longitude: location?.coords.longitude || -3.7038,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), [location]);

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Mapa operativo</Text>
        <Text style={styles.overlayText}>Incidentes: {incidents.length} · Alertas: {alerts.length}</Text>
      </View>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        followsUserLocation
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Your Location"
          />
        )}

        {incidents.map((incident) => {
          const coords = incident.location?.coordinates;
          if (!coords || coords.length < 2) return null;

          return (
            <Marker
              key={incident.id}
              coordinate={{ latitude: coords[1], longitude: coords[0] }}
              title={incident.name}
              pinColor="#2563EB"
            />
          );
        })}

        {alerts.map((alert) => {
          const coords = alert.location?.coordinates;
          if (!coords || coords.length < 2) return null;

          return (
            <Marker
              key={alert.id}
              coordinate={{ latitude: coords[1], longitude: coords[0] }}
              title={alert.title}
              pinColor="#DC2626"
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 2,
    backgroundColor: '#0F172AE6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  overlayTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: 4,
  },
  overlayText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
});
