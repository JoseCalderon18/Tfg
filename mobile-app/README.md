# Mobile App

Aplicacion Expo para personal operativo en terreno.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- expo-location
- expo-secure-store
- react-native-maps

## Funcionalidades actuales

- login con JWT
- persistencia segura de sesion
- tracking GPS continuo
- pantalla operativa con acciones rapidas
- mapa de incidentes, alertas y posicion del usuario
- envio de alertas manuales con ubicacion
- inicio y fin de jornada
- registro de puntos de interes con coordenadas actuales

## Pantallas principales

- `Login`
- `Operative`
- `Map`
- `Alert`
- `PointsOfInterest`
- `StartJourney`
- `StopJourney`

## Ejecucion

```bash
npm install
npx expo start
```

## Variables de entorno utiles

```bash
EXPO_PUBLIC_API_BASE_URL=http://<host>:8000/api
EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000
EXPO_PUBLIC_IOS_API_HOST=http://localhost:8000
```

## Notas de conexion

- en Android por USB puede hacer falta `adb reverse tcp:8000 tcp:8000`
- si no se define `EXPO_PUBLIC_API_BASE_URL`, la app intenta varias URLs fallback

## Cambios recomendados

- corregir navegacion hacia `StartBreak`, `Profile` y `Settings`, que no estan registradas en el stack actual
- alinear los tipos de puntos de interes con los aceptados por backend
- implementar cola offline para tracking, alertas y puntos
- agregar refresh automatico de token usando el `refreshToken` ya almacenado
- tipar mejor la navegacion y reducir uso de `any`
- completar el flujo real de descansos, que hoy solo aparece insinuado en la UI

## Archivos clave

- `App.tsx`
- `src/context/AuthContext.tsx`
- `src/context/LocationContext.tsx`
- `src/services/api.ts`
- `src/components/MapaOperativo.tsx`
- `src/screens/OperativeScreen.tsx`
- `src/screens/MapScreen.tsx`
- `src/screens/AlertScreen.tsx`
- `src/screens/StartJourneyScreen.tsx`
- `src/screens/StopJourneyScreen.tsx`
- `src/screens/PointsOfInterestScreen.tsx`
