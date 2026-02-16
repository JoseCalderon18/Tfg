from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    """
    Modelo de Usuario base del sistema.

    Extiende AbstractUser de Django para usar autenticación nativa
    pero con campos personalizados como UUID, teléfono, etc.

    Attributes:
        id: Identificador único UUID (no autoincremental)
        email: Correo electrónico único requerido
        phone: Número de teléfono opcional
        is_active: Indica si el usuario está activo
        created_at: Fecha de creación del usuario
        updated_at: Fecha de última actualización
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        """Representación en string del usuario."""
        return f"{self.username} ({self.email})"
