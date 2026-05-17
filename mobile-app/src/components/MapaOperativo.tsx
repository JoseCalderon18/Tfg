import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

// react-native-webview exports the component as default; require may return the module
// object so ensure we get the component reference regardless of interop.
const WebViewModule = require('react-native-webview');
const WebView = WebViewModule && WebViewModule.default ? WebViewModule.default : WebViewModule;

type PuntoGeografico = {
  coordinates?: [number, number];
};

type IncidenteMapa = {
  id: string;
  name: string;
  location?: PuntoGeografico;
};

type AlertaMapa = {
  id: string;
  title: string;
  location?: PuntoGeografico;
};

type MapaOperativoProps = {
  mostrarCabecera?: boolean;
  modoLigero?: boolean;
};

type MarcadorPlano = {
  id: string;
  titulo: string;
  latitud: number;
  longitud: number;
  color: string;
  tipo: 'incidente' | 'alerta' | 'usuario';
};

const DELTA_MINIMO = 0.08;
const MAP_LOAD_TIMEOUT_MS = 5500;

function tieneValor<T>(valor: T | null): valor is T {
  return Boolean(valor);
}

function crearMarcadores(
  incidentes: IncidenteMapa[],
  alertas: AlertaMapa[],
  latitudUsuario?: number,
  longitudUsuario?: number,
) {
  const marcadoresIncidentes: MarcadorPlano[] = incidentes
    .map((incidente) => {
      const coordenadas = incidente.location?.coordinates;
      if (!coordenadas || coordenadas.length < 2) {
        return null;
      }

      return {
        id: incidente.id,
        titulo: incidente.name,
        latitud: coordenadas[1],
        longitud: coordenadas[0],
        color: colors.primary,
        tipo: 'incidente' as const,
      };
    })
    .filter(tieneValor);

  const marcadoresAlertas: MarcadorPlano[] = alertas
    .map((alerta) => {
      const coordenadas = alerta.location?.coordinates;
      if (!coordenadas || coordenadas.length < 2) {
        return null;
      }

      return {
        id: alerta.id,
        titulo: alerta.title,
        latitud: coordenadas[1],
        longitud: coordenadas[0],
        color: colors.danger,
        tipo: 'alerta' as const,
      };
    })
    .filter(tieneValor);

  const marcadorUsuario =
    latitudUsuario !== undefined && longitudUsuario !== undefined
      ? [
          {
            id: 'usuario',
            titulo: 'Tu posicion',
            latitud: latitudUsuario,
            longitud: longitudUsuario,
            color: colors.primary,
            tipo: 'usuario' as const,
          },
        ]
      : [];

  return [...marcadoresIncidentes, ...marcadoresAlertas, ...marcadorUsuario];
}

function calcularRegionAjustada(marcadores: MarcadorPlano[], regionBase: Region): Region {
  if (!marcadores.length) {
    return regionBase;
  }

  const latitudes = marcadores.map((marcador) => marcador.latitud);
  const longitudes = marcadores.map((marcador) => marcador.longitud);
  const minLatitud = Math.min(...latitudes);
  const maxLatitud = Math.max(...latitudes);
  const minLongitud = Math.min(...longitudes);
  const maxLongitud = Math.max(...longitudes);
  const latitudeDelta = Math.max((maxLatitud - minLatitud) * 1.5, DELTA_MINIMO);
  const longitudeDelta = Math.max((maxLongitud - minLongitud) * 1.5, DELTA_MINIMO);

  return {
    latitude: (minLatitud + maxLatitud) / 2,
    longitude: (minLongitud + maxLongitud) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function renderizarMarcadores(marcadores: MarcadorPlano[]) {
  return marcadores.map((marcador) => (
    <Marker
      key={`${marcador.tipo}-${marcador.id}`}
      coordinate={{ latitude: marcador.latitud, longitude: marcador.longitud }}
      title={marcador.titulo}
      pinColor={marcador.color}
    />
  ));
}

function crearHtmlMapaFallback(marcadores: MarcadorPlano[], region: Region) {
  const markersJson = JSON.stringify(
    marcadores.map((marcador) => ({
      title: marcador.titulo,
      lat: marcador.latitud,
      lng: marcador.longitud,
      color: marcador.color,
      type: marcador.tipo,
    }))
  ).replace(/</g, '\\u003c');

  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html, body, #map { height: 100%; margin: 0; background: #E5E7EB; }
      .marker-dot {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
      }
      .leaflet-popup-content { font: 600 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const markers = ${markersJson};
      const map = L.map('map', { zoomControl: true, attributionControl: false })
        .setView([${region.latitude}, ${region.longitude}], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const bounds = [];
      markers.forEach((marker) => {
        const icon = L.divIcon({
          className: '',
          html: '<div class="marker-dot" style="background:' + marker.color + '"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([marker.lat, marker.lng], { icon })
          .addTo(map)
          .bindPopup(marker.title);
        bounds.push([marker.lat, marker.lng]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      }
    </script>
  </body>
</html>`;
}

class NativeMapBoundary extends React.Component<
  React.PropsWithChildren<{ onError: (message: string) => void }>,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message || 'El mapa nativo fallo al renderizar.');
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function MapaFallback({
  marcadores,
  region,
  motivo,
}: {
  marcadores: MarcadorPlano[];
  region: Region;
  motivo: string;
}) {
  const html = useMemo(() => crearHtmlMapaFallback(marcadores, region), [marcadores, region]);

  return (
    <View style={styles.fallbackContainer}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webMap}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
      <View style={styles.estadoMapa}>
        <Text style={styles.estadoMapaTitulo}>Mapa en modo compatible</Text>
        <Text style={styles.estadoMapaTexto}>{motivo}</Text>
        {marcadores.length > 0 ? (
          <Text style={styles.estadoMapaTexto}>
            {marcadores
              .slice(0, 4)
              .map((marcador) => `${marcador.titulo} (${marcador.latitud.toFixed(4)}, ${marcador.longitud.toFixed(4)})`)
              .join(' | ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function MapaOperativo({
  mostrarCabecera = true,
  modoLigero = false,
}: MapaOperativoProps) {
  const mapaRef = useRef<MapView | null>(null);
  const { location } = useLocation();
  const { token, user } = useAuth();
  const [incidentes, setIncidentes] = useState<IncidenteMapa[]>([]);
  const [alertas, setAlertas] = useState<AlertaMapa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorRemoto, setErrorRemoto] = useState('');
  const [mapaListo, setMapaListo] = useState(false);
  const [errorMapa, setErrorMapa] = useState('');
  const [usarFallbackMapa, setUsarFallbackMapa] = useState(false);

  const cargarCapasRemotas = useCallback(async () => {
    if (!token) {
      setErrorRemoto('No hay sesion activa para cargar incidentes y alertas.');
      setIncidentes([]);
      setAlertas([]);
      return;
    }

    setCargando(true);
    setErrorRemoto('');

    try {
      const incidentesPath = user?.organization_id
        ? `/incidents/?owner_organization=${encodeURIComponent(user.organization_id)}`
        : '/incidents/';

      const [respuestaIncidentes, respuestaAlertas] = await Promise.all([
        apiFetch(incidentesPath, { token }),
        apiFetch('/alerts/open/', { token }),
      ]);

      let siguientesIncidentes: IncidenteMapa[] = [];
      let siguientesAlertas: AlertaMapa[] = [];
      let siguienteError = '';

      if (respuestaIncidentes.ok) {
        const datosIncidentes = await parseJsonResponse<{ results?: IncidenteMapa[] } | IncidenteMapa[]>(
          respuestaIncidentes
        );
        siguientesIncidentes = Array.isArray(datosIncidentes)
          ? datosIncidentes
          : datosIncidentes.results ?? [];
      } else {
        const datosError = await parseJsonResponse<{ detail?: string }>(respuestaIncidentes);
        siguienteError =
          datosError.detail ?? `No se pudieron cargar los incidentes (${respuestaIncidentes.status}).`;
      }

      if (respuestaAlertas.ok) {
        const datosAlertas = await parseJsonResponse<AlertaMapa[] | { results?: AlertaMapa[] }>(
          respuestaAlertas
        );
        siguientesAlertas = Array.isArray(datosAlertas) ? datosAlertas : datosAlertas.results ?? [];
      } else {
        const datosError = await parseJsonResponse<{ detail?: string }>(respuestaAlertas);
        const errorAlertas =
          datosError.detail ?? `No se pudieron cargar las alertas (${respuestaAlertas.status}).`;
        siguienteError = siguienteError ? `${siguienteError} ${errorAlertas}` : errorAlertas;
      }

      setIncidentes(siguientesIncidentes);
      setAlertas(siguientesAlertas);
      setErrorRemoto(siguienteError);
    } catch (error) {
      setIncidentes([]);
      setAlertas([]);
      setErrorRemoto(error instanceof Error ? error.message : 'Fallo cargando capas remotas.');
    } finally {
      setCargando(false);
    }
  }, [token, user?.organization_id]);

  useFocusEffect(
    useCallback(() => {
      void cargarCapasRemotas();
    }, [cargarCapasRemotas])
  );

  const regionBase = useMemo<Region>(
    () => ({
      latitude: location?.coords.latitude || 40.4168,
      longitude: location?.coords.longitude || -3.7038,
      latitudeDelta: 2.6,
      longitudeDelta: 2.6,
    }),
    [location]
  );

  const marcadores = useMemo(
    () => crearMarcadores(incidentes, alertas, location?.coords.latitude, location?.coords.longitude),
    [alertas, incidentes, location]
  );

  const regionAjustada = useMemo(() => calcularRegionAjustada(marcadores, regionBase), [marcadores, regionBase]);

  const activarFallbackMapa = useCallback((motivo: string) => {
    setErrorMapa(motivo);
    setUsarFallbackMapa(true);
  }, []);

  useEffect(() => {
    if (!mapaListo || !mapaRef.current || usarFallbackMapa) {
      return;
    }

    try {
      mapaRef.current.animateToRegion(regionAjustada, 500);
    } catch {
      activarFallbackMapa('El mapa nativo no pudo ajustar la region.');
    }
  }, [activarFallbackMapa, mapaListo, regionAjustada, usarFallbackMapa]);

  useEffect(() => {
    if (usarFallbackMapa) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      if (!mapaListo) {
        activarFallbackMapa('El motor nativo del mapa no termino de cargar. Se muestra un mapa compatible.');
      }
    }, MAP_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [activarFallbackMapa, mapaListo, usarFallbackMapa]);

  const mostrarUbicacionUsuario = Boolean(location && mapaListo && !usarFallbackMapa);

  return (
    <View style={styles.container}>
      {mostrarCabecera ? (
        <View style={styles.cabecera}>
          <Text style={styles.tituloCabecera}>Mapa operativo</Text>
          <Text style={styles.textoCabecera}>
            {cargando ? 'Cargando capas...' : `Incidentes: ${incidentes.length} · Alertas: ${alertas.length}`}
          </Text>
          {errorRemoto ? <Text style={styles.errorTexto}>{errorRemoto}</Text> : null}
        </View>
      ) : (
        <View style={styles.resumenSuperior}>
          <Text style={styles.resumenTexto}>
            {cargando ? 'Cargando capas...' : `Incidentes: ${incidentes.length} · Alertas: ${alertas.length}`}
          </Text>
          <Text style={styles.etiquetaMapa}>{modoLigero ? 'LIGERO' : 'SATELITE'}</Text>
          {errorRemoto ? <Text style={styles.errorTextoCompacto}>{errorRemoto}</Text> : null}
        </View>
      )}

      {usarFallbackMapa ? (
        <MapaFallback
          marcadores={marcadores}
          region={regionAjustada}
          motivo={errorMapa || 'El mapa nativo no esta disponible en este dispositivo.'}
        />
      ) : (
        <NativeMapBoundary onError={activarFallbackMapa}>
          <MapView
            ref={mapaRef}
            style={styles.mapa}
            initialRegion={regionAjustada}
            mapType="standard"
            liteMode={modoLigero}
            loadingEnabled
            toolbarEnabled={!modoLigero}
            rotateEnabled={!modoLigero}
            pitchEnabled={!modoLigero}
            showsCompass={!modoLigero}
            showsBuildings={!modoLigero}
            showsUserLocation={mostrarUbicacionUsuario}
            scrollEnabled
            zoomEnabled
            onMapReady={() => {
              setMapaListo(true);
              setErrorMapa('');
            }}
          >
            {renderizarMarcadores(marcadores)}
          </MapView>
        </NativeMapBoundary>
      )}

      {modoLigero ? (
        <View style={styles.leyendaInferior}>
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoLeyenda, styles.puntoIncidente]} />
            <Text style={styles.textoLeyenda}>Incidentes</Text>
          </View>
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoLeyenda, styles.puntoAlerta]} />
            <Text style={styles.textoLeyenda}>Alertas</Text>
          </View>
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoLeyenda, styles.puntoUsuario]} />
            <Text style={styles.textoLeyenda}>Tu posicion</Text>
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
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E7EB',
  },
  webMap: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  estadoMapa: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 5,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  estadoMapaTitulo: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  estadoMapaTexto: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cabecera: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 2,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tituloCabecera: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  textoCabecera: {
    color: colors.textMuted,
    fontSize: 12,
  },
  resumenSuperior: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  resumenTexto: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  etiquetaMapa: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorTexto: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
  errorTextoCompacto: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  leyendaInferior: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    zIndex: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  puntoLeyenda: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  puntoIncidente: {
    backgroundColor: colors.primary,
  },
  puntoAlerta: {
    backgroundColor: colors.danger,
  },
  puntoUsuario: {
    backgroundColor: colors.primary,
  },
  textoLeyenda: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: '700',
  },
});

