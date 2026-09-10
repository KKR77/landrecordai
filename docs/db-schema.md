# Database Schema Documentation

## Overview

This document describes the PostgreSQL database schema for the Land Record Digitisation Platform. The schema is designed with security (Row Level Security), auditability (immutable audit trails), and performance in mind.

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROFILES                                │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                                   │
│ role (enum: public, patwari, tehsildar, admin)                 │
│ tehsil_scope (text, nullable)                                   │
│ name (text)                                                     │
│ phone (text, nullable)                                          │
│ created_at (timestamp)                                          │
│ updated_at (timestamp)                                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ created_by
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RECORDS                                 │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                                   │
│ khasra_no (text)                                                │
│ khata_no (text)                                                 │
│ owner_name (text)                                               │
│ village (text)                                                  │
│ tehsil (text)                                                   │
│ district (text)                                                 │
│ area_declared (numeric, nullable)                               │
│ land_class (text, nullable)                                     │
│ status (enum: draft, verified, disputed, archived)             │
│ locked_fields (jsonb)                                           │
│ created_by (UUID, FK → profiles.id)                            │
│ created_at (timestamp)                                          │
│ updated_at (timestamp)                                          │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         │ record_id          │ upload_id          │ record_id
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ RECORD_VERSIONS │  │    UPLOADS      │  │  FRAUD_ALERTS   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (UUID, PK)   │  │ id (UUID, PK)   │  │ id (UUID, PK)   │
│ record_id (FK)  │  │ storage_path    │  │ record_id (FK)  │
│ field_diffs     │  │ uploader_id(FK) │  │ type (enum)     │
│ source (enum)   │  │ record_id (FK)  │  │ severity (enum) │
│ tamper_score    │  │ status (enum)   │  │ details (jsonb) │
│ ocr_confidence  │  │ ocr_confidence  │  │ resolved (bool) │
│ created_by (FK) │  │ tamper_score    │  │ resolved_by(FK) │
│ created_at      │  │ tamper_details  │  │ resolved_at     │
└─────────────────┘  │ checksum        │  │ created_at      │
                     │ device_finger   │  └─────────────────┘
                     │ claimed_by (FK) │
                     │ claimed_at      │         │
                     │ created_at      │         │ record_id
                     │ updated_at      │         ▼
                     └─────────────────┘  ┌─────────────────┐
                              │           │  NOTIFICATIONS  │
                              │           ├─────────────────┤
                              │ record_id │ id (UUID, PK)   │
                              └──────────▶│ record_id (FK)  │
                                          │ channel (enum)  │
                                          │ recipient       │
                                          │ payload (jsonb) │
                                          │ status (enum)   │
                                          │ retry_count     │
                                          │ next_retry_at   │
                                          │ created_at      │
                                          │ updated_at      │
                                          └─────────────────┘
                                                   │
                                                   │ record_id
                                                   ▼
                                          ┌─────────────────┐
                                          │    SYNC_LOG     │
                                          ├─────────────────┤
                                          │ id (UUID, PK)   │
                                          │ record_id (FK)  │
                                          │ target (enum)   │
                                          │ status (enum)   │
                                          │ payload (jsonb) │
                                          │ response (jsonb)│
                                          │ retry_count     │
                                          │ next_retry_at   │
                                          │ created_at      │
                                          │ updated_at      │
                                          └─────────────────┘
```

## Table Definitions

### 1. profiles

User profiles with role-based access control.

**Columns:**
- `id` (UUID, PRIMARY KEY): References auth.users.id
- `role` (ENUM): User role (public, patwari, tehsildar, admin)
- `tehsil_scope` (TEXT, NULLABLE): Assigned tehsil for scope isolation
- `name` (TEXT, NOT NULL): User's full name
- `phone` (TEXT, NULLABLE): Contact phone number
- `created_at` (TIMESTAMP): Record creation time
- `updated_at` (TIMESTAMP): Last update time

**Indexes:**
- `idx_profiles_role`: Index on role for fast role-based queries
- `idx_profiles_tehsil_scope`: Index on tehsil_scope for scope filtering

**RLS Policies:**
- Users can read their own profile
- Admins can read all profiles
- Tehsildars can read profiles in their tehsil
- Only admins can insert/update profiles
- Users can update their own profile (except role)

**Triggers:**
- `on_auth_user_created`: Auto-create profile when user signs up
- `update_profiles_updated_at`: Auto-update updated_at timestamp

---

### 2. records

Land record master data.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique record identifier
- `khasra_no` (TEXT, NOT NULL): Land parcel number
- `khata_no` (TEXT, NOT NULL): Account number
- `owner_name` (TEXT, NOT NULL): Land owner's name
- `village` (TEXT, NOT NULL): Village name
- `tehsil` (TEXT, NOT NULL): Tehsil name
- `district` (TEXT, NOT NULL): District name
- `area_declared` (NUMERIC, NULLABLE): Declared area in acres
- `land_class` (TEXT, NULLABLE): Land classification (agricultural, residential, etc.)
- `status` (ENUM): Record status (draft, verified, disputed, archived)
- `locked_fields` (JSONB): Fields that cannot be modified
- `created_by` (UUID, FK → profiles.id): User who created the record
- `created_at` (TIMESTAMP): Record creation time
- `updated_at` (TIMESTAMP): Last update time

**Indexes:**
- `idx_records_khasra_no`: Index on khasra_no for fast lookups
- `idx_records_village`: Index on village for location-based queries
- `idx_records_tehsil`: Index on tehsil for scope filtering
- `idx_records_status`: Index on status for status-based queries
- `idx_records_created_at`: Index on created_at for time-based queries

**RLS Policies:**
- Public users can read verified records only
- Patwaris can read records in their tehsil
- Tehsildars can read records in their tehsil
- Admins can read all records
- Only patwaris/tehsildars/admins can insert records
- Only patwaris/tehsildars/admins can update records in their tehsil
- Quarantine trigger: Blocks record creation if tamper_score > 0.70

**Constraints:**
- `unique_khasra_village`: Unique constraint on (khasra_no, village) to prevent duplicates

---

### 3. uploads

Document upload tracking and processing status.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique upload identifier
- `storage_path` (TEXT, NOT NULL): Path to file in Supabase Storage
- `uploader_id` (UUID, FK → profiles.id): User who uploaded the document
- `record_id` (UUID, FK → records.id, NULLABLE): Associated record (null until processed)
- `status` (ENUM): Upload status (pending, processing, completed, failed, admin_queue, quarantine)
- `ocr_confidence` (JSONB): OCR confidence scores per field
- `tamper_score` (NUMERIC): Forensic tamper detection score (0.0 to 1.0)
- `tamper_details` (JSONB): Detailed forensic analysis results
- `checksum` (TEXT): SHA-256 hash of the uploaded file
- `device_fingerprint` (TEXT, NULLABLE): Device identifier for fraud detection
- `claimed_by` (UUID, FK → profiles.id, NULLABLE): Admin who claimed the upload for review
- `claimed_at` (TIMESTAMP, NULLABLE): Time when upload was claimed
- `created_at` (TIMESTAMP): Upload creation time
- `updated_at` (TIMESTAMP): Last update time

**Indexes:**
- `idx_uploads_status`: Index on status for queue queries
- `idx_uploads_uploader_id`: Index on uploader_id for user-specific queries
- `idx_uploads_record_id`: Index on record_id for record-lookup queries
- `idx_uploads_claimed_by`: Index on claimed_by for claim-lock queries
- `idx_uploads_created_at`: Index on created_at for time-based queries

**RLS Policies:**
- Users can read their own uploads
- Patwaris can read uploads in their tehsil
- Tehsildars can read uploads in their tehsil
- Admins can read all uploads
- Users can insert their own uploads
- Only admins can update uploads (status changes)

**Triggers:**
- `update_uploads_updated_at`: Auto-update updated_at timestamp

---

### 4. record_versions

Immutable audit trail for all record changes.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique version identifier
- `record_id` (UUID, FK → records.id): Associated record
- `field_diffs` (JSONB): Changes made (old_value → new_value)
- `source` (ENUM): Change source (manual, ocr, admin, system)
- `tamper_score` (NUMERIC, NULLABLE): Tamper score at time of change
- `ocr_confidence` (JSONB, NULLABLE): OCR confidence at time of change
- `created_by` (UUID, FK → profiles.id): User who made the change
- `created_at` (TIMESTAMP): Change timestamp

**Indexes:**
- `idx_record_versions_record_id`: Index on record_id for record history
- `idx_record_versions_created_at`: Index on created_at for time-based queries
- `idx_record_versions_source`: Index on source for source-based queries

**RLS Policies:**
- Users can read versions for records they can access
- System can insert versions (via Edge Functions)
- **NO UPDATE OR DELETE ALLOWED** (immutable audit trail)

**Triggers:**
- `prevent_record_versions_update`: Blocks UPDATE operations
- `prevent_record_versions_delete`: Blocks DELETE operations

**Important:** This table is append-only. Once a version is created, it cannot be modified or deleted. This ensures a complete audit trail.

---

### 5. fraud_alerts

Fraud detection alerts and their resolution status.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique alert identifier
- `record_id` (UUID, FK → records.id): Associated record
- `type` (ENUM): Alert type (exact_duplicate, near_duplicate, spatial_overlap, area_mismatch, tamper_detected)
- `severity` (ENUM): Alert severity (low, medium, high, critical)
- `details` (JSONB): Detailed alert information
- `resolved` (BOOLEAN): Whether the alert has been resolved
- `resolved_by` (UUID, FK → profiles.id, NULLABLE): User who resolved the alert
- `resolved_at` (TIMESTAMP, NULLABLE): Resolution timestamp
- `created_at` (TIMESTAMP): Alert creation time

**Indexes:**
- `idx_fraud_alerts_record_id`: Index on record_id for record-specific alerts
- `idx_fraud_alerts_type`: Index on type for type-based queries
- `idx_fraud_alerts_severity`: Index on severity for priority filtering
- `idx_fraud_alerts_resolved`: Index on resolved for status filtering
- `idx_fraud_alerts_created_at`: Index on created_at for time-based queries

**RLS Policies:**
- Users can read alerts for records they can access
- Patwaris can insert alerts for records in their tehsil
- Tehsildars can insert alerts for records in their tehsil
- Admins can insert alerts for any record
- Only admins can update alerts (mark as resolved)

---

### 6. notifications

Notification delivery tracking with retry logic.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique notification identifier
- `record_id` (UUID, FK → records.id, NULLABLE): Associated record (null for system notifications)
- `channel` (ENUM): Delivery channel (sms, whatsapp, email)
- `recipient` (TEXT, NOT NULL): Recipient contact information
- `payload` (JSONB): Notification content and metadata
- `status` (ENUM): Delivery status (pending, sent, delivered, failed, retrying, failed_permanent)
- `retry_count` (INTEGER): Number of retry attempts
- `next_retry_at` (TIMESTAMP, NULLABLE): Next scheduled retry time
- `created_at` (TIMESTAMP): Notification creation time
- `updated_at` (TIMESTAMP): Last update time

**Indexes:**
- `idx_notifications_record_id`: Index on record_id for record-specific notifications
- `idx_notifications_status`: Index on status for status-based queries
- `idx_notifications_channel`: Index on channel for channel-based queries
- `idx_notifications_next_retry_at`: Index on next_retry_at for retry queue processing
- `idx_notifications_created_at`: Index on created_at for time-based queries

**RLS Policies:**
- Users can read notifications they received
- Admins can read all notifications
- System can insert notifications (via Edge Functions)
- Only admins can update notifications (status changes)

**Triggers:**
- `update_notifications_updated_at`: Auto-update updated_at timestamp

---

### 7. sync_log

External system synchronization tracking.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique sync log identifier
- `record_id` (UUID, FK → records.id): Associated record
- `target` (ENUM): Sync target (dilrmp)
- `status` (ENUM): Sync status (pending, in_progress, success, failed, retrying)
- `payload` (JSONB): Data sent to external system
- `response` (JSONB, NULLABLE): Response from external system
- `retry_count` (INTEGER): Number of retry attempts
- `next_retry_at` (TIMESTAMP, NULLABLE): Next scheduled retry time
- `created_at` (TIMESTAMP): Sync log creation time
- `updated_at` (TIMESTAMP): Last update time

**Indexes:**
- `idx_sync_log_record_id`: Index on record_id for record-specific syncs
- `idx_sync_log_target`: Index on target for target-based queries
- `idx_sync_log_status`: Index on status for status-based queries
- `idx_sync_log_next_retry_at`: Index on next_retry_at for retry queue processing
- `idx_sync_log_created_at`: Index on created_at for time-based queries

**RLS Policies:**
- Users can read sync logs for records they can access
- Admins can read all sync logs
- System can insert sync logs (via Edge Functions)
- Only admins can update sync logs (status changes)

**Triggers:**
- `update_sync_log_updated_at`: Auto-update updated_at timestamp

---

## Enum Types

### user_role
```sql
CREATE TYPE user_role AS ENUM ('public', 'patwari', 'tehsildar', 'admin');
```

### record_status
```sql
CREATE TYPE record_status AS ENUM ('draft', 'verified', 'disputed', 'archived');
```

### upload_status
```sql
CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'admin_queue', 'quarantine');
```

### version_source
```sql
CREATE TYPE version_source AS ENUM ('manual', 'ocr', 'admin', 'system');
```

### fraud_type
```sql
CREATE TYPE fraud_type AS ENUM ('exact_duplicate', 'near_duplicate', 'spatial_overlap', 'area_mismatch', 'tamper_detected');
```

### fraud_severity
```sql
CREATE TYPE fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');
```

### notification_channel
```sql
CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'email');
```

### notification_status
```sql
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'retrying', 'failed_permanent');
```

### sync_target
```sql
CREATE TYPE sync_target AS ENUM ('dilrmp');
```

### sync_status
```sql
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'success', 'failed', 'retrying');
```

---

## Row Level Security (RLS)

All tables have RLS enabled with policies enforcing:

1. **Role-based access**: Users can only access data appropriate for their role
2. **Tehsil scope isolation**: Patwaris and Tehsildars can only access records in their assigned tehsil
3. **Audit trail immutability**: record_versions cannot be modified or deleted
4. **Quarantine enforcement**: Database trigger blocks record creation if tamper_score > 0.70

### RLS Policy Examples

**Public users can read verified records:**
```sql
CREATE POLICY "Public can read verified records"
ON records FOR SELECT
TO public
USING (status = 'verified');
```

**Patwaris can read records in their tehsil:**
```sql
CREATE POLICY "Patwaris can read tehsil records"
ON records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'patwari'
    AND profiles.tehsil_scope = records.tehsil
  )
);
```

**Quarantine enforcement trigger:**
```sql
CREATE OR REPLACE FUNCTION check_quarantine()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM uploads
    WHERE uploads.record_id = NEW.id
    AND uploads.tamper_score > 0.70
  ) THEN
    RAISE EXCEPTION 'Cannot create record: upload is quarantined (tamper_score > 0.70)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_quarantine
BEFORE INSERT ON records
FOR EACH ROW
EXECUTE FUNCTION check_quarantine();
```

---

## Migrations

All schema changes are managed through versioned migration files in `supabase/migrations/`:

1. `00000000000000_init.sql` - Initial schema with all tables
2. `00000000000001_add_claim_lock.sql` - Add claim-lock fields to uploads
3. `00000000000002_add_tamper_details.sql` - Add tamper_details to uploads
4. `00000000000003_add_notification_retry.sql` - Add retry fields to notifications
5. `00000000000004_add_analytics_aggregates.sql` - Add analytics functions
6. `00000000000005_add_ai_assistant_parser.sql` - Add query parser function

**Important:** Never modify the database schema manually. Always use migration files.

---

## Performance Considerations

### Indexes
- All foreign keys are indexed
- Frequently queried fields (status, tehsil, created_at) are indexed
- Composite indexes for common query patterns

### Query Optimization
- Use `EXPLAIN ANALYZE` to identify slow queries
- Avoid `SELECT *` - only select needed columns
- Use pagination for large result sets
- Consider materialized views for complex aggregations (future)

### Connection Pooling
- Supabase handles connection pooling automatically
- Use prepared statements for repeated queries
- Keep transactions short

---

## Security Best Practices

1. **Never expose service role key** to client-side code
2. **Always use RLS** - never disable it
3. **Validate all inputs** before database operations
4. **Use parameterized queries** to prevent SQL injection
5. **Audit all changes** via record_versions
6. **Encrypt sensitive data** at rest and in transit
7. **Rotate secrets regularly** (API keys, tokens)

---

## Backup and Recovery

- Supabase provides automatic daily backups
- Point-in-time recovery available for up to 7 days
- Manual backups can be triggered via Supabase dashboard
- Test restore procedures regularly

---

## Monitoring

### Key Metrics
- Query execution time
- Connection pool usage
- Table sizes and growth rate
- Index usage statistics
- RLS policy violations

### Alerts
- Slow queries (> 1 second)
- High connection pool usage (> 80%)
- RLS policy violations
- Failed transactions

---

## Documentation References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migrations](https://supabase.com/docs/guides/database/migrations)

---

**Document Version:** 1.0  
**Last Updated:** Phase 7 Completion  
**Status:** Production-Ready
