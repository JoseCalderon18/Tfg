from django.contrib.gis.geos import Point
from rest_framework import serializers

from emergency.apps.core.models import Journey


class JourneySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    account_user_id = serializers.UUIDField(source="user.user.id", read_only=True)

    class Meta:
        model = Journey
        fields = [
            "id",
            "created_at",
            "user",
            "user_id",
            "account_user_id",
            "start_date",
            "end_date",
            "location_start",
            "location_stop",
            "notes",
        ]
        read_only_fields = ["id", "created_at", "user", "user_id", "account_user_id"]


class JourneyCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = Journey
        fields = [
            "id",
            "created_at",
            "user",
            "start_date",
            "end_date",
            "location_start",
            "location_stop",
            "notes",
            "latitude",
            "longitude",
        ]
        read_only_fields = ["id", "created_at", "user"]

    def create(self, validated_data):
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)

        if latitude is not None and longitude is not None and "location_start" not in validated_data:
            validated_data["location_start"] = Point(longitude, latitude, srid=4326)

        return Journey.objects.create(**validated_data)
