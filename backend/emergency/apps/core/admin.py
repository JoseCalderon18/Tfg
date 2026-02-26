from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    User, Perfil, Profile, Organizacion, Organization,
    Incidente, Incident, Alerta, Alert,
    Dispositivo, Device,
    PuntoRastreo, TrackPoint, IncidentMember, AreaTrabajo, WorkArea,
    RiskReport
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['username', 'email']


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'organization', 'created_at']
    list_filter = ['role', 'organization']
    search_fields = ['user__username', 'user__email']


@admin.register(Organizacion)
class OrganizacionAdmin(admin.ModelAdmin):
    list_display = ['name', 'org_type', 'is_active', 'created_at']
    list_filter = ['org_type', 'is_active']
    search_fields = ['name']


@admin.register(Incidente)
class IncidenteAdmin(GISModelAdmin):
    list_display = ['name', 'incident_type', 'status', 'created_by', 'started_at']
    list_filter = ['incident_type', 'status', 'started_at']
    search_fields = ['name', 'description']
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 12,
            'map_width': 800,
            'map_height': 600,
        }
    }


@admin.register(IncidentMember)
class IncidentMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'incident', 'role_in_incident', 'joined_at', 'is_active']
    list_filter = ['role_in_incident', 'is_active']
    search_fields = ['user__username', 'incident__name']


@admin.register(PuntoRastreo)
class PuntoRastreoAdmin(GISModelAdmin):
    list_display = ['user', 'incident', 'recorded_at', 'accuracy_m']
    list_filter = ['recorded_at']
    search_fields = ['user__username']
    date_hierarchy = 'recorded_at'


@admin.register(Alerta)
class AlertaAdmin(GISModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'status', 'created_by', 'created_at']
    list_filter = ['alert_type', 'status', 'severity', 'created_at']
    search_fields = ['title', 'description', 'created_by__username']
    date_hierarchy = 'created_at'


@admin.register(Dispositivo)
class DispositivoAdmin(admin.ModelAdmin):
    list_display = ['user', 'device_name', 'platform', 'is_active', 'last_used']
    list_filter = ['platform', 'is_active']
    search_fields = ['user__username', 'device_name']


@admin.register(RiskReport)
class RiskReportAdmin(GISModelAdmin):
    list_display = ['incident', 'reported_by', 'severity', 'is_active', 'created_at']
    list_filter = ['severity', 'is_active', 'created_at']
    search_fields = ['incident__name', 'description', 'reported_by__username']
    date_hierarchy = 'created_at'


@admin.register(AreaTrabajo)
class AreaTrabajoAdmin(GISModelAdmin):
    list_display = ['name','incident','area_type','active','created_at']
    list_filter = ['area_type','active','created_at']
    search_fields = ['name','incident__name']
    gis_widget_kwargs = {'attrs': {'default_zoom': 13,'map_width': 800,'map_height': 500,}}
