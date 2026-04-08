# Generated manually to register the existing `journey` table in Django state.

import django.contrib.gis.db.models.fields
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0014_merge_20260321_1417"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="Journey",
                    fields=[
                        ("id", models.BigAutoField(primary_key=True, serialize=False)),
                        ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                        ("start_date", models.DateTimeField(blank=True, null=True)),
                        ("end_date", models.DateTimeField(blank=True, null=True)),
                        (
                            "location_start",
                            django.contrib.gis.db.models.fields.PointField(
                                blank=True, null=True, srid=4326
                            ),
                        ),
                        (
                            "location_stop",
                            django.contrib.gis.db.models.fields.PointField(
                                blank=True, null=True, srid=4326
                            ),
                        ),
                        ("notes", models.JSONField(blank=True, null=True)),
                        (
                            "user",
                            models.ForeignKey(
                                db_column="user_id",
                                db_constraint=False,
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="journeys",
                                to="core.profile",
                            ),
                        ),
                    ],
                    options={
                        "verbose_name": "Journey",
                        "verbose_name_plural": "Journeys",
                        "db_table": "journey",
                        "ordering": ["-created_at"],
                        "managed": False,
                    },
                ),
            ],
        ),
    ]
