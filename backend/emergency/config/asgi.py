"""
ASGI config for emergency project.

It exposes the ASGI callable as a module-level variable named ``application``.

ASGI (Asynchronous Server Gateway Interface) es el estándar moderno de Python
para servidores asíncronos. Permite usar websockets y otras funcionalidades asíncronas.

Más información: https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import os

# Establece el módulo de settings por defecto para que Django sepa qué configuración usar
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'emergency.config.settings')

# Importar el enrutado de websockets
from . import routing as project_routing

# Aplicación ASGI que delega HTTP a Django y WS a Channels
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
	'http': django_asgi_app,
	'websocket': AuthMiddlewareStack(
		URLRouter(project_routing.websocket_urlpatterns)
	),
})
