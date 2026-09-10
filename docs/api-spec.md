# API Specification

## Overview

This document describes the API endpoints for the Land Record Digitisation Platform. The system consists of:

1. **Frontend API** - React components calling Supabase client
2. **Edge Functions** - Supabase Deno functions for server-side logic
3. **AI Service** - FastAPI service for document processing pipeline

## Base URLs

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Supabase**: `https://your-project-id.supabase.co`
- **AI Service**: `http://localhost:8000` (FastAPI)

## Authentication

All authenticated endpoints require a valid Supabase JWT token in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt-token>
```

## Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `OCR_FAILED`: OCR processing error
- `FORENSIC_FAILED`: Forensic analysis error
- `ROUTING_ERROR`: Routing logic error
- `SYNC_FAILED`: External sync failure
- `NOTIFICATION_FAILED`: Notification delivery failure
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found

---

## Edge Functions

### 1. Process Upload

**Endpoint:** `POST https://your-project-id.supabase.co/functions/v1/process-upload`

**Trigger:** Database webhook on INSERT to `uploads` table

**Description:** Processes a newly uploaded document through the AI pipeline.

**Request:**
```json
{
  "upload_id": "uuid",
  "storage_path": "uploads/2024/01/15/document.pdf",
  "uploader_id": "uuid",
  "uploader_tehsil": "Sadar"
}
```

**Response:**
```json
{
  "status": "completed",
  "upload_id": "uuid",
  "record_id": "uuid",
  "ocr_confidence": {
    "owner_name": 0.95,
    "khasra_no": 0.98,
    "khata_no": 0.92
  },
  "tamper_score": 0.15,
  "routing_decision": "auto_save"
}
```

**Error Response:**
```json
{
  "status": "failed",
  "upload_id": "uuid",
  "error": {
    "code": "OCR_FAILED",
    "message": "Failed to extract text from document",
    "details": {
      "stage": "ocr",
      "reason": "Image too blurry"
    }
  }
}
```

---

### 2. On Record Change

**Endpoint:** `POST https://your-project-id.supabase.co/functions/v1/on-record-change`

**Trigger:** Database webhook on INSERT/UPDATE to `records` table

**Description:** Handles notifications and external sync when records are created or updated.

**Request:**
```json
{
  "record_id": "uuid",
  "event_type": "INSERT",
  "old_record": null,
  "new_record": {
    "id": "uuid",
    "khasra_no": "12345",
    "status": "verified"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "notifications_sent": 1,
  "sync_triggered": true
}
```

---

## AI Service Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the AI service is running.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2. Preprocess Image

**Endpoint:** `POST /preprocess`

**Description:** Preprocess an image for OCR (deskew, denoise, enhance).

**Request:**
```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "processed_image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "readability_score": 0.85,
  "processing_time_ms": 1234
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": {
    "code": "FORENSIC_FAILED",
    "message": "Image preprocessing failed",
    "details": {
      "reason": "Invalid image format"
    }
  }
}
```

---

### 3. OCR Extract

**Endpoint:** `POST /ocr-extract`

**Description:** Extract text from preprocessed image using Tesseract.

**Request:**
```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "languages": ["hin", "eng"],
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "text": "Khasra No: 12345\nKhata No: 67890\nOwner: Ramesh Kumar...",
  "confidence": 0.92,
  "bounding_boxes": [
    {
      "text": "Khasra No:",
      "confidence": 0.95,
      "bbox": [100, 200, 300, 250]
    }
  ],
  "processing_time_ms": 2345
}
```

---

### 4. NER Extract

**Endpoint:** `POST /ner-extract`

**Description:** Extract structured fields from OCR text using regex patterns.

**Request:**
```json
{
  "text": "Khasra No: 12345\nKhata No: 67890\nOwner: Ramesh Kumar...",
  "ocr_confidence": 0.92,
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "extracted_data": {
    "owner_name": "Ramesh Kumar",
    "khasra_no": "12345",
    "khata_no": "67890",
    "village": "Rampur",
    "tehsil": "Sadar",
    "district": "Lucknow",
    "area_declared": 2.5,
    "land_class": "agricultural"
  },
  "field_confidence": {
    "owner_name": 0.95,
    "khasra_no": 0.98,
    "khata_no": 0.92,
    "village": 0.88,
    "tehsil": 0.90,
    "district": 0.85,
    "area_declared": 0.80,
    "land_class": 0.75
  },
  "processing_time_ms": 567
}
```

---

### 5. Forensic Analyze

**Endpoint:** `POST /forensic-analyze`

**Description:** Run forensic analysis to detect document tampering.

**Request:**
```json
{
  "original_image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "processed_image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "tamper_score": 0.15,
  "forensic_details": {
    "ela": {
      "score": 0.10,
      "weight": 0.30,
      "details": "No significant compression artifacts detected"
    },
    "prnu": {
      "score": 0.12,
      "weight": 0.20,
      "details": "Consistent noise pattern across image"
    },
    "font_baseline": {
      "score": 0.08,
      "weight": 0.20,
      "details": "Uniform font and baseline alignment"
    },
    "fft": {
      "score": 0.20,
      "weight": 0.15,
      "details": "No periodic patterns detected"
    },
    "metadata": {
      "score": 0.25,
      "weight": 0.15,
      "details": "Metadata intact, no signs of editing"
    }
  },
  "processing_time_ms": 3456
}
```

---

### 6. Fraud Rules

**Endpoint:** `POST /fraud-rules`

**Description:** Run fraud detection rules on extracted data.

**Request:**
```json
{
  "extracted_data": {
    "owner_name": "Ramesh Kumar",
    "khasra_no": "12345",
    "khata_no": "67890",
    "village": "Rampur",
    "tehsil": "Sadar",
    "district": "Lucknow",
    "area_declared": 2.5
  },
  "uploader_tehsil": "Sadar",
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "fraud_alerts": [],
  "processing_time_ms": 234
}
```

**Response with Alerts:**
```json
{
  "status": "success",
  "fraud_alerts": [
    {
      "type": "exact_duplicate",
      "severity": "high",
      "details": {
        "message": "Duplicate khasra number detected",
        "matching_record_id": "uuid",
        "matching_fields": ["khasra_no", "village"]
      }
    }
  ],
  "processing_time_ms": 234
}
```

---

### 7. Route Decision

**Endpoint:** `POST /route`

**Description:** Determine routing decision based on OCR confidence, tamper score, and fraud alerts.

**Request:**
```json
{
  "ocr_confidence": {
    "owner_name": 0.95,
    "khasra_no": 0.98,
    "khata_no": 0.92
  },
  "tamper_score": 0.15,
  "fraud_alerts": [],
  "upload_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "decision": "auto_save",
  "reason": "High confidence (avg 0.95), low tamper (0.15), no fraud alerts",
  "processing_time_ms": 12
}
```

**Decision Matrix:**
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

---

### 8. Send Notification

**Endpoint:** `POST /send-notification`

**Description:** Send notification via SMS or WhatsApp.

**Request:**
```json
{
  "channel": "sms",
  "recipient": "+919876543210",
  "payload": {
    "type": "record_approved",
    "record_id": "uuid",
    "khasra_no": "12345",
    "message": "Your land record has been approved"
  },
  "correlation_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "notification_id": "uuid",
  "delivery_status": "sent",
  "processing_time_ms": 567
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": {
    "code": "NOTIFICATION_FAILED",
    "message": "Failed to send SMS",
    "details": {
      "channel": "sms",
      "reason": "Invalid phone number"
    }
  }
}
```

---

### 9. Sync to DILRMP

**Endpoint:** `POST /sync-to-dilrmp`

**Description:** Sync approved record to DILRMP system (STUB).

**Request:**
```json
{
  "record_id": "uuid",
  "record_data": {
    "khasra_no": "12345",
    "khata_no": "67890",
    "owner_name": "Ramesh Kumar",
    "village": "Rampur",
    "tehsil": "Sadar",
    "district": "Lucknow",
    "area_declared": 2.5,
    "land_class": "agricultural",
    "status": "verified"
  },
  "correlation_id": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "sync_log_id": "uuid",
  "dilrmp_response": {
    "status": "received",
    "dilrmp_id": "DILRMP-2024-001234"
  },
  "processing_time_ms": 890
}
```

**Note:** This is a STUB endpoint. Real DILRMP integration requires actual API endpoint and authentication.

---

### 10. Analytics Aggregates

**Endpoint:** `POST /analytics/aggregates`

**Description:** Get aggregated analytics data for dashboard.

**Request:**
```json
{
  "viewer_id": "uuid",
  "viewer_role": "tehsildar",
  "viewer_tehsil_scope": "Sadar",
  "metrics": [
    "upload_stats",
    "ocr_correction_rate",
    "queue_breakdown",
    "tehsil_progress",
    "fraud_summary"
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "upload_stats": {
      "total_uploads": 1234,
      "today_uploads": 45,
      "weekly_uploads": 234,
      "avg_processing_time": 12.5
    },
    "ocr_correction_rate": [
      {"date": "2024-01-15", "rate": 0.05},
      {"date": "2024-01-14", "rate": 0.07}
    ],
    "queue_breakdown": {
      "admin_queue": 23,
      "quarantine": 5
    },
    "tehsil_progress": [
      {
        "tehsil": "Sadar",
        "total_records": 500,
        "verified_records": 450,
        "progress_percent": 90.0
      }
    ],
    "fraud_summary": {
      "exact_duplicate": 12,
      "near_duplicate": 8,
      "spatial_overlap": 3,
      "area_mismatch": 5,
      "tamper_detected": 2
    }
  }
}
```

---

### 11. AI Record Assistant

**Endpoint:** `POST /assistant/query`

**Description:** Process natural language query and return matching records.

**Request:**
```json
{
  "query": "disputed records in Rampur village",
  "viewer_id": "uuid",
  "viewer_role": "tehsildar",
  "viewer_tehsil_scope": "Sadar",
  "limit": 50
}
```

**Response:**
```json
{
  "status": "success",
  "query_type": "structured",
  "filters": {
    "village": "Rampur",
    "status": "disputed"
  },
  "results": [
    {
      "id": "uuid",
      "khasra_no": "12345",
      "khata_no": "67890",
      "owner_name": "Ramesh Kumar",
      "village": "Rampur",
      "tehsil": "Sadar",
      "district": "Lucknow",
      "area_declared": 2.5,
      "land_class": "agricultural",
      "status": "disputed",
      "match_reason": "Village matches 'Rampur', status matches 'disputed'"
    }
  ],
  "total_count": 1,
  "processing_time_ms": 234
}
```

**Note:** This is a structured query parser (fallback mode), not true semantic search. It extracts filters from natural language using regex patterns.

---

## Supabase Client API

The frontend uses the Supabase client library to interact with the database. Common operations:

### Query Records

```typescript
const { data, error } = await supabase
  .from('records')
  .select('*')
  .eq('status', 'verified')
  .eq('tehsil', 'Sadar')
  .limit(50);
```

### Insert Upload

```typescript
const { data, error } = await supabase
  .from('uploads')
  .insert({
    storage_path: 'uploads/2024/01/15/document.pdf',
    uploader_id: userId,
    status: 'pending',
    checksum: 'sha256-hash'
  })
  .select()
  .single();
```

### Update Record

```typescript
const { data, error } = await supabase
  .from('records')
  .update({ status: 'verified' })
  .eq('id', recordId)
  .select()
  .single();
```

### Subscribe to Realtime

```typescript
const subscription = supabase
  .channel('uploads-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'uploads' },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```

---

## Rate Limiting

- **Edge Functions:** 100 requests/minute per user
- **AI Service:** 10 requests/minute per user
- **Database:** Supabase handles connection pooling automatically

---

## CORS Configuration

### AI Service (FastAPI)

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## API Versioning

All APIs are versioned via URL path:

- `/v1/process-upload`
- `/v1/ocr-extract`
- etc.

Breaking changes will increment the version number.

---

## Testing

### Test Endpoints

Use the `/health` endpoint to verify service availability:

```bash
curl https://your-project-id.supabase.co/functions/v1/health
curl http://localhost:8000/health
```

### Mock Data

For testing, use the test fixtures in `ai-service/tests/fixtures_phase7.py`:

```bash
cd ai-service
python tests/fixtures_phase7.py
```

This generates test images in `test_fixtures/` directory.

---

## Documentation References

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript/introduction)

---

**Document Version:** 1.0  
**Last Updated:** Phase 7 Completion  
**Status:** Production-Ready (with documented stubs)
