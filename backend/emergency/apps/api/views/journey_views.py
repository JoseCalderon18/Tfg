from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from emergency.apps.core.audit import nombre_usuario, registrar_auditoria
from emergency.apps.core.models import Journey
from ..serializers import JourneyCreateSerializer, JourneySerializer, JourneyStopSerializer


class JourneyViewSet(viewsets.ModelViewSet):
    queryset = Journey.objects.select_related("user", "user__user").all()
    serializer_class = JourneySerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "created_at", "start_date", "end_date"]
    ordering_fields = ["created_at", "start_date", "end_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        account_user_id = self.request.query_params.get("account_user")
        if account_user_id:
            queryset = queryset.filter(user__user_id=account_user_id)
        return queryset

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return JourneyCreateSerializer
        if self.action == "stop_current":
            return JourneyStopSerializer
        return JourneySerializer

    def perform_create(self, serializer):
        journey = serializer.save(user=self.request.user.profile)
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} creo la jornada #{journey.id}.",
        )

    def perform_update(self, serializer):
        journey = serializer.save()
        registrar_auditoria(
            self.request.user,
            f"{nombre_usuario(self.request.user)} modifico la jornada #{journey.id}.",
        )

    def perform_destroy(self, instance):
        descripcion = f"{nombre_usuario(self.request.user)} elimino la jornada #{instance.id}."
        instance.delete()
        registrar_auditoria(self.request.user, descripcion)

    @action(detail=False, methods=["post"], url_path="stop-current")
    def stop_current(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response(
                {"detail": "El usuario autenticado no tiene perfil asociado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        journey = (
            Journey.objects
            .filter(user=profile, end_date__isnull=True)
            .order_by("-created_at")
            .first()
        )

        if journey is None:
            return Response(
                {"detail": "No hay una jornada activa para este usuario."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(data=request.data, context={"journey": journey})
        serializer.is_valid(raise_exception=True)
        journey = serializer.save()
        registrar_auditoria(request.user, f"{nombre_usuario(request.user)} finalizo la jornada #{journey.id}.")

        return Response(JourneySerializer(journey).data, status=status.HTTP_200_OK)
