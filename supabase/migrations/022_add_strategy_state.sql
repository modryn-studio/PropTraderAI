-- Migration: 022_add_strategy_state
-- Description: Add strategy_state table for persisting runtime state across restarts
-- Per Agent 1 code review: Issue #6 - Strategy state must survive engine restarts
-- Example: Opening range must be preserved if Railway restarts mid-session
-- Created: 2026-01-17

-- ============================================================================
-- STRATEGY STATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategy_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- State identification
  state_type TEXT NOT NULL,  -- 'opening_range', 'ema_anchor', 'session_stats', etc.
  
  -- State data (flexible JSON storage)
  state_data JSONB NOT NULL,
  
  -- Example state_data for 'opening_range':
  -- {
  --   "high": 5850.25,
  --   "low": 5840.00,
  --   "startTime": "2026-01-17T09:30:00Z",
  --   "endTime": "2026-01-17T09:45:00Z",
  --   "isComplete": true
  -- }
  
  -- Validity
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,  -- null = never expires (cleared manually)
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one state per type per strategy
  UNIQUE(strategy_id, state_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_strategy_state_strategy 
  ON strategy_state(strategy_id);

CREATE INDEX idx_strategy_state_user 
  ON strategy_state(user_id);

CREATE INDEX idx_strategy_state_type 
  ON strategy_state(strategy_id, state_type);

CREATE INDEX idx_strategy_state_expires 
  ON strategy_state(expires_at) 
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE strategy_state ENABLE ROW LEVEL SECURITY;

-- Users can only see their own strategy states
CREATE POLICY "Users can view own strategy states"
  ON strategy_state FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own strategy states
CREATE POLICY "Users can insert own strategy states"
  ON strategy_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own strategy states
CREATE POLICY "Users can update own strategy states"
  ON strategy_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own strategy states
CREATE POLICY "Users can delete own strategy states"
  ON strategy_state FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up expired states (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_strategy_states()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM strategy_state
  WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function to get market close time for a given date (4:00 PM ET)
CREATE OR REPLACE FUNCTION get_market_close_time(for_date DATE DEFAULT CURRENT_DATE)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- 4:00 PM Eastern Time
  RETURN (for_date || ' 16:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON strategy_state TO authenticated;
