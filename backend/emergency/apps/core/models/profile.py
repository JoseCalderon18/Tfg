from django.db import models
import uuid

from .user import User
from .organization import Organizacion


class Perfil(models.Model):
    """
    Modelo de Perfil extendido de Usuario.

    Almacena información adicional del usuario que no está en el modelo
    base User, como rol, organización, contacto de emergencia, etc.

    Se relaciona 1 a 1 con el modelo User mediante OneToOneField.

    Attributes:
        id: UUID único del perfil
        user: Usuario al que pertenece este perfil (relación 1 a 1)
        role: Rol del usuario (ADMIN, SUPERVISOR, OPERATIVE)
        organization: Organización a la que pertenece
        emergency_contact: Nombre del contacto de emergencia
        emergency_phone: Teléfono del contacto de emergencia
        medical_notes: Notas médicas relevantes
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
    """

    # Opciones para el rol del usuario
    ROLES = [
        ('ADMIN', 'Administrador'),
        ('SUPERVISOR', 'Supervisor'),
        ('OPERATIVE', 'Operativo'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        help_text="Usuario al que pertenece este perfil"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLES,
        default='OPERATIVE',
        help_text="Rol del usuario en el sistema"
    )
    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members',
        help_text="Organización a la que pertenece el usuario"
    )
    emergency_contact = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Nombre del contacto de emergencia"
    )
    emergency_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Teléfono del contacto de emergencia"
    )
    medical_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Información médica relevante (alergias, condiciones, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profiles'
        verbose_name = 'Perfil'
        verbose_name_plural = 'Perfiles'

    def __str__(self):
        """Representación en string del perfil."""
        return f"{self.user.username} - {self.get_role_display()}"

    @property
    def is_admin(self):
        """Propiedad que indica si el usuario es administrador."""
        return self.role == 'ADMIN'

    @property
    def is_supervisor(self):
        """Propiedad que indica si el usuario es supervisor."""
        return self.role == 'SUPERVISOR'

    @property
    def is_operative(self):
        """Propiedad que indica si el usuario es operativo."""
        return self.role == 'OPERATIVE'
