-- Phase 7 Security Fix: Revoke anon access to base records table
-- 
-- CRITICAL FIX: The previous policy granted anonymous users SELECT access
-- to the entire records table with USIN (true), allowing them to read
-- unmasked owner_name and locked_fields via direct REST API calls.
--
-- This migration:
-- 1. Drops the problematic policy that granted anon SELECT on base table
-- 2. Revokes all direct SELECT privileges on records table for anon role
-- 3. Ensures anon can ONLY access the masked records_public view
--
-- This closes the privacy vulnerability identified in the Phase 7 review.

-- ============================================================================
-- Step 1: Drop the problematic policy
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view masked records" ON public.records;

-- ============================================================================
-- Step 2: Revoke direct SELECT on records table for anon
-- ============================================================================

REVOKE SELECT ON public.records FROM anon;

-- ============================================================================
-- Step 3: Ensure only the masked view is accessible to anon
-- ============================================================================

-- The records_public view already exists and is properly masked
-- Verify it grants SELECT to anon (this should already be in place)
GRANT SELECT ON public.records_public TO anon;

-- ============================================================================
-- Step 4: Add explicit policy to deny anon access to base table
-- ============================================================================

-- Create a policy that explicitly denies anon access to the base records table
-- This is defense-in-depth: even if REVOKE is bypassed, the policy blocks access
CREATE POLICY "Deny anon access to base records table"
  ON public.records
  FOR SELECT
  TO anon
  USING (false);  -- Always deny

-- ============================================================================
-- Step 5: Verify authenticated access still works
-- ============================================================================

-- Authenticated users should still be able to access records based on their role
-- These policies should already exist, but we verify they're in place

-- Check if the authenticated user policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'records' 
    AND policyname = 'Authenticated users can view records in their scope'
  ) THEN
    RAISE EXCEPTION 'Required policy "Authenticated users can view records in their scope" is missing!';
  END IF;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- After running this migration, verify with these queries:

-- 1. Anon should NOT be able to query base table
-- SELECT * FROM public.records;  -- Should fail with permission denied

-- 2. Anon SHOULD be able to query the masked view
-- SELECT * FROM public.records_public;  -- Should work, owner_name = 'REDACTED'

-- 3. Check policies in place
-- SELECT * FROM pg_policies WHERE tablename = 'records';

-- ============================================================================
-- Notes
-- ============================================================================

-- This fix addresses the critical security vulnerability where:
-- - An anonymous user could call GET /rest/v1/records
-- - The USIN (true) policy allowed reading ALL rows
-- - ALL columns were visible including owner_name and locked_fields
-- - The records_public view was optional, not enforced
--
-- After this fix:
-- - Anon CANNOT query public.records directly (policy USIN false + REVOKE)
-- - Anon CAN ONLY query public.records_public (masked view)
-- - owner_name is always 'REDACTED' in the view
-- - locked_fields is excluded from the view
-- - Defense-in-depth: both REVOKE and policy block access

-- -'Phase 7 Security Fix: Close anon access to unmasked records table';
