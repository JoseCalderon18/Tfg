from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.contrib.gis.geos import Point
from django.utils import timezone

from emergency.apps.core.models import PuntoRastreo, Incidente
from ..serializers import PuntoRastreoSerializer, PuntoRastreoCreateSerializer
from emergency.apps.core.models import UltimaPosicion
from django.contrib.gis.geos import Point as GeoPoint


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
        latest_ids = queryset.values('user').annotate(
            max_id=models.Max('id')
        ).values('max_id')

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

        points = PuntoRastreo.objects.filter(
            incident=incident
        ).select_related('user').order_by('recorded_at')

        serializer = PuntoRastreoSerializer(points, many=True)
        return Response(serializer.data)


class LocationPublishView(APIView):
    """Endpoint para que el cliente publique su ubicación (y actualizar UltimaPosicion)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        # Aceptamos payload con latitude/longitude o lat/lng
        latitude = data.get('latitude') if data.get('latitude') is not None else data.get('lat')
        longitude = data.get('longitude') if data.get('longitude') is not None else data.get('lng')
        incident_id = data.get('incident_id') or data.get('incident')

        if latitude is None or longitude is None:
            return Response({'error': 'latitude and longitude required'}, status=status.HTTP_400_BAD_REQUEST)

        # Crear PuntoRastreo usando el serializer existente
        serializer = PuntoRastreoCreateSerializer(data={
            'latitude': latitude,
            'longitude': longitude,
            'accuracy_m': data.get('accuracy'),
            'altitude': data.get('altitude'),
            'speed': data.get('speed'),
            'recorded_at': data.get('timestamp'),
            'incident': incident_id,
        }, context={'request': request})

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        track_point = serializer.save()

        # Actualizar UltimaPosicion
        try:
            point = GeoPoint(float(longitude), float(latitude), srid=4326)
        except Exception:
            point = None

        UltimaPosicion.objects.update_or_create(
            user=request.user,
            defaults={
                'incident_id': incident_id,
                'location': point,
                'accuracy_m': data.get('accuracy'),
                'altitude': data.get('altitude'),
                'speed': data.get('speed'),
                'heading': data.get('heading'),
            }
        )

        # Broadcast via channels if available (optional)
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer and incident_id:
                message = {
                    'type': 'position.update',
                    'payload': {
                        'user_id': str(request.user.id),
                        'display_name': getattr(request.user, 'username', '') or '',
                        'incident_id': incident_id,
                        'latitude': float(latitude),
                        'longitude': float(longitude),
                        'accuracy': data.get('accuracy'),
                        'speed': data.get('speed'),
                        'heading': data.get('heading'),
                        'timestamp': data.get('timestamp'),
                    }
                }
                async_to_sync(channel_layer.group_send)(f'incident:{incident_id}:locations', message)
        except Exception:
            # no bloquear en caso de fallo en el envío al canal
            pass

        return Response({'status': 'ok', 'id': str(track_point.id)})
