# Plataforma de Gestion Operativa para Emergencias

Proyecto compuesto por backend, panel web y aplicacion movil para coordinar operativos de emergencia. El objetivo es conectar la supervision central con el personal desplegado en campo: incidentes, alertas, usuarios, organizaciones, workareas, tracking GPS, jornadas, puntos de interes, chat y mapas.

## Estructura del repositorio

```text
Tfg/
|- backend/      API Django REST + modelos geoespaciales
|- web-panel/    Panel de supervision React + Vite
|- mobile-app/   App movil Expo + React Native
|- schema.sql    Referencia historica de base de datos
`- README.md     Vision general del proyecto
```

## Modulos

### Backend

API principal del sistema. Gestiona autenticacion, usuarios, organizaciones, incidentes, alertas, tracking, workareas, jornadas, puntos de interes, chat, meteorologia/rayos y serializacion de datos para web y movil.

Tecnologias principales:

- Django
- Django REST Framework
- JWT para app movil
- Sesion/CSRF para panel web
- GeoDjango/PostGIS

Mas detalle:

```text
backend/README.md
```

### Web Panel

Panel web para administracion y supervision. Permite trabajar con una vision global de la operativa: dashboard, incidentes, alertas, usuarios, unidades, organizaciones, workareas, jornadas, puntos de interes, meteorologia, rayos y chats.

Tecnologias principales:

- React
- Vite
- TypeScript
- React Router
- Zustand
- Leaflet
- Chart.js
- jsPDF

Mas detalle:

```text
web-panel/README.md
```

### Mobile App

Aplicacion para operativos en campo. Permite iniciar sesion, activar GPS, enviar alertas, usar SOS, consultar mapa, leer/escribir chat, gestionar jornada, marcar puntos de interes y detectar salida de workareas.

Tecnologias principales:

- Expo
- React Native
- TypeScript
- React Navigation
- expo-location
- expo-task-manager
- react-native-maps
- AsyncStorage
- SecureStore

Mas detalle:

```text
mobile-app/README.md
```

## Funcionalidades actuales

- Autenticacion para panel web y app movil.
- Gestion de usuarios y perfiles.
- Gestion de organizaciones.
- Gestion de unidades.
- Creacion y edicion de incidentes.
- Listado y edicion de alertas.
- Alertas SOS desde movil.
- Alertas `GEOFENCE` automaticas cuando un operativo sale de workarea.
- Workareas circulares y poligonales asociadas a incidentes.
- Tracking GPS desde movil.
- Seguimiento GPS en segundo plano en movil.
- Bloqueo visual en movil al salir de workarea.
- Mapa operativo con incidentes, alertas y posicion.
- Jornadas: inicio, descansos y finalizacion.
- Puntos de interes geolocalizados.
- Chat general con miembros autorizados.
- Chat de incidentes.
- Meteorologia y mapa de rayos en panel.
- Cola offline movil para tracking, alertas y puntos de interes.

## Puesta en marcha rapida

### Backend

```bash
cd backend
cp .env.example .env
docker compose up --build
```

API:

```text
http://localhost:8000/api/
```

Tambien se puede ejecutar con entorno virtual local si ya esta preparado:

```bash
cd backend
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

### Web Panel

```bash
cd web-panel
npm install
cp .env.example .env
npm run dev
```

Panel:

```text
http://localhost:5173
```

Variable principal:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### Mobile App

```bash
cd mobile-app
npm install
npm run android
```

Variables utiles:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<host>:8000/api
EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000
EXPO_PUBLIC_IOS_API_HOST=http://localhost:8000
```

En Android fisico por USB puede hacer falta:

```bash
adb reverse tcp:8000 tcp:8000
```

## Validaciones utiles

Backend:

```bash
cd backend
.\venv\Scripts\python.exe manage.py check
```

Web panel:

```bash
cd web-panel
npm run build
```

Mobile app:

```bash
cd mobile-app
.\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
```

## Flujo operativo principal

1. Un supervisor/admin entra en el panel web.
2. Se crean o gestionan organizaciones, usuarios e incidentes.
3. Se definen workareas asociadas a incidentes.
4. El operativo inicia sesion en la app movil.
5. El operativo activa GPS e inicia jornada.
6. La app envia tracking al backend.
7. Si el operativo sale del workarea de los incidentes abiertos de su organizacion, se genera alerta `GEOFENCE`.
8. El panel puede visualizar alertas, incidentes, puntos y actividad.
9. Operativos y panel pueden comunicarse por chat.
10. El operativo finaliza la jornada al terminar el despliegue.

## Workareas y geofence

Las workareas delimitan zonas de trabajo dentro de incidentes. La app movil comprueba su posicion contra las workareas activas de incidentes abiertos asociados a la organizacion del operativo.

Si el operativo sale:

- el backend crea una alerta `GEOFENCE`;
- la app muestra una pantalla bloqueante;
- el operativo puede forzar una actualizacion de zona;
- el bloqueo desaparece al volver dentro del area.

## Chat

Hay dos ambitos de chat:

- chat general con miembros autorizados por `profile_id`;
- chat de incidente.

El panel permite crear chats generales y gestionar miembros. La app movil muestra:

- chats donde el usuario esta anadido;
- chats de incidentes de la organizacion del operativo.

## Offline movil

La app movil tiene cola offline para:

- tracking;
- alertas;
- puntos de interes.

La sincronizacion se reintenta periodicamente, al volver a primer plano y manualmente desde `Settings`.

## Permisos moviles relevantes

La app movil requiere permisos de ubicacion para tracking y geofence:

- ubicacion en primer plano;
- ubicacion en segundo plano;
- servicio foreground en Android;
- notificaciones Android recientes.

Ver:

```text
mobile-app/app.json
mobile-app/android/app/src/main/AndroidManifest.xml
```

## Limitaciones conocidas

- En movil falta pantalla de detalle de incidente registrada.
- El chat movil usa polling, no WebSocket.
- Las notificaciones push estan pendientes de integracion real.
- El mapa movil debe afinar filtros por organizacion/incidente.
- El inicio de jornada no activa automaticamente tracking en todos los casos.
- El SOS movil se crea sin asociacion explicita a incidente.
- Hay textos antiguos con caracteres corruptos por codificacion previa.
- Conviene unificar nombres de rutas en el panel.
- Falta una estrategia mas completa de permisos por rol.

## Mejoras recomendadas

- Detalle de incidente en movil.
- Activar tracking automaticamente al iniciar jornada.
- Detener tracking/background al finalizar jornada o cerrar sesion.
- Asociar alertas y puntos de interes al incidente activo.
- Push notifications para alertas, geofence, chat y cambios criticos.
- Realtime con WebSocket para chat, tracking y alertas.
- Cache offline de incidentes/workareas.
- Filtros persistentes en panel.
- Mejorar consistencia visual y de textos.
- Endurecer permisos por rol en backend y frontend.

## Documentacion por modulo

- Backend: `backend/README.md`
- Web panel: `web-panel/README.md`
- Mobile app: `mobile-app/README.md`

