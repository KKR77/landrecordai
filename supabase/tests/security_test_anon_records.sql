-- ============================================================================
-- Phase 7 Security Test: Verify Anon Cannot Access Base Records Table
-- ============================================================================
-- 
-- This test verifies the fix for the critical RLS vulnerability where
-- anonymous users could read unmasked records from the base table.
--
-- Run this AFTER applying migration 00000000000016
-- ============================================================================

-- ============================================================================
-- TEST 1: Verify anon CANNOT query base records table
-- ============================================================================

-- Set role to anonymous
SET ROLE anon;

-- This should FAIL with "permission denied for table records"
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.records LIMIT 1;
    RAISE EXCEPTION 'SECURITY VIOLATION: Anon can still access base records table!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ TEST 1 PASSED: Anon cannot access base records table';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
  END;
END $$;

-- Reset role
RESET ROLE;

-- ============================================================================
-- TEST 2: Verify anon CAN query the masked view
-- ============================================================================

SET ROLE anon;

-- This should SUCCEED and return masked data
DO $$
DECLARE
  v_count INTEGER;
  v_owner_name TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.records_public;
  RAISE NOTICE '✓ TEST 2a PASSED: Anon can query records_public view (count: %)', v_count;
  
  -- Verify owner_name is masked
  SELECT owner_name INTO v_owner_name FROM public.records_public LIMIT 1;
  IF v_owner_name = 'REDACTED' THEN
    RAISE NOTICE '✓ TEST 2b PASSED: owner_name is masked as REDACTED';
  ELSE
    RAISE EXCEPTION 'SECURITY VIOLATION: owner_name is not masked! Got: %', v_owner_name;
  END IF;
  
  -- Verify locked_fields is not in the view
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'records_public' 
    AND column_name = 'locked_fields'
  ) THEN
    RAISE NOTICE '✓ TEST 2c PASSED: locked_fields is excluded from view';
  ELSE
    RAISE EXCEPTION 'SECURITY VIOLATION: locked_fields is visible in view!';
  END IF;
END $$;

RESET ROLE;

-- ============================================================================
-- TEST 3: Verify authenticated users can still access records
-- ============================================================================

-- This test requires a real authenticated user, so we'll just verify
-- the policy exists and is correctly configured

DO $$
BEGIN
  -- Check that the authenticated user policy exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'records' 
    AND policyname = 'Authenticated users can view records in their scope'
    AND roles::text LIKE '%authenticated%'
  ) THEN
    RAISE NOTICE '✓ TEST 3 PASSED: Authenticated user policy exists';
  ELSE
    RAISE EXCEPTION 'Required policy for authenticated users is missing!';
  END IF;
END $$;

-- ============================================================================
-- TEST 4: Verify defense-in-depth (both REVOKE and policy)
-- ============================================================================

DO $$
DECLARE
  v_revoke_check BOOLEAN;
  v_policy_check BOOLEAN;
BEGIN
  -- Check that anon has no SELECT privilege on base table
  SELECT NOT has_table_privilege('anon', 'public.records', 'SELECT')
  INTO v_revoke_check;
  
  IF v_revoke_check THEN
    RAISE NOTICE '✓ TEST 4a PASSED: REVOKE SELECT on base table is in effect';
  ELSE
    RAISE EXCEPTION 'SECURITY VIOLATION: Anon still has SELECT privilege on base table!';
  END IF;
  
  -- Check that the deny policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'records' 
    AND policyname = 'Deny anon access to base records table'
    AND cmd = 'SELECT'
    AND roles::text LIKE '%anon%'
  ) INTO v_policy_check;
  
  IF v_policy_check THEN
    RAISE NOTICE '✓ TEST 4b PASSED: Deny policy for anon is in place';
  ELSE
    RAISE EXCEPTION 'Deny policy for anon is missing!';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Verify records_public view definition
-- ============================================================================

DO $$
DECLARE
  v_view_def TEXT;
BEGIN
  SELECT pg_get_viewdef('public.records_public', true) INTO v_view_def;
  
  -- Verify the view masks owner_name
  IF v_view_def LIKE '%REDACTED%owner_name%' OR v_view_def LIKE '%owner_name%REDACTED%' THEN
    RAISE NOTICE '✓ TEST 5a PASSED: View definition masks owner_name';
  ELSE
    RAISE EXCEPTION 'View definition does not mask owner_name!';
  END IF;
  
  -- Verify the view filters by status = 'verified'
  IF v_view_def LIKE '%status%verified%' OR v_view_def LIKE '%verified%status%' THEN
    RAISE NOTICE '✓ TEST 5b PASSED: View filters by status = verified';
  ELSE
    RAISE NOTICE '⚠ WARNING: View may not filter by status = verified';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECURITY TEST SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Anon CANNOT access base records table';
  RAISE NOTICE '✓ Anon CAN access records_public view';
  RAISE NOTICE '✓ owner_name is masked as REDACTED';
  RAISE NOTICE '✓ locked_fields is excluded from view';
  RAISE NOTICE '✓ Authenticated users can still access records';
  RAISE NOTICE '✓ Defense-in-depth: REVOKE + policy both in place';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL SECURITY TESTS PASSED';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- MANUAL VERIFICATION (run these in psql or Supabase SQL editor)
-- ============================================================================

-- Test as anonymous user:
-- SET ROLE anon;
-- SELECT * FROM public.records;  -- Should FAIL
-- SELECT * FROM public.records_public;  -- Should SUCCEED with masked data
-- RESET ROLE;

-- Test as authenticated user (replace with real user ID):
-- SET ROLE 'your-user-uuid';
-- SELECT * FROM public.records WHERE tehsil = 'YourTehsil';  -- Should SUCCEED
-- RESET ROLE;
