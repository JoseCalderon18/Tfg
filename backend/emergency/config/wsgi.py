"""
WSGI config for emergency project.

It exposes the WSGI callable as a module-level variable named ``application``.

WSGI (Web Server Gateway Interface) es el estándar de Python para servidores web.
Este archivo expone la aplicación WSGI para servidores como Gunicorn o uWSGI.

Más información: https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Establece el módulo de settings por defecto para que Django sepa qué configuración usar
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'emergency.config.settings')

# Obtiene la aplicación WSGI que será usada por el servidor web
application = get_wsgi_application()
