-- Phase 6: AI Record Assistant - Structured Query Parser
-- FALLBACK IMPLEMENTATION: Pattern-based query parsing
-- This is NOT semantic search - it's a structured filter extractor
-- Clearly labeled as such in the UI

-- ============================================================================
-- Structured Query Parser Function
-- ============================================================================
-- Extracts filters from natural language queries using pattern matching
-- Maps to SQL WHERE clauses with RLS enforcement

CREATE OR REPLACE FUNCTION public.parse_and_search_records(
  p_query TEXT,
  p_viewer_id UUID,
  p_viewer_role TEXT,
  p_viewer_tehsil_scope TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  khasra_no TEXT,
  khata_no TEXT,
  owner_name TEXT,
  village TEXT,
  tehsil TEXT,
  district TEXT,
  area_declared NUMERIC,
  land_class TEXT,
  status TEXT,
  match_reason TEXT
) AS $$
DECLARE
  v_where_clauses TEXT[] := ARRAY[]::TEXT[];
  v_match_reasons TEXT[] := ARRAY[]::TEXT[];
  v_query_lower TEXT;
  v_pattern TEXT;
  v_value TEXT;
BEGIN
  v_query_lower := LOWER(p_query);
  
  -- ========================================================================
  -- Pattern 1: Village name extraction
  -- Matches: "in village X", "village X", "at X"
  -- ========================================================================
  IF v_query_lower ~ '(?:in village|village|at)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and)|$)' THEN
    v_value := (regexp_matches(v_query_lower, '(?:in village|village|at)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and)|$)'))[1];
    v_value := TRIM(v_value);
    IF LENGTH(v_value) > 0 THEN
      v_where_clauses := array_append(v_where_clauses, format('LOWER(r.village) LIKE LOWER(%L)', '%' || v_value || '%'));
      v_match_reasons := array_append(v_match_reasons, format('Village matches "%s"', v_value));
    END IF;
  END IF;
  
  -- ========================================================================
  -- Pattern 2: Tehsil name extraction
  -- Matches: "in tehsil X", "tehsil X"
  -- ========================================================================
  IF v_query_lower ~ '(?:in tehsil|tehsil)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and|village)|$)' THEN
    v_value := (regexp_matches(v_query_lower, '(?:in tehsil|tehsil)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and|village)|$)'))[1];
    v_value := TRIM(v_value);
    IF LENGTH(v_value) > 0 THEN
      v_where_clauses := array_append(v_where_clauses, format('LOWER(r.tehsil) LIKE LOWER(%L)', '%' || v_value || '%'));
      v_match_reasons := array_append(v_match_reasons, format('Tehsil matches "%s"', v_value));
    END IF;
  END IF;
  
  -- ========================================================================
  -- Pattern 3: District name extraction
  -- Matches: "in district X", "district X"
  -- ========================================================================
  IF v_query_lower ~ '(?:in district|district)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and|tehsil|village)|$)' THEN
    v_value := (regexp_matches(v_query_lower, '(?:in district|district)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and|tehsil|village)|$)'))[1];
    v_value := TRIM(v_value);
    IF LENGTH(v_value) > 0 THEN
      v_where_clauses := array_append(v_where_clauses, format('LOWER(r.district) LIKE LOWER(%L)', '%' || v_value || '%'));
      v_match_reasons := array_append(v_match_reasons, format('District matches "%s"', v_value));
    END IF;
  END IF;
  
  -- ========================================================================
  -- Pattern 4: Khasra number extraction
  -- Matches: "khasra 123", "khasra number 123", "khasra no 123"
  -- ========================================================================
  IF v_query_lower ~ 'khasra(?:\s+(?:number|no))?\s+(\d+)' THEN
    v_value := (regexp_matches(v_query_lower, 'khasra(?:\s+(?:number|no))?\s+(\d+)'))[1];
    IF LENGTH(v_value) > 0 THEN
      v_where_clauses := array_append(v_where_clauses, format('r.khasra_no = %L', v_value));
      v_match_reasons := array_append(v_match_reasons, format('Khasra number is %s', v_value));
    END IF;
  END IF;
  
  -- ========================================================================
  -- Pattern 5: Khata number extraction
  -- Matches: "khata 456", "khata number 456"
  -- ========================================================================
  IF v_query_lower ~ 'khata(?:\s+(?:number|no))?\s+(\d+)' THEN
    v_value := (regexp_matches(v_query_lower, 'khata(?:\s+(?:number|no))?\s+(\d+)'))[1];
    IF LENGTH(v_value) > 0 THEN
      v_where_clauses := array_append(v_where_clauses, format('r.khata_no = %L', v_value));
      v_match_reasons := array_append(v_match_reasons, format('Khata number is %s', v_value));
    END IF;
  END IF;
  
  -- ========================================================================
  -- Pattern 6: Owner name extraction
  -- Matches: "owner X", "owned by X", "name X"
  -- ========================================================================
  IF v_query_lower ~ '(?:owner|owned by|name)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and|in|at)|$)' THEN
    v_value := (regexp_matches(v_query_lower, '(?:owner|owned by|name)\s+([a-z\s]+?)(?:\s+(?:with|having|where|status|and|in|at)|$)'))[1];
    v_value := TRIM(v_value);
    IF LENGTH(v_value) > 2 THEN
      v_where_clauses := array_append(v_where_clauses, format('LOWER(r.owner_name) LIKE LOWER(%L)', '%' || v_value || '%'));
      v_match_reasons := array_append(v_match_reasons, format('Owner name matches "%s"', v_value));
    END IF;
  END IF;
  
  -- ========================================================================
  -- Pattern 7: Status extraction
  -- Matches: "disputed", "verified", "draft", "pending"
  -- ========================================================================
  IF v_query_lower ~ '\b(disputed|verified|draft|pending|archived)\b' THEN
    v_value := (regexp_matches(v_query_lower, '\b(disputed|verified|draft|pending|archived)\b'))[1];
    v_where_clauses := array_append(v_where_clauses, format('r.status = %L', v_value));
    v_match_reasons := array_append(v_match_reasons, format('Status is %s', v_value));
  END IF;
  
  -- ========================================================================
  -- Pattern 8: Area range extraction
  -- Matches: "area > 5", "area between 2 and 10", "more than 5 acres"
  -- ========================================================================
  IF v_query_lower ~ 'area\s*(?:>|greater|more than|above)\s*(\d+(?:\.\d+)?)' THEN
    v_value := (regexp_matches(v_query_lower, 'area\s*(?:>|greater|more than|above)\s*(\d+(?:\.\d+)?)'))[1];
    v_where_clauses := array_append(v_where_clauses, format('r.area_declared > %L', v_value));
    v_match_reasons := array_append(v_match_reasons, format('Area > %s acres', v_value));
  ELSIF v_query_lower ~ 'area\s*(?:<|less than|below|under)\s*(\d+(?:\.\d+)?)' THEN
    v_value := (regexp_matches(v_query_lower, 'area\s*(?:<|less than|below|under)\s*(\d+(?:\.\d+)?)'))[1];
    v_where_clauses := array_append(v_where_clauses, format('r.area_declared < %L', v_value));
    v_match_reasons := array_append(v_match_reasons, format('Area < %s acres', v_value));
  ELSIF v_query_lower ~ 'area\s*(?:between|from)\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*(\d+(?:\.\d+)?)' THEN
    v_value := (regexp_matches(v_query_lower, 'area\s*(?:between|from)\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*(\d+(?:\.\d+)?)'))[1];
    DECLARE
      v_min TEXT;
      v_max TEXT;
    BEGIN
      v_min := (regexp_matches(v_query_lower, 'area\s*(?:between|from)\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*(\d+(?:\.\d+)?)'))[1];
      v_max := (regexp_matches(v_query_lower, 'area\s*(?:between|from)\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*(\d+(?:\.\d+)?)'))[2];
      v_where_clauses := array_append(v_where_clauses, format('r.area_declared BETWEEN %L AND %L', v_min, v_max));
      v_match_reasons := array_append(v_match_reasons, format('Area between %s and %s acres', v_min, v_max));
    END;
  END IF;
  
  -- ========================================================================
  -- Pattern 9: Land class extraction
  -- Matches: "agricultural land", "residential", "commercial"
  -- ========================================================================
  IF v_query_lower ~ '\b(agricultural|residential|commercial|industrial|vacant)\s+(?:land|plot)?\b' THEN
    v_value := (regexp_matches(v_query_lower, '\b(agricultural|residential|commercial|industrial|vacant)\s+(?:land|plot)?\b'))[1];
    v_where_clauses := array_append(v_where_clauses, format('LOWER(r.land_class) LIKE LOWER(%L)', '%' || v_value || '%'));
    v_match_reasons := array_append(v_match_reasons, format('Land class is %s', v_value));
  END IF;
  
  -- ========================================================================
  -- Build and execute query
  -- ========================================================================
  
  -- If no filters extracted, return empty result with explanation
  IF array_length(v_where_clauses, 1) IS NULL THEN
    RETURN QUERY
    SELECT 
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      NULL::TEXT, NULL::NUMERIC, NULL::TEXT, NULL::TEXT,
      'No filters could be extracted from query. Try: "disputed records in village Rampur" or "agricultural land in tehsil Sadar with area > 5"'::TEXT;
    RETURN;
  END IF;
  
  -- Build WHERE clause
  DECLARE
    v_where_sql TEXT;
    v_query_sql TEXT;
  BEGIN
    v_where_sql := array_to_string(v_where_clauses, ' AND ');
    
    -- Add RLS enforcement
    IF p_viewer_role != 'admin' AND p_viewer_tehsil_scope IS NOT NULL THEN
      v_where_sql := v_where_sql || format(' AND r.tehsil = %L', p_viewer_tehsil_scope);
    END IF;
    
    v_query_sql := format(
      'SELECT r.id, r.khasra_no, r.khata_no, r.owner_name, r.village, r.tehsil, r.district, r.area_declared, r.land_class, r.status, %L::TEXT AS match_reason
       FROM public.records r
       WHERE %s
       ORDER BY r.created_at DESC
       LIMIT %L',
      array_to_string(v_match_reasons, '; '),
      v_where_sql,
      p_limit
    );
    
    RETURN QUERY EXECUTE v_query_sql;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.parse_and_search_records IS 
  'FALLBACK: Structured query parser using pattern matching. NOT semantic search. Extracts filters (village, tehsil, status, area, etc.) from natural language and maps to SQL WHERE clauses. Clearly labeled as fallback in UI.';
