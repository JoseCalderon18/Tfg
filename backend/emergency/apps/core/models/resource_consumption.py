from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
from django.utils import timezone

from .unit import Unidad


class ConsumoRecursos(models.Model):
    """
    Registro de consumo de combustible y batería.

    Almacena los valores históricos de combustible y batería,
    permitiendo análisis de consumo y proyecciones.

    Attributes:
        id: UUID único
        unit: Unidad cuyo consumo se registra
        fuel_level: Nivel de combustible (0-100%)
        battery_level: Nivel de batería dispositivo (0-100%)
        fuel_consumed_since_last: Combustible consumido desde el último registro
        distance_km: Distancia recorrida desde el último registro
        duration_minutes: Duración desde el último registro
        created_at: Momento del registro
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit = models.ForeignKey(
        Unidad,
        on_delete=models.CASCADE,
        related_name='consumption_records',
        help_text="Unidad cuyo consumo se registra"
    )
    
    # Valores actuales
    fuel_level = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Nivel de combustible (0-100%)"
    )
    battery_level = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Nivel de batería del dispositivo (0-100%)"
    )
    
    # Consumo desde el último registro
    fuel_consumed_since_last = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Combustible consumido desde el último registro (%)"
    )
    distance_km = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Distancia recorrida desde el último registro (km)"
    )
    duration_minutes = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Duración desde el último registro (minutos)"
    )
    
    # Timestamp
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'resource_consumption'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['unit', '-created_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Consumo de recursos'
        verbose_name_plural = 'Consumos de recursos'
    
    def __str__(self):
        """Representación en string."""
        return f"{self.unit.name} - Fuel: {self.fuel_level}% Battery: {self.battery_level}%"
    
    @property
    def fuel_consumption_rate(self):
        """Calcula el consumo de combustible por km."""
        if self.distance_km and self.distance_km > 0:
            return self.fuel_consumed_since_last / self.distance_km
        return 0
    
    @property
    def battery_consumption_rate(self):
        """Calcula el consumo de batería por minuto."""
        if self.duration_minutes and self.duration_minutes > 0:
            return self.fuel_consumed_since_last / self.duration_minutes
        return 0
    
    @property
    def estimated_range(self):
        """Estima el alcance (km) con el combustible actual."""
        if self.fuel_consumption_rate and self.fuel_consumption_rate > 0:
            # Asumiendo un tanque de 100%
            return (self.fuel_level / 100) / self.fuel_consumption_rate
        return None
