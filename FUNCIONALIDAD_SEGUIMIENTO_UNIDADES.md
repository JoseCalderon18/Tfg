# Documentación: Seguimiento de Recursos/Unidades

## 📋 Descripción General

Se ha implementado un sistema completo de **Seguimiento de Recursos/Unidades** con capacidades de:
- **Estado de disponibilidad de unidades**: Seguimiento en tiempo real del estado operativo
- **Historial de ubicaciones (auditoría)**: Registro GPS completo para auditoría
- **Consumo de combustible/batería**: Monitoreo y análisis de consumo de recursos

## 🏗️ Arquitectura

### Backend (Django)

#### Modelos Implementados

1. **Unidad** (`emergency.apps.core.models.unit.Unidad`)
   - UUID único, organización propietaria
   - Información básica (nombre, tipo, placa)
   - Estado actual (DISPONIBLE, EN_VIAJE, EN_MANTENIMIENTO, OFFLINE, CARGANDO)
   - Ubicación GPS actual
   - Niveles de combustible y batería
   - Kilometraje total

2. **EstadoUnidad** (`emergency.apps.core.models.unit_status_history.EstadoUnidad`)
   - Historial de cambios de estado
   - Registra estado anterior y nuevo
   - Usuario que realizó el cambio
   - Razón del cambio (opcional)
   - Timestamp automático

3. **AuditoriaUbicacion** (`emergency.apps.core.models.location_audit.AuditoriaUbicacion`)
   - Registro de ubicaciones GPS
   - Precisión del GPS, altitud, velocidad, dirección
   - Timestamps de grabación y servidor
   - Índices para consultas rápidas

4. **ConsumoRecursos** (`emergency.apps.core.models.resource_consumption.ConsumoRecursos`)
   - Niveles de combustible y batería
   - Consumo desde último registro
   - Distancia recorrida y duración
   - Métricas calculadas (consumo/km, rango estimado)

#### API Endpoints

**Base URL**: `/api/units/`

##### Unidades
- `GET /units/` - Listar unidades (con filtros y búsqueda)
- `POST /units/` - Crear nueva unidad
- `GET /units/{id}/` - Obtener detalles completos
- `PATCH /units/{id}/` - Actualizar unidad
- `DELETE /units/{id}/` - Eliminar unidad
- `GET /units/stats/` - Estadísticas generales

##### Acciones sobre Unidades
- `POST /units/{id}/change_status/` - Cambiar estado
- `POST /units/{id}/record_consumption/` - Registrar consumo
- `GET /units/{id}/location_history/` - Historial de ubicaciones
- `GET /units/{id}/consumption_history/` - Historial de consumo
- `GET /units/{id}/status_history/` - Historial de cambios de estado

##### Endpoints de Solo Lectura
- `GET /unit-status-history/` - Todos los cambios de estado
- `GET /unit-consumption/` - Todos los registros de consumo
- `GET /location-audit/` - Todas las ubicaciones auditadas

#### Serializadores

Ubicación: `emergency/apps/api/serializers/unit_serializers.py`

- `UnidadListSerializer` - Vista de lista con GeoJSON
- `UnidadDetailSerializer` - Vista detallada con historiales
- `UnidadCreateUpdateSerializer` - Creación/actualización
- `EstadoUnidadSerializer` - Lectura de cambios de estado
- `EstadoUnidadCreateSerializer` - Crear cambio de estado
- `ConsumoRecursosSerializer` - Lectura de consumo
- `ConsumoRecursosCreateSerializer` - Registrar consumo
- `AuditoriaUbicacionSerializer` - Lectura de ubicaciones
- `AuditoriaUbicacionCreateSerializer` - Registrar ubicación
- `UnidadStatsSerializer` - Estadísticas

#### Vistas

Ubicación: `emergency/apps/api/views/unit_views.py`

- `UnidadViewSet` - CRUD completo + acciones especiales
- `EstadoUnidadViewSet` - Solo lectura de historial
- `ConsumoRecursosViewSet` - Solo lectura de consumo
- `AuditoriaUbicacionViewSet` - Solo lectura de ubicaciones

### Frontend Móvil (React Native)

#### Nuevos Archivos

1. **Servicio** (`mobile-app/src/services/units.ts`)
   - Funciones API tipadas
   - Funciones principales:
     - `getUnits()` - Listar unidades
     - `getUnitDetail()` - Detalles de unidad
     - `getUnitsStats()` - Estadísticas
     - `changeUnitStatus()` - Cambiar estado
     - `recordConsumption()` - Registrar consumo
     - `getLocationHistory()` - Historial de ubicaciones
     - `getConsumptionHistory()` - Historial de consumo
     - `getStatusHistory()` - Historial de estados

2. **Contexto** (`mobile-app/src/context/UnitsContext.tsx`)
   - Estado global de unidades
   - Hooks para sincronización
   - Métodos:
     - `fetchUnits()` - Obtener lista
     - `fetchUnitDetail()` - Obtener detalles
     - `fetchStats()` - Obtener estadísticas
     - `changeUnitStatus()` - Cambiar estado
     - `recordConsumption()` - Registrar consumo
     - `refreshAllData()` - Actualizar todo

3. **Pantallas**
   - `UnitsTrackingScreen.tsx` - Lista principal de unidades
     - Visualización de tarjetas por unidad
     - Indicadores de combustible y batería
     - Alertas de consumo bajo
     - Pull-to-refresh
   
   - `UnitDetailScreen.tsx` - Detalles y controles
     - Información completa de la unidad
     - Historial de consumo
     - Historial de cambios de estado
     - Historial de ubicaciones
     - Botones para cambiar estado

#### Uso en la App Móvil

```typescript
// En el componente principal, envolver con proveedor
import { UnitsProvider } from './context/UnitsContext';

function App() {
  return (
    <UnitsProvider>
      {/* resto de la app */}
    </UnitsProvider>
  );
}

// En componentes, usar el hook
import { useUnits } from '../context/UnitsContext';

function MyComponent() {
  const { units, stats, fetchUnits } = useUnits();
  
  useEffect(() => {
    fetchUnits();
  }, []);
  
  return (/* UI */);
}
```

### Frontend Web (React + TypeScript)

#### Nuevas Páginas

1. **UnitsTrackingPage** (`web-panel/src/pages/UnitsTrackingPage.tsx`)
   - Tabla de todas las unidades
   - Estadísticas en cards
   - Filtros por estado y tipo
   - Búsqueda
   - Indicadores visuales de combustible/batería
   - Acceso a detalles

2. **UnitDetailPage** (`web-panel/src/pages/UnitDetailPage.tsx`)
   - Información general de la unidad
   - Recursos (combustible, batería)
   - Cambio de estado con razón
   - Información del conductor
   - Historial de consumo
   - Historial de cambios de estado
   - Alertas activas

#### Integración en App.tsx

Agregar estas rutas:
```typescript
import UnitsTrackingPage from './pages/UnitsTrackingPage';
import UnitDetailPage from './pages/UnitDetailPage';

// En Routes:
<Route path="/units" element={<UnitsTrackingPage />} />
<Route path="/units/:id" element={<UnitDetailPage />} />
```

## 📊 Flujos de Datos

### Crear Unidad
```
Frontend → POST /api/units/ → Backend (crea Unidad) → Response con detalles
```

### Cambiar Estado
```
Frontend → POST /api/units/{id}/change_status/ → Backend (crea EstadoUnidad, actualiza Unidad) → Response
```

### Registrar Consumo
```
Frontend → POST /api/units/{id}/record_consumption/ → Backend (crea ConsumoRecursos, actualiza Unidad) → Response
```

### Registrar Ubicación
```
GPS Device → POST /api/location-audit/ → Backend (crea AuditoriaUbicacion) → Almacenado para auditoría
```

## 🔐 Permisos

- Todas las acciones requieren autenticación (`IsAuthenticated`)
- Las unidades se filtran por organización del usuario
- Solo lectores pueden ver datos de otras organizaciones mediante filtros

## 📱 Estados de Unidad

| Estado | Valor | Color | Descripción |
|--------|-------|-------|-------------|
| Disponible | DISPONIBLE | Verde | Unidad lista para asignar |
| En Viaje | EN_VIAJE | Azul | Unidad en desplazamiento |
| Mantenimiento | EN_MANTENIMIENTO | Amarillo | Unidad en mantenimiento |
| Offline | OFFLINE | Rojo | Unidad desconectada |
| Cargando | CARGANDO | Azul | Cargando batería |

## 🚨 Alertas Automáticas

Sistema de alertas basado en umbrales:
- **Combustible bajo**: < 20%
- **Batería baja**: < 15%

Disponibles en campo `consumption_alert` de Unidad.

## 📊 Estadísticas

Endpoint: `GET /api/units/stats/`

Retorna:
- Total de unidades
- Unidades por estado
- Cantidad con combustible/batería bajo
- Promedio de combustible y batería

## 🔧 Configuración Requerida

### Backend

1. Las migraciones de base de datos ya están creadas en los modelos
2. Asegúrate que PostGIS está instalado (para GeoDjango)

### Mobile

1. Agregar `UnitsProvider` en el componente raíz
2. Actualizar navegación para incluir pantallas

### Web

1. Actualizar `App.tsx` con las nuevas rutas
2. Importar páginas nuevas
3. Agregar a menú de navegación si es necesario

## 📝 Ejemplos de Uso

### Crear Unidad (Backend)
```bash
curl -X POST http://localhost:8000/api/units/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ambulancia 01",
    "type": "AMBULANCIA",
    "vehicle_id": "AMB001",
    "fuel_level": 100,
    "battery_level": 100
  }'
```

### Cambiar Estado
```bash
curl -X POST http://localhost:8000/api/units/{id}/change_status/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status_nuevo": "EN_VIAJE",
    "razon": "Respuesta a incidente"
  }'
```

### Registrar Consumo
```bash
curl -X POST http://localhost:8000/api/units/{id}/record_consumption/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fuel_level": 85,
    "battery_level": 90,
    "fuel_consumed_since_last": 15,
    "distance_km": 25.5,
    "duration_minutes": 30
  }'
```

## 🐛 Troubleshooting

### Las unidades no aparecen
- Verificar que el usuario está autenticado
- Verificar que las unidades pertenecen a la organización del usuario
- Revisar logs del backend

### Errores de ubicación
- Asegúrate que PostGIS está instalado
- Verificar formato de coordenadas (longitude, latitude)

### Historial no carga
- Verificar permisos del usuario
- Revisar que existen registros en base de datos

## 🔄 Próximas Mejoras Sugeridas

1. Mapa en tiempo real mostrando ubicación actual de unidades
2. Alertas push cuando combustible/batería está bajo
3. Reportes de consumo y análisis de tendencias
4. Asignación automática de unidades cercanas
5. Integración con sistema de rutas
6. Exportación de reportes a PDF/Excel
7. WebSocket para actualizaciones en tiempo real
