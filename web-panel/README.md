# Web Panel - Centro de Supervision

Panel web para coordinacion, supervision y gestion operativa. Esta parte del proyecto esta orientada a perfiles de administracion/supervision que necesitan una vision global: incidentes, alertas, usuarios, organizaciones, workareas, jornadas, puntos de interes, meteorologia, rayos y comunicaciones.

## Stack

- React 18
- Vite
- TypeScript
- React Router
- Zustand
- Leaflet / React Leaflet
- Chart.js
- jsPDF + jsPDF AutoTable
- Tailwind/PostCSS

## Funcionalidades actuales

- Login de panel con sesion.
- Verificacion de autenticacion al cargar la app.
- Reset de contrasena.
- Dashboard operativo.
- Gestion de incidentes.
- Creacion y edicion de incidentes.
- Chat asociado a incidentes.
- Gestion de alertas y edicion de estado.
- Gestion de usuarios.
- Gestion de unidades.
- Gestion de organizaciones.
- Creacion y edicion de organizaciones.
- Gestion de areas de trabajo o workareas.
- Creacion y edicion de workareas en mapa.
- Gestion de puntos de interes.
- Creacion de puntos de interes geolocalizados.
- Visualizacion de jornadas.
- Meteorologia.
- Mapa de rayos.
- Chat general con miembros autorizados por `profile_id`.

## Rutas principales

Rutas publicas:

- `/login`
- `/reset-password`

Rutas privadas dentro del layout:

- `/`: dashboard.
- `/incidents`: listado de incidentes.
- `/createincident`: crear incidente.
- `/editIncident/:id`: editar incidente y consultar chat del incidente.
- `/alerts`: listado de alertas.
- `/editAlert/:id`: editar alerta.
- `/weather`: meteorologia.
- `/lightning`: mapa de rayos.
- `/viewusers`: usuarios.
- `/newuser`: crear usuario.
- `/edituser/:id`: editar usuario.
- `/viewunidades`: unidades.
- `/editunit/:id`: editar unidad.
- `/vieworganizations`: organizaciones.
- `/createorganization`: crear organizacion.
- `/editorganization/:id`: editar organizacion.
- `/workarea`: listado de workareas.
- `/createWorkArea`: crear workarea.
- `/editWorkArea/:id`: editar workarea.
- `/journeys`: jornadas.
- `/points`: puntos de interes.
- `/createPointOfInterest`: crear punto de interes.
- `/chats`: chat general.

## Configuracion

Crea un `.env` en `web-panel/`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Si el backend corre en otro host o puerto, cambia esa URL.

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Por defecto Vite sirve en:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

Este comando ejecuta TypeScript y despues genera el build de Vite.

## Preview del build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Autenticacion

El panel usa endpoints de panel del backend, con sesion y CSRF cuando corresponde.

Archivos clave:

- `src/store/authStore.ts`
- `src/utils/api.ts`
- `src/utils/csrf.ts`
- backend: `/api/auth/panel/login/`
- backend: `/api/auth/panel/me/`
- backend: `/api/auth/panel/logout/`

## Chat del panel

Hay dos tipos de chat presentes en el sistema:

- Chat de incidente, accesible desde la edicion del incidente.
- Chat general, accesible desde `/chats`.

El chat general guarda miembros autorizados dentro del JSON del campo `profile_id` de la tabla `chats`. El panel permite:

- listar chats disponibles;
- crear chats;
- leer mensajes;
- enviar mensajes;
- gestionar miembros autorizados.

Archivos relacionados:

- `src/pages/ChatPage.tsx`
- `src/components/ChatGeneral.tsx`
- backend: `/api/auth/panel/chats/`
- backend: `/api/auth/panel/chats/<chat_ref>/messages/`

## Workareas

Las workareas se usan para delimitar zonas de trabajo asociadas a incidentes. Pueden ser:

- circulares;
- poligonales.

La app movil utiliza estas workareas para detectar si un operativo sale de la zona asignada y lanzar alertas `GEOFENCE`.

Archivos relacionados:

- `src/pages/WorkAreasPage.tsx`
- `src/pages/NewWorkAreaPage.tsx`
- `src/pages/EditWorkAreaPage.tsx`
- backend: `/api/workareas/`

## Puntos de interes

El panel permite ver y crear puntos de interes geolocalizados. Estos puntos tambien pueden crearse desde la app movil usando la ubicacion actual del operativo.

Archivos relacionados:

- `src/pages/PointOfInterestPage.tsx`
- `src/pages/CreatePointOfInterestPage.tsx`
- backend: `/api/points-of-interest/`

## Archivos importantes

- `src/App.tsx`: definicion de rutas.
- `src/main.tsx`: entrada de React.
- `src/components/Layout.tsx`: layout privado con navegacion.
- `src/store/authStore.ts`: estado de autenticacion.
- `src/utils/api.ts`: cliente HTTP.
- `src/utils/csrf.ts`: soporte CSRF.
- `src/pages/DashboardPage.tsx`: dashboard.
- `src/pages/IncidentsPage.tsx`: incidentes.
- `src/pages/EditIncidentPage.tsx`: edicion y chat de incidente.
- `src/pages/AlertsPage.tsx`: alertas.
- `src/pages/WorkAreasPage.tsx`: workareas.
- `src/pages/JourneysPage.tsx`: jornadas.
- `src/pages/PointOfInterestPage.tsx`: puntos de interes.
- `src/components/ChatGeneral.tsx`: chat general.

## Limitaciones conocidas

- Algunas rutas tienen nombres mixtos (`editIncident`, `createWorkArea`, `viewusers`). Funcionan, pero seria recomendable normalizarlas.
- Parte de la logica de carga vive dentro de paginas; podria extraerse a hooks compartidos.
- No hay persistencia avanzada de filtros o estado de tablas.
- El chat funciona por peticiones HTTP; no hay WebSocket ni notificaciones push.
- Conviene revisar codificacion de textos antiguos que puedan mostrar caracteres corruptos.
- La separacion funcional entre usuarios y unidades todavia puede afinarse.

## Mejoras recomendadas

- Normalizar rutas y nombres.
- Extraer hooks para carga de incidentes, usuarios, alertas y workareas.
- Usar React Query de forma mas sistematica.
- Persistir filtros, orden y paginacion.
- Anadir actualizacion en tiempo real para chat, alertas y tracking.
- Mejorar permisos/guards por rol.
- Mejorar vistas de mapa con filtros por organizacion, incidente y estado.

