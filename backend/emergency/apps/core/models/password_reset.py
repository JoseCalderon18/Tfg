import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class CodigoResetPassword(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="codigos_reset_password",
    )
    email = models.EmailField()
    codigo = models.CharField(max_length=6)
    token_verificado = models.CharField(max_length=128, blank=True, default="")
    intentos_verificacion = models.PositiveSmallIntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    verificado_en = models.DateTimeField(blank=True, null=True)
    usado_en = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "password_reset_codes"
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["email", "codigo"]),
            models.Index(fields=["expira_en"]),
        ]

    def __str__(self):
        return f"Reset password para {self.email} ({self.codigo})"

    @classmethod
    def crear_con_expiracion(cls, **kwargs):
        return cls.objects.create(
            expira_en=timezone.now() + timedelta(minutes=10),
            **kwargs,
        )

    @property
    def esta_expirado(self):
        return timezone.now() >= self.expira_en

    @property
    def ya_usado(self):
        return self.usado_en is not None
