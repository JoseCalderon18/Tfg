from django.db import migrations


class Migration(migrations.Migration):
    # Esta migracion solo renombra modelos/tablas para mantener compatibilidad
    # con el codigo actual sin recrear tablas ya creadas en 0001_initial.

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Organization",
            new_name="Organizacion",
        ),
        migrations.RenameModel(
            old_name="Incident",
            new_name="Incidente",
        ),
        migrations.RenameModel(
            old_name="RiskCell",
            new_name="CeldaRiesgo",
        ),
        migrations.RenameModel(
            old_name="WorkArea",
            new_name="AreaTrabajo",
        ),
        migrations.RenameModel(
            old_name="Alert",
            new_name="Alerta",
        ),
        migrations.RenameModel(
            old_name="Profile",
            new_name="Perfil",
        ),
        migrations.RenameModel(
            old_name="TrackPoint",
            new_name="PuntoRastreo",
        ),
        migrations.RenameModel(
            old_name="Device",
            new_name="Dispositivo",
        ),
        migrations.AlterModelTable(
            name="organizacion",
            table="organizaciones",
        ),
        migrations.AlterModelTable(
            name="incidente",
            table="incidentes",
        ),
        migrations.AlterModelTable(
            name="celdariesgo",
            table="celdas_riesgo",
        ),
        migrations.AlterModelTable(
            name="alerta",
            table="alertas",
        ),
        migrations.AlterModelTable(
            name="puntorastreo",
            table="puntos_rastreo",
        ),
        migrations.AlterModelTable(
            name="dispositivo",
            table="dispositivos",
        ),
        migrations.AlterModelTable(
            name="perfil",
            table="profiles",
        ),
    ]
