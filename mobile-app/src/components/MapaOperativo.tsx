import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

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
  incident?: string | null;
  location?: PuntoGeografico;
};

type PointOfInterestMapa = {
  id: string;
  name?: string | null;
  poi_type?: string | null;
  description?: string | null;
  incident?: string | null;
  incident_name?: string | null;
  created_by_username?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string | null;
  location?: unknown;
};

type JourneyMapa = {
  id: number | string;
  created_at?: string | null;
  user?: string | null;
  user_id?: string | null;
  account_user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location_start?: unknown;
  location_stop?: unknown;
  notes?: unknown;
};

type MapaOperativoProps = {
  mostrarCabecera?: boolean;
  modoLigero?: boolean;
};

type PointCoordinates = {
  latitude: number;
  longitude: number;
};

type MarcadorPlano = {
  id: string;
  titulo: string;
  latitud: number;
  longitud: number;
  color: string;
  tipo: 'incidente' | 'alerta' | 'usuario' | 'poi' | 'jornada_inicio' | 'jornada_fin' | 'jornada_pausa';
  subtitulo?: string;
  detalles?: string[];
  incidentId?: string | null;
};

type RutaJornada = {
  id: string;
  titulo: string;
  color: string;
  puntos: PointCoordinates[];
  detalles: string[];
};

type CapaMapa = 'incidentes' | 'alertas' | 'poi' | 'jornadas';
type CapasVisibles = Record<CapaMapa, boolean>;

const DELTA_MINIMO = 0.08;
const REGION_ESPANA = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 2.6,
  longitudeDelta: 2.6,
};
const CAPAS_INICIALES: CapasVisibles = {
  incidentes: true,
  alertas: true,
  poi: true,
  jornadas: true,
};

function tieneValor<T>(valor: T | null): valor is T {
  return Boolean(valor);
}

function normalizarLista<T>(payload: T[] | { results?: T[] }) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function parsePoint(value: unknown): PointCoordinates | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const longitude = Number(value[0]);
    const latitude = Number(value[1]);
    if (isValidCoordinates(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  if (typeof value === 'object') {
    const candidate = value as {
      coordinates?: unknown;
      x?: unknown;
      y?: unknown;
      lat?: unknown;
      lng?: unknown;
      lon?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };

    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const longitude = Number(candidate.coordinates[0]);
      const latitude = Number(candidate.coordinates[1]);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }

    if (candidate.x !== undefined && candidate.y !== undefined) {
      const longitude = Number(candidate.x);
      const latitude = Number(candidate.y);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }

    const latitudeValue = candidate.latitude ?? candidate.lat;
    const longitudeValue = candidate.longitude ?? candidate.lng ?? candidate.lon;
    if (latitudeValue !== undefined && longitudeValue !== undefined) {
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  if (typeof value === 'string') {
    const match = value.match(/POINT\s*\(\s*([-+]?\d+(\.\d+)?)\s+([-+]?\d+(\.\d+)?)\s*\)/i);
    if (match) {
      const longitude = Number(match[1]);
      const latitude = Number(match[3]);
      if (isValidCoordinates(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

function parsePointOfInterestPoint(point: PointOfInterestMapa) {
  if (point.latitude != null && point.longitude != null) {
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    if (isValidCoordinates(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return parsePoint(point.location);
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start) return 'Duracion no disponible';
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return 'Duracion no disponible';
  }

  const totalMinutes = Math.round((endMs - startMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function formatNotesSummary(notes: unknown) {
  if (!notes) return '';
  if (typeof notes === 'string') return notes;
  if (typeof notes !== 'object') return String(notes);

  const candidate = notes as Record<string, unknown>;
  const keys = Object.keys(candidate).filter((key) => !['pauses', 'pause_points', 'stops', 'breaks'].includes(key));
  if (!keys.length) {
    const pauseCount = parsePausePoints(notes).length;
    return pauseCount ? `${pauseCount} pausas registradas` : '';
  }

  return keys
    .slice(0, 4)
    .map((key) => {
      const value = candidate[key];
      if (Array.isArray(value)) return `${key}: ${value.length} elementos`;
      if (value && typeof value === 'object') return `${key}: datos registrados`;
      return `${key}: ${String(value)}`;
    })
    .join(' | ');
}

function parsePausePoints(notes: unknown): Array<PointCoordinates & { id: string; title: string; description?: string }> {
  if (!notes || typeof notes !== 'object') {
    return [];
  }

  const candidate = notes as {
    pauses?: unknown;
    pause_points?: unknown;
    stops?: unknown;
    breaks?: unknown;
  };

  const rawPoints =
    (Array.isArray(candidate.pauses) && candidate.pauses) ||
    (Array.isArray(candidate.pause_points) && candidate.pause_points) ||
    (Array.isArray(candidate.stops) && candidate.stops) ||
    (Array.isArray(candidate.breaks) && candidate.breaks) ||
    [];

  return rawPoints
    .map((item, index) => {
      const point = parsePoint(item);
      if (!point) return null;

      const entry = item as { title?: unknown; name?: unknown; description?: unknown; label?: unknown };
      return {
        id: `pause-${index + 1}`,
        title:
          (typeof entry.title === 'string' && entry.title.trim()) ||
          (typeof entry.name === 'string' && entry.name.trim()) ||
          (typeof entry.label === 'string' && entry.label.trim()) ||
          `Pausa ${index + 1}`,
        description: typeof entry.description === 'string' ? entry.description.trim() : undefined,
        ...point,
      };
    })
    .filter(tieneValor);
}

function crearMarcadores(
  incidentes: IncidenteMapa[],
  alertas: AlertaMapa[],
  puntosInteres: PointOfInterestMapa[],
  jornadas: JourneyMapa[],
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
        subtitulo: 'Incidente abierto',
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
        subtitulo: 'Alerta abierta',
      };
    })
    .filter(tieneValor);

  const marcadoresPuntosInteres: MarcadorPlano[] = puntosInteres
    .filter((point) => point.is_active !== false)
    .map((point) => {
      const coordinates = parsePointOfInterestPoint(point);
      if (!coordinates) {
        return null;
      }

      return {
        id: String(point.id),
        titulo: point.name || 'Punto de interes',
        latitud: coordinates.latitude,
        longitud: coordinates.longitude,
        color: '#7C3AED',
        tipo: 'poi' as const,
        subtitulo: point.poi_type || 'POI',
        incidentId: point.incident ? String(point.incident) : null,
        detalles: [
          point.description ? `Descripcion: ${point.description}` : '',
          point.incident_name ? `Incidente: ${point.incident_name}` : '',
          point.created_by_username ? `Creado por: ${point.created_by_username}` : '',
          point.location_address ? `Direccion: ${point.location_address}` : '',
          point.created_at ? `Creado: ${formatDate(point.created_at)}` : '',
        ].filter(Boolean),
      };
    })
    .filter(tieneValor);

  const marcadoresJornadas: MarcadorPlano[] = jornadas.flatMap((jornada) => {
    const startPoint = parsePoint(jornada.location_start);
    const stopPoint = parsePoint(jornada.location_stop);
    const pausePoints = parsePausePoints(jornada.notes);
    const estado = jornada.end_date ? 'Finalizada' : 'Activa';
    const detallesBase = [
      `ID jornada: ${jornada.id}`,
      `Operativo: ${jornada.user || jornada.user_id || 'Sin usuario'}`,
      `Estado: ${estado}`,
      `Creada: ${formatDate(jornada.created_at)}`,
      `Inicio: ${formatDate(jornada.start_date)}`,
      `Fin: ${jornada.end_date ? formatDate(jornada.end_date) : 'En curso'}`,
      `Duracion: ${formatDuration(jornada.start_date, jornada.end_date)}`,
      formatNotesSummary(jornada.notes) ? `Notas: ${formatNotesSummary(jornada.notes)}` : '',
    ].filter(Boolean);

    const markers: MarcadorPlano[] = [];

    if (startPoint) {
      markers.push({
        id: `${jornada.id}-inicio`,
        titulo: `Inicio jornada #${jornada.id}`,
        latitud: startPoint.latitude,
        longitud: startPoint.longitude,
        color: '#16A34A',
        tipo: 'jornada_inicio',
        subtitulo: estado,
        detalles: detallesBase,
      });
    }

    pausePoints.forEach((pausePoint) => {
      markers.push({
        id: `${jornada.id}-${pausePoint.id}`,
        titulo: `${pausePoint.title} | Jornada #${jornada.id}`,
        latitud: pausePoint.latitude,
        longitud: pausePoint.longitude,
        color: '#F59E0B',
        tipo: 'jornada_pausa',
        subtitulo: 'Pausa registrada',
        detalles: [...detallesBase, pausePoint.description ? `Detalle pausa: ${pausePoint.description}` : ''].filter(Boolean),
      });
    });

    if (stopPoint) {
      markers.push({
        id: `${jornada.id}-fin`,
        titulo: `Fin jornada #${jornada.id}`,
        latitud: stopPoint.latitude,
        longitud: stopPoint.longitude,
        color: '#DC2626',
        tipo: 'jornada_fin',
        subtitulo: estado,
        detalles: detallesBase,
      });
    }

    return markers;
  });

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
            subtitulo: 'Posicion actual',
          },
        ]
      : [];

  return [...marcadoresIncidentes, ...marcadoresAlertas, ...marcadoresPuntosInteres, ...marcadoresJornadas, ...marcadorUsuario];
}

function crearRutasJornadas(jornadas: JourneyMapa[], currentPoint: PointCoordinates | null): RutaJornada[] {
  return jornadas
    .map((jornada) => {
      const startPoint = parsePoint(jornada.location_start);
      const stopPoint = parsePoint(jornada.location_stop);
      const pausePoints = parsePausePoints(jornada.notes);
      const puntos = [
        ...(startPoint ? [startPoint] : []),
        ...pausePoints.map((pausePoint) => ({ latitude: pausePoint.latitude, longitude: pausePoint.longitude })),
        ...(stopPoint ? [stopPoint] : !jornada.end_date && currentPoint ? [currentPoint] : []),
      ];

      if (puntos.length < 2) {
        return null;
      }

      return {
        id: `jornada-${jornada.id}`,
        titulo: `Recorrido jornada #${jornada.id}`,
        color: jornada.end_date ? '#64748B' : '#2563EB',
        puntos,
        detalles: [
          `ID jornada: ${jornada.id}`,
          `Operativo: ${jornada.user || jornada.user_id || 'Sin usuario'}`,
          `Estado: ${jornada.end_date ? 'Finalizada' : 'Activa'}`,
          `Creada: ${formatDate(jornada.created_at)}`,
          `Inicio: ${formatDate(jornada.start_date)}`,
          `Fin: ${jornada.end_date ? formatDate(jornada.end_date) : 'En curso'}`,
          `Duracion: ${formatDuration(jornada.start_date, jornada.end_date)}`,
          `Puntos de ruta: ${puntos.length}`,
          formatNotesSummary(jornada.notes) ? `Notas: ${formatNotesSummary(jornada.notes)}` : '',
        ].filter(Boolean),
      };
    })
    .filter(tieneValor);
}

function calcularRegionAjustada(marcadores: MarcadorPlano[], regionBase: typeof REGION_ESPANA) {
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

function serializarParaScript(valor: unknown) {
  return JSON.stringify(valor).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function crearHtmlMapa(marcadores: MarcadorPlano[], rutas: RutaJornada[], region: typeof REGION_ESPANA) {
  const marcadoresSerializados = serializarParaScript(marcadores);
  const rutasSerializadas = serializarParaScript(rutas);
  const regionSerializada = serializarParaScript(region);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        background: #eef2f7;
      }
      .leaflet-control-attribution {
        font-size: 10px;
      }
      .marker-dot {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      .marker-dot.usuario {
        box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      .marker-label {
        transform: translate(-50%, -34px);
        padding: 3px 7px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.88);
        color: #ffffff;
        font: 700 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
      }
      .popup-title {
        font-weight: 800;
        margin-bottom: 4px;
        color: #0f172a;
      }
      .popup-subtitle {
        color: #475569;
        font-size: 12px;
        margin-bottom: 6px;
      }
      .popup-detail {
        color: #334155;
        font-size: 12px;
        margin-top: 3px;
      }
      .popup-action {
        appearance: none;
        border: 0;
        border-radius: 8px;
        background: #2563eb;
        color: #ffffff;
        cursor: pointer;
        display: block;
        font: 800 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin-top: 10px;
        padding: 8px 10px;
        text-align: center;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      function avisarApp(tipo) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(typeof tipo === 'string' ? tipo : JSON.stringify(tipo));
        }
      }

      const marcadores = ${marcadoresSerializados};
      const rutas = ${rutasSerializadas};
      const region = ${regionSerializada};
      let map = null;

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function abrirIncidente(incidentId) {
        avisarApp({ type: 'open-incident', incidentId: incidentId });
      }

      function popupHtml(titulo, subtitulo, detalles, incidentId) {
        const detalleHtml = (detalles || [])
          .filter(Boolean)
          .map((detalle) => '<div class="popup-detail">' + escapeHtml(detalle) + '</div>')
          .join('');
        const actionHtml = incidentId
          ? '<button class="popup-action" type="button" data-incident-id="' + escapeHtml(incidentId) + '">Abrir incidente relacionado</button>'
          : '';

        return '<div class="popup-title">' + escapeHtml(titulo) + '</div>' +
          (subtitulo ? '<div class="popup-subtitle">' + escapeHtml(subtitulo) + '</div>' : '') +
          detalleHtml +
          actionHtml;
      }

      try {
        map = L.map('map', {
          zoomControl: true,
          attributionControl: true
        }).setView([region.latitude, region.longitude], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
      } catch (error) {
        avisarApp('map-error');
      }

      const puntos = [];
      marcadores.forEach((marcador) => {
        const icon = L.divIcon({
          className: '',
          html: '<div class="marker-dot ' + marcador.tipo + '" style="background:' + marcador.color + '"></div>' +
            (marcador.tipo === 'poi' ? '<div class="marker-label">POI</div>' : '') +
            (marcador.tipo.indexOf('jornada') === 0 ? '<div class="marker-label">J</div>' : ''),
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const punto = [marcador.latitud, marcador.longitud];
        puntos.push(punto);
        L.marker(punto, { icon }).addTo(map).bindPopup(
          popupHtml(marcador.titulo, marcador.subtitulo, marcador.detalles, marcador.incidentId)
        );
      });

      rutas.forEach((ruta) => {
        const puntosRuta = ruta.puntos.map((punto) => [punto.latitude, punto.longitude]);
        puntosRuta.forEach((punto) => puntos.push(punto));
        L.polyline(puntosRuta, {
          color: ruta.color,
          weight: 5,
          opacity: 0.84,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map).bindPopup(popupHtml(ruta.titulo, 'Recorrido de jornada', ruta.detalles));
      });

      map.on('popupopen', function (event) {
        const button = event.popup.getElement().querySelector('.popup-action');
        if (!button) {
          return;
        }

        button.addEventListener('click', function (clickEvent) {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          const incidentId = button.getAttribute('data-incident-id');
          if (incidentId) {
            abrirIncidente(incidentId);
          }
        });
      });

      if (puntos.length > 1) {
        map.fitBounds(puntos, { padding: [42, 42], maxZoom: 15 });
      } else if (puntos.length === 1) {
        map.setView(puntos[0], 14);
      } else {
        map.fitBounds([
          [region.latitude - region.latitudeDelta / 2, region.longitude - region.longitudeDelta / 2],
          [region.latitude + region.latitudeDelta / 2, region.longitude + region.longitudeDelta / 2]
        ]);
      }

      setTimeout(() => map.invalidateSize(), 250);
      avisarApp('map-ready');
    </script>
  </body>
</html>`;
}

export default function MapaOperativo({
  mostrarCabecera = true,
  modoLigero = false,
}: MapaOperativoProps) {
  const navigation = useNavigation<any>();
  const { location } = useLocation();
  const { token, user } = useAuth();
  const [incidentes, setIncidentes] = useState<IncidenteMapa[]>([]);
  const [alertas, setAlertas] = useState<AlertaMapa[]>([]);
  const [puntosInteres, setPuntosInteres] = useState<PointOfInterestMapa[]>([]);
  const [jornadas, setJornadas] = useState<JourneyMapa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorRemoto, setErrorRemoto] = useState('');
  const [mapaListo, setMapaListo] = useState(false);
  const [errorMapa, setErrorMapa] = useState('');
  const [capasVisibles, setCapasVisibles] = useState<CapasVisibles>(CAPAS_INICIALES);

  const cargarCapasRemotas = useCallback(async () => {
    if (!token) {
      setErrorRemoto('No hay sesion activa para cargar incidentes y alertas.');
      setIncidentes([]);
      setAlertas([]);
      setPuntosInteres([]);
      setJornadas([]);
      return;
    }

    if (!user?.organization_id) {
      setErrorRemoto('El usuario no tiene organizacion asignada para filtrar el mapa.');
      setIncidentes([]);
      setAlertas([]);
      setPuntosInteres([]);
      setJornadas([]);
      return;
    }

    setCargando(true);
    setErrorRemoto('');

    try {
      const organizationId = encodeURIComponent(user.organization_id);
      const [respuestaIncidentes, respuestaAlertas, respuestaPuntosInteres, respuestaJornadas] = await Promise.all([
        apiFetch(`/incidents/?owner_organization=${organizationId}&status=OPEN`, { token, timeoutMs: 30000 }),
        apiFetch('/alerts/open/', { token, timeoutMs: 30000 }),
        apiFetch('/points-of-interest/?is_active=true', { token, timeoutMs: 30000 }),
        apiFetch('/journeys/?ordering=-created_at', { token, timeoutMs: 30000 }),
      ]);

      let siguientesIncidentes: IncidenteMapa[] = [];
      let siguientesAlertas: AlertaMapa[] = [];
      let siguientesPuntosInteres: PointOfInterestMapa[] = [];
      let siguientesJornadas: JourneyMapa[] = [];
      let siguienteError = '';

      if (respuestaIncidentes.ok) {
        const datosIncidentes = await parseJsonResponse<{ results?: IncidenteMapa[] } | IncidenteMapa[]>(
          respuestaIncidentes
        );
        siguientesIncidentes = normalizarLista(datosIncidentes);
      } else {
        const datosError = await parseJsonResponse<{ detail?: string }>(respuestaIncidentes);
        siguienteError =
          datosError.detail ?? `No se pudieron cargar los incidentes (${respuestaIncidentes.status}).`;
      }

      if (respuestaAlertas.ok) {
        const datosAlertas = await parseJsonResponse<AlertaMapa[] | { results?: AlertaMapa[] }>(
          respuestaAlertas
        );
        const todasAlertas = normalizarLista(datosAlertas);
        const idsIncidentes = new Set(siguientesIncidentes.map((incidente) => String(incidente.id)));
        siguientesAlertas = todasAlertas.filter((alerta) => alerta.incident && idsIncidentes.has(String(alerta.incident)));
      } else {
        const datosError = await parseJsonResponse<{ detail?: string }>(respuestaAlertas);
        const errorAlertas =
          datosError.detail ?? `No se pudieron cargar las alertas (${respuestaAlertas.status}).`;
        siguienteError = siguienteError ? `${siguienteError} ${errorAlertas}` : errorAlertas;
      }

      if (respuestaPuntosInteres.ok) {
        const datosPuntosInteres = await parseJsonResponse<PointOfInterestMapa[] | { results?: PointOfInterestMapa[] }>(
          respuestaPuntosInteres
        );
        siguientesPuntosInteres = normalizarLista(datosPuntosInteres);
      } else {
        const datosError = await parseJsonResponse<{ detail?: string }>(respuestaPuntosInteres);
        const errorPuntos =
          datosError.detail ?? `No se pudieron cargar los puntos de interes (${respuestaPuntosInteres.status}).`;
        siguienteError = siguienteError ? `${siguienteError} ${errorPuntos}` : errorPuntos;
      }

      if (respuestaJornadas.ok) {
        const datosJornadas = await parseJsonResponse<JourneyMapa[] | { results?: JourneyMapa[] }>(
          respuestaJornadas
        );
        siguientesJornadas = normalizarLista(datosJornadas).filter(
          (journey) =>
            journey.account_user_id === user.id ||
            journey.user_id === user.profile_id ||
            journey.user_id === user.id ||
            !journey.account_user_id
        );
      } else {
        const datosError = await parseJsonResponse<{ detail?: string }>(respuestaJornadas);
        const errorJornadas =
          datosError.detail ?? `No se pudieron cargar las jornadas (${respuestaJornadas.status}).`;
        siguienteError = siguienteError ? `${siguienteError} ${errorJornadas}` : errorJornadas;
      }

      setIncidentes(siguientesIncidentes);
      setAlertas(siguientesAlertas);
      setPuntosInteres(siguientesPuntosInteres);
      setJornadas(siguientesJornadas.slice(0, 20));
      setErrorRemoto(siguienteError);
    } catch (error) {
      setIncidentes([]);
      setAlertas([]);
      setPuntosInteres([]);
      setJornadas([]);
      setErrorRemoto(error instanceof Error ? error.message : 'Fallo cargando capas remotas.');
    } finally {
      setCargando(false);
    }
  }, [token, user?.id, user?.organization_id, user?.profile_id]);

  useFocusEffect(
    useCallback(() => {
      void cargarCapasRemotas();
    }, [cargarCapasRemotas])
  );

  const regionBase = useMemo<typeof REGION_ESPANA>(
    () => ({
      latitude: location?.coords.latitude ?? REGION_ESPANA.latitude,
      longitude: location?.coords.longitude ?? REGION_ESPANA.longitude,
      latitudeDelta: REGION_ESPANA.latitudeDelta,
      longitudeDelta: REGION_ESPANA.longitudeDelta,
    }),
    [location]
  );

  const puntoActual = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
    : null;

  const incidentesVisibles = useMemo(() => (capasVisibles.incidentes ? incidentes : []), [capasVisibles.incidentes, incidentes]);
  const alertasVisibles = useMemo(() => (capasVisibles.alertas ? alertas : []), [alertas, capasVisibles.alertas]);
  const puntosInteresVisibles = useMemo(() => (capasVisibles.poi ? puntosInteres : []), [capasVisibles.poi, puntosInteres]);
  const jornadasVisibles = useMemo(() => (capasVisibles.jornadas ? jornadas : []), [capasVisibles.jornadas, jornadas]);

  const marcadores = useMemo(
    () =>
      crearMarcadores(
        incidentesVisibles,
        alertasVisibles,
        puntosInteresVisibles,
        jornadasVisibles,
        location?.coords.latitude,
        location?.coords.longitude
      ),
    [alertasVisibles, incidentesVisibles, jornadasVisibles, location, puntosInteresVisibles]
  );

  const rutasJornadas = useMemo(() => crearRutasJornadas(jornadasVisibles, puntoActual), [jornadasVisibles, puntoActual]);

  const regionAjustada = useMemo(() => calcularRegionAjustada(marcadores, regionBase), [marcadores, regionBase]);

  const mapaHtml = useMemo(() => crearHtmlMapa(marcadores, rutasJornadas, regionAjustada), [marcadores, regionAjustada, rutasJornadas]);

  const jornadasActivas = jornadasVisibles.filter((jornada) => !jornada.end_date).length;
  const todasLasCapasActivas = Object.values(capasVisibles).every(Boolean);
  const layerButtons: Array<{ id: CapaMapa; label: string; count: number }> = [
    { id: 'incidentes', label: 'Incidentes', count: incidentes.length },
    { id: 'alertas', label: 'Alertas', count: alertas.length },
    { id: 'poi', label: 'POI', count: puntosInteres.length },
    { id: 'jornadas', label: 'Jornadas', count: jornadas.length },
  ];

  const activarTodasLasCapas = () => {
    setCapasVisibles(CAPAS_INICIALES);
  };

  const alternarCapa = (capa: CapaMapa) => {
    setCapasVisibles((actuales) => ({
      ...actuales,
      [capa]: !actuales[capa],
    }));
  };

  useEffect(() => {
    if (mapaListo) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setErrorMapa('No se pudo cargar el mapa. Comprueba la conexion del dispositivo.');
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [mapaHtml, mapaListo]);

  return (
    <View style={styles.container}>
      {mostrarCabecera ? (
        <View style={styles.cabecera}>
          <Text style={styles.tituloCabecera}>Mapa operativo</Text>
          <Text style={styles.textoCabecera}>
            {cargando
              ? 'Cargando capas...'
              : `Incidentes: ${incidentesVisibles.length} | Alertas: ${alertasVisibles.length} | POI: ${puntosInteresVisibles.length}`}
          </Text>
          <Text style={styles.textoCabecera}>
            {`Jornadas: ${jornadasVisibles.length} | Activas: ${jornadasActivas} | Recorridos: ${rutasJornadas.length}`}
          </Text>
          {errorRemoto ? <Text style={styles.errorTexto}>{errorRemoto}</Text> : null}
        </View>
      ) : (
        <View style={styles.resumenSuperior}>
          <Text style={styles.resumenTexto}>
            {cargando
              ? 'Cargando capas...'
              : `Incidentes: ${incidentesVisibles.length} | Alertas: ${alertasVisibles.length} | POI: ${puntosInteresVisibles.length}`}
          </Text>
          <Text style={styles.etiquetaMapa}>{modoLigero ? 'LIGERO' : 'MAPA'}</Text>
          <Text style={styles.resumenTexto}>{`Jornadas: ${jornadasVisibles.length} | Activas: ${jornadasActivas}`}</Text>
          {errorRemoto ? <Text style={styles.errorTextoCompacto}>{errorRemoto}</Text> : null}
        </View>
      )}

      <View style={[styles.capasPanel, mostrarCabecera ? styles.capasPanelConCabecera : styles.capasPanelCompacto]}>
        <View style={styles.capasBotones}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mostrar todas las capas"
            onPress={activarTodasLasCapas}
            style={[styles.capaBoton, styles.capaBotonTodas, todasLasCapasActivas && styles.capaBotonActiva]}
          >
            <Text style={[styles.capaBotonTexto, todasLasCapasActivas && styles.capaBotonTextoActiva]}>Todas</Text>
          </TouchableOpacity>
          {layerButtons.map((layer) => {
            const activa = capasVisibles[layer.id];
            return (
              <TouchableOpacity
                key={layer.id}
                accessibilityRole="button"
                accessibilityLabel={`${activa ? 'Ocultar' : 'Mostrar'} ${layer.label}`}
                onPress={() => alternarCapa(layer.id)}
                style={[styles.capaBoton, activa && styles.capaBotonActiva]}
              >
                <Text style={[styles.capaBotonTexto, activa && styles.capaBotonTextoActiva]}>
                  {`${layer.label} ${layer.count}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <WebView
        style={styles.mapa}
        source={{ html: mapaHtml, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        geolocationEnabled
        onLoadStart={() => {
          setMapaListo(false);
          setErrorMapa('');
        }}
        onMessage={(event) => {
          const message = event.nativeEvent.data;

          if (message === 'map-ready') {
            setMapaListo(true);
            setErrorMapa('');
            return;
          }

          if (message === 'map-error') {
            setErrorMapa('No se pudo cargar el mapa. Comprueba la conexion del dispositivo.');
            return;
          }

          try {
            const payload = JSON.parse(message) as { type?: string; incidentId?: string };
            if (payload.type === 'open-incident' && payload.incidentId) {
              navigation.navigate('Incident', { incidentId: payload.incidentId });
            }
          } catch {
            // Mensajes no JSON del WebView.
          }
        }}
        onError={() => {
          setErrorMapa('No se pudo cargar el mapa. Comprueba la conexion del dispositivo.');
        }}
      />

      {!mapaListo && !errorMapa ? (
        <View style={styles.estadoMapa}>
          <Text style={styles.estadoMapaTitulo}>Cargando mapa</Text>
          <Text style={styles.estadoMapaTexto}>Preparando la vista operativa.</Text>
        </View>
      ) : null}

      {errorMapa ? (
        <View style={styles.estadoMapa}>
          <Text style={styles.estadoMapaTitulo}>Mapa no disponible</Text>
          <Text style={styles.estadoMapaTexto}>{errorMapa}</Text>
        </View>
      ) : null}

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
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoLeyenda, styles.puntoPoi]} />
            <Text style={styles.textoLeyenda}>POI</Text>
          </View>
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoLeyenda, styles.puntoJornada]} />
            <Text style={styles.textoLeyenda}>Jornadas</Text>
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
  capasPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  capasPanelConCabecera: {
    top: 118,
  },
  capasPanelCompacto: {
    top: 64,
  },
  capasBotones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  capaBoton: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  capaBotonTodas: {
    minWidth: 72,
  },
  capaBotonActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  capaBotonTexto: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  capaBotonTextoActiva: {
    color: colors.white,
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
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  puntoPoi: {
    backgroundColor: '#7C3AED',
  },
  puntoJornada: {
    backgroundColor: '#16A34A',
  },
  textoLeyenda: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: '700',
  },
});

