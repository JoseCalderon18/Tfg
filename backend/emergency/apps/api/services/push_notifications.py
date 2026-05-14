from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable

from django.conf import settings

from emergency.apps.core.models import Alerta, Dispositivo, IncidentMember


@dataclass(frozen=True)
class PushDispatchSummary:
    central_targets: int
    team_targets: int
    central_sent: bool
    team_sent: bool
    push_enabled: bool
    error: str | None = None


def _load_firebase_admin():
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except Exception:
        return None, None, None

    if firebase_admin._apps:  # type: ignore[attr-defined]
        return firebase_admin, credentials, messaging

    credentials_path = (
        getattr(settings, "FIREBASE_SERVICE_ACCOUNT_FILE", None)
        or getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", None)
        or getattr(settings, "FCM_SERVICE_ACCOUNT_FILE", None)
    )

    if not credentials_path:
        return firebase_admin, credentials, messaging

    firebase_admin.initialize_app(credentials.Certificate(credentials_path))
    return firebase_admin, credentials, messaging


@lru_cache(maxsize=1)
def _firebase_messaging_module():
    _, _, messaging = _load_firebase_admin()
    return messaging


def _unique_tokens(dispositivos: Iterable[Dispositivo]) -> list[str]:
    tokens: list[str] = []
    seen: set[str] = set()

    for device in dispositivos:
        token = str(device.fcm_token or "").strip()
        if not token or token in seen:
            continue
        seen.add(token)
        tokens.append(token)

    return tokens


def _collect_target_tokens(alert: Alerta) -> tuple[list[str], list[str]]:
    incident = alert.incident
    sender_id = alert.created_by_id

    team_user_ids = []
    if incident is not None:
        team_user_ids = list(
            IncidentMember.objects.filter(
                incident=incident,
                is_active=True,
            )
            .exclude(user_id=sender_id)
            .values_list("user_id", flat=True)
        )

    central_user_ids = []
    if incident is not None and incident.owner_organization_id:
        central_user_ids = list(
            alert.created_by.__class__.objects.filter(  # type: ignore[attr-defined]
                is_active=True,
                profile__organization_id=incident.owner_organization_id,
                profile__role__in=["ADMIN", "SUPERVISOR"],
            )
            .exclude(id=sender_id)
            .values_list("id", flat=True)
        )

    team_tokens = _unique_tokens(
        Dispositivo.objects.select_related("user")
        .filter(user_id__in=team_user_ids, is_active=True)
        .order_by("user_id", "created_at")
    )
    central_tokens = _unique_tokens(
        Dispositivo.objects.select_related("user")
        .filter(user_id__in=central_user_ids, is_active=True)
        .order_by("user_id", "created_at")
    )

    return central_tokens, team_tokens


def send_sos_push_notifications(alert: Alerta) -> PushDispatchSummary:
    messaging = _firebase_messaging_module()
    central_tokens, team_tokens = _collect_target_tokens(alert)

    if messaging is None:
        return PushDispatchSummary(
            central_targets=len(central_tokens),
            team_targets=len(team_tokens),
            central_sent=False,
            team_sent=False,
            push_enabled=False,
            error="Firebase Admin no esta disponible en el entorno.",
        )

    central_sent = False
    team_sent = False

    title = f"SOS: {alert.title}"
    body = alert.description or "Nueva alerta critica en curso."
    data = {
        "alert_id": str(alert.id),
        "incident_id": str(alert.incident_id) if alert.incident_id else "",
        "alert_type": alert.alert_type,
        "severity": str(alert.severity),
        "status": alert.status,
        "created_by": str(alert.created_by_id),
    }

    def _send(tokens: list[str], audience: str) -> bool:
        if not tokens:
            return False

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={**data, "audience": audience},
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        return response.success_count > 0

    try:
        central_sent = _send(central_tokens, "central")
        team_sent = _send(team_tokens, "team")
    except Exception as error:
        return PushDispatchSummary(
            central_targets=len(central_tokens),
            team_targets=len(team_tokens),
            central_sent=central_sent,
            team_sent=team_sent,
            push_enabled=True,
            error=str(error),
        )

    return PushDispatchSummary(
        central_targets=len(central_tokens),
        team_targets=len(team_tokens),
        central_sent=central_sent,
        team_sent=team_sent,
        push_enabled=True,
    )