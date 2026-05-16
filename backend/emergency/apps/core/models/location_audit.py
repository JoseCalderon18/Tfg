from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator
import uuid
from django.utils import timezone

from .unit import Unidad


class AuditoriaUbicacion(models.Model):
    """
    Auditoría de ubicaciones para seguimiento histórico.

    Registra cada actualización de ubicación de una unidad,
    similar a PuntoRastreo pero específicamente para unidades.

    Attributes:
        id: UUID único
        unit: Unidad cuya ubicación se registra
        location: Coordenadas GPS (punto geográfico)
        accuracy_m: Precisión del GPS en metros
        altitude: Altitud en metros
        speed: Velocidad en m/s
        heading: Dirección en grados (0-360)
        recorded_at: Momento en que el GPS registró
        created_at: Momento en que se guardó en servidor
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit = models.ForeignKey(
        Unidad,
        on_delete=models.CASCADE,
        related_name='location_audit',
        help_text="Unidad cuya ubicación se registra"
    )
    
    # Datos geográficos
    location = gis_models.PointField(
        srid=4326,
        help_text="Coordenadas GPS en sistema WGS84"
    )
    accuracy_m = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Precisión estimada del GPS en metros"
    )
    altitude = models.FloatField(
        null=True,
        blank=True,
        help_text="Altitud en metros sobre el nivel del mar"
    )
    speed = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Velocidad en metros por segundo"
    )
    heading = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MinValueValidator(360)],
        help_text="Dirección de movimiento en grados (0-360)"
    )
    
    # Timestamps
    recorded_at = models.DateTimeField(
        help_text="Momento en que el GPS registró la posición"
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'location_audit'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['unit', '-recorded_at']),
            models.Index(fields=['recorded_at']),
        ]
        verbose_name = 'Auditoría de ubicación'
        verbose_name_plural = 'Auditorías de ubicación'
    
    def __str__(self):
        """Representación en string."""
        return f"{self.unit.name} @ {self.recorded_at}"
