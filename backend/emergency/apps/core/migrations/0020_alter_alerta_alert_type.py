from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_create_points_of_interest_table"),
    ]

    operations = [
        migrations.AlterField(
            model_name="alerta",
            name="alert_type",
            field=models.CharField(
                choices=[
                    ("SOS", "SOS Emergencia"),
                    ("MAN_DOWN", "Operativo Caido"),
                    ("LOST", "Operativo Perdido/Desorientado"),
                    ("GEOFENCE", "Fuera de Zona Segura"),
                    ("ANOMALY", "Anomalia Detectada"),
                    ("FIRE_SPREAD", "Cambio de Fuego"),
                    ("SMOKE", "Humo en Incidente"),
                    ("INJURY", "Operativo Herido"),
                    ("DEATH", "Operativo Fallecido"),
                    ("EVACUATION", "Evacuacion"),
                    ("MEDICAL", "Emergencia Medica"),
                    ("TRAPPED", "Operativo Atrapado"),
                    ("VEHICLE", "Incidente Vehicular"),
                    ("ANIMAL", "Animal Peligroso"),
                    ("ANIMAL_INJURY", "Animal Herido"),
                    ("LOW_SUPPLIES", "Recursos Bajos"),
                    ("COMM_LOSS", "Perdida de Comunicacion"),
                    ("HAZARD", "Peligro Ambiental"),
                    ("FATIGUE", "Fatiga Extrema"),
                    ("WEATHER", "Clima Peligroso"),
                    ("BATTERY", "Bateria Baja"),
                    ("MOVEMENT", "Inmovilidad Prolongada"),
                    ("OTHER", "Otro"),
                ],
                help_text="Tipo de emergencia reportada",
                max_length=20,
            ),
        ),
    ]
