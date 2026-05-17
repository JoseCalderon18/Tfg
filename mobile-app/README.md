# Mobile App - Mando Operativo

Aplicacion movil para personal operativo en campo. Permite iniciar sesion, activar seguimiento GPS, controlar jornadas, enviar alertas, consultar incidentes, usar chat operativo, marcar puntos de interes y recibir bloqueo visual cuando el dispositivo sale del area de trabajo asignada.

Esta app esta pensada para uso rapido en terreno: botones grandes, acciones directas y sincronizacion con el backend Django.

## Stack

- React Native
- Expo SDK 50
- TypeScript
- React Navigation
- JWT con `expo-secure-store`
- `expo-location`
- `expo-task-manager`
- `react-native-maps`
- `@react-native-async-storage/async-storage`

## Funcionalidades actuales

- Login con JWT.
- Persistencia segura de sesion.
- Refresh automatico del token cuando la API devuelve `401`.
- Pantalla operativa principal.
- Seguimiento GPS en primer plano.
- Seguimiento GPS en segundo plano para deteccion de workarea.
- Envio de puntos de tracking al backend.
- Cola offline para tracking, alertas y puntos de interes.
- Deteccion de salida de workarea.
- Modal bloqueante cuando el operativo esta fuera del workarea.
- Boton para actualizar manualmente la deteccion de workarea desde el modal.
- Envio manual de alertas.
- Boton SOS con cuenta atras y vibracion.
- Mapa operativo con posicion, incidentes y alertas.
- Listado de incidentes de la organizacion del operativo.
- Chat movil:
  - chats donde el perfil esta anadido;
  - chats de incidentes asociados a la organizacion del operativo;
  - lectura y envio de mensajes.
- Inicio de jornada.
- Registro de descanso dentro de una jornada.
- Finalizacion de jornada con mapa/resumen de recorrido.
- Registro y consulta de puntos de interes.
- Edicion de perfil operativo.
- Pantalla de configuracion con estado de sincronizacion y URLs de API detectadas.

## Pantallas principales

- `Login`: acceso del operativo.
- `Operative`: centro principal de uso en campo.
- `Map`: mapa operativo a pantalla completa.
- `Alert`: envio manual de alertas.
- `Chat`: chats generales e incidentes de la organizacion.
- `Incidents`: incidentes asociados a la organizacion del operativo.
- `PointsOfInterest`: alta y consulta de puntos de interes.
- `StartJourney`: inicio de jornada.
- `StartBreak`: registro de descanso.
- `StopJourney`: cierre de jornada y visualizacion de ruta.
- `Profile`: consulta y edicion del perfil.
- `Settings`: diagnostico de API y sincronizacion offline.

## Flujo operativo recomendado

1. Iniciar sesion.
2. Entrar en `Operative`.
3. Pulsar `Iniciar GPS`.
4. Iniciar jornada desde el menu lateral.
5. Consultar mapa, incidentes, chat o puntos de interes segun la operativa.
6. Si el movil sale del workarea, se muestra una pantalla bloqueante.
7. Volver dentro del workarea para desbloquear la app automaticamente.
8. Finalizar jornada al terminar el despliegue.

## Workarea y geofence

La app comprueba la posicion del operativo contra las workareas activas de los incidentes abiertos asociados a la organizacion del operativo.

Cuando el dispositivo sale del workarea:

- el backend crea una alerta `GEOFENCE`;
- la app muestra un modal bloqueante;
- el modal muestra la ultima ubicacion legible cuando es posible;
- se puede pulsar `Actualizar zona` para forzar una nueva comprobacion;
- la pantalla se cierra automaticamente cuando el backend confirma que el operativo vuelve dentro del area.

Archivos relacionados:

- `src/context/LocationContext.tsx`
- `src/components/GeofenceLockScreen.tsx`
- backend: `/api/workareas/check-position/`

## Chat movil

La pantalla `Chat` consume endpoints moviles especificos:

- `GET /api/mobile/chats/`
- `GET /api/mobile/chats/<kind>/<id>/messages/`
- `POST /api/mobile/chats/<kind>/<id>/messages/`

El listado incluye:

- chats generales donde el `profile_id` del usuario esta en miembros;
- chats de incidentes cuya organizacion coincide con la organizacion del operativo.

Actualmente el chat refresca mensajes por polling cada 8 segundos.

## Offline

La app tiene cola offline para:

- tracking GPS;
- alertas;
- puntos de interes.

La cola se guarda en `AsyncStorage` y se intenta sincronizar:

- al recuperar conexion;
- periodicamente;
- cuando la app vuelve a primer plano;
- desde `Settings` con `Sincronizar ahora`.

Archivos relacionados:

- `src/context/OfflineSyncContext.tsx`
- `src/services/offlineSync.ts`

## Permisos necesarios

Android necesita permisos de ubicacion y servicio en segundo plano:

- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`

Estan configurados en:

- `app.json`
- `android/app/src/main/AndroidManifest.xml`

Para que los cambios nativos de permisos se apliquen, reconstruye la app.

## Configuracion de API

Variables utiles:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<host>:8000/api
EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000
EXPO_PUBLIC_IOS_API_HOST=http://localhost:8000
```

Notas:

- En Android fisico por USB, normalmente se puede usar:

```bash
adb reverse tcp:8000 tcp:8000
```

- En emulador Android, suele funcionar:

```bash
EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000
```

- Si no se define `EXPO_PUBLIC_API_BASE_URL`, la app intenta URLs fallback desde `src/services/api.ts`.

## Instalacion

```bash
npm install
```

## Ejecucion en desarrollo

Arrancar Expo:

```bash
npm run start
```

Ejecutar en Android:

```bash
npm run android
```

Ejecutar en iOS:

```bash
npm run ios
```

Ejecutar en web:

```bash
npm run web
```

## Validacion TypeScript

El proyecto no tiene script propio de test/lint. Para comprobar tipos:

```bash
.\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
```

En PowerShell desde `mobile-app`.

## Archivos importantes

- `App.tsx`: navegacion principal y providers.
- `src/context/AuthContext.tsx`: login, sesion y refresh JWT.
- `src/context/LocationContext.tsx`: GPS, tracking, workarea y segundo plano.
- `src/context/OfflineSyncContext.tsx`: cola offline.
- `src/services/api.ts`: cliente HTTP y fallback de URLs.
- `src/services/offlineSync.ts`: persistencia y reintento offline.
- `src/screens/OperativeScreen.tsx`: pantalla principal de campo.
- `src/components/GeofenceLockScreen.tsx`: bloqueo por salida de workarea.
- `src/screens/ChatScreen.tsx`: chat movil.
- `src/components/MapaOperativo.tsx`: mapa operativo.
- `src/screens/IncidentsScreen.tsx`: listado de incidentes.
- `src/screens/PointsOfInterestScreen.tsx`: puntos de interes.
- `src/screens/StartJourneyScreen.tsx`: inicio de jornada.
- `src/screens/StartBreakScreen.tsx`: descanso.
- `src/screens/StopJourneyScreen.tsx`: finalizacion de jornada.
- `src/screens/ProfileScreen.tsx`: perfil.
- `src/screens/SettingsScreen.tsx`: diagnostico y sincronizacion.

## Limitaciones conocidas

- La pantalla `Incidents` intenta abrir `Incident`, pero esa pantalla de detalle todavia no esta registrada.
- El chat movil refresca por polling; no hay notificaciones push ni contador de no leidos.
- Las notificaciones estan instaladas como dependencia, pero no estan integradas funcionalmente.
- El mapa carga incidentes y alertas desde endpoints generales; conviene filtrar por organizacion/incidente activo.
- El inicio de jornada no activa automaticamente el tracking si el usuario no pulsa `Iniciar GPS`.
- El SOS se envia sin asociar explicitamente un incidente.
- Algunos textos antiguos pueden tener caracteres corruptos por codificacion previa.

## Mejoras recomendadas

- Crear detalle de incidente en movil.
- Activar tracking automaticamente al iniciar jornada.
- Detener tracking/background al cerrar sesion o finalizar jornada.
- Asociar alertas y puntos de interes al incidente activo.
- Integrar push notifications para SOS, geofence, alertas y chat.
- Cachear workareas para deteccion local offline.
- Anadir contador de mensajes no leidos.
- Unificar textos y corregir caracteres corruptos.

## Ubicaciones en tiempo real (compañeros)

La app móvil ahora soporta recibir y mostrar las ubicaciones de los compañeros en tiempo real:

- Se suscribe por WebSocket a `ws://<host>/api/ws/locations/` tras autenticarse y suscribirse al incidente activo.
- En `src/context/LocationContext.tsx` se gestiona la conexión WS, el parsing de mensajes `position.update` y el estado `colleaguesPositions`.
- En `src/components/MapaOperativo.tsx` se renderizan marcadores para compañeros, con callouts que muestran "última vez" y animación suave entre posiciones.

Pruebas rápidas:

1. Levanta el backend con Channels y Redis (ver `backend/README.md`).
2. En dos dispositivos/emuladores, inicia sesión y activa el tracking.
3. Observa que los marcadores aparecen y se mueven.

Archivos a revisar:

- `src/context/LocationContext.tsx`
- `src/components/MapaOperativo.tsx`


