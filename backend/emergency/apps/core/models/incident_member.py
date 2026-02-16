from django.db import models
import uuid

from .user import User
from .incident import Incident


class IncidentMember(models.Model):
    """
    Modelo de relación muchos a muchos entre Incidente y Usuario.

    Representa la participación de un usuario en un incidente específico,
    incluyendo su rol dentro del incidente y las fechas de entrada/salida.

    Attributes:
        id: UUID único de la membresía
        incident: Incidente al que pertenece
        user: Usuario participante
        role_in_incident: Rol del usuario en este incidente específico
        joined_at: Fecha de incorporación al incidente
        left_at: Fecha de salida del incidente (null si aún está activo)
        is_active: Indica si el usuario sigue activo en el incidente
    """

    # Opciones para el rol dentro del incidente
    ROLES_IN_INCIDENT = [
        ('SUPERVISOR', 'Supervisor'),
        ('OPERATIVE', 'Operativo'),
        ('SUPPORT', 'Apoyo'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='incident_members',
        help_text="Incidente en el que participa el usuario"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='incident_memberships',
        help_text="Usuario que participa en el incidente"
    )
    role_in_incident = models.CharField(
        max_length=20,
        choices=ROLES_IN_INCIDENT,
        default='OPERATIVE',
        help_text="Rol específico del usuario dentro de este incidente"
    )
    joined_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha de incorporación al incidente"
    )
    left_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de salida del incidente (null si aún está activo)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el usuario sigue activo en el incidente"
    )

    class Meta:
        db_table = 'incident_members'
        unique_together = ['incident', 'user']
        ordering = ['-joined_at']
        verbose_name = 'Miembro de incidente'
        verbose_name_plural = 'Miembros de incidentes'

    def __str__(self):
        """Representación en string de la membresía."""
        return f"{self.user.username} en {self.incident.name}"
