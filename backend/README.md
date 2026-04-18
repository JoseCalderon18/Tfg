# Backend

API central del sistema de emergencias construida con Django REST Framework y soporte geoespacial con PostGIS.

## Stack

- Django 5
- Django REST Framework
- SimpleJWT
- GeoDjango
- PostgreSQL + PostGIS
- drf-spectacular

## Ejecucion con Docker

```bash
cp .env.example .env
docker compose up --build
```

Servicios principales:

- API: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`
- Swagger: `http://localhost:8000/api/docs/swagger/`
- ReDoc: `http://localhost:8000/api/docs/redoc/`

Notas:

- el contenedor aplica migraciones al iniciar
- la base usa PostGIS
- no se ejecutan seeds automaticos

## Instalacion local

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

## Variables de entorno

Ver `backend/.env.example`.

Minimas para desarrollo:

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`

## Endpoints principales

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

### Operacion

- `POST /api/tracking/point/`
- `POST /api/tracking/batch/`
- `GET /api/tracking/last/`
- `GET /api/tracking/route/`
- `GET /api/tracking/incident/<uuid:incident_id>/`

### Recursos CRUD

- `/api/incidents/`
- `/api/alerts/`
- `/api/users/`
- `/api/organizations/`
- `/api/risk-reports/`
- `/api/lightning/`
- `/api/workareas/`
- `/api/journeys/`
- `/api/points-of-interest/`

## Datos demo

Si necesitas cargar datos manuales tras crear la base:

```powershell
Get-Content .\datas.sql | docker compose exec -T db psql -U postgres -d emergency_db
```

## Tests

```bash
python manage.py test
```

## Archivos clave

- `emergency/config/settings.py`
- `emergency/config/urls.py`
- `emergency/apps/api/urls.py`
- `emergency/apps/core/models.py`
