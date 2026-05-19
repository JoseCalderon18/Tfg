from django.db import models
from django.utils import timezone


class Auditoria(models.Model):
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(default=timezone.now)
    description = models.TextField()
    created_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "auditoria"
        managed = False
        ordering = ["-created_at"]

    def __str__(self):
        return self.description
