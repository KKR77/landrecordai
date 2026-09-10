-- Phase 3: Add forensic tamper detection columns to uploads
-- Adds tamper_details JSONB and 'quarantine' status

-- Add tamper_details column
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS tamper_details JSONB DEFAULT '{}'::jsonb;

-- Add 'quarantine' to allowed status values
-- Drop and recreate the constraint
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_status_check;
ALTER TABLE public.uploads ADD CONSTRAINT uploads_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'admin_queue', 'quarantine'));

-- Add index for tamper score queries (used by forensic dashboard)
CREATE INDEX IF NOT EXISTS idx_uploads_tamper_score 
  ON public.uploads(tamper_score) 
  WHERE tamper_score IS NOT NULL;

-- Add index for quarantine status
CREATE INDEX IF NOT EXISTS idx_uploads_quarantine 
  ON public.uploads(status) 
  WHERE status = 'quarantine';

-- Comment for documentation
COMMENT ON COLUMN public.uploads.tamper_details IS 'Detailed forensic analysis results including per-check scores and heatmaps';
