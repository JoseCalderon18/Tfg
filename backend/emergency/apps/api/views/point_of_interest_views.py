from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from emergency.apps.core.audit import nombre_usuario, registrar_auditoria
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
        point = serializer.save(created_by=self.request.user)
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} creo el punto de interes '{point.name}' ({point.poi_type}).",
        )

    def perform_update(self, serializer):
        point = serializer.save()
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} modifico el punto de interes '{point.name}'.",
        )

    def perform_destroy(self, instance):
        descripcion = f"{nombre_usuario(self.request.user)} elimino el punto de interes '{instance.name}'."
        instance.delete()
        registrar_auditoria(self.request.user, descripcion)
