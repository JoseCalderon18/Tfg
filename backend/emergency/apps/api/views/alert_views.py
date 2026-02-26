from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from emergency.apps.core.models import Alerta
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
        serializer.save(created_by=self.request.user)

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
