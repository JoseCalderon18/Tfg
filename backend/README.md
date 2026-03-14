# Backend

## Instalacion

## Docker (recomendado para equipo)

1. Crear archivo de entorno:
```bash
cp .env.example .env
```

2. Levantar servicios:
```bash
docker compose up --build
```

3. La API quedara disponible en:
```text
http://localhost:8000
```

Notas:
- El contenedor backend aplica `migrate` y `collectstatic` automaticamente al iniciar.
- La base de datos PostGIS se inicia en el servicio `db`.
- El contenedor **no** ejecuta seeds automaticos para evitar datos inesperados.

## Carga de datos demo

Para poblar datos de prueba una vez que la base de datos esta creada y migrada:

```powershell
Get-Content .\seed.sql | docker compose exec -T db psql -U postgres -d emergency_db
```

## Instalacion local (sin Docker)

1. Crear entorno virtual:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Copiar archivo de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Crear base de datos PostgreSQL con PostGIS:
```sql
CREATE DATABASE emergency_db;
\c emergency_db
CREATE EXTENSION postgis;
```

5. Ejecutar migraciones:
```bash
python manage.py migrate
```

6. Crear superusuario:
```bash
python manage.py createsuperuser
```

7. Iniciar servidor:
```bash
python manage.py runserver
```

## Endpoints principales

- `POST /api/auth/login/` - Login JWT
- `POST /api/auth/refresh/` - Refrescar token
- `GET /api/auth/me/` - Usuario actual
- `POST /api/tracking/point/` - Crear punto de tracking
- `POST /api/tracking/batch/` - Crear múltiples puntos
- `GET /api/tracking/last/` - Últimas posiciones
- `GET /api/incidents/` - CRUD de incidentes
- `GET /api/alerts/` - CRUD de alertas
- `GET /api/docs/swagger/` - Documentación Swagger
