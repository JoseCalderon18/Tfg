from django.urls import include, path
from rest_framework.routers import DefaultRouter

from emergency.apps.api.views.auth_views import (
    CurrentUserView,
    PanelCreateOperativeUserView,
    PanelLoginView,
    PanelLogoutView,
    PanelMeView,
    PanelUsersListView,
    ProfileView,
    RegisterView,
)

from .views import alert_views, auth_views, incident_views, tracking_views, user_views

app_name = "api"

router = DefaultRouter()
router.register(r"incidents", incident_views.IncidentViewSet, basename="incident")
router.register(r"alerts", alert_views.AlertaViewSet, basename="alert")
router.register(r"users", user_views.UserViewSet, basename="user")
router.register(r"organizations", user_views.OrganizationViewSet, basename="organization")

urlpatterns = [
    path("auth/register/", auth_views.RegisterView.as_view(), name="register"),
    path("auth/me/", auth_views.CurrentUserView.as_view(), name="current_user"),
    path("auth/me/profile/", auth_views.ProfileView.as_view(), name="profile"),

    path("tracking/point/", tracking_views.PuntoRastreoCreateView.as_view(), name="tracking_point"),
    path("tracking/batch/", tracking_views.PuntoRastreoBatchCreateView.as_view(), name="tracking_batch"),
    path("tracking/last/", tracking_views.LastPositionView.as_view(), name="tracking_last"),
    path("tracking/route/", tracking_views.RouteView.as_view(), name="tracking_route"),
    path(
        "tracking/incident/<uuid:incident_id>/",
        tracking_views.IncidentTrackingView.as_view(),
        name="tracking_incident",
    ),

    path("", include(router.urls)),

    path("auth/register/", RegisterView.as_view()),
    path("auth/me/", CurrentUserView.as_view()),
    path("auth/me/profile/", ProfileView.as_view()),

    path("auth/panel/login/", PanelLoginView.as_view()),
    path("auth/panel/logout/", PanelLogoutView.as_view()),
    path("auth/panel/me/", PanelMeView.as_view()),
    path("auth/panel/users/", PanelUsersListView.as_view()),
    path("auth/panel/users/create/", PanelCreateOperativeUserView.as_view()),
]
