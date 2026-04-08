from rest_framework import serializers

from emergency.apps.core.models import Journey


class JourneySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = Journey
        fields = [
            "id",
            "created_at",
            "user",
            "user_id",
            "start_date",
            "end_date",
            "location_start",
            "location_stop",
            "notes",
        ]
        read_only_fields = ["id", "created_at", "user", "user_id"]


class JourneyCreateSerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = ["id", "created_at", "user"]
