"""
Notification Adapter — Phase 5

Abstracts notification sending behind a simple interface.
Supports SMS (Twilio) and WhatsApp (Meta Business API).
Provider can be swapped without touching call sites.

All sends are fire-and-forget with retry logic.
Never blocks the main save path.

Author: PS 26018
Version: 5.0.0
"""

import os
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import httpx

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration (from environment variables)
# ============================================================================

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")

WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")


# ============================================================================
# Notification Types
# ============================================================================

class NotificationPayload:
    """Standardized notification payload"""
    
    def __init__(
        self,
        record_id: str,
        event_type: str,  # 'upload_complete', 'tamper_detected', 'record_updated', etc.
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.record_id = record_id
        self.event_type = event_type
        self.message = message
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "event_type": self.event_type,
            "message": self.message,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
        }


# ============================================================================
# SMS Provider (Twilio)
# ============================================================================

async def send_sms_twilio(
    to: str,
    payload: NotificationPayload
) -> Tuple[bool, Optional[str]]:
    """
    Send SMS via Twilio
    
    Args:
        to: Phone number (E.164 format)
        payload: NotificationPayload object
        
    Returns:
        Tuple[bool, Optional[str]]: (success, error_message)
    """
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]):
        logger.error("Twilio credentials not configured")
        return False, "Twilio credentials not configured"
    
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                data={
                    "From": TWILIO_FROM_NUMBER,
                    "To": to,
                    "Body": payload.message,
                },
                timeout=10.0
            )
            
            if response.status_code == 201:
                logger.info(f"SMS sent successfully to {to}")
                return True, None
            else:
                error_msg = f"Twilio API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return False, error_msg
                
    except httpx.TimeoutException:
        error_msg = "Twilio API timeout"
        logger.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


# ============================================================================
# WhatsApp Provider (Meta Business API)
# ============================================================================

async def send_whatsapp_meta(
    to: str,
    payload: NotificationPayload
) -> Tuple[bool, Optional[str]]:
    """
    Send WhatsApp message via Meta Business API
    
    Args:
        to: Phone number (E.164 format)
        payload: NotificationPayload object
        
    Returns:
        Tuple[bool, Optional[str]]: (success, error_message)
    """
    if not all([WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID]):
        logger.error("WhatsApp credentials not configured")
        return False, "WhatsApp credentials not configured"
    
    try:
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        
        data = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "body": payload.message
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json=data,
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"WhatsApp message sent successfully to {to}")
                return True, None
            else:
                error_msg = f"WhatsApp API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return False, error_msg
                
    except httpx.TimeoutException:
        error_msg = "WhatsApp API timeout"
        logger.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


# ============================================================================
# Unified Adapter
# ============================================================================

async def send_notification(
    channel: str,
    contact: str,
    payload: NotificationPayload
) -> Tuple[bool, Optional[str]]:
    """
    Send notification via specified channel
    
    This is the main entry point. Provider can be swapped by changing
    the implementation here without touching call sites.
    
    Args:
        channel: 'sms' or 'whatsapp'
        contact: Phone number or email
        payload: NotificationPayload object
        
    Returns:
        Tuple[bool, Optional[str]]: (success, error_message)
    """
    logger.info(f"Sending {channel} notification to {contact} for record {payload.record_id}")
    
    if channel == "sms":
        return await send_sms_twilio(contact, payload)
    elif channel == "whatsapp":
        return await send_whatsapp_meta(contact, payload)
    else:
        error_msg = f"Unsupported channel: {channel}"
        logger.error(error_msg)
        return False, error_msg


# ============================================================================
# Retry Logic
# ============================================================================

def calculate_next_retry(retry_count: int) -> datetime:
    """
    Calculate next retry time using exponential backoff
    
    Formula: base_delay * (2 ^ retry_count)
    Base delay: 60 seconds
    Max delay: 1 hour
    
    Args:
        retry_count: Current retry attempt number
        
    Returns:
        datetime: Next retry time
    """
    base_delay = 60  # seconds
    max_delay = 3600  # 1 hour
    
    delay = min(base_delay * (2 ** retry_count), max_delay)
    return datetime.utcnow() + timedelta(seconds=delay)


def should_retry(retry_count: int, max_retries: int = 3) -> bool:
    """
    Check if notification should be retried
    
    Args:
        retry_count: Current retry attempt number
        max_retries: Maximum retry attempts (default 3)
        
    Returns:
        bool: True if should retry, False otherwise
    """
    return retry_count < max_retries


# ============================================================================
# High-Tamper Alert (Owner + Admins)
# ============================================================================

async def send_high_tamper_alert(
    record_id: str,
    owner_contact: str,
    admin_contacts: list,
    tamper_score: float
) -> Dict[str, Any]:
    """
    Send high-tamper alert to owner AND all admins/tehsildars
    
    This is a special case from Phase 3 quarantine flow.
    Fires alerts to multiple recipients.
    
    Args:
        record_id: Record ID
        owner_contact: Owner's phone number
        admin_contacts: List of admin/tehsildar phone numbers
        tamper_score: Tamper risk score
        
    Returns:
        Dict with results for each recipient
    """
    logger.info(f"Sending high-tamper alert for record {record_id} (score: {tamper_score})")
    
    results = {
        "owner": {"contact": owner_contact, "success": False, "error": None},
        "admins": []
    }
    
    # Owner message
    owner_payload = NotificationPayload(
        record_id=record_id,
        event_type="tamper_detected",
        message=f"ALERT: Your land record (Khasra #{record_id[:8]}) has been flagged for potential tampering (risk score: {tamper_score:.0f}%). Please contact your local revenue office immediately.",
        metadata={"tamper_score": tamper_score}
    )
    
    # Send to owner (try both SMS and WhatsApp)
    owner_success, owner_error = await send_notification("sms", owner_contact, owner_payload)
    results["owner"]["success"] = owner_success
    results["owner"]["error"] = owner_error
    
    if not owner_success:
        # Fallback to WhatsApp
        owner_success, owner_error = await send_notification("whatsapp", owner_contact, owner_payload)
        results["owner"]["success"] = owner_success
        results["owner"]["error"] = owner_error
    
    # Admin message
    admin_payload = NotificationPayload(
        record_id=record_id,
        event_type="tamper_detected_admin",
        message=f"HIGH PRIORITY: Record {record_id[:8]} flagged with tamper score {tamper_score:.0f}%. Immediate review required.",
        metadata={"tamper_score": tamper_score, "owner_contact": owner_contact}
    )
    
    # Send to all admins
    for admin_contact in admin_contacts:
        admin_success, admin_error = await send_notification("sms", admin_contact, admin_payload)
        results["admins"].append({
            "contact": admin_contact,
            "success": admin_success,
            "error": admin_error
        })
    
    logger.info(f"High-tamper alert sent: owner={results['owner']['success']}, admins={sum(1 for a in results['admins'] if a['success'])}/{len(admin_contacts)}")
    
    return results
