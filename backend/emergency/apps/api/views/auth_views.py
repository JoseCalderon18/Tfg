from django.contrib.auth import login as django_login, logout as django_logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import transaction

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication

from emergency.apps.core.models import User, Profile
from emergency.apps.core.forms import SupervisorLoginForm  

from ..serializers import UserSerializer, UserCreateSerializer, ProfileSerializer


# -------------------------
# JWT / API GENERAL
# -------------------------

from rest_framework_simplejwt.tokens import RefreshToken


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Permite crear cuenta (API general).
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Requiere JWT válido (API general).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ProfileView(APIView):
    """
    GET/PATCH /api/auth/me/profile/
    Requiere JWT válido (API general).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request):
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


# -------------------------
# PANEL WEB (SESIONES) - SOLO SUPERVISOR
# -------------------------


@method_decorator(csrf_protect, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class PanelLoginView(APIView):
    """
    POST /api/auth/panel/login/
    Login por sesión (cookies) + CSRF.
    SOLO SUPERVISORES (validado en SupervisorLoginForm).
    """
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        # Setea cookie CSRF para permitir el POST subsiguiente desde SPA.
        return Response({"ok": True}, status=status.HTTP_200_OK)

    def post(self, request):
        form = SupervisorLoginForm(request.data)

        if form.is_valid():
            django_login(request, form.user, backend="django.contrib.auth.backends.ModelBackend")
            return Response({"ok": True}, status=status.HTTP_200_OK)

        # Errores del form en formato simple
        return Response(
            {"ok": False, "errors": form.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

# Apartado de logout y me para el panel web, usando sesiones y CSRF, sin JWT. Solo para supervisores (validado en cada vista).
@method_decorator(csrf_protect, name="dispatch")
class PanelLogoutView(APIView):
    """
    POST /api/auth/panel/logout/
    """
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    def post(self, request):
        django_logout(request)
        return Response({"ok": True}, status=status.HTTP_200_OK)


class PanelMeView(APIView):
    """
    GET /api/auth/panel/me/
    Devuelve info mínima para el web-panel, usando sesión.
    """
    permission_classes = [AllowAny]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False}, status=status.HTTP_401_UNAUTHORIZED)

        profile = getattr(request.user, "profile", None)
        return Response({
            "authenticated": True,
            "id": str(request.user.id),
            "username": getattr(request.user, "username", ""),
            "email": getattr(request.user, "email", ""),
            "role": getattr(profile, "role", None),
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class PanelCreateOperativeUserView(APIView):
    """
    POST /api/auth/panel/users/create/
    Crea un usuario nuevo desde el panel web.
    Solo SUPERVISOR.
    El rol se fuerza siempre a OPERATIVE en backend.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    @transaction.atomic
    def post(self, request):
        current_profile = getattr(request.user, "profile", None)
        if not current_profile or current_profile.role != "SUPERVISOR":
            return Response(
                {"detail": "No autorizado para crear usuarios."},
                status=status.HTTP_403_FORBIDDEN
            )

        payload = dict(request.data)
        payload["role"] = "OPERATIVE"
        payload.pop("organization_id", None)

        serializer = UserCreateSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class PanelUsersListView(APIView):
    """
    GET /api/auth/panel/users/
    Lista usuarios para el panel.
    Solo SUPERVISOR.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    def get(self, request):
        current_profile = getattr(request.user, "profile", None)
        if not current_profile or current_profile.role != "SUPERVISOR":
            return Response(
                {"detail": "No autorizado para visualizar usuarios."},
                status=status.HTTP_403_FORBIDDEN
            )

        users = (
            User.objects.select_related("profile")
            .order_by("username")
            .values(
                "id",
                "username",
                "email",
                "is_active",
                "created_at",
                "profile__role",
            )
        )

        data = [
            {
                "id": str(u["id"]),
                "username": u["username"],
                "email": u["email"],
                "is_active": u["is_active"],
                "created_at": u["created_at"],
                "role": u["profile__role"],
            }
            for u in users
        ]
        return Response(data, status=status.HTTP_200_OK)


# Apartado de edición de usuarios desde el panel, solo para supervisores. Permite actualizar campos básicos + rol (sin tocar contraseña). 
# La contraseña solo la puede cambiar el propio usuario desde su perfil (PATCH /api/auth/me/profile/), no desde el panel.
# Para resetear contreña, acceder desde usuario Administrador. 
@method_decorator(csrf_protect, name="dispatch")
class PanelUserDetailView(APIView):
    """
    GET/PATCH /api/auth/panel/users/<user_id>/
    Obtiene y actualiza un usuario desde el panel.
    Solo SUPERVISOR.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication]

    @staticmethod
    def _serialize_user(user):
        profile = getattr(user, "profile", None)
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "role": getattr(profile, "role", None),
        }

    @staticmethod
    def _ensure_supervisor(request):
        current_profile = getattr(request.user, "profile", None)
        if not current_profile or current_profile.role != "SUPERVISOR":
            return Response(
                {"detail": "No autorizado para editar usuarios."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request, user_id):
        unauthorized = self._ensure_supervisor(request)
        if unauthorized:
            return unauthorized

        user = User.objects.select_related("profile").filter(id=user_id).first()
        if not user:
            return Response(
                {"detail": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(self._serialize_user(user), status=status.HTTP_200_OK)

    @transaction.atomic
    def patch(self, request, user_id):
        unauthorized = self._ensure_supervisor(request)
        if unauthorized:
            return unauthorized

        user = User.objects.select_related("profile").filter(id=user_id).first()
        if not user:
            return Response(
                {"detail": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        if "first_name" in payload:
            user.first_name = str(payload.get("first_name", "")).strip()

        if "last_name" in payload:
            user.last_name = str(payload.get("last_name", "")).strip()

        if "phone" in payload:
            user.phone = str(payload.get("phone", "")).strip()

        if "is_active" in payload:
            user.is_active = bool(payload.get("is_active"))

        user.save()

        role = payload.get("role", None)
        if role is not None:
            if role not in role_choices:
                return Response(
                    {"role": ["Rol no valido."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile = getattr(user, "profile", None)
            if profile is None:
                profile = Profile.objects.create(user=user, role=role)
            else:
                profile.role = role
                profile.save(update_fields=["role", "updated_at"])

        user.refresh_from_db()
        return Response(self._serialize_user(user), status=status.HTTP_200_OK)


# -------------------------
# JWT Login para Mobile App
# -------------------------

class JWTLoginView(APIView):
    """
    POST /api/auth/login/
    Login con JWT (sin CSRF). Para mobile-app.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
