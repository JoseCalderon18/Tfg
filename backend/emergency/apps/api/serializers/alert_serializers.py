from rest_framework import serializers
from emergency.apps.core.models import Alert


class AlertSerializer(serializers.ModelSerializer):
    """Serializer para leer alertas"""
    created_by = serializers.StringRelatedField()

    class Meta:
        model = Alert
        fields = [
            'id', 'created_by', 'incident', 'alert_type',
            'severity', 'status', 'title', 'description',
            'location', 'acked_by', 'acked_at', 'ack_notes',
            'closed_by', 'closed_at', 'close_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'acked_by', 'closed_by',
            'created_at', 'updated_at'
        ]


class AlertCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear alertas"""
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = Alert
        fields = [
            'incident', 'alert_type', 'severity',
            'title', 'description', 'latitude', 'longitude'
        ]

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        location = Point(longitude, latitude, srid=4326)
        validated_data['location'] = location
        validated_data['created_by'] = self.context['request'].user
        return Alert.objects.create(**validated_data)


class AlertAckSerializer(serializers.Serializer):
    """Serializer para reconocer una alerta"""
    ack_notes = serializers.CharField(required=False, allow_blank=True)


class AlertCloseSerializer(serializers.Serializer):
    """Serializer para cerrar una alerta"""
    close_notes = serializers.CharField(required=False, allow_blank=True)
