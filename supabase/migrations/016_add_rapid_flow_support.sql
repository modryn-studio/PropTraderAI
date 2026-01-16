-- ============================================================================
-- Migration: 016_add_rapid_flow_support
-- Purpose: Add conversation_type column for A/B testing rapid vs socratic flow
-- Date: 2026-01-15
-- ============================================================================

-- Add conversation_type column to strategy_conversations
-- This allows tracking which flow was used and comparing performance
ALTER TABLE strategy_conversations
ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'socratic' 
  CHECK (conversation_type IN ('socratic', 'rapid_flow'));

-- Add message_count column for quick analytics
-- Tracks how many messages were needed to complete the strategy
ALTER TABLE strategy_conversations
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Add completed_at column (needed by analytics view)
ALTER TABLE strategy_conversations
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Trigger to set completed_at when status changes to 'completed'
CREATE OR REPLACE FUNCTION set_conversation_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversation_completed_trigger ON strategy_conversations;
CREATE TRIGGER conversation_completed_trigger
  BEFORE UPDATE ON strategy_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_completed_at();

-- Add index for analytics queries (conversation type + created_at)
-- Note: Using created_at directly instead of DATE() since DATE() is not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_conversations_type_date 
  ON strategy_conversations(conversation_type, created_at);

-- Add index for message count analytics
CREATE INDEX IF NOT EXISTS idx_conversations_message_count
  ON strategy_conversations(message_count);

-- ============================================================================
-- Analytics View: Rapid Flow Performance
-- Compare rapid flow vs socratic performance
-- ============================================================================

CREATE OR REPLACE VIEW rapid_flow_analytics AS
SELECT
  conversation_type,
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE status = 'completed') as completions,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100, 
    2
  ) as completion_rate,
  ROUND(AVG(message_count), 2) as avg_messages,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))),
    2
  ) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE message_count = 1) as one_message_completions,
  COUNT(*) FILTER (WHERE message_count = 2) as two_message_completions,
  COUNT(*) FILTER (WHERE message_count > 2) as multi_message_completions
FROM strategy_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY conversation_type, DATE(created_at)
ORDER BY date DESC, conversation_type;
CREATE OR REPLACE FUNCTION set_conversation_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversation_completed_trigger ON strategy_conversations;
CREATE TRIGGER conversation_completed_trigger
  BEFORE UPDATE ON strategy_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_completed_at();

-- ============================================================================
-- Grant access to analytics view (adjust as needed)
-- ============================================================================

-- Note: Adjust these grants based on your RLS policies
-- GRANT SELECT ON rapid_flow_analytics TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN strategy_conversations.conversation_type IS 
  'Type of conversation flow: socratic (multi-turn) or rapid_flow (1-2 messages)';

COMMENT ON COLUMN strategy_conversations.message_count IS 
  'Number of messages exchanged before strategy completion';

COMMENT ON VIEW rapid_flow_analytics IS 
  'Analytics comparing rapid flow vs socratic dialogue performance';
