-- Phase 3: Fraud Rule SQL Functions
-- These run at the DB layer so they can't be bypassed by direct DB writes

-- ============================================================================
-- 1. Math-Mismatch Guard: Area Sum Validation
-- ============================================================================
-- Sums declared sub-Khasra areas for a village and compares to parent plot

CREATE OR REPLACE FUNCTION public.check_area_consistency(
  p_village TEXT,
  p_tehsil TEXT,
  p_district TEXT
)
RETURNS TABLE (
  is_consistent BOOLEAN,
  declared_total NUMERIC,
  sum_of_parts NUMERIC,
  difference NUMERIC,
  details JSONB
) AS $$
BEGIN
  -- Sum all records for this village
  SELECT 
    COALESCE(SUM(area_declared), 0) INTO sum_of_parts
  FROM public.records
  WHERE village = p_village
    AND tehsil = p_tehsil
    AND district = p_district
    AND status != 'archived';
  
  -- For now, we just return the sum
  -- In a full implementation, this would compare against a parent plot's registered area
  -- stored in a separate cadastral registry table
  
  RETURN QUERY
  SELECT 
    TRUE AS is_consistent,  -- Placeholder: actual check requires parent plot reference
    0::NUMERIC AS declared_total,
    sum_of_parts,
    0::NUMERIC AS difference,
    jsonb_build_object(
      'village', p_village,
      'tehsil', p_tehsil,
      'district', p_district,
      'sum_of_parts', sum_of_parts,
      'note', 'Parent plot reference not yet implemented'
    ) AS details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Spatial Overlap Guard
-- ============================================================================
-- Checks if new plot's geometry overlaps with existing plots in same village

CREATE OR REPLACE FUNCTION public.check_spatial_overlap(
  p_geom geometry,
  p_village TEXT,
  p_tehsil TEXT,
  p_district TEXT,
  p_exclude_record_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_overlap BOOLEAN,
  overlapping_record_ids UUID[],
  overlap_areas NUMERIC[],
  details JSONB
) AS $$
DECLARE
  v_overlap_ids UUID[];
  v_overlap_areas NUMERIC[];
  v_rec RECORD;
BEGIN
  v_overlap_ids := ARRAY[]::UUID[];
  v_overlap_areas := ARRAY[]::NUMERIC[];
  
  -- Find overlapping records in same village
  FOR v_rec IN
    SELECT 
      r.id,
      ST_Area(
        ST_Intersection(r.geom, p_geom)::geometry
      ) AS overlap_area
    FROM public.records r
    WHERE r.village = p_village
      AND r.tehsil = p_tehsil
      AND r.district = p_district
      AND r.id != COALESCE(p_exclude_record_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND r.geom IS NOT NULL
      AND p_geom IS NOT NULL
      AND (
        ST_Overlaps(r.geom, p_geom) 
        OR ST_Intersects(r.geom, p_geom)
      )
  LOOP
    v_overlap_ids := array_append(v_overlap_ids, v_rec.id);
    v_overlap_areas := array_append(v_overlap_areas, v_rec.overlap_area);
  END LOOP;
  
  RETURN QUERY
  SELECT 
    (array_length(v_overlap_ids, 1) > 0) AS has_overlap,
    v_overlap_ids AS overlapping_record_ids,
    v_overlap_areas AS overlap_areas,
    jsonb_build_object(
      'village', p_village,
      'overlapping_count', array_length(v_overlap_ids, 1),
      'overlapping_ids', v_overlap_ids,
      'overlap_areas', v_overlap_areas
    ) AS details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Duplicate Detection (Exact Field Hash)
-- ============================================================================
-- Checks for exact duplicates based on owner+khasra+village

CREATE OR REPLACE FUNCTION public.check_exact_duplicate(
  p_owner_name TEXT,
  p_khasra_no TEXT,
  p_village TEXT,
  p_tehsil TEXT,
  p_district TEXT,
  p_exclude_record_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  duplicate_record_ids UUID[],
  details JSONB
) AS $$
DECLARE
  v_dup_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(r.id) INTO v_dup_ids
  FROM public.records r
  WHERE r.owner_name = p_owner_name
    AND r.khasra_no = p_khasra_no
    AND r.village = p_village
    AND r.tehsil = p_tehsil
    AND r.district = p_district
    AND r.id != COALESCE(p_exclude_record_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND r.status != 'archived';
  
  RETURN QUERY
  SELECT 
    (v_dup_ids IS NOT NULL AND array_length(v_dup_ids, 1) > 0) AS is_duplicate,
    COALESCE(v_dup_ids, ARRAY[]::UUID[]) AS duplicate_record_ids,
    jsonb_build_object(
      'owner_name', p_owner_name,
      'khasra_no', p_khasra_no,
      'village', p_village,
      'duplicate_count', COALESCE(array_length(v_dup_ids, 1), 0),
      'duplicate_ids', COALESCE(v_dup_ids, ARRAY[]::UUID[])
    ) AS details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Quarantine Enforcement Trigger
-- ============================================================================
-- Blocks DB writes if tamper_score > 70 (High risk)
-- This is DB-level enforcement - can't be bypassed by Edge Function bugs

CREATE OR REPLACE FUNCTION public.enforce_quarantine_on_high_tamper()
RETURNS TRIGGER AS $$
BEGIN
  -- If tamper_score > 70, force status to quarantine
  IF NEW.tamper_score IS NOT NULL AND NEW.tamper_score > 70 THEN
    IF NEW.status NOT IN ('quarantine', 'failed') THEN
      RAISE WARNING 'High tamper score (%) detected. Forcing quarantine status.', NEW.tamper_score;
      NEW.status := 'quarantine';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_quarantine_trigger ON public.uploads;
CREATE TRIGGER enforce_quarantine_trigger
  BEFORE INSERT OR UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quarantine_on_high_tamper();

-- ============================================================================
-- 5. Quarantine Enforcement for Records Table
-- ============================================================================
-- Blocks record creation if the associated upload has high tamper score

CREATE OR REPLACE FUNCTION public.block_record_if_upload_quarantined()
RETURNS TRIGGER AS $$
DECLARE
  v_upload_tamper NUMERIC;
  v_upload_status TEXT;
BEGIN
  -- This trigger fires on records INSERT
  -- We check if there's a linked upload with high tamper score
  -- Note: In practice, the Edge Function should not create records for quarantined uploads
  -- This is a safety net
  
  -- For now, we just log - actual blocking requires upload_id linkage
  -- which isn't in the records table schema
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger is a placeholder. Full implementation requires
-- adding upload_id to records table or using a different mechanism.

COMMENT ON FUNCTION public.enforce_quarantine_on_high_tamper() IS 
  'DB-level enforcement: forces quarantine status when tamper_score > 70';
