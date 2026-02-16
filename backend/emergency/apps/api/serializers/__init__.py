"""
Paquete de serializers de la API.

Los serializers convierten datos entre objetos Python y JSON,
permitiendo la serialización/deserialización para la API REST.

Serializers disponibles:
- auth_serializers: Para autenticación y usuarios
"""

from .auth_serializers import UserSerializer, UserCreateSerializer, ProfileSerializer

__all__ = [
    'UserSerializer',
    'UserCreateSerializer',
    'ProfileSerializer',
]
