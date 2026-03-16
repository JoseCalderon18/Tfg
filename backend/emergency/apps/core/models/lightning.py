from django.contrib.gis.db import models as gis_models
from django.db import models
import uuid


class LightningStrike(models.Model):
    """
    Modelo para representar detecciones de rayos durante tormentas.

    Attributes:
        id: UUID único del rayo
        location: Ubicación GPS del rayo (PointField con PostGIS)
        timestamp: Fecha y hora de detección
        intensity: Intensidad del rayo (opcional, en kA)
        created_at: Fecha de creación del registro
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = gis_models.PointField(
        srid=4326,
        help_text="Ubicación GPS del rayo (latitud, longitud)"
    )
    timestamp = models.DateTimeField(
        help_text="Fecha y hora de detección del rayo"
    )
    intensity = models.FloatField(
        null=True,
        blank=True,
        help_text="Intensidad del rayo en kiloamperios (kA)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Rayo"
        verbose_name_plural = "Rayos"
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['location']),
        ]

    def __str__(self):
        return f"Rayo en {self.location} - {self.timestamp}"

    @property
    def lat(self):
        """Latitud del rayo"""
        return self.location.y

    @property
    def lon(self):
        """Longitud del rayo"""
        return self.location.x