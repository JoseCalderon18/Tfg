import django.contrib.gis.db.models.fields
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0015_journey_state"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="IncidentMessage",
                    fields=[
                        ("id", models.UUIDField(primary_key=True, serialize=False)),
                        ("content", models.TextField(blank=True, db_column="text", null=True)),
                        ("location", django.contrib.gis.db.models.fields.PointField(blank=True, null=True, srid=4326)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        (
                            "incident",
                            models.ForeignKey(
                                blank=True,
                                db_column="id_incident",
                                null=True,
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="messages",
                                to="core.incidente",
                            ),
                        ),
                        (
                            "profile",
                            models.ForeignKey(
                                blank=True,
                                db_column="id_profile",
                                null=True,
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="incident_messages",
                                to="core.perfil",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "message_incident",
                        "ordering": ["created_at"],
                        "managed": False,
                    },
                ),
            ],
        ),
    ]
