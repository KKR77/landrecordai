/**
 * Supabase Edge Function: Process Upload
 * 
 * Triggered by: Database webhook on INSERT to uploads table
 * 
 * Flow:
 * 1. Receive upload_id from webhook payload
 * 2. Fetch upload record from database
 * 3. Download image from Supabase Storage
 * 4. Call AI service /pipeline endpoint
 * 5. Based on decision:
 *    - auto_save: Create record in records table
 *    - admin_queue: Update uploads.status = 'admin_queue' with extracted data
 *    - failed: Update uploads.status = 'failed' with error
 * 6. Log all stages with correlation_id
 * 
 * Environment Variables Required:
 * - AI_SERVICE_URL: URL of the AI microservice
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database operations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const AI_SERVICE_URL = Deno.env.get("AI_SERVICE_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Validate environment variables
if (!AI_SERVICE_URL) {
  throw new Error("Missing AI_SERVICE_URL environment variable");
}
if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
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
  stage_timings: Record<string, number>;
  error?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  
  console.log(`[${correlationId}] Processing upload webhook`);

  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    
    if (payload.type !== "INSERT") {
      console.log(`[${correlationId}] Ignoring non-INSERT event: ${payload.type}`);
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const upload = payload.record;
    const uploadId = upload.id;
    
    console.log(`[${correlationId}] Processing upload_id=${uploadId}`);

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update status to processing
    await supabase
      .from("uploads")
      .update({ status: "processing" })
      .eq("id", uploadId);

    // Download image from Storage
    console.log(`[${correlationId}] Downloading image from storage: ${upload.storage_path}`);
    const { data: imageData, error: downloadError } = await supabase.storage
      .from("document-scans")
      .download(upload.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`);
    }

    // Convert to base64
    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );
    const imageBase64WithDataUrl = `data:image/png;base64,${imageBase64}`;

    console.log(`[${correlationId}] Image downloaded and encoded`);

    // Call AI service pipeline
    console.log(`[${correlationId}] Calling AI service pipeline`);
    const pipelineResponse = await fetch(`${AI_SERVICE_URL}/pipeline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_base64: imageBase64WithDataUrl,
        upload_id: uploadId,
        languages: ["hin", "eng"],
      }),
    });

    if (!pipelineResponse.ok) {
      throw new Error(`AI service returned ${pipelineResponse.status}`);
    }

    const pipelineResult: PipelineResponse = await pipelineResponse.json();
    
    console.log(`[${correlationId}] Pipeline completed: decision=${pipelineResult.decision}`);

    // Handle pipeline result
    if (!pipelineResult.success) {
      // Pipeline failed
      await supabase
        .from("uploads")
        .update({
          status: "failed",
          ocr_confidence: { error: pipelineResult.error },
        })
        .eq("id", uploadId);

      console.error(`[${correlationId}] Pipeline failed: ${pipelineResult.error}`);
      
      return new Response(
        JSON.stringify({
          status: "failed",
          error: pipelineResult.error,
          correlation_id: correlationId,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update uploads with OCR confidence and tamper score
    await supabase
      .from("uploads")
      .update({
        ocr_confidence: pipelineResult.confidence_scores,
        tamper_score: 0, // Phase 3 will add actual tamper detection
      })
      .eq("id", uploadId);

    // Route based on decision
    if (pipelineResult.decision === "auto_save") {
      // Create record in records table
      console.log(`[${correlationId}] Auto-saving to records table`);

      const extractedData = pipelineResult.extracted_data!;

      const { data: record, error: insertError } = await supabase
        .from("records")
        .insert({
          khasra_no: extractedData.khasra_no!,
          khata_no: extractedData.khata_no!,
          owner_name: extractedData.owner_name!,
          village: extractedData.village!,
          tehsil: extractedData.tehsil!,
          district: extractedData.district!,
          area_declared: extractedData.area_declared || null,
          land_class: extractedData.land_class || null,
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
        field_diffs: extractedData,
        source: "ocr",
        tamper_score: 0,
        ocr_confidence: pipelineResult.confidence_scores,
        created_by: upload.uploader_id,
      });

      console.log(`[${correlationId}] Record created: ${record.id}`);

      return new Response(
        JSON.stringify({
          status: "auto_saved",
          record_id: record.id,
          correlation_id: correlationId,
          stage_timings: pipelineResult.stage_timings,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
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

      // Store extracted data for admin review
      // In Phase 3, this will be shown in the admin dashboard
      await supabase.from("record_versions").insert({
        record_id: null, // No record yet
        field_diffs: pipelineResult.extracted_data,
        source: "ocr",
        tamper_score: 0,
        ocr_confidence: pipelineResult.confidence_scores,
        created_by: upload.uploader_id,
      });

      return new Response(
        JSON.stringify({
          status: "admin_queue",
          correlation_id: correlationId,
          stage_timings: pipelineResult.stage_timings,
          confidence_scores: pipelineResult.confidence_scores,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error(`[${correlationId}] Error: ${error.message}`);

    // Try to update upload status to failed
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
