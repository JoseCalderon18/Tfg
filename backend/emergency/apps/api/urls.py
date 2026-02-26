from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.urls import path
from emergency.apps.api.views.auth_views import (
    RegisterView, CurrentUserView, ProfileView,
    PanelLoginView, PanelLogoutView, PanelMeView
)

# Importamos los módulos de vistas
from .views import (
    auth_views,
    tracking_views,
    alert_views,
    incident_views,
    user_views,
)

app_name = 'api'

# Router para ViewSets - Registra automáticamente rutas CRUD
router = DefaultRouter()
router.register(r'incidents', incident_views.IncidentViewSet, basename='incident')
router.register(r'alerts', alert_views.AlertaViewSet, basename='alert')
router.register(r'users', user_views.UserViewSet, basename='user')
router.register(r'organizations', user_views.OrganizationViewSet, basename='organization')

# Definición de URLs de la API
urlpatterns = [
    # Auth endpoints adicionales (registro, perfil, etc.)
    path('auth/register/', auth_views.RegisterView.as_view(), name='register'),
    path('auth/me/', auth_views.CurrentUserView.as_view(), name='current_user'),
    path('auth/me/profile/', auth_views.ProfileView.as_view(), name='profile'),

    # Tracking endpoints - Gestión de ubicación GPS
    path('tracking/point/', tracking_views.PuntoRastreoCreateView.as_view(), name='tracking_point'),
    path('tracking/batch/', tracking_views.PuntoRastreoBatchCreateView.as_view(), name='tracking_batch'),
    path('tracking/last/', tracking_views.LastPositionView.as_view(), name='tracking_last'),
    path('tracking/route/', tracking_views.RouteView.as_view(), name='tracking_route'),
    path(
        'tracking/incident/<uuid:incident_id>/',
        tracking_views.IncidentTrackingView.as_view(),
        name='tracking_incident'
    ),

    # Router URLs - Incluye rutas automáticas de ViewSets
    path('', include(router.urls)),

    # API general (JWT)
    path("auth/register/", RegisterView.as_view()),
    path("auth/me/", CurrentUserView.as_view()),
    path("auth/me/profile/", ProfileView.as_view()),

    # Panel web (sesión)
    path("auth/panel/login/", PanelLoginView.as_view()),
    path("auth/panel/logout/", PanelLogoutView.as_view()),
    path("auth/panel/me/", PanelMeView.as_view()),
]
