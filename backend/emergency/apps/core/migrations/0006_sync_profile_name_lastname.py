from django.db import migrations, models


class Migration(migrations.Migration):
    # Sincroniza el estado del modelo Perfil con la tabla real `profiles`
    # anadiendo columnas name/lastname cuando el esquema previo no las tenia.

    dependencies = [
        ("core", "0005_normalize_core_table_names"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE profiles "
                        "ADD COLUMN IF NOT EXISTS name varchar(100), "
                        "ADD COLUMN IF NOT EXISTS lastname varchar(100);"
                    ),
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="perfil",
                    name="name",
                    field=models.CharField(
                        max_length=100,
                        blank=True,
                        null=True,
                        help_text="Nombre completo del usuario",
                    ),
                ),
                migrations.AddField(
                    model_name="perfil",
                    name="lastname",
                    field=models.CharField(
                        max_length=100,
                        blank=True,
                        null=True,
                        help_text="Apellido del usuario",
                    ),
                ),
            ],
        ),
    ]
