# Aplicación de Gestión Logística y Seguridad para Cuerpos de Emergencias

Aplicación móvil + panel web para **cuerpos de emergencias** (incendios forestales y/o búsqueda de personas) que permite tracking GPS de operativos en tiempo real, alertas SOS con geolocalización y gestión de incidentes.

---

## 📁 Estructura del Proyecto

```
Proyecto/
├── backend/                          # Django REST API
│   ├── emergency/
│   │   ├── apps/
│   │   │   ├── core/                 # Modelos y admin
│   │   │   │   ├── models.py         # Entidades principales
│   │   │   │   └── admin.py          # Configuración admin
│   │   │   └── api/                  # API REST
│   │   │       ├── serializers/      # Serializadores DRF
│   │   │       └── views/            # Vistas API
│   │   └── config/                   # Configuración Django
│   │       ├── settings.py
│   │       ├── urls.py
│   │       └── wsgi.py
│   ├── manage.py                     # CLI Django
│   └── requirements.txt              # Dependencias Python
├── mobile-app/                       # React Native + Expo
│   ├── src/
│   │   ├── context/                  # AuthContext, LocationContext
│   │   └── screens/                  # Pantallas
│   │       ├── LoginScreen.tsx       # Autenticación
│   │       ├── OperativeScreen.tsx   # Pantalla principal operativo
│   │       ├── PointsOfInterestScreen.tsx  # Puntos de interés
│   │       ├── MapScreen.tsx         # Visualización del mapa
│   │       ├── AlertScreen.tsx       # Formulario de alertas
│   │       └── HomeScreen.tsx        # Pantalla de inicio (legacy)
│   ├── App.tsx
│   └── package.json
├── web-panel/                        # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/               # Componentes reutilizables
│   │   ├── pages/                    # Páginas
│   │   └── store/                    # Zustand stores
│   ├── index.html
│   └── package.json
└── docs/                             # Documentación adicional
```

---

## 🗄️ Entidades Creadas

Las siguientes entidades están definidas en `backend/emergency/apps/core/models.py`:

| Entidad | Descripción | Campos principales |
|---------|-------------|-------------------|
| **User** | Usuario base (extiende AbstractUser) | username, email, password, phone |
| **Perfil** | Perfil extendido con roles | role (ADMIN/SUPERVISOR/OPERATIVE), organization |
| **Organizacion** | Organización (bomberos, policía, etc.) | name, org_type, contact |
| **Incidente** | Incidente/Operativo | name, type (WILDFIRE/SEARCH), status (OPEN/CLOSED), location (Point) |
| **Session** | Relación N:M usuario-incidente | role_in_incident, joined_at |
| **PuntoRastreo** | Punto GPS de tracking | location (Point), accuracy_m, recorded_at |
| **Alerta** | Alerta SOS o anomalía | type (SOS/MAN_DOWN), severity (1-5), status (OPEN/ACK/CLOSED) |
| **Dispositivo** | Dispositivo para notificaciones push | fcm_token, platform |
| **CeldaRiesgo** | Celda de heatmap para análisis | cell (Polygon), risk_score |

---

## 🤖 Módulo de IA/ML

El proyecto incluye un módulo de Machine Learning para detección de anomalías y priorización de zonas de riesgo.

### A) Detección de Anomalías

**Objetivo:** Detectar comportamientos "raros" o potencialmente peligrosos de los operativos.

**Features utilizadas (ventana de 5-10 min):**
- Velocidad media y variación
- Distancia recorrida
- Tiempo de inmovilidad
- Distancia al equipo (centro o vecino más cercano)
- Precisión GPS

**Modelo:** Isolation Forest (scikit-learn)

**Respaldo:** Reglas heurísticas (inmovilidad > X min, aislamiento, geofence)

**Uso:** Si el `anomaly_score` supera un umbral → se crea automáticamente una `Alerta(type=ANOMALY)`

**Ubicación propuesta:** `backend/emergency/apps/ml/anomaly_detector.py`

### B) Zonas de Riesgo / Heatmap

**MVP (sin ML):** Scoring heurístico por celdas (grid):
- Densidad de trackpoints
- Densidad de alertas
- Recencia (peso temporal)

**ML Opcional:** Clasificador simple (Logistic Regression o Random Forest) por celdas con etiquetas generadas.

**Salida:** `risk_score` por celda almacenado en la entidad `RiskCell`

**Visualización:** Heatmap en el panel web usando Leaflet.heat

**Ubicación propuesta:** `backend/emergency/apps/ml/risk_analyzer.py`

### C) Clasificación de Imágenes (Opcional)

**NO** geolocalización por foto.

**Uso:** Clasificar vegetación/humo en imágenes como feature adicional para el scoring de riesgo.

**Modelos posibles:** 
- MobileNetV2 (ligero)
- YOLOv8 (detección de objetos)

### Instalación de Dependencias ML

```bash
pip install scikit-learn numpy pandas
# Opcional
pip install tensorflow torch torchvision
```

### Ejecución del Módulo ML

```bash
# Análisis manual de anomalías para un incidente
python manage.py shell
>>> from emergency.apps.ml.anomaly_detector import detect_anomalies
>>> detect_anomalies(incident_id="uuid-del-incidente")

# Generar heatmap
>>> from emergency.apps.ml.risk_analyzer import generate_heatmap
>>> generate_heatmap(incident_id="uuid-del-incidente", cell_size=100)
```

### Integración Automática

En el futuro, se puede integrar con Celery para ejecución periódica:

```python
# tasks.py
from celery import shared_task
from .ml.anomaly_detector import detect_anomalies

@shared_task
def check_anomalies_periodic():
    for incident in Incident.objects.filter(status='OPEN'):
        detect_anomalies(incident.id)
```

---

## 🚀 Guía de Migraciones

### 1. Instalar Dependencias del Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configurar Base de Datos (PostgreSQL + PostGIS)

Instala PostgreSQL y PostGIS, luego crea la base de datos:

```sql
-- Conectarse a PostgreSQL
psql -U postgres

-- Crear base de datos
CREATE DATABASE emergency_db;

-- Activar extensión PostGIS
\c emergency_db
CREATE EXTENSION postgis;

-- Verificar instalación
SELECT PostGIS_Version();
```

### 3. Configurar Variables de Entorno

```bash
cd backend
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
DJANGO_SECRET_KEY=tu-clave-secreta-aqui
DJANGO_DEBUG=True
DB_NAME=emergency_db
DB_USER=postgres
DB_PASSWORD=tu-password
DB_HOST=localhost
DB_PORT=5432
```

### 4. Crear y Ejecutar Migraciones

```bash
# Desde el directorio backend/

# 1. Crear migraciones basadas en los modelos
python manage.py makemigrations

# 2. Ver las migraciones pendientes
python manage.py showmigrations

# 3. Aplicar migraciones a la base de datos
python manage.py migrate

# 4. Verificar tablas creadas (opcional)
python manage.py dbshell
\dt
```

### 5. Crear Superusuario

```bash
python manage.py createsuperuser
```

### 6. Iniciar Servidor de Desarrollo

```bash
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`

- API: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`
- Swagger Docs: `http://localhost:8000/api/docs/swagger/`

---

## 📱 Iniciar Frontend Móvil

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

## 🖥️ Iniciar Panel Web

```bash
cd web-panel
npm install
npm run dev
```

El panel estará en `http://localhost:3000`

---

## 🔄 Comandos Útiles de Migraciones

```bash
# Ver SQL que se ejecutará (dry-run)
python manage.py sqlmigrate core 0001

# Deshacer última migración
python manage.py migrate core zero

# Deshacer hasta migración específica
python manage.py migrate core 0001

# Limpiar migraciones y recrear
# 1. Eliminar archivos de migración (excepto __init__.py)
# 2. Eliminar registros de django_migrations en BD
# 3. Volver a crear: python manage.py makemigrations
# 4. Aplicar: python manage.py migrate --fake-initial

# Verificar estado de modelos
python manage.py check

# Shell de Django con auto-carga
python manage.py shell_plus --notebook
```

---

## 🧪 Tests

```bash
# Ejecutar todos los tests
python manage.py test

# Ejecutar tests de una app específica
python manage.py test core

# Con cobertura
pytest --cov=emergency --cov-report=html
```

---

## 📚 Documentación de Endpoints API

Una vez iniciado el servidor, la documentación está disponible en:

- **Swagger UI**: http://localhost:8000/api/docs/swagger/
- **ReDoc**: http://localhost:8000/api/docs/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

---

## 🐳 Docker (Opcional)

Para ejecutar todo el stack con Docker:

```bash
# En desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Construir imágenes
docker-compose build

# Ver logs
docker-compose logs -f
```

---

## 🔐 Seguridad

- Autenticación mediante JWT (JSON Web Tokens)
- Roles: ADMIN, SUPERVISOR, OPERATIVE
- CORS configurado para desarrollo local
- Variables sensibles en archivo `.env` (no commitear)

---

## 📞 Soporte

Para más información sobre el proyecto, consulta:
- [Documentación Backend](./backend/README.md)
- [Modelos](./backend/emergency/apps/core/models.py)
- [API Views](./backend/emergency/apps/api/views/)

---

Desarrollado como TFG - Aplicación de Gestión Logística y Seguridad para Cuerpos de Emergencias
