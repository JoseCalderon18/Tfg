from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from emergency.apps.core.models import Journey
from ..serializers import JourneyCreateSerializer, JourneySerializer


class JourneyViewSet(viewsets.ModelViewSet):
    queryset = Journey.objects.select_related("user").all()
    serializer_class = JourneySerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "created_at", "start_date", "end_date"]
    ordering_fields = ["created_at", "start_date", "end_date"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return JourneyCreateSerializer
        return JourneySerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user.profile)
