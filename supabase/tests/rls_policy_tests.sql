-- RLS Policy Test Queries
-- Run these as different roles to verify policies work correctly
-- Use: SET ROLE <role>; or test via Supabase client with different user tokens

-- ============================================================================
-- SETUP: Create test users (run as admin/superuser)
-- ============================================================================

-- Insert test profiles (assuming auth.users already has these UUIDs)
-- Replace these UUIDs with actual auth.users IDs from your project
INSERT INTO public.profiles (id, role, tehsil_scope, name, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', NULL, 'Admin User', '+91-99999-00001'),
  ('00000000-0000-0000-0000-000000000002', 'tehsildar', 'Tehsil-A', 'Tehsildar A', '+91-99999-00002'),
  ('00000000-0000-0000-0000-000000000003', 'patwari', 'Tehsil-A', 'Patwari A', '+91-99999-00003'),
  ('00000000-0000-0000-0000-000000000004', 'public', 'Tehsil-B', 'Public User B', '+91-99999-00004');

-- Insert test records
INSERT INTO public.records (id, khasra_no, khata_no, owner_name, village, tehsil, district, area_declared, land_class, created_by) VALUES
  ('11111111-1111-1111-1111-111111111111', '123', '45', 'Ramesh Kumar', 'Village-1', 'Tehsil-A', 'District-1', 2.5, 'Agricultural', '00000000-0000-0000-0000-000000000003'),
  ('22222222-2222-2222-2222-222222222222', '456', '78', 'Suresh Singh', 'Village-2', 'Tehsil-B', 'District-1', 1.8, 'Residential', '00000000-0000-0000-0000-000000000004');

-- ============================================================================
-- TEST 1: PROFILES TABLE
-- ============================================================================

-- Test 1.1: User can view own profile
SET ROLE '00000000-0000-0000-0000-000000000001'; -- admin
SELECT * FROM public.profiles WHERE id = auth.uid();
-- Expected: SUCCESS - returns admin's profile

-- Test 1.2: Admin can view all profiles
SET ROLE '00000000-0000-0000-0000-000000000001'; -- admin
SELECT * FROM public.profiles;
-- Expected: SUCCESS - returns all profiles

-- Test 1.3: Patwari can view profiles in their tehsil
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
SELECT * FROM public.profiles WHERE tehsil_scope = 'Tehsil-A';
-- Expected: SUCCESS - returns profiles with Tehsil-A scope

-- Test 1.4: Public user cannot view other profiles
SET ROLE '00000000-0000-0000-0000-000000000004'; -- public user
SELECT * FROM public.profiles WHERE id != auth.uid();
-- Expected: FAIL - returns 0 rows (no access to other profiles)

-- Test 1.5: Non-admin cannot create profile
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari
INSERT INTO public.profiles (id, role, name) VALUES ('99999999-9999-9999-9999-999999999999', 'public', 'Test');
-- Expected: FAIL - permission denied

-- ============================================================================
-- TEST 2: RECORDS TABLE
-- ============================================================================

-- Test 2.1: Anonymous can view masked records (via view)
SET ROLE anon;
SELECT * FROM public.records_public;
-- Expected: SUCCESS - returns verified records with REDACTED owner_name

-- Test 2.2: Anonymous cannot access raw records table
SET ROLE anon;
SELECT * FROM public.records;
-- Expected: FAIL - permission denied

-- Test 2.3: Patwari can view records in their tehsil
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
SELECT * FROM public.records WHERE tehsil = 'Tehsil-A';
-- Expected: SUCCESS - returns Tehsil-A records with full owner_name

-- Test 2.4: Patwari cannot view records outside their tehsil
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
SELECT * FROM public.records WHERE tehsil = 'Tehsil-B';
-- Expected: FAIL - returns 0 rows

-- Test 2.5: Admin can view all records
SET ROLE '00000000-0000-0000-0000-000000000001'; -- admin
SELECT * FROM public.records;
-- Expected: SUCCESS - returns all records

-- Test 2.6: Patwari can insert record in their tehsil
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
INSERT INTO public.records (khasra_no, khata_no, owner_name, village, tehsil, district, area_declared, created_by)
VALUES ('789', '90', 'New Owner', 'Village-3', 'Tehsil-A', 'District-1', 3.0, auth.uid());
-- Expected: SUCCESS

-- Test 2.7: Patwari cannot insert record outside their tehsil
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
INSERT INTO public.records (khasra_no, khata_no, owner_name, village, tehsil, district, area_declared, created_by)
VALUES ('999', '99', 'Test', 'Village-X', 'Tehsil-B', 'District-1', 1.0, auth.uid());
-- Expected: FAIL - permission denied

-- Test 2.8: Public user cannot insert records
SET ROLE '00000000-0000-0000-0000-000000000004'; -- public
INSERT INTO public.records (khasra_no, khata_no, owner_name, village, tehsil, district, area_declared, created_by)
VALUES ('111', '22', 'Test', 'Village-X', 'Tehsil-A', 'District-1', 1.0, auth.uid());
-- Expected: FAIL - permission denied

-- ============================================================================
-- TEST 3: RECORD_VERSIONS TABLE
-- ============================================================================

-- Test 3.1: User can view versions for accessible records
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
SELECT * FROM public.record_versions WHERE record_id = '11111111-1111-1111-1111-111111111111';
-- Expected: SUCCESS - returns versions for Tehsil-A record

-- Test 3.2: User cannot view versions for records outside scope
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
SELECT * FROM public.record_versions WHERE record_id = '22222222-2222-2222-2222-222222222222';
-- Expected: FAIL - returns 0 rows (Tehsil-B record)

-- Test 3.3: Cannot UPDATE record_versions (append-only)
SET ROLE '00000000-0000-0000-0000-000000000001'; -- admin
UPDATE public.record_versions SET tamper_score = 50 WHERE id = 'some-uuid';
-- Expected: FAIL - trigger raises exception

-- Test 3.4: Cannot DELETE record_versions (append-only)
SET ROLE '00000000-0000-0000-0000-000000000001'; -- admin
DELETE FROM public.record_versions WHERE id = 'some-uuid';
-- Expected: FAIL - trigger raises exception

-- ============================================================================
-- TEST 4: UPLOADS TABLE
-- ============================================================================

-- Test 4.1: User can view own uploads
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari
SELECT * FROM public.uploads WHERE uploader_id = auth.uid();
-- Expected: SUCCESS - returns own uploads

-- Test 4.2: User cannot view other users' uploads (unless official with scope)
SET ROLE '00000000-0000-0000-0000-000000000004'; -- public
SELECT * FROM public.uploads WHERE uploader_id != auth.uid();
-- Expected: FAIL - returns 0 rows

-- ============================================================================
-- TEST 5: FRAUD_ALERTS TABLE
-- ============================================================================

-- Test 5.1: Officials can view fraud alerts in their scope
SET ROLE '00000000-0000-0000-0000-000000000003'; -- patwari Tehsil-A
SELECT * FROM public.fraud_alerts fa
JOIN public.records r ON r.id = fa.record_id
WHERE r.tehsil = 'Tehsil-A';
-- Expected: SUCCESS - returns fraud alerts for Tehsil-A records

-- Test 5.2: Public users cannot view fraud alerts
SET ROLE '00000000-0000-0000-0000-000000000004'; -- public
SELECT * FROM public.fraud_alerts;
-- Expected: FAIL - returns 0 rows

-- ============================================================================
-- CLEANUP: Reset role
-- ============================================================================
RESET ROLE;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Replace UUIDs with actual auth.users IDs from your project
-- 2. Run tests in order to verify each policy
-- 3. Each test should either succeed (return rows) or fail (permission denied/0 rows)
-- 4. Document any unexpected behavior and adjust policies accordingly
-- 5. These tests should be run after applying all migrations
