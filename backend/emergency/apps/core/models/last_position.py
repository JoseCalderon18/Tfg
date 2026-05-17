from django.contrib.gis.db import models as gis_models
from django.db import models
import uuid

from .user import User
from .incident import Incidente as Incident


class UltimaPosicion(models.Model):
    """
    Última posición conocida de un usuario (una fila por usuario).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='ultima_posicion',
        help_text='Usuario al que pertenece esta última posición'
    )
    incident = models.ForeignKey(
        Incident,
        on_delete=models.SET_NULL,
        related_name='ultimas_posiciones',
        null=True,
        blank=True,
        help_text='Incidente asociado (opcional)'
    )

    # Punto geográfico (longitud, latitud)
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    accuracy_m = models.FloatField(null=True, blank=True)
    altitude = models.FloatField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)

    # Última actualización recibida
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'last_positions'
        indexes = [
            models.Index(fields=['incident', 'updated_at']),
        ]
        verbose_name = 'Última posición'
        verbose_name_plural = 'Últimas posiciones'

    def __str__(self):
        return f"UltimaPosicion {self.user.username} @ {self.updated_at}"
