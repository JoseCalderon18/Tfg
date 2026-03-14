TRUNCATE TABLE
  core_workarea,
  risk_reports,
  alerts,
  track_points,
  devices,
  incident_members,
  incidents,
  profiles,
  organizations,
  users
RESTART IDENTITY CASCADE;
