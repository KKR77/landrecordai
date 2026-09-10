-- Create record_versions table (audit trail)
-- Append-only table for tracking all changes to records

CREATE TABLE IF NOT EXISTS public.record_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  field_diffs JSONB NOT NULL DEFAULT '{}'::jsonb, -- what changed
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'system', 'migration')),
  tamper_score NUMERIC(5, 2) CHECK (tamper_score >= 0 AND tamper_score <= 100),
  ocr_confidence JSONB, -- confidence scores per field from OCR
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_record_versions_record_id ON public.record_versions(record_id);
CREATE INDEX idx_record_versions_created_at ON public.record_versions(created_at DESC);
CREATE INDEX idx_record_versions_source ON public.record_versions(source);
CREATE INDEX idx_record_versions_created_by ON public.record_versions(created_by);

-- Enable RLS
ALTER TABLE public.record_versions ENABLE ROW LEVEL SECURITY;

-- Trigger to block UPDATE on record_versions (append-only)
CREATE OR REPLACE FUNCTION public.prevent_record_versions_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'record_versions is append-only. UPDATE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_update
  BEFORE UPDATE ON public.record_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_record_versions_update();

-- Trigger to block DELETE on record_versions (append-only)
CREATE OR REPLACE FUNCTION public.prevent_record_versions_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'record_versions is append-only. DELETE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_delete
  BEFORE DELETE ON public.record_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_record_versions_delete();
