from rest_framework import serializers
from emergency.apps.core.models import Incident, IncidentMember


class IncidentAssignmentUserSerializer(serializers.Serializer):
    """Datos minimos del usuario que necesita el modal de asignaciones."""

    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(source="profile.role", read_only=True)
    organization_id = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source="profile.organization.name", read_only=True)

    def get_organization_id(self, obj):
        profile = getattr(obj, "profile", None)
        return str(getattr(profile, "organization_id", "") or "")


class IncidentMemberSerializer(serializers.ModelSerializer):
    """Serializer para leer miembros de incidente"""
    user = serializers.StringRelatedField()
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_detail = IncidentAssignmentUserSerializer(source="user", read_only=True)
    role = serializers.CharField(source="role_in_incident", read_only=True)

    class Meta:
        model = IncidentMember
        fields = [
            'id', 'user', 'user_id', 'user_detail', 'incident', 'role_in_incident', 'role',
            'joined_at', 'left_at', 'is_active'
        ]
        read_only_fields = fields


class IncidentMemberCreateSerializer(serializers.ModelSerializer):
    """Serializer para agregar miembros a un incidente"""

    class Meta:
        model = IncidentMember
        fields = ['user', 'role_in_incident']


class IncidentSerializer(serializers.ModelSerializer):
    """Serializer para leer incidentes"""
    created_by = serializers.StringRelatedField()
    owner_organization = serializers.StringRelatedField()
    owner_organization_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'name', 'incident_type', 'status', 'description',
            'location', 'location_address', 'created_by',
            'owner_organization', 'owner_organization_id', 'started_at', 'ended_at',
            'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'created_by', 'started_at', 'created_at', 'updated_at'
        ]


class IncidentCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear incidentes"""
    latitude = serializers.FloatField(required=False, write_only=True)
    longitude = serializers.FloatField(required=False, write_only=True)

    class Meta:
        model = Incident
        fields = [
            'name', 'incident_type', 'status', 'description',
            'location_address', 'latitude', 'longitude',
            'owner_organization'
        ]

    def create(self, validated_data):
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)

        if latitude is not None and longitude is not None:
            from django.contrib.gis.geos import Point
            validated_data['location'] = Point(longitude, latitude, srid=4326)

        validated_data['created_by'] = self.context['request'].user
        return Incident.objects.create(**validated_data)
