from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend

from emergency.apps.core.models import User, Organization
from ..serializers import UserSerializer, OrganizationSerializer


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para usuarios (solo lectura)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'profile__role', 'profile__organization']
    search_fields = ['username', 'email', 'first_name', 'last_name']


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet para organizaciones"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['org_type', 'is_active']
    search_fields = ['name']
    ordering = ['name']
