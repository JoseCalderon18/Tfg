from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from emergency.apps.core.models import User, Profile
from ..serializers import UserSerializer, UserCreateSerializer, ProfileSerializer


class RegisterView(generics.CreateAPIView):
    """
    View para registrar nuevos usuarios en el sistema.

    Endpoint POST /api/auth/register/
    Permite a cualquier persona crear una cuenta.
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]


class CurrentUserView(APIView):
    """
    View para obtener información del usuario autenticado.

    Endpoint GET /api/auth/me/
    Requiere autenticación JWT válida.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retorna los datos del usuario actual."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ProfileView(APIView):
    """
    View para gestionar el perfil del usuario.

    Endpoints:
    - GET /api/auth/me/profile/ - Obtiene el perfil
    - PATCH /api/auth/me/profile/ - Actualiza el perfil parcialmente

    Requiere autenticación JWT válida.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Obtiene el perfil del usuario autenticado."""
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def patch(self, request):
        """Actualiza parcialmente el perfil del usuario."""
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(
                profile,
                data=request.data,
                partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
