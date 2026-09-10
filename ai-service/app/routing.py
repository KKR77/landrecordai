"""
Document Routing Module — Phase 3

Updated decision table incorporating forensic tamper scores and fraud flags.

Decision Table:
┌─────────────────┬─────────────────┬────────────┬────────────────────────────────────────┐
│ OCR Confidence  │ Tamper Score    │ Fraud Flag │ Action                                  │
├─────────────────┼─────────────────┼────────────┼─────────────────────────────────────────┤
│ ≥90%            │ Low (0–30)      │ none       │ auto_save                               │
│ any             │ Medium (31–70)  │ any        │ admin_queue, tag "Forensic Review"      │
│ any             │ High (71–100)   │ any        │ quarantine, block DB write              │
│ <90%            │ Low (0–30)      │ none       │ admin_queue, tag "Low Confidence"       │
└─────────────────┴─────────────────┴────────────┴─────────────────────────────────────────┘

Author: PS 26018
Version: 3.0.0
"""

from typing import Tuple, Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# Thresholds
# ============================================================================

CONFIDENCE_THRESHOLD = 0.90  # 90%
TAMPER_LOW_MAX = 30
TAMPER_MEDIUM_MAX = 70
# TAMPER_HIGH = 71-100


# ============================================================================
# Phase 2 Routing (backward compatible)
# ============================================================================

def route_by_confidence(confidence_scores: Dict[str, float]) -> Tuple[str, str]:
    """
    Phase 2 routing: Based on OCR confidence scores only
    
    Args:
        confidence_scores: Dict mapping field names to confidence scores (0.0-1.0)
        
    Returns:
        Tuple containing:
            - str: Decision ("auto_save" or "admin_queue")
            - str: Reason for the decision
    """
    logger.info(f"Starting confidence-based routing with {len(confidence_scores)} fields")
    
    if not confidence_scores:
        return "admin_queue", "No confidence scores available"
    
    low_confidence_fields = []
    
    for field, confidence in confidence_scores.items():
        if confidence < CONFIDENCE_THRESHOLD:
            low_confidence_fields.append({
                "field": field,
                "confidence": confidence,
            })
    
    if not low_confidence_fields:
        return "auto_save", f"All fields meet {CONFIDENCE_THRESHOLD*100:.0f}% confidence threshold"
    else:
        fields_str = ", ".join([f"{f['field']} ({f['confidence']*100:.1f}%)" for f in low_confidence_fields])
        return "admin_queue", f"Low confidence in: {fields_str}"


# ============================================================================
# Phase 3 Routing (full decision table)
# ============================================================================

def get_tamper_category(tamper_score: float) -> str:
    """
    Categorize tamper score into Low/Medium/High
    
    Args:
        tamper_score: Tamper risk score (0-100)
        
    Returns:
        str: "low", "medium", or "high"
    """
    if tamper_score <= TAMPER_LOW_MAX:
        return "low"
    elif tamper_score <= TAMPER_MEDIUM_MAX:
        return "medium"
    else:
        return "high"


def route_document_v3(
    confidence_scores: Dict[str, float],
    tamper_score: float,
    fraud_alerts: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Phase 3 routing: Full decision table with tamper + fraud
    
    Decision Table:
    - OCR ≥90%, Tamper Low (0-30), No fraud → auto_save
    - Any OCR, Tamper Medium (31-70), Any fraud → admin_queue, tag "Forensic Review"
    - Any OCR, Tamper High (71-100), Any fraud → quarantine, block DB write
    - OCR <90%, Tamper Low (0-30), No fraud → admin_queue, tag "Low Confidence"
    
    Args:
        confidence_scores: OCR confidence scores per field
        tamper_score: Forensic tamper risk score (0-100)
        fraud_alerts: List of fraud alerts from fraud rule engine
        
    Returns:
        Dict with:
            - decision: "auto_save", "admin_queue", or "quarantine"
            - reason: Explanation
            - tags: List of tags (e.g., "Forensic Review", "Low Confidence")
            - blocked: Whether DB write should be blocked
    """
    logger.info(f"Starting Phase 3 routing: tamper_score={tamper_score:.2f}, fraud_alerts={len(fraud_alerts or [])}")
    
    fraud_alerts = fraud_alerts or []
    has_fraud = len(fraud_alerts) > 0
    
    # Determine OCR confidence status
    min_confidence = min(confidence_scores.values()) if confidence_scores else 0.0
    high_confidence = min_confidence >= CONFIDENCE_THRESHOLD
    
    # Determine tamper category
    tamper_category = get_tamper_category(tamper_score)
    
    # Apply decision table
    decision = None
    reason = ""
    tags = []
    blocked = False
    
    # Rule 1: High tamper (71-100) → quarantine, block DB write
    if tamper_category == "high":
        decision = "quarantine"
        reason = f"High tamper score ({tamper_score:.1f}). Document quarantined and blocked from DB write."
        tags.append("High Tamper Risk")
        tags.append("Quarantined")
        blocked = True
        
        if has_fraud:
            tags.append("Fraud Detected")
            fraud_types = [a.get('type') for a in fraud_alerts]
            reason += f" Fraud alerts: {', '.join(fraud_types)}"
    
    # Rule 2: Medium tamper (31-70) → admin_queue, tag "Forensic Review"
    elif tamper_category == "medium":
        decision = "admin_queue"
        reason = f"Medium tamper score ({tamper_score:.1f}). Requires forensic review."
        tags.append("Forensic Review")
        
        if has_fraud:
            tags.append("Fraud Detected")
            fraud_types = [a.get('type') for a in fraud_alerts]
            reason += f" Fraud alerts: {', '.join(fraud_types)}"
    
    # Rule 3: Low tamper (0-30) + fraud → admin_queue
    elif tamper_category == "low" and has_fraud:
        decision = "admin_queue"
        fraud_types = [a.get('type') for a in fraud_alerts]
        reason = f"Fraud alerts detected: {', '.join(fraud_types)}. Requires manual review."
        tags.append("Fraud Detected")
    
    # Rule 4: Low tamper (0-30) + no fraud + high confidence → auto_save
    elif tamper_category == "low" and not has_fraud and high_confidence:
        decision = "auto_save"
        reason = f"All checks passed: confidence ≥{CONFIDENCE_THRESHOLD*100:.0f}%, tamper score low ({tamper_score:.1f}), no fraud."
    
    # Rule 5: Low tamper (0-30) + no fraud + low confidence → admin_queue, tag "Low Confidence"
    elif tamper_category == "low" and not has_fraud and not high_confidence:
        decision = "admin_queue"
        reason = f"Low OCR confidence ({min_confidence*100:.1f}%). Requires manual review."
        tags.append("Low Confidence")
    
    # Fallback (shouldn't happen)
    else:
        decision = "admin_queue"
        reason = "Unclassified routing scenario. Defaulting to admin queue."
        tags.append("Unclassified")
    
    result = {
        "decision": decision,
        "reason": reason,
        "tags": tags,
        "blocked": blocked,
        "tamper_category": tamper_category,
        "tamper_score": tamper_score,
        "min_confidence": min_confidence,
        "fraud_alert_count": len(fraud_alerts),
        "fraud_types": [a.get('type') for a in fraud_alerts]
    }
    
    logger.info(f"Phase 3 routing completed: decision={decision}, tags={tags}")
    
    return result


# ============================================================================
# Backward-compatible wrapper
# ============================================================================

def route_document(
    confidence_scores: Dict[str, float],
    tamper_score: float = 0.0,
    fraud_alerts: Optional[List[Dict[str, Any]]] = None
) -> Tuple[str, str]:
    """
    Backward-compatible routing function
    
    If tamper_score and fraud_alerts provided, uses Phase 3 logic.
    Otherwise, falls back to Phase 2 confidence-only logic.
    
    Args:
        confidence_scores: OCR confidence scores
        tamper_score: Optional tamper score (Phase 3)
        fraud_alerts: Optional fraud alerts (Phase 3)
        
    Returns:
        Tuple containing:
            - str: Decision
            - str: Reason
    """
    # If Phase 3 data provided, use new logic
    if tamper_score > 0 or fraud_alerts:
        result = route_document_v3(confidence_scores, tamper_score, fraud_alerts)
        return result["decision"], result["reason"]
    
    # Otherwise, use Phase 2 logic
    return route_by_confidence(confidence_scores)
