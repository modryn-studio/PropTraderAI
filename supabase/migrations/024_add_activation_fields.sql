-- Migration 024: Add activation tracking fields
-- Per Issue #10 Activation API Implementation Plan
-- 
-- These fields track whether a strategy is actively being monitored
-- by the execution engine and when it was last activated.

-- ============================================================================
-- ADD ACTIVATION COLUMNS TO STRATEGIES TABLE
-- ============================================================================

-- Add is_active boolean (defaults to false for new strategies)
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Add activated_at timestamp (null until first activation)
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Add deactivated_at timestamp (for tracking activation history)
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Add execution_server_id to track which server is running the strategy
-- This helps with horizontal scaling (multiple Railway instances)
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS execution_server_id TEXT;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding active strategies for a user (common query pattern)
CREATE INDEX IF NOT EXISTS idx_strategies_user_active 
ON strategies(user_id, is_active) 
WHERE is_active = TRUE;

-- Index for finding all active strategies (execution server startup)
CREATE INDEX IF NOT EXISTS idx_strategies_active 
ON strategies(is_active) 
WHERE is_active = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN strategies.is_active IS 
  'Whether this strategy is actively being monitored by the execution engine';

COMMENT ON COLUMN strategies.activated_at IS 
  'Timestamp when the strategy was last activated for execution';

COMMENT ON COLUMN strategies.deactivated_at IS 
  'Timestamp when the strategy was last deactivated/paused';

COMMENT ON COLUMN strategies.execution_server_id IS 
  'ID of the execution server instance running this strategy (for horizontal scaling)';
