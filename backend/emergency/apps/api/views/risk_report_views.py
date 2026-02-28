from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from emergency.apps.core.models import RiskReport
from ..serializers import RiskReportSerializer, RiskReportCreateSerializer


class RiskReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet para reportes de riesgo.
    
    Diferencia con Alert:
    - Alert = Emergencia urgente (SOS, man down)
    - RiskReport = Observación de peligro (humo, ramas, zona insegura)
    """
    queryset = RiskReport.objects.all()
    serializer_class = RiskReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['incident', 'severity', 'is_active', 'reported_by']

    def get_serializer_class(self):
        if self.action == 'create':
            return RiskReportCreateSerializer
        return RiskReportSerializer

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Desactivar un reporte de riesgo (ya no está vigente)"""
        risk_report = self.get_object()
        risk_report.is_active = False
        risk_report.save()
        return Response(RiskReportSerializer(risk_report).data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Obtener reportes de riesgo activos"""
        reports = RiskReport.objects.filter(is_active=True)
        serializer = RiskReportSerializer(reports, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_incident(self, request):
        """Obtener reportes de riesgo de un incidente"""
        incident_id = request.query_params.get('incident_id')
        if not incident_id:
            return Response(
                {'error': 'incident_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        reports = RiskReport.objects.filter(incident_id=incident_id)
        serializer = RiskReportSerializer(reports, many=True)
        return Response(serializer.data)
