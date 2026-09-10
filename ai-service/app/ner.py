"""
Named Entity Recognition (NER) Module

Extracts structured fields from OCR text:
- owner_name
- khasra_no
- khata_no
- area_declared
- village
- tehsil
- district
- land_class

Current implementation: Regex-based fallback (clearly documented)
Future: Can be replaced with fine-tuned HuggingFace model

Author: PS 26018
Version: 2.0.0
"""

import re
from typing import Tuple, Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# Field extraction patterns
# ============================================================================

FIELD_PATTERNS = {
    "khasra_no": [
        r'(?:khasra|khatauni|खसरा|खतौनी)\s*(?:no|number|नंबर|संख्या)?[.:]?\s*(\d+)',
        r'(?:khasra|khatauni)\s*[#:]\s*(\d+)',
        r'(\d{3,6})\s*(?:khasra|khatauni)',
    ],
    "khata_no": [
        r'(?:khata|खाता)\s*(?:no|number|नंबर|संख्या)?[.:]?\s*(\d+)',
        r'khata\s*[#:]\s*(\d+)',
        r'(\d{3,6})\s*khata',
    ],
    "owner_name": [
        r'(?:owner|malik|मालिक|name|नाम)[.:]?\s*([A-Za-z\s]+?)(?:\s*(?:s/o|d/o|w/o|village|tehsil|district|area|$))',
        r'(?:owner|malik|name)[.:]?\s*([A-Za-z\s]{3,50})',
        r'नाम[.:]?\s*([^\n]+)',
    ],
    "village": [
        r'(?:village|gaon|गाँव|ग्राम)[.:]?\s*([A-Za-z\s]+?)(?:\s*(?:tehsil|district|area|$))',
        r'village\s*[#:]\s*([A-Za-z\s]+)',
        r'गाँव[.:]?\s*([^\n]+)',
    ],
    "tehsil": [
        r'(?:tehsil|tahsil|तहसील)[.:]?\s*([A-Za-z\s]+?)(?:\s*(?:district|area|$))',
        r'tehsil\s*[#:]\s*([A-Za-z\s]+)',
        r'तहसील[.:]?\s*([^\n]+)',
    ],
    "district": [
        r'(?:district|जिला|जिले)[.:]?\s*([A-Za-z\s]+?)(?:\s*(?:area|state|$))',
        r'district\s*[#:]\s*([A-Za-z\s]+)',
        r'जिला[.:]?\s*([^\n]+)',
    ],
    "area_declared": [
        r'(?:area|क्षेत्रफल|rakba)[.:]?\s*(\d+(?:\.\d+)?)\s*(?:hectare|ha|hector|एकड़|हेक्टेयर)?',
        r'(\d+(?:\.\d+)?)\s*(?:hectare|ha|hector)',
        r'area\s*[#:]\s*(\d+(?:\.\d+)?)',
    ],
    "land_class": [
        r'(?:land\s*class|type|प्रकार|भूमि\s*वर्ग)[.:]?\s*([A-Za-z\s]+?)(?:\s*(?:area|$))',
        r'(?:agricultural|residential|commercial|industrial|vacant)',
    ],
}


def extract_with_regex(text: str) -> Tuple[Dict[str, Optional[str]], Dict[str, float]]:
    """
    Extract fields using regex patterns
    
    Args:
        text: OCR extracted text
        
    Returns:
        Tuple containing:
            - Dict[str, Optional[str]]: Extracted fields
            - Dict[str, float]: Confidence scores for each field
    """
    logger.info("Starting regex-based entity extraction")
    
    extracted = {}
    confidences = {}
    
    # Normalize text
    text_normalized = text.lower().strip()
    
    for field, patterns in FIELD_PATTERNS.items():
        value = None
        confidence = 0.0
        
        for pattern in patterns:
            try:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    # Get the first capturing group
                    if match.groups():
                        value = match.group(1).strip()
                    else:
                        value = match.group(0).strip()
                    
                    # Calculate confidence based on pattern specificity
                    # More specific patterns get higher confidence
                    if 'no|number' in pattern or '[#:]' in pattern:
                        confidence = 0.85  # High confidence for specific patterns
                    elif field in ['owner_name', 'village', 'tehsil', 'district']:
                        confidence = 0.70  # Medium confidence for name fields
                    else:
                        confidence = 0.60  # Lower confidence for generic patterns
                    
                    logger.debug(f"Field '{field}' matched with pattern: {pattern}")
                    break
                    
            except re.error as e:
                logger.warning(f"Regex error for field '{field}': {str(e)}")
                continue
        
        extracted[field] = value
        confidences[field] = confidence
        
        if value:
            logger.info(f"Extracted {field}: '{value}' (confidence: {confidence:.2f})")
        else:
            logger.warning(f"Could not extract {field}")
    
    return extracted, confidences


def extract_with_heuristics(text: str, bounding_boxes: Optional[List[Dict[str, Any]]] = None) -> Tuple[Dict[str, Optional[str]], Dict[str, float]]:
    """
    Extract fields using heuristics and position-based logic
    
    Args:
        text: OCR extracted text
        bounding_boxes: Optional bounding boxes with positions
        
    Returns:
        Tuple containing:
            - Dict[str, Optional[str]]: Extracted fields
            - Dict[str, float]: Confidence scores for each field
    """
    logger.info("Starting heuristic-based entity extraction")
    
    extracted = {}
    confidences = {}
    
    # Split text into lines
    lines = text.split('\n')
    lines = [line.strip() for line in lines if line.strip()]
    
    # Try to identify fields by line position and content
    for i, line in enumerate(lines):
        line_lower = line.lower()
        
        # Khasra number
        if 'khasra' in line_lower or 'खसरा' in line:
            match = re.search(r'(\d+)', line)
            if match:
                extracted['khasra_no'] = match.group(1)
                confidences['khasra_no'] = 0.80
        
        # Khata number
        elif 'khata' in line_lower and 'khasra' not in line_lower:
            match = re.search(r'(\d+)', line)
            if match:
                extracted['khata_no'] = match.group(1)
                confidences['khata_no'] = 0.80
        
        # Owner name
        elif 'owner' in line_lower or 'malik' in line_lower or 'नाम' in line:
            # Extract name after label
            match = re.search(r'(?:owner|malik|name|नाम)[.:]?\s*([A-Za-z\s]+)', line, re.IGNORECASE)
            if match:
                extracted['owner_name'] = match.group(1).strip()
                confidences['owner_name'] = 0.65
        
        # Village
        elif 'village' in line_lower or 'gaon' in line_lower or 'गाँव' in line:
            match = re.search(r'(?:village|gaon|गाँव)[.:]?\s*([A-Za-z\s]+)', line, re.IGNORECASE)
            if match:
                extracted['village'] = match.group(1).strip()
                confidences['village'] = 0.70
        
        # Tehsil
        elif 'tehsil' in line_lower or 'तहसील' in line:
            match = re.search(r'(?:tehsil|तहसील)[.:]?\s*([A-Za-z\s]+)', line, re.IGNORECASE)
            if match:
                extracted['tehsil'] = match.group(1).strip()
                confidences['tehsil'] = 0.70
        
        # District
        elif 'district' in line_lower or 'जिला' in line:
            match = re.search(r'(?:district|जिला)[.:]?\s*([A-Za-z\s]+)', line, re.IGNORECASE)
            if match:
                extracted['district'] = match.group(1).strip()
                confidences['district'] = 0.70
        
        # Area
        elif 'area' in line_lower or 'क्षेत्रफल' in line or 'hectare' in line_lower:
            match = re.search(r'(\d+(?:\.\d+)?)', line)
            if match:
                extracted['area_declared'] = match.group(1)
                confidences['area_declared'] = 0.75
    
    # Fill missing fields with None
    all_fields = ['owner_name', 'khasra_no', 'khata_no', 'area_declared', 'village', 'tehsil', 'district', 'land_class']
    for field in all_fields:
        if field not in extracted:
            extracted[field] = None
            confidences[field] = 0.0
    
    return extracted, confidences


def extract_entities(
    text: str,
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
) -> Tuple[Dict[str, Any], Dict[str, float], str]:
    """
    Main entity extraction function
    
    Combines regex and heuristic approaches
    
    Args:
        text: OCR extracted text
        bounding_boxes: Optional bounding boxes with positions
        
    Returns:
        Tuple containing:
            - Dict[str, Any]: Extracted entities (matches records table schema)
            - Dict[str, float]: Confidence scores for each field
            - str: Extraction method used ("regex", "heuristic", or "combined")
    """
    logger.info("Starting entity extraction")
    
    # Try regex first
    regex_entities, regex_confidences = extract_with_regex(text)
    
    # Try heuristics
    heuristic_entities, heuristic_confidences = extract_with_heuristics(text, bounding_boxes)
    
    # Combine results (prefer higher confidence)
    final_entities = {}
    final_confidences = {}
    
    all_fields = ['owner_name', 'khasra_no', 'khata_no', 'area_declared', 'village', 'tehsil', 'district', 'land_class']
    
    for field in all_fields:
        regex_val = regex_entities.get(field)
        regex_conf = regex_confidences.get(field, 0.0)
        
        heuristic_val = heuristic_entities.get(field)
        heuristic_conf = heuristic_confidences.get(field, 0.0)
        
        # Choose the one with higher confidence
        if regex_conf >= heuristic_conf and regex_val:
            final_entities[field] = regex_val
            final_confidences[field] = regex_conf
        elif heuristic_val:
            final_entities[field] = heuristic_val
            final_confidences[field] = heuristic_conf
        else:
            final_entities[field] = None
            final_confidences[field] = 0.0
    
    # Determine method
    if all(regex_confidences.get(f, 0) > 0 for f in all_fields):
        method = "regex"
    elif all(heuristic_confidences.get(f, 0) > 0 for f in all_fields):
        method = "heuristic"
    else:
        method = "combined"
    
    # Convert area_declared to float if present
    if final_entities.get('area_declared'):
        try:
            final_entities['area_declared'] = float(final_entities['area_declared'])
        except (ValueError, TypeError):
            final_entities['area_declared'] = None
            final_confidences['area_declared'] = 0.0
    
    logger.info(f"Entity extraction completed using {method}")
    
    return final_entities, final_confidences, method


# ============================================================================
# Validation
# ============================================================================

def validate_extracted_data(entities: Dict[str, Any]) -> bool:
    """
    Validate extracted data against expected schema
    
    Args:
        entities: Extracted entities
        
    Returns:
        bool: True if valid, False otherwise
    """
    required_fields = ['owner_name', 'khasra_no', 'khata_no', 'village', 'tehsil', 'district']
    
    for field in required_fields:
        if not entities.get(field):
            logger.warning(f"Required field '{field}' is missing or empty")
            return False
    
    # Validate area_declared is numeric if present
    if entities.get('area_declared') is not None:
        try:
            float(entities['area_declared'])
        except (ValueError, TypeError):
            logger.warning(f"area_declared is not numeric: {entities['area_declared']}")
            return False
    
    return True
