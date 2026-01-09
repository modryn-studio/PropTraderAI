-- Migration: Add 'abandoned' status and tracking
-- Purpose: Track abandoned conversations for PATH 2 behavioral insights
-- Created: January 8, 2026

-- ============================================
-- ADD 'ABANDONED' STATUS TO ENUM
-- ============================================

-- Update the status check constraint to include 'abandoned'
ALTER TABLE public.strategy_conversations 
  DROP CONSTRAINT strategy_conversations_status_check;

ALTER TABLE public.strategy_conversations
  ADD CONSTRAINT strategy_conversations_status_check 
  CHECK (status IN ('in_progress', 'completed', 'stale', 'abandoned'));

-- ============================================
-- ADD ABANDONED_REASON COLUMN
-- ============================================

-- Track WHY a conversation was abandoned (for behavioral insights)
-- Possible values:
-- - 'user_restarted': User clicked "Start Over" button
-- - 'user_navigated_away': User left chat without completing
-- - 'marked_stale': System marked as stale after 7 days
-- - 'user_deleted': User explicitly deleted conversation (Phase 2+)
ALTER TABLE public.strategy_conversations
  ADD COLUMN abandoned_reason TEXT;

-- ============================================
-- ADD MESSAGE_COUNT COLUMN (Computed)
-- ============================================

-- Makes analytics queries easier - how many messages before abandonment?
ALTER TABLE public.strategy_conversations
  ADD COLUMN message_count INTEGER GENERATED ALWAYS AS (array_length(messages, 1)) STORED;

-- Index for analytics queries
CREATE INDEX idx_strategy_conversations_abandoned 
  ON public.strategy_conversations(status, abandoned_reason, message_count) 
  WHERE status = 'abandoned';

-- ============================================
-- UPDATED STALE MARKING FUNCTION
-- ============================================

-- Update the stale marking function to use 'abandoned' status
CREATE OR REPLACE FUNCTION mark_stale_conversations()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.strategy_conversations
  SET status = 'abandoned',
      abandoned_reason = 'marked_stale',
      updated_at = NOW()
  WHERE status = 'in_progress'
    AND last_activity < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER: Abandon Current Conversation
-- ============================================

-- Function to properly abandon a conversation with reason tracking
-- Used when user clicks "Start Over" or navigates away
CREATE OR REPLACE FUNCTION abandon_conversation(
  p_conversation_id UUID,
  p_abandoned_reason TEXT DEFAULT 'user_restarted'
)
RETURNS void AS $$
BEGIN
  UPDATE public.strategy_conversations
  SET status = 'abandoned',
      abandoned_reason = p_abandoned_reason,
      updated_at = NOW()
  WHERE id = p_conversation_id
    AND status = 'in_progress'; -- Only abandon in-progress conversations
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ANALYTICS VIEWS (For PATH 2 Insights)
-- ============================================

-- View: Where do users abandon conversations?
-- Shows message count distribution for abandoned conversations
CREATE OR REPLACE VIEW v_abandonment_by_message_count AS
SELECT 
  message_count,
  abandoned_reason,
  COUNT(*) as abandon_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.strategy_conversations
WHERE status = 'abandoned'
  AND message_count IS NOT NULL
GROUP BY message_count, abandoned_reason
ORDER BY message_count, abandon_count DESC;

-- View: Most common message content before abandonment
-- Helps identify confusing questions or patterns
CREATE OR REPLACE VIEW v_abandonment_triggers AS
SELECT 
  (messages[array_length(messages, 1) - 1]->>'content')::TEXT as second_to_last_message,
  abandoned_reason,
  COUNT(*) as abandon_count
FROM public.strategy_conversations
WHERE status = 'abandoned'
  AND array_length(messages, 1) >= 2
GROUP BY second_to_last_message, abandoned_reason
ORDER BY abandon_count DESC
LIMIT 20;

-- ============================================
-- BEHAVIORAL EVENT LOGGING
-- ============================================

-- Automatically log behavioral event when conversation is abandoned
CREATE OR REPLACE FUNCTION log_conversation_abandonment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed TO 'abandoned'
  IF NEW.status = 'abandoned' AND (OLD.status IS NULL OR OLD.status != 'abandoned') THEN
    INSERT INTO public.behavioral_data (
      user_id,
      event_type,
      event_data,
      timestamp
    ) VALUES (
      NEW.user_id,
      'conversation_abandoned',
      jsonb_build_object(
        'conversation_id', NEW.id,
        'message_count', NEW.message_count,
        'abandoned_reason', NEW.abandoned_reason,
        'duration_minutes', EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60,
        'last_message_preview', 
          CASE 
            WHEN NEW.message_count > 0 THEN 
              (NEW.messages[NEW.message_count]->>'content')::TEXT
            ELSE NULL
          END
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log abandonment events
CREATE TRIGGER trigger_log_conversation_abandonment
  AFTER UPDATE ON public.strategy_conversations
  FOR EACH ROW
  WHEN (NEW.status = 'abandoned')
  EXECUTE FUNCTION log_conversation_abandonment();

