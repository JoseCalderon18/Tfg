from rest_framework import serializers
from emergency.apps.core.models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer para leer organizaciones"""
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    incident_count = serializers.IntegerField(source='incidents.count', read_only=True)
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'org_type', 'contact_email',
            'contact_phone', 'address', 'is_active',
            'created_at', 'updated_at', 'member_count', 'incident_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrganizationCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear organizaciones"""

    class Meta:
        model = Organization
        fields = [
            'name', 'org_type', 'contact_email',
            'contact_phone', 'address', 'is_active'
        ]
