# Web Panel

Panel web para supervision, coordinacion y administracion de operativos.

## Stack

- React 18
- Vite
- TypeScript
- React Router
- Zustand
- Leaflet
- Chart.js
- jsPDF

## Funcionalidades actuales

- login de panel y verificacion de sesion
- reset de contrasena
- dashboard con KPIs y resumen operativo
- listado, alta y edicion de incidentes
- listado y seguimiento de alertas
- usuarios, unidades y organizaciones
- areas de trabajo y puntos de interes en mapa
- jornadas operativas
- meteorologia y mapa de rayos

## Rutas principales detectadas

- `/`
- `/login`
- `/reset-password`
- `/incidents`
- `/alerts`
- `/weather`
- `/lightning`
- `/viewusers`
- `/viewunidades`
- `/vieworganizations`
- `/workarea`
- `/journeys`
- `/points`

## Configuracion

Crear `.env` con:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Mejoras recomendadas

- unificar nombres de rutas como `editIncident`, `createWorkArea` y `viewunidades`
- mover la carga de datos a hooks compartidos
- usar `@tanstack/react-query`, que ya esta instalado, para cache y refetch
- agregar acciones operativas directas desde tablas: reconocer alertas, cerrar incidentes, reasignar personal
- persistir filtros y estado de vistas
- revisar la diferencia funcional entre usuarios y unidades

## Archivos clave

- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/store/authStore.ts`
- `src/utils/api.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/IncidentsPage.tsx`
- `src/pages/AlertsPage.tsx`
- `src/pages/WeatherPage.tsx`
- `src/pages/LightningMapPage.tsx`
- `src/pages/JourneysPage.tsx`
- `src/pages/PointOfInterestPage.tsx`
