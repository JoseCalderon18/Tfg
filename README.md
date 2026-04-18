# Plataforma de Gestion Operativa para Emergencias

Este repositorio recoge el trabajo de nuestro equipo para una plataforma pensada para coordinacion de operativos de emergencia. La idea del proyecto es tener en un mismo entorno el backend, el panel web de supervision y la aplicacion mobile para personal desplegado en campo.

## Como esta organizado el proyecto

Ahora mismo el repositorio se divide en tres bloques principales:

- `backend/`: API en Django REST con soporte geoespacial.
- `web-panel/`: panel web para gestion, supervision y seguimiento operativo.
- `mobile-app/`: app mobile para uso en terreno.

## Que cubre actualmente

A dia de hoy el proyecto ya permite trabajar con el flujo principal de una operacion:

- autenticacion para panel web y para app mobile
- gestion de incidentes, alertas, usuarios, organizaciones y areas de trabajo
- tracking GPS desde la app
- gestion de jornadas con inicio, descansos y cierre
- registro de puntos de interes geolocalizados
- visualizacion de informacion operativa en mapas, meteorologia y rayos

## Estructura general

```text
Proyecto/
|- backend/      API Django REST + PostGIS
|- web-panel/    React + Vite + TypeScript
|- mobile-app/   Expo + React Native + TypeScript
`- schema.sql    referencia de base de datos
```

## Resumen por modulo

### Backend

En el backend tenemos la API principal del sistema. Desde aqui se resuelven autenticacion, tracking, incidentes, alertas, jornadas, areas de trabajo, puntos de interes y el resto de entidades del proyecto.

- base `/api/`
- JWT para mobile
- sesion + CSRF para el panel web
- documentacion en `/api/docs/swagger/` y `/api/docs/redoc/`

Mas detalle en `backend/README.md`.

### Panel web

El panel web es la parte pensada para supervisores o usuarios con vision global del operativo. Desde aqui se puede consultar el dashboard, gestionar incidentes y alertas, revisar usuarios, unidades, organizaciones y trabajar con informacion geoespacial.

Mas detalle en `web-panel/README.md`.

### App mobile

La app mobile esta orientada a personal en terreno. Permite iniciar sesion, activar tracking, ver el mapa operativo, lanzar alertas, registrar puntos de interes y gestionar la jornada.

Mas detalle en `mobile-app/README.md`.

## Puesta en marcha rapida

### Backend

```bash
cd backend
cp .env.example .env
docker compose up --build
```

API disponible en `http://localhost:8000/api/`.

### Panel web

```bash
cd web-panel
npm install
cp .env.example .env
npm run dev
```

Panel disponible en `http://localhost:5173`.

### Mobile app

```bash
cd mobile-app
npm install
npx expo start
```

## Variables que solemos usar

### Web panel

- `VITE_API_BASE_URL=http://127.0.0.1:8000/api`

### Mobile app

- `EXPO_PUBLIC_API_BASE_URL=http://<host>:8000/api`
- `EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000`
- `EXPO_PUBLIC_IOS_API_HOST=http://localhost:8000`

## Cosas que tenemos pendientes o que queremos seguir mejorando

En el estado actual todavia vemos margen para seguir puliendo varias partes:

- centralizar mejor permisos y guardas en el panel
- mejorar cache y refetch de datos en web
- reforzar modo offline en mobile
- seguir afinando consistencia de nombres, rutas y flujos
- dejar mas fino el flujo de operativa en tiempo real

## Nota

Este README raiz intenta dar una vision general del proyecto. Para detalles mas concretos de cada modulo, lo mejor es ir a `backend/README.md`, `web-panel/README.md` y `mobile-app/README.md`.
