import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_alter_perfil_avatar_to_filefield"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizacion",
            name="location",
            field=django.contrib.gis.db.models.fields.PointField(
                blank=True,
                help_text="Ubicacion geografica de la organizacion (WGS84)",
                null=True,
                srid=4326,
            ),
        ),
    ]
