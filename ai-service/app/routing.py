"""
Document Routing Module

Decides whether to auto-save or send to admin queue based on confidence scores

Current rule:
- auto_save: All fields >= 90% confidence
- admin_queue: Any field < 90% confidence

Future: Can be extended with tamper detection, fraud rules, etc.

Author: PS 26018
Version: 2.0.0
"""

from typing import Tuple, Dict
import logging

logger = logging.getLogger(__name__)


# Confidence threshold for auto-save
AUTO_SAVE_THRESHOLD = 0.90  # 90%


def route_document(confidence_scores: Dict[str, float]) -> Tuple[str, str]:
    """
    Route document based on confidence scores
    
    Decision logic:
    - If all fields >= 90% confidence → auto_save
    - If any field < 90% confidence → admin_queue
    
    Args:
        confidence_scores: Dict mapping field names to confidence scores (0.0-1.0)
        
    Returns:
        Tuple containing:
            - str: Decision ("auto_save" or "admin_queue")
            - str: Reason for the decision
    """
    logger.info(f"Starting routing decision with {len(confidence_scores)} fields")
    
    if not confidence_scores:
        logger.warning("No confidence scores provided, routing to admin_queue")
        return "admin_queue", "No confidence scores available"
    
    # Check each field
    low_confidence_fields = []
    
    for field, confidence in confidence_scores.items():
        if confidence < AUTO_SAVE_THRESHOLD:
            low_confidence_fields.append({
                "field": field,
                "confidence": confidence,
                "threshold": AUTO_SAVE_THRESHOLD
            })
    
    # Make decision
    if not low_confidence_fields:
        decision = "auto_save"
        reason = f"All fields meet {AUTO_SAVE_THRESHOLD*100:.0f}% confidence threshold"
        logger.info(f"Decision: {decision} - {reason}")
    else:
        decision = "admin_queue"
        fields_str = ", ".join([f"{f['field']} ({f['confidence']*100:.1f}%)" for f in low_confidence_fields])
        reason = f"Low confidence in: {fields_str}"
        logger.info(f"Decision: {decision} - {reason}")
    
    return decision, reason


def get_routing_details(confidence_scores: Dict[str, float]) -> Dict:
    """
    Get detailed routing information
    
    Args:
        confidence_scores: Dict mapping field names to confidence scores
        
    Returns:
        Dict with routing details including decision, reason, and field analysis
    """
    decision, reason = route_document(confidence_scores)
    
    # Analyze each field
    field_analysis = []
    for field, confidence in confidence_scores.items():
        meets_threshold = confidence >= AUTO_SAVE_THRESHOLD
        field_analysis.append({
            "field": field,
            "confidence": confidence,
            "meets_threshold": meets_threshold,
            "threshold": AUTO_SAVE_THRESHOLD
        })
    
    # Sort by confidence (lowest first)
    field_analysis.sort(key=lambda x: x['confidence'])
    
    return {
        "decision": decision,
        "reason": reason,
        "threshold": AUTO_SAVE_THRESHOLD,
        "total_fields": len(confidence_scores),
        "fields_meeting_threshold": sum(1 for f in field_analysis if f['meets_threshold']),
        "fields_below_threshold": sum(1 for f in field_analysis if not f['meets_threshold']),
        "field_analysis": field_analysis
    }


# ============================================================================
# Future extension points
# ============================================================================

def check_tamper_score(tamper_score: float) -> Tuple[bool, str]:
    """
    Check if tamper score is acceptable
    
    NOTE: This is a stub for Phase 3 (forensic/fraud detection)
    
    Args:
        tamper_score: Tamper detection score (0.0-1.0)
        
    Returns:
        Tuple containing:
            - bool: True if acceptable, False if suspicious
            - str: Reason
    """
    TAMPER_THRESHOLD = 0.70  # 70%
    
    if tamper_score > TAMPER_THRESHOLD:
        return False, f"High tamper score: {tamper_score*100:.1f}%"
    
    return True, f"Tamper score acceptable: {tamper_score*100:.1f}%"


def check_fraud_rules(entities: Dict, confidence_scores: Dict[str, float]) -> Tuple[bool, str]:
    """
    Apply fraud detection rules
    
    NOTE: This is a stub for Phase 3 (fraud rules engine)
    
    Args:
        entities: Extracted entities
        confidence_scores: Confidence scores
        
    Returns:
        Tuple containing:
            - bool: True if no fraud detected, False if suspicious
            - str: Reason
    """
    # Placeholder for future fraud rules
    return True, "No fraud rules applied yet"


def enhanced_routing(
    confidence_scores: Dict[str, float],
    tamper_score: float = 0.0,
    entities: Dict = None
) -> Tuple[str, str]:
    """
    Enhanced routing with tamper and fraud checks
    
    NOTE: This is a stub for Phase 3
    
    Args:
        confidence_scores: Confidence scores
        tamper_score: Tamper detection score
        entities: Extracted entities
        
    Returns:
        Tuple containing:
            - str: Decision
            - str: Reason
    """
    # Base routing
    decision, reason = route_document(confidence_scores)
    
    # Future: Add tamper check
    # tamper_ok, tamper_reason = check_tamper_score(tamper_score)
    # if not tamper_ok:
    #     return "admin_queue", f"Tamper detected: {tamper_reason}"
    
    # Future: Add fraud rules
    # fraud_ok, fraud_reason = check_fraud_rules(entities, confidence_scores)
    # if not fraud_ok:
    #     return "admin_queue", f"Fraud detected: {fraud_reason}"
    
    return decision, reason
