from django.db import models
import uuid

from .user import User


class Device(models.Model):
    """
    Modelo de Dispositivo Móvil para notificaciones push.

    Almacena los tokens de Firebase Cloud Messaging (FCM) para enviar
    notificaciones push a los dispositivos de los usuarios.

    Attributes:
        id: UUID único del dispositivo
        user: Usuario propietario del dispositivo
        fcm_token: Token de Firebase Cloud Messaging
        device_name: Nombre descriptivo del dispositivo
        platform: Plataforma (iOS, Android, Web)
        is_active: Indica si el dispositivo está activo
        last_used: Última vez que se usó
        created_at: Fecha de registro
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='devices',
        help_text="Usuario al que pertenece este dispositivo"
    )
    fcm_token = models.TextField(
        help_text="Token de Firebase Cloud Messaging para notificaciones push"
    )
    device_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nombre descriptivo del dispositivo (ej: 'iPhone de Juan')"
    )
    platform = models.CharField(
        max_length=20,
        choices=[
            ('IOS', 'iOS'),
            ('ANDROID', 'Android'),
            ('WEB', 'Web'),
        ],
        help_text="Plataforma del dispositivo"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el dispositivo puede recibir notificaciones"
    )
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'devices'
        unique_together = ['user', 'fcm_token']
        verbose_name = 'Dispositivo'
        verbose_name_plural = 'Dispositivos'

    def __str__(self):
        """Representación en string del dispositivo."""
        return f"{self.device_name or 'Dispositivo'} ({self.user.username})"
