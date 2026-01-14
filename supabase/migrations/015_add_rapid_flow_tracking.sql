-- ============================================================================
-- Migration: Add Rapid Flow Tracking Columns
-- Purpose: Track expertise detection, completeness, and smart defaults usage
-- ============================================================================

-- Add rapid flow tracking columns to strategy_conversations
ALTER TABLE strategy_conversations 
  ADD COLUMN IF NOT EXISTS expertise_detected TEXT 
    CHECK (expertise_detected IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS initial_completeness DECIMAL(3,2)
    CHECK (initial_completeness >= 0 AND initial_completeness <= 1),
  ADD COLUMN IF NOT EXISTS final_completeness DECIMAL(3,2)
    CHECK (final_completeness >= 0 AND final_completeness <= 1),
  ADD COLUMN IF NOT EXISTS defaults_used JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_time_seconds INTEGER
    CHECK (completion_time_seconds >= 0),
  ADD COLUMN IF NOT EXISTS message_count_to_save INTEGER
    CHECK (message_count_to_save >= 0);

-- Add comments for documentation
COMMENT ON COLUMN strategy_conversations.expertise_detected IS 'User expertise level detected from first message (beginner/intermediate/advanced)';
COMMENT ON COLUMN strategy_conversations.initial_completeness IS 'Strategy completeness percentage (0-1) from first message';
COMMENT ON COLUMN strategy_conversations.final_completeness IS 'Strategy completeness percentage (0-1) at save time';
COMMENT ON COLUMN strategy_conversations.defaults_used IS 'Array of component names that used smart defaults (e.g., ["target", "sizing"])';
COMMENT ON COLUMN strategy_conversations.completion_time_seconds IS 'Time from first message to strategy save in seconds';
COMMENT ON COLUMN strategy_conversations.message_count_to_save IS 'Number of messages exchanged before strategy was saved';

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_conversations_expertise 
  ON strategy_conversations(expertise_detected) 
  WHERE expertise_detected IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_completeness 
  ON strategy_conversations(initial_completeness) 
  WHERE initial_completeness IS NOT NULL;

-- Create composite index for common analytics query patterns
CREATE INDEX IF NOT EXISTS idx_conversations_rapid_analytics 
  ON strategy_conversations(expertise_detected, initial_completeness, created_at DESC)
  WHERE expertise_detected IS NOT NULL;
