# Land Record Digitisation Platform

**Project:** PS 26018  
**Phase:** 1-2 of 7 — Foundation + Core OCR Pipeline  
**Status:** Phase 2 Complete

## Overview

This phase establishes the data layer for the Land Record Digitisation platform using Supabase (Postgres + PostGIS + pgvector). The system implements comprehensive Row Level Security (RLS) with role-based access control (RBAC) to ensure data isolation by tehsil scope.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│              App Router + TypeScript Strict              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL + PostGIS + pgvector                  │  │
│  │  - 7 tables with RLS policies                     │  │
│  │  - Role-based access control                      │  │
│  │  - Tehsil-scoped data isolation                   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Auth + Storage + Realtime                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

1. **profiles** - User profiles linked to auth.users
   - Roles: public, patwari, tehsildar, admin
   - Tehsil scope for data isolation

2. **records** - Land ownership records with spatial data
   - PostGIS geometry for boundary data
   - Locked fields (jsonb) for immutable data
   - Status tracking (draft, verified, disputed, archived)

3. **record_versions** - Append-only audit trail
   - Field diffs (jsonb) for change tracking
   - Tamper scores and OCR confidence
   - Blocked UPDATE/DELETE via triggers

4. **uploads** - Document scans and processing
   - Storage paths and checksums
   - Device fingerprints for fraud detection
   - OCR confidence and tamper scores

5. **fraud_alerts** - Detected fraud attempts
   - Type and severity classification
   - Resolution tracking
   - Detailed JSON metadata

6. **notifications** - SMS/WhatsApp/email delivery
   - Multi-channel support
   - Delivery status tracking
   - Error logging

7. **sync_log** - External system synchronization
   - DILRMP, revenue dept, court system integration
   - Retry logic with exponential backoff
   - Request/response logging

### Migrations

All database changes are in versioned SQL files under `supabase/migrations/`:

```
00000000000000_enable_extensions.sql
00000000000001_create_profiles.sql
00000000000002_create_records.sql
00000000000003_create_record_versions.sql
00000000000004_create_uploads.sql
00000000000005_create_fraud_alerts.sql
00000000000006_create_notifications.sql
00000000000007_create_sync_log.sql
00000000000008_create_rls_policies.sql
```

**Important:** Never make manual changes via the Supabase dashboard. Always use migrations.

## Role Model

### Roles

| Role | Description | Access Scope |
|------|-------------|--------------|
| **public** | Unauthenticated or non-official users | Masked records only (owner_name redacted) |
| **patwari** | Village-level land record officer | Full records in assigned tehsil |
| **tehsildar** | Tehsil-level supervisor | All records in assigned tehsil |
| **admin** | System administrator | All records across all tehsils |

### Role Assignment

- **Only admins can assign roles** - users cannot self-assign elevated roles
- Role changes are logged in `record_versions`
- Role assignment is restricted via RLS policy on `profiles` table

### Tehsil Scope

Each official (patwari/tehsildar) is assigned to a specific tehsil via the `tehsil_scope` field:

- **Admin:** `tehsil_scope = NULL` → access to all tehsils
- **Tehsildar/Patwari:** `tehsil_scope = 'Tehsil-A'` → access only to Tehsil-A records
- **Public:** `tehsil_scope` is ignored (no record access)

## Row Level Security (RLS)

### Security Principles

1. **Deny-by-default** - All tables have RLS enabled with no default access
2. **Least privilege** - Users get minimum permissions needed for their role
3. **Tehsil isolation** - Data is scoped by tehsil to prevent cross-jurisdiction access
4. **Append-only audit** - `record_versions` cannot be modified or deleted
5. **Masked public view** - Anonymous users see redacted data only

### Key Policies

#### Records Table

**Anonymous Access:**
```sql
-- Anonymous can view masked records via public view
CREATE VIEW public.records_public AS
SELECT
  id, khasra_no, khata_no,
  'REDACTED' AS owner_name,  -- Masked!
  village, tehsil, district,
  area_declared, land_class,
  ST_AsGeoJSON(geom)::jsonb AS geom,
  status, created_at, updated_at
FROM public.records
WHERE status = 'verified';
```

**Authenticated Access:**
```sql
-- Users can view records in their tehsil scope
CREATE POLICY "Users can view records in scope"
  ON public.records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin' OR              -- Admin sees all
          tehsil_scope IS NULL OR        -- NULL scope = all tehsils
          tehsil_scope = records.tehsil  -- Match tehsil
        )
    )
  );
```

**Write Access:**
```sql
-- Only officials can create/update records
CREATE POLICY "Officials can create records"
  ON public.records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('patwari', 'tehsildar', 'admin')
        AND (
          role = 'admin' OR
          tehsil_scope IS NULL OR
          tehsil_scope = records.tehsil
        )
    )
  );
```

#### Record Versions (Append-Only)

```sql
-- Block UPDATE
CREATE TRIGGER prevent_update
  BEFORE UPDATE ON public.record_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_record_versions_update();

-- Block DELETE
CREATE TRIGGER prevent_delete
  BEFORE DELETE ON public.record_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_record_versions_delete();
```

## TypeScript Types

Types are generated from the database schema and located in `src/types/supabase.ts`:

```typescript
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Record = Database['public']['Tables']['records']['Row']
export type RecordVersion = Database['public']['Tables']['record_versions']['Row']
// ... etc
```

**Important:** These types must match the database schema exactly. Any database changes require regenerating these types.

## Zod Validation

Form validation schemas in `src/lib/schemas.ts` match the database shape:

```typescript
export const RecordInsertSchema = z.object({
  khasra_no: z.string().min(1, 'Khasra number is required'),
  khata_no: z.string().min(1, 'Khata number is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  village: z.string().min(1, 'Village is required'),
  tehsil: z.string().min(1, 'Tehsil is required'),
  district: z.string().min(1, 'District is required'),
  // ... etc
})
```

## Environment Variables

Required variables (validated on startup):

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The application will **fail loudly** if these are missing. See `.env.example` for reference.

## Testing RLS Policies

Test queries are in `supabase/tests/rls_policy_tests.sql`. Key tests:

1. **Anonymous access** - Can view masked records only
2. **Tehsil scope** - Patwari cannot access records outside their tehsil
3. **Append-only** - Cannot UPDATE/DELETE record_versions
4. **Role assignment** - Only admins can create profiles

Run tests by setting role:
```sql
SET ROLE 'patwari-uuid';
SELECT * FROM public.records WHERE tehsil = 'Tehsil-A';
-- Expected: SUCCESS

SELECT * FROM public.records WHERE tehsil = 'Tehsil-B';
-- Expected: FAIL - 0 rows
```

## File Structure

```
├── supabase/
│   ├── migrations/           # Versioned SQL migrations
│   │   ├── 00000000000000_enable_extensions.sql
│   │   ├── 00000000000001_create_profiles.sql
│   │   └── ... (8 total)
│   └── tests/
│       └── rls_policy_tests.sql
├── src/
│   ├── types/
│   │   └── supabase.ts       # Generated database types
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts     # Typed Supabase client
│   │   ├── schemas.ts        # Zod validation schemas
│   │   └── env.ts            # Environment validation
│   └── App.tsx               # Demo dashboard
├── .env.example              # Environment template
└── README.md                 # This file
```

## Phase 2: Core OCR Pipeline

### AI Service (FastAPI)

Standalone Python microservice at `ai-service/`:

**Endpoints:**
- `GET /health` - Health check
- `POST /preprocess` - Image preprocessing (deskew, denoise, CLAHE, threshold)
- `POST /ocr-extract` - Tesseract OCR with Hindi + English
- `POST /ner-extract` - Named entity recognition (regex-based)
- `POST /route` - Routing decision (auto_save vs admin_queue)
- `POST /pipeline` - Full pipeline orchestration

**Pipeline Stages:**
1. **Preprocessing**: Deskew → Denoise → CLAHE → Adaptive Threshold → Readability Check
2. **OCR**: Tesseract with Hindi + English language packs
3. **NER**: Regex-based field extraction (owner_name, khasra_no, khata_no, etc.)
4. **Routing**: Auto-save if all fields ≥90% confidence, else admin queue

**Testing:**
- pytest suite for each stage
- Clean and degraded image tests
- Coverage reporting

**Run locally:**
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Docker:**
```bash
docker-compose up --build
```

### Supabase Edge Function

`supabase/functions/process-upload/index.ts`:
- Triggered by webhook on uploads INSERT
- Downloads image from Storage
- Calls AI service pipeline
- Routes to auto_save or admin_queue
- Logs all stages with correlation_id

### Frontend Upload Page

`src/pages/UploadPage.tsx`:
- File picker for Patwari/Tehsildar
- Uploads to Supabase Storage
- Creates uploads row
- Realtime subscription for live status
- Shows: processing → auto-saved/admin_queue/failed

### What's Real vs Stubbed

**Real (Phase 2):**
- ✅ Image preprocessing (OpenCV)
- ✅ OCR extraction (Tesseract)
- ✅ Regex-based NER
- ✅ Routing logic
- ✅ Full pipeline orchestration
- ✅ Error handling at every stage
- ✅ Correlation IDs for tracing

**Stubbed (Phase 3+):**
- ⚠️ NER is regex-based (no fine-tuned model yet)
- ⚠️ Tamper detection (forensic analysis)
- ⚠️ Fraud rules engine

## Next Steps (Phase 3+)

- [ ] Forensic analysis (ELA, PRNU, FFT)
- [ ] Tamper detection
- [ ] Fraud rules engine
- [ ] Fine-tuned NER model (if needed)
- [ ] GPU acceleration
- [ ] Real-time admin queue UI
- [ ] SMS/WhatsApp notification delivery
- [ ] DILRMP webhook integration

## Open Questions

1. **UUID generation:** Should we use `uuid_generate_v4()` or switch to `gen_random_uuid()` (Postgres 13+)?
2. **Geometry SRID:** Using 4326 (WGS84) for GPS coordinates. Is this correct for your region?
3. **Tehsil scope NULL:** Admins have NULL tehsil_scope (all access). Should we use a special value instead?
4. **Locked fields:** Currently jsonb. Should we use a typed structure instead?
5. **Audit logging:** Should we add a separate audit_log table for security events?

## Security Notes

- **Never commit `.env` file** - only `.env.example`
- **Never expose service role key** in client-side code
- **RLS policies are non-negotiable** - do not disable for convenience
- **All migrations must be versioned** - no manual dashboard edits
- **Test RLS thoroughly** before deploying to production

## Support

For questions about RLS policies or role model, refer to:
- `supabase/migrations/00000000000008_create_rls_policies.sql`
- `supabase/tests/rls_policy_tests.sql`
- This README's "Role Model" and "Row Level Security" sections
