from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_riskreport_delete_celdariesgo"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "DO $$ "
                "BEGIN "
                "IF EXISTS ("
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'profiles' AND column_name = 'name'"
                ") THEN "
                "ALTER TABLE profiles "
                "ALTER COLUMN name TYPE varchar(100) USING name::varchar(100); "
                "END IF; "
                "IF EXISTS ("
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'profiles' AND column_name = 'lastname'"
                ") THEN "
                "ALTER TABLE profiles "
                "ALTER COLUMN lastname TYPE varchar(100) USING lastname::varchar(100); "
                "END IF; "
                "END $$;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
