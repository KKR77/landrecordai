"""
Image Preprocessing Module

Pipeline:
1. Deskew using Hough transform
2. Denoise using fastNlMeansDenoising
3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
4. Adaptive thresholding (Gaussian)
5. Readability check

Author: PS 26018
Version: 2.0.0
"""

import cv2
import numpy as np
import base64
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


def decode_base64_image(image_base64: str) -> np.ndarray:
    """
    Decode base64 encoded image to OpenCV format
    
    Args:
        image_base64: Base64 encoded image string
        
    Returns:
        np.ndarray: OpenCV image (BGR format)
        
    Raises:
        ValueError: If image cannot be decoded
    """
    try:
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
        
    except Exception as e:
        logger.error(f"Failed to decode base64 image: {str(e)}")
        raise ValueError(f"Invalid image data: {str(e)}")


def encode_base64_image(image: np.ndarray) -> str:
    """
    Encode OpenCV image to base64 string
    
    Args:
        image: OpenCV image (BGR format)
        
    Returns:
        str: Base64 encoded image with data URL prefix
    """
    # Encode to PNG
    _, buffer = cv2.imencode('.png', image)
    
    # Convert to base64
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Add data URL prefix
    return f"data:image/png;base64,{image_base64}"


def deskew(image: np.ndarray) -> np.ndarray:
    """
    Deskew image using Hough transform
    
    Detects text lines and rotates image to make them horizontal
    
    Args:
        image: Input image (BGR format)
        
    Returns:
        np.ndarray: Deskewed image
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    
    # Detect lines using Hough transform
    lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
    
    if lines is None:
        logger.warning("No lines detected for deskewing")
        return image
    
    # Calculate median angle
    angles = []
    for rho, theta in lines[:, 0]:
        angle = np.degrees(theta) - 90
        # Only consider near-horizontal lines (-45 to 45 degrees)
        if -45 < angle < 45:
            angles.append(angle)
    
    if not angles:
        logger.warning("No suitable lines found for deskewing")
        return image
    
    # Get median angle
    median_angle = np.median(angles)
    
    # Skip if angle is too small
    if abs(median_angle) < 0.5:
        logger.info(f"Deskew angle too small ({median_angle:.2f}°), skipping")
        return image
    
    logger.info(f"Deskewing image by {median_angle:.2f}°")
    
    # Rotate image
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    
    # Get rotation matrix
    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    
    # Rotate
    rotated = cv2.warpAffine(
        image,
        M,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    
    return rotated


def denoise(image: np.ndarray) -> np.ndarray:
    """
    Denoise image using fastNlMeansDenoising
    
    Args:
        image: Input image (BGR format)
        
    Returns:
        np.ndarray: Denoised image
    """
    # Convert to grayscale for denoising
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply fastNlMeansDenoising
    # Parameters: h=10 (filter strength), templateWindowSize=7, searchWindowSize=21
    denoised = cv2.fastNlMeansDenoising(
        gray,
        None,
        h=10,
        templateWindowSize=7,
        searchWindowSize=21
    )
    
    # Convert back to 3 channels
    denoised_3ch = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)
    
    return denoised_3ch


def apply_clahe(image: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    
    Args:
        image: Input image (BGR format)
        
    Returns:
        np.ndarray: Image with enhanced contrast
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Create CLAHE object
    # clipLimit=2.0, tileGridSize=(8,8)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    
    # Apply CLAHE
    enhanced = clahe.apply(gray)
    
    # Convert back to 3 channels
    enhanced_3ch = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
    
    return enhanced_3ch


def adaptive_threshold(image: np.ndarray) -> np.ndarray:
    """
    Apply adaptive thresholding using Gaussian method
    
    Args:
        image: Input image (BGR format)
        
    Returns:
        np.ndarray: Binary image (black and white)
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive threshold
    # blockSize=11, C=2
    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=11,
        C=2
    )
    
    # Convert back to 3 channels for consistency
    binary_3ch = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    
    return binary_3ch


def check_readability(image: np.ndarray) -> bool:
    """
    Check if image is readable for OCR
    
    Criteria:
    1. Sufficient text density (at least 5% of pixels are text)
    2. Adequate contrast
    3. Not too blurry
    
    Args:
        image: Input image (BGR format)
        
    Returns:
        bool: True if image is readable, False otherwise
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Check 1: Text density
    # Apply threshold to detect text
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    text_pixels = cv2.countNonZero(binary)
    total_pixels = binary.shape[0] * binary.shape[1]
    text_density = text_pixels / total_pixels
    
    if text_density < 0.05:
        logger.warning(f"Image not readable: text density too low ({text_density:.2%})")
        return False
    
    # Check 2: Contrast
    mean, std = cv2.meanStdDev(gray)
    contrast = std[0][0]
    
    if contrast < 20:
        logger.warning(f"Image not readable: contrast too low ({contrast:.2f})")
        return False
    
    # Check 3: Blur detection using Laplacian variance
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    if laplacian_var < 100:
        logger.warning(f"Image not readable: too blurry (Laplacian variance: {laplacian_var:.2f})")
        return False
    
    logger.info(f"Image is readable: density={text_density:.2%}, contrast={contrast:.2f}, blur={laplacian_var:.2f}")
    return True


def preprocess_image(image_data: str) -> Tuple[str, bool]:
    """
    Main preprocessing function
    
    Pipeline:
    1. Decode base64 image
    2. Deskew
    3. Denoise
    4. CLAHE
    5. Adaptive threshold
    6. Check readability
    7. Encode back to base64
    
    Args:
        image_data: Base64 encoded image
        
    Returns:
        Tuple[str, bool]: (processed_image_base64, readable)
        
    Raises:
        ValueError: If image cannot be processed
    """
    logger.info("Starting image preprocessing pipeline")
    
    # Decode
    image = decode_base64_image(image_data)
    logger.info(f"Image decoded: shape={image.shape}")
    
    # Deskew
    image = deskew(image)
    logger.info("Deskewing completed")
    
    # Denoise
    image = denoise(image)
    logger.info("Denoising completed")
    
    # CLAHE
    image = apply_clahe(image)
    logger.info("CLAHE completed")
    
    # Adaptive threshold
    image = adaptive_threshold(image)
    logger.info("Adaptive thresholding completed")
    
    # Check readability
    readable = check_readability(image)
    
    # Encode back to base64
    processed_base64 = encode_base64_image(image)
    logger.info("Image encoding completed")
    
    return processed_base64, readable


# ============================================================================
# Testing utilities
# ============================================================================

def create_test_image(text: str = "Test Document", size: Tuple[int, int] = (800, 600)) -> str:
    """
    Create a test image with text for testing
    
    Args:
        text: Text to render on image
        size: Image size (width, height)
        
    Returns:
        str: Base64 encoded image
    """
    # Create white background
    image = np.ones((size[1], size[0], 3), dtype=np.uint8) * 255
    
    # Add text
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(image, text, (50, 300), font, 2, (0, 0, 0), 3, cv2.LINE_AA)
    
    # Encode to base64
    return encode_base64_image(image)


def create_degraded_image() -> str:
    """
    Create a deliberately degraded image for testing
    
    Returns:
        str: Base64 encoded degraded image
    """
    # Create image with very low contrast and blur
    image = np.ones((600, 800, 3), dtype=np.uint8) * 128
    
    # Add very faint text
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(image, "Test", (50, 300), font, 2, (130, 130, 130), 2, cv2.LINE_AA)
    
    # Apply heavy blur
    image = cv2.GaussianBlur(image, (21, 21), 0)
    
    # Encode to base64
    return encode_base64_image(image)
