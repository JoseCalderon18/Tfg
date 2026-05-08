"""
Paquete de serializers de la API.
Compatibiliza nombres en espanol e ingles usados en las vistas.
"""

from .auth_serializers import UserSerializer, UserCreateSerializer, ProfileSerializer
from .track_serializers import TrackPointSerializer, TrackPointCreateSerializer
from .journey_serializers import JourneySerializer, JourneyCreateSerializer, JourneyStopSerializer
from .incident_serializers import (
    IncidentSerializer,
    IncidentCreateSerializer,
    IncidentMemberSerializer,
    IncidentMemberCreateSerializer,
)
from .incident_message_serializers import (
    IncidentMessageSerializer,
    IncidentMessageCreateSerializer,
)
from .alert_serializers import (
    AlertSerializer,
    AlertCreateSerializer,
    AlertAckSerializer,
    AlertCloseSerializer,
)
from .organization_serializers import OrganizationSerializer, OrganizationCreateSerializer
from .lightning_serializers import LightningStrikeSerializer, LightningStrikeListSerializer
from .risk_report_serializers import RiskReportSerializer, RiskReportCreateSerializer
from .workarea_serializers import WorkAreaSerializer, WorkAreaCreateSerializer
from .point_of_interest_serializers import PointOfInterestSerializer, PointOfInterestCreateSerializer
from .audit_serializers import AuditoriaSerializer

# Alias en espanol para compatibilidad con vistas existentes
PuntoRastreoSerializer = TrackPointSerializer
PuntoRastreoCreateSerializer = TrackPointCreateSerializer
IncidenteSerializer = IncidentSerializer
IncidenteCreateSerializer = IncidentCreateSerializer
AlertaSerializer = AlertSerializer
AlertaCreateSerializer = AlertCreateSerializer
AlertaAckSerializer = AlertAckSerializer
AlertaCloseSerializer = AlertCloseSerializer
AreaTrabajoSerializer = WorkAreaSerializer
AreaTrabajoCreateSerializer = WorkAreaCreateSerializer

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
    "IncidentMessageSerializer",
    "IncidentMessageCreateSerializer",
    "IncidenteSerializer",
    "IncidenteCreateSerializer",
    "AlertSerializer",
    "AlertCreateSerializer",
    "AlertAckSerializer",
    "AlertCloseSerializer",
    "AlertaSerializer",
    "AlertaCreateSerializer",
    "AlertaAckSerializer",
    "AlertaCloseSerializer",
    "WorkAreaSerializer",
    "WorkAreaCreateSerializer",
    "AreaTrabajoSerializer",
    "AreaTrabajoCreateSerializer",
    "OrganizationSerializer",
    "OrganizationCreateSerializer",
    "RiskReportSerializer",
    "RiskReportCreateSerializer",
    "JourneySerializer",
    "JourneyCreateSerializer",
    "JourneyStopSerializer",
    "PointOfInterestSerializer",
    "PointOfInterestCreateSerializer",
    "AuditoriaSerializer",
]
