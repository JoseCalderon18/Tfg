import uuid

from django.contrib.gis.db import models as gis_models
from django.db import models


class PointOfInterest(models.Model):
    """
    Punto de interes operativo registrado por usuarios del sistema.

    Permite almacenar elementos utiles sobre el terreno como hidrantes,
    cortafuegos, puntos de vigilancia o vias de evacuacion.
    """

    POI_TYPES = [
        ("HYDRANT", "Hidrante"),
        ("SETTLEMENT", "Asentamiento"),
        ("FIREBREAK", "Cortafuegos"),
        ("WATCHPOINT", "Punto de vigilancia"),
        ("BASE_STATION", "Estacion base"),
        ("EVAC_ROUTE", "Via de evacuacion"),
        ("OTHER", "Otro"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    poi_type = models.CharField(max_length=50, choices=POI_TYPES)
    description = models.TextField(null=True, blank=True)
    location = gis_models.PointField(srid=4326)
    incident = models.ForeignKey(
        "Incidente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="points_of_interest",
        db_column="incident_id",
        db_constraint=False,
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="points_of_interest",
        db_column="created_by_id",
        db_constraint=False,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=models.functions.Now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "points_of_interest"
        managed = False
        ordering = ["-created_at"]
        verbose_name = "Punto de interes"
        verbose_name_plural = "Puntos de interes"

    def __str__(self):
        return self.name
