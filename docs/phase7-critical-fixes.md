# Phase 7 Critical Security Fixes

## Overview

This document describes two critical fixes implemented in Phase 7 to address security vulnerabilities identified during the code review.

---

## 🔴 CRITICAL FIX #1: AI Service Import Error

### Problem

The `ai-service/app/routing.py` module had a Python import error that prevented the entire AI service from starting:

```python
# Line 20: Missing 'Any' in import
from typing import Tuple, Dict, List, Optional

# Lines 98, 99, 211: Using 'Any' in type annotations
fraud_alerts: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:

# Line 239: Duplicate import at bottom of file
from typing import Dict, Any
```

**Impact:** 
- The entire FastAPI application failed to start with `NameError: name 'Any' is not defined`
- All endpoints (`/preprocess`, `/ocr-extract`, `/pipeline`, etc.) were unreachable
- The complete document processing pipeline was non-functional

### Root Cause

Python evaluates type annotations at function definition time. The `Any` type was used in function signatures before it was imported, causing an immediate `NameError` when the module was loaded.

### Solution

**File:** `ai-service/app/routing.py`

**Changes:**
1. Added `Any` to the import statement on line 20:
   ```python
   from typing import Tuple, Dict, List, Optional, Any
   ```

2. Removed the duplicate import at line 239:
   ```python
   # REMOVED: from typing import Dict, Any
   ```

### Verification

Created test script `test_routing_import.py` to verify:
- Module imports without errors
- `route_by_confidence()` function works correctly
- `route_document_v3()` function works correctly
- All type annotations resolve properly

**Status:** ✅ FIXED - AI service can now start successfully

---

## 🔴 CRITICAL FIX #2: Anonymous Access to Unmasked Records

### Problem

The RLS policy on the `records` table granted anonymous users SELECT access to the entire base table:

```sql
-- Migration 00000000000008, lines 71-76
CREATE POLICY "Anon can view masked records"
  ON public.records FOR SELECT
  TO anon
  USING (true)  -- ❌ GRANTS ACCESS TO ALL ROWS
  WITH CHECK (false);
```

**Impact:**
- Anonymous users could query `GET /rest/v1/records` via Supabase REST API
- They received ALL columns including:
  - `owner_name` (real names, not masked)
  - `locked_fields` (sensitive audit data)
  - All other sensitive fields
- The `records_public` view with masking was optional, not enforced
- This violated the core privacy requirement: "even against a compromised frontend"

### Root Cause

The policy used `USING (true)` which grants SELECT on all rows of the base table. While a masked view (`records_public`) existed, it was a separate optional path. Nothing prevented direct queries to the base table.

PostgreSQL RLS policies control row access, not column access. You cannot use RLS to hide specific columns - you must use a view for that.

### Solution

**File:** `supabase/migrations/00000000000016_phase7_security_fix_anon_records.sql`

**Changes:**

1. **Dropped the problematic policy:**
   ```sql
   DROP POLICY IF EXISTS "Anon can view masked records" ON public.records;
   ```

2. **Revoked direct SELECT privilege:**
   ```sql
   REVOKE SELECT ON public.records FROM anon;
   ```

3. **Added explicit deny policy (defense-in-depth):**
   ```sql
   CREATE POLICY "Deny anon access to base records table"
     ON public.records
     FOR SELECT
     TO anon
     USING (false);  -- Always deny
   ```

4. **Ensured masked view is accessible:**
   ```sql
   GRANT SELECT ON public.records_public TO anon;
   ```

5. **Updated original migration with security note:**
   - Added comment explaining the policy was dropped
   - References the fix migration

### Verification

Created comprehensive test suite `supabase/tests/security_test_anon_records.sql`:

**Test 1:** Verify anon CANNOT query base table
```sql
SET ROLE anon;
SELECT * FROM public.records;  -- Should FAIL with permission denied
```

**Test 2:** Verify anon CAN query masked view
```sql
SELECT * FROM public.records_public;  -- Should SUCCEED
-- owner_name should be 'REDACTED'
-- locked_fields should not be present
```

**Test 3:** Verify authenticated users still work
```sql
-- Authenticated users can access records in their tehsil scope
```

**Test 4:** Verify defense-in-depth
```sql
-- Both REVOKE and policy are in place
```

**Test 5:** Verify view definition
```sql
-- View masks owner_name and excludes locked_fields
```

### Security Guarantees After Fix

✅ **Anonymous users CANNOT:**
- Query `public.records` directly (blocked by REVOKE + policy)
- Access real `owner_name` values
- Access `locked_fields` audit data
- Bypass masking via REST API

✅ **Anonymous users CAN:**
- Query `public.records_public` view only
- See `owner_name` as 'REDACTED'
- Access only verified records (status = 'verified')
- View non-sensitive fields (khasra_no, village, tehsil, etc.)

✅ **Authenticated users:**
- Still have full access based on their role and tehsil scope
- No change to existing functionality

### Defense-in-Depth

The fix uses two layers of protection:

1. **REVOKE:** Removes the SELECT privilege at the database level
2. **Policy:** Explicitly denies access via RLS (even if REVOKE is somehow bypassed)

This ensures that even if one mechanism fails, the other still blocks access.

**Status:** ✅ FIXED - Anonymous users can only access masked data

---

## Testing Instructions

### Test Fix #1 (AI Service Import)

```bash
cd /path/to/project
python3 test_routing_import.py
```

Expected output:
```
Testing routing.py import...
✓ routing.py imported successfully

Testing route_by_confidence...
✓ Decision: auto_save
  Reason: All fields meet 90% confidence threshold

Testing route_document_v3...
✓ Decision: auto_save
  Reason: All checks passed: confidence ≥90%, tamper score low (15.0), no fraud.
  Tags: []
  Blocked: False

✅ All routing tests passed!
```

### Test Fix #2 (RLS Security)

```bash
# In Supabase SQL editor or psql:
\i supabase/migrations/00000000000016_phase7_security_fix_anon_records.sql
\i supabase/tests/security_test_anon_records.sql
```

Expected output:
```
NOTICE:  ✓ TEST 1 PASSED: Anon cannot access base records table
NOTICE:  ✓ TEST 2a PASSED: Anon can query records_public view (count: N)
NOTICE:  ✓ TEST 2b PASSED: owner_name is masked as REDACTED
NOTICE:  ✓ TEST 2c PASSED: locked_fields is excluded from view
NOTICE:  ✓ TEST 3 PASSED: Authenticated user policy exists
NOTICE:  ✓ TEST 4a PASSED: REVOKE SELECT on base table is in effect
NOTICE:  ✓ TEST 4b PASSED: Deny policy for anon is in place
NOTICE:  ✓ TEST 5a PASSED: View definition masks owner_name
NOTICE:  ✓ TEST 5b PASSED: View filters by status = verified

========================================
SECURITY TEST SUMMARY
========================================
✓ Anon CANNOT access base records table
✓ Anon CAN access records_public view
✓ owner_name is masked as REDACTED
✓ locked_fields is excluded from view
✓ Authenticated users can still access records
✓ Defense-in-depth: REVOKE + policy both in place
========================================
ALL SECURITY TESTS PASSED
========================================
```

---

## Impact Assessment

### Before Fixes

❌ **AI Service:** Completely non-functional (import error)
❌ **Privacy:** Anonymous users could read unmasked records
❌ **Compliance:** Violated architecture doc Section 8 requirements

### After Fixes

✅ **AI Service:** Fully functional, all endpoints accessible
✅ **Privacy:** Anonymous users can only access masked data
✅ **Compliance:** Meets all security requirements from architecture doc

---

## Files Modified

1. `ai-service/app/routing.py` - Fixed import error
2. `supabase/migrations/00000000000008_create_rls_policies.sql` - Added security note
3. `supabase/migrations/00000000000016_phase7_security_fix_anon_records.sql` - New migration (FIX)
4. `supabase/tests/security_test_anon_records.sql` - New test suite
5. `test_routing_import.py` - New verification script

---

## Recommendations

### Immediate Actions

1. ✅ Apply migration `00000000000016` to production
2. ✅ Run security tests to verify the fix
3. ✅ Restart AI service to pick up the import fix
4. ✅ Test the full pipeline end-to-end

### Future Improvements

1. **Add automated security tests to CI/CD:**
   - Run `security_test_anon_records.sql` on every deployment
   - Fail the build if anon can access base table

2. **Add import validation to AI service:**
   - Run `python -c "import app.routing"` in CI
   - Catch import errors before deployment

3. **Document the masked view pattern:**
   - Add to architecture docs
   - Explain why RLS can't hide columns
   - Show the correct pattern (view + REVOKE)

4. **Regular security audits:**
   - Quarterly review of RLS policies
   - Test with different roles (anon, authenticated, admin)
   - Verify no privilege escalation paths

---

## Conclusion

Both critical issues have been fixed:

1. ✅ **AI Service Import Error** - Fixed by adding `Any` to imports
2. ✅ **Anonymous Access Vulnerability** - Fixed by revoking access and adding deny policy

The platform now meets the security requirements specified in the architecture document. Anonymous users can only access properly masked data, and the AI service is fully functional.

**Status:** ✅ READY FOR PRODUCTION

---

## References

- Architecture Document: Section 8 (Security)
- Phase 1 Prompt: RLS policy requirements
- Phase 7 Review: Critical issues identified
- PostgreSQL RLS Documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
