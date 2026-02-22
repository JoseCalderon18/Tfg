from django.contrib.gis.db import models as gis_models
from django.db import models
from .incident import Incident


class WorkArea(models.Model):

    AREA_TYPE = [
        ('CIRCLE', 'Circle'),
        ('POLYGON', 'Polygon'),
    ]

    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name="work_areas"
    )

    name = models.CharField(max_length=100)

    area_type = models.CharField(
        max_length=10,
        choices=AREA_TYPE
    )

    # Para círculos
    center = gis_models.PointField(null=True, blank=True)
    radius_m = models.FloatField(null=True, blank=True)

    # Para polígonos
    polygon = gis_models.PolygonField(null=True, blank=True)

    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.incident}"