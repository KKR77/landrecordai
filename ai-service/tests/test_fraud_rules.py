"""
Tests for Fraud Rule Engine — Phase 3

Tests each fraud rule independently with various scenarios.

Author: PS 26018
Version: 3.0.0
"""

import pytest
from app.fraud_rules import (
    check_area_consistency,
    check_spatial_overlap,
    check_exact_duplicate,
    check_near_duplicate,
    compute_field_hash,
    run_fraud_checks,
)


class TestAreaConsistency:
    """Tests for Math-Mismatch Guard"""
    
    def test_area_consistent(self):
        """Should pass when areas are consistent"""
        records = [
            {"id": "1", "area_declared": 1.0, "status": "verified"},
            {"id": "2", "area_declared": 1.5, "status": "verified"},
        ]
        
        alert = check_area_consistency(
            village="Rampur",
            tehsil="Sadar",
            district="Lucknow",
            existing_records=records,
            parent_plot_area=2.5
        )
        
        # Should not alert (within 5% tolerance)
        assert alert is None
    
    def test_area_mismatch(self):
        """Should alert when areas don't match"""
        records = [
            {"id": "1", "area_declared": 2.0, "status": "verified"},
            {"id": "2", "area_declared": 2.0, "status": "verified"},
        ]
        
        alert = check_area_consistency(
            village="Rampur",
            tehsil="Sadar",
            district="Lucknow",
            existing_records=records,
            parent_plot_area=2.5
        )
        
        # Should alert (total 4.0 vs parent 2.5)
        assert alert is not None
        assert alert["type"] == "area_mismatch"
        assert alert["severity"] in ["medium", "high"]
    
    def test_area_no_parent_reference(self):
        """Should skip check when no parent plot reference"""
        records = [
            {"id": "1", "area_declared": 1.0, "status": "verified"},
        ]
        
        alert = check_area_consistency(
            village="Rampur",
            tehsil="Sadar",
            district="Lucknow",
            existing_records=records,
            parent_plot_area=None
        )
        
        assert alert is None
    
    def test_area_ignores_archived(self):
        """Should ignore archived records"""
        records = [
            {"id": "1", "area_declared": 1.0, "status": "verified"},
            {"id": "2", "area_declared": 10.0, "status": "archived"},  # Should be ignored
        ]
        
        alert = check_area_consistency(
            village="Rampur",
            tehsil="Sadar",
            district="Lucknow",
            existing_records=records,
            parent_plot_area=1.0
        )
        
        # Should not alert (only 1.0 counted, archived 10.0 ignored)
        assert alert is None


class TestSpatialOverlap:
    """Tests for Spatial Overlap Guard"""
    
    def test_no_overlap(self):
        """Should pass when geometries don't overlap"""
        new_geom = {
            "type": "Polygon",
            "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        }
        
        existing_geoms = [
            {
                "id": "1",
                "geom": {
                    "type": "Polygon",
                    "coordinates": [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]]
                }
            }
        ]
        
        alert = check_spatial_overlap(new_geom, existing_geoms)
        assert alert is None
    
    def test_overlap_detected(self):
        """Should detect overlapping geometries"""
        new_geom = {
            "type": "Polygon",
            "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
        }
        
        existing_geoms = [
            {
                "id": "1",
                "geom": {
                    "type": "Polygon",
                    "coordinates": [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
                }
            }
        ]
        
        alert = check_spatial_overlap(new_geom, existing_geoms)
        
        assert alert is not None
        assert alert["type"] == "spatial_overlap"
        assert alert["severity"] == "high"
        assert "1" in alert["details"]["overlapping_record_ids"]
    
    def test_empty_existing_geoms(self):
        """Should handle empty existing geometries"""
        new_geom = {
            "type": "Polygon",
            "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        }
        
        alert = check_spatial_overlap(new_geom, [])
        assert alert is None


class TestExactDuplicate:
    """Tests for Exact Duplicate Detection"""
    
    def test_no_duplicate(self):
        """Should pass when no exact duplicate exists"""
        existing_records = [
            {
                "id": "1",
                "owner_name": "Ramesh Kumar",
                "khasra_no": "123",
                "village": "Rampur",
                "status": "verified"
            }
        ]
        
        alert = check_exact_duplicate(
            owner_name="Suresh Singh",
            khasra_no="456",
            village="Rampur",
            existing_records=existing_records
        )
        
        assert alert is None
    
    def test_exact_duplicate_detected(self):
        """Should detect exact duplicate"""
        existing_records = [
            {
                "id": "1",
                "owner_name": "Ramesh Kumar",
                "khasra_no": "123",
                "village": "Rampur",
                "status": "verified"
            }
        ]
        
        alert = check_exact_duplicate(
            owner_name="Ramesh Kumar",
            khasra_no="123",
            village="Rampur",
            existing_records=existing_records
        )
        
        assert alert is not None
        assert alert["type"] == "exact_duplicate"
        assert alert["severity"] == "critical"
        assert "1" in alert["details"]["duplicate_record_ids"]
    
    def test_case_insensitive_match(self):
        """Should match case-insensitively"""
        existing_records = [
            {
                "id": "1",
                "owner_name": "Ramesh Kumar",
                "khasra_no": "123",
                "village": "Rampur",
                "status": "verified"
            }
        ]
        
        alert = check_exact_duplicate(
            owner_name="ramesh kumar",  # lowercase
            khasra_no="123",
            village="rampur",  # lowercase
            existing_records=existing_records
        )
        
        assert alert is not None
    
    def test_ignores_archived(self):
        """Should ignore archived records"""
        existing_records = [
            {
                "id": "1",
                "owner_name": "Ramesh Kumar",
                "khasra_no": "123",
                "village": "Rampur",
                "status": "archived"
            }
        ]
        
        alert = check_exact_duplicate(
            owner_name="Ramesh Kumar",
            khasra_no="123",
            village="Rampur",
            existing_records=existing_records
        )
        
        assert alert is None


class TestNearDuplicate:
    """Tests for Near-Duplicate Detection"""
    
    def test_no_near_duplicate(self):
        """Should pass when no near-duplicates exist"""
        embedding = [0.1] * 384
        similar_uploads = [
            {"id": "1", "storage_path": "path1", "similarity": 0.5}
        ]
        
        alert = check_near_duplicate(embedding, similar_uploads, 0.90)
        assert alert is None
    
    def test_near_duplicate_detected(self):
        """Should detect near-duplicates above threshold"""
        embedding = [0.1] * 384
        similar_uploads = [
            {"id": "1", "storage_path": "path1", "similarity": 0.95},
            {"id": "2", "storage_path": "path2", "similarity": 0.92},
        ]
        
        alert = check_near_duplicate(embedding, similar_uploads, 0.90)
        
        assert alert is not None
        assert alert["type"] == "near_duplicate"
        assert alert["severity"] == "medium"
        assert alert["details"]["near_duplicate_count"] == 2


class TestFieldHash:
    """Tests for field hash computation"""
    
    def test_hash_consistency(self):
        """Same inputs should produce same hash"""
        hash1 = compute_field_hash("Ramesh Kumar", "123", "Rampur")
        hash2 = compute_field_hash("Ramesh Kumar", "123", "Rampur")
        
        assert hash1 == hash2
    
    def test_hash_case_insensitive(self):
        """Hash should be case-insensitive"""
        hash1 = compute_field_hash("Ramesh Kumar", "123", "Rampur")
        hash2 = compute_field_hash("ramesh kumar", "123", "rampur")
        
        assert hash1 == hash2
    
    def test_hash_whitespace_insensitive(self):
        """Hash should ignore leading/trailing whitespace"""
        hash1 = compute_field_hash("Ramesh Kumar", "123", "Rampur")
        hash2 = compute_field_hash("  Ramesh Kumar  ", "  123  ", "  Rampur  ")
        
        assert hash1 == hash2
    
    def test_hash_different_inputs(self):
        """Different inputs should produce different hashes"""
        hash1 = compute_field_hash("Ramesh Kumar", "123", "Rampur")
        hash2 = compute_field_hash("Suresh Singh", "456", "Rampur")
        
        assert hash1 != hash2


class TestCombinedFraudChecks:
    """Tests for combined fraud check runner"""
    
    def test_combined_no_alerts(self):
        """Should return empty list when no rules fire"""
        extracted = {
            "owner_name": "Ramesh Kumar",
            "khasra_no": "123",
            "village": "Rampur",
            "tehsil": "Sadar",
            "district": "Lucknow",
        }
        
        alerts = run_fraud_checks(
            extracted_data=extracted,
            new_geom=None,
            text_embedding=None,
            existing_records=[],
            existing_geoms=[],
            similar_uploads=[]
        )
        
        assert alerts == []
    
    def test_combined_multiple_alerts(self):
        """Should return multiple alerts when multiple rules fire"""
        extracted = {
            "owner_name": "Ramesh Kumar",
            "khasra_no": "123",
            "village": "Rampur",
            "tehsil": "Sadar",
            "district": "Lucknow",
        }
        
        existing_records = [
            {
                "id": "1",
                "owner_name": "Ramesh Kumar",
                "khasra_no": "123",
                "village": "Rampur",
                "status": "verified"
            }
        ]
        
        alerts = run_fraud_checks(
            extracted_data=extracted,
            new_geom=None,
            text_embedding=None,
            existing_records=existing_records,
            existing_geoms=[],
            similar_uploads=[]
        )
        
        # Should detect exact duplicate
        assert len(alerts) >= 1
        assert any(a["type"] == "exact_duplicate" for a in alerts)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
