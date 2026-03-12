-- Ejecutar (PowerShell): Get-Content .\seed.sql | docker compose exec -T db psql -U postgres -d emergency_db
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION _seed_uuid(txt text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (
        substr(md5(txt), 1, 8) || '-' ||
        substr(md5(txt), 9, 4) || '-' ||
        substr(md5(txt), 13, 4) || '-' ||
        substr(md5(txt), 17, 4) || '-' ||
        substr(md5(txt), 21, 12)
    )::uuid;
$$;

DELETE FROM core_workarea WHERE name LIKE 'Zona Operativa %';
DELETE FROM risk_reports WHERE description LIKE 'Reporte registrado durante simulacion%';
DELETE FROM alerts WHERE title LIKE 'Alerta Operativa %';
DELETE FROM track_points WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@equipo.local');
DELETE FROM devices WHERE device_name LIKE 'Terminal %';
DELETE FROM incident_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@equipo.local');
DELETE FROM incidents WHERE description = 'Incidente de entrenamiento operativo';
DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@equipo.local');
DELETE FROM users WHERE email LIKE '%@equipo.local';
DELETE FROM organizations WHERE contact_email LIKE '%@institucion.local';

INSERT INTO organizations (id, name, org_type, contact_email, contact_phone, address, is_active, created_at, updated_at)
SELECT
    _seed_uuid('org-real-' || g),
    'Unidad Operativa ' || lpad(g::text, 2, '0') || ' - ' ||
    (ARRAY['Madrid','Barcelona','Valencia','Sevilla','Bilbao','Malaga','Valladolid','Murcia','Granada','A Coruna'])[1 + ((g - 1) % 10)],
    (ARRAY['FIRE_DEPT','POLICE','RESCUE','MEDICAL','OTHER'])[1 + ((g - 1) % 5)],
    'contacto' || lpad(g::text, 2, '0') || '@institucion.local',
    '+34 6' || lpad((10000000 + g)::text, 8, '0'),
    'Direccion operativa ' || g || ', Espana',
    TRUE,
    now() - ((g % 45) || ' days')::interval,
    now()
FROM generate_series(1, 50) AS g;

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
    _seed_uuid('user-real-' || n.g),
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
FROM nombres n;

CREATE TEMP TABLE _users AS
SELECT row_number() OVER (ORDER BY email) AS rn, id
FROM users
WHERE email LIKE '%@equipo.local'
ORDER BY email
LIMIT 50;

CREATE TEMP TABLE _orgs AS
SELECT row_number() OVER (ORDER BY contact_email) AS rn, id
FROM organizations
WHERE contact_email LIKE '%@institucion.local'
ORDER BY contact_email
LIMIT 50;

INSERT INTO profiles (id, user_id, organization_id, role, emergency_contact, emergency_phone, medical_notes, name, lastname, created_at, updated_at)
SELECT
    _seed_uuid('profile-real-' || u.rn),
    u.id,
    o.id,
    (ARRAY['ADMIN','SUPERVISOR','OPERATIVE'])[1 + ((u.rn - 1) % 3)],
    'Contacto familiar ' || u.rn,
    '+34 6' || lpad((20000000 + u.rn)::text, 8, '0'),
    'Sin antecedentes relevantes',
    initcap(split_part(us.email, '.', 1)),
    initcap(split_part(split_part(us.email, '@', 1), '.', 2)),
    now() - ((u.rn % 30) || ' days')::interval,
    now()
FROM _users u
JOIN users us ON us.id = u.id
JOIN _orgs o ON o.rn = 1 + ((u.rn - 1) % 50)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO incidents (id, name, incident_type, status, description, location, location_address, started_at, ended_at, created_at, updated_at, created_by_id, owner_organization_id)
SELECT
    _seed_uuid('incident-real-' || g),
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
    (SELECT id FROM _users WHERE rn = 1 + ((g - 1) % 50)),
    (SELECT id FROM _orgs WHERE rn = 1 + ((g - 1) % 50))
FROM generate_series(1, 50) AS g;

CREATE TEMP TABLE _incidents AS
SELECT row_number() OVER (ORDER BY name) AS rn, id
FROM incidents
WHERE description = 'Incidente de entrenamiento operativo'
ORDER BY name
LIMIT 50;

INSERT INTO incident_members (id, incident_id, user_id, role_in_incident, joined_at, left_at, is_active)
SELECT
    _seed_uuid('member-real-' || g),
    (SELECT id FROM _incidents WHERE rn = g),
    (SELECT id FROM _users WHERE rn = g),
    (ARRAY['SUPERVISOR','OPERATIVE','SUPPORT'])[1 + ((g - 1) % 3)],
    now() - ((g % 20) || ' days')::interval,
    NULL,
    TRUE
FROM generate_series(1, 50) AS g
ON CONFLICT (incident_id, user_id) DO NOTHING;

INSERT INTO devices (id, user_id, fcm_token, device_name, platform, is_active, last_used, created_at)
SELECT
    _seed_uuid('device-real-' || g),
    (SELECT id FROM _users WHERE rn = g),
    'fcm_token_real_' || lpad(g::text, 3, '0'),
    'Terminal ' || lpad(g::text, 3, '0'),
    (ARRAY['IOS','ANDROID','WEB'])[1 + ((g - 1) % 3)],
    TRUE,
    now() - ((g % 7) || ' days')::interval,
    now() - ((g % 15) || ' days')::interval
FROM generate_series(1, 50) AS g;

INSERT INTO track_points (id, user_id, incident_id, location, accuracy_m, altitude, speed, recorded_at, created_at)
SELECT
    _seed_uuid('track-real-' || g),
    (SELECT id FROM _users WHERE rn = 1 + ((g - 1) % 50)),
    (SELECT id FROM _incidents WHERE rn = 1 + ((g - 1) % 50)),
    ST_SetSRID(ST_MakePoint(-7.0 + (g * 0.06), 37.5 + (g * 0.06)), 4326),
    3 + (g % 8),
    50 + (g % 500),
    round((g % 12)::numeric, 2),
    now() - ((g % 10) || ' hours')::interval,
    now() - ((g % 10) || ' hours')::interval
FROM generate_series(1, 50) AS g;

INSERT INTO alerts (id, incident_id, created_by_id, acked_by_id, closed_by_id, alert_type, severity, status, title, description, location, acked_at, ack_notes, closed_at, close_notes, created_at, updated_at)
SELECT
    _seed_uuid('alert-real-' || g),
    (SELECT id FROM _incidents WHERE rn = 1 + ((g - 1) % 50)),
    (SELECT id FROM _users WHERE rn = 1 + ((g - 1) % 50)),
    CASE WHEN g % 3 IN (1,2) THEN (SELECT id FROM _users WHERE rn = 1 + ((g + 9 - 1) % 50)) ELSE NULL END,
    CASE WHEN g % 3 = 2 THEN (SELECT id FROM _users WHERE rn = 1 + ((g + 13 - 1) % 50)) ELSE NULL END,
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
FROM generate_series(1, 50) AS g;

INSERT INTO risk_reports (id, incident_id, reported_by_id, location, description, severity, is_active, created_at, updated_at)
SELECT
    _seed_uuid('risk-real-' || g),
    (SELECT id FROM _incidents WHERE rn = 1 + ((g - 1) % 50)),
    (SELECT id FROM _users WHERE rn = 1 + ((g + 5 - 1) % 50)),
    ST_SetSRID(ST_MakePoint(-6.5 + (g * 0.05), 38.2 + (g * 0.04)), 4326),
    'Reporte registrado durante simulacion en zona operativa',
    (ARRAY['LOW','MEDIUM','HIGH'])[1 + ((g - 1) % 3)],
    (g % 6 <> 0),
    now() - ((g % 15) || ' days')::interval,
    now()
FROM generate_series(1, 50) AS g;

INSERT INTO core_workarea (incident_id, name, area_type, center, radius_m, polygon, active, created_at)
SELECT
    (SELECT id FROM _incidents WHERE rn = 1 + ((g - 1) % 50)),
    'Zona Operativa ' || lpad(g::text, 3, '0'),
    CASE WHEN g % 2 = 0 THEN 'CIRCLE' ELSE 'POLYGON' END,
    CASE WHEN g % 2 = 0 THEN ST_SetSRID(ST_MakePoint(-6.9 + (g * 0.05), 38.1 + (g * 0.04)), 4326) ELSE NULL END,
    CASE WHEN g % 2 = 0 THEN 300 + (g * 8) ELSE NULL END,
    CASE WHEN g % 2 = 1 THEN ST_Buffer(ST_SetSRID(ST_MakePoint(-6.9 + (g * 0.05), 38.1 + (g * 0.04)), 4326)::geography, 200 + (g * 5))::geometry ELSE NULL END,
    TRUE,
    now() - ((g % 20) || ' days')::interval
FROM generate_series(1, 50) AS g;

DROP FUNCTION _seed_uuid(text);
COMMIT;
