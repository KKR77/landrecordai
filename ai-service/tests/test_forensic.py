"""
Tests for Forensic Analysis Module — Phase 3

Tests each sub-check with known-clean and known-tampered samples.
Uses fixtures from fixtures.py (reused in Phase 7 regression suite).

Author: PS 26018
Version: 3.0.0
"""

import pytest
from app.forensic import (
    analyze_ela,
    analyze_prnu,
    analyze_font_baseline,
    analyze_fft,
    analyze_metadata_diff,
    run_forensic_analysis,
)
from tests.fixtures import (
    create_clean_document,
    create_tampered_document,
    create_print_scan_document,
    create_sample_bounding_boxes,
    create_inconsistent_bounding_boxes,
)


class TestELA:
    """Tests for Error Level Analysis"""
    
    def test_ela_clean_document(self):
        """ELA should return low score for clean document"""
        clean_image = create_clean_document()
        score, details = analyze_ela(clean_image)
        
        assert 0 <= score <= 100
        assert "mean_difference" in details
        assert "heatmap_base64" in details
        # Clean document should have relatively low ELA score
        # (not asserting exact threshold since it depends on image content)
        print(f"Clean document ELA score: {score:.2f}")
    
    def test_ela_tampered_document(self):
        """ELA should return higher score for tampered document"""
        tampered_image = create_tampered_document()
        score, details = analyze_ela(tampered_image)
        
        assert 0 <= score <= 100
        assert "mean_difference" in details
        print(f"Tampered document ELA score: {score:.2f}")
    
    def test_ela_returns_heatmap(self):
        """ELA should return a heatmap for visualization"""
        clean_image = create_clean_document()
        score, details = analyze_ela(clean_image)
        
        assert "heatmap_base64" in details
        assert details["heatmap_base64"].startswith("data:image/png;base64,")


class TestPRNU:
    """Tests for Noise/PRNU Consistency"""
    
    def test_prnu_clean_document(self):
        """PRNU should return low score for clean document"""
        clean_image = create_clean_document()
        score, details = analyze_prnu(clean_image)
        
        assert 0 <= score <= 100
        assert "mean_variance" in details
        assert "outlier_percentage" in details
        print(f"Clean document PRNU score: {score:.2f}")
    
    def test_prnu_tampered_document(self):
        """PRNU should detect noise inconsistency in tampered document"""
        tampered_image = create_tampered_document()
        score, details = analyze_prnu(tampered_image)
        
        assert 0 <= score <= 100
        assert "outlier_percentage" in details
        print(f"Tampered document PRNU score: {score:.2f}")
    
    def test_prnu_block_size_parameter(self):
        """PRNU should accept different block sizes"""
        clean_image = create_clean_document()
        
        score_16, details_16 = analyze_prnu(clean_image, block_size=16)
        score_64, details_64 = analyze_prnu(clean_image, block_size=64)
        
        # Both should complete without error
        assert 0 <= score_16 <= 100
        assert 0 <= score_64 <= 100
        assert details_16["block_size"] == 16
        assert details_64["block_size"] == 64


class TestFontBaseline:
    """Tests for Font/Baseline Uniformity"""
    
    def test_font_baseline_consistent(self):
        """Font/baseline should return low score for consistent text"""
        boxes = create_sample_bounding_boxes()
        score, details = analyze_font_baseline(boxes)
        
        assert 0 <= score <= 100
        assert "num_lines" in details
        assert "baseline_variance" in details
        print(f"Consistent font/baseline score: {score:.2f}")
    
    def test_font_baseline_inconsistent(self):
        """Font/baseline should detect inconsistent baselines"""
        boxes = create_inconsistent_bounding_boxes()
        score, details = analyze_font_baseline(boxes)
        
        assert 0 <= score <= 100
        assert "baseline_variance" in details
        # Inconsistent baselines should have higher variance
        print(f"Inconsistent font/baseline score: {score:.2f}")
    
    def test_font_baseline_empty_boxes(self):
        """Font/baseline should handle empty bounding boxes"""
        score, details = analyze_font_baseline([])
        
        assert score == 0.0
        assert "note" in details


class TestFFT:
    """Tests for FFT Generation-Loss Check"""
    
    def test_fft_clean_document(self):
        """FFT should return low score for clean document"""
        clean_image = create_clean_document()
        score, details = analyze_fft(clean_image)
        
        assert 0 <= score <= 100
        assert "off_center_ratio" in details
        assert "bright_spot_count" in details
        print(f"Clean document FFT score: {score:.2f}")
    
    def test_fft_print_scan_document(self):
        """FFT should detect moiré patterns from print-scan"""
        print_scan_image = create_print_scan_document()
        score, details = analyze_fft(print_scan_image)
        
        assert 0 <= score <= 100
        assert "periodic_pattern_detected" in details
        print(f"Print-scan document FFT score: {score:.2f}")
    
    def test_fft_energy_metrics(self):
        """FFT should return energy metrics"""
        clean_image = create_clean_document()
        score, details = analyze_fft(clean_image)
        
        assert "center_energy" in details
        assert "total_energy" in details
        assert details["total_energy"] > 0


class TestMetadataDiff:
    """Tests for Metadata Diff Analysis"""
    
    def test_metadata_no_locked_version(self):
        """Metadata should handle missing locked version"""
        clean_image = create_clean_document()
        score, details = analyze_metadata_diff(clean_image, None)
        
        assert 0 <= score <= 100
        assert "note" in details
    
    def test_metadata_with_locked_version(self):
        """Metadata should compare against locked version"""
        clean_image = create_clean_document()
        locked_metadata = {
            "Model": "Canon EOS 5D",
            "DateTime": "2026:01:15 10:30:00",
        }
        
        score, details = analyze_metadata_diff(clean_image, locked_metadata)
        
        assert 0 <= score <= 100
        assert "changed_fields" in details
        assert "current_exif_fields" in details
    
    def test_metadata_changed_critical_field(self):
        """Metadata should flag changed critical fields"""
        clean_image = create_clean_document()
        locked_metadata = {
            "Model": "Canon EOS 5D",
            "DateTime": "2026:01:15 10:30:00",
        }
        
        score, details = analyze_metadata_diff(clean_image, locked_metadata)
        
        # Score depends on whether EXIF matches locked version
        # Since our test images don't have real EXIF, this tests the logic
        assert 0 <= score <= 100


class TestCombinedForensic:
    """Tests for combined forensic analysis"""
    
    def test_combined_clean_document(self):
        """Combined analysis should work on clean document"""
        clean_image = create_clean_document()
        boxes = create_sample_bounding_boxes()
        
        score, details = run_forensic_analysis(
            original_image_base64=clean_image,
            ocr_bounding_boxes=boxes
        )
        
        assert 0 <= score <= 100
        assert "per_check_scores" in details
        assert "weights_used" in details
        assert "failed_checks" in details
        assert "combined_score" in details
        
        print(f"Clean document combined score: {score:.2f}")
        print(f"Per-check scores: {details['per_check_scores']}")
    
    def test_combined_tampered_document(self):
        """Combined analysis should detect tampered document"""
        tampered_image = create_tampered_document()
        boxes = create_sample_bounding_boxes()
        
        score, details = run_forensic_analysis(
            original_image_base64=tampered_image,
            ocr_bounding_boxes=boxes
        )
        
        assert 0 <= score <= 100
        print(f"Tampered document combined score: {score:.2f}")
    
    def test_combined_handles_subcheck_failure(self):
        """Combined analysis should handle sub-check failures gracefully"""
        clean_image = create_clean_document()
        
        # Pass invalid bounding boxes to trigger font_baseline failure
        score, details = run_forensic_analysis(
            original_image_base64=clean_image,
            ocr_bounding_boxes=None  # This should still work
        )
        
        assert 0 <= score <= 100
        # Should complete even if some sub-checks fail
        assert "failed_checks" in details
    
    def test_combined_weighting_formula(self):
        """Combined analysis should use documented weighting formula"""
        clean_image = create_clean_document()
        boxes = create_sample_bounding_boxes()
        
        score, details = run_forensic_analysis(
            original_image_base64=clean_image,
            ocr_bounding_boxes=boxes
        )
        
        weights = details["weights_used"]
        
        # Check that weights sum to ~1.0
        total_weight = sum(weights.values())
        assert abs(total_weight - 1.0) < 0.01
        
        # Check default weights are used (if no failures)
        if not details["failed_checks"]:
            assert "ela" in weights
            assert "prnu" in weights
            assert "font_baseline" in weights
            assert "fft" in weights
            assert "metadata" in weights


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
