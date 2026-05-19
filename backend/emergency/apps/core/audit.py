from typing import Optional

from django.contrib.auth.models import AnonymousUser

from emergency.apps.core.models.audit import Auditoria


def registrar_auditoria(usuario: Optional[object], descripcion: str) -> Auditoria:
    usuario_id = None

    if usuario is not None and not isinstance(usuario, AnonymousUser) and getattr(usuario, "is_authenticated", False):
        usuario_id = getattr(usuario, "id", None)

    return Auditoria.objects.create(
        description=descripcion,
        created_id=usuario_id,
    )


def nombre_usuario(usuario: object | None) -> str:
    if usuario is None:
        return "Usuario desconocido"

    username = getattr(usuario, "username", None)
    email = getattr(usuario, "email", None)
    return username or email or str(getattr(usuario, "id", "Usuario desconocido"))
