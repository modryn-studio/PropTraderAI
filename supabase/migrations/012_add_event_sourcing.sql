-- Migration: Add Event-Sourcing Columns
-- Purpose: Store strategy changes as immutable events, derive canonical_rules from replay
-- Issue: #50 - Strategy Editing System Architecture
-- Created: January 21, 2026

-- ============================================
-- ADD EVENT-SOURCING COLUMNS
-- ============================================

-- Events column: Immutable append-only array of strategy events
-- Each event has: { id, timestamp, type, ...payload }
ALTER TABLE public.strategies 
  ADD COLUMN IF NOT EXISTS events JSONB NOT NULL DEFAULT '[]';

-- Canonical rules: Derived from event replay, validated by Zod
-- This is the execution-ready format used by compilers
ALTER TABLE public.strategies 
  ADD COLUMN IF NOT EXISTS canonical_rules JSONB;

-- Event version: For future schema evolution
ALTER TABLE public.strategies 
  ADD COLUMN IF NOT EXISTS event_version INTEGER DEFAULT 1;

-- Format version: Track which format the strategy uses
-- 'legacy' = old parsed_rules only
-- 'canonical_v1' = canonical format (from claudeToCanonical)
-- 'events_v1' = event-sourced with derived canonical_rules
ALTER TABLE public.strategies 
  ADD COLUMN IF NOT EXISTS format_version TEXT DEFAULT 'legacy';

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index on format_version for migration queries
CREATE INDEX IF NOT EXISTS idx_strategies_format_version 
  ON public.strategies(format_version);

-- Index on event_version for schema evolution queries
CREATE INDEX IF NOT EXISTS idx_strategies_event_version 
  ON public.strategies(event_version);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.strategies.events IS 
  'Immutable append-only array of strategy events. Source of truth for event-sourced strategies.';

COMMENT ON COLUMN public.strategies.canonical_rules IS 
  'Derived from event replay. Validated by Zod. Used by execution compilers.';

COMMENT ON COLUMN public.strategies.event_version IS 
  'Schema version for event format. Enables future schema evolution.';

COMMENT ON COLUMN public.strategies.format_version IS 
  'Format type: legacy (parsed_rules), canonical_v1, or events_v1';

-- ============================================
-- NOTE: parsed_rules is KEPT for rollback safety
-- It will be deprecated but not dropped in this migration.
-- Future migration (Month 2+) can drop it after events_v1 is stable.
-- ============================================
