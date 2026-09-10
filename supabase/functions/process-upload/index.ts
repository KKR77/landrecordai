/**
 * Supabase Edge Function: Process Upload (Phase 3)
 * 
 * Triggered by: Database webhook on INSERT to uploads table
 * 
 * Phase 3 Flow:
 * 1. Receive upload_id from webhook payload
 * 2. Fetch upload record + locked version metadata
 * 3. Download image from Supabase Storage
 * 4. Call AI service /pipeline (which runs OCR + forensic in parallel)
 * 5. Run fraud rule checks (via SQL functions)
 * 6. Apply Phase 3 routing table
 * 7. Write fraud_alerts if any rules fire
 * 8. Route to auto_save / admin_queue / quarantine
 * 9. Log all stages with correlation_id
 * 
 * Environment Variables Required:
 * - AI_SERVICE_URL: URL of the AI microservice
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
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
    storage_path: string;
    uploader_id: string;
    status: string;
    checksum: string;
    created_at: string;
  };
}

interface PipelineResponse {
  success: boolean;
  upload_id: string;
  correlation_id: string;
  decision: string;
  extracted_data?: {
    owner_name?: string;
    khasra_no?: string;
    khata_no?: string;
    area_declared?: number;
    village?: string;
    tehsil?: string;
    district?: string;
    land_class?: string;
  };
  confidence_scores?: Record<string, number>;
  tamper_score?: number;
  tamper_details?: Record<string, any>;
  routing_tags?: string[];
  stage_timings: Record<string, number>;
  error?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  
  console.log(`[${correlationId}] Processing upload webhook (Phase 3)`);

  try {
    const payload: WebhookPayload = await req.json();
    
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const upload = payload.record;
    const uploadId = upload.id;
    
    console.log(`[${correlationId}] Processing upload_id=${uploadId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update status to processing
    await supabase
      .from("uploads")
      .update({ status: "processing" })
      .eq("id", uploadId);

    // Download image from Storage
    console.log(`[${correlationId}] Downloading image`);
    const {  imageData, error: downloadError } = await supabase.storage
      .from("document-scans")
      .download(upload.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`);
    }

    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );
    const imageBase64WithDataUrl = `image/png;base64,${imageBase64}`;

    // Fetch locked version metadata (for forensic metadata diff)
    console.log(`[${correlationId}] Fetching locked version metadata`);
    let lockedVersionMetadata = null;
    
    // We'll try to find the last locked version by fetching record_versions
    // This requires knowing the record_id, which we don't have yet for new uploads
    // For now, we skip this - it will be implemented when we have a way to link
    // uploads to records before processing

    // Call AI service pipeline (runs OCR + forensic in parallel internally)
    console.log(`[${correlationId}] Calling AI service pipeline`);
    const pipelineResponse = await fetch(`${AI_SERVICE_URL}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: imageBase64WithDataUrl,
        upload_id: uploadId,
        languages: ["hin", "eng"],
        locked_version_metadata: lockedVersionMetadata,
      }),
    });

    if (!pipelineResponse.ok) {
      throw new Error(`AI service returned ${pipelineResponse.status}`);
    }

    const pipelineResult: PipelineResponse = await pipelineResponse.json();
    
    console.log(`[${correlationId}] Pipeline completed: decision=${pipelineResult.decision}, tamper_score=${pipelineResult.tamper_score}`);

    // Handle pipeline failure
    if (!pipelineResult.success) {
      await supabase
        .from("uploads")
        .update({
          status: "failed",
          ocr_confidence: { error: pipelineResult.error },
          tamper_score: pipelineResult.tamper_score || 0,
          tamper_details: pipelineResult.tamper_details || {},
        })
        .eq("id", uploadId);

      return new Response(
        JSON.stringify({
          status: "failed",
          error: pipelineResult.error,
          correlation_id: correlationId,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Update uploads with OCR confidence and tamper score
    await supabase
      .from("uploads")
      .update({
        ocr_confidence: pipelineResult.confidence_scores,
        tamper_score: pipelineResult.tamper_score || 0,
        tamper_details: pipelineResult.tamper_details || {},
      })
      .eq("id", uploadId);

    // Run fraud rule checks (if we have extracted data)
    let fraudAlerts: any[] = [];
    let fraudAlertIds: string[] = [];
    
    if (pipelineResult.extracted_data && pipelineResult.decision !== "failed") {
      console.log(`[${correlationId}] Running fraud rule checks`);
      
      const extracted = pipelineResult.extracted_data;
      
      // Check for exact duplicates via SQL function
      const {  dupResult } = await supabase.rpc('check_exact_duplicate', {
        p_owner_name: extracted.owner_name || '',
        p_khasra_no: extracted.khasra_no || '',
        p_village: extracted.village || '',
        p_tehsil: extracted.tehsil || '',
        p_district: extracted.district || '',
      });
      
      if (dupResult && dupResult.is_duplicate) {
        fraudAlerts.push({
          type: 'exact_duplicate',
          severity: 'critical',
          details: dupResult.details,
        });
      }
      
      // Write fraud alerts to database and store their IDs
      for (const alert of fraudAlerts) {
        const { data: insertedAlert, error: insertError } = await supabase
          .from("fraud_alerts")
          .insert({
            record_id: null, // Will be linked after record creation
            type: alert.type,
            severity: alert.severity,
            details: alert.details,
            resolved: false,
          })
          .select('id')
          .single();
        
        if (insertedAlert && !insertError) {
          fraudAlertIds.push(insertedAlert.id);
        }
      }
      
      console.log(`[${correlationId}] Fraud checks completed: ${fraudAlerts.length} alert(s), stored ${fraudAlertIds.length} IDs`);
    }

    // Apply Phase 3 routing decision
    const decision = pipelineResult.decision;
    const tags = pipelineResult.routing_tags || [];
    
    console.log(`[${correlationId}] Routing decision: ${decision}, tags: ${tags.join(', ')}`);

    // Handle routing
    if (decision === "quarantine") {
      // Quarantine: block DB write, flag for review
      console.log(`[${correlationId}] Quarantining document`);
      
      await supabase
        .from("uploads")
        .update({
          status: "quarantine",
        })
        .eq("id", uploadId);
      
      // Note: Alert wiring for owner+admin is Phase 5
      
      return new Response(
        JSON.stringify({
          status: "quarantined",
          correlation_id: correlationId,
          tags,
          stage_timings: pipelineResult.stage_timings,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
      
    } else if (decision === "auto_save") {
      // Auto-save: create record
      console.log(`[${correlationId}] Auto-saving to records table`);

      const extracted = pipelineResult.extracted_data!;

      const {  record, error: insertError } = await supabase
        .from("records")
        .insert({
          khasra_no: extracted.khasra_no!,
          khata_no: extracted.khata_no!,
          owner_name: extracted.owner_name!,
          village: extracted.village!,
          tehsil: extracted.tehsil!,
          district: extracted.district!,
          area_declared: extracted.area_declared || null,
          land_class: extracted.land_class || null,
          status: "draft",
          locked_fields: {},
          created_by: upload.uploader_id,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create record: ${insertError.message}`);
      }

      // Link upload to record
      await supabase
        .from("uploads")
        .update({
          status: "completed",
          record_id: record.id,
        })
        .eq("id", uploadId);

      // Create initial version
      await supabase.from("record_versions").insert({
        record_id: record.id,
        field_diffs: extracted,
        source: "ocr",
        tamper_score: pipelineResult.tamper_score || 0,
        ocr_confidence: pipelineResult.confidence_scores,
        created_by: upload.uploader_id,
      });

      // Link fraud alerts to record using stored IDs
      if (fraudAlertIds.length > 0) {
        await supabase
          .from("fraud_alerts")
          .update({ record_id: record.id })
          .in('id', fraudAlertIds);
        
        console.log(`[${correlationId}] Linked ${fraudAlertIds.length} fraud alerts to record ${record.id}`);
      }

      console.log(`[${correlationId}] Record created: ${record.id}`);

      return new Response(
        JSON.stringify({
          status: "auto_saved",
          record_id: record.id,
          correlation_id: correlationId,
          stage_timings: pipelineResult.stage_timings,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
      
    } else {
      // Admin queue
      console.log(`[${correlationId}] Routing to admin queue`);

      await supabase
        .from("uploads")
        .update({
          status: "admin_queue",
        })
        .eq("id", uploadId);

      return new Response(
        JSON.stringify({
          status: "admin_queue",
          correlation_id: correlationId,
          tags,
          stage_timings: pipelineResult.stage_timings,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    console.error(`[${correlationId}] Error: ${error.message}`);

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const payload: WebhookPayload = await req.clone().json();
      
      if (payload.record?.id) {
        await supabase
          .from("uploads")
          .update({
            status: "failed",
            ocr_confidence: { error: error.message },
          })
          .eq("id", payload.record.id);
      }
    } catch (updateError) {
      console.error(`[${correlationId}] Failed to update status: ${updateError.message}`);
    }

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
