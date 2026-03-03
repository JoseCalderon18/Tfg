from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_riskreport_delete_celdariesgo"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE profiles "
                "ALTER COLUMN name TYPE varchar(100) USING name::varchar(100), "
                "ALTER COLUMN lastname TYPE varchar(100) USING lastname::varchar(100);"
            ),
            reverse_sql=(
                "ALTER TABLE profiles "
                "ALTER COLUMN name TYPE char(1) USING left(coalesce(name, ''), 1), "
                "ALTER COLUMN lastname TYPE char(1) USING left(coalesce(lastname, ''), 1);"
            ),
        ),
    ]
