from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0018_profile_nutrition_preference"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS points_of_interest (
                id uuid PRIMARY KEY,
                name text NOT NULL,
                poi_type varchar(50) NOT NULL,
                description text NULL,
                location geometry(Point, 4326) NOT NULL,
                incident_id uuid NULL,
                created_by_id uuid NOT NULL,
                is_active boolean NOT NULL DEFAULT TRUE,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS points_of_interest_poi_type_idx
                ON points_of_interest (poi_type);
            CREATE INDEX IF NOT EXISTS points_of_interest_incident_id_idx
                ON points_of_interest (incident_id);
            CREATE INDEX IF NOT EXISTS points_of_interest_created_by_id_idx
                ON points_of_interest (created_by_id);
            CREATE INDEX IF NOT EXISTS points_of_interest_is_active_idx
                ON points_of_interest (is_active);
            CREATE INDEX IF NOT EXISTS points_of_interest_location_gix
                ON points_of_interest USING GIST (location);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS points_of_interest_location_gix;
            DROP INDEX IF EXISTS points_of_interest_is_active_idx;
            DROP INDEX IF EXISTS points_of_interest_created_by_id_idx;
            DROP INDEX IF EXISTS points_of_interest_incident_id_idx;
            DROP INDEX IF EXISTS points_of_interest_poi_type_idx;
            DROP TABLE IF EXISTS points_of_interest;
            """,
        ),
    ]
