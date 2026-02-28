# Aplicación de Gestión Logística y Seguridad para Cuerpos de Emergencias

Aplicación móvil + panel web para **cuerpos de emergencias** (incendios forestales y/o búsqueda de personas) que permite tracking GPS de operativos en tiempo real, alertas SOS con geolocalización y gestión de incidentes.

---

## 📁 Estructura del Proyecto

```
Proyecto/
├── backend/                          # Django REST API
│   ├── emergency/
│   │   ├── apps/
│   │   │   ├── core/               # Modelos y admin
│   │   │   │   ├── models/         # Entidades principales
│   │   │   │   └── admin.py        # Configuración admin
│   │   │   └── api/                # API REST
│   │   │       ├── serializers/     # Serializadores DRF
│   │   │       └── views/          # Vistas API
│   │   └── config/                 # Configuración Django
│   │       ├── settings.py
│   │       ├── urls.py
│   │       └── wsgi.py
│   ├── manage.py                   # CLI Django
│   ├── requirements.txt            # Dependencias Python
│   ├── Dockerfile                  # Imagen Docker
│   └── docker-compose.yml          # Orquestación Docker
├── mobile-app/                      # React Native + Expo
│   ├── src/
<<<<<<< HEAD
│   │   ├── context/                  # AuthContext, LocationContext
│   │   └── screens/                  # Pantallas
│   │       ├── LoginScreen.tsx       # Autenticación
│   │       ├── OperativeScreen.tsx   # Pantalla principal operativo
│   │       ├── PointsOfInterestScreen.tsx  # Puntos de interés
│   │       ├── MapScreen.tsx         # Visualización del mapa
│   │       ├── AlertScreen.tsx       # Formulario de alertas
│   │       └── HomeScreen.tsx        # Pantalla de inicio (legacy)
=======
│   │   ├── context/               # AuthContext, LocationContext
│   │   └── screens/               # Pantallas
>>>>>>> f943b3c14cd95417887e7e5fca7917e137cc2082
│   ├── App.tsx
│   └── package.json
├── web-panel/                      # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/             # Componentes reutilizables
│   │   ├── pages/                  # Páginas
│   │   └── store/                  # Zustand stores
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🗄️ Entidades del Sistema

Las entidades están definidas en `backend/emergency/apps/core/models/`:

| Entidad | Descripción | Campos principales |
|---------|-------------|-------------------|
| **User** | Usuario base (extiende AbstractUser) | username, email, password, phone |
| **Perfil** | Perfil extendido con roles | role (ADMIN/SUPERVISOR/OPERATIVE), organization |
| **Organization** | Organización (bomberos, policía, etc.) | name, org_type, contact |
| **Incident** | Incidente/Operativo | name, type (WILDFIRE/SEARCH), status (OPEN/CLOSED), location (Point) |
| **IncidentMember** | Relación N:M usuario-incidente | role_in_incident, joined_at |
| **TrackPoint** | Punto GPS de tracking | location (Point), accuracy_m, speed, recorded_at |
| **Alert** | Alerta SOS o emergencia urgente | type (SOS/MAN_DOWN), severity (1-5), status (OPEN/ACK/CLOSED) |
| **RiskReport** | Reporte de zona de riesgo | location (Point), description, severity (LOW/MEDIUM/HIGH) |
| **Device** | Dispositivo para notificaciones push | fcm_token, platform |
| **WorkArea** | Área de trabajo (círculo o polígono) | area_type, center, radius_m, polygon |

---

## 🚀 Guía de Inicio Rápido

### Opción 1: Docker (Recomendado)

```bash
# 1. Clonar el proyecto
git clone <repo-url>
cd Proyecto

# 2. Levantar servicios
cd backend
docker-compose up --build

# 3. Acceder a los servicios
# API: http://localhost:8000
# Admin: http://localhost:8000/admin
# Swagger: http://localhost:8000/api/docs/
```

### Opción 2: Local (sin Docker)

```bash
# 1. Instalar PostgreSQL + PostGIS
# Ver sección de instalación abajo

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# 3. Configurar .env
cp .env.example .env

# 4. Migraciones
python manage.py migrate
python manage.py createsuperuser

# 5. Ejecutar
python manage.py runserver
```

---

## 🐳 Docker

### Servicios disponibles:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Backend (Django) | 8000 | API REST |
| PostgreSQL + PostGIS | 5432 | Base de datos |

### Comandos Docker:

```bash
# Iniciar servicios
docker-compose up

# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down

# Rebuild y iniciar
docker-compose up --build
```

---

## 📡 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Registrar usuario |
| POST | `/api/auth/panel/login/` | Iniciar sesión (web panel) |
| POST | `/api/auth/login/` | Iniciar sesión (mobile app) |
| POST | `/api/auth/panel/logout/` | Cerrar sesión |
| GET | `/api/auth/me/` | Usuario actual |
| GET | `/api/auth/me/profile/` | Perfil del usuario |

### Incidentes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/incidents/` | Lista de incidentes |
| POST | `/api/incidents/` | Crear incidente |
| GET | `/api/incidents/{id}/` | Detalle de incidente |
| PUT | `/api/incidents/{id}/` | Actualizar incidente |
| DELETE | `/api/incidents/{id}/` | Eliminar incidente |
| POST | `/api/incidents/{id}/join/` | Unirse al incidente |
| POST | `/api/incidents/{id}/leave/` | Abandonar incidente |
| POST | `/api/incidents/{id}/close/` | Cerrar incidente |
| GET | `/api/incidents/{id}/members/` | Ver miembros |
| GET | `/api/incidents/active/` | Incidentes activos |
| GET | `/api/incidents/my_incidents/` | Mis incidentes |

### Alertas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alerts/` | Lista de alertas |
| POST | `/api/alerts/` | Crear alerta |
| POST | `/api/alerts/{id}/acknowledge/` | Reconocer alerta |
| POST | `/api/alerts/{id}/close/` | Cerrar alerta |
| GET | `/api/alerts/open/` | Alertas abiertas |
| GET | `/api/alerts/my_alerts/` | Mis alertas |

### Reportes de Riesgo (RiskReport)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/risk-reports/` | Lista de reportes de riesgo |
| POST | `/api/risk-reports/` | Crear reporte de riesgo |
| GET | `/api/risk-reports/{id}/` | Detalle de reporte |
| POST | `/api/risk-reports/{id}/deactivate/` | Desactivar reporte |
| GET | `/api/risk-reports/active/` | Reportes activos |
| GET | `/api/risk-reports/by_incident/?incident_id=` | Reportes de un incidente |

### Tracking GPS

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/tracking/point/` | Enviar punto GPS |
| POST | `/api/tracking/batch/` | Enviar varios puntos |
| GET | `/api/tracking/last/` | Última posición |
| GET | `/api/tracking/route/?user_id=&incident_id=` | Ruta de un usuario |
| GET | `/api/tracking/incident/{id}/` | Tracking de incidente |

### Usuarios y Organizaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/` | Lista de usuarios |
| GET | `/api/organizations/` | Lista de organizaciones |
| POST | `/api/organizations/` | Crear organización |

---

## 🔐 Autenticación

El sistema usa **JWT (JSON Web Tokens)**.

### Headers requeridos:
```
Authorization: Bearer <token>
```

### Obtener token:
```bash
# Login para mobile-app
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

---

## 📱 Mobile App

```bash
cd mobile-app
npm install
npx expo start
```

Una vez ejecutado, escanea el código QR con **Expo Go** en tu dispositivo iOS o Android.

### Pantallas de la App Móvil

#### 🔐 **LoginScreen**
- Pantalla de autenticación
- Campos: Username y Password
- Valida credenciales contra el backend

#### 🏠 **OperativeScreen** - Pantalla Principal del Operativo
La interfaz principal de trabajo para operativos en el terreno.

**Componentes:**
- **Header (Rojo):** 
  - Botón menú hamburguesa (≡)
  - Título "Emergency App"
  - Nombre del usuario

- **Área Central:** Espacio reservado para el mapa (placeholder "Mapa")

- **Menú Inferior (15% altura):**
  - 📍 **MARCAR PUNTO** (izquierda) - Accede a puntos de interés
  - 🚨 **ALERTA** (centro, rojo, destacado) - Envía alerta SOS con confirmación
  - ☎️ **LLAMAR** (derecha) - Función de llamada de emergencia

- **Menú Hamburguesa:**
  - 👥 Compañeros - Ver ubicación de compañeros
  - 🌤️ Meteorología - Información meteorológica
  - ⏸️ Iniciar Descanso - Registrar descanso
  - 🛑 Parar Jornada - Finalizar jornada de trabajo
  - 🚪 Cerrar Sesión - Logout

**Funcionalidades:**
- Confirmación requerida para enviar alerta SOS
- Navegación fluida entre pantallas
- Almacenamiento seguro de tokens con Expo Secure Store

#### 📍 **PointsOfInterestScreen** - Puntos de Interés
Pantalla dedicada a marcar y visualizar puntos de interés en el terreno.

**Opciones disponibles:**
- 🚰 **Hidrantes** - Ubicación de hidrantes disponibles
- 🏠 **Asentamiento** - Zonas de viviendas y asentamientos
- 🔥 **Cortafuegos** - Líneas de cortafuegos
- 👁️ **Puntos de Vigilancia** - Torres y puntos de vigilancia
- 🏢 **Estaciones Base** - Campamentos y estaciones base
- 🚪 **Vías de Evacuación** - Rutas de evacuación recomendadas

**Interactividad:**
- Selecciona un punto para ver opciones
- "Ver en mapa" - Visualiza el punto en el mapa principal
- "Marcar como punto" - Registra el punto en el sistema

#### 🗺️ **MapScreen**
- Visualización del mapa en tiempo real
- Muestra la ubicación actual del operativo
- Marcador de posición GPS

#### 🚨 **AlertScreen**
- Formulario para enviar alertas manuales
- Campos:
  - Tipo de alerta (SOS, Man Down, Pérdida, Otro)
  - Severidad (1-5)
  - Descripción
- Incluye geolocalización automática
- Confirmación antes de enviar

---

## 🖥️ Web Panel

```bash
cd web-panel
npm install
npm run dev
```

---

## 🧪 Tests

```bash
cd backend
python manage.py test
```

---

## 📚 Documentación API

Swagger UI: http://localhost:8000/api/docs/
ReDoc: http://localhost:8000/api/docs/redoc/

---

## Diferencia entre Alert y RiskReport

| Característica | Alert | RiskReport |
|---------------|-------|-------------|
| Es una emergencia | ✅ | ❌ |
| Ejemplo | "SOS!", "Man down" | "Hay humo ahí", "Ramas en la carretera" |
| Severidad | 1-5 | LOW/MEDIUM/HIGH |
| Creado por | Cualquier usuario | Cualquier usuario |

---

Desarrollado como TFG - Aplicación de Gestión Logística y Seguridad para Cuerpos de Emergencias
