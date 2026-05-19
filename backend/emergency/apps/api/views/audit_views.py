from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication

from emergency.apps.core.models import Auditoria
from .auth_views import _has_panel_full_access
from ..serializers import AuditoriaSerializer


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditoriaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Auditoria.objects.all().order_by("-created_at")

    def list(self, request, *args, **kwargs):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para visualizar auditoria."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if not _has_panel_full_access(request.user):
            return Response({"detail": "No autorizado para visualizar auditoria."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)
