from django.db import migrations, models
import django.contrib.gis.db.models as gis_models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_create_points_of_interest_table"),
    ]

    operations = [
        migrations.CreateModel(
            name='UltimaPosicion',
            fields=[
                ('id', models.UUIDField(primary_key=True, editable=False)),
                ('location', gis_models.PointField(srid=4326, null=True, blank=True)),
                ('accuracy_m', models.FloatField(null=True, blank=True)),
                ('altitude', models.FloatField(null=True, blank=True)),
                ('speed', models.FloatField(null=True, blank=True)),
                ('heading', models.FloatField(null=True, blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='ultima_posicion', to='core.user')),
                ('incident', models.ForeignKey(on_delete=models.deletion.SET_NULL, related_name='ultimas_posiciones', blank=True, to='core.incidente', null=True)),
            ],
            options={
                'db_table': 'last_positions',
            },
        ),
        migrations.AddIndex(
            model_name='ultimaposicion',
            index=models.Index(fields=['incident', 'updated_at'], name='core_ultimapos_inc_upd_idx'),
        ),
    ]
