"""
OCR Extraction Module

Uses Tesseract OCR with Hindi + English language support
Extracts text and bounding boxes from preprocessed images

Author: PS 26018
Version: 2.0.0
"""

import cv2
import numpy as np
import pytesseract
from typing import Tuple, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


def decode_base64_to_cv2(image_base64: str) -> np.ndarray:
    """
    Decode base64 image to OpenCV format
    
    Args:
        image_base64: Base64 encoded image string
        
    Returns:
        np.ndarray: OpenCV image (BGR format)
    """
    import base64
    
    # Remove data URL prefix if present
    if ',' in image_base64:
        image_base64 = image_base64.split(',')[1]
    
    # Decode base64
    image_bytes = base64.b64decode(image_base64)
    
    # Convert to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    
    # Decode image
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Failed to decode image")
    
    return image


def extract_text(
    image_base64: str,
    languages: List[str] = ["hin", "eng"]
) -> Tuple[str, float, List[Dict[str, Any]]]:
    """
    Extract text from image using Tesseract OCR
    
    Args:
        image_base64: Base64 encoded preprocessed image
        languages: List of language codes (e.g., ["hin", "eng"])
        
    Returns:
        Tuple containing:
            - str: Extracted text
            - float: Overall confidence score (0-100)
            - List[Dict]: Bounding boxes with text and confidence
            
    Raises:
        ValueError: If OCR fails or no text is extracted
    """
    logger.info(f"Starting OCR extraction with languages: {languages}")
    
    # Decode image
    image = decode_base64_to_cv2(image_base64)
    
    # Convert to grayscale for Tesseract
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Build language string for Tesseract
    lang_str = "+".join(languages)
    
    # Configure Tesseract
    # PSM 6: Assume a single uniform block of text
    custom_config = f'--oem 3 --psm 6 -l {lang_str}'
    
    try:
        # Get detailed data with bounding boxes
        logger.info("Running Tesseract OCR...")
        ocr_data = pytesseract.image_to_data(
            gray,
            config=custom_config,
            output_type=pytesseract.Output.DICT
        )
        
        # Process results
        text_lines = []
        bounding_boxes = []
        confidences = []
        
        n_boxes = len(ocr_data['text'])
        
        for i in range(n_boxes):
            # Skip empty boxes
            text = ocr_data['text'][i].strip()
            if not text:
                continue
            
            # Get confidence
            conf = int(ocr_data['conf'][i])
            
            # Skip low confidence detections
            if conf < 30:
                continue
            
            # Get bounding box
            x = ocr_data['left'][i]
            y = ocr_data['top'][i]
            w = ocr_data['width'][i]
            h = ocr_data['height'][i]
            
            # Store text
            text_lines.append(text)
            confidences.append(conf)
            
            # Store bounding box
            bounding_boxes.append({
                "text": text,
                "confidence": conf,
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "block_num": int(ocr_data['block_num'][i]),
                "par_num": int(ocr_data['par_num'][i]),
                "line_num": int(ocr_data['line_num'][i]),
                "word_num": int(ocr_data['word_num'][i])
            })
        
        # Combine all text
        full_text = " ".join(text_lines)
        
        # Calculate overall confidence
        if confidences:
            overall_confidence = sum(confidences) / len(confidences)
        else:
            overall_confidence = 0.0
        
        logger.info(f"OCR completed: {len(bounding_boxes)} words detected, confidence={overall_confidence:.2f}")
        
        if not full_text.strip():
            raise ValueError("No text extracted from image")
        
        return full_text, overall_confidence, bounding_boxes
        
    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}", exc_info=True)
        raise ValueError(f"OCR extraction failed: {str(e)}")


def extract_text_simple(
    image_base64: str,
    languages: List[str] = ["hin", "eng"]
) -> Tuple[str, float]:
    """
    Simple text extraction without bounding boxes (faster)
    
    Args:
        image_base64: Base64 encoded preprocessed image
        languages: List of language codes
        
    Returns:
        Tuple containing:
            - str: Extracted text
            - float: Overall confidence score (0-100)
    """
    logger.info(f"Starting simple OCR extraction with languages: {languages}")
    
    # Decode image
    image = decode_base64_to_cv2(image_base64)
    
    # Convert to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Build language string
    lang_str = "+".join(languages)
    custom_config = f'--oem 3 --psm 6 -l {lang_str}'
    
    try:
        # Get text and confidence
        text = pytesseract.image_to_string(gray, config=custom_config)
        
        # Get mean confidence
        ocr_data = pytesseract.image_to_data(
            gray,
            config=custom_config,
            output_type=pytesseract.Output.DICT
        )
        
        confidences = [int(c) for c in ocr_data['conf'] if int(c) > 0]
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        logger.info(f"Simple OCR completed: confidence={overall_confidence:.2f}")
        
        return text.strip(), overall_confidence
        
    except Exception as e:
        logger.error(f"Simple OCR extraction failed: {str(e)}", exc_info=True)
        raise ValueError(f"OCR extraction failed: {str(e)}")


# ============================================================================
# Testing utilities
# ============================================================================

def create_ocr_test_image() -> str:
    """
    Create a test image with clear text for OCR testing
    
    Returns:
        str: Base64 encoded image
    """
    import base64
    
    # Create white background
    image = np.ones((600, 800, 3), dtype=np.uint8) * 255
    
    # Add text lines
    font = cv2.FONT_HERSHEY_SIMPLEX
    y_pos = 100
    
    text_lines = [
        "Land Record Document",
        "Khasra No: 123",
        "Khata No: 456",
        "Owner: Ramesh Kumar",
        "Village: Rampur",
        "Tehsil: Sadar",
        "District: Lucknow",
        "Area: 2.5 hectares"
    ]
    
    for line in text_lines:
        cv2.putText(image, line, (50, y_pos), font, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        y_pos += 50
    
    # Encode to base64
    _, buffer = cv2.imencode('.png', image)
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return f"data:image/png;base64,{image_base64}"
