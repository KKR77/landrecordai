-- Migration: Add claim-lock fields to uploads table
-- Phase 4: Admin Verification Queue

-- Add claimed_by field to track which admin is reviewing
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add claimed_at timestamp
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Add index for efficient querying of unclaimed items
CREATE INDEX IF NOT EXISTS idx_uploads_claimed_by ON public.uploads(claimed_by) WHERE claimed_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.uploads.claimed_by IS 'Admin user currently reviewing this upload (claim-lock to prevent duplicate reviews)';
COMMENT ON COLUMN public.uploads.claimed_at IS 'Timestamp when the claim was made';
