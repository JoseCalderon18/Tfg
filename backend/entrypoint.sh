#!/bin/sh
set -e

echo "[entrypoint] Starting application..."
echo "[entrypoint] DB_HOST=${DB_HOST:-unset} DB_PORT=${DB_PORT:-unset} DB_USER=${DB_USER:-unset}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Running database migrations..."
  python manage.py migrate --noinput
fi

if [ "${COLLECT_STATIC:-false}" = "true" ]; then
  echo "[entrypoint] Collecting static files..."
  python manage.py collectstatic --noinput
fi

exec "$@"
