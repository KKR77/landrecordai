-- Enable required extensions
-- This must run first before any spatial or vector operations

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are active
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('postgis', 'vector', 'uuid-ossp');
