-- Phase 5: Add retry_count to notifications table
-- Needed for exponential backoff retry logic

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Add index for retry queue
CREATE INDEX IF NOT EXISTS idx_notifications_retry 
ON public.notifications(next_retry_at) 
WHERE status = 'retrying';

COMMENT ON COLUMN public.notifications.retry_count IS 'Number of retry attempts for failed notifications';
COMMENT ON COLUMN public.notifications.next_retry_at IS 'Next scheduled retry time (exponential backoff)';
