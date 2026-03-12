#!/bin/sh
set -e

# Esperar a que la base de datos esté disponible
echo "[entrypoint] Waiting for database at $DB_HOST:$DB_PORT..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 1
done
echo "[entrypoint] Database is up!"

# Migraciones
echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

# Cargar seed.sql si existe
if [ -f "/app/seed.sql" ]; then
  echo "[entrypoint] Seeding database..."
  cat /app/seed.sql | docker exec -i emergency_db psql -U $DB_USER -d $DB_NAME
fi

# Collect static files
echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

# Arrancar la aplicación
echo "[entrypoint] Starting application..."
exec "$@"