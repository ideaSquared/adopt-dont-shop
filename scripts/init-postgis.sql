-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Grant usage permissions
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT CREATE ON SCHEMA public TO PUBLIC; 