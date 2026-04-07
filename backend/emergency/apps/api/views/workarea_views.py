from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from emergency.apps.core.models import WorkArea
from ..serializers import WorkAreaSerializer


class WorkAreaViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de áreas de trabajo"""

    queryset = WorkArea.objects.select_related("incident").all().order_by("-created_at")
    serializer_class = WorkAreaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["incident", "area_type", "active"]
