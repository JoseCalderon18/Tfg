from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from emergency.apps.core.models import Incidente, IncidentMember
from ..serializers import IncidenteSerializer, IncidenteCreateSerializer, IncidentMemberSerializer


class IncidentViewSet(viewsets.ModelViewSet):
    """ViewSet completo para incidentes"""
    queryset = Incidente.objects.all()
    serializer_class = IncidenteSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'incident_type', 'owner_organization']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'started_at', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return IncidenteCreateSerializer
        return IncidenteSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Unirse a un incidente"""
        incident = self.get_object()
        user = request.user
        role = request.data.get('role', 'OPERATIVE')

        # Verificar si ya es miembro
        if IncidentMember.objects.filter(incident=incident, user=user).exists():
            return Response(
                {'error': 'Already a member of this incident'},
                status=status.HTTP_400_BAD_REQUEST
            )

        member = IncidentMember.objects.create(
            incident=incident,
            user=user,
            role_in_incident=role
        )

        return Response(IncidentMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Abandonar un incidente"""
        incident = self.get_object()
        user = request.user

        try:
            member = IncidentMember.objects.get(incident=incident, user=user)
            member.is_active = False
            member.save()
            return Response({'status': 'left incident'})
        except IncidentMember.DoesNotExist:
            return Response(
                {'error': 'Not a member of this incident'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Cerrar un incidente"""
        incident = self.get_object()

        # Solo supervisores o admin pueden cerrar
        if not (request.user.profile.is_supervisor or request.user.profile.is_admin):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        incident.status = 'CLOSED'
        incident.ended_at = timezone.now()
        incident.save()

        return Response(IncidenteSerializer(incident).data)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Obtener miembros del incidente"""
        incident = self.get_object()
        members = incident.incident_members.select_related('user').all()
        serializer = IncidentMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_incidents(self, request):
        """Obtener incidentes donde el usuario participa"""
        incidents = Incidente.objects.filter(
            incident_members__user=request.user,
            incident_members__is_active=True
        )
        serializer = IncidenteSerializer(incidents, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Obtener incidentes activos"""
        incidents = Incidente.objects.filter(status='OPEN')
        serializer = IncidenteSerializer(incidents, many=True)
        return Response(serializer.data)
