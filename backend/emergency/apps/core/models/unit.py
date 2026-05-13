from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

from .user import User
from .organization import Organizacion


class Unidad(models.Model):
    """
    Modelo de Unidad/Vehículo.

    Representa un vehículo o recurso de la organización que puede ser
    asignado a incidentes y cuyo estado y consumo se rastrea.

    Attributes:
        id: UUID único de la unidad
        organization: Organización propietaria
        name: Nombre/identificador de la unidad (Ej: "Ambulancia 01")
        type: Tipo de unidad (ambulancia, bomberos, policía, etc.)
        vehicle_id: Identificador del vehículo (placa, número de chasis, etc.)
        status: Estado actual (available, en_viaje, en_mantenimiento, offline)
        driver: Usuario conductor actual (opcional)
        current_location: Última ubicación GPS conocida
        fuel_level: Nivel de combustible (0-100%)
        battery_level: Nivel de batería dispositivo (0-100%)
        total_mileage: Kilómetros totales recorridos
        is_active: Indica si la unidad está en servicio
        created_at: Fecha de creación
        updated_at: Última actualización
    """
    
    UNIT_TYPE_CHOICES = [
        ('AMBULANCIA', 'Ambulancia'),
        ('BOMBEROS', 'Bomberos'),
        ('POLICIA', 'Policía'),
        ('RESCATE', 'Rescate'),
        ('PATRULLA', 'Patrulla'),
        ('OTRO', 'Otro'),
    ]
    
    STATUS_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_VIAJE', 'En viaje'),
        ('EN_MANTENIMIENTO', 'En mantenimiento'),
        ('OFFLINE', 'Offline'),
        ('CARGANDO', 'Cargando'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='units',
        help_text="Organización propietaria de la unidad"
    )
    
    # Información básica
    name = models.CharField(
        max_length=100,
        help_text="Nombre/identificador (Ej: 'Ambulancia 01')"
    )
    type = models.CharField(
        max_length=50,
        choices=UNIT_TYPE_CHOICES,
        help_text="Tipo de unidad"
    )
    vehicle_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Identificador único (placa, número de chasis, etc.)"
    )
    
    # Estado actual
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DISPONIBLE',
        help_text="Estado de disponibilidad de la unidad"
    )
    driver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='driven_units',
        help_text="Usuario conductor actual"
    )
    
    # Ubicación
    current_location = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="Última ubicación GPS conocida"
    )
    
    # Consumo
    fuel_level = models.FloatField(
        default=100.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Nivel de combustible (0-100%)"
    )
    battery_level = models.FloatField(
        default=100.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Nivel de batería del dispositivo (0-100%)"
    )
    total_mileage = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Kilómetros totales recorridos"
    )
    
    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si la unidad está en servicio"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'units'
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'type']),
            models.Index(fields=['is_active', 'status']),
        ]
        verbose_name = 'Unidad'
        verbose_name_plural = 'Unidades'
        unique_together = ['organization', 'vehicle_id']
    
    def __str__(self):
        """Representación en string de la unidad."""
        return f"{self.name} ({self.vehicle_id})"
    
    @property
    def consumption_alert(self):
        """Retorna si la unidad necesita atención inmediata."""
        alerts = []
        if self.fuel_level < 20:
            alerts.append('combustible_bajo')
        if self.battery_level < 15:
            alerts.append('bateria_baja')
        return alerts
