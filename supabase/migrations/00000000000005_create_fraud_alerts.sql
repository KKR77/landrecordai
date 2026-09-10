-- Create fraud_alerts table
-- Tracks detected fraud attempts and anomalies

CREATE TYPE fraud_type AS ENUM (
  'tamper_detected',
  'duplicate_upload',
  'boundary_conflict',
  'ownership_conflict',
  'ocr_mismatch',
  'metadata_anomaly',
  'pattern_anomaly'
);

CREATE TYPE fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  type fraud_type NOT NULL,
  severity fraud_severity NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}'::jsonb, -- detailed information about the alert
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure resolved_at is set when resolved is true
  CONSTRAINT check_resolved_timestamp CHECK (
    (resolved = TRUE AND resolved_at IS NOT NULL) OR
    (resolved = FALSE AND resolved_at IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_fraud_alerts_record_id ON public.fraud_alerts(record_id);
CREATE INDEX idx_fraud_alerts_type ON public.fraud_alerts(type);
CREATE INDEX idx_fraud_alerts_severity ON public.fraud_alerts(severity);
CREATE INDEX idx_fraud_alerts_resolved ON public.fraud_alerts(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_fraud_alerts_created_at ON public.fraud_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
