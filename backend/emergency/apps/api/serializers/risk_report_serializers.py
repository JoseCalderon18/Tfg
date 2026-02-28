from rest_framework import serializers
from emergency.apps.core.models import RiskReport


class RiskReportSerializer(serializers.ModelSerializer):
    """Serializer para leer reportes de riesgo"""
    reported_by = serializers.StringRelatedField()

    class Meta:
        model = RiskReport
        fields = [
            'id', 'incident', 'reported_by', 'location',
            'description', 'severity', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reported_by', 'created_at', 'updated_at'
        ]


class RiskReportCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear reportes de riesgo"""
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = RiskReport
        fields = [
            'incident', 'description', 'severity',
            'latitude', 'longitude'
        ]

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        validated_data['location'] = Point(longitude, latitude, srid=4326)
        validated_data['reported_by'] = self.context['request'].user
        return RiskReport.objects.create(**validated_data)
