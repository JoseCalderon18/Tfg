# Plataforma de Gestion Operativa para Emergencias

Proyecto monorepo para coordinacion de operativos de emergencias con tres modulos principales:

- `backend/`: API REST en Django + DRF + PostGIS.
- `web-panel/`: panel web para supervision y gestion operativa.
- `mobile-app/`: app Expo/React Native para personal en terreno.

## Estado actual

El sistema ya cubre el flujo base de una operacion:

- autenticacion para panel web y app mobile
- gestion de incidentes, alertas, usuarios, organizaciones y areas de trabajo
- tracking GPS en tiempo real desde la app
- jornadas operativas con inicio y cierre
- puntos de interes geolocalizados
- mapas operativos, meteorologia y capa de rayos en el panel

## Arquitectura

```text
Proyecto/
|- backend/      API Django REST + PostGIS
|- web-panel/    React + Vite + TypeScript
|- mobile-app/   Expo + React Native + TypeScript
`- schema.sql    referencia de base de datos
```

## Funcionalidades actuales

### Backend

- API REST bajo `/api/`
- JWT para la app mobile
- sesion + CSRF para el panel web
- documentacion en `/api/docs/swagger/` y `/api/docs/redoc/`
- tracking por punto y por incidente
- CRUD de incidentes, alertas, organizaciones, usuarios, jornadas, areas de trabajo y puntos de interes

Mas detalle en `backend/README.md`.

### Panel web

- login y recuperacion de contrasena
- dashboard con metricas operativas
- gestion de incidentes y exportacion PDF
- gestion de alertas
- gestion de usuarios, unidades y organizaciones
- gestion geoespacial de areas de trabajo y puntos de interes
- vistas de meteorologia, rayos y jornadas

Mas detalle en `web-panel/README.md`.

### App mobile

- login con persistencia segura de sesion
- pantalla operativa con estado GPS
- tracking continuo de ubicacion
- mapa operativo a pantalla completa
- alta manual de alertas con geolocalizacion
- inicio y fin de jornada
- carga de puntos de interes desde campo

Mas detalle en `mobile-app/README.md`.

## Puesta en marcha rapida

### 1. Backend

```bash
cd backend
cp .env.example .env
docker compose up --build
```

API: `http://localhost:8000/api/`

### 2. Panel web

```bash
cd web-panel
npm install
cp .env.example .env
npm run dev
```

Panel: `http://localhost:5173`

### 3. App mobile

```bash
cd mobile-app
npm install
npx expo start
```

## Variables utiles

### Web panel

- `VITE_API_BASE_URL=http://127.0.0.1:8000/api`

### Mobile app

- `EXPO_PUBLIC_API_BASE_URL=http://<host>:8000/api`
- `EXPO_PUBLIC_ANDROID_API_HOST=http://10.0.2.2:8000`
- `EXPO_PUBLIC_IOS_API_HOST=http://localhost:8000`

## Mejoras recomendadas

### Para el panel web

- centralizar permisos y guardas por ruta
- usar `react-query` para cache, refetch y mutaciones
- unificar nombres de rutas y pantallas
- permitir reconocer/cerrar alertas e incidentes desde listados
- agregar filtros persistentes y enlaces compartibles
- separar mejor el concepto de usuarios y unidades

### Para la app mobile

- corregir rutas de navegacion a pantallas no registradas
- alinear tipos de puntos de interes con los soportados por backend
- mejorar soporte offline para tracking, alertas y puntos
- homogeneizar textos y estados de la UX
- agregar flujo real de descansos
- implementar refresh automatico de token

## Observaciones tecnicas

- El README raiz anterior tenia marcadores de conflicto de merge y fue normalizado.
- La ruta correcta de Swagger es `/api/docs/swagger/`.
- Hay documentacion especifica por modulo en `backend/README.md`, `web-panel/README.md` y `mobile-app/README.md`.
