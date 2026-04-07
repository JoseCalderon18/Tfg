from rest_framework import serializers
from emergency.apps.core.models import WorkArea


class WorkAreaSerializer(serializers.ModelSerializer):
    """Serializer de áreas de trabajo"""

    incident_name = serializers.CharField(source="incident.name", read_only=True)
    center_lat = serializers.FloatField(source="center.y", read_only=True)
    center_lng = serializers.FloatField(source="center.x", read_only=True)
    polygon_coordinates = serializers.SerializerMethodField()

    class Meta:
        model = WorkArea
        fields = [
            "id",
            "name",
            "area_type",
            "center",
            "center_lat",
            "center_lng",
            "radius_m",
            "polygon",
            "polygon_coordinates",
            "active",
            "created_at",
            "incident",
            "incident_name",
        ]
        read_only_fields = fields

    def get_polygon_coordinates(self, obj):
        if not obj.polygon:
            return None

        try:
            return obj.polygon.coords
        except Exception:
            return None
