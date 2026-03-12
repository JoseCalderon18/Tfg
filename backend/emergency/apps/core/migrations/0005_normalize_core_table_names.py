from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_fix_profile_name_lastname_types"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "DO $$ "
                "BEGIN "
                "IF to_regclass('public.organizaciones') IS NOT NULL AND to_regclass('public.organizations') IS NULL THEN "
                "ALTER TABLE organizaciones RENAME TO organizations; "
                "END IF; "
                "IF to_regclass('public.incidentes') IS NOT NULL AND to_regclass('public.incidents') IS NULL THEN "
                "ALTER TABLE incidentes RENAME TO incidents; "
                "END IF; "
                "IF to_regclass('public.alertas') IS NOT NULL AND to_regclass('public.alerts') IS NULL THEN "
                "ALTER TABLE alertas RENAME TO alerts; "
                "END IF; "
                "IF to_regclass('public.dispositivos') IS NOT NULL AND to_regclass('public.devices') IS NULL THEN "
                "ALTER TABLE dispositivos RENAME TO devices; "
                "END IF; "
                "IF to_regclass('public.puntos_rastreo') IS NOT NULL AND to_regclass('public.track_points') IS NULL THEN "
                "ALTER TABLE puntos_rastreo RENAME TO track_points; "
                "END IF; "
                "IF to_regclass('public.core_areatrabajo') IS NOT NULL AND to_regclass('public.core_workarea') IS NULL THEN "
                "ALTER TABLE core_areatrabajo RENAME TO core_workarea; "
                "END IF; "
                "END $$;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
