from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from emergency.apps.api.views.auth_views import (
    PanelCreateOperativeUserView,
    PanelLoginView,
    PanelLogoutView,
    PanelMeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetVerifyCodeView,
    PanelUserDetailView,
    PanelUserFormOptionsView,
    PanelUsersListView,
    JWTLoginView,
)
from emergency.apps.api.views.chat_views import (
    MobileChatMessagesView,
    MobileChatsView,
    PanelChatMembersView,
    PanelChatMessagesView,
    PanelChatsView,
)

from .views import alert_views, audit_views, auth_views, incident_views, tracking_views, user_views, risk_report_views, lightning_views, workarea_views, journey_views, point_of_interest_views, unit_views

app_name = "api"

router = DefaultRouter()
router.register(r"incidents", incident_views.IncidentViewSet, basename="incident")
router.register(r"alerts", alert_views.AlertaViewSet, basename="alert")
router.register(r"users", user_views.UserViewSet, basename="user")
router.register(r"organizations", user_views.OrganizationViewSet, basename="organization")
router.register(r"risk-reports", risk_report_views.RiskReportViewSet, basename="risk-report")
router.register(r"auditoria", audit_views.AuditoriaViewSet, basename="auditoria")
router.register(r"lightning", lightning_views.LightningViewSet, basename="lightning")
router.register(r"workareas", workarea_views.WorkAreaViewSet, basename="workarea")
router.register(r"journeys", journey_views.JourneyViewSet, basename="journey")
router.register(r"points-of-interest", point_of_interest_views.PointOfInterestViewSet, basename="point-of-interest")
router.register(r"units", unit_views.UnidadViewSet, basename="unit")
router.register(r"unit-status-history", unit_views.EstadoUnidadViewSet, basename="unit-status-history")
router.register(r"unit-consumption", unit_views.ConsumoRecursosViewSet, basename="unit-consumption")
router.register(r"location-audit", unit_views.AuditoriaUbicacionViewSet, basename="location-audit")

urlpatterns = [
    path("auth/register/", auth_views.RegisterView.as_view(), name="register"),
    path("auth/me/", auth_views.CurrentUserView.as_view(), name="current_user"),
    path("auth/devices/register/", auth_views.DeviceRegistrationView.as_view(), name="device_register"),
    path("auth/me/profile/", auth_views.ProfileView.as_view(), name="profile"),
    path("auth/login/", JWTLoginView.as_view(), name="login"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("auth/password-reset/verify-code/", PasswordResetVerifyCodeView.as_view(), name="password_reset_verify_code"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/verify/", TokenVerifyView.as_view(), name="token_verify"),

    path("tracking/point/", tracking_views.PuntoRastreoCreateView.as_view(), name="tracking_point"),
    path("tracking/batch/", tracking_views.PuntoRastreoBatchCreateView.as_view(), name="tracking_batch"),
    path("tracking/last/", tracking_views.LastPositionView.as_view(), name="tracking_last"),
    path("tracking/route/", tracking_views.RouteView.as_view(), name="tracking_route"),
    path(
        "tracking/incident/<uuid:incident_id>/",
        tracking_views.IncidentTrackingView.as_view(),
        name="tracking_incident",
    ),
    path("mobile/chats/", MobileChatsView.as_view(), name="mobile_chats"),
    path(
        "mobile/chats/<str:chat_kind>/<str:chat_id>/messages/",
        MobileChatMessagesView.as_view(),
        name="mobile_chat_messages",
    ),

    path("", include(router.urls)),

    path("auth/panel/login/", PanelLoginView.as_view()),
    path("auth/panel/logout/", PanelLogoutView.as_view()),
    path("auth/panel/me/", PanelMeView.as_view()),
    path("auth/panel/chats/", PanelChatsView.as_view()),
    path("auth/panel/chats/<int:chat_pk>/members/", PanelChatMembersView.as_view()),
    path("auth/panel/chats/<str:chat_id>/messages/", PanelChatMessagesView.as_view()),
    path("auth/panel/users/", PanelUsersListView.as_view()),
    path("auth/panel/users/form-options/", PanelUserFormOptionsView.as_view()),
    path("auth/panel/users/<uuid:user_id>/", PanelUserDetailView.as_view()),
    path("auth/panel/users/create/", PanelCreateOperativeUserView.as_view()),
]
