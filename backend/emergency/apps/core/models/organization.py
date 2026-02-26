from django.db import models
import uuid


class Organizacion(models.Model):
    """
    Modelo de Organización.

    Representa una organización de emergencias como bomberos, policía,
    equipos de rescate o servicios médicos.

    Cada usuario pertenece a una organización y los incidentes están
    asociados a la organización responsable.

    Attributes:
        id: UUID único de la organización
        name: Nombre de la organización
        org_type: Tipo de organización (bomberos, policía, etc.)
        contact_email: Email de contacto
        contact_phone: Teléfono de contacto
        address: Dirección física
        is_active: Indica si la organización está activa
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    # Opciones para el tipo de organización
    ORG_TYPES = [
        ('FIRE_DEPT', 'Cuerpo de Bomberos'),
        ('POLICE', 'Policía'),
        ('RESCUE', 'Equipo de Rescate'),
        ('MEDICAL', 'Servicios Médicos'),
        ('OTHER', 'Otro'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=255,
        help_text="Nombre completo de la organización"
    )
    org_type = models.CharField(
        max_length=20,
        choices=ORG_TYPES,
        default='OTHER',
        help_text="Tipo de organización de emergencias"
    )
    contact_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email de contacto general"
    )
    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Teléfono de contacto general"
    )
    address = models.TextField(
        blank=True,
        null=True,
        help_text="Dirección física de la organización"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si la organización está activa en el sistema"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizaciones'
        ordering = ['name']
        verbose_name = 'Organización'
        verbose_name_plural = 'Organizaciones'

    def __str__(self):
        """Representación en string de la organización."""
        return self.name
