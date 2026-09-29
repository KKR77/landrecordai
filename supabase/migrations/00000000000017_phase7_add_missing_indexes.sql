-- Phase 7 Bug Fix: Add missing database indexes
-- 
-- This migration adds indexes that were missing from the original schema
-- to improve query performance on frequently queried columns.

-- ============================================================================
-- Uploads table indexes
-- ============================================================================

-- Index on status for queue queries
CREATE INDEX IF NOT EXISTS idx_uploads_status ON public.uploads(status);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at DESC);

-- Index on tamper_score for forensic queries
CREATE INDEX IF NOT EXISTS idx_uploads_tamper_score ON public.uploads(tamper_score) WHERE tamper_score IS NOT NULL;

-- ============================================================================
-- Fraud alerts table indexes
-- ============================================================================

-- Index on type for type-based queries
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_type ON public.fraud_alerts(type);

-- Index on severity for priority filtering
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON public.fraud_alerts(severity);

-- Index on resolved for status filtering
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON public.fraud_alerts(resolved) WHERE resolved = FALSE;

-- ============================================================================
-- Notifications table indexes
-- ============================================================================

-- Index on channel for channel-based queries
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON public.notifications(channel);

-- ============================================================================
-- Sync log table indexes
-- ============================================================================

-- Index on target for target-based queries
CREATE INDEX IF NOT EXISTS idx_sync_log_target ON public.sync_log(target);

--Phase 7 Bug Fix: Add missing database indexes for performance';
