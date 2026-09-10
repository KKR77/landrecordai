"""
Tests for Routing Module
"""

import pytest
from app.routing import (
    route_document,
    get_routing_details,
    AUTO_SAVE_THRESHOLD
)


class TestRouting:
    """Test suite for document routing"""
    
    def test_route_auto_save_high_confidence(self):
        """Test routing to auto_save with high confidence"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
            'khata_no': 0.98,
            'village': 0.91,
            'tehsil': 0.93,
            'district': 0.96,
            'area_declared': 0.94
        }
        
        decision, reason = route_document(confidence_scores)
        
        assert decision == "auto_save"
        assert "threshold" in reason.lower()
    
    def test_route_admin_queue_low_confidence(self):
        """Test routing to admin_queue with low confidence"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.85,  # Below threshold
            'khata_no': 0.98,
            'village': 0.91,
            'tehsil': 0.93,
            'district': 0.96,
            'area_declared': 0.94
        }
        
        decision, reason = route_document(confidence_scores)
        
        assert decision == "admin_queue"
        assert "khasra_no" in reason.lower()
    
    def test_route_admin_queue_multiple_low(self):
        """Test routing with multiple low confidence fields"""
        confidence_scores = {
            'owner_name': 0.75,  # Below threshold
            'khasra_no': 0.80,   # Below threshold
            'khata_no': 0.98,
            'village': 0.65,     # Below threshold
            'tehsil': 0.93,
            'district': 0.96,
            'area_declared': 0.94
        }
        
        decision, reason = route_document(confidence_scores)
        
        assert decision == "admin_queue"
        # Should mention at least one low confidence field
        assert any(field in reason.lower() for field in ['owner_name', 'khasra_no', 'village'])
    
    def test_route_exact_threshold(self):
        """Test routing at exact threshold"""
        confidence_scores = {
            'owner_name': AUTO_SAVE_THRESHOLD,
            'khasra_no': AUTO_SAVE_THRESHOLD,
            'khata_no': AUTO_SAVE_THRESHOLD,
            'village': AUTO_SAVE_THRESHOLD,
            'tehsil': AUTO_SAVE_THRESHOLD,
            'district': AUTO_SAVE_THRESHOLD,
            'area_declared': AUTO_SAVE_THRESHOLD
        }
        
        decision, reason = route_document(confidence_scores)
        
        # At threshold should be auto_save
        assert decision == "auto_save"
    
    def test_route_just_below_threshold(self):
        """Test routing just below threshold"""
        confidence_scores = {
            'owner_name': AUTO_SAVE_THRESHOLD,
            'khasra_no': AUTO_SAVE_THRESHOLD - 0.01,  # Just below
            'khata_no': AUTO_SAVE_THRESHOLD,
            'village': AUTO_SAVE_THRESHOLD,
            'tehsil': AUTO_SAVE_THRESHOLD,
            'district': AUTO_SAVE_THRESHOLD,
            'area_declared': AUTO_SAVE_THRESHOLD
        }
        
        decision, reason = route_document(confidence_scores)
        
        # Just below should be admin_queue
        assert decision == "admin_queue"
    
    def test_route_empty_confidence_scores(self):
        """Test routing with empty confidence scores"""
        confidence_scores = {}
        
        decision, reason = route_document(confidence_scores)
        
        # Should route to admin_queue
        assert decision == "admin_queue"
        assert "no confidence" in reason.lower()
    
    def test_route_zero_confidence(self):
        """Test routing with zero confidence"""
        confidence_scores = {
            'owner_name': 0.0,
            'khasra_no': 0.0,
            'khata_no': 0.0,
            'village': 0.0,
            'tehsil': 0.0,
            'district': 0.0,
            'area_declared': 0.0
        }
        
        decision, reason = route_document(confidence_scores)
        
        assert decision == "admin_queue"
    
    def test_route_perfect_confidence(self):
        """Test routing with perfect confidence"""
        confidence_scores = {
            'owner_name': 1.0,
            'khasra_no': 1.0,
            'khata_no': 1.0,
            'village': 1.0,
            'tehsil': 1.0,
            'district': 1.0,
            'area_declared': 1.0
        }
        
        decision, reason = route_document(confidence_scores)
        
        assert decision == "auto_save"
    
    def test_get_routing_details(self):
        """Test getting detailed routing information"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.85,
            'khata_no': 0.98,
            'village': 0.91,
            'tehsil': 0.93,
            'district': 0.96,
            'area_declared': 0.94
        }
        
        details = get_routing_details(confidence_scores)
        
        assert 'decision' in details
        assert 'reason' in details
        assert 'threshold' in details
        assert 'total_fields' in details
        assert 'fields_meeting_threshold' in details
        assert 'fields_below_threshold' in details
        assert 'field_analysis' in details
        
        assert details['decision'] == "admin_queue"
        assert details['total_fields'] == 7
        assert details['fields_below_threshold'] == 1
        assert details['fields_meeting_threshold'] == 6
        
        # Check field analysis
        assert len(details['field_analysis']) == 7
        # Should be sorted by confidence (lowest first)
        assert details['field_analysis'][0]['field'] == 'khasra_no'
    
    def test_routing_consistency(self):
        """Test that routing is consistent"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
            'khata_no': 0.98,
            'village': 0.91,
            'tehsil': 0.93,
            'district': 0.96,
            'area_declared': 0.94
        }
        
        # Call multiple times
        decision1, _ = route_document(confidence_scores)
        decision2, _ = route_document(confidence_scores)
        decision3, _ = route_document(confidence_scores)
        
        # Should be consistent
        assert decision1 == decision2 == decision3 == "auto_save"
    
    def test_routing_with_missing_fields(self):
        """Test routing with some fields missing"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
            # Missing other fields
        }
        
        decision, reason = route_document(confidence_scores)
        
        # Should still work with available fields
        assert decision in ["auto_save", "admin_queue"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
