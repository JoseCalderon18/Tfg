from rest_framework import serializers
from emergency.apps.core.models import Incident, IncidentMember


class IncidentMemberSerializer(serializers.ModelSerializer):
    """Serializer para leer miembros de incidente"""
    user = serializers.StringRelatedField()

    class Meta:
        model = IncidentMember
        fields = [
            'id', 'user', 'incident', 'role_in_incident',
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

    class Meta:
        model = Incident
        fields = [
            'id', 'name', 'incident_type', 'status', 'description',
            'location', 'location_address', 'created_by',
            'owner_organization', 'started_at', 'ended_at',
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

        if latitude and longitude:
            from django.contrib.gis.geos import Point
            validated_data['location'] = Point(longitude, latitude, srid=4326)

        validated_data['created_by'] = self.context['request'].user
        return Incident.objects.create(**validated_data)
