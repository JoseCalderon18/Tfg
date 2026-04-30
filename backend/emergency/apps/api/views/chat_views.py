import json
import uuid

from django.db import connection
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .auth_views import _has_panel_full_access
from emergency.apps.core.models import Incidente, IncidentMessage
from ..serializers import IncidentMessageSerializer


def _fetch_all_dict(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _extract_members(profile_payload):
    if isinstance(profile_payload, dict):
        raw_members = profile_payload.get("members", [])
        if isinstance(raw_members, list):
            return [str(member).strip() for member in raw_members if str(member).strip()]
    return []


def _extract_chat_ref(profile_payload, fallback=None):
    if isinstance(profile_payload, dict):
        chat_uuid = profile_payload.get("chat_uuid")
        if isinstance(chat_uuid, str) and chat_uuid.strip():
            return chat_uuid.strip()
    return fallback


def _serialize_chat_row(row):
    profile_payload = row.get("profile_id")
    members = _extract_members(profile_payload)
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "created_at": row.get("created_at"),
        "profile_created": row.get("profile_created"),
        "chat_ref": _extract_chat_ref(profile_payload, row.get("chat_ref")),
        "members": members,
    }


def _normalize_member_ids(profile_ids, owner_profile_id):
    unique_members = []
    seen = set()

    for candidate in [owner_profile_id, *profile_ids]:
        text = str(candidate).strip() if candidate is not None else ""
        if not text or text in seen:
            continue
        seen.add(text)
        unique_members.append(text)

    return unique_members


def _get_chat_row_by_ref(chat_ref):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                id,
                name,
                created_at,
                profile_created::text AS profile_created,
                profile_id,
                profile_id ->> 'chat_uuid' AS chat_ref
            FROM chats
            WHERE profile_id ->> 'chat_uuid' = %s
            LIMIT 1
            """,
            [chat_ref],
        )
        rows = _fetch_all_dict(cursor)

    return rows[0] if rows else None


class PanelChatsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para acceder a los chats."}, status=status.HTTP_403_FORBIDDEN)

        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    created_at,
                    profile_created::text AS profile_created,
                    profile_id,
                    profile_id ->> 'chat_uuid' AS chat_ref
                FROM chats
                WHERE
                    profile_created::text = %s
                    OR EXISTS (
                        SELECT 1
                        FROM json_array_elements_text(
                            CASE
                                WHEN json_typeof(profile_id -> 'members') = 'array' THEN profile_id -> 'members'
                                ELSE '[]'::json
                            END
                        ) AS member(profile_member_id)
                        WHERE member.profile_member_id = %s
                    )
                ORDER BY created_at DESC NULLS LAST, id DESC
                """,
                [str(profile.id), str(profile.id)],
            )
            rows = _fetch_all_dict(cursor)

        return Response([_serialize_chat_row(row) for row in rows], status=status.HTTP_200_OK)

    def post(self, request):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para crear chats."}, status=status.HTTP_403_FORBIDDEN)

        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        name = str(request.data.get("name", "")).strip()
        if not name:
            return Response({"name": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

        chat_ref = str(uuid.uuid4())
        profile_payload = json.dumps(
            {
                "chat_uuid": chat_ref,
                "members": [str(profile.id)],
            }
        )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO chats (name, profile_created, profile_id, active)
                VALUES (%s, %s, %s::json, %s)
                RETURNING
                    id,
                    name,
                    created_at,
                    profile_created::text AS profile_created,
                    profile_id,
                    profile_id ->> 'chat_uuid' AS chat_ref
                """,
                [name, str(profile.id), profile_payload, 1],
            )
            row = cursor.fetchone()
            columns = [column[0] for column in cursor.description]

        return Response(_serialize_chat_row(dict(zip(columns, row))), status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class PanelChatMembersView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    def patch(self, request, chat_pk):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para actualizar miembros del chat."}, status=status.HTTP_403_FORBIDDEN)

        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        raw_profile_ids = request.data.get("profile_ids", [])
        if not isinstance(raw_profile_ids, list):
            return Response({"profile_ids": ["Debes enviar una lista de profile_id."]}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    created_at,
                    profile_created::text AS profile_created,
                    profile_id,
                    profile_id ->> 'chat_uuid' AS chat_ref
                FROM chats
                WHERE id = %s
                LIMIT 1
                """,
                [chat_pk],
            )
            rows = _fetch_all_dict(cursor)

        if not rows:
            return Response({"detail": "Chat no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        current_chat = rows[0]
        chat_ref = _extract_chat_ref(current_chat.get("profile_id"), current_chat.get("chat_ref"))
        if not chat_ref:
            return Response({"detail": "El chat no tiene una referencia UUID valida."}, status=status.HTTP_400_BAD_REQUEST)

        normalized_members = _normalize_member_ids(raw_profile_ids, str(profile.id))
        next_payload = json.dumps(
            {
                "chat_uuid": chat_ref,
                "members": normalized_members,
            }
        )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE chats
                SET profile_id = %s::json
                WHERE id = %s
                RETURNING
                    id,
                    name,
                    created_at,
                    profile_created::text AS profile_created,
                    profile_id,
                    profile_id ->> 'chat_uuid' AS chat_ref
                """,
                [next_payload, chat_pk],
            )
            row = cursor.fetchone()
            columns = [column[0] for column in cursor.description]

        return Response(_serialize_chat_row(dict(zip(columns, row))), status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class PanelChatMessagesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    def get(self, request, chat_id):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para acceder a los mensajes."}, status=status.HTTP_403_FORBIDDEN)

        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            chat_uuid = str(uuid.UUID(chat_id))
        except ValueError:
            return Response([], status=status.HTTP_200_OK)

        chat_row = _get_chat_row_by_ref(chat_uuid)
        if not chat_row:
            return Response([], status=status.HTTP_200_OK)

        allowed_members = _normalize_member_ids(_extract_members(chat_row.get("profile_id")), chat_row.get("profile_created"))
        if str(profile.id) not in allowed_members:
            return Response({"detail": "No tienes acceso a este chat."}, status=status.HTTP_403_FORBIDDEN)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    m.id::text AS id,
                    m.content,
                    m.created_at,
                    m.profile_id::text AS profile_id,
                    m.chat_id::text AS chat_id,
                    m.incident_id::text AS incident_id,
                    COALESCE(u.username, u.email, 'Perfil desconocido') AS author_name
                FROM incident_messages m
                LEFT JOIN profiles p ON p.id = m.profile_id
                LEFT JOIN users u ON u.id = p.user_id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC, m.id ASC
                """,
                [chat_uuid],
            )
            rows = _fetch_all_dict(cursor)

        return Response(rows, status=status.HTTP_200_OK)

    def post(self, request, chat_id):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para enviar mensajes."}, status=status.HTTP_403_FORBIDDEN)

        try:
            chat_uuid = str(uuid.UUID(chat_id))
        except ValueError:
            return Response({"detail": "El chat seleccionado no tiene una referencia UUID valida."}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        chat_row = _get_chat_row_by_ref(chat_uuid)
        if not chat_row:
            return Response({"detail": "Chat no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        allowed_members = _normalize_member_ids(_extract_members(chat_row.get("profile_id")), chat_row.get("profile_created"))
        if str(profile.id) not in allowed_members:
            return Response({"detail": "No tienes acceso a este chat."}, status=status.HTTP_403_FORBIDDEN)

        content = str(request.data.get("content", "")).strip()
        if not content:
            return Response({"content": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

        message_id = str(uuid.uuid4())
        author_id = str(request.user.id)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO incident_messages (id, content, author_id, incident_id, profile_id, chat_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id::text, content, created_at, profile_id::text, chat_id::text, incident_id::text
                """,
                [message_id, content, author_id, None, str(profile.id), chat_uuid],
            )
            row = cursor.fetchone()

        created = {
            "id": row[0],
            "content": row[1],
            "created_at": row[2],
            "profile_id": row[3],
            "chat_id": row[4],
            "incident_id": row[5],
            "author_name": getattr(request.user, "username", "") or getattr(request.user, "email", "") or "Tu",
        }
        return Response(created, status=status.HTTP_201_CREATED)


def _get_request_profile(request):
    profile = getattr(request.user, "profile", None)
    if profile is None:
        return None
    return profile


def _get_mobile_general_chats(profile):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                id,
                name,
                created_at,
                profile_created::text AS profile_created,
                profile_id,
                profile_id ->> 'chat_uuid' AS chat_ref
            FROM chats
            WHERE
                profile_created::text = %s
                OR EXISTS (
                    SELECT 1
                    FROM json_array_elements_text(
                        CASE
                            WHEN json_typeof(profile_id -> 'members') = 'array' THEN profile_id -> 'members'
                            ELSE '[]'::json
                        END
                    ) AS member(profile_member_id)
                    WHERE member.profile_member_id = %s
                )
            ORDER BY created_at DESC NULLS LAST, id DESC
            """,
            [str(profile.id), str(profile.id)],
        )
        rows = _fetch_all_dict(cursor)

    chats = []
    for row in rows:
        serialized = _serialize_chat_row(row)
        chat_ref = serialized.get("chat_ref")
        if not chat_ref:
            continue
        chats.append(
            {
                "id": f"general:{chat_ref}",
                "kind": "general",
                "chat_ref": chat_ref,
                "name": serialized.get("name") or "Chat",
                "created_at": serialized.get("created_at"),
                "members": serialized.get("members", []),
            }
        )

    return chats


def _get_mobile_incident_chats(profile):
    if not profile.organization_id:
        return []

    incidents = (
        Incidente.objects.filter(owner_organization_id=profile.organization_id)
        .order_by("-created_at")
        .values("id", "name", "status", "created_at", "started_at")
    )

    return [
        {
            "id": f"incident:{incident['id']}",
            "kind": "incident",
            "incident_id": str(incident["id"]),
            "name": f"Incidente: {incident['name']}",
            "status": incident["status"],
            "created_at": incident["started_at"] or incident["created_at"],
            "members": [],
        }
        for incident in incidents
    ]


def _can_access_mobile_general_chat(profile, chat_ref):
    chat_row = _get_chat_row_by_ref(chat_ref)
    if not chat_row:
        return None

    allowed_members = _normalize_member_ids(_extract_members(chat_row.get("profile_id")), chat_row.get("profile_created"))
    if str(profile.id) not in allowed_members:
        return None

    return chat_row


def _get_mobile_incident(profile, incident_id):
    if not profile.organization_id:
        return None

    try:
        return Incidente.objects.get(id=incident_id, owner_organization_id=profile.organization_id)
    except Incidente.DoesNotExist:
        return None


class MobileChatsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]

    def get(self, request):
        profile = _get_request_profile(request)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        chats = [
            *_get_mobile_general_chats(profile),
            *_get_mobile_incident_chats(profile),
        ]
        chats.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)

        return Response(chats, status=status.HTTP_200_OK)


class MobileChatMessagesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]

    def get(self, request, chat_kind, chat_id):
        profile = _get_request_profile(request)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        if chat_kind == "general":
            try:
                chat_ref = str(uuid.UUID(chat_id))
            except ValueError:
                return Response({"detail": "Chat no valido."}, status=status.HTTP_400_BAD_REQUEST)

            if _can_access_mobile_general_chat(profile, chat_ref) is None:
                return Response({"detail": "No tienes acceso a este chat."}, status=status.HTTP_403_FORBIDDEN)

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        m.id::text AS id,
                        m.content,
                        m.created_at,
                        m.profile_id::text AS profile_id,
                        m.chat_id::text AS chat_id,
                        m.incident_id::text AS incident_id,
                        COALESCE(u.username, u.email, 'Perfil desconocido') AS author_name
                    FROM incident_messages m
                    LEFT JOIN profiles p ON p.id = m.profile_id
                    LEFT JOIN users u ON u.id = p.user_id
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC, m.id ASC
                    """,
                    [chat_ref],
                )
                rows = _fetch_all_dict(cursor)

            return Response(rows, status=status.HTTP_200_OK)

        if chat_kind == "incident":
            incident = _get_mobile_incident(profile, chat_id)
            if incident is None:
                return Response({"detail": "No tienes acceso a este incidente."}, status=status.HTTP_403_FORBIDDEN)

            messages = (
                IncidentMessage.objects.filter(incident=incident)
                .select_related("profile", "profile__user")
                .order_by("created_at")
            )
            return Response(IncidentMessageSerializer(messages, many=True).data, status=status.HTTP_200_OK)

        return Response({"detail": "Tipo de chat no valido."}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, chat_kind, chat_id):
        profile = _get_request_profile(request)
        if profile is None:
            return Response({"detail": "El usuario autenticado no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)

        content = str(request.data.get("content", "")).strip()
        if not content:
            return Response({"content": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

        if chat_kind == "general":
            try:
                chat_ref = str(uuid.UUID(chat_id))
            except ValueError:
                return Response({"detail": "Chat no valido."}, status=status.HTTP_400_BAD_REQUEST)

            if _can_access_mobile_general_chat(profile, chat_ref) is None:
                return Response({"detail": "No tienes acceso a este chat."}, status=status.HTTP_403_FORBIDDEN)

            message_id = str(uuid.uuid4())
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO incident_messages (id, content, author_id, incident_id, profile_id, chat_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id::text, content, created_at, profile_id::text, chat_id::text, incident_id::text
                    """,
                    [message_id, content, str(request.user.id), None, str(profile.id), chat_ref],
                )
                row = cursor.fetchone()

            return Response(
                {
                    "id": row[0],
                    "content": row[1],
                    "created_at": row[2],
                    "profile_id": row[3],
                    "chat_id": row[4],
                    "incident_id": row[5],
                    "author_name": getattr(request.user, "username", "") or getattr(request.user, "email", "") or "Tu",
                },
                status=status.HTTP_201_CREATED,
            )

        if chat_kind == "incident":
            incident = _get_mobile_incident(profile, chat_id)
            if incident is None:
                return Response({"detail": "No tienes acceso a este incidente."}, status=status.HTTP_403_FORBIDDEN)

            message = IncidentMessage.objects.create(
                incident=incident,
                profile=profile,
                content=content,
            )
            return Response(IncidentMessageSerializer(message).data, status=status.HTTP_201_CREATED)

        return Response({"detail": "Tipo de chat no valido."}, status=status.HTTP_400_BAD_REQUEST)
