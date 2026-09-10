-- Phase 7 Bug Fix: Add missing foreign key constraints and triggers
-- 
-- This migration adds:
-- 1. ON DELETE behavior for fraud_alerts.record_id
-- 2. Trigger to prevent UPDATE/DELETE on record_versions (immutability)
-- 3. Trigger to block record creation when tamper_score > 0.70 (quarantine enforcement)

-- ============================================================================
-- Fix #1: Add ON DELETE CASCADE to fraud_alerts.record_id
-- ============================================================================

-- Drop existing foreign key if it exists
ALTER TABLE public.fraud_alerts 
DROP CONSTRAINT IF EXISTS fraud_alerts_record_id_fkey;

-- Re-add with ON DELETE CASCADE
ALTER TABLE public.fraud_alerts
ADD CONSTRAINT fraud_alerts_record_id_fkey 
FOREIGN KEY (record_id) 
REFERENCES public.records(id) 
ON DELETE CASCADE;

-- ============================================================================
-- Fix #2: Add trigger to prevent UPDATE/DELETE on record_versions
-- ============================================================================

-- Function to prevent updates
CREATE OR REPLACE FUNCTION public.prevent_record_versions_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'record_versions is append-only. UPDATE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- Function to prevent deletes
CREATE OR REPLACE FUNCTION public.prevent_record_versions_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'record_versions is append-only. DELETE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS prevent_record_versions_update_trigger ON public.record_versions;
DROP TRIGGER IF EXISTS prevent_record_versions_delete_trigger ON public.record_versions;

-- Create triggers
CREATE TRIGGER prevent_record_versions_update_trigger
  BEFORE UPDATE ON public.record_versions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_record_versions_update();

CREATE TRIGGER prevent_record_versions_delete_trigger
  BEFORE DELETE ON public.record_versions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_record_versions_delete();

-- ============================================================================
-- Fix #3: Add quarantine enforcement trigger
-- ============================================================================

-- Function to check quarantine status
CREATE OR REPLACE FUNCTION public.check_quarantine_status()
RETURNS TRIGGER AS $$
DECLARE
  v_upload_tamper_score NUMERIC;
BEGIN
  -- Check if there's an associated upload with high tamper score
  SELECT tamper_score INTO v_upload_tamper_score
  FROM public.uploads
  WHERE record_id = NEW.id;
  
  -- If tamper score > 0.70, block the insert
  IF v_upload_tamper_score IS NOT NULL AND v_upload_tamper_score > 0.70 THEN
    RAISE EXCEPTION 'Cannot create record: associated upload is quarantined (tamper_score = %)', v_upload_tamper_score;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_quarantine_status_trigger ON public.records;

-- Create trigger
CREATE TRIGGER check_quarantine_status_trigger
  BEFORE INSERT ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION check_quarantine_status();

COMMENT ON MIGRATION IS 'Phase 7 Bug Fix: Add missing foreign key constraints and triggers for data integrity';
