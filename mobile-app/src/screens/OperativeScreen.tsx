import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

const { height } = Dimensions.get('window');
const ALTURA_MENU_INFERIOR = height * 0.15;

export default function OperativeScreen({ navigation }: any) {
  const [menuVisible, setMenuVisible] = useState(false);
  const { user, logout } = useAuth();
  const { isTracking, startTracking, stopTracking, errorMsg, location } = useLocation();
  const { pendingCount, isSyncing, lastError } = useOfflineSync();

  const handleAlertPress = () => {
    Alert.alert('Confirmacion de alerta', '¿Esta seguro de que desea enviar una alerta SOS?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Enviar SOS',
        onPress: () => navigation.navigate('Alert'),
        style: 'destructive',
      },
    ]);
  };

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);

    switch (option) {
      case 'companions':
        Alert.alert('Compañeros', 'Pantalla de compañeros (proximamente)');
        break;
      case 'weather':
        Alert.alert('Meteorologia', 'Informacion meteorologica (proximamente)');
        break;
      case 'stopShift':
        Alert.alert('Parar jornada', '¿Desea finalizar su jornada?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar', onPress: () => navigation.navigate('StopJourney') },
        ]);
        break;
      case 'startBreak':
        Alert.alert('Iniciar descanso', 'Se iniciara su descanso');
        break;
      case 'logout':
        Alert.alert('Cerrar sesion', '¿Desea cerrar sesion?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesion', onPress: logout, style: 'destructive' },
        ]);
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
        <TouchableOpacity style={styles.sideButton} onPress={() => navigation.navigate('PointsOfInterest')}>
          <Text style={styles.sideButtonText}>📍{'\n'}MARCAR{'\n'}PUNTO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerButton} onPress={handleAlertPress}>
          <Text style={styles.centerButtonText}>🚨{'\n'}ALERTA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => Alert.alert('Llamada', 'Funcion de llamada (proximamente)')}
        >
          <Text style={styles.sideButtonText}>☎️{'\n'}LLAMAR</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={styles.menuOptionText}>👥 Compañeros</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuOption('weather')}>
                <Text style={styles.menuOptionText}>🌤️ Meteorologia</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => {
                setMenuVisible(false);
                navigation.navigate('StartJourney');
              }}>
                <Text style={styles.menuOptionText}>▶️ Iniciar Jornada</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => {
                setMenuVisible(false);
                navigation.navigate('StartBreak');
              }}>
                <Text style={styles.menuOptionText}>⏸️ Iniciar descanso</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => {
                setMenuVisible(false);
                navigation.navigate('StopJourney');
              }}>
                <Text style={styles.menuOptionText}>🛑 Parar jornada</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Profile');
              }}>
                <Text style={styles.menuOptionText}>👤 Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Settings');
              }}>
                <Text style={styles.menuOptionText}>⚙️ Configuración</Text>
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
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hamburgerButton: {
    padding: 10,
  },
  hamburgerText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'right',
    lineHeight: 16,
  },
  userRole: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 16,
  },
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#111827',
    marginBottom: ALTURA_MENU_INFERIOR,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  mapTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  tarjetaResumen: {
    width: '100%',
    minHeight: 220,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    padding: 20,
  },
  resumenTitulo: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  resumenTexto: {
    marginTop: 12,
    color: '#CBD5E1',
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
    backgroundColor: '#2563EB',
  },
  puntoAlerta: {
    backgroundColor: '#DC2626',
  },
  puntoUsuario: {
    backgroundColor: '#06B6D4',
  },
  textoLeyenda: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 18,
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtext: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 13,
  },
  syncText: {
    marginTop: 6,
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 10,
    color: '#FCA5A5',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  quickActionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  startQuickAction: {
    backgroundColor: '#16A34A',
  },
  stopQuickAction: {
    backgroundColor: '#DC2626',
  },
  mapQuickAction: {
    backgroundColor: '#2563EB',
  },
  botonAmpliar: {
    marginTop: 14,
  },
  quickActionText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  bottomMenu: {
    height: ALTURA_MENU_INFERIOR,
    backgroundColor: '#2C3E50',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
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
    backgroundColor: '#34495E',
    borderRadius: 12,
    marginHorizontal: 5,
  },
  sideButtonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#E74C3C',
    borderRadius: 15,
    marginHorizontal: 5,
    elevation: 8,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  centerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerMenu: {
    width: '75%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    shadowColor: '#000',
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
    color: '#2C3E50',
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
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
    backgroundColor: '#ECF0F1',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  logoutOption: {
    marginTop: 20,
    borderLeftColor: '#E74C3C',
    backgroundColor: '#FADBD8',
  },
});
