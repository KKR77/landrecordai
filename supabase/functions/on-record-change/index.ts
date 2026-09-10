/**
 * Supabase Edge Function: Record Change Handler
 * 
 * Triggered by: Database webhook on INSERT/UPDATE to records table
 * 
 * Handles:
 * 1. Owner notifications on record changes
 * 2. High-tamper alerts (quarantine → owner + admins)
 * 3. DILRMP sync for approved records
 * 
 * Fire-and-forget with retry queue:
 * - Never blocks the main save path
 * - Failures are logged and retried
 * - Deduplicates identical alerts
 * 
 * Environment Variables Required:
 * - AI_SERVICE_URL: URL of the AI microservice
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
 * - TWILIO_*: Twilio credentials (optional)
 * - WHATSAPP_*: WhatsApp credentials (optional)
 * - DILRMP_API_URL: DILRMP endpoint URL (stub for now)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const AI_SERVICE_URL = Deno.env.get("AI_SERVICE_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!AI_SERVICE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables");
}

interface WebhookPayload {
  type: string;
  record: {
    id: string;
    khasra_no: string;
    khata_no: string;
    owner_name: string;
    village: string;
    tehsil: string;
    district: string;
    status: string;
    created_by: string;
    created_at: string;
  };
  old_record?: any;
}

serve(async (req) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  
  console.log(`[${correlationId}] Record change webhook triggered`);

  try {
    const payload: WebhookPayload = await req.json();
    
    if (!['INSERT', 'UPDATE'].includes(payload.type)) {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = payload.record;
    const recordId = record.id;
    
    console.log(`[${correlationId}] Processing record_id=${recordId}, event=${payload.type}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ========================================================================
    // 1. Check for high-tamper quarantine (Phase 3 flow)
    // ========================================================================
    
    // Find associated upload with high tamper score
    const {  uploadData } = await supabase
      .from('uploads')
      .select('id, tamper_score, uploader_id')
      .eq('record_id', recordId)
      .single();

    const upload = uploadData as any;
    
    if (upload && upload.tamper_score && upload.tamper_score > 70) {
      console.log(`[${correlationId}] High tamper detected (${upload.tamper_score}), sending alerts`);
      
      // Get owner contact (from uploader profile)
      const {  profileData: uploaderProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', upload.uploader_id)
        .single();
      
      const ownerContact = (uploaderProfile as any)?.phone;
      
      if (ownerContact) {
        // Get all admins/tehsildars in this tehsil
        const {  adminProfiles } = await supabase
          .from('profiles')
          .select('phone')
          .in('role', ['admin', 'tehsildar'])
          .or(`tehsil_scope.eq.${record.tehsil},tehsil_scope.is.null`);
        
        const adminContacts = (adminProfiles as any[])
          ?.map(p => p.phone)
          .filter(Boolean) || [];
        
        // Send high-tamper alert via AI service
        await fetch(`${AI_SERVICE_URL}/send-high-tamper-alert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_id: recordId,
            owner_contact: ownerContact,
            admin_contacts: adminContacts,
            tamper_score: upload.tamper_score,
            correlation_id: correlationId,
          }),
        });
        
        console.log(`[${correlationId}] High-tamper alerts sent`);
      }
    }

    // ========================================================================
    // 2. Send owner notification (deduplicated)
    // ========================================================================
    
    // Check for duplicate notification in last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const {  existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('record_id', recordId)
      .eq('payload->>event_type', 'record_updated')
      .gte('created_at', thirtyMinutesAgo)
      .maybeSingle();
    
    if (!existingNotif) {
      // Get owner contact
      const {  profileData: uploaderProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', record.created_by)
        .single();
      
      const ownerContact = (uploaderProfile as any)?.phone;
      
      if (ownerContact) {
        // Create notification record
        await supabase.from('notifications').insert({
          owner_contact: ownerContact,
          record_id: recordId,
          channel: 'sms',
          payload: {
            event_type: 'record_updated',
            message: `Your land record (Khasra #${record.khasra_no}) has been updated. Status: ${record.status}`,
            metadata: {
              khasra_no: record.khasra_no,
              status: record.status,
            }
          },
          status: 'pending',
        });
        
        console.log(`[${correlationId}] Owner notification queued`);
      }
    } else {
      console.log(`[${correlationId}] Duplicate notification skipped`);
    }

    // ========================================================================
    // 3. DILRMP sync (only for approved records)
    // ========================================================================
    
    if (record.status === 'approved') {
      console.log(`[${correlationId}] Record approved, triggering DILRMP sync`);
      
      // Create sync_log entry
      const {  syncEntry } = await supabase
        .from('sync_log')
        .insert({
          record_id: recordId,
          target: 'dilrmp',
          status: 'pending',
          payload: record,
          retry_count: 0,
        })
        .select()
        .single();
      
      // Trigger sync via AI service (fire-and-forget)
      fetch(`${AI_SERVICE_URL}/sync-to-dilrmp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record: record,
          sync_log_id: (syncEntry as any)?.id,
          correlation_id: correlationId,
        }),
      }).catch(err => {
        console.error(`[${correlationId}] DILRMP sync trigger failed:`, err);
      });
      
      console.log(`[${correlationId}] DILRMP sync queued`);
    }

    return new Response(
      JSON.stringify({
        status: "processed",
        correlation_id: correlationId,
        processing_time_ms: Date.now() - startTime,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error(`[${correlationId}] Error: ${error.message}`);
    
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        correlation_id: correlationId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
