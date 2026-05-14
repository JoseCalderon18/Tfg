from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from emergency.apps.core.models import IncidentMember, IncidentMessage, Alerta
from .push_notifications import send_sos_push_notifications


@dataclass(frozen=True)
class AlertDispatchResult:
    incident_id: str | None
    incident_message_id: str | None
    message_created: bool
    push_enabled: bool = False
    central_targets: int = 0
    team_targets: int = 0
    central_sent: bool = False
    team_sent: bool = False
    error: str | None = None


def _find_active_incident_for_user(user):
    if not getattr(user, "is_authenticated", False):
        return None

    membership = (
        IncidentMember.objects.select_related("incident")
        .filter(user=user, is_active=True, incident__status="OPEN")
        .order_by("-joined_at")
        .first()
    )
    return membership.incident if membership else None


def dispatch_sos_alert(alert: Alerta) -> AlertDispatchResult:
    incident = alert.incident or _find_active_incident_for_user(alert.created_by)

    if incident is None or alert.alert_type != "SOS":
        return AlertDispatchResult(
            incident_id=str(alert.incident_id) if alert.incident_id else None,
            incident_message_id=None,
            message_created=False,
        )

    message_content = (
        f"🆘 SOS de {alert.created_by.get_full_name() or alert.created_by.username}: "
        f"{alert.title}"
    )

    with transaction.atomic():
        if alert.incident_id != incident.id:
            alert.incident = incident
            alert.save(update_fields=["incident", "updated_at"])

        profile = getattr(alert.created_by, "profile", None)
        incident_message = IncidentMessage.objects.create(
            incident=incident,
            profile=profile,
            content=message_content,
        )

    push_summary = send_sos_push_notifications(alert)

    return AlertDispatchResult(
        incident_id=str(incident.id),
        incident_message_id=str(incident_message.id),
        message_created=True,
        push_enabled=push_summary.push_enabled,
        central_targets=push_summary.central_targets,
        team_targets=push_summary.team_targets,
        central_sent=push_summary.central_sent,
        team_sent=push_summary.team_sent,
        error=push_summary.error,
    )