from rest_framework import serializers
from emergency.apps.core.models import RiskReport


class RiskReportSerializer(serializers.ModelSerializer):
    """Serializer para leer reportes de riesgo"""
    reported_by = serializers.StringRelatedField()
    reported_by_id = serializers.UUIDField(source="reported_by.id", read_only=True)
    incident_name = serializers.CharField(source="incident.name", read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = RiskReport
        fields = [
            'id', 'incident', 'incident_name', 'reported_by', 'reported_by_id', 'location',
            'latitude', 'longitude',
            'description', 'severity', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reported_by', 'created_at', 'updated_at'
        ]

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class RiskReportCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear reportes de riesgo"""
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)
    lat = serializers.FloatField(write_only=True, required=False)
    lng = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = RiskReport
        fields = [
            'incident', 'description', 'severity',
            'latitude', 'longitude', 'lat', 'lng'
        ]

    def validate(self, attrs):
        latitude = attrs.pop('latitude', None)
        longitude = attrs.pop('longitude', None)
        lat = attrs.pop('lat', None)
        lng = attrs.pop('lng', None)

        resolved_latitude = latitude if latitude is not None else lat
        resolved_longitude = longitude if longitude is not None else lng

        if resolved_latitude is None or resolved_longitude is None:
            raise serializers.ValidationError(
                {'location': 'Debes proporcionar latitude/longitude o lat/lng.'}
            )

        attrs['latitude'] = resolved_latitude
        attrs['longitude'] = resolved_longitude
        return attrs

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        validated_data['location'] = Point(longitude, latitude, srid=4326)
        validated_data['reported_by'] = self.context['request'].user
        return RiskReport.objects.create(**validated_data)
