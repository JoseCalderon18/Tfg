from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.gis.geos import Point
from django.utils import timezone
import math

from emergency.apps.core.audit import nombre_usuario, registrar_auditoria
from emergency.apps.core.models import Alerta, WorkArea
from ..serializers import WorkAreaCreateSerializer, WorkAreaSerializer


def _get_request_float(data, *names):
    for name in names:
        value = data.get(name)
        if value is not None:
            return float(value)
    return None


def _distance_m(lat1, lng1, lat2, lng2):
    radius = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _point_inside_workarea(point, lat, lng, workarea):
    if workarea.area_type == "CIRCLE" and workarea.center and workarea.radius_m:
        return _distance_m(lat, lng, workarea.center.y, workarea.center.x) <= workarea.radius_m

    if workarea.area_type == "POLYGON" and workarea.polygon:
        return workarea.polygon.covers(point)

    return False


def _get_user_organization_id(user):
    try:
        profile = user.profile
    except Exception:
        return None

    return profile.organization_id


class WorkAreaViewSet(viewsets.ModelViewSet):
    """ViewSet de areas de trabajo"""

    queryset = WorkArea.objects.select_related("incident").all().order_by("-created_at")
    serializer_class = WorkAreaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["incident", "area_type", "active"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return WorkAreaCreateSerializer
        return WorkAreaSerializer

    def perform_create(self, serializer):
        workarea = serializer.save()
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} creo el area de trabajo '{workarea.name}'.",
        )

    def perform_update(self, serializer):
        workarea = serializer.save()
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} modifico el area de trabajo '{workarea.name}'.",
        )

    def perform_destroy(self, instance):
        descripcion = f"{nombre_usuario(self.request.user)} elimino el area de trabajo '{instance.name}'."
        instance.delete()
        registrar_auditoria(self.request.user, descripcion)

    @action(detail=False, methods=["post"], url_path="check-position")
    def check_position(self, request):
        try:
            lat = _get_request_float(request.data, "lat", "latitude")
            lng = _get_request_float(request.data, "lng", "longitude")
        except (TypeError, ValueError):
            return Response(
                {"detail": "Las coordenadas deben ser numericas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if lat is None or lng is None:
            return Response(
                {"detail": "Debes enviar lat/lng o latitude/longitude."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        point = Point(lng, lat, srid=4326)
        incident_id = request.data.get("incident")
        organization_id = _get_user_organization_id(request.user)

        if organization_id is None:
            return Response(
                {
                    "inside": True,
                    "has_workarea": False,
                    "message": "El operativo no tiene organizacion asignada.",
                    "alert_id": None,
                }
            )

        workareas = WorkArea.objects.filter(
            incident__owner_organization_id=organization_id,
            incident__status="OPEN",
            active=True,
        ).select_related("incident")

        if incident_id:
            workareas = workareas.filter(incident_id=incident_id)

        if not workareas.exists():
            return Response(
                {
                    "inside": True,
                    "has_workarea": False,
                    "message": "No hay area de trabajo activa para comprobar.",
                    "alert_id": None,
                }
            )

        matched_workarea = None
        fallback_incident = None

        for workarea in workareas:
            fallback_incident = workarea.incident
            if _point_inside_workarea(point, lat, lng, workarea):
                matched_workarea = workarea
                break

        active_alerts = Alerta.objects.filter(
            created_by=request.user,
            alert_type="GEOFENCE",
            status__in=["OPEN", "ACK"],
            incident__owner_organization_id=organization_id,
            incident__status="OPEN",
        )

        if incident_id:
            active_alerts = active_alerts.filter(incident_id=incident_id)

        if matched_workarea:
            for alert in active_alerts:
                alert.status = "CLOSED"
                alert.closed_by = request.user
                alert.closed_at = timezone.now()
                alert.close_notes = "El operativo ha vuelto dentro del area de trabajo."
                alert.save(update_fields=["status", "closed_by", "closed_at", "close_notes", "updated_at"])

            return Response(
                {
                    "inside": True,
                    "has_workarea": True,
                    "work_area": {
                        "id": matched_workarea.id,
                        "name": matched_workarea.name,
                    },
                    "incident": str(matched_workarea.incident_id),
                    "message": "Dentro del area de trabajo.",
                    "alert_id": None,
                }
            )

        alert = active_alerts.first()

        if alert is None:
            alert = Alerta.objects.create(
                incident=fallback_incident,
                created_by=request.user,
                alert_type="GEOFENCE",
                severity=2,
                status="OPEN",
                title="Operativo fuera del area de trabajo",
                description="El dispositivo movil ha salido del workarea asignada.",
                location=point,
            )

        return Response(
            {
                "inside": False,
                "has_workarea": True,
                "incident": str(alert.incident_id) if alert.incident_id else None,
                "message": "Has salido del area de trabajo. Vuelve a la zona asignada.",
                "alert_id": str(alert.id),
            }
        )
