"""
Fraud Rule Engine — Phase 3

Pure functions for fraud detection. Each rule is independently testable.
Rules return fraud alerts that the Edge Function writes to fraud_alerts table.

Rules:
1. Math-Mismatch Guard: Area sum validation
2. Spatial Overlap Guard: PostGIS geometry overlap
3. Duplicate Detection: Exact field hash + pgvector similarity

Author: PS 26018
Version: 3.0.0
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
import hashlib
import json

logger = logging.getLogger(__name__)


# ============================================================================
# Rule 1: Math-Mismatch Guard
# ============================================================================

def check_area_consistency(
    village: str,
    tehsil: str,
    district: str,
    existing_records: List[Dict[str, Any]],
    parent_plot_area: Optional[float] = None
) -> Optional[Dict[str, Any]]:
    """
    Math-Mismatch Guard: Area Sum Validation
    
    Sums declared sub-Khasra areas for a village and compares to parent plot.
    
    Args:
        village: Village name
        tehsil: Tehsil name
        district: District name
        existing_records: List of existing records in this village
            Each record: {id, area_declared, ...}
        parent_plot_area: Registered area of parent plot (if available)
        
    Returns:
        Dict with fraud alert if mismatch detected, None otherwise
        Format: {type, severity, details}
    """
    logger.info(f"Checking area consistency for village={village}")
    
    try:
        # Sum all areas
        total_area = sum(
            r.get('area_declared', 0) or 0
            for r in existing_records
            if r.get('status') != 'archived'
        )
        
        # If no parent plot reference, can't validate
        if parent_plot_area is None:
            logger.info("No parent plot area reference, skipping area check")
            return None
        
        # Calculate difference
        difference = abs(total_area - parent_plot_area)
        tolerance = parent_plot_area * 0.05  # 5% tolerance
        
        if difference > tolerance:
            alert = {
                "type": "area_mismatch",
                "severity": "medium" if difference < parent_plot_area * 0.10 else "high",
                "details": {
                    "village": village,
                    "tehsil": tehsil,
                    "district": district,
                    "declared_total": float(total_area),
                    "parent_plot_area": float(parent_plot_area),
                    "difference": float(difference),
                    "tolerance": float(tolerance),
                    "message": f"Sum of sub-plots ({total_area:.2f}) differs from parent plot ({parent_plot_area:.2f}) by {difference:.2f}"
                }
            }
            
            logger.warning(f"Area mismatch detected: {alert['details']['message']}")
            return alert
        
        logger.info("Area consistency check passed")
        return None
        
    except Exception as e:
        logger.error(f"Area consistency check failed: {str(e)}", exc_info=True)
        return None


# ============================================================================
# Rule 2: Spatial Overlap Guard
# ============================================================================

def check_spatial_overlap(
    new_geom_geojson: Dict[str, Any],
    existing_geoms: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Spatial Overlap Guard
    
    Checks if new plot's geometry overlaps with existing plots.
    Uses simple bounding box check as fallback if PostGIS not available.
    
    NOTE: For production, this should use PostGIS ST_Overlaps/ST_Intersects
    via the SQL function defined in migration 00000000000010.
    This Python implementation is a simplified fallback.
    
    Args:
        new_geom_geojson: GeoJSON geometry of new plot
        existing_geoms: List of existing geometries
            Each: {id, geom (GeoJSON), village, ...}
            
    Returns:
        Dict with fraud alert if overlap detected, None otherwise
    """
    logger.info("Checking spatial overlap")
    
    try:
        if not new_geom_geojson or not existing_geoms:
            return None
        
        # Extract bounding box from GeoJSON
        def get_bbox(geom):
            coords = geom.get('coordinates', [])
            if geom.get('type') == 'Polygon':
                coords = coords[0] if coords else []
            
            if not coords:
                return None
            
            lons = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            
            return {
                'min_lon': min(lons),
                'max_lon': max(lons),
                'min_lat': min(lats),
                'max_lat': max(lats)
            }
        
        new_bbox = get_bbox(new_geom_geojson)
        if not new_bbox:
            return None
        
        overlapping_ids = []
        
        for existing in existing_geoms:
            existing_geom = existing.get('geom')
            if not existing_geom:
                continue
            
            existing_bbox = get_bbox(existing_geom)
            if not existing_bbox:
                continue
            
            # Simple AABB overlap check
            if not (new_bbox['max_lon'] < existing_bbox['min_lon'] or
                    new_bbox['min_lon'] > existing_bbox['max_lon'] or
                    new_bbox['max_lat'] < existing_bbox['min_lat'] or
                    new_bbox['min_lat'] > existing_bbox['max_lat']):
                overlapping_ids.append(existing.get('id'))
        
        if overlapping_ids:
            alert = {
                "type": "spatial_overlap",
                "severity": "high",
                "details": {
                    "overlapping_count": len(overlapping_ids),
                    "overlapping_record_ids": overlapping_ids,
                    "message": f"New plot overlaps with {len(overlapping_ids)} existing plot(s)"
                }
            }
            
            logger.warning(f"Spatial overlap detected: {alert['details']['message']}")
            return alert
        
        logger.info("No spatial overlap detected")
        return None
        
    except Exception as e:
        logger.error(f"Spatial overlap check failed: {str(e)}", exc_info=True)
        return None


# ============================================================================
# Rule 3: Duplicate Detection
# ============================================================================

def compute_field_hash(
    owner_name: str,
    khasra_no: str,
    village: str
) -> str:
    """
    Compute hash for exact duplicate detection
    
    Args:
        owner_name: Owner name
        khasra_no: Khasra number
        village: Village name
        
    Returns:
        SHA-256 hash string
    """
    # Normalize (lowercase, strip whitespace)
    normalized = f"{owner_name.lower().strip()}|{khasra_no.strip()}|{village.lower().strip()}"
    return hashlib.sha256(normalized.encode()).hexdigest()


def check_exact_duplicate(
    owner_name: str,
    khasra_no: str,
    village: str,
    existing_records: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Exact Duplicate Detection
    
    Checks for exact matches on owner+khasra+village.
    
    Args:
        owner_name: Owner name
        khasra_no: Khasra number
        village: Village name
        existing_records: List of existing records
            Each: {id, owner_name, khasra_no, village, ...}
            
    Returns:
        Dict with fraud alert if duplicate detected, None otherwise
    """
    logger.info(f"Checking exact duplicate for khasra={khasra_no}, village={village}")
    
    try:
        new_hash = compute_field_hash(owner_name, khasra_no, village)
        
        duplicates = []
        for record in existing_records:
            if record.get('status') == 'archived':
                continue
            
            existing_hash = compute_field_hash(
                record.get('owner_name', ''),
                record.get('khasra_no', ''),
                record.get('village', '')
            )
            
            if existing_hash == new_hash:
                duplicates.append(record.get('id'))
        
        if duplicates:
            alert = {
                "type": "exact_duplicate",
                "severity": "critical",
                "details": {
                    "duplicate_count": len(duplicates),
                    "duplicate_record_ids": duplicates,
                    "field_hash": new_hash,
                    "owner_name": owner_name,
                    "khasra_no": khasra_no,
                    "village": village,
                    "message": f"Exact duplicate found: {len(duplicates)} existing record(s) with same owner+khasra+village"
                }
            }
            
            logger.warning(f"Exact duplicate detected: {alert['details']['message']}")
            return alert
        
        logger.info("No exact duplicate detected")
        return None
        
    except Exception as e:
        logger.error(f"Exact duplicate check failed: {str(e)}", exc_info=True)
        return None


def check_near_duplicate(
    text_embedding: List[float],
    similar_uploads: List[Dict[str, Any]],
    similarity_threshold: float = 0.90
) -> Optional[Dict[str, Any]]:
    """
    Near-Duplicate Detection via pgvector similarity
    
    Checks for near-duplicates using text embedding similarity.
    
    Args:
        text_embedding: 384-dim embedding of OCR text
        similar_uploads: List of similar uploads from pgvector query
            Each: {id, storage_path, similarity_score, ...}
        similarity_threshold: Cosine similarity threshold (default 0.90)
            
    Returns:
        Dict with fraud alert if near-duplicate detected, None otherwise
    """
    logger.info("Checking near-duplicates via embedding similarity")
    
    try:
        if not text_embedding or not similar_uploads:
            return None
        
        near_duplicates = [
            u for u in similar_uploads
            if u.get('similarity', 0) >= similarity_threshold
        ]
        
        if near_duplicates:
            alert = {
                "type": "near_duplicate",
                "severity": "medium",
                "details": {
                    "near_duplicate_count": len(near_duplicates),
                    "near_duplicate_uploads": [
                        {
                            "id": u.get('id'),
                            "storage_path": u.get('storage_path'),
                            "similarity": u.get('similarity')
                        }
                        for u in near_duplicates
                    ],
                    "similarity_threshold": similarity_threshold,
                    "message": f"Found {len(near_duplicates)} near-duplicate upload(s) with similarity >= {similarity_threshold}"
                }
            }
            
            logger.warning(f"Near-duplicate detected: {alert['details']['message']}")
            return alert
        
        logger.info("No near-duplicates detected")
        return None
        
    except Exception as e:
        logger.error(f"Near-duplicate check failed: {str(e)}", exc_info=True)
        return None


# ============================================================================
# Combined Fraud Check
# ============================================================================

def run_fraud_checks(
    extracted_data: Dict[str, Any],
    new_geom: Optional[Dict[str, Any]],
    text_embedding: Optional[List[float]],
    existing_records: List[Dict[str, Any]],
    existing_geoms: List[Dict[str, Any]],
    similar_uploads: List[Dict[str, Any]],
    parent_plot_area: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Run all fraud checks and return list of alerts
    
    Args:
        extracted_data: Extracted fields from NER
        new_geom: GeoJSON geometry of new plot
        text_embedding: OCR text embedding
        existing_records: Existing records in same village
        existing_geoms: Existing geometries in same village
        similar_uploads: Similar uploads from pgvector
        parent_plot_area: Parent plot area (if available)
        
    Returns:
        List of fraud alerts
    """
    logger.info("Running all fraud checks")
    
    alerts = []
    
    # Rule 1: Area consistency
    if parent_plot_area is not None:
        area_alert = check_area_consistency(
            village=extracted_data.get('village', ''),
            tehsil=extracted_data.get('tehsil', ''),
            district=extracted_data.get('district', ''),
            existing_records=existing_records,
            parent_plot_area=parent_plot_area
        )
        if area_alert:
            alerts.append(area_alert)
    
    # Rule 2: Spatial overlap
    if new_geom:
        overlap_alert = check_spatial_overlap(new_geom, existing_geoms)
        if overlap_alert:
            alerts.append(overlap_alert)
    
    # Rule 3a: Exact duplicate
    exact_dup_alert = check_exact_duplicate(
        owner_name=extracted_data.get('owner_name', ''),
        khasra_no=extracted_data.get('khasra_no', ''),
        village=extracted_data.get('village', ''),
        existing_records=existing_records
    )
    if exact_dup_alert:
        alerts.append(exact_dup_alert)
    
    # Rule 3b: Near duplicate
    if text_embedding:
        near_dup_alert = check_near_duplicate(text_embedding, similar_uploads)
        if near_dup_alert:
            alerts.append(near_dup_alert)
    
    logger.info(f"Fraud checks completed: {len(alerts)} alert(s) generated")
    
    return alerts
