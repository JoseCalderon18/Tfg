from rest_framework import serializers
from emergency.apps.core.models import IncidentMember, TrackPoint


class TrackPointSerializer(serializers.ModelSerializer):
    """Serializer para leer puntos de tracking"""
    user = serializers.StringRelatedField()
    incident = serializers.StringRelatedField()

    class Meta:
        model = TrackPoint
        fields = [
            'id', 'user', 'incident', 'location',
            'accuracy_m', 'altitude', 'speed',
            'recorded_at', 'created_at'
        ]
        read_only_fields = fields


class TrackPointCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear puntos de tracking"""
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = TrackPoint
        fields = [
            'latitude', 'longitude', 'accuracy_m',
            'altitude', 'speed', 'recorded_at', 'incident'
        ]

    def _get_active_incident_for_user(self, user):
        membership = (
            IncidentMember.objects.select_related('incident')
            .filter(user=user, is_active=True, incident__status='OPEN')
            .order_by('-joined_at')
            .first()
        )
        return membership.incident if membership else None

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        location = Point(longitude, latitude, srid=4326)
        request = self.context.get('request')
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            validated_data['user'] = request.user
            if not validated_data.get('incident'):
                active_incident = self._get_active_incident_for_user(request.user)
                if active_incident:
                    validated_data['incident'] = active_incident
        return TrackPoint.objects.create(location=location, **validated_data)
