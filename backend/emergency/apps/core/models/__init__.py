"""
Paquete de modelos de la aplicación core.

Este paquete contiene todos los modelos de Django que definen la estructura
de la base de datos para el sistema de gestión de emergencias.

Modelos principales:
- User: Usuarios del sistema
- Profile: Perfiles de usuario
- Organization: Organizaciones (bomberos, policía, etc.)
- Incident: Incidentes y operativos
- Alert: Alertas y emergencias
- Device: Dispositivos móviles para notificaciones
- RiskCell: Celdas de riesgo geográfico
- TrackPoint: Puntos de rastreo GPS
- Session: Relación usuarios-incidentes
"""

# Imports para facilitar el acceso desde otros módulos
from .user import User
from .profile import Profile
from .organization import Organization
from .incident import Incident
from .alert import Alert
from .device import Device
from .risk_cell import RiskCell
from .track_point import TrackPoint
from .session import Session
from .workarea import WorkArea

__all__ = [
    'User',
    'Perfil',
    'Profile',
    'Organizacion',
    'Organization',
    'Incidente',
    'Incident',
    'Alert',
    'Device',
    'RiskCell',
    'TrackPoint',
    'Session',
    'WorkArea',
]
