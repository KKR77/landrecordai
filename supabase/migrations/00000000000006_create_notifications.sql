-- Create notifications table
-- Tracks all notifications sent to land owners and officials

CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'email', 'push');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_contact TEXT NOT NULL, -- phone number or email
  record_id UUID REFERENCES public.records(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- message content and metadata
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_record_id ON public.notifications(record_id) WHERE record_id IS NOT NULL;
CREATE INDEX idx_notifications_channel ON public.notifications(channel);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_owner_contact ON public.notifications(owner_contact);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
