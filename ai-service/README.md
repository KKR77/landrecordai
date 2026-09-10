# AI Service - Land Record Digitisation Platform

**Phase 2: Core OCR Pipeline**

Standalone Python FastAPI microservice for document processing:
- Image preprocessing (deskew, denoise, CLAHE, thresholding)
- OCR text extraction (Tesseract with Hindi + English)
- Named Entity Recognition (regex-based with HuggingFace fallback)
- Document routing (auto-save vs admin queue)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Supabase Edge Function                      │
│         (Triggers on uploads INSERT)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AI Service (FastAPI)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /preprocess                                      │  │
│  │  - Deskew (Hough transform)                       │  │
│  │  - Denoise (fastNlMeansDenoising)                 │  │
│  │  - CLAHE (contrast enhancement)                   │  │
│  │  - Adaptive threshold (Gaussian)                  │  │
│  │  - Readability check                              │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /ocr-extract                                     │  │
│  │  - Tesseract OCR (Hindi + English)                │  │
│  │  - Bounding boxes with confidence                 │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /ner-extract                                     │  │
│  │  - Regex-based field extraction                   │  │
│  │  - Heuristic fallback                             │  │
│  │  - Confidence scores per field                    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /route                                           │  │
│  │  - Confidence threshold check (90%)               │  │
│  │  - Decision: auto_save or admin_queue             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Endpoints

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "land-record-ai-service",
  "version": "2.0.0",
  "timestamp": "2026-01-15T10:30:00Z"
}
```

### POST /preprocess
Preprocess image for OCR

**Request:**
```json
{
  "image_base64": "data:image/png;base64,...",
  "storage_path": "uploads/user-id/file.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "readable": true,
  "processed_image_base64": "data:image/png;base64,...",
  "processing_time_ms": 245
}
```

### POST /ocr-extract
Extract text from preprocessed image

**Request:**
```json
{
  "image_base64": "data:image/png;base64,...",
  "languages": ["hin", "eng"]
}
```

**Response:**
```json
{
  "success": true,
  "text": "Khasra No: 123\nKhata No: 456\nOwner: Ramesh Kumar...",
  "confidence": 87.5,
  "bounding_boxes": [
    {
      "text": "Khasra",
      "confidence": 95,
      "x": 100,
      "y": 50,
      "width": 80,
      "height": 20
    }
  ],
  "processing_time_ms": 1230
}
```

### POST /ner-extract
Extract named entities from OCR text

**Request:**
```json
{
  "text": "Khasra No: 123\nKhata No: 456\nOwner: Ramesh Kumar...",
  "bounding_boxes": [...]
}
```

**Response:**
```json
{
  "success": true,
  "entities": {
    "owner_name": "Ramesh Kumar",
    "khasra_no": "123",
    "khata_no": "456",
    "area_declared": 2.5,
    "village": "Rampur",
    "tehsil": "Sadar",
    "district": "Lucknow",
    "land_class": "Agricultural"
  },
  "confidence_scores": {
    "owner_name": 0.85,
    "khasra_no": 0.95,
    "khata_no": 0.92,
    "area_declared": 0.88,
    "village": 0.78,
    "tehsil": 0.82,
    "district": 0.80,
    "land_class": 0.75
  },
  "extraction_method": "combined",
  "processing_time_ms": 45
}
```

### POST /route
Route document based on confidence scores

**Request:**
```json
{
  "confidence_scores": {
    "owner_name": 0.95,
    "khasra_no": 0.92,
    "khata_no": 0.98,
    "village": 0.91,
    "tehsil": 0.93,
    "district": 0.96,
    "area_declared": 0.94
  }
}
```

**Response:**
```json
{
  "decision": "auto_save",
  "reason": "All fields meet 90% confidence threshold",
  "confidence_scores": {...}
}
```

### POST /pipeline
Run full pipeline (preprocess → OCR → NER → route)

**Request:**
```json
{
  "image_base64": "data:image/png;base64,...",
  "upload_id": "uuid-here",
  "languages": ["hin", "eng"]
}
```

**Response:**
```json
{
  "success": true,
  "upload_id": "uuid-here",
  "correlation_id": "uuid-here",
  "decision": "auto_save",
  "extracted_data": {
    "owner_name": "Ramesh Kumar",
    "khasra_no": "123",
    ...
  },
  "confidence_scores": {...},
  "stage_timings": {
    "preprocess": 245,
    "ocr": 1230,
    "ner": 45,
    "routing": 2
  }
}
```

## Installation

### Prerequisites
- Python 3.11+
- Tesseract OCR with Hindi language pack
- Docker (optional, for containerized deployment)

### Local Setup

1. Install system dependencies:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-hin tesseract-ocr-eng
```

**macOS:**
```bash
brew install tesseract tesseract-lang
```

2. Install Python dependencies:
```bash
cd ai-service
pip install -r requirements.txt
```

3. Run the service:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Setup

```bash
docker-compose up --build
```

The service will be available at `http://localhost:8000`

## Testing

Run the test suite:

```bash
cd ai-service
pytest tests/ -v
```

Run with coverage:

```bash
pytest tests/ --cov=app --cov-report=term-missing
```

### Test Coverage

- **test_preprocess.py**: Image preprocessing pipeline
  - Clean image processing
  - Degraded image handling
  - Readability checks
  - Deskew, denoise, CLAHE, thresholding

- **test_ner.py**: Named entity recognition
  - Field extraction (khasra, khata, owner, etc.)
  - Regex patterns
  - Heuristic fallback
  - Validation

- **test_routing.py**: Document routing
  - Auto-save decisions
  - Admin queue decisions
  - Threshold checks
  - Edge cases

## Implementation Notes

### What's Real vs Stubbed

**Real:**
- ✅ Image preprocessing (OpenCV)
- ✅ OCR extraction (Tesseract)
- ✅ Regex-based NER extraction
- ✅ Routing logic
- ✅ Full pipeline orchestration
- ✅ Error handling at every stage
- ✅ Correlation IDs for tracing

**Stubbed/Placeholder:**
- ⚠️ NER is regex-based (no fine-tuned HuggingFace model yet)
  - Clearly documented as fallback
  - Can be replaced with fine-tuned model in Phase 3+
- ⚠️ Tamper detection (Phase 3)
  - Stub functions exist in routing.py
  - Will be implemented with forensic analysis
- ⚠️ Fraud rules (Phase 3)
  - Stub functions exist in routing.py
  - Will be implemented with rule engine

### Design Decisions

1. **Regex-based NER**: Chose regex over HuggingFace because:
   - No fine-tuned model exists for Indian land records
   - Regex is faster and more predictable
   - Can be replaced later without changing API
   - Clearly documented as fallback

2. **Separate endpoints**: Each stage is its own endpoint for:
   - Testability
   - Debugging
   - Flexibility (can call individual stages)
   - Future pipeline variations

3. **Correlation IDs**: Every request gets a correlation_id for:
   - End-to-end tracing
   - Debugging
   - Logging
   - Matching frontend to backend

4. **Explicit error handling**: Every stage:
   - Catches exceptions
   - Returns structured error responses
   - Updates upload status to 'failed'
   - Never silently fails

## Environment Variables

### AI Service
No environment variables required for the AI service itself.

### Supabase Edge Function
Set these in Supabase dashboard:
- `AI_SERVICE_URL`: URL of the AI microservice
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

## Performance

Typical processing times (on CPU):
- Preprocessing: 200-500ms
- OCR: 1-3s (depends on image size and text density)
- NER: 20-50ms
- Routing: <5ms
- **Total: 1.5-4s per document**

GPU acceleration (Phase 3):
- Will reduce OCR time by 5-10x
- Will enable forensic analysis

## Next Steps (Phase 3)

- [ ] Forensic analysis (ELA, PRNU, FFT)
- [ ] Tamper detection
- [ ] Fraud rules engine
- [ ] Fine-tuned NER model (if needed)
- [ ] GPU acceleration
- [ ] Batch processing
- [ ] Caching layer

## Troubleshooting

### Tesseract not found
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract
```

### Hindi language not available
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr-hin

# macOS
brew install tesseract-lang
```

### OpenCV import errors
```bash
# Install system dependencies
sudo apt-get install libgl1-mesa-glx libglib2.0-0
```

### Service won't start
Check logs:
```bash
docker-compose logs ai-service
```

## Support

For issues with:
- **AI Service**: Check `ai-service/` directory
- **Database/RLS**: Check `supabase/migrations/`
- **Frontend**: Check `src/pages/UploadPage.tsx`
- **Edge Function**: Check `supabase/functions/process-upload/`
