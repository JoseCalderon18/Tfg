from django.contrib.gis.geos import Point
from rest_framework import serializers

from emergency.apps.core.location_utils import obtener_direccion_legible
from emergency.apps.core.models import PointOfInterest


class PointOfInterestSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    incident_name = serializers.CharField(source="incident.name", read_only=True)
    latitude = serializers.FloatField(source="location.y", read_only=True)
    longitude = serializers.FloatField(source="location.x", read_only=True)
    location_address = serializers.SerializerMethodField()

    def get_location_address(self, obj):
        location = getattr(obj, "location", None)
        if not location:
            return ""

        try:
            return obtener_direccion_legible(location.y, location.x)
        except Exception:
            return ""

    class Meta:
        model = PointOfInterest
        fields = [
            "id",
            "name",
            "poi_type",
            "description",
            "incident",
            "incident_name",
            "created_by",
            "created_by_username",
            "is_active",
            "created_at",
            "updated_at",
            "latitude",
            "longitude",
            "location_address",
            "location",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "incident_name",
            "latitude",
            "longitude",
            "location_address",
            "location",
        ]


class PointOfInterestCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = PointOfInterest
        fields = [
            "name",
            "poi_type",
            "description",
            "incident",
            "latitude",
            "longitude",
        ]

    def create(self, validated_data):
        latitude = validated_data.pop("latitude")
        longitude = validated_data.pop("longitude")
        validated_data["location"] = Point(longitude, latitude, srid=4326)
        validated_data["created_by"] = self.context["request"].user
        return PointOfInterest.objects.create(**validated_data)

    def update(self, instance, validated_data):
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)

        if latitude is not None and longitude is not None:
            instance.location = Point(longitude, latitude, srid=4326)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance
