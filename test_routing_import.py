#!/usr/bin/env python3
"""
Test script to verify routing.py imports correctly after the fix.
"""

import sys
import os

# Add ai-service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-service'))

try:
    print("Testing routing.py import...")
    from app.routing import route_document, route_document_v3, route_by_confidence
    print("✓ routing.py imported successfully")
    
    # Test basic functionality
    print("\nTesting route_by_confidence...")
    confidence_scores = {
        'owner_name': 0.95,
        'khasra_no': 0.92,
        'khata_no': 0.98
    }
    decision, reason = route_by_confidence(confidence_scores)
    print(f"✓ Decision: {decision}")
    print(f"  Reason: {reason}")
    
    print("\nTesting route_document_v3...")
    result = route_document_v3(
        confidence_scores=confidence_scores,
        tamper_score=15.0,
        fraud_alerts=[]
    )
    print(f"✓ Decision: {result['decision']}")
    print(f"  Reason: {result['reason']}")
    print(f"  Tags: {result['tags']}")
    print(f"  Blocked: {result['blocked']}")
    
    print("\n✅ All routing tests passed!")
    
except NameError as e:
    print(f"\n❌ NameError: {e}")
    print("The import bug is NOT fixed!")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
