import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type PuntoGeografico = {
  coordinates?: [number, number];
  x?: number | string;
  y?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
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
  alertaEnfocada?: AlertaMapa | null;
  centrarEnAlerta?: boolean;
};

type MarcadorPlano = {
  id: string;
  titulo: string;
  latitud: number;
  longitud: number;
  color: string;
  tipo: 'incidente' | 'alerta' | 'usuario';
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DELTA_MINIMO = 0.08;
function tieneValor<T>(valor: T | null): valor is T {
  return Boolean(valor);
}

function esPuntoValido(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function crearPuntoDesdeUbicacion(location?: PuntoGeografico) {
  if (!location) {
    return null;
  }

  if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    const longitude = Number(location.coordinates[0]);
    const latitude = Number(location.coordinates[1]);
    return esPuntoValido(latitude, longitude) ? { latitude, longitude } : null;
  }

  if (location.x !== undefined && location.y !== undefined) {
    const longitude = Number(location.x);
    const latitude = Number(location.y);
    return esPuntoValido(latitude, longitude) ? { latitude, longitude } : null;
  }

  const latitudeValue = location.latitude ?? location.lat;
  const longitudeValue = location.longitude ?? location.lng;
  if (latitudeValue !== undefined && longitudeValue !== undefined) {
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    return esPuntoValido(latitude, longitude) ? { latitude, longitude } : null;
  }

  return null;
}

function crearMarcadores(
  incidentes: IncidenteMapa[],
  alertas: AlertaMapa[],
  latitudUsuario?: number,
  longitudUsuario?: number,
) {
  const marcadoresIncidentes: MarcadorPlano[] = incidentes
    .map((incidente) => {
      const punto = crearPuntoDesdeUbicacion(incidente.location);
      if (!punto) {
        return null;
      }

      return {
        id: incidente.id,
        titulo: incidente.name,
        latitud: punto.latitude,
        longitud: punto.longitude,
        color: colors.primary,
        tipo: 'incidente' as const,
      };
    })
    .filter(tieneValor);

  const marcadoresAlertas: MarcadorPlano[] = alertas
    .map((alerta) => {
      const punto = crearPuntoDesdeUbicacion(alerta.location);
      if (!punto) {
        return null;
      }

      return {
        id: alerta.id,
        titulo: alerta.title,
        latitud: punto.latitude,
        longitud: punto.longitude,
        color: colors.danger,
        tipo: 'alerta' as const,
      };
    })
    .filter(tieneValor);

  const marcadorUsuario =
    latitudUsuario !== undefined && longitudUsuario !== undefined && esPuntoValido(latitudUsuario, longitudUsuario)
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
  const latitude = (minLatitud + maxLatitud) / 2;
  const longitude = (minLongitud + maxLongitud) / 2;

  if (!esPuntoValido(latitude, longitude) || !Number.isFinite(latitudeDelta) || !Number.isFinite(longitudeDelta)) {
    return regionBase;
  }

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

function limitarValor(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function crearHtmlMapaOpenStreetMap(region: Region, marcadores: MarcadorPlano[]) {
  const sur = limitarValor(region.latitude - region.latitudeDelta / 2, -85, 85);
  const norte = limitarValor(region.latitude + region.latitudeDelta / 2, -85, 85);
  const oeste = limitarValor(region.longitude - region.longitudeDelta / 2, -180, 180);
  const este = limitarValor(region.longitude + region.longitudeDelta / 2, -180, 180);
  const marcadoresJson = JSON.stringify(marcadores).replace(/</g, '\\u003c');
  const resumenMarcadores = marcadores
    .slice(0, 6)
    .map(
      (marcador) =>
        `<li><strong>${escaparHtml(marcador.titulo)}</strong><span>${marcador.latitud.toFixed(5)}, ${marcador.longitud.toFixed(5)}</span></li>`
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #mapa { height: 100%; width: 100%; margin: 0; padding: 0; }
          body { background: #eef2f7; font-family: Arial, sans-serif; overflow: hidden; }
          .leaflet-container { background: #dbeafe; }
          .marcador {
            width: 18px;
            height: 18px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #fff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
          }
          .marcador span {
            display: block;
            width: 6px;
            height: 6px;
            margin: 4px;
            border-radius: 999px;
            background: #fff;
          }
          .panel {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 2;
            background: rgba(255,255,255,0.94);
            border: 1px solid #d9e2ec;
            border-radius: 12px;
            padding: 10px 12px;
            color: #102033;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.18);
          }
          h1 { margin: 0 0 6px; font-size: 14px; }
          ul { list-style: none; margin: 0; padding: 0; max-height: 96px; overflow: auto; }
          li { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding-top: 4px; }
          span { color: #526477; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div id="mapa"></div>
        <div class="panel">
          <h1>Mapa operativo</h1>
          <ul>${resumenMarcadores || '<li>No hay marcadores con coordenadas.</li>'}</ul>
        </div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const marcadores = ${marcadoresJson};
          const mapa = L.map('mapa', { zoomControl: true, attributionControl: true });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
          }).addTo(mapa);

          const bounds = [[${sur}, ${oeste}], [${norte}, ${este}]];
          mapa.fitBounds(bounds, { padding: [22, 22], animate: false });

          marcadores.forEach((marcador) => {
            const icono = L.divIcon({
              className: '',
              html: '<div class="marcador" style="background:' + marcador.color + '"><span></span></div>',
              iconSize: [22, 22],
              iconAnchor: [11, 22],
              popupAnchor: [0, -20],
            });

            L.marker([marcador.latitud, marcador.longitud], { icon: icono })
              .addTo(mapa)
              .bindPopup('<strong>' + marcador.titulo + '</strong><br/>' + marcador.tipo);
          });
        </script>
      </body>
    </html>
  `;
}

export default function MapaOperativo({
  mostrarCabecera = true,
  modoLigero = false,
  alertaEnfocada = null,
  centrarEnAlerta = false,
}: MapaOperativoProps) {
  const { location } = useLocation();
  const { token, user } = useAuth();
  const [incidentes, setIncidentes] = useState<IncidenteMapa[]>([]);
  const [alertas, setAlertas] = useState<AlertaMapa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorRemoto, setErrorRemoto] = useState('');

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
      latitude: esPuntoValido(location?.coords.latitude ?? NaN, location?.coords.longitude ?? NaN)
        ? location!.coords.latitude
        : 40.4168,
      longitude: esPuntoValido(location?.coords.latitude ?? NaN, location?.coords.longitude ?? NaN)
        ? location!.coords.longitude
        : -3.7038,
      latitudeDelta: 2.6,
      longitudeDelta: 2.6,
    }),
    [location]
  );

  const marcadores = useMemo(
    () => {
      const base = crearMarcadores(incidentes, alertas, location?.coords.latitude, location?.coords.longitude);
      const puntoEnfocado = crearPuntoDesdeUbicacion(alertaEnfocada?.location);

      if (!alertaEnfocada || !puntoEnfocado) {
        return base;
      }

      const yaExiste = base.some((marcador) => marcador.tipo === 'alerta' && marcador.id === alertaEnfocada.id);
      if (yaExiste) {
        return base;
      }

      return [
        {
          id: alertaEnfocada.id,
          titulo: alertaEnfocada.title,
          latitud: puntoEnfocado.latitude,
          longitud: puntoEnfocado.longitude,
          color: colors.danger,
          tipo: 'alerta' as const,
        },
        ...base,
      ];
    },
    [alertaEnfocada, alertas, incidentes, location]
  );

  const marcadoresRegion = useMemo(() => {
    if (!centrarEnAlerta || !alertaEnfocada) {
      return marcadores;
    }

    return marcadores.filter((marcador) => marcador.tipo === 'alerta' && marcador.id === alertaEnfocada.id);
  }, [alertaEnfocada, centrarEnAlerta, marcadores]);

  const regionAjustada = useMemo(
    () => calcularRegionAjustada(marcadoresRegion.length ? marcadoresRegion : marcadores, regionBase),
    [marcadores, marcadoresRegion, regionBase]
  );
  const htmlMapaOpenStreetMap = useMemo(
    () => crearHtmlMapaOpenStreetMap(regionAjustada, marcadoresRegion.length ? marcadoresRegion : marcadores),
    [marcadores, marcadoresRegion, regionAjustada]
  );

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

      <WebView
        source={{ html: htmlMapaOpenStreetMap }}
        style={styles.mapa}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />

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

