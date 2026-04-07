from django.contrib.gis.geos import LinearRing, Point, Polygon
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


class WorkAreaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear areas de trabajo"""

    center_lat = serializers.FloatField(required=False, write_only=True)
    center_lng = serializers.FloatField(required=False, write_only=True)
    polygon_points = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2),
        required=False,
        write_only=True,
    )

    class Meta:
        model = WorkArea
        fields = [
            "incident",
            "name",
            "area_type",
            "center_lat",
            "center_lng",
            "radius_m",
            "polygon_points",
            "active",
        ]

    def validate(self, attrs):
        area_type = attrs.get("area_type")
        center_lat = attrs.get("center_lat")
        center_lng = attrs.get("center_lng")
        radius_m = attrs.get("radius_m")
        polygon_points = attrs.get("polygon_points") or []

        if area_type == "CIRCLE":
            if center_lat is None or center_lng is None:
                raise serializers.ValidationError("Debes indicar el centro del circulo en el mapa.")
            if radius_m is None or radius_m <= 0:
                raise serializers.ValidationError("Debes indicar un radio mayor que 0 metros.")

        if area_type == "POLYGON":
            if len(polygon_points) < 3:
                raise serializers.ValidationError("Debes marcar al menos 3 puntos para el poligono.")

        return attrs

    def create(self, validated_data):
        center_lat = validated_data.pop("center_lat", None)
        center_lng = validated_data.pop("center_lng", None)
        polygon_points = validated_data.pop("polygon_points", [])

        area_type = validated_data.get("area_type")
        validated_data["center"] = None
        validated_data["polygon"] = None

        if area_type == "CIRCLE":
            validated_data["center"] = Point(center_lng, center_lat, srid=4326)
            validated_data["polygon"] = None
        elif area_type == "POLYGON":
            coords = [(lng, lat) for lat, lng in polygon_points]
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            ring = LinearRing(coords)
            validated_data["polygon"] = Polygon(ring, srid=4326)
            validated_data["center"] = None
            validated_data["radius_m"] = None

        return WorkArea.objects.create(**validated_data)
