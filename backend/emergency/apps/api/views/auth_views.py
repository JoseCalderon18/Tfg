import json

from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login, logout as django_logout
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from emergency.apps.core.forms import SupervisorLoginForm
from emergency.apps.core.models import Dispositivo, Organizacion, Profile, User

from ..serializers import ProfileSerializer, UserCreateSerializer, UserSerializer


def _has_panel_full_access(user):
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    profile = getattr(user, "profile", None)
    return bool(profile and profile.role == "SUPERVISOR")


def _normalizar_lista(valor):
    if valor in (None, "", []):
        return []
    if isinstance(valor, list):
        return [str(item).strip() for item in valor if str(item).strip()]
    if isinstance(valor, str):
        texto = valor.strip()
        if not texto:
            return []
        try:
            datos = json.loads(texto)
        except json.JSONDecodeError:
            datos = None
        if isinstance(datos, list):
            return [str(item).strip() for item in datos if str(item).strip()]
        return [linea.strip() for linea in texto.splitlines() if linea.strip()]
    texto = str(valor).strip()
    return [texto] if texto else []


def _normalizar_booleano(valor):
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, str):
        return valor.strip().lower() in {"true", "1", "yes", "si", "on"}
    return bool(valor)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request):
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_protect, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class PanelLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        return Response({"ok": True}, status=status.HTTP_200_OK)

    def post(self, request):
        form = SupervisorLoginForm(request.data)
        if form.is_valid():
            django_login(request, form.user, backend="django.contrib.auth.backends.ModelBackend")
            return Response({"ok": True}, status=status.HTTP_200_OK)
        return Response({"ok": False, "errors": form.errors}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class PanelLogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    def post(self, request):
        django_logout(request)
        return Response({"ok": True}, status=status.HTTP_200_OK)


class PanelMeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False}, status=status.HTTP_401_UNAUTHORIZED)

        profile = getattr(request.user, "profile", None)
        return Response(
            {
                "authenticated": True,
                "id": str(request.user.id),
                "username": getattr(request.user, "username", ""),
                "email": getattr(request.user, "email", ""),
                "role": getattr(profile, "role", None),
                "is_superuser": bool(getattr(request.user, "is_superuser", False)),
                "has_panel_full_access": _has_panel_full_access(request.user),
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class PanelCreateOperativeUserView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    @transaction.atomic
    def post(self, request):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para crear usuarios."}, status=status.HTTP_403_FORBIDDEN)

        payload = dict(request.data)
        payload["role"] = "OPERATIVE"
        payload.pop("organization_id", None)

        serializer = UserCreateSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class PanelUsersListView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para visualizar usuarios."}, status=status.HTTP_403_FORBIDDEN)

        users = (
            User.objects.select_related("profile")
            .order_by("username")
            .values("id", "username", "email", "is_active", "created_at", "profile__role")
        )

        data = [
            {
                "id": str(usuario["id"]),
                "username": usuario["username"],
                "email": usuario["email"],
                "is_active": usuario["is_active"],
                "created_at": usuario["created_at"],
                "role": usuario["profile__role"],
            }
            for usuario in users
        ]
        return Response(data, status=status.HTTP_200_OK)


class PanelUserFormOptionsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        if not _has_panel_full_access(request.user):
            return Response(
                {"detail": "No autorizado para visualizar opciones del formulario."},
                status=status.HTTP_403_FORBIDDEN,
            )

        organizaciones = [
            {"id": str(organizacion.id), "name": organizacion.name}
            for organizacion in Organizacion.objects.order_by("name")
        ]
        supervisores = [
            {
                "id": str(usuario.id),
                "username": usuario.username,
                "display_name": (
                    f"{getattr(usuario.profile, 'name', '')} {getattr(usuario.profile, 'lastname', '')}".strip()
                    or usuario.username
                ),
            }
            for usuario in User.objects.select_related("profile")
            .filter(profile__role="SUPERVISOR", is_active=True)
            .order_by("username")
        ]
        dispositivos = [
            {
                "id": str(dispositivo.id),
                "name": dispositivo.device_name or dispositivo.fcm_token[:32],
                "platform": dispositivo.platform,
                "user_id": str(dispositivo.user_id),
            }
            for dispositivo in Dispositivo.objects.select_related("user").order_by("device_name", "created_at")
        ]

        return Response(
            {
                "organizations": organizaciones,
                "supervisors": supervisores,
                "devices": dispositivos,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class PanelUserDetailView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @staticmethod
    def _serialize_user(user):
        profile = getattr(user, "profile", None)
        avatar = getattr(profile, "avatar", None)
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "first_name": getattr(profile, "name", ""),
            "last_name": getattr(profile, "lastname", ""),
            "phone": user.phone,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "role": getattr(profile, "role", None),
            "emergency_contact": getattr(profile, "emergency_contact", ""),
            "emergency_phone": getattr(profile, "emergency_phone", ""),
            "medical_notes": getattr(profile, "medical_notes", []) or [],
            "organization_id": str(getattr(profile, "organization_id", "") or ""),
            "dni": getattr(profile, "dni", ""),
            "avatar": avatar.url if avatar else "",
            "language": getattr(profile, "language", ""),
            "city": getattr(profile, "city", ""),
            "province": getattr(profile, "province", ""),
            "country": getattr(profile, "country", ""),
            "birth_date": profile.birth_date.isoformat() if getattr(profile, "birth_date", None) else "",
            "specialties": getattr(profile, "specialties", []) or [],
            "operative_schedule": getattr(profile, "operative_schedule", ""),
            "blood_type": getattr(profile, "blood_type", ""),
            "device_id": str(getattr(profile, "device_id", "") or ""),
            "assigned_supervisor_id": str(getattr(profile, "assigned_supervisor_id", "") or ""),
        }

    @staticmethod
    def _ensure_supervisor(request):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para editar usuarios."}, status=status.HTTP_403_FORBIDDEN)
        return None

    def get(self, request, user_id):
        unauthorized = self._ensure_supervisor(request)
        if unauthorized:
            return unauthorized

        user = User.objects.select_related("profile").filter(id=user_id).first()
        if not user:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        return Response(self._serialize_user(user), status=status.HTTP_200_OK)

    @transaction.atomic
    def patch(self, request, user_id):
        unauthorized = self._ensure_supervisor(request)
        if unauthorized:
            return unauthorized

        user = User.objects.select_related("profile").filter(id=user_id).first()
        if not user:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data
        role_choices = {choice[0] for choice in Profile.ROLES}

        if "username" in payload:
            username = str(payload.get("username", "")).strip()
            if not username:
                return Response({"username": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
            exists = User.objects.exclude(id=user.id).filter(username=username).exists()
            if exists:
                return Response({"username": ["Este username ya existe."]}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username

        if "email" in payload:
            email = str(payload.get("email", "")).strip()
            if not email:
                return Response({"email": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
            exists = User.objects.exclude(id=user.id).filter(email=email).exists()
            if exists:
                return Response({"email": ["Este email ya existe."]}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email

        profile = getattr(user, "profile", None)
        if profile is None:
            profile = Profile.objects.create(user=user)

        profile_updated_fields = []

        if "first_name" in payload:
            profile.name = str(payload.get("first_name", "")).strip()
            profile_updated_fields.append("name")

        if "last_name" in payload:
            profile.lastname = str(payload.get("last_name", "")).strip()
            profile_updated_fields.append("lastname")

        if "phone" in payload:
            user.phone = str(payload.get("phone", "")).strip()

        if "is_active" in payload:
            user.is_active = _normalizar_booleano(payload.get("is_active"))

        if "emergency_contact" in payload:
            profile.emergency_contact = str(payload.get("emergency_contact", "")).strip()
            profile_updated_fields.append("emergency_contact")

        if "emergency_phone" in payload:
            profile.emergency_phone = str(payload.get("emergency_phone", "")).strip()
            profile_updated_fields.append("emergency_phone")

        if "medical_notes" in payload:
            profile.medical_notes = _normalizar_lista(payload.get("medical_notes"))
            profile_updated_fields.append("medical_notes")

        if "organization_id" in payload:
            organization_id = str(payload.get("organization_id", "")).strip()
            if organization_id:
                organization = Organizacion.objects.filter(id=organization_id).first()
                if organization is None:
                    return Response(
                        {"organization_id": ["Organizacion no valida."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                profile.organization = organization
            else:
                profile.organization = None
            profile_updated_fields.append("organization")

        if "dni" in payload:
            profile.dni = str(payload.get("dni", "")).strip()
            profile_updated_fields.append("dni")

        if "avatar" in payload:
            avatar = payload.get("avatar")
            if avatar:
                profile.avatar = avatar
                profile_updated_fields.append("avatar")

        if "language" in payload:
            profile.language = str(payload.get("language", "")).strip()
            profile_updated_fields.append("language")

        if "city" in payload:
            profile.city = str(payload.get("city", "")).strip()
            profile_updated_fields.append("city")

        if "province" in payload:
            profile.province = str(payload.get("province", "")).strip()
            profile_updated_fields.append("province")

        if "country" in payload:
            profile.country = str(payload.get("country", "")).strip()
            profile_updated_fields.append("country")

        if "birth_date" in payload:
            birth_date = str(payload.get("birth_date", "")).strip()
            profile.birth_date = birth_date or None
            profile_updated_fields.append("birth_date")

        if "specialties" in payload:
            profile.specialties = _normalizar_lista(payload.get("specialties"))
            profile_updated_fields.append("specialties")

        if "operative_schedule" in payload:
            profile.operative_schedule = str(payload.get("operative_schedule", "")).strip()
            profile_updated_fields.append("operative_schedule")

        if "blood_type" in payload:
            profile.blood_type = str(payload.get("blood_type", "")).strip()
            profile_updated_fields.append("blood_type")

        if "device_id" in payload:
            device_id = str(payload.get("device_id", "")).strip()
            if device_id:
                device = Dispositivo.objects.filter(id=device_id).first()
                if device is None:
                    return Response({"device_id": ["Dispositivo no valido."]}, status=status.HTTP_400_BAD_REQUEST)
                profile.device = device
                if device.user_id != user.id:
                    device.user = user
                    device.save(update_fields=["user"])
            else:
                profile.device = None
            profile_updated_fields.append("device")

        if "assigned_supervisor_id" in payload:
            assigned_supervisor_id = str(payload.get("assigned_supervisor_id", "")).strip()
            if assigned_supervisor_id:
                supervisor = User.objects.select_related("profile").filter(id=assigned_supervisor_id).first()
                if supervisor is None or not getattr(supervisor, "profile", None) or supervisor.profile.role != "SUPERVISOR":
                    return Response(
                        {"assigned_supervisor_id": ["Supervisor no valido."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                profile.assigned_supervisor = supervisor
            else:
                profile.assigned_supervisor = None
            profile_updated_fields.append("assigned_supervisor")

        user.save()
        if profile_updated_fields:
            profile.save(update_fields=[*dict.fromkeys(profile_updated_fields), "updated_at"])

        role = payload.get("role", None)
        if role is not None:
            if role not in role_choices:
                return Response({"role": ["Rol no valido."]}, status=status.HTTP_400_BAD_REQUEST)
            profile.role = role
            profile.save(update_fields=["role", "updated_at"])

        user.refresh_from_db()
        return Response(self._serialize_user(user), status=status.HTTP_200_OK)


class JWTLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)

        normalized_username = str(username).strip()
        user = authenticate(username=normalized_username, password=password)

        if user is None and "@" in normalized_username:
            candidate = User.objects.filter(email__iexact=normalized_username).first()
            if candidate is not None:
                user = authenticate(username=candidate.username, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "User account is disabled"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )
