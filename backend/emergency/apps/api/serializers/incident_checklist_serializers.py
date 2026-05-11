from rest_framework import serializers

from emergency.apps.core.models import IncidentChecklist


class IncidentChecklistSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_username = serializers.CharField(source="user.user.username", read_only=True)
    user_name = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = IncidentChecklist
        fields = [
            "id",
            "created_at",
            "checklist",
            "user_id",
            "user_username",
            "user_name",
            "incident",
            "is_completed",
        ]
        read_only_fields = ["id", "created_at", "user_id", "user_username", "user_name", "incident"]

    def get_user_name(self, obj):
        profile = getattr(obj, "user", None)
        account = getattr(profile, "user", None)
        if account is None:
            return "Usuario"
        full_name = f"{getattr(account, 'first_name', '')} {getattr(account, 'last_name', '')}".strip()
        return full_name or getattr(account, "username", "Usuario")

    def get_is_completed(self, obj):
        return int(getattr(obj, "is_completed", 0) or 0)


class IncidentChecklistCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentChecklist
        fields = ["checklist"]

    def validate_checklist(self, value):
        text = str(value).strip()
        if not text:
            raise serializers.ValidationError("El checklist no puede estar vacio.")
        return text
