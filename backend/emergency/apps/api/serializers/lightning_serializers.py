from rest_framework import serializers
from emergency.apps.core.models import LightningStrike


class LightningStrikeSerializer(serializers.ModelSerializer):
    """Serializer para rayos detectados"""

    lat = serializers.SerializerMethodField()
    lon = serializers.SerializerMethodField()

    class Meta:
        model = LightningStrike
        fields = [
            'id', 'lat', 'lon', 'timestamp', 'intensity', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_lat(self, obj):
        """Obtener latitud del punto"""
        return obj.location.y

    def get_lon(self, obj):
        """Obtener longitud del punto"""
        return obj.location.x


class LightningStrikeListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de rayos"""

    lat = serializers.SerializerMethodField()
    lon = serializers.SerializerMethodField()

    class Meta:
        model = LightningStrike
        fields = ['lat', 'lon', 'timestamp', 'intensity']

    def get_lat(self, obj):
        return obj.location.y

    def get_lon(self, obj):
        return obj.location.x