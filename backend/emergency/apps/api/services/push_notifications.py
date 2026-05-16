from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from emergency.apps.core.models import Alerta, Dispositivo, IncidentMember, User


@dataclass(frozen=True)
class PushDispatchSummary:
    central_targets: int
    team_targets: int
    central_sent: bool
    team_sent: bool
    push_enabled: bool
    error: str | None = None


EXPO_PUSH_ENDPOINT = getattr(settings, "EXPO_PUSH_ENDPOINT", "https://exp.host/--/api/v2/push/send")


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


def _chunks(values: list[str], size: int = 100) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]


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
            User.objects.filter(
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


def _build_expo_messages(tokens: list[str], title: str, body: str, data: dict[str, str], audience: str) -> list[dict[str, object]]:
    messages: list[dict[str, object]] = []

    for token in tokens:
        messages.append(
            {
                "to": token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": {**data, "audience": audience},
            }
        )

    return messages


def _send_expo_messages(messages: list[dict[str, object]]) -> tuple[int, int]:
    if not messages:
        return 0, 0

    request = Request(
        EXPO_PUSH_ENDPOINT,
        data=json.dumps(messages).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            response_data = response.read().decode("utf-8")
            payload = json.loads(response_data) if response_data else {}
    except (HTTPError, URLError, TimeoutError) as error:
        return 0, len(messages)

    data = payload.get("data", []) if isinstance(payload, dict) else []
    successes = 0
    failures = 0

    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                failures += 1
                continue
            if item.get("status") == "ok":
                successes += 1
            else:
                failures += 1

    return successes, failures


def send_sos_push_notifications(alert: Alerta) -> PushDispatchSummary:
    central_tokens, team_tokens = _collect_target_tokens(alert)
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

        successes = 0
        failures = 0

        for batch in _chunks(tokens):
            batch_successes, batch_failures = _send_expo_messages(
                _build_expo_messages(batch, title, body, data, audience)
            )
            successes += batch_successes
            failures += batch_failures

        return successes > 0 and failures == 0

    try:
        central_sent = _send(central_tokens, "central")
        team_sent = _send(team_tokens, "team")
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        return PushDispatchSummary(
            central_targets=len(central_tokens),
            team_targets=len(team_tokens),
            central_sent=False,
            team_sent=False,
            push_enabled=False,
            error=str(error),
        )

    return PushDispatchSummary(
        central_targets=len(central_tokens),
        team_targets=len(team_tokens),
        central_sent=central_sent,
        team_sent=team_sent,
        push_enabled=True,
    )