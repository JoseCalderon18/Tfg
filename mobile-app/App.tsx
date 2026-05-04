import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from './src/theme';

// Importamos los contextos para manejo de estado global
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { OfflineSyncProvider } from './src/context/OfflineSyncContext';

// Importamos las pantallas de la aplicacion
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlertScreen from './src/screens/AlertScreen';
import OperativeScreen from './src/screens/OperativeScreen';
import PointsOfInterestScreen from './src/screens/PointsOfInterestScreen';
import StartJourneyScreen from './src/screens/StartJourneyScreen';
import StopJourneyScreen from './src/screens/StopJourneyScreen';
import StartBreakScreen from './src/screens/StartBreakScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import IncidentsScreen from './src/screens/IncidentsScreen';
import IncidentScreen from './src/screens/IncidentScreen';
import ChatScreen from './src/screens/ChatScreen';
import GeofenceLockScreen from './src/components/GeofenceLockScreen';
import LocationPermissionsScreen from './src/components/LocationPermissionsScreen';

// Creamos el stack navigator para la navegacion entre pantallas
const Stack = createStackNavigator();

const MENU_ROUTE_NAME = 'Operative';

function buildOperativeScreenOptions({ navigation, route }: any) {
  const isMenu = route.name === MENU_ROUTE_NAME;

  return {
    headerShown: !isMenu,
    headerTitle: '',
    headerLeft: () => null,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerRightContainerStyle: {
      paddingRight: 16,
    },
    headerRight: () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          navigation.navigate(MENU_ROUTE_NAME);
        }}
        style={styles.headerBackButton}
      >
        <Text style={styles.headerBackButtonText}>Volver</Text>
      </TouchableOpacity>
    ),
  };
}

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error) {
    console.error('App startup error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No se pudo iniciar la aplicacion</Text>
          <Text style={styles.errorMessage}>{this.state.message || 'Error desconocido en el arranque.'}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function LoginNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function OperativeNavigator() {
  return (
    <LocationProvider>
      <>
        <Stack.Navigator initialRouteName="Operative" screenOptions={buildOperativeScreenOptions}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Map"
            getComponent={() => require('./src/screens/MapScreen').default}
          />
          <Stack.Screen name="Alert" component={AlertScreen} />
          <Stack.Screen
            name="Operative"
            component={OperativeScreen}
          />
          <Stack.Screen
            name="PointsOfInterest"
            component={PointsOfInterestScreen}
          />
          <Stack.Screen
            name="StartJourney"
            component={StartJourneyScreen}
          />
          <Stack.Screen
            name="StartBreak"
            component={StartBreakScreen}
          />
          <Stack.Screen name="StopJourney" 
                component={StopJourneyScreen}
          />
          <Stack.Screen
            name="Incidents"
            component={IncidentsScreen}
          />
          <Stack.Screen
            name="Incident"
            component={IncidentScreen}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
          />
        </Stack.Navigator>
        <LocationPermissionsScreen />
        <GeofenceLockScreen />
      </>
    </LocationProvider>
  );
}

function AppNavigator() {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Preparando acceso...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token && user ? <OperativeNavigator /> : <LoginNavigator />}
    </NavigationContainer>
  );
}

/**
 * Componente principal de la aplicacion movil
 * Configura los proveedores de contexto y la navegacion
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <AuthProvider>
          <OfflineSyncProvider>
            <AppNavigator />
          </OfflineSyncProvider>
        </AuthProvider>
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  headerBackButton: {
    minWidth: 86,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  headerBackButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
