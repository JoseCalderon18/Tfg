from django.db import models
import uuid

from .device import Dispositivo
from .organization import Organizacion
from .user import User


class Perfil(models.Model):
    """
    Modelo de Perfil extendido de Usuario.

    Almacena informacion adicional del usuario que no esta en el modelo
    base User, como rol, organizacion, contacto de emergencia, etc.
    """

    ROLES = [
        ("ADMIN", "Administrador"),
        ("SUPERVISOR", "Supervisor"),
        ("OPERATIVE", "Operativo"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        help_text="Usuario al que pertenece este perfil",
    )
    role = models.CharField(
        max_length=20,
        choices=ROLES,
        default="OPERATIVE",
        help_text="Rol del usuario en el sistema",
    )
    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        help_text="Organizacion a la que pertenece el usuario",
    )
    emergency_contact = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Nombre del contacto de emergencia",
    )
    emergency_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Telefono del contacto de emergencia",
    )
    medical_notes = models.JSONField(
        default=list,
        blank=True,
        help_text="Informacion medica relevante",
    )
    dni = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Documento nacional de identidad",
    )
    avatar = models.FileField(
        upload_to="avatars/",
        blank=True,
        null=True,
        help_text="Imagen de avatar del usuario",
    )
    language = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Idioma preferido del usuario",
    )
    city = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text="Ciudad del usuario",
    )
    province = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text="Provincia del usuario",
    )
    country = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text="Pais del usuario",
    )
    birth_date = models.DateField(
        blank=True,
        null=True,
        help_text="Fecha de nacimiento del usuario",
    )
    specialties = models.JSONField(
        default=list,
        blank=True,
        help_text="Especialidades operativas del usuario",
    )
    operative_schedule = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Horario operativo del usuario",
    )
    blood_type = models.CharField(
        max_length=5,
        blank=True,
        null=True,
        help_text="Grupo sanguineo",
    )
    device = models.ForeignKey(
        Dispositivo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_profiles",
        help_text="Dispositivo asignado al usuario",
    )
    assigned_supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supervised_profiles",
        help_text="Supervisor asignado al usuario",
    )
    name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Nombre completo del usuario",
    )
    lastname = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Apellido del usuario",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        verbose_name = "Perfil"
        verbose_name_plural = "Perfiles"

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    @property
    def is_admin(self):
        return self.role == "ADMIN"

    @property
    def is_supervisor(self):
        return self.role == "SUPERVISOR"

    @property
    def is_operative(self):
        return self.role == "OPERATIVE"
