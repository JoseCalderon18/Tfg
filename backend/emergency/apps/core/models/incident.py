from django.contrib.gis.db import models as gis_models
from django.db import models
import uuid

from .user import User
from .organization import Organizacion


class Incidente(models.Model):
    """
    Modelo de Incidente u Operativo de Emergencia.

    Representa una situación de emergencia donde participan múltiples
    operativos (bomberos, policía, sanitarios, etc.).

    Attributes:
        id: UUID único del incidente
        name: Nombre descriptivo del incidente
        incident_type: Tipo de emergencia (incendio, rescate, etc.)
        status: Estado actual (abierto, cerrado, en evaluación)
        description: Descripción detallada
        location: Ubicación GPS del incidente
        location_address: Dirección textual
        created_by: Usuario que creó el incidente
        owner_organization: Organización responsable
        members: Usuarios participantes
        started_at: Fecha de inicio
        ended_at: Fecha de cierre
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    # Opciones para el tipo de incidente
    INCIDENT_TYPES = [
        ('WILDFIRE', 'Incendio Forestal'),
        ('SEARCH', 'Búsqueda de Persona'),
        ('RESCUE', 'Rescate'),
        ('MEDICAL', 'Emergencia Médica'),
        ('NATURAL_DISASTER', 'Desastre Natural'),
        ('OTHER', 'Otro'),
    ]

    # Opciones para el estado del incidente
    STATUS_CHOICES = [
        ('OPEN', 'Abierto'),
        ('CLOSED', 'Cerrado'),
        ('TRIAGE', 'En Evaluación'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    description = models.TextField(blank=True, null=True)

    # Ubicación del incidente usando GeoDjango
    location = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="Ubicación GPS principal del incidente (WGS84)"
    )
    location_address = models.TextField(blank=True, null=True)

    # Relaciones con otros modelos
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_incidents',
        help_text="Usuario que creó este incidente"
    )
    owner_organization = models.ForeignKey(
        Organizacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents',
        help_text="Organización responsable del incidente"
    )

    # Participantes - relación muchos a muchos a través de IncidentMember
    members = models.ManyToManyField(
        User,
        through='IncidentMember',
        related_name='incidents',
        help_text="Usuarios asignados a este incidente"
    )

    # Fechas importantes
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'incidentes'
        ordering = ['-created_at']

    def __str__(self):
        """Representación en string del incidente."""
        return f"{self.name} ({self.get_incident_type_display()})"

    @property
    def is_active(self):
        """Propiedad que indica si el incidente está activo."""
        return self.status == 'OPEN'
