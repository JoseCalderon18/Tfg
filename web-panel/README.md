# Web Panel

En esta carpeta esta el panel web del proyecto. Es la parte que usamos para supervision, gestion administrativa y seguimiento operativo desde una vista mas completa.

## Stack

- React 18
- Vite
- TypeScript
- React Router
- Zustand
- Leaflet
- Chart.js
- jsPDF

## Que tenemos ahora mismo

A dia de hoy el panel ya incluye:

- login de panel y validacion de sesion
- reset de contrasena
- dashboard con metricas y resumen operativo
- gestion de incidentes
- seguimiento y acciones sobre alertas
- gestion de usuarios, unidades y organizaciones
- gestion de areas de trabajo y puntos de interes en mapa
- vistas de jornadas, meteorologia y rayos

## Rutas principales

Estas son las rutas mas claras que ahora mismo forman parte del panel:

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

Para desarrollo solemos usar un `.env` asi:

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

## Cosas que queremos seguir mejorando

Como equipo, estas son algunas lineas de mejora que seguimos teniendo presentes:

- unificar mejor nombres de rutas y pantallas
- llevar mas logica de carga a hooks compartidos
- aprovechar mejor `@tanstack/react-query`
- dejar todavia mas directas las acciones operativas desde tablas
- persistir filtros y estados de vista
- terminar de separar bien usuarios y unidades a nivel funcional

## Archivos importantes dentro del modulo

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
