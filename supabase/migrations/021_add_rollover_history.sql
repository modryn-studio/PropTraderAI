-- Migration: 021_add_rollover_history
-- Description: Add rollover_history table for audit trail of contract rollovers
-- Per Agent 1 code review: Issue #2 - Track rollovers for debugging and compliance
-- Created: 2026-01-XX

-- ============================================================================
-- ROLLOVER HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rollover_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  
  -- Rollover details
  instrument TEXT NOT NULL,              -- Base instrument (ES, NQ, CL, etc.)
  old_symbol TEXT NOT NULL,              -- Previous contract (e.g., ESH26)
  new_symbol TEXT NOT NULL,              -- New contract (e.g., ESM26)
  
  -- Timing
  rollover_date TIMESTAMPTZ NOT NULL,    -- When rollover was detected
  old_expiry_date TIMESTAMPTZ,           -- When old contract expires
  new_expiry_date TIMESTAMPTZ,           -- When new contract expires
  
  -- Position impact
  positions_affected INT DEFAULT 0,      -- Number of positions affected
  was_blocked BOOLEAN DEFAULT false,     -- True if rollover was blocked due to open positions
  
  -- Notification status
  user_notified BOOLEAN DEFAULT false,   -- True if user was notified
  notification_sent_at TIMESTAMPTZ,      -- When notification was sent
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_rollover_history_user_id 
  ON rollover_history(user_id);

CREATE INDEX idx_rollover_history_instrument 
  ON rollover_history(instrument);

CREATE INDEX idx_rollover_history_rollover_date 
  ON rollover_history(rollover_date);

CREATE INDEX idx_rollover_history_strategy_id 
  ON rollover_history(strategy_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE rollover_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rollover history
CREATE POLICY "Users can view own rollover history"
  ON rollover_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rollover records
CREATE POLICY "Users can insert own rollover history"
  ON rollover_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rollover records (e.g., mark as notified)
CREATE POLICY "Users can update own rollover history"
  ON rollover_history FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================

CREATE TRIGGER update_rollover_history_updated_at
  BEFORE UPDATE ON rollover_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE rollover_history IS 'Audit trail for contract rollovers';
COMMENT ON COLUMN rollover_history.instrument IS 'Base instrument code (ES, NQ, CL, etc.)';
COMMENT ON COLUMN rollover_history.old_symbol IS 'Previous contract symbol (e.g., ESH26)';
COMMENT ON COLUMN rollover_history.new_symbol IS 'New contract symbol (e.g., ESM26)';
COMMENT ON COLUMN rollover_history.was_blocked IS 'True if rollover was blocked due to open positions';
COMMENT ON COLUMN rollover_history.positions_affected IS 'Number of positions affected by rollover';
