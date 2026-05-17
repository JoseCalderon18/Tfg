# Backend

En esta carpeta tenemos la API principal del proyecto. Es la parte que centraliza autenticacion, entidades del sistema, tracking, jornadas y toda la logica necesaria para conectar el panel web y la app mobile.

## Stack que estamos usando

- Django 5
- Django REST Framework
- SimpleJWT
- GeoDjango
- PostgreSQL + PostGIS
- drf-spectacular

## Arranque con Docker

La forma mas comoda de levantarlo en desarrollo es esta:

```bash
cp .env.example .env
docker compose up --build
```

Una vez levantado, normalmente trabajamos con estas rutas:

- API: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`
- Swagger: `http://localhost:8000/api/docs/swagger/`
- ReDoc: `http://localhost:8000/api/docs/redoc/`

## Instalacion local

Si queremos ejecutarlo sin Docker, solemos seguir este flujo:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

## Variables de entorno

La referencia base esta en `backend/.env.example`.

Las variables minimas que solemos configurar son:

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`

## Endpoints que mas usamos

### Autenticacion mobile

- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/verify/`
- `GET /api/auth/me/`
- `GET /api/auth/me/profile/`

### Autenticacion panel

- `POST /api/auth/panel/login/`
- `POST /api/auth/panel/logout/`
- `GET /api/auth/panel/me/`
- `GET /api/auth/panel/users/`
- `POST /api/auth/panel/users/create/`

### Operativa

- `POST /api/tracking/point/`
- `POST /api/tracking/batch/`
- `GET /api/tracking/last/`
- `GET /api/tracking/route/`
- `GET /api/tracking/incident/<uuid:incident_id>/`

### Recursos principales

- `/api/incidents/`
- `/api/alerts/`
- `/api/users/`
- `/api/organizations/`
- `/api/risk-reports/`
- `/api/lightning/`
- `/api/workareas/`
- `/api/journeys/`
- `/api/points-of-interest/`

## Datos de prueba

Si necesitamos cargar datos demo despues de levantar la base, usamos:

```powershell
Get-Content .\datas.sql | docker compose exec -T db psql -U postgres -d emergency_db
```

## Tests

```bash
python manage.py test
```

## Archivos que solemos tocar mas

- `emergency/config/settings.py`
- `emergency/config/urls.py`
- `emergency/apps/api/urls.py`
- `emergency/apps/core/models.py`

## Funcionalidad tiempo real (ubicaciones de compañeros)

El proyecto incluye soporte para publicar y recibir ubicaciones en tiempo real (WebSockets) para mostrar compañeros en el mapa y lanzar alertas cuando un compañero deja de reportar posición.

Resumen técnico:
- Endpoint REST: `POST /api/tracking/point/` guarda la posición y la retransmite por canal si procede.
- WebSocket: `ws://<host>/api/ws/locations/` (autenticación vía token, acciones `auth` y `subscribe`).
- Backend: Django Channels + consumer `LocationConsumer` (broadcast por grupo `incident:{id}:locations`).

Qué hay que hacer para habilitarlo en desarrollo:

1. Añadir dependencias en `backend/requirements.txt`:

```
channels>=4.0
channels-redis>=4.0
```

2. Configurar `CHANNEL_LAYERS` para usar Redis en `emergency/config/settings.py`, por ejemplo:

```py
CHANNEL_LAYERS = {
	'default': {
		'BACKEND': 'channels_redis.core.RedisChannelLayer',
		'CONFIG': {
			'hosts': [('redis', 6379)],
		},
	},
}
ASGI_APPLICATION = 'emergency.config.asgi.application'
```

3. Añadir servicio `redis` en `backend/docker-compose.yml` (ejemplo mínimo):

```yaml
services:
	redis:
		image: redis:7
		restart: unless-stopped

	web:
		build: .
		depends_on:
			- db
			- redis
		environment:
			- CHANNEL_REDIS_URL=redis://redis:6379/0
```

4. Instalar dependencias y aplicar migraciones:

```bash
pip install -r requirements.txt
python manage.py migrate
```

5. Levantar servicio (con Docker Compose):

```bash
docker compose up --build
```

Pruebas rápidas desde la app móvil:
- Iniciar sesión en la app móvil y activar tracking.
- La app publica puntos a `/api/tracking/point/` y además se suscribe por WS a `ws://.../ws/locations/` para recibir `position.update`.
- Ver en el mapa cómo aparecen y se mueven los marcadores de compañeros.
- Si un compañero no reporta durante >10 minutos, la app móvil envía una alerta (`POST /api/alerts/`) indicando `Compañero inactivo`.

Notas de seguridad:
- Para producción, asegúrate de usar `wss://` y `rediss://` si usas TLS; configura permisos y límites de tasa para evitar abuso.

