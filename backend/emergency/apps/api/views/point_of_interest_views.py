from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from emergency.apps.core.models import PointOfInterest
from ..serializers import PointOfInterestCreateSerializer, PointOfInterestSerializer


class PointOfInterestViewSet(viewsets.ModelViewSet):
    queryset = PointOfInterest.objects.select_related("incident", "created_by").all()
    serializer_class = PointOfInterestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["poi_type", "incident", "created_by", "is_active"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return PointOfInterestCreateSerializer
        return PointOfInterestSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
