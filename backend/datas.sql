-- Seed de datos demo listo para copiar y pegar en PostgreSQL / DBeaver.
-- Este archivo solo inserta datos y asume que las tablas ya existen por migraciones.

-- 50 organizaciones
INSERT INTO organizations (
    id, name, org_type, contact_email, contact_phone, address, is_active, created_at, updated_at
)
SELECT
    ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    'Unidad Operativa ' || lpad(g::text, 2, '0') || ' - ' ||
    (ARRAY['Madrid','Barcelona','Valencia','Sevilla','Bilbao','Malaga','Valladolid','Murcia','Granada','A Coruna'])[1 + ((g - 1) % 10)],
    (ARRAY['FIRE_DEPT','POLICE','RESCUE','MEDICAL','OTHER'])[1 + ((g - 1) % 5)],
    'contacto' || lpad(g::text, 2, '0') || '@institucion.local',
    '+34 6' || lpad((10000000 + g)::text, 8, '0'),
    'Direccion operativa ' || g || ', Espana',
    TRUE,
    now() - ((g % 45) || ' days')::interval,
    now()
FROM generate_series(1, 50) AS g
ON CONFLICT DO NOTHING;

-- 50 usuarios con nombres realistas
WITH nombres AS (
    SELECT
        g,
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g] AS first_name,
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g] AS last_name
    FROM generate_series(1, 50) AS g
)
INSERT INTO users (
    id, username, email, password, is_active, is_staff, is_superuser,
    first_name, last_name, phone, last_login, date_joined, created_at, updated_at
)
SELECT
    ('20000000-0000-0000-0000-' || lpad(n.g::text, 12, '0'))::uuid,
    lower(substr(n.first_name, 1, 1) || n.last_name || lpad(n.g::text, 2, '0')),
    lower(n.first_name || '.' || n.last_name || lpad(n.g::text, 2, '0') || '@equipo.local'),
    'pbkdf2_sha256$720000$mpFEPHUptfD0PdqHUOm5PM$CkcWkcaKNLxwraMDMwooe7kMNMHj/+VXxFPjysGsbkg=',
    TRUE,
    (n.g % 8 = 0),
    FALSE,
    n.first_name,
    n.last_name,
    '+34 7' || lpad((10000000 + n.g)::text, 8, '0'),
    NULL,
    now() - ((n.g % 90) || ' days')::interval,
    now() - ((n.g % 90) || ' days')::interval,
    now()
FROM nombres n
ON CONFLICT DO NOTHING;

-- 50 perfiles
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT
        g,
        u.id AS user_id
    FROM nums
    JOIN users u
      ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
),
organizaciones_seed AS (
    SELECT
        g,
        o.id AS organization_id
    FROM nums
    JOIN organizations o
      ON o.contact_email = 'contacto' || lpad(g::text, 2, '0') || '@institucion.local'
)
INSERT INTO profiles (
    id, user_id, organization_id, role, emergency_contact, emergency_phone,
    medical_notes, created_at, updated_at
)
SELECT
    ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    usuarios_seed.user_id,
    organizaciones_seed.organization_id,
    (ARRAY['ADMIN','SUPERVISOR','OPERATIVE'])[1 + ((g - 1) % 3)],
    'Contacto familiar ' || g,
    '+34 6' || lpad((20000000 + g)::text, 8, '0'),
    'Sin antecedentes relevantes',
    now() - ((g % 30) || ' days')::interval,
    now()
FROM nums
JOIN usuarios_seed USING (g)
JOIN organizaciones_seed USING (g)
ON CONFLICT DO NOTHING;

-- 50 incidentes
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT
        g,
        u.id AS user_id
    FROM nums
    JOIN users u ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
),
organizaciones_seed AS (
    SELECT
        g,
        o.id AS organization_id
    FROM nums
    JOIN organizations o ON o.contact_email = 'contacto' || lpad(g::text, 2, '0') || '@institucion.local'
)
INSERT INTO incidents (
    id, name, incident_type, status, description, location, location_address,
    started_at, ended_at, created_at, updated_at, created_by_id, owner_organization_id
)
SELECT
    ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    (ARRAY['Incendio forestal','Busqueda de senderista','Rescate en edificio','Emergencia medica','Inundacion urbana','Accidente multiple'])[1 + ((g - 1) % 6)] || ' #' || lpad(g::text, 2, '0'),
    (ARRAY['WILDFIRE','SEARCH','RESCUE','MEDICAL','NATURAL_DISASTER','OTHER'])[1 + ((g - 1) % 6)],
    (ARRAY['OPEN','TRIAGE','CLOSED'])[1 + ((g - 1) % 3)],
    'Incidente de entrenamiento operativo',
    ST_SetSRID(ST_MakePoint(-8.8 + (g * 0.11), 36.4 + (g * 0.12)), 4326),
    (ARRAY['Madrid','Barcelona','Valencia','Sevilla','Bilbao','Malaga','Valladolid','A Coruna','Murcia','Granada'])[1 + ((g - 1) % 10)] || ', Espana',
    now() - ((g % 40) || ' days')::interval,
    NULL,
    now() - ((g % 40) || ' days')::interval,
    now(),
    usuarios_seed.user_id,
    organizaciones_seed.organization_id
FROM nums
JOIN usuarios_seed USING (g)
JOIN organizaciones_seed USING (g)
ON CONFLICT DO NOTHING;

-- 50 miembros por incidente
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT g, u.id AS user_id
    FROM nums
    JOIN users u ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
),
incidentes_seed AS (
    SELECT g, i.id AS incident_id
    FROM nums
    JOIN incidents i ON i.id = ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid
)
INSERT INTO incident_members (
    id, incident_id, user_id, role_in_incident, joined_at, left_at, is_active
)
SELECT
    ('50000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    incidentes_seed.incident_id,
    usuarios_seed.user_id,
    (ARRAY['SUPERVISOR','OPERATIVE','SUPPORT'])[1 + ((g - 1) % 3)],
    now() - ((g % 20) || ' days')::interval,
    NULL,
    TRUE
FROM nums
JOIN usuarios_seed USING (g)
JOIN incidentes_seed USING (g)
ON CONFLICT DO NOTHING;

-- 50 dispositivos
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT g, u.id AS user_id
    FROM nums
    JOIN users u ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
)
INSERT INTO devices (
    id, user_id, fcm_token, device_name, platform, is_active, last_used, created_at
)
SELECT
    ('60000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    usuarios_seed.user_id,
    'fcm_token_real_' || lpad(g::text, 3, '0'),
    'Terminal ' || lpad(g::text, 3, '0'),
    (ARRAY['IOS','ANDROID','WEB'])[1 + ((g - 1) % 3)],
    TRUE,
    now() - ((g % 7) || ' days')::interval,
    now() - ((g % 15) || ' days')::interval
FROM nums
JOIN usuarios_seed USING (g)
ON CONFLICT DO NOTHING;

-- 50 puntos de rastreo
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT g, u.id AS user_id
    FROM nums
    JOIN users u ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
),
incidentes_seed AS (
    SELECT g, i.id AS incident_id
    FROM nums
    JOIN incidents i ON i.id = ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid
)
INSERT INTO track_points (
    id, user_id, incident_id, location, accuracy_m, altitude, speed, recorded_at, created_at
)
SELECT
    ('70000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    usuarios_seed.user_id,
    incidentes_seed.incident_id,
    ST_SetSRID(ST_MakePoint(-7.0 + (g * 0.06), 37.5 + (g * 0.06)), 4326),
    3 + (g % 8),
    50 + (g % 500),
    round((g % 12)::numeric, 2),
    now() - ((g % 10) || ' hours')::interval,
    now() - ((g % 10) || ' hours')::interval
FROM nums
JOIN usuarios_seed USING (g)
JOIN incidentes_seed USING (g)
ON CONFLICT DO NOTHING;

-- 50 alertas
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT g, u.id AS user_id
    FROM nums
    JOIN users u ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
),
incidentes_seed AS (
    SELECT g, i.id AS incident_id
    FROM nums
    JOIN incidents i ON i.id = ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid
)
INSERT INTO alerts (
    id, incident_id, created_by_id, acked_by_id, closed_by_id,
    alert_type, severity, status, title, description, location,
    acked_at, ack_notes, closed_at, close_notes, created_at, updated_at
)
SELECT
    ('80000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
    incidentes_seed.incident_id,
    usuarios_seed.user_id,
    CASE WHEN g % 3 IN (1,2) THEN (SELECT user_id FROM usuarios_seed u2 WHERE u2.g = ((g % 50) + 1)) ELSE NULL END,
    CASE WHEN g % 3 = 2 THEN (SELECT user_id FROM usuarios_seed u3 WHERE u3.g = (((g + 5) % 50) + 1)) ELSE NULL END,
    (ARRAY['SOS','MAN_DOWN','LOST','GEOFENCE','ANOMALY','OTHER'])[1 + ((g - 1) % 6)],
    1 + (g % 5),
    (ARRAY['OPEN','ACK','CLOSED'])[1 + ((g - 1) % 3)],
    'Alerta Operativa ' || lpad(g::text, 3, '0'),
    'Alerta emitida durante simulacion de campo',
    ST_SetSRID(ST_MakePoint(-6.8 + (g * 0.05), 38.0 + (g * 0.05)), 4326),
    CASE WHEN g % 3 IN (1,2) THEN now() - interval '3 hours' ELSE NULL END,
    CASE WHEN g % 3 IN (1,2) THEN 'Validada por central' ELSE NULL END,
    CASE WHEN g % 3 = 2 THEN now() - interval '1 hour' ELSE NULL END,
    CASE WHEN g % 3 = 2 THEN 'Incidencia cerrada' ELSE NULL END,
    now() - ((g % 12) || ' days')::interval,
    now()
FROM nums
JOIN usuarios_seed USING (g)
JOIN incidentes_seed USING (g)
ON CONFLICT DO NOTHING;

-- 50 reportes de riesgo
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
usuarios_seed AS (
    SELECT g, u.id AS user_id
    FROM nums
    JOIN users u ON u.email = lower(
        (ARRAY['Javier','Maria','Carlos','Lucia','Sergio','Elena','Pablo','Ana','Miguel','Carmen','Adrian','Laura','Diego','Irene','Raul','Patricia','David','Sara','Alberto','Noelia','Hector','Natalia','Ivan','Marta','Victor','Claudia','Ruben','Silvia','Oscar','Beatriz','Jesus','Paula','Manuel','Andrea','Joaquin','Eva','Fernando','Alicia','Gonzalo','Rocio','Jaime','Nerea','Samuel','Pilar','Daniel','Sonia','Guillermo','Ines','Marco','Julia'])[g]
        || '.' ||
        (ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno','Alvarez','Romero','Alonso','Gutierrez','Navarro','Torres','Dominguez','Vazquez','Ramos','Gil','Serrano','Molina','Blanco','Castro','Ortega','Delgado','Suarez','Reyes','Mendez','Cruz','Prieto','Flores','Pena','Iglesias','Medina','Cortes','Calvo','Vega','Fuentes','Campos','Carrasco','Herrera','Santos','Leon','Marin','Rubio','Cano','Aguilar'])[g]
        || lpad(g::text, 2, '0') || '@equipo.local'
      )
),
incidentes_seed AS (
    SELECT g, i.id AS incident_id
    FROM nums
    JOIN incidents i ON i.id = ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid
)
INSERT INTO risk_reports (
    id, incident_id, reported_by_id, location, description,
    severity, is_active, created_at, updated_at
)
SELECT
    ('90000000-0000-0000-0000-' || lpad(nums.g::text, 12, '0'))::uuid,
    incidentes_seed.incident_id,
    usuarios_seed.user_id,
    ST_SetSRID(ST_MakePoint(-6.5 + (nums.g * 0.05), 38.2 + (nums.g * 0.04)), 4326),
    'Reporte registrado durante simulacion en zona operativa',
    (ARRAY['LOW','MEDIUM','HIGH'])[1 + ((nums.g - 1) % 3)],
    (nums.g % 6 <> 0),
    now() - ((nums.g % 15) || ' days')::interval,
    now()
FROM nums
JOIN usuarios_seed ON usuarios_seed.g = (((nums.g + 5) % 50) + 1)
JOIN incidentes_seed ON incidentes_seed.g = nums.g
ON CONFLICT DO NOTHING;

-- 50 areas de trabajo
WITH nums AS (
    SELECT generate_series(1, 50) AS g
),
incidentes_seed AS (
    SELECT g, i.id AS incident_id
    FROM nums
    JOIN incidents i ON i.id = ('40000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid
)
INSERT INTO core_workarea (
    incident_id, name, area_type, center, radius_m, polygon, active, created_at
)
SELECT
    incidentes_seed.incident_id,
    'Zona Operativa ' || lpad(g::text, 3, '0'),
    CASE WHEN g % 2 = 0 THEN 'CIRCLE' ELSE 'POLYGON' END,
    CASE WHEN g % 2 = 0 THEN ST_SetSRID(ST_MakePoint(-6.9 + (g * 0.05), 38.1 + (g * 0.04)), 4326) ELSE NULL END,
    CASE WHEN g % 2 = 0 THEN 300 + (g * 8) ELSE NULL END,
    CASE WHEN g % 2 = 1 THEN ST_Buffer(ST_SetSRID(ST_MakePoint(-6.9 + (g * 0.05), 38.1 + (g * 0.04)), 4326)::geography, 200 + (g * 5))::geometry ELSE NULL END,
    TRUE,
    now() - ((g % 20) || ' days')::interval
FROM nums
JOIN incidentes_seed USING (g)
ON CONFLICT DO NOTHING;
