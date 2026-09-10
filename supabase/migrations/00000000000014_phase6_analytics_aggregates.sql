-- Phase 6: Analytics Dashboard Server-Side Aggregates
-- All aggregation happens in Postgres, never client-side

-- ============================================================================
-- 1. Upload Statistics (docs processed)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_upload_stats(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT
)
RETURNS TABLE (
  total_uploads BIGINT,
  today_uploads BIGINT,
  week_uploads BIGINT,
  avg_processing_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_uploads,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT AS today_uploads,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT AS week_uploads,
    COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))), 0)::NUMERIC AS avg_processing_time
  FROM public.uploads u
  WHERE 
    -- RLS: respect tehsil_scope
    (p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR 
     EXISTS (
       SELECT 1 FROM public.records r 
       WHERE r.id = u.record_id 
       AND (p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope)
     ) OR u.record_id IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. OCR Correction Rate (proxy for accuracy)
-- ============================================================================
-- Uses admin corrections as proxy: higher correction volume = lower OCR accuracy
-- Clearly labeled as approximation in UI

CREATE OR REPLACE FUNCTION public.get_ocr_correction_rate(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_processed BIGINT,
  admin_corrections BIGINT,
  correction_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(rv.created_at) AS date,
      COUNT(*) FILTER (WHERE rv.source != 'admin')::BIGINT AS total_processed,
      COUNT(*) FILTER (WHERE rv.source = 'admin')::BIGINT AS admin_corrections
    FROM public.record_versions rv
    JOIN public.records r ON r.id = rv.record_id
    WHERE rv.created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
      -- RLS: respect tehsil_scope
      AND (p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope)
    GROUP BY DATE(rv.created_at)
  )
  SELECT 
    ds.date,
    ds.total_processed,
    ds.admin_corrections,
    CASE 
      WHEN ds.total_processed > 0 
      THEN ROUND((ds.admin_corrections::NUMERIC / ds.total_processed) * 100, 2)
      ELSE 0 
    END AS correction_rate
  FROM daily_stats ds
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Queue Breakdown by Tag
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_queue_breakdown(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT
)
RETURNS TABLE (
  tag TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN status = 'quarantine' THEN 'Quarantine'
      WHEN tamper_score >= 31 AND tamper_score <= 70 THEN 'Forensic Review'
      WHEN tamper_score < 31 THEN 'Low Confidence'
      ELSE 'Other'
    END AS tag,
    COUNT(*)::BIGINT AS count
  FROM public.uploads
  WHERE status IN ('admin_queue', 'quarantine')
    -- RLS: respect tehsil_scope
    AND (p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR 
         EXISTS (
           SELECT 1 FROM public.records r 
           WHERE r.id = uploads.record_id 
           AND (p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope)
         ) OR uploads.record_id IS NULL
    )
  GROUP BY tag
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Tehsil-wise Digitisation Progress
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tehsil_progress(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT
)
RETURNS TABLE (
  tehsil_name TEXT,
  district_name TEXT,
  total_records BIGINT,
  verified_records BIGINT,
  pending_records BIGINT,
  progress_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.tehsil AS tehsil_name,
    r.district AS district_name,
    COUNT(*)::BIGINT AS total_records,
    COUNT(*) FILTER (WHERE r.status = 'verified')::BIGINT AS verified_records,
    COUNT(*) FILTER (WHERE r.status IN ('draft', 'disputed'))::BIGINT AS pending_records,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE r.status = 'verified')::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0 
    END AS progress_percent
  FROM public.records r
  -- RLS: respect tehsil_scope
  WHERE p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope
  GROUP BY r.tehsil, r.district
  ORDER BY total_records DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Fraud Alert Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fraud_summary(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT
)
RETURNS TABLE (
  alert_type TEXT,
  severity TEXT,
  total_count BIGINT,
  resolved_count BIGINT,
  unresolved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.type::TEXT AS alert_type,
    fa.severity::TEXT AS severity,
    COUNT(*)::BIGINT AS total_count,
    COUNT(*) FILTER (WHERE fa.resolved = TRUE)::BIGINT AS resolved_count,
    COUNT(*) FILTER (WHERE fa.resolved = FALSE)::BIGINT AS unresolved_count
  FROM public.fraud_alerts fa
  JOIN public.records r ON r.id = fa.record_id
  -- RLS: respect tehsil_scope
  WHERE p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope
  GROUP BY fa.type, fa.severity
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Notification/Sync Status Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_notification_summary(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.status::TEXT AS status,
    COUNT(*)::BIGINT AS count
  FROM public.notifications n
  LEFT JOIN public.records r ON r.id = n.record_id
  -- RLS: respect tehsil_scope
  WHERE p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope OR n.record_id IS NULL
  GROUP BY n.status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_sync_summary(
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT
)
RETURNS TABLE (
  target TEXT,
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.target::TEXT AS target,
    sl.status::TEXT AS status,
    COUNT(*)::BIGINT AS count
  FROM public.sync_log sl
  JOIN public.records r ON r.id = sl.record_id
  -- RLS: respect tehsil_scope
  WHERE p_viewer_role = 'admin' OR p_viewer_tehsil_scope IS NULL OR r.tehsil = p_viewer_tehsil_scope
  GROUP BY sl.target, sl.status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_ocr_correction_rate IS 
  'Approximation: Uses admin correction volume as proxy for OCR accuracy. Higher correction rate = lower OCR accuracy. Not a precise ground-truth metric.';
