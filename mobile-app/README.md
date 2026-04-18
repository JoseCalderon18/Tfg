# Mobile App

Aqui esta la aplicacion mobile del proyecto, pensada para personal operativo que trabaja directamente sobre el terreno. La idea de esta parte es que el usuario pueda operar rapido, con acceso al mapa, al tracking y a las alertas.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- expo-location
- expo-secure-store
- react-native-maps

## Funcionalidad actual

En el punto actual del proyecto, la app ya permite:

- login con JWT
- persistencia segura de sesion
- tracking GPS continuo
- pantalla operativa con accesos rapidos
- mapa con incidentes, alertas y posicion del usuario
- envio manual de alertas con ubicacion
- inicio y fin de jornada
- registro de descansos dentro de la jornada
- registro de puntos de interes usando coordenadas actuales

## Pantallas principales

Las pantallas mas claras ahora mismo son:

- `Login`
- `Operative`
- `Map`
- `Alert`
- `PointsOfInterest`
- `StartJourney`
- `StartBreak`
- `StopJourney`
- `Profile`
- `Settings`

## Ejecucion

```bash
npm install
npx expo start
```

## Variables utiles

```bash
EXPO_PUBLIC_API_BASE_URL=http://<host>:8000/api
EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000
EXPO_PUBLIC_IOS_API_HOST=http://localhost:8000
```

## Notas de conexion

En desarrollo nos solemos apoyar en estas referencias:

- en Android por USB puede hacer falta `adb reverse tcp:8000 tcp:8000`
- si no definimos `EXPO_PUBLIC_API_BASE_URL`, la app intenta varias URLs fallback

## Siguientes mejoras que tenemos en mente

Todavia tenemos varias cosas que nos gustaria seguir puliendo:

- mejorar soporte offline para tracking, alertas y puntos
- automatizar mejor el refresh del token
- tipar mas la navegacion y reducir uso de `any`
- mejorar consistencia visual y de estados
- seguir afinando el flujo de operativa en campo

## Archivos importantes del modulo

- `App.tsx`
- `src/context/AuthContext.tsx`
- `src/context/LocationContext.tsx`
- `src/services/api.ts`
- `src/components/MapaOperativo.tsx`
- `src/screens/OperativeScreen.tsx`
- `src/screens/MapScreen.tsx`
- `src/screens/AlertScreen.tsx`
- `src/screens/StartJourneyScreen.tsx`
- `src/screens/StartBreakScreen.tsx`
- `src/screens/StopJourneyScreen.tsx`
- `src/screens/PointsOfInterestScreen.tsx`
