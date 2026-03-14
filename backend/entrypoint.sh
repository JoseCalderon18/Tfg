#!/bin/sh
set -e

# Aplicar migraciones pendientes al iniciar el contenedor
echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

# Recolectar archivos estaticos para servirlos desde Django
echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

# Arrancar el proceso principal del contenedor
echo "[entrypoint] Starting application..."
exec "$@"
