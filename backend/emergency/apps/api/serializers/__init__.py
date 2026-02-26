"""
Paquete de serializers de la API.
Compatibiliza nombres en espanol e ingles usados en las vistas.
"""

from .auth_serializers import UserSerializer, UserCreateSerializer, ProfileSerializer
from .track_serializers import TrackPointSerializer, TrackPointCreateSerializer
from .incident_serializers import (
    IncidentSerializer,
    IncidentCreateSerializer,
    IncidentMemberSerializer,
    IncidentMemberCreateSerializer,
)
from .alert_serializers import (
    AlertSerializer,
    AlertCreateSerializer,
    AlertAckSerializer,
    AlertCloseSerializer,
)
from .organization_serializers import OrganizationSerializer, OrganizationCreateSerializer

# Alias en espanol para compatibilidad con vistas existentes
PuntoRastreoSerializer = TrackPointSerializer
PuntoRastreoCreateSerializer = TrackPointCreateSerializer
IncidenteSerializer = IncidentSerializer
IncidenteCreateSerializer = IncidentCreateSerializer
SessionSerializer = IncidentMemberSerializer
AlertaSerializer = AlertSerializer
AlertaCreateSerializer = AlertCreateSerializer
AlertaAckSerializer = AlertAckSerializer
AlertaCloseSerializer = AlertCloseSerializer

__all__ = [
    "UserSerializer",
    "UserCreateSerializer",
    "ProfileSerializer",
    "TrackPointSerializer",
    "TrackPointCreateSerializer",
    "PuntoRastreoSerializer",
    "PuntoRastreoCreateSerializer",
    "IncidentSerializer",
    "IncidentCreateSerializer",
    "IncidentMemberSerializer",
    "IncidentMemberCreateSerializer",
    "IncidenteSerializer",
    "IncidenteCreateSerializer",
    "SessionSerializer",
    "AlertSerializer",
    "AlertCreateSerializer",
    "AlertAckSerializer",
    "AlertCloseSerializer",
    "AlertaSerializer",
    "AlertaCreateSerializer",
    "AlertaAckSerializer",
    "AlertaCloseSerializer",
    "OrganizationSerializer",
    "OrganizationCreateSerializer",
]
