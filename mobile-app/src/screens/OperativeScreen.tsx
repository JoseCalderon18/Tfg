import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Vibration,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import JourneyLivePanel from '../components/JourneyLivePanel';
import { useLocation } from '../context/LocationContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { sendSosAlert as dispatchSosAlert } from '../services/sos';
import { colors } from '../theme';

const { height } = Dimensions.get('window');
const ALTURA_MENU_INFERIOR = height * 0.15;
const SOS_COUNTDOWN_SECONDS = 4;

type ActiveIncident = {
  id: string;
  name?: string | null;
  status?: string | null;
  is_active?: boolean;
};

type IncidentListResponse = ActiveIncident[] | { results?: ActiveIncident[] };

function normalizeIncidentList(payload: IncidentListResponse) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export default function OperativeScreen({ navigation }: any) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(SOS_COUNTDOWN_SECONDS);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [activeIncidents, setActiveIncidents] = useState<ActiveIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const { user, token, logout } = useAuth();
  const {
    isTracking,
    startTracking,
    stopTracking,
    errorMsg,
    geofenceStatus,
    location,
    routeDistanceKm,
    routeDurationHours,
  } = useLocation();
  const { pendingCount, isSyncing, lastError, queueAlert } = useOfflineSync();
  const sosCancelledRef = useRef(false);
  const activeIncident = useMemo(
    () => activeIncidents.find((incident) => incident.id === selectedIncidentId) ?? null,
    [activeIncidents, selectedIncidentId]
  );

  const handleAlertPress = () => {
    navigation.navigate('Alert');
  };

  const loadActiveIncidents = useCallback(async () => {
    if (!token || !user?.organization_id) {
      setActiveIncidents([]);
      setSelectedIncidentId(null);
      return [];
    }

    const organizationId = encodeURIComponent(user.organization_id);
    const response = await apiFetch(`/incidents/?owner_organization=${organizationId}&status=OPEN`, {
      token,
      timeoutMs: 12000,
    });

    if (!response.ok) {
      throw new Error('No se pudo consultar el incidente activo.');
    }

    const incidents = normalizeIncidentList(await parseJsonResponse<IncidentListResponse>(response)).filter(
      (incident) => incident.is_active !== false
    );

    setActiveIncidents(incidents);
    setSelectedIncidentId((currentSelectedId) => {
      if (incidents.length === 0) return null;
      if (incidents.length === 1) return incidents[0].id;
      if (currentSelectedId && incidents.some((incident) => incident.id === currentSelectedId)) {
        return currentSelectedId;
      }
      return null;
    });
    return incidents;
  }, [token, user?.organization_id]);

  useEffect(() => {
    void loadActiveIncidents().catch(() => undefined);
  }, [loadActiveIncidents]);

  const closeSosModal = () => {
    sosCancelledRef.current = true;
    Vibration.cancel();
    setSosModalVisible(false);
    setSosCountdown(SOS_COUNTDOWN_SECONDS);
    setIsSendingSos(false);
  };

  const handleSendSosAlert = async () => {
    try {
      if (!token) {
        Alert.alert('Error', 'No hay sesion activa.');
        return;
      }

      if (!location) {
        Alert.alert('Error', 'Activa el GPS antes de enviar un SOS.');
        return;
      }

      setIsSendingSos(true);
      const incidents = await loadActiveIncidents().catch(() => activeIncidents);
      const selectedIncident =
        incidents.find((incident) => incident.id === selectedIncidentId) ??
        (incidents.length === 1 ? incidents[0] : activeIncident);

      if (incidents.length > 1 && !selectedIncident?.id) {
        Alert.alert(
          'Selecciona un incidente',
          'Hay varios incidentes abiertos. Elige primero a cual pertenece el SOS para no enviarlo al incidente equivocado.'
        );
        return;
      }

      if (!selectedIncident?.id) {
        Alert.alert(
          'Sin incidente activo',
          'No hay un incidente abierto asociado a tu organizacion. No se enviara el SOS sin incidente asignado.'
        );
        return;
      }

      const result = await dispatchSosAlert({
        queueAlert,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        incidentId: selectedIncident.id,
        description: `SOS enviado desde el boton principal del operativo para ${selectedIncident.name ?? 'incidente activo'}.`,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'No se pudo registrar la alerta SOS.');
      }

      const avisos = [
        result.notification?.central_notified ? 'central operativa' : null,
        result.notification?.team_notified ? 'compañeros del incidente' : null,
      ].filter(Boolean);

      Alert.alert(
        result.queued ? 'SOS en cola' : 'SOS enviado',
        result.queued
          ? 'El SOS se ha guardado sin conexion y se enviara automaticamente al incidente asignado cuando vuelva la red.'
          : avisos.length > 0
            ? `El SOS se ha enviado correctamente y ha avisado a ${avisos.join(' y ')}.`
            : 'El SOS se ha enviado correctamente al incidente asignado.'
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo enviar la alerta SOS.');
    } finally {
      Vibration.cancel();
      setSosModalVisible(false);
      setSosCountdown(SOS_COUNTDOWN_SECONDS);
      setIsSendingSos(false);
    }
  };

  const handleSosPress = () => {
    if (isSendingSos) {
      return;
    }

    sosCancelledRef.current = false;
    setSosCountdown(SOS_COUNTDOWN_SECONDS);
    setSosModalVisible(true);
    Vibration.vibrate([0, 500, 250], true);
  };

  const handleLogout = async () => {
    stopTracking();
    await logout();
  };

  useEffect(() => {
    if (!sosModalVisible || isSendingSos) {
      return;
    }

    if (sosCountdown <= 0) {
      if (!sosCancelledRef.current) {
        void handleSendSosAlert();
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setSosCountdown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isSendingSos, sosCountdown, sosModalVisible]);

  useEffect(() => {
    return () => {
      Vibration.cancel();
    };
  }, []);

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);

    switch (option) {
      case 'companions':
        navigation.navigate('Companions', activeIncident?.id ? { incidentId: activeIncident.id } : undefined);
        break;
      case 'alerts':
        navigation.navigate('Alerts', activeIncident?.id ? { incidentId: activeIncident.id } : undefined);
        break;
      case 'weather':
        navigation.navigate('Weather');
        break;
      case 'units':
        navigation.navigate('UnitsTracking');
        break;
      case 'incidents':
        navigation.navigate('Incidents');
        break;
      case 'chat':
        navigation.navigate('Chat');
        break;
      case 'stopShift':
        Alert.alert('Parar jornada', 'Desea finalizar su jornada?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar', onPress: () => navigation.navigate('StopJourney') },
        ]);
        break;
      case 'startBreak':
        navigation.navigate('StartBreak');
        break;
      case 'help':
        navigation.navigate('Help');
        break;
      case 'logout':
        Alert.alert('Cerrar sesion', 'Desea cerrar sesion?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesion', onPress: () => void handleLogout(), style: 'destructive' },
        ]);
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={() => setMenuVisible(true)}>
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emergencias</Text>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.username || 'Usuario'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Rol'}</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <Text style={styles.mapTitle}>Centro operativo</Text>
        <Text style={styles.statusText}>Seguimiento: {isTracking ? 'Activo' : 'Detenido'}</Text>
        <Text style={styles.statusSubtext}>
          {location
            ? `Lat ${location.coords.latitude.toFixed(4)} · Lng ${location.coords.longitude.toFixed(4)}`
            : 'Sin posicion registrada'}
        </Text>
        <Text style={styles.syncText}>
          Sincronizacion: {isSyncing ? 'Sincronizando...' : pendingCount > 0 ? `${pendingCount} pendiente(s)` : 'Al dia'}
        </Text>
        <Text style={styles.workareaText}>
          Workarea:{' '}
          {!geofenceStatus.hasWorkarea
            ? 'Sin zona activa'
            : geofenceStatus.inside
              ? 'Dentro'
              : 'Fuera'}
        </Text>
        <View style={styles.incidentSelectorCard}>
          <Text style={styles.incidentSelectorTitle}>Incidente para SOS</Text>
          {activeIncidents.length === 0 ? (
            <Text style={styles.incidentSelectorHelp}>No hay incidentes abiertos para tu organizacion.</Text>
          ) : activeIncidents.length === 1 ? (
            <Text style={styles.incidentSelectorHelp}>{activeIncidents[0].name ?? 'Incidente activo'}</Text>
          ) : (
            <>
              <Text style={styles.incidentSelectorHelp}>
                Hay varios abiertos. Selecciona el correcto antes de enviar un SOS.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.incidentChipsRow}
              >
                {activeIncidents.map((incident) => (
                  <TouchableOpacity
                    key={incident.id}
                    style={[
                      styles.incidentChip,
                      selectedIncidentId === incident.id ? styles.incidentChipSelected : null,
                    ]}
                    onPress={() => setSelectedIncidentId(incident.id)}
                  >
                    <Text
                      style={[
                        styles.incidentChipText,
                        selectedIncidentId === incident.id ? styles.incidentChipTextSelected : null,
                      ]}
                      numberOfLines={1}
                    >
                      {incident.name ?? 'Incidente sin nombre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {!errorMsg && lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, isTracking ? styles.stopQuickAction : styles.startQuickAction]}
            onPress={isTracking ? stopTracking : startTracking}
          >
            <Text style={styles.quickActionText}>{isTracking ? 'Detener GPS' : 'Iniciar GPS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionButton, styles.mapQuickAction]} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.quickActionText}>Abrir mapa</Text>
          </TouchableOpacity>
        </View>

        <JourneyLivePanel />

        <View style={styles.tarjetaResumen}>
          <Text style={styles.resumenTitulo}>Mapa operativo</Text>
          <Text style={styles.resumenTexto}>
            El mapa satelital interactivo con incidentes, alertas y tu posicion se ha dejado en pantalla completa
            para evitar los bloqueos del mini mapa en Android.
          </Text>
          <View style={styles.resumenLeyenda}>
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
        </View>

        <TouchableOpacity style={[styles.quickActionButton, styles.mapQuickAction, styles.botonAmpliar]} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.quickActionText}>Ampliar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.sideButton} onPress={handleAlertPress}>
          <Text style={styles.sideButtonText}>🚨{'\n'}ALERTA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerButton} onPress={handleSosPress} disabled={isSendingSos}>
          <Text style={styles.centerButtonText}>{`🆘\nSOS${isSendingSos ? '\nENVIANDO...' : ''}`}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideButton} onPress={() => navigation.navigate('PointsOfInterest')}>
          <Text style={styles.sideButtonText}>📍{'\n'}PUNTOS DE{'\n'}INTERES</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={sosModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSosModal}
      >
        <View style={styles.sosModalOverlay}>
          <View style={styles.sosModalCard}>
            <Text style={styles.sosModalEyebrow}>Alerta critica</Text>
            <Text style={styles.sosModalTitle}>SOS en {sosCountdown}</Text>
            <Text style={styles.sosModalText}>
              El movil esta vibrando. Si no cancelas, se enviara un SOS al incidente asignado.
            </Text>
            <TouchableOpacity
              style={[styles.sosCancelButton, isSendingSos ? styles.sosCancelButtonDisabled : null]}
              onPress={closeSosModal}
              disabled={isSendingSos}
            >
              <Text style={styles.sosCancelButtonText}>
                {isSendingSos ? 'Enviando SOS...' : 'Cancelar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerMenu}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMenuVisible(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.drawerTitle}>Menu</Text>

            <ScrollView style={styles.menuOptions}>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('companions')}>
                <Text style={styles.menuOptionText}>👥 Companeros</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('alerts')}>
                <Text style={styles.menuOptionText}>Alertas registradas</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('weather')}>
                <Text style={styles.menuOptionText}>🌤️ Tiempo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('units')}>
                <Text style={styles.menuOptionText}>Unidades</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('incidents')}>
                <Text style={styles.menuOptionText}>🚧 Incidentes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('chat')}>
                <Text style={styles.menuOptionText}>💬 Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('StartJourney');
                }}
              >
                <Text style={styles.menuOptionText}>▶ Iniciar jornada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('StartBreak');
                }}
              >
                <Text style={styles.menuOptionText}>⏸ Iniciar descanso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('EditJourneys');
                }}
              >
                <Text style={styles.menuOptionText}>Editar jornadas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('StopJourney');
                }}
              >
                <Text style={styles.menuOptionText}>🛑 Parar jornada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Profile');
                }}
              >
                <Text style={styles.menuOptionText}>👤 Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Settings');
                }}
              >
                <Text style={styles.menuOptionText}>⚙ Configuracion</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => handleMenuOption('help')}
              >
                <Text style={styles.menuOptionText}>❓ Ayuda y tutoriales</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOption, styles.logoutOption]}
                onPress={() => handleMenuOption('logout')}
              >
                <Text style={styles.menuOptionText}>🚪 Cerrar sesion</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  hamburgerButton: {
    padding: 10,
  },
  hamburgerText: {
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  userInfo: {
    minWidth: 96,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.9,
    textAlign: 'right',
    lineHeight: 16,
  },
  userRole: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 16,
  },
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.background,
    marginBottom: ALTURA_MENU_INFERIOR,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  mapTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.text,
  },
  tarjetaResumen: {
    width: '100%',
    minHeight: 220,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  resumenTitulo: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  resumenTexto: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  resumenLeyenda: {
    marginTop: 18,
    gap: 10,
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  puntoLeyenda: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 18,
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtext: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
  },
  syncText: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  workareaText: {
    marginTop: 6,
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  incidentSelectorCard: {
    width: '100%',
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  incidentSelectorTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  incidentSelectorHelp: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  incidentChipsRow: {
    gap: 8,
    paddingTop: 10,
    paddingRight: 8,
  },
  incidentChip: {
    maxWidth: 220,
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
  },
  incidentChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  incidentChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  incidentChipTextSelected: {
    color: colors.primary,
  },
  errorText: {
    marginTop: 10,
    color: colors.danger,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
  },
  quickActionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  startQuickAction: {
    backgroundColor: colors.success,
  },
  stopQuickAction: {
    backgroundColor: colors.danger,
  },
  mapQuickAction: {
    backgroundColor: colors.primary,
  },
  botonAmpliar: {
    marginTop: 14,
  },
  quickActionText: {
    color: colors.white,
    fontWeight: '700',
  },
  bottomMenu: {
    height: ALTURA_MENU_INFERIOR,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sideButton: {
    width: '28%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  sideButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  centerButton: {
    width: '38%',
    height: '110%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 15,
    marginHorizontal: 5,
    elevation: 8,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  centerButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  sosModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sosModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: 'center',
  },
  sosModalEyebrow: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sosModalTitle: {
    marginTop: 10,
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  sosModalText: {
    marginTop: 12,
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  sosCancelButton: {
    marginTop: 22,
    width: '100%',
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sosCancelButtonDisabled: {
    opacity: 0.7,
  },
  sosCancelButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  drawerMenu: {
    width: '75%',
    height: '100%',
    backgroundColor: colors.surface,
    paddingTop: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  menuOptions: {
    paddingHorizontal: 10,
  },
  menuOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 5,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  logoutOption: {
    marginTop: 20,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
});

