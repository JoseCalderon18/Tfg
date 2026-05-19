from rest_framework import serializers

from emergency.apps.core.models import Auditoria, User


class AuditoriaSerializer(serializers.ModelSerializer):
    created_username = serializers.SerializerMethodField()

    class Meta:
        model = Auditoria
        fields = ["id", "created_at", "description", "created_id", "created_username"]

    def get_created_username(self, obj):
        if not obj.created_id:
            return None

        user = User.objects.filter(id=obj.created_id).only("username", "email").first()
        if user is None:
            return None

        return user.username or user.email
