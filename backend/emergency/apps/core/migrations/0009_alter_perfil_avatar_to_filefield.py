from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_alter_perfil_avatar_to_charfield"),
    ]

    operations = [
        migrations.AlterField(
            model_name="perfil",
            name="avatar",
            field=models.FileField(
                blank=True,
                help_text="Imagen de avatar del usuario",
                null=True,
                upload_to="avatars/",
            ),
        ),
    ]
