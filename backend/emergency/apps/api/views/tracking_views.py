from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.gis.geos import Point
from django.utils import timezone

from emergency.apps.core.models import PuntoRastreo, Incidente
from ..serializers import PuntoRastreoSerializer, PuntoRastreoCreateSerializer


DEFAULT_ROUTE_LIMIT = 300
MAX_ROUTE_LIMIT = 1000


def _get_route_limit(request):
    try:
        limit = int(request.query_params.get('limit', DEFAULT_ROUTE_LIMIT))
    except (TypeError, ValueError):
        limit = DEFAULT_ROUTE_LIMIT
    return max(1, min(limit, MAX_ROUTE_LIMIT))


class PuntoRastreoCreateView(generics.CreateAPIView):
    """Crear un punto de tracking"""
    serializer_class = PuntoRastreoCreateSerializer
    permission_classes = [IsAuthenticated]


class PuntoRastreoBatchCreateView(APIView):
    """Crear múltiples puntos de tracking"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        points_data = request.data.get('points', [])
        if not points_data:
            return Response(
                {'error': 'No points provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_points = []
        for point_data in points_data:
            lat = point_data.get('lat')
            lng = point_data.get('lng')

            if lat is None or lng is None:
                continue

            track_point = PuntoRastreo.objects.create(
                user=request.user,
                incident_id=point_data.get('incident'),
                location=Point(lng, lat, srid=4326),
                accuracy_m=point_data.get('accuracy_m'),
                altitude=point_data.get('altitude'),
                speed=point_data.get('speed'),
                recorded_at=point_data.get('recorded_at', timezone.now())
            )
            created_points.append(track_point)

        serializer = PuntoRastreoSerializer(created_points, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LastPositionView(APIView):
    """Obtener últimas posiciones de usuarios"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        incident_id = request.query_params.get('incident_id')

        # Obtener último trackpoint por usuario
        if incident_id:
            queryset = PuntoRastreo.objects.filter(incident_id=incident_id)
        else:
            queryset = PuntoRastreo.objects.all()

        # Obtener el más reciente por usuario
        latest_ids = queryset.order_by(
            'user_id',
            '-recorded_at',
            '-created_at',
        ).distinct('user_id').values('id')

        points = PuntoRastreo.objects.filter(id__in=latest_ids).select_related('user')
        serializer = PuntoRastreoSerializer(points, many=True)
        return Response(serializer.data)


class RouteView(APIView):
    """Obtener ruta de un usuario en un incidente"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.query_params.get('user_id')
        incident_id = request.query_params.get('incident_id')
        date = request.query_params.get('date')

        if not user_id or not incident_id:
            return Response(
                {'error': 'user_id and incident_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = PuntoRastreo.objects.filter(
            user_id=user_id,
            incident_id=incident_id
        ).order_by('recorded_at')

        if date:
            queryset = queryset.filter(recorded_at__date=date)

        limit = _get_route_limit(request)
        queryset = list(queryset.order_by('-recorded_at')[:limit])
        queryset.reverse()

        serializer = PuntoRastreoSerializer(queryset, many=True)
        return Response(serializer.data)


class IncidentTrackingView(APIView):
    """Obtener todos los trackpoints de un incidente"""
    permission_classes = [IsAuthenticated]

    def get(self, request, incident_id):
        # Verificar que el usuario tiene acceso al incidente
        try:
            incident = Incidente.objects.get(id=incident_id)
        except Incidente.DoesNotExist:
            return Response(
                {'error': 'Incident not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        limit = _get_route_limit(request)
        points = list(PuntoRastreo.objects.filter(
            incident=incident
        ).select_related('user').order_by('-recorded_at')[:limit])
        points.reverse()

        serializer = PuntoRastreoSerializer(points, many=True)
        return Response(serializer.data)
