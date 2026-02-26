from django.contrib.auth import login as django_login, logout as django_logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework.throttling import SimpleRateThrottle

from emergency.apps.core.models import User, Profile
from emergency.apps.core.forms import SupervisorLoginForm  # <-- TU FORMS.PY

from ..serializers import UserSerializer, UserCreateSerializer, ProfileSerializer


# -------------------------
# JWT / API GENERAL (como lo tenías)
# -------------------------

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
# Endpoints recomendados:
# POST /api/auth/panel/login/
# POST /api/auth/panel/logout/
# GET  /api/auth/panel/me/


class PanelLoginThrottle(SimpleRateThrottle):
    scope = "panel_login"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


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
    throttle_classes = [PanelLoginThrottle]

    def get(self, request):
        # Setea cookie CSRF para permitir el POST subsiguiente desde SPA.
        return Response({"ok": True}, status=status.HTTP_200_OK)

    def post(self, request):
        # Para formulario tradicional (application/x-www-form-urlencoded)
        form = SupervisorLoginForm(request.data)

        if form.is_valid():
            django_login(request, form.user, backend="django.contrib.auth.backends.ModelBackend")
            return Response({"ok": True}, status=status.HTTP_200_OK)

        # Errores del form en formato simple
        return Response(
            {"ok": False, "errors": form.errors},
            status=status.HTTP_400_BAD_REQUEST
        )


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
