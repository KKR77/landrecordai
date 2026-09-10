# Architecture Documentation

## System Overview

The Land Record Digitisation Platform is a comprehensive system for digitizing, verifying, and managing land records with AI-powered fraud detection. The system processes document uploads through a multi-stage pipeline including OCR, NER, forensic analysis, and fraud detection before routing records to appropriate workflows.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Upload  │ │  Queue   │ │Analytics │ │Assistant │          │
│  │   Page   │ │   Page   │ │Dashboard │ │  (LLM)   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend (BaaS)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database with Row Level Security (RLS)       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │ profiles │ │ records  │ │ uploads  │ │  fraud   │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ │  alerts  │   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ └──────────┘   │  │
│  │  │ record   │ │notifications│ │ sync_log │              │  │
│  │  │ versions │ └──────────┘ └──────────┘              │  │
│  │  └──────────┘                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno)                                   │  │
│  │  ┌──────────────────┐  ┌──────────────────┐             │  │
│  │  │ process-upload   │  │ on-record-change │             │  │
│  │  └──────────────────┘  └──────────────────┘             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Service (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pipeline Stages                                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │Preprocess│→│   OCR    │→│   NER    │→│ Forensic │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  │       ↓                                         ↓        │  │
│  │  ┌──────────┐                              ┌──────────┐  │  │
│  │  │ Routing  │                              │  Fraud   │  │  │
│  │  │  Logic   │                              │  Rules   │  │  │
│  │  └──────────┘                              └──────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Integration Services                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Notification │  │    DILRMP    │  │   Analytics  │  │  │
│  │  │   Adapter    │  │  Sync Stub   │  │  Aggregates  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend (React + TypeScript)

**Location:** `src/`

**Key Pages:**
- **Upload Page** (`src/pages/UploadPage.tsx`): Document upload with real-time status
- **Queue Page** (`src/pages/QueuePage.tsx`): Admin review queue with claim-lock mechanism
- **Review Page** (`src/pages/ReviewPage.tsx`): Side-by-side document review with forensic sign-off
- **Analytics Dashboard** (`src/pages/AnalyticsDashboard.tsx`): Real-time metrics and charts
- **AI Record Assistant** (`src/pages/AIRecordAssistant.tsx`): Natural language query interface

**Key Components:**
- **SyncAlertsStatus** (`src/components/SyncAlertsStatus.tsx`): Notification and sync status display
- **Sidebar** (`src/components/Sidebar.tsx`): Navigation and role-based menu

**State Management:** React hooks with Supabase Realtime subscriptions

### 2. Database (Supabase PostgreSQL)

**Location:** `supabase/migrations/`

**Core Tables:**

#### profiles
User profiles with role-based access control
- `id` (UUID, PK)
- `role` (enum: public, patwari, tehsildar, admin)
- `tehsil_scope` (text, nullable)
- `name`, `phone`, `created_at`, `updated_at`

#### records
Land record master data
- `id` (UUID, PK)
- `khasra_no`, `khata_no`, `owner_name`
- `village`, `tehsil`, `district`
- `area_declared`, `land_class`
- `status` (enum: draft, verified, disputed, archived)
- `locked_fields` (jsonb)
- `created_by`, `created_at`, `updated_at`

#### uploads
Document upload tracking
- `id` (UUID, PK)
- `storage_path`, `uploader_id`
- `record_id` (FK, nullable)
- `status` (enum: pending, processing, completed, failed, admin_queue, quarantine)
- `ocr_confidence`, `tamper_score`, `tamper_details` (jsonb)
- `checksum`, `device_fingerprint`
- `claimed_by`, `claimed_at`
- `created_at`, `updated_at`

#### record_versions
Audit trail for record changes
- `id` (UUID, PK)
- `record_id` (FK)
- `field_diffs` (jsonb)
- `source` (enum: manual, ocr, admin, system)
- `tamper_score`, `ocr_confidence` (jsonb)
- `created_by`, `created_at`

#### fraud_alerts
Fraud detection alerts
- `id` (UUID, PK)
- `record_id` (FK)
- `type` (enum: exact_duplicate, near_duplicate, spatial_overlap, area_mismatch, tamper_detected)
- `severity` (enum: low, medium, high, critical)
- `details` (jsonb)
- `resolved`, `resolved_by`, `resolved_at`
- `created_at`

#### notifications
Notification delivery tracking
- `id` (UUID, PK)
- `record_id` (FK, nullable)
- `channel` (enum: sms, whatsapp, email)
- `recipient`, `payload` (jsonb)
- `status` (enum: pending, sent, delivered, failed, retrying, failed_permanent)
- `retry_count`, `next_retry_at`
- `created_at`, `updated_at`

#### sync_log
External system sync tracking
- `id` (UUID, PK)
- `record_id` (FK)
- `target` (enum: dilrmp)
- `status` (enum: pending, in_progress, success, failed, retrying)
- `payload`, `response` (jsonb)
- `retry_count`, `next_retry_at`
- `created_at`, `updated_at`

**Row Level Security (RLS):**
All tables have RLS policies enforcing:
- Role-based access (admin, tehsildar, patwari, public)
- Tehsil scope isolation (users only see records in their tehsil)
- Audit trail immutability (record_versions cannot be modified)
- Quarantine enforcement (tamper_score > 0.70 blocks writes)

### 3. Edge Functions (Supabase Deno)

**Location:** `supabase/functions/`

#### process-upload
Triggered on new upload records
- Downloads image from Supabase Storage
- Calls AI service pipeline
- Updates upload status based on routing decision
- Creates record if auto-save
- Triggers notifications for high-tamper documents

#### on-record-change
Triggered on record INSERT/UPDATE
- Sends owner notifications
- Triggers DILRMP sync for approved records
- Deduplicates notifications (30-minute window)

### 4. AI Service (FastAPI)

**Location:** `ai-service/app/`

**Pipeline Stages:**

#### Preprocessing (`preprocess.py`)
- Deskew using Hough transform
- Denoise using fastNlMeansDenoising
- CLAHE contrast enhancement
- Adaptive thresholding (Gaussian)
- Readability check

#### OCR (`ocr.py`)
- Tesseract OCR with Hindi + English
- Bounding box extraction
- Confidence scoring per field

#### NER (`ner.py`)
- Regex-based field extraction (fallback)
- Extracts: owner_name, khasra_no, khata_no, village, tehsil, district, area_declared, land_class
- Confidence scoring per field

#### Forensic Analysis (`forensic.py`)
- ELA (Error Level Analysis) - 30% weight
- PRNU (Photo Response Non-Uniformity) - 20% weight
- Font/Baseline uniformity - 20% weight
- FFT (Fast Fourier Transform) - 15% weight
- Metadata integrity - 15% weight
- Combined tamper score (0.0 to 1.0)

#### Fraud Rules (`fraud_rules.py`)
- Exact duplicate detection (khasra + khata + village hash)
- Near duplicate detection (pgvector similarity)
- Spatial overlap detection (PostGIS)
- Area mismatch detection

#### Routing (`routing.py`)
Decision table:
```
┌─────────────────┬──────────────┬─────────────┬──────────────┐
│ OCR Confidence  │ Tamper Score │ Fraud Alert │   Decision   │
├─────────────────┼──────────────┼─────────────┼──────────────┤
│ ≥ 90%           │ < 30%        │ None        │ auto_save    │
│ < 90%           │ < 30%        │ None        │ admin_queue  │
│ any             │ 30% - 70%    │ any         │ admin_queue  │
│ any             │ > 70%        │ any         │ quarantine   │
└─────────────────┴──────────────┴─────────────┴──────────────┘
```

#### Notification Adapter (`notifications.py`)
- Twilio SMS integration
- WhatsApp Business API integration
- Exponential backoff retry (3 attempts, 60s base delay)
- Status tracking: pending → sent/delivered/failed → retrying → failed_permanent

#### DILRMP Sync (`dilrmp_sync.py`)
- **STUB IMPLEMENTATION** - Mock endpoint for development
- Schema mapping: local fields → DILRMP fields
- Exponential backoff retry (5 attempts, 5min base delay)
- Only syncs approved records

#### Analytics Aggregates (`analytics.py`)
- Server-side aggregation functions
- Upload statistics (total, today, weekly, avg processing time)
- OCR correction rate (proxy for accuracy)
- Queue breakdown by tag
- Tehsil-wise progress
- Fraud alert summary

## Data Flow

### Upload → Auto-Save Flow
```
1. User uploads document (UploadPage)
2. Supabase Storage stores file
3. Edge Function (process-upload) triggered
4. AI Service pipeline:
   - Preprocess → OCR → NER → Forensic → Fraud Rules → Routing
5. Decision: auto_save
6. Record created in records table
7. Upload status = completed
8. Notification sent to owner
9. DILRMP sync triggered
```

### Upload → Admin Queue Flow
```
1. User uploads document
2. Pipeline detects low confidence OR medium tamper OR fraud alert
3. Decision: admin_queue
4. Upload status = admin_queue
5. Notification sent to Tehsildar/Admin
6. Admin claims record (claim-lock)
7. Admin reviews and corrects
8. Record created/updated
9. Audit trail in record_versions
10. Upload status = completed
```

### Upload → Quarantine Flow
```
1. User uploads document
2. Pipeline detects high tamper (>70%)
3. Decision: quarantine
4. Upload status = quarantine
5. DB-level block prevents record creation
6. Notification sent to owner + all admins
7. Admin reviews with forensic sign-off
8. If approved: record created, status = completed
9. If rejected: status = failed
```

## Security Model

### Authentication
- Supabase Auth with email/password
- JWT tokens with short expiry
- Refresh token rotation

### Authorization (RLS)
- **Admin**: Full access to all records
- **Tehsildar**: Access to records in assigned tehsil
- **Patwari**: Can upload, access records in assigned tehsil
- **Public**: Read-only access to verified records

### Data Isolation
- Tehsil scope enforced at database level
- Users cannot access records outside their scope
- Audit trail immutable (triggers prevent modification)

### Quarantine Enforcement
- Database trigger blocks record creation if tamper_score > 0.70
- Cannot be bypassed by application logic
- Requires explicit admin override

## Error Handling

### Error Taxonomy
- `VALIDATION_ERROR`: Input validation failures
- `OCR_FAILED`: OCR processing errors
- `FORENSIC_FAILED`: Forensic analysis errors
- `ROUTING_ERROR`: Routing logic errors
- `SYNC_FAILED`: External sync failures
- `NOTIFICATION_FAILED`: Notification delivery failures

### Error Handling Strategy
- All pipeline stages catch exceptions
- Errors logged with correlation_id
- Upload status set to 'failed' with error details
- User notified via UI
- Admin notified for critical errors

### Retry Logic
- Notifications: 3 attempts, exponential backoff (60s, 120s, 240s)
- DILRMP sync: 5 attempts, exponential backoff (5min, 10min, 20min, 40min, 80min)
- Max delay capped at 1 hour

## Performance Considerations

### Database
- Indexed on foreign keys and frequently queried fields
- RLS policies optimized with indexes
- Aggregation functions use materialized views (future)

### AI Service
- Pipeline stages are sequential (cannot parallelize due to dependencies)
- Forensic analysis is CPU-intensive (consider GPU acceleration)
- OCR is I/O bound (Tesseract performance)

### Frontend
- Realtime subscriptions for live updates
- Lazy loading for large datasets
- Optimistic updates for better UX

## Deployment

### Environment Variables
See `.env.example` for required variables:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key
- `TWILIO_*`: Twilio credentials (optional)
- `WHATSAPP_*`: WhatsApp credentials (optional)
- `DILRMP_API_URL`: DILRMP endpoint (stub)
- `DILRMP_API_KEY`: DILRMP API key (stub)

### Infrastructure
- Frontend: Vercel/Netlify (static hosting)
- Backend: Supabase (managed PostgreSQL + Edge Functions)
- AI Service: Railway/Render/Fly.io (Python container)
- Storage: Supabase Storage (S3-compatible)

## Monitoring

### Logging
- Structured JSON logs
- Correlation IDs for request tracing
- Error tracking with Sentry (recommended)

### Metrics
- Upload processing time
- OCR confidence distribution
- Tamper score distribution
- Queue wait time
- Notification delivery rate
- Sync success rate

### Alerts
- High error rate (>5% failures)
- Long queue wait time (>1 hour)
- Notification delivery failures
- Sync failures

## Future Enhancements

### Phase 7+ (Post-Hackathon)
1. **True Semantic Search**: Replace regex NER with fine-tuned embedding model
2. **GPU Acceleration**: Move forensic analysis to GPU
3. **Real DILRMP Integration**: Replace stub with actual API
4. **Advanced Analytics**: Predictive models, trend analysis
5. **Mobile App**: React Native app for field officers
6. **Offline Support**: PWA with offline-first architecture
7. **Multi-language Support**: Additional language packs for OCR
8. **Batch Processing**: Bulk upload and processing
9. **Audit Dashboard**: Comprehensive audit trail viewer
10. **API Gateway**: Rate limiting, authentication, versioning

## Known Limitations

1. **NER is Regex-Based**: Not true semantic understanding, limited to predefined patterns
2. **DILRMP is Stubbed**: Mock endpoint, not production-ready
3. **OCR Accuracy Proxy**: Using correction rate as proxy, not ground truth
4. **No GPU Acceleration**: Forensic analysis is CPU-bound
5. **Single Language**: Hindi + English only, no other regional languages
6. **No Batch Processing**: One document at a time
7. **Limited Fraud Rules**: Only 4 fraud types implemented
8. **No Offline Support**: Requires internet connection

## Contact

For questions or issues, contact the development team.

---

**Document Version:** 1.0  
**Last Updated:** Phase 7 Completion  
**Status:** Production-Ready (with documented limitations)
