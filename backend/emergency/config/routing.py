from django.urls import re_path

from emergency.apps.core.consumers import LocationConsumer

websocket_urlpatterns = [
    # Conexión WS para ubicaciones en tiempo real
    re_path(r'ws/locations/?$', LocationConsumer.as_asgi()),
]
