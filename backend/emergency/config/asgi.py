"""
ASGI config for emergency project.

It exposes the ASGI callable as a module-level variable named ``application``.

ASGI (Asynchronous Server Gateway Interface) es el estándar moderno de Python
para servidores asíncronos. Permite usar websockets y otras funcionalidades asíncronas.

Más información: https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

# Establece el módulo de settings por defecto para que Django sepa qué configuración usar
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'emergency.config.settings')

# Obtiene la aplicación ASGI que será usada por el servidor web
application = get_asgi_application()
