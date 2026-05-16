from django.db.models import Avg, Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from emergency.apps.core.models import (
    AuditoriaUbicacion,
    ConsumoRecursos,
    EstadoUnidad,
    Unidad,
    User,
)
from ..serializers.unit_serializers import (
    AuditoriaUbicacionSerializer,
    CambioEstadoUnidadSerializer,
    ConsumoRecursosCreateSerializer,
    ConsumoRecursosSerializer,
    EstadoUnidadSerializer,
    UnidadCreateUpdateSerializer,
    UnidadDetailSerializer,
    UnidadListSerializer,
)


def get_user_organization(user):
    profile = getattr(user, "profile", None)
    return getattr(profile, "organization", None)


class UnidadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "type", "is_active"]
    search_fields = ["name", "vehicle_id", "driver__username", "driver__first_name", "driver__last_name"]
    ordering_fields = ["name", "status", "fuel_level", "battery_level", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = (
            Unidad.objects
            .select_related("organization", "driver")
            .prefetch_related("status_history", "consumption_records", "location_audit")
            .all()
        )
        organization = get_user_organization(self.request.user)
        if organization is not None:
            queryset = queryset.filter(organization=organization)
        return queryset

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return UnidadCreateUpdateSerializer
        if self.action == "retrieve":
            return UnidadDetailSerializer
        return UnidadListSerializer

    def perform_create(self, serializer):
        organization = get_user_organization(self.request.user)
        serializer.save(organization=organization)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        queryset = self.get_queryset()
        aggregates = queryset.aggregate(
            total_units=Count("id"),
            available_units=Count("id", filter=Q(status="DISPONIBLE")),
            units_in_transit=Count("id", filter=Q(status="EN_VIAJE")),
            units_in_maintenance=Count("id", filter=Q(status="EN_MANTENIMIENTO")),
            offline_units=Count("id", filter=Q(status="OFFLINE")),
            units_low_fuel=Count("id", filter=Q(fuel_level__lt=20)),
            units_low_battery=Count("id", filter=Q(battery_level__lt=15)),
            average_fuel_level=Avg("fuel_level"),
            average_battery_level=Avg("battery_level"),
        )
        return Response({
            **aggregates,
            "average_fuel_level": aggregates["average_fuel_level"] or 0,
            "average_battery_level": aggregates["average_battery_level"] or 0,
        })

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        unit = self.get_object()
        serializer = CambioEstadoUnidadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        driver = None
        driver_id = serializer.validated_data.get("driver")
        if driver_id:
            driver = User.objects.filter(id=driver_id).first()

        previous_status = unit.status
        next_status = serializer.validated_data["status_nuevo"]
        unit.status = next_status
        if driver is not None:
            unit.driver = driver
        unit.save(update_fields=["status", "driver", "updated_at"] if driver is not None else ["status", "updated_at"])

        history = EstadoUnidad.objects.create(
            unit=unit,
            status_anterior=previous_status,
            status_nuevo=next_status,
            driver=unit.driver,
            razon=serializer.validated_data.get("razon"),
            created_by=request.user,
        )
        return Response(EstadoUnidadSerializer(history).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def record_consumption(self, request, pk=None):
        unit = self.get_object()
        serializer = ConsumoRecursosCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(unit=unit)

        unit.fuel_level = record.fuel_level
        unit.battery_level = record.battery_level
        if record.distance_km:
            unit.total_mileage += record.distance_km
        unit.save(update_fields=["fuel_level", "battery_level", "total_mileage", "updated_at"])

        return Response(UnidadDetailSerializer(unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def location_history(self, request, pk=None):
        unit = self.get_object()
        limit = int(request.query_params.get("limit", 50))
        queryset = unit.location_audit.all()[:limit]
        return Response(AuditoriaUbicacionSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get"])
    def consumption_history(self, request, pk=None):
        unit = self.get_object()
        limit = int(request.query_params.get("limit", 50))
        queryset = unit.consumption_records.all()[:limit]
        return Response(ConsumoRecursosSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get"])
    def status_history(self, request, pk=None):
        unit = self.get_object()
        limit = int(request.query_params.get("limit", 50))
        queryset = unit.status_history.all()[:limit]
        return Response(EstadoUnidadSerializer(queryset, many=True).data)


class EstadoUnidadViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EstadoUnidadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EstadoUnidad.objects.select_related("unit", "driver", "created_by")
        organization = get_user_organization(self.request.user)
        if organization is not None:
            queryset = queryset.filter(unit__organization=organization)
        return queryset


class ConsumoRecursosViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConsumoRecursosSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ConsumoRecursos.objects.select_related("unit")
        organization = get_user_organization(self.request.user)
        if organization is not None:
            queryset = queryset.filter(unit__organization=organization)
        return queryset


class AuditoriaUbicacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditoriaUbicacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AuditoriaUbicacion.objects.select_related("unit")
        organization = get_user_organization(self.request.user)
        if organization is not None:
            queryset = queryset.filter(unit__organization=organization)
        return queryset
