"""
Phase 7: Regression Test Fixtures Generator

Creates standardized test images for the full pipeline regression suite:
1. Clean/high-confidence document
2. Faded/degraded document (should route to admin_queue)
3. Digitally-edited-then-reprinted document (should score Medium/High tamper)
4. Duplicate khasra entries (should trigger duplicate fraud alert)
5. Overlapping sub-plots (should trigger spatial overlap fraud alert)

These fixtures are used by the regression test suite to verify the pipeline
correctly handles each scenario.
"""

import cv2
import numpy as np
from pathlib import Path
import json


def create_clean_document():
    """
    Clean, high-confidence document
    Expected: auto_save (all confidence >= 90%, tamper < 30%)
    """
    img = np.ones((1200, 800, 3), dtype=np.uint8) * 255
    
    # Header
    cv2.putText(img, "LAND RECORD", (250, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3)
    cv2.putText(img, "Official Document", (280, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Content
    y = 200
    fields = [
        ("Khasra No:", "12345"),
        ("Khata No:", "67890"),
        ("Owner Name:", "Ramesh Kumar"),
        ("Village:", "Rampur"),
        ("Tehsil:", "Sadar"),
        ("District:", "Lucknow"),
        ("Area:", "2.5 acres"),
        ("Land Class:", "Agricultural"),
        ("Status:", "Verified"),
    ]
    
    for label, value in fields:
        cv2.putText(img, label, (100, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        cv2.putText(img, value, (300, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        y += 60
    
    # Footer
    cv2.putText(img, "Generated: 2024-01-15", (100, 1100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 1)
    
    return img


def create_faded_document():
    """
    Faded/degraded document with low contrast
    Expected: admin_queue (low confidence < 70%)
    """
    img = create_clean_document()
    
    # Reduce contrast
    img = cv2.convertScaleAbs(img, alpha=0.4, beta=50)
    
    # Add noise
    noise = np.random.normal(0, 25, img.shape)
    img = np.clip(img.astype(np.int16) + noise.astype(np.int16), 0, 255).astype(np.uint8)
    
    # Add blur
    img = cv2.GaussianBlur(img, (5, 5), 0)
    
    return img


def create_tampered_document():
    """
    Digitally edited then reprinted
    Expected: quarantine (tamper score > 70%)
    
    Simulates: Original document with owner name changed, then printed and scanned
    """
    img = create_clean_document()
    
    # White out owner name area
    cv2.rectangle(img, (290, 310), (600, 350), (255, 255, 255), -1)
    
    # Write different owner name
    cv2.putText(img, "Suresh Singh", (300, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Simulate print-scan artifacts
    # Add slight rotation
    center = (img.shape[1] // 2, img.shape[0] // 2)
    M = cv2.getRotationMatrix2D(center, 0.5, 1.0)
    img = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]))
    
    # Add moire pattern (simulates scanning printed document)
    rows, cols = img.shape[:2]
    x = np.arange(cols)
    y = np.arange(rows)
    X, Y = np.meshgrid(x, y)
    moire = np.sin(X / 10) * 10 + np.sin(Y / 10) * 10
    img = np.clip(img.astype(np.int16) + moire.astype(np.int16), 0, 255).astype(np.uint8)
    
    # Add compression artifacts
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
    _, encoded = cv2.imencode('.jpg', img, encode_param)
    img = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    
    return img


def create_duplicate_khasra_document():
    """
    Duplicate of clean document with same khasra number
    Expected: fraud alert (exact duplicate)
    """
    # Exact copy of clean document
    return create_clean_document()


def create_overlapping_plot_document():
    """
    Document with coordinates that overlap with existing plot
    Expected: fraud alert (spatial overlap)
    
    Note: This is a simplified representation. Real overlap detection
    requires actual geometry data, not just the image.
    """
    img = create_clean_document()
    
    # Add a simple boundary diagram
    cv2.rectangle(img, (100, 800), (400, 1000), (0, 0, 255), 2)
    cv2.putText(img, "Plot Boundary", (150, 900), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    
    # Add overlapping boundary
    cv2.rectangle(img, (300, 900), (600, 1100), (255, 0, 0), 2)
    cv2.putText(img, "Overlapping Plot", (350, 1000), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
    
    return img


def save_fixtures(output_dir="test_fixtures"):
    """
    Save all test fixtures to disk with metadata
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    fixtures = {
        "clean": {
            "image": create_clean_document(),
            "expected": {
                "route": "auto_save",
                "confidence_min": 0.90,
                "tamper_max": 0.30,
                "fraud_alerts": []
            },
            "description": "Clean, high-confidence document"
        },
        "faded": {
            "image": create_faded_document(),
            "expected": {
                "route": "admin_queue",
                "confidence_max": 0.70,
                "reason": "Low OCR confidence due to degradation"
            },
            "description": "Faded/degraded document"
        },
        "tampered": {
            "image": create_tampered_document(),
            "expected": {
                "route": "quarantine",
                "tamper_min": 0.70,
                "reason": "Digital editing detected via forensic analysis"
            },
            "description": "Digitally edited then reprinted"
        },
        "duplicate": {
            "image": create_duplicate_khasra_document(),
            "expected": {
                "route": "admin_queue",
                "fraud_alerts": ["exact_duplicate"],
                "reason": "Duplicate khasra number detected"
            },
            "description": "Duplicate khasra entry"
        },
        "overlapping": {
            "image": create_overlapping_plot_document(),
            "expected": {
                "route": "admin_queue",
                "fraud_alerts": ["spatial_overlap"],
                "reason": "Overlapping plot boundaries detected"
            },
            "description": "Overlapping sub-plots"
        }
    }
    
    # Save images
    for name, data in fixtures.items():
        img_path = output_path / f"{name}.png"
        cv2.imwrite(str(img_path), data["image"])
        print(f"Created: {img_path}")
    
    # Save metadata
    metadata = {
        name: {
            "expected": data["expected"],
            "description": data["description"]
        }
        for name, data in fixtures.items()
    }
    
    metadata_path = output_path / "metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Created: {metadata_path}")
    
    return fixtures


if __name__ == "__main__":
    print("Generating Phase 7 regression test fixtures...")
    fixtures = save_fixtures()
    print(f"\nGenerated {len(fixtures)} test fixtures in test_fixtures/")
    print("\nExpected outcomes:")
    for name, data in fixtures.items():
        print(f"  {name}: {data['expected'].get('route', 'N/A')}")
