-- Create records table (land records)
-- Core table for land ownership records with spatial data

CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  khasra_no TEXT NOT NULL,
  khata_no TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  village TEXT NOT NULL,
  tehsil TEXT NOT NULL,
  district TEXT NOT NULL,
  area_declared NUMERIC(12, 4), -- in hectares
  land_class TEXT,
  geom geometry(Polygon, 4326), -- WGS84 SRID for GPS coordinates
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'verified', 'disputed', 'archived')),
  locked_fields JSONB DEFAULT '{}'::jsonb, -- fields that cannot be modified
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Composite unique constraint for land identification
  CONSTRAINT unique_land_record UNIQUE (khasra_no, khata_no, village, tehsil, district)
);

-- Indexes
CREATE INDEX idx_records_khasra ON public.records(khasra_no);
CREATE INDEX idx_records_khata ON public.records(khata_no);
CREATE INDEX idx_records_village ON public.records(village);
CREATE INDEX idx_records_tehsil ON public.records(tehsil);
CREATE INDEX idx_records_district ON public.records(district);
CREATE INDEX idx_records_owner ON public.records(owner_name);
CREATE INDEX idx_records_status ON public.records(status);
CREATE INDEX idx_records_created_by ON public.records(created_by);
CREATE INDEX idx_records_created_at ON public.records(created_at DESC);

-- Spatial index (GIST) for geometry queries
CREATE INDEX idx_records_geom ON public.records USING GIST(geom);

-- Enable RLS
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
