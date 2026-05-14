import json
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.gis.geos import Point
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login, logout as django_logout
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from emergency.apps.core.forms import SupervisorLoginForm
from emergency.apps.core.location_utils import obtener_direccion_legible
from emergency.apps.core.models import CodigoResetPassword, Dispositivo, Organizacion, Profile, User

from ..serializers import DispositivoRegistroSerializer, ProfileSerializer, UserCreateSerializer, UserSerializer


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


def _construir_url_avatar(request, perfil):
    avatar = getattr(perfil, "avatar", None)
    if not avatar:
        return ""

    try:
        url_avatar = avatar.url
    except ValueError:
        return ""

    return request.build_absolute_uri(url_avatar)


def _serializar_usuario_mobile(user, request):
    profile = getattr(user, "profile", None)
    direccion_legible = ""

    if profile and getattr(profile, "location", None):
        try:
            direccion_legible = obtener_direccion_legible(
                profile.location.y,
                profile.location.x,
            )
        except Exception:
            direccion_legible = ""

    return {
        "id": str(user.id),
        "profile_id": str(profile.id) if profile else "",
        "username": user.username,
        "email": user.email,
        "first_name": getattr(user, "first_name", ""),
        "last_name": getattr(user, "last_name", ""),
        "phone": user.phone or "",
        "is_active": user.is_active,
        "created_at": user.created_at,
        "role": getattr(profile, "role", None),
        "emergency_contact": getattr(profile, "emergency_contact", "") or "",
        "emergency_phone": getattr(profile, "emergency_phone", "") or "",
        "location_lat": getattr(profile.location, "y", None) if getattr(profile, "location", None) else None,
        "location_lng": getattr(profile.location, "x", None) if getattr(profile, "location", None) else None,
        "location_address": direccion_legible,
        "medical_notes": getattr(profile, "medical_notes", []) or [],
        "organization_id": str(getattr(profile, "organization_id", "") or ""),
        "organization_name": getattr(getattr(profile, "organization", None), "name", "") if profile else "",
        "dni": getattr(profile, "dni", "") or "",
        "avatar": _construir_url_avatar(request, profile) if profile else "",
        "language": getattr(profile, "language", "") or "",
        "city": getattr(profile, "city", "") or "",
        "province": getattr(profile, "province", "") or "",
        "country": getattr(profile, "country", "") or "",
        "birth_date": profile.birth_date.isoformat() if getattr(profile, "birth_date", None) else "",
        "specialties": getattr(profile, "specialties", []) or [],
        "operative_schedule": getattr(profile, "operative_schedule", "") or "",
        "operative_status": getattr(profile, "operative_status", "DISPONIBLE") or "DISPONIBLE",
        "blood_type": getattr(profile, "blood_type", "") or "",
        "nutrition_preference": getattr(profile, "nutrition_preference", "") or "",
        "device_id": str(getattr(profile, "device_id", "") or ""),
        "assigned_supervisor_id": str(getattr(profile, "assigned_supervisor_id", "") or ""),
    }


def _generar_codigo_numerico():
    return f"{secrets.randbelow(1000000):06d}"


def _buscar_codigo_activo(email):
    ahora = timezone.now()
    return (
        CodigoResetPassword.objects.select_related("user")
        .filter(
            email__iexact=email,
            expira_en__gt=ahora,
            usado_en__isnull=True,
        )
        .order_by("-creado_en")
        .first()
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(_serializar_usuario_mobile(request.user, request))

    @transaction.atomic
    def patch(self, request):
        user = request.user
        payload = request.data

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

        if "first_name" in payload:
            user.first_name = str(payload.get("first_name", "")).strip()

        if "last_name" in payload:
            user.last_name = str(payload.get("last_name", "")).strip()

        if "phone" in payload:
            user.phone = str(payload.get("phone", "")).strip()

        profile = getattr(user, "profile", None)
        if profile is None:
            profile = Profile.objects.create(user=user)

        profile_updated_fields = []

        if "emergency_contact" in payload:
            profile.emergency_contact = str(payload.get("emergency_contact", "")).strip()
            profile_updated_fields.append("emergency_contact")

        if "emergency_phone" in payload:
            profile.emergency_phone = str(payload.get("emergency_phone", "")).strip()
            profile_updated_fields.append("emergency_phone")

        if "location_lat" in payload or "location_lng" in payload:
            raw_lat = payload.get("location_lat")
            raw_lng = payload.get("location_lng")

            if raw_lat in ("", None) or raw_lng in ("", None):
                profile.location = None
            else:
                try:
                    lat = float(raw_lat)
                    lng = float(raw_lng)
                except (TypeError, ValueError):
                    return Response({"location": ["Coordenadas no validas."]}, status=status.HTTP_400_BAD_REQUEST)

                if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                    return Response(
                        {"location": ["Latitud o longitud fuera de rango."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                profile.location = Point(lng, lat, srid=4326)

            profile_updated_fields.append("location")

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
            archivo_avatar = payload.get("avatar")
            if archivo_avatar:
                profile.avatar = archivo_avatar
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

        if "operative_status" in payload:
            operative_status = str(payload.get("operative_status", "")).strip()
            status_choices = {choice[0] for choice in Profile.OPERATIVE_STATUSES}
            if operative_status not in status_choices:
                return Response(
                    {"operative_status": ["Estado operativo no valido."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.operative_status = operative_status
            profile_updated_fields.append("operative_status")

        if "blood_type" in payload:
            profile.blood_type = str(payload.get("blood_type", "")).strip()
            profile_updated_fields.append("blood_type")

        if "nutrition_preference" in payload:
            profile.nutrition_preference = str(payload.get("nutrition_preference", "")).strip()
            profile_updated_fields.append("nutrition_preference")

        user.save()
        if profile_updated_fields:
            profile.save(update_fields=[*dict.fromkeys(profile_updated_fields), "updated_at"])

        user.refresh_from_db()
        return Response(_serializar_usuario_mobile(user, request), status=status.HTTP_200_OK)


class DeviceRegistrationView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @transaction.atomic
    def post(self, request):
        serializer = DispositivoRegistroSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        fcm_token = serializer.validated_data["fcm_token"]
        device_name = str(serializer.validated_data.get("device_name", "") or "").strip()
        platform = str(serializer.validated_data.get("platform", "") or "").strip().upper() or "ANDROID"

        device, _ = Dispositivo.objects.update_or_create(
            user=request.user,
            fcm_token=fcm_token,
            defaults={
                "device_name": device_name,
                "platform": platform,
                "is_active": True,
            },
        )

        profile = getattr(request.user, "profile", None)
        if profile is None:
            profile = Profile.objects.create(user=request.user)

        profile.device = device
        profile.save(update_fields=["device", "updated_at"])

        return Response(
            {
                "device": {
                    "id": str(device.id),
                    "fcm_token": device.fcm_token,
                    "device_name": device.device_name,
                    "platform": device.platform,
                    "is_active": device.is_active,
                    "last_used": device.last_used,
                },
                "device_id": str(device.id),
            },
            status=status.HTTP_201_CREATED,
        )


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
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    @transaction.atomic
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()

        if not email:
            return Response({"email": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({"email": ["Introduce un correo electronico valido."]}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            return Response(
                {"detail": "Si existe una cuenta asociada, se ha enviado un codigo de verificacion."},
                status=status.HTTP_200_OK,
            )

        CodigoResetPassword.objects.filter(
            user=user,
            usado_en__isnull=True,
            expira_en__gt=timezone.now(),
        ).update(expira_en=timezone.now())

        codigo = _generar_codigo_numerico()
        token_reseteo_debug = secrets.token_urlsafe(32) if settings.DEBUG else ""
        registro = CodigoResetPassword.crear_con_expiracion(
            user=user,
            email=user.email.lower(),
            codigo=codigo,
            token_verificado=token_reseteo_debug,
            verificado_en=timezone.now() if settings.DEBUG else None,
        )

        asunto = "Codigo de verificacion para resetear tu password"
        mensaje = (
            f"Hola {user.username},\n\n"
            f"Tu codigo de verificacion es: {codigo}\n\n"
            "Este codigo caduca en 10 minutos.\n"
            "Si no has solicitado este cambio, puedes ignorar este correo."
        )

        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        respuesta = {
            "detail": "Si existe una cuenta asociada, se ha enviado un codigo de verificacion.",
            "caduca_en": registro.expira_en,
        }
        if settings.DEBUG:
            respuesta["reset_token_debug"] = token_reseteo_debug

        return Response(respuesta, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetVerifyCodeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    @transaction.atomic
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        codigo = str(request.data.get("code", "")).strip()

        if not email:
            return Response({"email": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
        if not codigo:
            return Response({"code": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
        if not codigo.isdigit() or len(codigo) != 6:
            return Response({"code": ["El codigo debe tener 6 digitos numericos."]}, status=status.HTTP_400_BAD_REQUEST)

        registro = _buscar_codigo_activo(email)
        if registro is None:
            return Response({"detail": "El codigo no es valido o ha caducado."}, status=status.HTTP_400_BAD_REQUEST)

        if registro.intentos_verificacion >= 5:
            registro.expira_en = timezone.now()
            registro.save(update_fields=["expira_en"])
            return Response({"detail": "Se ha superado el numero maximo de intentos."}, status=status.HTTP_400_BAD_REQUEST)

        if registro.codigo != codigo:
            registro.intentos_verificacion += 1
            registro.save(update_fields=["intentos_verificacion"])
            return Response({"detail": "El codigo no es valido o ha caducado."}, status=status.HTTP_400_BAD_REQUEST)

        token_reseteo = secrets.token_urlsafe(32)
        registro.token_verificado = token_reseteo
        registro.verificado_en = timezone.now()
        registro.save(update_fields=["token_verificado", "verificado_en"])

        return Response(
            {
                "detail": "Codigo verificado correctamente.",
                "reset_token": token_reseteo,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    @transaction.atomic
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        token_reseteo = str(request.data.get("reset_token", "")).strip()
        nueva_password = str(request.data.get("new_password", ""))

        if not email:
            return Response({"email": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
        if not token_reseteo:
            return Response({"reset_token": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
        if not nueva_password:
            return Response({"new_password": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

        registro = (
            CodigoResetPassword.objects.select_related("user")
            .filter(
                email__iexact=email,
                token_verificado=token_reseteo,
                expira_en__gt=timezone.now(),
                usado_en__isnull=True,
                verificado_en__isnull=False,
            )
            .order_by("-creado_en")
            .first()
        )

        if registro is None:
            return Response({"detail": "La solicitud de reseteo no es valida o ha caducado."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(nueva_password, user=registro.user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        registro.user.set_password(nueva_password)
        registro.user.save(update_fields=["password"])
        registro.usado_en = timezone.now()
        registro.save(update_fields=["usado_en"])

        CodigoResetPassword.objects.filter(
            user=registro.user,
            usado_en__isnull=True,
            expira_en__gt=timezone.now() - timedelta(days=1),
        ).exclude(id=registro.id).update(expira_en=timezone.now(), usado_en=timezone.now())

        return Response({"detail": "Password actualizada correctamente."}, status=status.HTTP_200_OK)


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
                "profile_id": str(profile.id) if profile else None,
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
            .values("id", "username", "email", "is_active", "created_at", "profile__role", "profile__id")
        )

        data = [
            {
                "id": str(usuario["id"]),
                "profile_id": str(usuario["profile__id"]) if usuario["profile__id"] else "",
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
    def _serialize_user(user, request):
        profile = getattr(user, "profile", None)
        direccion_legible = ""

        if profile and getattr(profile, "location", None):
            try:
                direccion_legible = obtener_direccion_legible(
                    profile.location.y,
                    profile.location.x,
                )
            except Exception:
                direccion_legible = ""

        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "phone": user.phone,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "role": getattr(profile, "role", None),
            "emergency_contact": getattr(profile, "emergency_contact", ""),
            "emergency_phone": getattr(profile, "emergency_phone", ""),
            "location_lat": getattr(profile.location, "y", None) if getattr(profile, "location", None) else None,
            "location_lng": getattr(profile.location, "x", None) if getattr(profile, "location", None) else None,
            "location_address": direccion_legible,
            "medical_notes": getattr(profile, "medical_notes", []) or [],
            "organization_id": str(getattr(profile, "organization_id", "") or ""),
            "dni": getattr(profile, "dni", ""),
            "avatar": _construir_url_avatar(request, profile) if profile else "",
            "language": getattr(profile, "language", ""),
            "city": getattr(profile, "city", ""),
            "province": getattr(profile, "province", ""),
            "country": getattr(profile, "country", ""),
            "birth_date": profile.birth_date.isoformat() if getattr(profile, "birth_date", None) else "",
            "specialties": getattr(profile, "specialties", []) or [],
            "operative_schedule": getattr(profile, "operative_schedule", ""),
            "operative_status": getattr(profile, "operative_status", "DISPONIBLE") or "DISPONIBLE",
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

        return Response(self._serialize_user(user, request), status=status.HTTP_200_OK)

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
            user.first_name = str(payload.get("first_name", "")).strip()

        if "last_name" in payload:
            user.last_name = str(payload.get("last_name", "")).strip()

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
        if "location_lat" in payload or "location_lng" in payload:
            raw_lat = payload.get("location_lat")
            raw_lng = payload.get("location_lng")

            if raw_lat in ("", None) or raw_lng in ("", None):
                profile.location = None
            else:
                try:
                    lat = float(raw_lat)
                    lng = float(raw_lng)
                except (TypeError, ValueError):
                    return Response(
                        {"location": ["Coordenadas no validas."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                    return Response(
                        {"location": ["Latitud o longitud fuera de rango."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                profile.location = Point(lng, lat, srid=4326)

            profile_updated_fields.append("location")


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
            archivo_avatar = payload.get("avatar")
            if archivo_avatar:
                profile.avatar = archivo_avatar
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

        if "operative_status" in payload:
            operative_status = str(payload.get("operative_status", "")).strip()
            status_choices = {choice[0] for choice in Profile.OPERATIVE_STATUSES}
            if operative_status not in status_choices:
                return Response(
                    {"operative_status": ["Estado operativo no valido."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.operative_status = operative_status
            profile_updated_fields.append("operative_status")

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
        return Response(self._serialize_user(user, request), status=status.HTTP_200_OK)

    @transaction.atomic
    def delete(self, request, user_id):
        unauthorized = self._ensure_supervisor(request)
        if unauthorized:
            return unauthorized

        user = User.objects.select_related("profile").filter(id=user_id).first()
        if not user:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response(
                {"detail": "No puedes borrar tu propia cuenta desde el panel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = getattr(user, "profile", None)
        if profile and profile.role == "ADMIN":
            return Response(
                {"detail": "No se permite borrar usuarios con rol administrador desde esta pantalla."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
