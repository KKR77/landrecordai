"""
Tests for Image Preprocessing Module
"""

import pytest
import numpy as np
import cv2
import base64
from app.preprocess import (
    decode_base64_image,
    encode_base64_image,
    deskew,
    denoise,
    apply_clahe,
    adaptive_threshold,
    check_readability,
    preprocess_image,
    create_test_image,
    create_degraded_image
)


class TestPreprocessing:
    """Test suite for image preprocessing"""
    
    def test_decode_encode_roundtrip(self):
        """Test that decode/encode preserves image"""
        # Create test image
        original = np.ones((100, 100, 3), dtype=np.uint8) * 128
        
        # Encode
        encoded = encode_base64_image(original)
        
        # Decode
        decoded = decode_base64_image(encoded)
        
        # Check shape
        assert decoded.shape == original.shape
        
        # Check values (allow small differences due to compression)
        diff = np.abs(decoded.astype(int) - original.astype(int))
        assert diff.mean() < 5
    
    def test_deskew_straight_image(self):
        """Test deskewing a straight image"""
        # Create straight image
        image = np.ones((600, 800, 3), dtype=np.uint8) * 255
        
        # Add horizontal lines
        cv2.line(image, (100, 200), (700, 200), (0, 0, 0), 2)
        cv2.line(image, (100, 400), (700, 400), (0, 0, 0), 2)
        
        # Deskew
        result = deskew(image)
        
        # Should return image (may or may not rotate)
        assert result.shape == image.shape
    
    def test_deskew_rotated_image(self):
        """Test deskewing a rotated image"""
        # Create image with text
        image = np.ones((600, 800, 3), dtype=np.uint8) * 255
        cv2.putText(image, "Test", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 3)
        
        # Rotate by 10 degrees
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, 10, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h))
        
        # Deskew
        result = deskew(rotated)
        
        # Should return image
        assert result.shape == rotated.shape
    
    def test_denoise(self):
        """Test denoising"""
        # Create image with noise
        image = np.ones((600, 800, 3), dtype=np.uint8) * 128
        noise = np.random.normal(0, 25, image.shape)
        noisy = np.clip(image + noise, 0, 255).astype(np.uint8)
        
        # Denoise
        result = denoise(noisy)
        
        # Should reduce noise
        assert result.shape == noisy.shape
        
        # Check that noise is reduced (variance should be lower)
        original_var = np.var(noisy)
        result_var = np.var(result)
        assert result_var < original_var
    
    def test_clahe(self):
        """Test CLAHE contrast enhancement"""
        # Create low contrast image
        image = np.ones((600, 800, 3), dtype=np.uint8) * 100
        
        # Apply CLAHE
        result = apply_clahe(image)
        
        # Should enhance contrast
        assert result.shape == image.shape
        
        # Check that contrast is improved
        original_std = np.std(image)
        result_std = np.std(result)
        assert result_std > original_std
    
    def test_adaptive_threshold(self):
        """Test adaptive thresholding"""
        # Create grayscale-like image
        image = np.ones((600, 800, 3), dtype=np.uint8) * 128
        cv2.putText(image, "Test", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (50, 50, 50), 3)
        
        # Apply threshold
        result = adaptive_threshold(image)
        
        # Should be binary (only 0 and 255)
        assert result.shape == image.shape
        unique_values = np.unique(result)
        assert len(unique_values) <= 2
    
    def test_check_readability_good_image(self):
        """Test readability check on good image"""
        # Create image with clear text
        image = np.ones((600, 800, 3), dtype=np.uint8) * 255
        cv2.putText(image, "Test Document", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 3)
        
        # Check readability
        readable = check_readability(image)
        
        # Should be readable
        assert readable is True
    
    def test_check_readability_degraded_image(self):
        """Test readability check on degraded image"""
        # Create very low contrast image
        image = np.ones((600, 800, 3), dtype=np.uint8) * 128
        cv2.putText(image, "Test", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (130, 130, 130), 2)
        
        # Apply heavy blur
        image = cv2.GaussianBlur(image, (21, 21), 0)
        
        # Check readability
        readable = check_readability(image)
        
        # Should not be readable
        assert readable is False
    
    def test_preprocess_image_clean(self):
        """Test full preprocessing pipeline on clean image"""
        # Create clean test image
        image_base64 = create_test_image("Test Document")
        
        # Preprocess
        processed_base64, readable = preprocess_image(image_base64)
        
        # Should succeed
        assert processed_base64 is not None
        assert readable is True
        assert processed_base64.startswith("data:image/png;base64,")
    
    def test_preprocess_image_degraded(self):
        """Test full preprocessing pipeline on degraded image"""
        # Create degraded test image
        image_base64 = create_degraded_image()
        
        # Preprocess
        processed_base64, readable = preprocess_image(image_base64)
        
        # Should complete but mark as not readable
        assert processed_base64 is not None
        assert readable is False
    
    def test_preprocess_invalid_image(self):
        """Test preprocessing with invalid image data"""
        # Invalid base64
        with pytest.raises(ValueError):
            preprocess_image("invalid_base64_data")
    
    def test_create_test_image(self):
        """Test test image creation"""
        image_base64 = create_test_image("Test", (800, 600))
        
        # Should be valid base64
        assert image_base64.startswith("data:image/png;base64,")
        
        # Decode and check
        image = decode_base64_image(image_base64)
        assert image.shape == (600, 800, 3)
    
    def test_create_degraded_image(self):
        """Test degraded image creation"""
        image_base64 = create_degraded_image()
        
        # Should be valid base64
        assert image_base64.startswith("data:image/png;base64,")
        
        # Decode and check
        image = decode_base64_image(image_base64)
        assert image.shape[0] > 0
        assert image.shape[1] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
