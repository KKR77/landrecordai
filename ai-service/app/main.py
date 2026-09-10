"""
AI Service for Land Record Digitisation Platform
Phase 2: Core OCR Pipeline

This service provides:
- Image preprocessing (deskew, denoise, CLAHE, thresholding)
- OCR extraction (Tesseract with Hindi + English)
- NER extraction (HuggingFace multilingual NER or regex fallback)
- Routing logic (auto_save vs admin_queue based on confidence)

Author: PS 26018
Version: 2.0.0
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import logging
import time
import uuid
from datetime import datetime

from .preprocess import preprocess_image
from .ocr import extract_text
from .ner import extract_entities
from .routing import route_document

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Land Record AI Service",
    description="OCR and NER pipeline for land record digitisation",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class PreprocessRequest(BaseModel):
    """Request model for image preprocessing"""
    image_base64: Optional[str] = None
    storage_path: Optional[str] = None
    
class PreprocessResponse(BaseModel):
    """Response model for preprocessing"""
    success: bool
    readable: bool
    processed_image_base64: Optional[str] = None
    error: Optional[str] = None
    processing_time_ms: int

class OCRRequest(BaseModel):
    """Request model for OCR extraction"""
    image_base64: str
    languages: List[str] = Field(default=["hin", "eng"])

class OCRResponse(BaseModel):
    """Response model for OCR"""
    success: bool
    text: Optional[str] = None
    confidence: float = 0.0
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    processing_time_ms: int

class NERRequest(BaseModel):
    """Request model for NER extraction"""
    text: str
    bounding_boxes: Optional[List[Dict[str, Any]]] = None

class NERResponse(BaseModel):
    """Response model for NER"""
    success: bool
    entities: Optional[Dict[str, Any]] = None
    confidence_scores: Optional[Dict[str, float]] = None
    extraction_method: Optional[str] = None
    error: Optional[str] = None
    processing_time_ms: int

class RoutingRequest(BaseModel):
    """Request model for routing decision"""
    confidence_scores: Dict[str, float]

class RoutingResponse(BaseModel):
    """Response model for routing"""
    decision: str  # "auto_save" or "admin_queue"
    reason: str
    confidence_scores: Dict[str, float]

class PipelineRequest(BaseModel):
    """Request model for full pipeline"""
    image_base64: Optional[str] = None
    storage_path: Optional[str] = None
    upload_id: str
    languages: List[str] = Field(default=["hin", "eng"])

class PipelineResponse(BaseModel):
    """Response model for full pipeline"""
    success: bool
    upload_id: str
    correlation_id: str
    decision: str
    extracted_data: Optional[Dict[str, Any]] = None
    confidence_scores: Optional[Dict[str, float]] = None
    stage_timings: Dict[str, int]
    error: Optional[str] = None


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Returns:
        dict: Status and timestamp
    """
    return {
        "status": "healthy",
        "service": "land-record-ai-service",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Preprocessing Endpoint
# ============================================================================

@app.post("/preprocess", response_model=PreprocessResponse)
async def preprocess_endpoint(request: PreprocessRequest):
    """
    Preprocess image for OCR
    
    Steps:
    1. Deskew using Hough transform
    2. Denoise using fastNlMeansDenoising
    3. Apply CLAHE for contrast enhancement
    4. Adaptive thresholding (Gaussian)
    5. Check if image is readable
    
    Args:
        request: PreprocessRequest with image_base64 or storage_path
        
    Returns:
        PreprocessResponse with processed image and readable flag
    """
    start_time = time.time()
    correlation_id = str(uuid.uuid4())
    
    try:
        logger.info(f"[{correlation_id}] Starting preprocessing")
        
        # Get image data
        if request.image_base64:
            image_data = request.image_base64
        elif request.storage_path:
            # TODO: Fetch from Supabase Storage
            raise HTTPException(
                status_code=501,
                detail="Storage path fetching not yet implemented"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Either image_base64 or storage_path must be provided"
            )
        
        # Preprocess
        processed_image, readable = preprocess_image(image_data)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[{correlation_id}] Preprocessing completed in {processing_time_ms}ms, readable={readable}")
        
        return PreprocessResponse(
            success=True,
            readable=readable,
            processed_image_base64=processed_image,
            processing_time_ms=processing_time_ms
        )
        
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[{correlation_id}] Preprocessing failed: {str(e)}", exc_info=True)
        
        return PreprocessResponse(
            success=False,
            readable=False,
            error=str(e),
            processing_time_ms=processing_time_ms
        )


# ============================================================================
# OCR Endpoint
# ============================================================================

@app.post("/ocr-extract", response_model=OCRResponse)
async def ocr_endpoint(request: OCRRequest):
    """
    Extract text from preprocessed image using Tesseract
    
    Args:
        request: OCRRequest with image_base64 and languages
        
    Returns:
        OCRResponse with extracted text, confidence, and bounding boxes
    """
    start_time = time.time()
    correlation_id = str(uuid.uuid4())
    
    try:
        logger.info(f"[{correlation_id}] Starting OCR extraction")
        
        # Extract text
        text, confidence, bounding_boxes = extract_text(
            request.image_base64,
            request.languages
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[{correlation_id}] OCR completed in {processing_time_ms}ms, confidence={confidence:.2f}")
        
        return OCRResponse(
            success=True,
            text=text,
            confidence=confidence,
            bounding_boxes=bounding_boxes,
            processing_time_ms=processing_time_ms
        )
        
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[{correlation_id}] OCR failed: {str(e)}", exc_info=True)
        
        return OCRResponse(
            success=False,
            error=str(e),
            processing_time_ms=processing_time_ms
        )


# ============================================================================
# NER Endpoint
# ============================================================================

@app.post("/ner-extract", response_model=NERResponse)
async def ner_endpoint(request: NERRequest):
    """
    Extract named entities from OCR text
    
    Uses HuggingFace multilingual NER model or regex fallback
    
    Args:
        request: NERRequest with text and optional bounding_boxes
        
    Returns:
        NERResponse with extracted entities and confidence scores
    """
    start_time = time.time()
    correlation_id = str(uuid.uuid4())
    
    try:
        logger.info(f"[{correlation_id}] Starting NER extraction")
        
        # Extract entities
        entities, confidence_scores, method = extract_entities(
            request.text,
            request.bounding_boxes
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[{correlation_id}] NER completed in {processing_time_ms}ms, method={method}")
        
        return NERResponse(
            success=True,
            entities=entities,
            confidence_scores=confidence_scores,
            extraction_method=method,
            processing_time_ms=processing_time_ms
        )
        
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[{correlation_id}] NER failed: {str(e)}", exc_info=True)
        
        return NERResponse(
            success=False,
            error=str(e),
            processing_time_ms=processing_time_ms
        )


# ============================================================================
# Routing Endpoint
# ============================================================================

@app.post("/route", response_model=RoutingResponse)
async def routing_endpoint(request: RoutingRequest):
    """
    Route document based on confidence scores
    
    Decision:
    - auto_save: All fields >= 90% confidence
    - admin_queue: Any field < 90% confidence
    
    Args:
        request: RoutingRequest with confidence_scores
        
    Returns:
        RoutingResponse with decision and reason
    """
    start_time = time.time()
    correlation_id = str(uuid.uuid4())
    
    try:
        logger.info(f"[{correlation_id}] Starting routing decision")
        
        # Make routing decision
        decision, reason = route_document(request.confidence_scores)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[{correlation_id}] Routing decision: {decision}")
        
        return RoutingResponse(
            decision=decision,
            reason=reason,
            confidence_scores=request.confidence_scores
        )
        
    except Exception as e:
        logger.error(f"[{correlation_id}] Routing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Full Pipeline Endpoint
# ============================================================================

@app.post("/pipeline", response_model=PipelineResponse)
async def pipeline_endpoint(request: PipelineRequest):
    """
    Run full pipeline: preprocess → OCR → NER → route
    
    Args:
        request: PipelineRequest with image and upload_id
        
    Returns:
        PipelineResponse with extracted data and routing decision
    """
    start_time = time.time()
    correlation_id = str(uuid.uuid4())
    stage_timings = {}
    
    try:
        logger.info(f"[{correlation_id}] Starting full pipeline for upload_id={request.upload_id}")
        
        # Stage 1: Preprocess
        stage_start = time.time()
        preprocess_req = PreprocessRequest(
            image_base64=request.image_base64,
            storage_path=request.storage_path
        )
        preprocess_resp = await preprocess_endpoint(preprocess_req)
        stage_timings["preprocess"] = preprocess_resp.processing_time_ms
        
        if not preprocess_resp.success:
            raise Exception(f"Preprocessing failed: {preprocess_resp.error}")
        
        if not preprocess_resp.readable:
            raise Exception("Image is not readable - too degraded for OCR")
        
        if not preprocess_resp.processed_image_base64:
            raise Exception("No processed image returned")
        
        # Stage 2: OCR
        stage_start = time.time()
        ocr_req = OCRRequest(
            image_base64=preprocess_resp.processed_image_base64,
            languages=request.languages
        )
        ocr_resp = await ocr_endpoint(ocr_req)
        stage_timings["ocr"] = ocr_resp.processing_time_ms
        
        if not ocr_resp.success:
            raise Exception(f"OCR failed: {ocr_resp.error}")
        
        if not ocr_resp.text:
            raise Exception("No text extracted from image")
        
        # Stage 3: NER
        stage_start = time.time()
        ner_req = NERRequest(
            text=ocr_resp.text,
            bounding_boxes=ocr_resp.bounding_boxes
        )
        ner_resp = await ner_endpoint(ner_req)
        stage_timings["ner"] = ner_resp.processing_time_ms
        
        if not ner_resp.success:
            raise Exception(f"NER failed: {ner_resp.error}")
        
        if not ner_resp.entities or not ner_resp.confidence_scores:
            raise Exception("No entities extracted from text")
        
        # Stage 4: Routing
        stage_start = time.time()
        routing_req = RoutingRequest(confidence_scores=ner_resp.confidence_scores)
        routing_resp = await routing_endpoint(routing_req)
        stage_timings["routing"] = int((time.time() - stage_start) * 1000)
        
        total_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[{correlation_id}] Pipeline completed in {total_time_ms}ms, decision={routing_resp.decision}")
        
        return PipelineResponse(
            success=True,
            upload_id=request.upload_id,
            correlation_id=correlation_id,
            decision=routing_resp.decision,
            extracted_data=ner_resp.entities,
            confidence_scores=ner_resp.confidence_scores,
            stage_timings=stage_timings
        )
        
    except Exception as e:
        total_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[{correlation_id}] Pipeline failed: {str(e)}", exc_info=True)
        
        return PipelineResponse(
            success=False,
            upload_id=request.upload_id,
            correlation_id=correlation_id,
            decision="failed",
            stage_timings=stage_timings,
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
