"""
Tests for Routing Module — Phase 3

Tests the updated decision table with tamper scores and fraud flags.

Decision Table:
| OCR Confidence | Tamper Score  | Fraud Flag | Action                                      |
|----------------|---------------|------------|---------------------------------------------|
| ≥90%           | Low (0–30)    | none       | auto_save                                   |
| any            | Medium (31–70)| any        | admin_queue, tag "Forensic Review"          |
| any            | High (71–100) | any        | quarantine, block DB write                  |
| <90%           | Low (0–30)    | none       | admin_queue, tag "Low Confidence"           |

Author: PS 26018
Version: 3.0.0
"""

import pytest
from app.routing import (
    route_by_confidence,
    route_document_v3,
    route_document,
    get_tamper_category,
    CONFIDENCE_THRESHOLD,
    TAMPER_LOW_MAX,
    TAMPER_MEDIUM_MAX,
)


class TestTamperCategory:
    """Tests for tamper score categorization"""
    
    def test_low_tamper(self):
        """Scores 0-30 should be 'low'"""
        assert get_tamper_category(0) == "low"
        assert get_tamper_category(15) == "low"
        assert get_tamper_category(30) == "low"
    
    def test_medium_tamper(self):
        """Scores 31-70 should be 'medium'"""
        assert get_tamper_category(31) == "medium"
        assert get_tamper_category(50) == "medium"
        assert get_tamper_category(70) == "medium"
    
    def test_high_tamper(self):
        """Scores 71-100 should be 'high'"""
        assert get_tamper_category(71) == "high"
        assert get_tamper_category(85) == "high"
        assert get_tamper_category(100) == "high"


class TestPhase3Routing:
    """Tests for Phase 3 routing decision table"""
    
    def test_auto_save_high_confidence_low_tamper_no_fraud(self):
        """Rule 1: ≥90% confidence, Low tamper, no fraud → auto_save"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
            'khata_no': 0.98,
        }
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=20.0,  # Low
            fraud_alerts=[]
        )
        
        assert result["decision"] == "auto_save"
        assert result["blocked"] is False
    
    def test_admin_queue_medium_tamper(self):
        """Rule 2: Any confidence, Medium tamper → admin_queue + Forensic Review tag"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=50.0,  # Medium
            fraud_alerts=[]
        )
        
        assert result["decision"] == "admin_queue"
        assert "Forensic Review" in result["tags"]
        assert result["blocked"] is False
    
    def test_quarantine_high_tamper(self):
        """Rule 3: Any confidence, High tamper → quarantine + blocked"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=85.0,  # High
            fraud_alerts=[]
        )
        
        assert result["decision"] == "quarantine"
        assert result["blocked"] is True
        assert "Quarantined" in result["tags"]
        assert "High Tamper Risk" in result["tags"]
    
    def test_admin_queue_low_confidence_low_tamper(self):
        """Rule 4: <90% confidence, Low tamper, no fraud → admin_queue + Low Confidence tag"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.75,  # Below threshold
        }
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=20.0,  # Low
            fraud_alerts=[]
        )
        
        assert result["decision"] == "admin_queue"
        assert "Low Confidence" in result["tags"]
        assert result["blocked"] is False
    
    def test_admin_queue_low_tamper_with_fraud(self):
        """Low tamper but fraud detected → admin_queue"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        fraud_alerts = [
            {"type": "exact_duplicate", "severity": "critical"}
        ]
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=20.0,  # Low
            fraud_alerts=fraud_alerts
        )
        
        assert result["decision"] == "admin_queue"
        assert "Fraud Detected" in result["tags"]
    
    def test_quarantine_high_tamper_with_fraud(self):
        """High tamper + fraud → quarantine with both tags"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        fraud_alerts = [
            {"type": "exact_duplicate", "severity": "critical"}
        ]
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=85.0,  # High
            fraud_alerts=fraud_alerts
        )
        
        assert result["decision"] == "quarantine"
        assert result["blocked"] is True
        assert "High Tamper Risk" in result["tags"]
        assert "Fraud Detected" in result["tags"]
    
    def test_medium_tamper_with_fraud(self):
        """Medium tamper + fraud → admin_queue with both tags"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        fraud_alerts = [
            {"type": "spatial_overlap", "severity": "high"}
        ]
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=50.0,  # Medium
            fraud_alerts=fraud_alerts
        )
        
        assert result["decision"] == "admin_queue"
        assert "Forensic Review" in result["tags"]
        assert "Fraud Detected" in result["tags"]
    
    def test_boundary_low_tamper(self):
        """Tamper score exactly at 30 should be 'low'"""
        confidence_scores = {'owner_name': 0.95}
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=30.0,  # Exactly at boundary
            fraud_alerts=[]
        )
        
        assert result["tamper_category"] == "low"
        assert result["decision"] == "auto_save"
    
    def test_boundary_medium_tamper(self):
        """Tamper score exactly at 31 should be 'medium'"""
        confidence_scores = {'owner_name': 0.95}
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=31.0,  # Just above boundary
            fraud_alerts=[]
        )
        
        assert result["tamper_category"] == "medium"
        assert result["decision"] == "admin_queue"
    
    def test_boundary_high_tamper(self):
        """Tamper score exactly at 71 should be 'high'"""
        confidence_scores = {'owner_name': 0.95}
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=71.0,  # Just above medium boundary
            fraud_alerts=[]
        )
        
        assert result["tamper_category"] == "high"
        assert result["decision"] == "quarantine"
        assert result["blocked"] is True
    
    def test_result_includes_all_metadata(self):
        """Result should include all routing metadata"""
        confidence_scores = {'owner_name': 0.95, 'khasra_no': 0.92}
        
        result = route_document_v3(
            confidence_scores=confidence_scores,
            tamper_score=50.0,
            fraud_alerts=[{"type": "exact_duplicate"}]
        )
        
        assert "decision" in result
        assert "reason" in result
        assert "tags" in result
        assert "blocked" in result
        assert "tamper_category" in result
        assert "tamper_score" in result
        assert "min_confidence" in result
        assert "fraud_alert_count" in result
        assert "fraud_types" in result


class TestBackwardCompatibility:
    """Tests for backward-compatible routing function"""
    
    def test_phase2_compatibility(self):
        """Old-style call (no tamper/fraud) should use Phase 2 logic"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        decision, reason = route_document(confidence_scores)
        
        # Should behave like Phase 2
        assert decision == "auto_save"
    
    def test_phase3_with_tamper(self):
        """Call with tamper score should use Phase 3 logic"""
        confidence_scores = {
            'owner_name': 0.95,
            'khasra_no': 0.92,
        }
        
        decision, reason = route_document(
            confidence_scores,
            tamper_score=85.0
        )
        
        # Should use Phase 3 logic
        assert decision == "quarantine"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
