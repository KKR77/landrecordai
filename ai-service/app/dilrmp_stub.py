"""
DILRMP Stub Endpoint — Phase 5

⚠️  STUB/MOCK IMPLEMENTATION
    This is a mock DILRMP endpoint for development and testing.
    It logs incoming requests and echoes back a success response.
    
    For production:
    - Replace with real DILRMP API endpoint
    - Update DILRMP_API_URL environment variable
    - Implement proper authentication
    - Handle DILRMP-specific error codes and responses

Run this alongside the main AI service:
    uvicorn app.dilrmp_stub:app --port 8001

Author: PS 26018
Version: 5.0.0
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DILRMP Stub API",
    description="Mock DILRMP endpoint for development (STUB - not production-ready)",
    version="1.0.0-stub"
)


# ============================================================================
# Request/Response Models
# ============================================================================

class DILRMPRecord(BaseModel):
    """DILRMP record schema (simplified for stub)"""
    khasra_number: str
    khata_number: str
    owner_full_name: str
    village_name: str
    tehsil_name: str
    district_name: str
    area_in_hectares: Optional[float] = None
    land_classification: Optional[str] = None
    boundary_geometry: Optional[Dict[str, Any]] = None
    verification_status: str
    record_created_date: Optional[str] = None
    sync_timestamp: str
    source_system: str
    source_version: str


class DILRMPResponse(BaseModel):
    """DILRMP response schema (stub)"""
    success: bool
    message: str
    dilrmp_record_id: Optional[str] = None
    timestamp: str


# ============================================================================
# Stub Endpoint
# ============================================================================

@app.post("/dilrmp-stub", response_model=DILRMPResponse)
async def receive_dilrmp_record(record: DILRMPRecord):
    """
    Receive record from land digitisation platform
    
    ⚠️  STUB: This endpoint just logs and echoes back success.
        Real DILRMP would:
        - Validate against their schema
        - Check for duplicates
        - Process and store in their database
        - Return DILRMP-specific record ID
        - Handle errors with specific error codes
    
    Args:
        record: DILRMP-compatible record
        
    Returns:
        DILRMPResponse with success status
    """
    # Log the incoming request
    logger.info("=" * 80)
    logger.info("DILRMP STUB: Received record sync request")
    logger.info(f"  Khasra: {record.khasra_number}")
    logger.info(f"  Khata: {record.khata_number}")
    logger.info(f"  Owner: {record.owner_full_name}")
    logger.info(f"  Village: {record.village_name}")
    logger.info(f"  Tehsil: {record.tehsil_name}")
    logger.info(f"  District: {record.district_name}")
    logger.info(f"  Area: {record.area_in_hectares} hectares")
    logger.info(f"  Status: {record.verification_status}")
    logger.info(f"  Source: {record.source_system} v{record.source_version}")
    logger.info(f"  Sync Time: {record.sync_timestamp}")
    
    if record.boundary_geometry:
        logger.info(f"  Geometry: {record.boundary_geometry.get('type', 'unknown')}")
    
    logger.info("=" * 80)
    
    # Generate stub DILRMP record ID
    stub_dilrmp_id = f"DILRMP-{uuid.uuid4().hex[:12].upper()}"
    
    # Return success response
    return DILRMPResponse(
        success=True,
        message=f"Record received successfully (STUB - not actually stored)",
        dilrmp_record_id=stub_dilrmp_id,
        timestamp=datetime.utcnow().isoformat()
    )


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "dilrmp-stub",
        "version": "1.0.0-stub",
        "note": "This is a STUB endpoint for development only",
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Run standalone
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 80)
    print("⚠️  DILRMP STUB ENDPOINT")
    print("This is a mock implementation for development/testing only.")
    print("Do NOT use this in production.")
    print("=" * 80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
