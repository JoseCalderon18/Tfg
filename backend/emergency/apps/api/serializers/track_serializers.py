from rest_framework import serializers
from emergency.apps.core.models import TrackPoint


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

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        location = Point(longitude, latitude, srid=4326)
        return TrackPoint.objects.create(location=location, **validated_data)
