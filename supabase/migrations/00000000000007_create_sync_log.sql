-- Create sync_log table
-- Tracks synchronization with external systems (DILRMP, etc.)

CREATE TYPE sync_target AS ENUM ('dilrmp', 'revenue_dept', 'court_system', 'backup');
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'success', 'failed', 'retrying');

CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  target sync_target NOT NULL,
  status sync_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- data sent to external system
  response JSONB, -- response from external system
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_log_record_id ON public.sync_log(record_id);
CREATE INDEX idx_sync_log_target ON public.sync_log(target);
CREATE INDEX idx_sync_log_status ON public.sync_log(status);
CREATE INDEX idx_sync_log_next_retry ON public.sync_log(next_retry_at) WHERE status = 'retrying';
CREATE INDEX idx_sync_log_created_at ON public.sync_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE TRIGGER update_sync_log_updated_at
  BEFORE UPDATE ON public.sync_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
