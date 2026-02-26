from django.db import models
import uuid
from django.contrib.gis.db import models as gis_models


class RiskReport(models.Model):
    """
    Reporte de zona de riesgo observado por operativos o supervisores.
    
    Diferencia con Alert:
    - Alert = Emergencia urgente (SOS, man down)
    - RiskReport = Observación de peligro (humo, ramas, zona insegura)
    """

    SEVERITY_CHOICES = [
        ('LOW', 'Bajo'),
        ('MEDIUM', 'Medio'),
        ('HIGH', 'Alto'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        'Incidente',
        on_delete=models.CASCADE,
        related_name='risk_reports',
        help_text="Incidente al que pertenece el reporte"
    )
    reported_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='risk_reports',
        help_text="Usuario que reporta el riesgo"
    )
    location = gis_models.PointField(
        srid=4326,
        help_text="Ubicación del riesgo (coordenadas GPS)"
    )
    description = models.TextField(
        help_text="Descripción del riesgo observado"
    )
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='MEDIUM',
        help_text="Nivel de severidad del riesgo"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Si el reporte sigue vigente"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha de creación del reporte"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Última actualización"
    )

    class Meta:
        db_table = 'risk_reports'
        ordering = ['-created_at']
        verbose_name = 'Reporte de Riesgo'
        verbose_name_plural = 'Reportes de Riesgo'

    def __str__(self):
        return f"RiskReport {self.severity} - {self.incident.name}"
