from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from emergency.apps.core.models import WorkArea
from ..serializers import WorkAreaCreateSerializer, WorkAreaSerializer


class WorkAreaViewSet(viewsets.ModelViewSet):
    """ViewSet de areas de trabajo"""

    queryset = WorkArea.objects.select_related("incident").all().order_by("-created_at")
    serializer_class = WorkAreaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["incident", "area_type", "active"]

    def get_serializer_class(self):
        if self.action == "create":
            return WorkAreaCreateSerializer
        return WorkAreaSerializer
