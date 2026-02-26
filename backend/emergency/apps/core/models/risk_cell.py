from django.contrib.gis.db import models as gis_models
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

from .incident import Incidente as Incident


class CeldaRiesgo(models.Model):
    """
    Modelo de Celda de Heatmap para Análisis de Riesgo.

    Representa un área geográfica (polígono) dentro de un incidente
    donde se analiza el nivel de riesgo basado en la actividad de
    trackpoints y alertas.

    Attributes:
        id: UUID único de la celda
        incident: Incidente al que pertenece
        cell: Polígono geográfico que define el área
        trackpoint_count: Número de puntos de rastreo en la celda
        alert_count: Número de alertas en la celda
        risk_score: Puntuación de riesgo (0-100)
        last_activity: Última vez que hubo actividad
        calculated_at: Momento del cálculo
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='risk_cells',
        help_text="Incidente al que pertenece esta celda de riesgo"
    )

    # Celda como polígono geográfico
    cell = gis_models.PolygonField(
        srid=4326,
        help_text="Área geográfica representada como polígono"
    )

    # Métricas de riesgo
    trackpoint_count = models.IntegerField(
        default=0,
        help_text="Número de puntos de tracking en esta celda"
    )
    alert_count = models.IntegerField(
        default=0,
        help_text="Número de alertas en esta celda"
    )
    risk_score = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        help_text="Puntuación de riesgo entre 0 y 100"
    )

    # Análisis temporal
    last_activity = models.DateTimeField(
        help_text="Última vez que se registró actividad en esta celda"
    )
    calculated_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Momento en que se calculó el riesgo"
    )

    class Meta:
        db_table = 'celdas_riesgo'
        ordering = ['-risk_score']
        indexes = [
            models.Index(fields=['incident', 'risk_score']),
            models.Index(fields=['risk_score']),
        ]
        verbose_name = 'Celda de riesgo'
        verbose_name_plural = 'Celdas de riesgo'

    def __str__(self):
        """Representación en string de la celda de riesgo."""
        return f"RiskCell {self.incident.name} - Score: {self.risk_score}"
