from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from emergency.apps.core.audit import nombre_usuario, registrar_auditoria
from emergency.apps.core.models import Alerta
from ..services.alert_notifications import dispatch_sos_alert
from ..serializers import (
    AlertaSerializer, AlertaCreateSerializer,
    AlertaAckSerializer, AlertaCloseSerializer
)


class AlertaViewSet(viewsets.ModelViewSet):
    """ViewSet completo para alertas"""
    queryset = Alerta.objects.all()
    serializer_class = AlertaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['incident', 'status', 'alert_type', 'severity', 'created_by']

    def get_serializer_class(self):
        if self.action == 'create':
            return AlertaCreateSerializer
        return AlertaSerializer

    def perform_create(self, serializer):
        alert = serializer.save(created_by=self.request.user)
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} creo la alerta '{alert.title}' ({alert.alert_type}) con severidad {alert.severity}.",
        )

    def perform_update(self, serializer):
        alert = serializer.save()
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} modifico la alerta '{alert.title}' ({alert.alert_type}).",
        )

    def perform_destroy(self, instance):
        descripcion = f"{nombre_usuario(self.request.user)} elimino la alerta '{instance.title}' ({instance.alert_type})."
        instance.delete()
        registrar_auditoria(self.request.user, descripcion)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alert = serializer.save(created_by=request.user)
        registrar_auditoria(
            request.user,
            f"{nombre_usuario(request.user)} creo la alerta '{alert.title}' ({alert.alert_type}) con severidad {alert.severity}.",
        )
        dispatch_result = dispatch_sos_alert(alert)

        response_serializer = AlertaSerializer(alert, context=self.get_serializer_context())
        response_data = response_serializer.data
        response_data["notification"] = {
            "incident_id": dispatch_result.incident_id,
            "incident_message_id": dispatch_result.incident_message_id,
            "message_created": dispatch_result.message_created,
            "central_notified": dispatch_result.central_sent,
            "team_notified": dispatch_result.team_sent,
            "central_targets": dispatch_result.central_targets,
            "team_targets": dispatch_result.team_targets,
            "push_enabled": dispatch_result.push_enabled,
            "push_error": dispatch_result.error,
        }

        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Reconocer una alerta"""
        alert = self.get_object()

        if alert.status != 'OPEN':
            return Response(
                {'error': 'Alert is not open'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AlertaAckSerializer(data=request.data)
        if serializer.is_valid():
            alert.status = 'ACK'
            alert.acked_by = request.user
            alert.acked_at = timezone.now()
            alert.ack_notes = serializer.validated_data.get('ack_notes', '')
            alert.save()
            registrar_auditoria(request.user, f"{nombre_usuario(request.user)} reconocio la alerta '{alert.title}'.")

            return Response(AlertaSerializer(alert).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Cerrar una alerta"""
        alert = self.get_object()

        if alert.status == 'CLOSED':
            return Response(
                {'error': 'Alert is already closed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AlertaCloseSerializer(data=request.data)
        if serializer.is_valid():
            alert.status = 'CLOSED'
            alert.closed_by = request.user
            alert.closed_at = timezone.now()
            alert.close_notes = serializer.validated_data.get('close_notes', '')
            alert.save()
            registrar_auditoria(request.user, f"{nombre_usuario(request.user)} cerro la alerta '{alert.title}'.")

            return Response(AlertaSerializer(alert).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def my_alerts(self, request):
        """Obtener alertas creadas por el usuario actual"""
        alerts = Alerta.objects.filter(created_by=request.user)
        serializer = AlertaSerializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def open(self, request):
        """Obtener alertas abiertas"""
        alerts = Alerta.objects.filter(status='OPEN')
        serializer = AlertaSerializer(alerts, many=True)
        return Response(serializer.data)
