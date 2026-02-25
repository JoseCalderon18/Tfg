"""
Paquete de serializers de la API.

Los serializers convierten datos entre objetos Python y JSON,
permitiendo la serialización/deserialización para la API REST.

Serializers disponibles:
- auth_serializers: Para autenticación y usuarios
- track_serializers: Para tracking GPS
- alert_serializers: Para alertas
"""

from .auth_serializers import UserSerializer, UserCreateSerializer, ProfileSerializer
from .track_serializers import TrackPointSerializer, TrackPointCreateSerializer
from .alert_serializers import (
    AlertSerializer, AlertCreateSerializer,
    AlertAckSerializer, AlertCloseSerializer
)
from .incident_serializers import (
    IncidentSerializer, IncidentCreateSerializer,
    IncidentMemberSerializer, IncidentMemberCreateSerializer
)
from .organization_serializers import OrganizationSerializer, OrganizationCreateSerializer

__all__ = [
    'UserSerializer',
    'UserCreateSerializer',
    'ProfileSerializer',
    'TrackPointSerializer',
    'TrackPointCreateSerializer',
    'AlertSerializer',
    'AlertCreateSerializer',
    'AlertAckSerializer',
    'AlertCloseSerializer',
    'IncidentSerializer',
    'IncidentCreateSerializer',
    'IncidentMemberSerializer',
    'IncidentMemberCreateSerializer',
    'OrganizationSerializer',
    'OrganizationCreateSerializer',
]
