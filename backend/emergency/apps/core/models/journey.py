from django.contrib.gis.db import models as gis_models
from django.db import models

from .user import User


class Journey(models.Model):
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField()
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="journeys",
        db_column="user_id",
        db_constraint=False,
    )
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    location_start = gis_models.PointField(srid=4326, null=True, blank=True)
    location_stop = gis_models.PointField(srid=4326, null=True, blank=True)
    notes = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "journey"
        managed = False
        ordering = ["-created_at"]
        verbose_name = "Journey"
        verbose_name_plural = "Journeys"

    def __str__(self):
        return f"Journey #{self.id} - {self.user_id}"
