"""
Test Fixtures for Forensic Analysis

Provides known-clean and known-tampered sample images for testing.
These fixtures will be reused in Phase 7's regression suite.

Author: PS 26018
Version: 3.0.0
"""

import cv2
import numpy as np
import base64
from typing import Tuple


def create_clean_document() -> str:
    """
    Create a known-clean document image
    
    Characteristics:
    - Uniform lighting
    - Consistent font
    - No manipulation artifacts
    - Clean scan quality
    
    Returns:
        str: Base64 encoded clean image
    """
    # Create white background
    img = np.ones((800, 1000, 3), dtype=np.uint8) * 255
    
    # Add consistent text
    font = cv2.FONT_HERSHEY_SIMPLEX
    y_pos = 100
    
    lines = [
        "LAND RECORD DOCUMENT",
        "",
        "Khasra No: 12345",
        "Khata No: 67890",
        "Owner: Ramesh Kumar",
        "Village: Rampur",
        "Tehsil: Sadar",
        "District: Lucknow",
        "Area: 2.5 hectares",
    ]
    
    for line in lines:
        if line:
            cv2.putText(img, line, (100, y_pos), font, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        y_pos += 50
    
    # Add slight noise to simulate real scan
    noise = np.random.normal(0, 2, img.shape)
    img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    
    # Encode to base64
    _, buffer = cv2.imencode('.png', img)
    return f"image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"


def create_tampered_document() -> str:
    """
    Create a known-tampered document image
    
    Characteristics:
    - Text overlay in one region (different compression)
    - Inconsistent noise patterns
    - Simulated copy-paste artifact
    
    Returns:
        str: Base64 encoded tampered image
    """
    # Start with clean document
    img = np.ones((800, 1000, 3), dtype=np.uint8) * 255
    
    font = cv2.FONT_HERSHEY_SIMPLEX
    y_pos = 100
    
    lines = [
        "LAND RECORD DOCUMENT",
        "",
        "Khasra No: 12345",
        "Khata No: 67890",
        "Owner: Ramesh Kumar",
        "Village: Rampur",
        "Tehsil: Sadar",
        "District: Lucknow",
        "Area: 2.5 hectares",
    ]
    
    for line in lines:
        if line:
            cv2.putText(img, line, (100, y_pos), font, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        y_pos += 50
    
    # TAMPER: Add text overlay with different characteristics
    # Simulate changing "Ramesh Kumar" to "Suresh Singh"
    # First, white out the original
    cv2.rectangle(img, (100, 250), (500, 290), (255, 255, 255), -1)
    
    # Add new text with slightly different characteristics
    cv2.putText(img, "Owner: Suresh Singh", (100, 280), font, 0.7, (10, 10, 10), 2, cv2.LINE_AA)
    
    # Add compression artifacts in the tampered region
    # Simulate by adding different noise pattern
    tampered_region = img[240:300, 90:510]
    noise = np.random.normal(0, 8, tampered_region.shape)  # Higher noise
    tampered_region = np.clip(tampered_region.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    img[240:300, 90:510] = tampered_region
    
    # Add noise to rest of image (lower level)
    noise = np.random.normal(0, 2, img.shape)
    img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    
    # Encode to base64
    _, buffer = cv2.imencode('.png', img)
    return f"image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"


def create_print_scan_document() -> str:
    """
    Create a document simulating print-then-rescan (generation loss)
    
    Characteristics:
    - Moiré patterns from printing
    - Halftone artifacts
    - Slight blur from rescanning
    
    Returns:
        str: Base64 encoded print-scan image
    """
    # Create base document
    img = np.ones((800, 1000, 3), dtype=np.uint8) * 255
    
    font = cv2.FONT_HERSHEY_SIMPLEX
    y_pos = 100
    
    lines = [
        "LAND RECORD DOCUMENT",
        "",
        "Khasra No: 12345",
        "Khata No: 67890",
        "Owner: Ramesh Kumar",
        "Village: Rampur",
    ]
    
    for line in lines:
        if line:
            cv2.putText(img, line, (100, y_pos), font, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        y_pos += 50
    
    # Simulate print-scan artifacts
    # Add moiré pattern (periodic noise)
    h, w = img.shape[:2]
    y, x = np.ogrid[:h, :w]
    moire = np.sin(2 * np.pi * x / 10) * 10  # Periodic pattern
    img = np.clip(img.astype(np.float32) + moire[:, :, np.newaxis], 0, 255).astype(np.uint8)
    
    # Add blur (simulating rescanning)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    
    # Add scan noise
    noise = np.random.normal(0, 5, img.shape)
    img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    
    # Encode to base64
    _, buffer = cv2.imencode('.png', img)
    return f"image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"


def create_sample_bounding_boxes() -> list:
    """
    Create sample OCR bounding boxes for testing font/baseline analysis
    
    Returns:
        list: List of bounding box dictionaries
    """
    boxes = []
    y_base = 100
    
    # Line 1: "LAND RECORD DOCUMENT"
    boxes.append({
        "text": "LAND",
        "confidence": 95,
        "x": 100,
        "y": y_base,
        "width": 80,
        "height": 30,
        "line_num": 1,
    })
    boxes.append({
        "text": "RECORD",
        "confidence": 95,
        "x": 190,
        "y": y_base,
        "width": 100,
        "height": 30,
        "line_num": 1,
    })
    boxes.append({
        "text": "DOCUMENT",
        "confidence": 95,
        "x": 300,
        "y": y_base,
        "width": 130,
        "height": 30,
        "line_num": 1,
    })
    
    # Line 2: "Khasra No: 12345"
    y_base = 200
    boxes.append({
        "text": "Khasra",
        "confidence": 90,
        "x": 100,
        "y": y_base,
        "width": 90,
        "height": 30,
        "line_num": 2,
    })
    boxes.append({
        "text": "No:",
        "confidence": 90,
        "x": 200,
        "y": y_base,
        "width": 40,
        "height": 30,
        "line_num": 2,
    })
    boxes.append({
        "text": "12345",
        "confidence": 95,
        "x": 250,
        "y": y_base,
        "width": 80,
        "height": 30,
        "line_num": 2,
    })
    
    # Line 3: "Owner: Ramesh Kumar"
    y_base = 300
    boxes.append({
        "text": "Owner:",
        "confidence": 90,
        "x": 100,
        "y": y_base,
        "width": 80,
        "height": 30,
        "line_num": 3,
    })
    boxes.append({
        "text": "Ramesh",
        "confidence": 85,
        "x": 190,
        "y": y_base,
        "width": 100,
        "height": 30,
        "line_num": 3,
    })
    boxes.append({
        "text": "Kumar",
        "confidence": 85,
        "x": 300,
        "y": y_base,
        "width": 80,
        "height": 30,
        "line_num": 3,
    })
    
    return boxes


def create_inconsistent_bounding_boxes() -> list:
    """
    Create bounding boxes with inconsistent baselines (for testing)
    
    Returns:
        list: List of bounding boxes with varying baselines
    """
    boxes = create_sample_bounding_boxes()
    
    # Make line 3 have different baseline (y offset)
    for box in boxes:
        if box['line_num'] == 3:
            box['y'] += 15  # Shift down
    
    return boxes
