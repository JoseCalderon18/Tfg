from django.contrib.gis.db import models as gis_models
from django.db import models
import uuid

from .incident import Incidente as Incident
from .profile import Perfil as Profile


class IncidentMessage(models.Model):
    """
    Mensaje intercambiado dentro del contexto de un incidente.

    Mapea la tabla externa `message_incident` de Supabase.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name="messages",
        db_column="id_incident",
        null=True,
        blank=True,
        help_text="Incidente al que pertenece el mensaje",
    )
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="incident_messages",
        db_column="id_profile",
        null=True,
        blank=True,
        help_text="Perfil que envio el mensaje",
    )
    content = models.TextField(db_column="text", null=True, blank=True, help_text="Contenido textual del mensaje")
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "message_incident"
        ordering = ["created_at"]
        managed = False

    def __str__(self):
        username = getattr(getattr(self.profile, "user", None), "username", "sin-usuario")
        incident_name = getattr(self.incident, "name", "sin-incidente")
        preview = (self.content or "")[:40]
        return f"{username} en {incident_name}: {preview}"
