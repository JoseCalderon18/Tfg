from rest_framework import serializers
from django.contrib.gis.geos import Point

from emergency.apps.core.models import (
    Profile, Organization, Incident, IncidentMember,
    TrackPoint, Alert, Device, RiskCell
)
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer básico de usuario"""
    role = serializers.CharField(source='profile.role', read_only=True)
    organization_name = serializers.CharField(source='profile.organization.name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'organization_name', 'phone', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios"""
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=Profile.ROLES, write_only=True)
    organization_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name',
                  'phone', 'role', 'organization_id']

    def create(self, validated_data):
        role = validated_data.pop('role', 'OPERATIVE')
        organization_id = validated_data.pop('organization_id', None)

        user = User.objects.create_user(**validated_data)

        # Crear perfil
        profile_data = {'role': role}
        if organization_id:
            try:
                org = Organization.objects.get(id=organization_id)
                profile_data['organization'] = org
            except Organization.DoesNotExist:
                pass

        Profile.objects.create(user=user, **profile_data)

        return user


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer de perfil"""
    user = UserSerializer(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'role', 'organization', 'organization_name',
                  'emergency_contact', 'emergency_phone', 'medical_notes']


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer de organización"""
    member_count = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model = Organization
        fields = ['id', 'name', 'org_type', 'contact_email', 'contact_phone',
                  'address', 'is_active', 'member_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class IncidentMemberSerializer(serializers.ModelSerializer):
    """Serializer para miembros de incidente"""
    user = UserSerializer(read_only=True)

    class Meta:
        model = IncidentMember
        fields = ['id', 'user', 'role_in_incident', 'joined_at', 'left_at', 'is_active']


class IncidentSerializer(serializers.ModelSerializer):
    """Serializer de incidente"""
    created_by = UserSerializer(read_only=True)
    owner_organization = OrganizationSerializer(read_only=True)
    members = IncidentMemberSerializer(source='incident_members', many=True, read_only=True)
    location_lat = serializers.FloatField(source='location.y', read_only=True)
    location_lng = serializers.FloatField(source='location.x', read_only=True)
    alert_count = serializers.IntegerField(source='alerts.count', read_only=True)

    class Meta:
        model = Incident
        fields = ['id', 'name', 'incident_type', 'status', 'description',
                  'location', 'location_lat', 'location_lng', 'location_address',
                  'created_by', 'owner_organization', 'members', 'alert_count',
                  'started_at', 'ended_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class IncidentCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear incidentes"""
    location_lat = serializers.FloatField(required=False, allow_null=True)
    location_lng = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Incident
        fields = ['name', 'incident_type', 'description', 'location_lat', 'location_lng', 'location_address']

    def create(self, validated_data):
        lat = validated_data.pop('location_lat', None)
        lng = validated_data.pop('location_lng', None)

        if lat is not None and lng is not None:
            validated_data['location'] = Point(lng, lat, srid=4326)

        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TrackPointSerializer(serializers.ModelSerializer):
    """Serializer de punto de tracking"""
    lat = serializers.FloatField(source='location.y', read_only=True)
    lng = serializers.FloatField(source='location.x', read_only=True)

    class Meta:
        model = TrackPoint
        fields = ['id', 'user', 'incident', 'lat', 'lng', 'accuracy_m',
                  'altitude', 'speed', 'recorded_at']
        read_only_fields = ['id', 'user']


class TrackPointCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear puntos de tracking"""
    lat = serializers.FloatField()
    lng = serializers.FloatField()

    class Meta:
        model = TrackPoint
        fields = ['incident', 'lat', 'lng', 'accuracy_m', 'altitude', 'speed', 'recorded_at']

    def create(self, validated_data):
        lat = validated_data.pop('lat')
        lng = validated_data.pop('lng')
        validated_data['location'] = Point(lng, lat, srid=4326)
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class AlertSerializer(serializers.ModelSerializer):
    """Serializer de alerta"""
    created_by = UserSerializer(read_only=True)
    acked_by = UserSerializer(read_only=True)
    closed_by = UserSerializer(read_only=True)
    lat = serializers.FloatField(source='location.y', read_only=True)
    lng = serializers.FloatField(source='location.x', read_only=True)

    class Meta:
        model = Alert
        fields = ['id', 'incident', 'created_by', 'alert_type', 'severity',
                  'status', 'title', 'description', 'lat', 'lng',
                  'acked_by', 'acked_at', 'ack_notes',
                  'closed_by', 'closed_at', 'close_notes',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class AlertCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear alertas"""
    lat = serializers.FloatField()
    lng = serializers.FloatField()

    class Meta:
        model = Alert
        fields = ['incident', 'alert_type', 'severity', 'title', 'description', 'lat', 'lng']

    def create(self, validated_data):
        lat = validated_data.pop('lat')
        lng = validated_data.pop('lng')
        validated_data['location'] = Point(lng, lat, srid=4326)
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AlertAckSerializer(serializers.ModelSerializer):
    """Serializer para reconocer alertas"""
    class Meta:
        model = Alert
        fields = ['ack_notes']


class AlertCloseSerializer(serializers.ModelSerializer):
    """Serializer para cerrar alertas"""
    class Meta:
        model = Alert
        fields = ['close_notes']


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer de dispositivo"""
    class Meta:
        model = Device
        fields = ['id', 'fcm_token', 'device_name', 'platform', 'is_active', 'last_used']
        read_only_fields = ['id', 'last_used']


class RiskCellSerializer(serializers.ModelSerializer):
    """Serializer de celda de riesgo"""
    class Meta:
        model = RiskCell
        fields = ['id', 'incident', 'cell', 'trackpoint_count', 'alert_count',
                  'risk_score', 'last_activity', 'calculated_at']
        read_only_fields = ['id', 'calculated_at']
