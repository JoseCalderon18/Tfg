from django.contrib.gis.db import models as gis_models
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

from .user import User
from .incident import Incidente as Incident


class Alerta(models.Model):
    """
    Modelo de Alerta SOS o anomalía generada por operativos.

    Representa emergencias reportadas por trabajadores de campo,
    incluyendo caídas, desorientación, o solicitudes de ayuda.

    Attributes:
        id: UUID único de la alerta
        incident: Incidente asociado (opcional)
        created_by: Usuario que generó la alerta
        alert_type: Tipo de alerta (SOS, MAN_DOWN, etc.)
        severity: Nivel de gravedad del 1 al 5
        status: Estado de la alerta (OPEN, ACK, CLOSED)
        title: Título descriptivo de la alerta
        description: Descripción detallada (opcional)
        location: Ubicación GPS donde se generó la alerta
        acked_by: Usuario que reconoció la alerta
        closed_by: Usuario que cerró la alerta
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    # Opciones para el tipo de alerta
    ALERT_TYPES = [
        ('SOS', 'SOS Emergencia'),
        ('MAN_DOWN', 'Operativo Caído'),
        ('LOST', 'Operativo Perdido/Desorientado'),
        ('GEOFENCE', 'Fuera de Zona Segura'),
        ('ANOMALY', 'Anomalía Detectada'),
        ('OTHER', 'Otro'),
    ]

    # Opciones para el estado de la alerta
    STATUS_CHOICES = [
        ('OPEN', 'Abierta'),
        ('ACK', 'Reconocida'),
        ('CLOSED', 'Cerrada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True,
        help_text="Incidente relacionado con esta alerta (opcional)"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_alerts',
        help_text="Usuario que generó esta alerta"
    )

    alert_type = models.CharField(
        max_length=20,
        choices=ALERT_TYPES,
        help_text="Tipo de emergencia reportada"
    )
    severity = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        default=3,
        help_text="Nivel de gravedad: 1=Crítico, 5=Informativo"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='OPEN',
        help_text="Estado actual de la alerta"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    # Campo de ubicación geográfica usando GeoDjango
    location = gis_models.PointField(
        srid=4326,
        help_text="Ubicación GPS donde se generó la alerta (WGS84)"
    )

    # Campos para gestión de la alerta
    acked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acked_alerts',
        help_text="Usuario que reconoció la alerta"
    )
    acked_at = models.DateTimeField(null=True, blank=True)
    ack_notes = models.TextField(blank=True, null=True)

    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_alerts',
        help_text="Usuario que cerró la alerta"
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    close_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alertas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['incident', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['alert_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        """Representación en string de la alerta."""
        return f"[{self.get_alert_type_display()}] {self.title}"
