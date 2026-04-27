from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_incidentmessage"),
    ]

    operations = [
        migrations.AddField(
            model_name="perfil",
            name="operative_status",
            field=models.CharField(
                choices=[
                    ("DISPONIBLE", "Disponible"),
                    ("EN_INCIDENTE", "En incidente"),
                    ("DESCONECTADA", "Desconectada"),
                    ("NO_DISPONIBLE", "No disponible"),
                ],
                default="DISPONIBLE",
                help_text="Estado operativo actual del usuario",
                max_length=20,
            ),
        ),
    ]
