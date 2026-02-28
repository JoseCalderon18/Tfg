import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importamos los contextos para manejo de estado global
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';

// Importamos las pantallas de la aplicación
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import AlertScreen from './screens/AlertScreen';
import OperativeScreen from './screens/OperativeScreen';
import PointsOfInterestScreen from './screens/PointsOfInterestScreen';

// Creamos el stack navigator para la navegación entre pantallas
const Stack = createStackNavigator();

/**
 * Componente principal de la aplicación móvil
 * Configura los proveedores de contexto y la navegación
 */
export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
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
        </NavigationContainer>
      </LocationProvider>
    </AuthProvider>
  );
}
