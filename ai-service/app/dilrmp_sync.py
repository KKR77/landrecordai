"""
DILRMP Sync Adapter — Phase 5

Transforms local records to DILRMP-compatible JSON and syncs to external system.

⚠️  STUB IMPLEMENTATION: This is a mock/stub for development.
    The real DILRMP endpoint is not available in this hackathon build.
    
    For production integration, you would need:
    1. Real DILRMP API endpoint URL
    2. Authentication credentials (API key, OAuth token, etc.)
    3. Confirmed DILRMP JSON schema (may differ from this mapping)
    4. Rate limiting and retry policies per DILRMP requirements
    5. Proper error handling for DILRMP-specific error codes

The stub endpoint logs and echoes back the request for testing.
Replace DILRMP_API_URL with real endpoint when available.

Author: PS 26018
Version: 5.0.0
"""

import os
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration (from environment variables)
# ============================================================================

DILRMP_API_URL = os.getenv("DILRMP_API_URL", "http://localhost:8001/dilrmp-stub")
DILRMP_API_KEY = os.getenv("DILRMP_API_KEY")


# ============================================================================
# Schema Mapping: Local Record → DILRMP Format
# ============================================================================

def transform_record_to_dilrmp(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform local record to DILRMP-compatible JSON
    
    This is an explicit, documented transform function.
    Field mapping is centralized here, not inlined in the request call.
    
    Args:
        record: Local record dict (from records table)
        
    Returns:
        Dict: DILRMP-compatible JSON
        
    Field Mapping:
        Local Field          → DILRMP Field
        ─────────────────    ─────────────────
        khasra_no           → khasra_number
        khata_no            → khata_number
        owner_name          → owner_full_name
        village             → village_name
        tehsil              → tehsil_name
        district            → district_name
        area_declared       → area_in_hectares
        land_class          → land_classification
        geom (GeoJSON)      → boundary_geometry
        status              → verification_status
        created_at          → record_created_date
    """
    logger.info(f"Transforming record {record.get('id')} to DILRMP format")
    
    # Extract geometry if present
    boundary_geometry = None
    if record.get('geom'):
        # geom is stored as GeoJSON in our DB
        boundary_geometry = record['geom']
    
    # Map fields
    dilrmp_payload = {
        # Core identifiers
        "khasra_number": record.get('khasra_no'),
        "khata_number": record.get('khata_no'),
        
        # Owner information
        "owner_full_name": record.get('owner_name'),
        
        # Location hierarchy
        "village_name": record.get('village'),
        "tehsil_name": record.get('tehsil'),
        "district_name": record.get('district'),
        
        # Land details
        "area_in_hectares": record.get('area_declared'),
        "land_classification": record.get('land_class'),
        
        # Spatial data
        "boundary_geometry": boundary_geometry,
        
        # Status and metadata
        "verification_status": record.get('status', 'draft'),
        "record_created_date": record.get('created_at'),
        
        # Sync metadata
        "sync_timestamp": datetime.utcnow().isoformat(),
        "source_system": "land-record-digitisation-platform",
        "source_version": "5.0.0",
    }
    
    # Remove None values
    dilrmp_payload = {k: v for k, v in dilrmp_payload.items() if v is not None}
    
    logger.info(f"Record transformed: {len(dilrmp_payload)} fields mapped")
    
    return dilrmp_payload


# ============================================================================
# DILRMP API Client
# ============================================================================

async def sync_to_dilrmp(
    record: Dict[str, Any]
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Sync record to DILRMP system
    
    ⚠️  STUB: Currently calls mock endpoint at DILRMP_API_URL
        Replace with real DILRMP endpoint for production.
    
    Args:
        record: Local record dict
        
    Returns:
        Tuple[bool, Optional[Dict], Optional[str]]: 
            (success, response_data, error_message)
    """
    logger.info(f"Syncing record {record.get('id')} to DILRMP")
    
    # Transform to DILRMP format
    dilrmp_payload = transform_record_to_dilrmp(record)
    
    # Check if API URL is configured
    if not DILRMP_API_URL:
        error_msg = "DILRMP_API_URL not configured"
        logger.error(error_msg)
        return False, None, error_msg
    
    try:
        headers = {
            "Content-Type": "application/json",
        }
        
        # Add API key if configured
        if DILRMP_API_KEY:
            headers["Authorization"] = f"Bearer {DILRMP_API_KEY}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DILRMP_API_URL,
                headers=headers,
                json=dilrmp_payload,
                timeout=30.0  # Longer timeout for external API
            )
            
            if response.status_code in [200, 201]:
                response_data = response.json()
                logger.info(f"DILRMP sync successful for record {record.get('id')}")
                return True, response_data, None
            else:
                error_msg = f"DILRMP API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return False, None, error_msg
                
    except httpx.TimeoutException:
        error_msg = "DILRMP API timeout"
        logger.error(error_msg)
        return False, None, error_msg
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, None, error_msg


# ============================================================================
# Retry Logic
# ============================================================================

def calculate_next_retry(retry_count: int) -> datetime:
    """
    Calculate next retry time using exponential backoff
    
    Formula: base_delay * (2 ^ retry_count)
    Base delay: 300 seconds (5 minutes)
    Max delay: 24 hours
    
    Args:
        retry_count: Current retry attempt number
        
    Returns:
        datetime: Next retry time
    """
    from datetime import timedelta
    
    base_delay = 300  # 5 minutes
    max_delay = 86400  # 24 hours
    
    delay = min(base_delay * (2 ** retry_count), max_delay)
    return datetime.utcnow() + timedelta(seconds=delay)


def should_retry(retry_count: int, max_retries: int = 5) -> bool:
    """
    Check if sync should be retried
    
    Args:
        retry_count: Current retry attempt number
        max_retries: Maximum retry attempts (default 5 for sync)
        
    Returns:
        bool: True if should retry, False otherwise
    """
    return retry_count < max_retries


# ============================================================================
# Eligibility Check
# ============================================================================

def is_record_eligible_for_sync(record: Dict[str, Any]) -> bool:
    """
    Check if record is eligible for DILRMP sync
    
    Only records with status='approved' (post Phase 4 review) are eligible.
    
    Args:
        record: Local record dict
        
    Returns:
        bool: True if eligible, False otherwise
    """
    status = record.get('status')
    
    if status != 'approved':
        logger.info(f"Record {record.get('id')} not eligible for sync: status={status}")
        return False
    
    logger.info(f"Record {record.get('id')} eligible for DILRMP sync")
    return True
