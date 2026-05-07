from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from emergency.apps.core.models import Incidente, IncidentMember, IncidentMessage, User
from .auth_views import _has_panel_full_access
from ..serializers import (
    IncidenteSerializer,
    IncidenteCreateSerializer,
    IncidentMemberSerializer,
    IncidentMessageSerializer,
    IncidentMessageCreateSerializer,
)


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

    def _can_access_incident_chat(self, incident, user):
        if not getattr(user, "is_authenticated", False):
            return False
        if _has_panel_full_access(user):
            return True
        if incident.created_by_id == user.id:
            return True
        return IncidentMember.objects.filter(
            incident=incident,
            user=user,
            is_active=True,
        ).exists()

    def _ensure_owner_organization_assignments(self, incident):
        """Sincroniza como miembros activos las unidades de la organizacion responsable."""
        if not incident.owner_organization_id:
            return

        organization_users = User.objects.filter(
            is_active=True,
            profile__organization_id=incident.owner_organization_id,
            profile__role__in=["OPERATIVE", "SUPERVISOR"],
        ).only("id")

        existing_user_ids = set(
            IncidentMember.objects.filter(incident=incident, user__in=organization_users)
            .values_list("user_id", flat=True)
        )

        members_to_create = [
            IncidentMember(
                incident=incident,
                user=user,
                role_in_incident=getattr(user.profile, "role", None) or "OPERATIVE",
                is_active=True,
            )
            for user in organization_users
            if user.id not in existing_user_ids
        ]

        if members_to_create:
            IncidentMember.objects.bulk_create(members_to_create, ignore_conflicts=True)

        IncidentMember.objects.filter(
            incident=incident,
            user__in=organization_users,
            is_active=False,
        ).update(is_active=True, left_at=None)

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

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        """Listar o crear mensajes del chat de un incidente."""
        incident = self.get_object()

        if not self._can_access_incident_chat(incident, request.user):
            return Response({"detail": "No autorizado para acceder al chat."}, status=status.HTTP_403_FORBIDDEN)

        if request.method.lower() == "get":
            messages = (
                IncidentMessage.objects.filter(incident=incident)
                .select_related("profile", "profile__user")
                .order_by("created_at")
            )
            serializer = IncidentMessageSerializer(messages, many=True)
            return Response(serializer.data)

        serializer = IncidentMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "El usuario no tiene perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)
        message = IncidentMessage.objects.create(
            incident=incident,
            profile=profile,
            content=serializer.validated_data["content"],
        )
        output = IncidentMessageSerializer(message)
        return Response(output.data, status=status.HTTP_201_CREATED)

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

    @action(detail=True, methods=["get", "post"])
    def assignments(self, request, pk=None):
        """Obtener o crear asignaciones de un incidente"""
        incident = self.get_object()

        if request.method.lower() == "get":
            self._ensure_owner_organization_assignments(incident)
            members = incident.incident_members.select_related(
                'user', 'user__profile', 'user__profile__organization'
            ).filter(is_active=True)
            serializer = IncidentMemberSerializer(members, many=True)
            return Response(serializer.data)

        # POST: Crear nueva asignación
        user_id = request.data.get('user')
        role = request.data.get('role', 'OPERATIVE')

        if not user_id:
            return Response(
                {'error': 'user field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar si ya existe la asignación
        member, created = IncidentMember.objects.get_or_create(
            incident=incident,
            user=user,
            defaults={'role_in_incident': role, 'is_active': True}
        )

        if not created:
            # Si ya existe, activarlo si está inactivo
            if not member.is_active:
                member.is_active = True
                member.save()
            else:
                return Response(
                    {'error': 'User already assigned to this incident'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = IncidentMemberSerializer(member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"])
    def remove_assignment(self, request, pk=None):
        """Eliminar asignación de un incidente"""
        incident = self.get_object()
        assignment_id = request.data.get('assignment_id')

        if not assignment_id:
            return Response(
                {'error': 'assignment_id field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member = IncidentMember.objects.get(id=assignment_id, incident=incident)
            member.delete()
            return Response({'status': 'assignment removed'})
        except IncidentMember.DoesNotExist:
            return Response(
                {'error': 'Assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
