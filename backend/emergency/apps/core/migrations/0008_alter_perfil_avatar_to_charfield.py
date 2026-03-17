from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_perfil_assigned_supervisor_perfil_avatar_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="perfil",
            name="avatar",
            field=models.CharField(
                blank=True,
                help_text="Ruta o URL publica del avatar",
                max_length=500,
                null=True,
            ),
        ),
    ]
