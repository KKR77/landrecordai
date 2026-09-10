-- Create uploads table (document scans)
-- Tracks all uploaded documents and their processing status

CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL, -- path in Supabase Storage
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  record_id UUID REFERENCES public.records(id) ON DELETE SET NULL, -- nullable until linked
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_confidence JSONB, -- confidence scores per field
  tamper_score NUMERIC(5, 2) CHECK (tamper_score >= 0 AND tamper_score <= 100),
  checksum TEXT NOT NULL, -- SHA-256 hash for integrity verification
  device_fingerprint TEXT, -- device identifier for fraud detection
  file_size BIGINT, -- in bytes
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_uploads_uploader_id ON public.uploads(uploader_id);
CREATE INDEX idx_uploads_record_id ON public.uploads(record_id) WHERE record_id IS NOT NULL;
CREATE INDEX idx_uploads_status ON public.uploads(status);
CREATE INDEX idx_uploads_created_at ON public.uploads(created_at DESC);
CREATE INDEX idx_uploads_checksum ON public.uploads(checksum);

-- Enable RLS
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
