import datetime
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_organizacion_location"),
    ]

    operations = [
        migrations.CreateModel(
            name="CodigoResetPassword",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("email", models.EmailField(max_length=254)),
                ("codigo", models.CharField(max_length=6)),
                ("token_verificado", models.CharField(blank=True, default="", max_length=128)),
                ("intentos_verificacion", models.PositiveSmallIntegerField(default=0)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("expira_en", models.DateTimeField()),
                ("verificado_en", models.DateTimeField(blank=True, null=True)),
                ("usado_en", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="codigos_reset_password",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "password_reset_codes",
                "ordering": ["-creado_en"],
            },
        ),
        migrations.AddIndex(
            model_name="codigoresetpassword",
            index=models.Index(fields=["email", "codigo"], name="password_re_email_0c2b89_idx"),
        ),
        migrations.AddIndex(
            model_name="codigoresetpassword",
            index=models.Index(fields=["expira_en"], name="password_re_expira__624020_idx"),
        ),
        migrations.RunPython(
            code=migrations.RunPython.noop,
            reverse_code=migrations.RunPython.noop,
            elidable=True,
        ),
    ]
