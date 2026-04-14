from rest_framework import serializers

from emergency.apps.core.models import IncidentMessage


class IncidentMessageSerializer(serializers.ModelSerializer):
    author_id = serializers.UUIDField(source="profile.user.id", read_only=True)
    author_username = serializers.CharField(source="profile.user.username", read_only=True)
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = IncidentMessage
        fields = [
            "id",
            "incident",
            "author_id",
            "author_username",
            "author_name",
            "author_role",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "incident",
            "author_id",
            "author_username",
            "author_name",
            "author_role",
            "created_at",
            "updated_at",
        ]

    def get_author_name(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile:
            return getattr(getattr(obj, "profile", None), "user", None) and obj.profile.user.username or "Usuario"
        full_name = f"{getattr(profile, 'name', '')} {getattr(profile, 'lastname', '')}".strip()
        return full_name or getattr(profile.user, "username", "Usuario")

    def get_author_role(self, obj):
        profile = getattr(obj, "profile", None)
        return getattr(profile, "role", None)

    def get_updated_at(self, obj):
        return obj.created_at


class IncidentMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentMessage
        fields = ["content"]

    def validate_content(self, value):
        text = str(value).strip()
        if not text:
            raise serializers.ValidationError("El mensaje no puede estar vacio.")
        return text
