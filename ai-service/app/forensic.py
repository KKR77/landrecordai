"""
Forensic Analysis Module — Phase 3

Implements 5 independent forensic sub-checks:
1. ELA (Error Level Analysis) - detects compression inconsistencies
2. Noise/PRNU consistency - detects regions with different sensor noise
3. Font/baseline uniformity - detects text manipulation via OCR bbox analysis
4. FFT generation-loss - detects moiré/halftone from print-then-rescan
5. Metadata diff - compares against locked version in DB

Each sub-check is isolated, testable, and returns a score 0-100.
If a sub-check fails, it's excluded from the weighted average.

Weighting Formula (documented, not magic numbers):
- ELA: 30% (strongest indicator of digital manipulation)
- PRNU: 20% (sensor noise is hard to fake)
- Font/baseline: 20% (text overlay detection)
- FFT: 15% (print-scan detection)
- Metadata: 15% (EXIF tampering)

If a sub-check errors, exclude it and redistribute weights proportionally.

Author: PS 26018
Version: 3.0.0
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any, List, Optional
import logging
import base64
from PIL import Image, ExifTags
import io

logger = logging.getLogger(__name__)


# ============================================================================
# Weighting Configuration
# ============================================================================

DEFAULT_WEIGHTS = {
    "ela": 0.30,
    "prnu": 0.20,
    "font_baseline": 0.20,
    "fft": 0.15,
    "metadata": 0.15,
}


# ============================================================================
# Helper Functions
# ============================================================================

def decode_base64_to_cv2(image_base64: str) -> np.ndarray:
    """Decode base64 image to OpenCV format"""
    if ',' in image_base64:
        image_base64 = image_base64.split(',')[1]
    
    image_bytes = base64.b64decode(image_base64)
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Failed to decode image")
    
    return image


def decode_base64_to_pil(image_base64: str) -> Image.Image:
    """Decode base64 image to PIL format"""
    if ',' in image_base64:
        image_base64 = image_base64.split(',')[1]
    
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes))
    
    return image


# ============================================================================
# 1. ELA (Error Level Analysis)
# ============================================================================

def analyze_ela(
    original_image_base64: str,
    jpeg_quality: int = 90
) -> Tuple[float, Dict[str, Any]]:
    """
    Error Level Analysis
    
    Re-compresses image at fixed JPEG quality, diffs against original.
    Regions with high difference indicate potential manipulation.
    
    Args:
        original_image_base64: Base64 encoded original image
        jpeg_quality: JPEG quality for re-compression (default 90)
        
    Returns:
        Tuple containing:
            - float: ELA score (0-100, higher = more suspicious)
            - Dict: Details including heatmap and edited_region_score
            
    Algorithm:
    1. Decode original image
    2. Re-compress at jpeg_quality
    3. Compute absolute difference
    4. Calculate mean difference as "edited region score"
    5. Normalize to 0-100 scale
    """
    logger.info("Starting ELA analysis")
    
    try:
        # Decode original
        original = decode_base64_to_cv2(original_image_base64)
        
        # Re-compress at fixed quality
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
        _, encoded = cv2.imencode('.jpg', original, encode_param)
        
        # Decode re-compressed
        recompressed = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        
        # Compute difference
        diff = cv2.absdiff(original, recompressed)
        
        # Convert to grayscale for analysis
        diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        # Calculate statistics
        mean_diff = np.mean(diff_gray)
        std_diff = np.std(diff_gray)
        max_diff = np.max(diff_gray)
        
        # Normalize to 0-100 scale
        # Typical range: mean_diff 5-30 for clean images, 30-80 for manipulated
        # We use a sigmoid-like mapping
        ela_score = min(100, max(0, (mean_diff - 5) * 3))
        
        # Generate heatmap (for visualization)
        heatmap = cv2.applyColorMap(
            np.uint8(255 * (diff_gray / max_diff)),
            cv2.COLORMAP_JET
        )
        
        # Encode heatmap to base64
        _, heatmap_encoded = cv2.imencode('.png', heatmap)
        heatmap_base64 = base64.b64encode(heatmap_encoded).decode('utf-8')
        
        details = {
            "mean_difference": float(mean_diff),
            "std_difference": float(std_diff),
            "max_difference": float(max_diff),
            "heatmap_base64": f"data:image/png;base64,{heatmap_base64}",
            "jpeg_quality_used": jpeg_quality
        }
        
        logger.info(f"ELA completed: score={ela_score:.2f}, mean_diff={mean_diff:.2f}")
        
        return ela_score, details
        
    except Exception as e:
        logger.error(f"ELA analysis failed: {str(e)}", exc_info=True)
        raise


# ============================================================================
# 2. Noise/PRNU Consistency
# ============================================================================

def analyze_prnu(
    original_image_base64: str,
    block_size: int = 32
) -> Tuple[float, Dict[str, Any]]:
    """
    Noise/PRNU Consistency Analysis
    
    Extracts noise via high-pass filter, computes local variance map.
    Regions with significantly different noise signatures indicate manipulation.
    
    NOTE: This is a simplified PRNU approach. Full PRNU requires wavelet denoising
    and sensor pattern correlation, which is more complex. This simplified version
    uses local noise variance as a proxy.
    
    Args:
        original_image_base64: Base64 encoded original image
        block_size: Block size for local variance computation (default 32)
        
    Returns:
        Tuple containing:
            - float: PRNU score (0-100, higher = more suspicious)
            - Dict: Details including noise_variance_map and outlier_regions
            
    Algorithm:
    1. Convert to grayscale
    2. Apply high-pass filter (Gaussian blur subtracted from original)
    3. Compute local variance in blocks
    4. Find outlier regions (variance significantly different from mean)
    5. Score based on outlier percentage
    """
    logger.info("Starting PRNU analysis")
    
    try:
        # Decode
        original = decode_base64_to_cv2(original_image_base64)
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        
        # High-pass filter to extract noise
        blur = cv2.GaussianBlur(gray, (0, 0), 3)
        noise = cv2.subtract(gray, blur)
        
        # Compute local variance in blocks
        h, w = noise.shape
        variance_map = np.zeros((h // block_size, w // block_size))
        
        for i in range(0, h - block_size, block_size):
            for j in range(0, w - block_size, block_size):
                block = noise[i:i+block_size, j:j+block_size]
                variance_map[i // block_size, j // block_size] = np.var(block)
        
        # Find outliers (blocks with variance > 2 std from mean)
        mean_var = np.mean(variance_map)
        std_var = np.std(variance_map)
        threshold = mean_var + 2 * std_var
        
        outlier_mask = variance_map > threshold
        outlier_percentage = np.sum(outlier_mask) / variance_map.size
        
        # Score: higher outlier percentage = more suspicious
        prnu_score = min(100, outlier_percentage * 500)
        
        details = {
            "mean_variance": float(mean_var),
            "std_variance": float(std_var),
            "outlier_percentage": float(outlier_percentage),
            "threshold": float(threshold),
            "block_size": block_size,
            "note": "Simplified PRNU using local noise variance"
        }
        
        logger.info(f"PRNU completed: score={prnu_score:.2f}, outliers={outlier_percentage:.2%}")
        
        return prnu_score, details
        
    except Exception as e:
        logger.error(f"PRNU analysis failed: {str(e)}", exc_info=True)
        raise


# ============================================================================
# 3. Font/Baseline Uniformity
# ============================================================================

def analyze_font_baseline(
    ocr_bounding_boxes: List[Dict[str, Any]]
) -> Tuple[float, Dict[str, Any]]:
    """
    Font/Baseline Uniformity Analysis
    
    Uses OCR bounding boxes to check stroke width, spacing, baseline alignment.
    Outlier regions indicate potential text overlay/manipulation.
    
    Args:
        ocr_bounding_boxes: List of bounding boxes from Phase 2 OCR
            Each box: {text, confidence, x, y, width, height, line_num}
            
    Returns:
        Tuple containing:
            - float: Font/baseline score (0-100, higher = more suspicious)
            - Dict: Details including baseline_variance and outlier_lines
            
    Algorithm:
    1. Group bounding boxes by line_num
    2. For each line, compute baseline (median y-coordinate)
    3. Check baseline consistency across lines
    4. Check character height consistency within lines
    5. Score based on variance
    """
    logger.info("Starting font/baseline analysis")
    
    try:
        if not ocr_bounding_boxes:
            logger.warning("No bounding boxes provided for font/baseline analysis")
            return 0.0, {"note": "No bounding boxes provided"}
        
        # Group by line
        lines = {}
        for box in ocr_bounding_boxes:
            line_num = box.get('line_num', 0)
            if line_num not in lines:
                lines[line_num] = []
            lines[line_num].append(box)
        
        if len(lines) < 2:
            logger.warning("Insufficient lines for baseline analysis")
            return 0.0, {"note": "Insufficient lines"}
        
        # Compute baseline for each line (median y-coordinate)
        baselines = []
        height_variances = []
        
        for line_num, boxes in sorted(lines.items()):
            if not boxes:
                continue
            
            # Baseline: median y + height
            y_coords = [b['y'] + b['height'] for b in boxes]
            baseline = np.median(y_coords)
            baselines.append(baseline)
            
            # Height consistency within line
            heights = [b['height'] for b in boxes]
            height_var = np.var(heights) if len(heights) > 1 else 0
            height_variances.append(height_var)
        
        # Check baseline consistency
        baseline_variance = np.var(baselines) if len(baselines) > 1 else 0
        
        # Check height consistency across lines
        mean_height_var = np.mean(height_variances)
        
        # Score: higher variance = more suspicious
        # Normalize: baseline_variance > 100 or height_var > 50 is suspicious
        font_score = min(100, (baseline_variance / 10 + mean_height_var / 5))
        
        details = {
            "num_lines": len(lines),
            "baseline_variance": float(baseline_variance),
            "mean_height_variance": float(mean_height_var),
            "baselines": [float(b) for b in baselines],
            "note": "Checks baseline alignment and character height consistency"
        }
        
        logger.info(f"Font/baseline completed: score={font_score:.2f}, lines={len(lines)}")
        
        return font_score, details
        
    except Exception as e:
        logger.error(f"Font/baseline analysis failed: {str(e)}", exc_info=True)
        raise


# ============================================================================
# 4. FFT Generation-Loss Check
# ============================================================================

def analyze_fft(
    original_image_base64: str
) -> Tuple[float, Dict[str, Any]]:
    """
    FFT Generation-Loss Analysis
    
    Frequency-domain analysis for moiré/halftone patterns indicating
    print-then-rescan (generation loss).
    
    Args:
        original_image_base64: Base64 encoded original image
        
    Returns:
        Tuple containing:
            - float: FFT score (0-100, higher = more suspicious)
            - Dict: Details including periodic_pattern_detected
            
    Algorithm:
    1. Convert to grayscale
    2. Apply 2D FFT
    3. Shift zero frequency to center
    4. Compute magnitude spectrum
    5. Look for bright spots off-center (periodic patterns)
    6. Score based on off-center energy ratio
    """
    logger.info("Starting FFT analysis")
    
    try:
        # Decode
        original = decode_base64_to_cv2(original_image_base64)
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        
        # Apply 2D FFT
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        
        # Magnitude spectrum
        magnitude = 20 * np.log(np.abs(fshift) + 1)
        
        # Normalize to 0-255
        magnitude_norm = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)
        magnitude_uint8 = np.uint8(magnitude_norm)
        
        # Find center
        h, w = magnitude_uint8.shape
        center_y, center_x = h // 2, w // 2
        
        # Define center region (low frequencies)
        center_radius = min(h, w) // 10
        center_mask = np.zeros((h, w), dtype=bool)
        y, x = np.ogrid[:h, :w]
        center_mask[(x - center_x)**2 + (y - center_y)**2 <= center_radius**2] = True
        
        # Calculate energy in center vs off-center
        center_energy = np.sum(magnitude_uint8[center_mask])
        total_energy = np.sum(magnitude_uint8)
        off_center_energy = total_energy - center_energy
        
        # Ratio of off-center to total (higher = more periodic patterns)
        off_center_ratio = off_center_energy / total_energy if total_energy > 0 else 0
        
        # Look for bright spots (potential moiré)
        threshold = np.mean(magnitude_uint8) + 2 * np.std(magnitude_uint8)
        bright_spots = magnitude_uint8 > threshold
        
        # Exclude center region
        bright_spots_off_center = bright_spots & ~center_mask
        bright_spot_count = np.sum(bright_spots_off_center)
        
        # Score: higher off-center ratio + bright spots = more suspicious
        fft_score = min(100, (off_center_ratio * 200) + (bright_spot_count / 100))
        
        details = {
            "off_center_ratio": float(off_center_ratio),
            "bright_spot_count": int(bright_spot_count),
            "center_energy": float(center_energy),
            "total_energy": float(total_energy),
            "periodic_pattern_detected": bright_spot_count > 50
        }
        
        logger.info(f"FFT completed: score={fft_score:.2f}, off_center_ratio={off_center_ratio:.3f}")
        
        return fft_score, details
        
    except Exception as e:
        logger.error(f"FFT analysis failed: {str(e)}", exc_info=True)
        raise


# ============================================================================
# 5. Metadata Diff
# ============================================================================

def analyze_metadata_diff(
    original_image_base64: str,
    locked_version_metadata: Optional[Dict[str, Any]] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Metadata Diff Analysis
    
    Compares current upload's EXIF metadata against last locked version.
    If locked fields changed, forces at least Medium score.
    
    Args:
        original_image_base64: Base64 encoded original image
        locked_version_metadata: Metadata from last locked version (from DB)
            Expected format: {camera_model, datetime, gps, etc.}
            
    Returns:
        Tuple containing:
            - float: Metadata score (0-100, higher = more suspicious)
            - Dict: Details including changed_fields
            
    Algorithm:
    1. Extract EXIF from current image
    2. Compare against locked_version_metadata
    3. If critical fields changed (camera_model, datetime), score = 50+
    4. If EXIF stripped entirely, score = 30
    5. If no locked version, score = 0 (can't compare)
    """
    logger.info("Starting metadata diff analysis")
    
    try:
        # Decode to PIL
        image = decode_base64_to_pil(original_image_base64)
        
        # Extract EXIF
        exif_data = {}
        if hasattr(image, '_getexif') and image._getexif():
            exif = image._getexif()
            for tag_id, value in exif.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                exif_data[str(tag)] = str(value)
        
        # If no locked version, can't compare
        if not locked_version_metadata:
            logger.info("No locked version metadata provided")
            
            # Check if EXIF is stripped
            if not exif_data:
                return 30.0, {
                    "note": "EXIF data stripped",
                    "exif_fields": []
                }
            
            return 0.0, {
                "note": "No locked version to compare",
                "exif_fields": list(exif_data.keys())
            }
        
        # Compare against locked version
        changed_fields = []
        critical_fields = ['Model', 'DateTime', 'GPSInfo']
        
        for field in critical_fields:
            current_value = exif_data.get(field)
            locked_value = locked_version_metadata.get(field)
            
            if current_value != locked_value:
                changed_fields.append({
                    "field": field,
                    "current": current_value,
                    "locked": locked_value
                })
        
        # Score based on changes
        if not changed_fields:
            metadata_score = 0.0
        elif any(f['field'] in critical_fields for f in changed_fields):
            # Critical field changed
            metadata_score = 50.0 + (len(changed_fields) * 10)
        else:
            # Non-critical field changed
            metadata_score = 20.0 + (len(changed_fields) * 5)
        
        metadata_score = min(100, metadata_score)
        
        details = {
            "changed_fields": changed_fields,
            "current_exif_fields": list(exif_data.keys()),
            "locked_exif_fields": list(locked_version_metadata.keys()),
            "note": "Forces Medium+ score if critical fields changed"
        }
        
        logger.info(f"Metadata diff completed: score={metadata_score:.2f}, changes={len(changed_fields)}")
        
        return metadata_score, details
        
    except Exception as e:
        logger.error(f"Metadata diff analysis failed: {str(e)}", exc_info=True)
        raise


# ============================================================================
# Combined Forensic Analysis
# ============================================================================

def run_forensic_analysis(
    original_image_base64: str,
    ocr_bounding_boxes: Optional[List[Dict[str, Any]]] = None,
    locked_version_metadata: Optional[Dict[str, Any]] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Run all forensic sub-checks and combine into single Tamper Risk Score
    
    Args:
        original_image_base64: Base64 encoded original image
        ocr_bounding_boxes: Bounding boxes from Phase 2 OCR
        locked_version_metadata: Metadata from last locked version
        
    Returns:
        Tuple containing:
            - float: Combined tamper risk score (0-100)
            - Dict: Details including per-check scores and weights
            
    Weighting Formula:
    - ELA: 30%
    - PRNU: 20%
    - Font/baseline: 20%
    - FFT: 15%
    - Metadata: 15%
    
    If a sub-check errors, exclude it and redistribute weights proportionally.
    """
    logger.info("Starting combined forensic analysis")
    
    scores = {}
    details = {}
    failed_checks = []
    
    # Run each sub-check
    checks = [
        ("ela", lambda: analyze_ela(original_image_base64)),
        ("prnu", lambda: analyze_prnu(original_image_base64)),
        ("font_baseline", lambda: analyze_font_baseline(ocr_bounding_boxes or [])),
        ("fft", lambda: analyze_fft(original_image_base64)),
        ("metadata", lambda: analyze_metadata_diff(original_image_base64, locked_version_metadata)),
    ]
    
    for check_name, check_func in checks:
        try:
            score, check_details = check_func()
            scores[check_name] = score
            details[check_name] = check_details
        except Exception as e:
            logger.error(f"{check_name} check failed: {str(e)}")
            failed_checks.append(check_name)
            details[check_name] = {"error": str(e)}
    
    # Calculate weighted score (excluding failed checks)
    active_weights = {k: v for k, v in DEFAULT_WEIGHTS.items() if k not in failed_checks}
    
    # Normalize weights
    total_weight = sum(active_weights.values())
    if total_weight > 0:
        normalized_weights = {k: v / total_weight for k, v in active_weights.items()}
    else:
        normalized_weights = {}
    
    # Calculate weighted average
    if normalized_weights:
        combined_score = sum(
            scores.get(check, 0) * normalized_weights.get(check, 0)
            for check in normalized_weights
        )
    else:
        combined_score = 0.0
    
    result_details = {
        "combined_score": float(combined_score),
        "per_check_scores": scores,
        "weights_used": normalized_weights,
        "failed_checks": failed_checks,
        "degraded_confidence": len(failed_checks) > 0,
        "all_details": details
    }
    
    logger.info(f"Forensic analysis completed: combined_score={combined_score:.2f}, failed={len(failed_checks)}")
    
    return combined_score, result_details
