from django.contrib.gis.db import models as gis_models
from django.db import models
from django.core.validators import MinValueValidator
import uuid

from .user import User
from .incident import Incident


class TrackPoint(models.Model):
    """
    Modelo de Punto de Tracking GPS.

    Almacena una posición GPS registrada por un operativo en un momento
    específico. Se usa para trazar rutas y conocer la ubicación histórica.

    Attributes:
        id: UUID único del punto
        user: Usuario que registró el punto
        incident: Incidente asociado (si aplica)
        location: Coordenadas GPS (latitud, longitud)
        accuracy_m: Precisión del GPS en metros
        altitude: Altitud en metros sobre el nivel del mar
        speed: Velocidad en m/s
        recorded_at: Momento real en que se registró (del GPS)
        created_at: Momento en que se guardó en el servidor
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='track_points',
        help_text="Usuario que registró esta posición"
    )
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='track_points',
        null=True,
        blank=True,
        help_text="Incidente asociado (opcional)"
    )

    # Datos geográficos y del GPS
    location = gis_models.PointField(
        srid=4326,
        help_text="Coordenadas GPS (longitud, latitud) en sistema WGS84"
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
        help_text="Velocidad en metros por segundo"
    )

    # Timestamps
    recorded_at = models.DateTimeField(
        help_text="Momento en que el GPS registró la posición"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Momento en que se recibió en el servidor"
    )

    class Meta:
        db_table = 'track_points'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['user', 'recorded_at']),
            models.Index(fields=['incident', 'recorded_at']),
            models.Index(fields=['recorded_at']),
        ]
        verbose_name = 'Punto de rastreo'
        verbose_name_plural = 'Puntos de rastreo'

    def __str__(self):
        """Representación en string del punto de tracking."""
        return f"Track {self.user.username} @ {self.recorded_at}"
