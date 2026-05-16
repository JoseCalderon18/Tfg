from django.db import models
import uuid
from django.utils import timezone

from .unit import Unidad
from .user import User


class EstadoUnidad(models.Model):
    """
    Historial de cambios de estado de una unidad.

    Registra cada cambio de estado de disponibilidad de la unidad
    con timestamp e información del usuario que realizó el cambio.

    Attributes:
        id: UUID único del registro
        unit: Unidad cuyo estado cambió
        status_anterior: Estado anterior
        status_nuevo: Nuevo estado
        driver: Conductor asignado en este estado (si aplica)
        razón: Razón del cambio de estado
        created_by: Usuario que registró el cambio
        created_at: Momento del cambio
    """
    
    STATUS_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_VIAJE', 'En viaje'),
        ('EN_MANTENIMIENTO', 'En mantenimiento'),
        ('OFFLINE', 'Offline'),
        ('CARGANDO', 'Cargando'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit = models.ForeignKey(
        Unidad,
        on_delete=models.CASCADE,
        related_name='status_history',
        help_text="Unidad cuyo estado cambió"
    )
    status_anterior = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        help_text="Estado anterior"
    )
    status_nuevo = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        help_text="Nuevo estado"
    )
    driver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unit_status_changes',
        help_text="Conductor asignado (si aplica)"
    )
    razon = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Razón del cambio de estado"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unit_status_changes_created',
        help_text="Usuario que registró el cambio"
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'unit_status_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['unit', '-created_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Historial de estado de unidad'
        verbose_name_plural = 'Historiales de estado de unidades'
    
    def __str__(self):
        """Representación en string."""
        return f"{self.unit.name}: {self.status_anterior} → {self.status_nuevo}"
