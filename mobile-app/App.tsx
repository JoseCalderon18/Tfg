import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';

// Importamos los contextos para manejo de estado global
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';

// Importamos las pantallas de la aplicación
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlertScreen from './src/screens/AlertScreen';
import OperativeScreen from './src/screens/OperativeScreen';
import PointsOfInterestScreen from './src/screens/PointsOfInterestScreen';

// Creamos el stack navigator para la navegación entre pantallas
const Stack = createStackNavigator();

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
      <Stack.Navigator initialRouteName="Operative">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Map"
          getComponent={() => require('./src/screens/MapScreen').default}
        />
        <Stack.Screen name="Alert" component={AlertScreen} />
        <Stack.Screen
          name="Operative"
          component={OperativeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PointsOfInterest"
          component={PointsOfInterestScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
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
 * Componente principal de la aplicación móvil
 * Configura los proveedores de contexto y la navegación
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <AuthProvider>
          <AppNavigator />
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
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#FCA5A5',
    fontSize: 15,
    lineHeight: 22,
  },
});
