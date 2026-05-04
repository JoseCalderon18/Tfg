FROM python:3.12-slim

# Instalar dependencias del sistema (GDAL)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Configurar variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal
ENV GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so

# Crear directorio de trabajo
WORKDIR /app

# Copiar requirements primero para aprovechar caché
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Script de arranque (migraciones + static)
RUN chmod +x /app/entrypoint.sh

# Exponer puerto
EXPOSE 8000

# Arranque por defecto
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "-c", "gunicorn emergency.config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
