import random
import string
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.contrib.gis.geos import Point, Polygon
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from emergency.apps.core.models import (
    Alerta,
    AreaTrabajo,
    Dispositivo,
    IncidentMember,
    Incidente,
    Organizacion,
    Perfil,
    PuntoRastreo,
    RiskReport,
    User,
)


class Command(BaseCommand):
    help = "Carga muchos datos de prueba para estresar la base de datos"

    def add_arguments(self, parser):
        parser.add_argument("--organizations", type=int, default=50)
        parser.add_argument("--users", type=int, default=1000)
        parser.add_argument("--incidents", type=int, default=300)
        parser.add_argument("--members-per-incident", type=int, default=12)
        parser.add_argument("--track-points", type=int, default=50000)
        parser.add_argument("--alerts", type=int, default=8000)
        parser.add_argument("--risk-reports", type=int, default=10000)
        parser.add_argument("--devices", type=int, default=3000)
        parser.add_argument("--work-areas", type=int, default=1500)
        parser.add_argument("--password", type=str, default="ChangeMe123!")
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument("--batch-size", type=int, default=1000)
        parser.add_argument("--prefix", type=str, default="")

    def handle(self, *args, **options):
        random.seed(options["seed"])
        prefix = options["prefix"] or f"seed{timezone.now().strftime('%Y%m%d%H%M%S')}"
        batch_size = max(100, options["batch_size"])

        self._align_table_names()
        self._ensure_compat_columns()
        self.stdout.write(self.style.WARNING(f"Usando prefijo: {prefix}"))

        organizations = self._create_organizations(prefix, options["organizations"], batch_size)
        users = self._create_users(prefix, options["users"], options["password"], batch_size)
        self._create_profiles(users, organizations, batch_size)

        incidents = self._create_incidents(prefix, options["incidents"], users, organizations, batch_size)
        self._create_incident_members(incidents, users, options["members_per_incident"], batch_size)
        self._create_work_areas(incidents, options["work_areas"], batch_size)
        self._create_devices(users, options["devices"], batch_size)
        self._create_track_points(users, incidents, options["track_points"], batch_size)
        self._create_alerts(users, incidents, options["alerts"], batch_size)
        self._create_risk_reports(users, incidents, options["risk_reports"], batch_size)

        self.stdout.write(self.style.SUCCESS("Carga masiva completada."))
        self.stdout.write(
            self.style.SUCCESS(
                "Resumen -> "
                f"orgs={len(organizations)}, users={len(users)}, incidents={len(incidents)}, "
                f"track_points={options['track_points']}, alerts={options['alerts']}, "
                f"risk_reports={options['risk_reports']}"
            )
        )

    def _align_table_names(self):
        tables = set(connection.introspection.table_names())
        fallback_map = [
            (Organizacion, "organizaciones", "organizations"),
            (Incidente, "incidentes", "incidents"),
            (Alerta, "alertas", "alerts"),
            (Dispositivo, "dispositivos", "devices"),
            (PuntoRastreo, "puntos_rastreo", "track_points"),
            (AreaTrabajo, "core_areatrabajo", "core_workarea"),
        ]

        for model, expected, fallback in fallback_map:
            if expected not in tables and fallback in tables:
                model._meta.db_table = fallback

    def _ensure_compat_columns(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "ALTER TABLE profiles "
                "ADD COLUMN IF NOT EXISTS name varchar(100), "
                "ADD COLUMN IF NOT EXISTS lastname varchar(100);"
            )

    def _bulk_insert(self, model, rows, batch_size):
        if rows:
            model.objects.bulk_create(rows, batch_size=batch_size)

    def _rand_point(self):
        lon = random.uniform(-9.5, 3.3)
        lat = random.uniform(36.0, 43.8)
        return Point(lon, lat, srid=4326)

    def _rand_dt(self, days=180):
        return timezone.now() - timedelta(seconds=random.randint(0, days * 24 * 3600))

    def _create_organizations(self, prefix, total, batch_size):
        self.stdout.write(f"Creando organizaciones: {total}")
        rows = []
        now = timezone.now()
        org_types = ["FIRE_DEPT", "POLICE", "RESCUE", "MEDICAL", "OTHER"]

        for i in range(total):
            rows.append(
                Organizacion(
                    name=f"{prefix}_org_{i:04d}",
                    org_type=random.choice(org_types),
                    contact_email=f"{prefix}.org{i:04d}@demo.local",
                    contact_phone=f"+34{random.randint(600000000, 799999999)}",
                    address=f"Calle Demo {i}",
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
            )

        self._bulk_insert(Organizacion, rows, batch_size)
        return list(Organizacion.objects.filter(name__startswith=f"{prefix}_org_"))

    def _create_users(self, prefix, total, password, batch_size):
        self.stdout.write(f"Creando usuarios: {total}")
        rows = []
        hashed = make_password(password)
        now = timezone.now()

        for i in range(total):
            rows.append(
                User(
                    username=f"{prefix}_user_{i:06d}",
                    email=f"{prefix}.user{i:06d}@demo.local",
                    password=hashed,
                    is_active=True,
                    is_staff=(i % 50 == 0),
                    is_superuser=False,
                    date_joined=now,
                    created_at=now,
                    updated_at=now,
                )
            )

        self._bulk_insert(User, rows, batch_size)
        return list(User.objects.filter(username__startswith=f"{prefix}_user_"))

    def _create_profiles(self, users, organizations, batch_size):
        self.stdout.write(f"Creando perfiles: {len(users)}")
        roles = ["ADMIN", "SUPERVISOR", "OPERATIVE"]
        rows = []
        now = timezone.now()

        for user in users:
            rows.append(
                Perfil(
                    user=user,
                    role=random.choices(roles, weights=[1, 2, 7], k=1)[0],
                    organization=random.choice(organizations) if organizations else None,
                    emergency_contact=f"Contacto {user.username[-4:]}",
                    emergency_phone=f"+34{random.randint(600000000, 799999999)}",
                    medical_notes="N/A",
                    name=f"Nombre {user.username[-4:]}",
                    lastname=f"Apellido {user.username[-4:]}",
                    created_at=now,
                    updated_at=now,
                )
            )

        self._bulk_insert(Perfil, rows, batch_size)

    def _create_incidents(self, prefix, total, users, organizations, batch_size):
        self.stdout.write(f"Creando incidentes: {total}")
        incident_types = ["WILDFIRE", "SEARCH", "RESCUE", "MEDICAL", "NATURAL_DISASTER", "OTHER"]
        status_choices = ["OPEN", "TRIAGE", "CLOSED"]
        rows = []

        for i in range(total):
            created = self._rand_dt()
            rows.append(
                Incidente(
                    name=f"{prefix}_incident_{i:05d}",
                    incident_type=random.choice(incident_types),
                    status=random.choices(status_choices, weights=[6, 2, 2], k=1)[0],
                    description="Incidente generado para pruebas de carga",
                    location=self._rand_point(),
                    location_address=f"Zona {random.randint(1, 200)}",
                    created_by=random.choice(users) if users else None,
                    owner_organization=random.choice(organizations) if organizations else None,
                    started_at=created,
                    ended_at=None,
                    created_at=created,
                    updated_at=created,
                )
            )

        self._bulk_insert(Incidente, rows, batch_size)
        return list(Incidente.objects.filter(name__startswith=f"{prefix}_incident_"))

    def _create_incident_members(self, incidents, users, members_per_incident, batch_size):
        self.stdout.write("Creando membresias de incidentes")
        if not incidents or not users:
            return

        roles = ["SUPERVISOR", "OPERATIVE", "SUPPORT"]
        rows = []

        for incident in incidents:
            sample_size = min(max(1, members_per_incident), len(users))
            members = random.sample(users, sample_size)
            for user in members:
                joined = self._rand_dt(120)
                rows.append(
                    IncidentMember(
                        incident=incident,
                        user=user,
                        role_in_incident=random.choices(roles, weights=[1, 7, 2], k=1)[0],
                        joined_at=joined,
                        left_at=None,
                        is_active=True,
                    )
                )

                if len(rows) >= batch_size:
                    self._bulk_insert(IncidentMember, rows, batch_size)
                    rows = []

        self._bulk_insert(IncidentMember, rows, batch_size)

    def _create_track_points(self, users, incidents, total, batch_size):
        self.stdout.write(f"Creando puntos de rastreo: {total}")
        if not users:
            return

        rows = []
        for _ in range(total):
            recorded = self._rand_dt(30)
            rows.append(
                PuntoRastreo(
                    user=random.choice(users),
                    incident=random.choice(incidents) if incidents and random.random() < 0.8 else None,
                    location=self._rand_point(),
                    accuracy_m=round(random.uniform(2, 40), 2),
                    altitude=round(random.uniform(0, 2400), 2),
                    speed=round(random.uniform(0, 20), 2),
                    recorded_at=recorded,
                    created_at=recorded,
                )
            )

            if len(rows) >= batch_size:
                self._bulk_insert(PuntoRastreo, rows, batch_size)
                rows = []

        self._bulk_insert(PuntoRastreo, rows, batch_size)

    def _create_alerts(self, users, incidents, total, batch_size):
        self.stdout.write(f"Creando alertas: {total}")
        if not users:
            return

        alert_types = ["SOS", "MAN_DOWN", "LOST", "GEOFENCE", "ANOMALY", "OTHER"]
        status_choices = ["OPEN", "ACK", "CLOSED"]
        rows = []

        for i in range(total):
            created_by = random.choice(users)
            status = random.choices(status_choices, weights=[6, 2, 2], k=1)[0]
            created = self._rand_dt(60)

            acked_by = random.choice(users) if status in {"ACK", "CLOSED"} else None
            closed_by = random.choice(users) if status == "CLOSED" else None
            acked_at = self._rand_dt(30) if acked_by else None
            closed_at = self._rand_dt(15) if closed_by else None

            rows.append(
                Alerta(
                    incident=random.choice(incidents) if incidents and random.random() < 0.85 else None,
                    created_by=created_by,
                    alert_type=random.choice(alert_types),
                    severity=random.randint(1, 5),
                    status=status,
                    title=f"Alerta de prueba {i}",
                    description="Generada automaticamente para pruebas de carga",
                    location=self._rand_point(),
                    acked_by=acked_by,
                    acked_at=acked_at,
                    ack_notes="Revisada" if acked_by else None,
                    closed_by=closed_by,
                    closed_at=closed_at,
                    close_notes="Cerrada" if closed_by else None,
                    created_at=created,
                    updated_at=created,
                )
            )

            if len(rows) >= batch_size:
                self._bulk_insert(Alerta, rows, batch_size)
                rows = []

        self._bulk_insert(Alerta, rows, batch_size)

    def _create_risk_reports(self, users, incidents, total, batch_size):
        self.stdout.write(f"Creando reportes de riesgo: {total}")
        if not users or not incidents:
            return

        severities = ["LOW", "MEDIUM", "HIGH"]
        rows = []

        for _ in range(total):
            created = self._rand_dt(45)
            rows.append(
                RiskReport(
                    incident=random.choice(incidents),
                    reported_by=random.choice(users),
                    location=self._rand_point(),
                    description="Reporte generado automaticamente para carga",
                    severity=random.choices(severities, weights=[4, 4, 2], k=1)[0],
                    is_active=random.random() < 0.9,
                    created_at=created,
                    updated_at=created,
                )
            )

            if len(rows) >= batch_size:
                self._bulk_insert(RiskReport, rows, batch_size)
                rows = []

        self._bulk_insert(RiskReport, rows, batch_size)

    def _create_devices(self, users, total, batch_size):
        self.stdout.write(f"Creando dispositivos: {total}")
        if not users:
            return

        platforms = ["IOS", "ANDROID", "WEB"]
        rows = []

        for i in range(total):
            token = "".join(random.choices(string.ascii_letters + string.digits, k=120))
            created = self._rand_dt(100)
            rows.append(
                Dispositivo(
                    user=random.choice(users),
                    fcm_token=f"seed_{i}_{token}",
                    device_name=f"Device {i}",
                    platform=random.choice(platforms),
                    is_active=random.random() < 0.95,
                    last_used=created,
                    created_at=created,
                )
            )

            if len(rows) >= batch_size:
                self._bulk_insert(Dispositivo, rows, batch_size)
                rows = []

        self._bulk_insert(Dispositivo, rows, batch_size)

    def _create_work_areas(self, incidents, total, batch_size):
        self.stdout.write(f"Creando areas de trabajo: {total}")
        if not incidents:
            return

        rows = []

        for i in range(total):
            incident = random.choice(incidents)
            area_type = random.choice(["CIRCLE", "POLYGON"])
            center = self._rand_point()

            polygon = None
            radius = None
            if area_type == "CIRCLE":
                radius = round(random.uniform(300, 3000), 2)
            else:
                d = random.uniform(0.005, 0.02)
                ring = (
                    (center.x - d, center.y - d),
                    (center.x + d, center.y - d),
                    (center.x + d, center.y + d),
                    (center.x - d, center.y + d),
                    (center.x - d, center.y - d),
                )
                polygon = Polygon(ring)
                polygon.srid = 4326

            rows.append(
                AreaTrabajo(
                    incident=incident,
                    name=f"Area {i}",
                    area_type=area_type,
                    center=center if area_type == "CIRCLE" else None,
                    radius_m=radius,
                    polygon=polygon,
                    active=random.random() < 0.9,
                    created_at=self._rand_dt(120),
                )
            )

            if len(rows) >= batch_size:
                self._bulk_insert(AreaTrabajo, rows, batch_size)
                rows = []

        self._bulk_insert(AreaTrabajo, rows, batch_size)
