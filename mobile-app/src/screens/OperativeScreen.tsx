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

const { height } = Dimensions.get('window');
const BOTTOM_MENU_HEIGHT = height * 0.15;

export default function OperativeScreen({ navigation }: any) {
  // Estado visual del panel principal del operativo.
  const [menuVisible, setMenuVisible] = useState(false);
  const { user, logout } = useAuth();
  const { isTracking, startTracking, stopTracking, errorMsg, location } = useLocation();

  const handleAlertPress = () => {
    // Confirmación previa antes de abrir el flujo real de alerta.
    Alert.alert(
      'Confirmación de Alerta',
      '¿Está seguro de que desea enviar una alerta SOS?',
      [
        {
          text: 'Cancelar',
          onPress: () => console.log('Alerta cancelada'),
          style: 'cancel',
        },
        {
            text: 'Enviar SOS',
            onPress: () => {
              navigation.navigate('Alert');
            },
            style: 'destructive',
          },
      ]
    );
  };

  const handleMenuOption = (option: string) => {
    // Router simple del menú lateral para acciones de campo.
    setMenuVisible(false);
    switch (option) {
      case 'companions':
        console.log('Ir a Compañeros');
        // navigation.navigate('Companions');
        Alert.alert('Compañeros', 'Pantalla de compañeros (próximamente)');
        break;
      case 'weather':
        console.log('Ir a Meteorología');
        Alert.alert('Meteorología', 'Información meteorológica (próximamente)');
        break;
      case 'stopShift':
        console.log('Parar jornada');
        Alert.alert('Parar Jornada', '¿Desea finalizar su jornada?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar', onPress: () => console.log('Jornada finalizada') },
        ]);
        break;
      case 'startBreak':
        console.log('Iniciar descanso');
        Alert.alert('Iniciar Descanso', 'Se iniciará su descanso');
        break;
      case 'logout':
        Alert.alert('Cerrar Sesión', '¿Desea cerrar sesión?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesión', onPress: logout, style: 'destructive' },
        ]);
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emergency App</Text>
        <Text style={styles.userName}>{user?.username || 'Usuario'}</Text>
      </View>

      {/* Área del Mapa */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapPlaceholder}>Centro operativo</Text>
        <Text style={styles.statusText}>Seguimiento: {isTracking ? 'Activo' : 'Detenido'}</Text>
        <Text style={styles.statusSubtext}>
          {location
            ? `Lat ${location.coords.latitude.toFixed(4)} · Lng ${location.coords.longitude.toFixed(4)}`
            : 'Sin posicion registrada'}
        </Text>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, isTracking ? styles.stopQuickAction : styles.startQuickAction]}
            onPress={isTracking ? stopTracking : startTracking}
          >
            <Text style={styles.quickActionText}>{isTracking ? 'Detener GPS' : 'Iniciar GPS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.mapQuickAction]}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.quickActionText}>Abrir mapa</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menú Inferior */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.sideButton} onPress={() => navigation.navigate('PointsOfInterest')}>
          <Text style={styles.sideButtonText}>📍{'\n'}MARCAR{'\n'}PUNTO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerButton} onPress={handleAlertPress}>
          <Text style={styles.centerButtonText}>🚨{'\n'}ALERTA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideButton} onPress={() => Alert.alert('Llamada', 'Función de llamada (próximamente)')}>
          <Text style={styles.sideButtonText}>☎️{'\n'}LLAMAR</Text>
        </TouchableOpacity>
      </View>

      {/* Modal del Menú Hamburguesa */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerMenu}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.drawerTitle}>Menú</Text>

            <ScrollView style={styles.menuOptions}>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => handleMenuOption('companions')}
              >
                <Text style={styles.menuOptionText}>👥 Compañeros</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => handleMenuOption('weather')}
              >
                <Text style={styles.menuOptionText}>🌤️ Meteorología</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => handleMenuOption('startBreak')}
              >
                <Text style={styles.menuOptionText}>⏸️ Iniciar Descanso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => handleMenuOption('stopShift')}
              >
                <Text style={styles.menuOptionText}>🛑 Parar Jornada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOption, styles.logoutOption]}
                onPress={() => handleMenuOption('logout')}
              >
                <Text style={styles.menuOptionText}>🚪 Cerrar Sesión</Text>
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
    backgroundColor: '#f5f5f5',
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
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  userName: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginBottom: BOTTOM_MENU_HEIGHT,
    paddingHorizontal: 20,
  },
  mapPlaceholder: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#F8FAFC',
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
  quickActionText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  bottomMenu: {
    height: BOTTOM_MENU_HEIGHT,
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
    color: 'white',
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
    color: 'white',
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
    backgroundColor: 'white',
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
