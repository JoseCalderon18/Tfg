from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone

from emergency.apps.core.models import LightningStrike
from ..serializers import LightningStrikeListSerializer


class LightningViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para rayos detectados"""
    queryset = LightningStrike.objects.all()
    serializer_class = LightningStrikeListSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    ordering = ['-timestamp']

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Obtener los últimos 100 rayos detectados"""
        latest_strikes = self.get_queryset()[:100]
        serializer = self.get_serializer(latest_strikes, many=True)
        return Response(serializer.data)