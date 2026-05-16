from django.contrib.gis.geos import Point
from rest_framework import serializers

from emergency.apps.core.models import (
    AuditoriaUbicacion,
    ConsumoRecursos,
    EstadoUnidad,
    Unidad,
)


class UnitUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)


class EstadoUnidadSerializer(serializers.ModelSerializer):
    driver = UnitUserSerializer(read_only=True)
    created_by = UnitUserSerializer(read_only=True)

    class Meta:
        model = EstadoUnidad
        fields = [
            "id",
            "unit",
            "status_anterior",
            "status_nuevo",
            "driver",
            "razon",
            "created_by",
            "created_at",
        ]


class ConsumoRecursosSerializer(serializers.ModelSerializer):
    fuel_consumption_rate = serializers.FloatField(read_only=True)
    battery_consumption_rate = serializers.FloatField(read_only=True)
    estimated_range = serializers.FloatField(read_only=True, allow_null=True)

    class Meta:
        model = ConsumoRecursos
        fields = [
            "id",
            "unit",
            "fuel_level",
            "battery_level",
            "fuel_consumed_since_last",
            "distance_km",
            "duration_minutes",
            "fuel_consumption_rate",
            "battery_consumption_rate",
            "estimated_range",
            "created_at",
        ]


class AuditoriaUbicacionSerializer(serializers.ModelSerializer):
    location_lat = serializers.SerializerMethodField()
    location_lng = serializers.SerializerMethodField()

    class Meta:
        model = AuditoriaUbicacion
        fields = [
            "id",
            "unit",
            "location_lat",
            "location_lng",
            "accuracy_m",
            "altitude",
            "speed",
            "heading",
            "recorded_at",
            "created_at",
        ]

    def get_location_lat(self, obj):
        return obj.location.y if obj.location else None

    def get_location_lng(self, obj):
        return obj.location.x if obj.location else None


class UnidadListSerializer(serializers.ModelSerializer):
    driver = UnitUserSerializer(read_only=True)
    consumption_alert = serializers.ListField(child=serializers.CharField(), read_only=True)
    location_lat = serializers.SerializerMethodField()
    location_lng = serializers.SerializerMethodField()

    class Meta:
        model = Unidad
        fields = [
            "id",
            "organization",
            "name",
            "type",
            "vehicle_id",
            "status",
            "driver",
            "location_lat",
            "location_lng",
            "fuel_level",
            "battery_level",
            "total_mileage",
            "is_active",
            "consumption_alert",
            "created_at",
            "updated_at",
        ]

    def get_location_lat(self, obj):
        return obj.current_location.y if obj.current_location else None

    def get_location_lng(self, obj):
        return obj.current_location.x if obj.current_location else None


class UnidadDetailSerializer(UnidadListSerializer):
    status_history = EstadoUnidadSerializer(many=True, read_only=True)
    recent_consumption = serializers.SerializerMethodField()
    location_history = serializers.SerializerMethodField()

    class Meta(UnidadListSerializer.Meta):
        fields = UnidadListSerializer.Meta.fields + [
            "status_history",
            "recent_consumption",
            "location_history",
        ]

    def get_recent_consumption(self, obj):
        records = obj.consumption_records.all()[:10]
        return ConsumoRecursosSerializer(records, many=True).data

    def get_location_history(self, obj):
        records = obj.location_audit.all()[:20]
        return AuditoriaUbicacionSerializer(records, many=True).data


class UnidadCreateUpdateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = Unidad
        fields = [
            "id",
            "organization",
            "name",
            "type",
            "vehicle_id",
            "status",
            "driver",
            "fuel_level",
            "battery_level",
            "total_mileage",
            "is_active",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "created_at", "updated_at"]

    def _apply_location(self, validated_data):
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)
        if latitude is not None and longitude is not None:
            validated_data["current_location"] = Point(longitude, latitude, srid=4326)

    def create(self, validated_data):
        self._apply_location(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._apply_location(validated_data)
        return super().update(instance, validated_data)


class CambioEstadoUnidadSerializer(serializers.Serializer):
    status_nuevo = serializers.ChoiceField(choices=Unidad.STATUS_CHOICES)
    driver = serializers.UUIDField(required=False, allow_null=True)
    razon = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)


class ConsumoRecursosCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsumoRecursos
        fields = [
            "fuel_level",
            "battery_level",
            "fuel_consumed_since_last",
            "distance_km",
            "duration_minutes",
        ]


class UnidadStatsSerializer(serializers.Serializer):
    total_units = serializers.IntegerField()
    available_units = serializers.IntegerField()
    units_in_transit = serializers.IntegerField()
    units_in_maintenance = serializers.IntegerField()
    offline_units = serializers.IntegerField()
    units_low_fuel = serializers.IntegerField()
    units_low_battery = serializers.IntegerField()
    average_fuel_level = serializers.FloatField()
    average_battery_level = serializers.FloatField()
