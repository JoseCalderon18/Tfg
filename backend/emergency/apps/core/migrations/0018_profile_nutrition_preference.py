from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_profile_operative_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="perfil",
            name="nutrition_preference",
            field=models.CharField(
                blank=True,
                help_text="Preferencia nutricional para sugerencias de recuperacion",
                max_length=20,
                null=True,
            ),
        ),
    ]
