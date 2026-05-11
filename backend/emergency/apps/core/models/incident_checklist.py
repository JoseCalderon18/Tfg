from django.db import models

from .incident import Incidente as Incident
from .profile import Perfil as Profile


class IncidentChecklist(models.Model):
    """Checklist operativo asociado a un incidente existente."""

    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    checklist = models.TextField()
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="incident_checklist_items",
        db_column="user_id",
    )
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name="checklist_items",
        db_column="incident_id",
    )
    is_completed = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "incident_checklist"
        managed = False
        ordering = ["created_at", "id"]

    def __str__(self):
        return self.checklist
