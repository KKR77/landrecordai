-- RLS Policies for all tables
-- Deny-by-default approach with least-privilege access

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Patwaris and tehsildars can view profiles in their tehsil scope
CREATE POLICY "Officials can view profiles in their scope"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
        AND p1.role IN ('patwari', 'tehsildar')
        AND (p1.tehsil_scope IS NULL OR p1.tehsil_scope = public.profiles.tehsil_scope)
    )
  );

-- Only admins can insert profiles (role assignment restricted)
CREATE POLICY "Only admins can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent self-role escalation
    (OLD.role = NEW.role OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- RECORDS TABLE POLICIES
-- ============================================================================

-- SECURITY NOTE: This policy was DROPPED in migration 00000000000016
-- because USIN (true) granted anon SELECT on the base records table,
-- allowing unmasked access to owner_name and locked_fields.
-- Anon users should ONLY access the records_public view (masked).
-- See migration 00000000000016_phase7_security_fix_anon_records.sql

-- Create a view for anonymous users with masked data
CREATE OR REPLACE VIEW public.records_public AS
SELECT
  id,
  khasra_no,
  khata_no,
  'REDACTED' AS owner_name,
  village,
  tehsil,
  district,
  area_declared,
  land_class,
  ST_AsGeoJSON(geom)::jsonb AS geom,
  status,
  created_at,
  updated_at
FROM public.records
WHERE status = 'verified';

GRANT SELECT ON public.records_public TO anon;

-- Authenticated users can SELECT full records if tehsil_scope matches
CREATE POLICY "Authenticated users can view records in their scope"
  ON public.records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin' OR
          tehsil_scope IS NULL OR
          tehsil_scope = records.tehsil
        )
    )
  );

-- Patwaris, tehsildars, and admins can INSERT records
CREATE POLICY "Officials can create records"
  ON public.records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('patwari', 'tehsildar', 'admin')
        AND (
          role = 'admin' OR
          tehsil_scope IS NULL OR
          tehsil_scope = records.tehsil
        )
    )
  );

-- Patwaris, tehsildars, and admins can UPDATE records in their scope
CREATE POLICY "Officials can update records in their scope"
  ON public.records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('patwari', 'tehsildar', 'admin')
        AND (
          role = 'admin' OR
          tehsil_scope IS NULL OR
          tehsil_scope = records.tehsil
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('patwari', 'tehsildar', 'admin')
        AND (
          role = 'admin' OR
          tehsil_scope IS NULL OR
          tehsil_scope = records.tehsil
        )
    )
  );

-- ============================================================================
-- RECORD_VERSIONS TABLE POLICIES
-- ============================================================================

-- Authenticated users can SELECT versions for records they can access
CREATE POLICY "Users can view versions for accessible records"
  ON public.record_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = record_versions.record_id
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- Officials can INSERT versions for records they can edit
CREATE POLICY "Officials can create versions"
  ON public.record_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = record_versions.record_id
        AND p.role IN ('patwari', 'tehsildar', 'admin')
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- UPDATE and DELETE are blocked by triggers (see migration 00000000000003)

-- ============================================================================
-- UPLOADS TABLE POLICIES
-- ============================================================================

-- Users can SELECT their own uploads
CREATE POLICY "Users can view own uploads"
  ON public.uploads FOR SELECT
  TO authenticated
  USING (uploader_id = auth.uid());

-- Officials can SELECT uploads for records in their scope
CREATE POLICY "Officials can view uploads in their scope"
  ON public.uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = uploads.record_id
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- Authenticated users can INSERT their own uploads
CREATE POLICY "Users can create own uploads"
  ON public.uploads FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid());

-- Officials can UPDATE uploads in their scope
CREATE POLICY "Officials can update uploads in their scope"
  ON public.uploads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE (r.id = uploads.record_id OR uploads.record_id IS NULL)
        AND p.role IN ('patwari', 'tehsildar', 'admin')
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- ============================================================================
-- FRAUD_ALERTS TABLE POLICIES
-- ============================================================================

-- Officials can SELECT fraud alerts for records in their scope
CREATE POLICY "Officials can view fraud alerts in their scope"
  ON public.fraud_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = fraud_alerts.record_id
        AND p.role IN ('patwari', 'tehsildar', 'admin')
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- Officials can INSERT fraud alerts
CREATE POLICY "Officials can create fraud alerts"
  ON public.fraud_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('patwari', 'tehsildar', 'admin')
    )
  );

-- Officials can UPDATE fraud alerts (resolve them)
CREATE POLICY "Officials can resolve fraud alerts"
  ON public.fraud_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = fraud_alerts.record_id
        AND p.role IN ('patwari', 'tehsildar', 'admin')
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Officials can SELECT notifications for records in their scope
CREATE POLICY "Officials can view notifications in their scope"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE (r.id = notifications.record_id OR notifications.record_id IS NULL)
        AND p.role IN ('patwari', 'tehsildar', 'admin')
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- System can INSERT notifications (via service role)
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('patwari', 'tehsildar', 'admin')
    )
  );

-- Officials can UPDATE notification status
CREATE POLICY "Officials can update notification status"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('patwari', 'tehsildar', 'admin')
    )
  );

-- ============================================================================
-- SYNC_LOG TABLE POLICIES
-- ============================================================================

-- Officials can SELECT sync logs for records in their scope
CREATE POLICY "Officials can view sync logs in their scope"
  ON public.sync_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.records r
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE r.id = sync_log.record_id
        AND p.role IN ('patwari', 'tehsildar', 'admin')
        AND (
          p.role = 'admin' OR
          p.tehsil_scope IS NULL OR
          p.tehsil_scope = r.tehsil
        )
    )
  );

-- System can INSERT sync logs (via service role)
CREATE POLICY "System can create sync logs"
  ON public.sync_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('patwari', 'tehsildar', 'admin')
    )
  );

-- System can UPDATE sync logs
CREATE POLICY "System can update sync logs"
  ON public.sync_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('patwari', 'tehsildar', 'admin')
    )
  );
