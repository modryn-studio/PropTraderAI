-- Migration: Add canonical_rules and format_version columns to strategies table
-- Issue: #42 - Canonical Schema Architecture
-- Date: January 19, 2026
-- 
-- Purpose: Support dual-format strategy storage during transition period.
-- - canonical_rules: New format (discriminated union, camelCase, strict Zod validation)
-- - parsed_rules: Legacy format (kept for backwards compatibility)
-- - format_version: Track which format is active ('legacy' or 'canonical_v1')
--
-- Execution priority: Try canonical_rules first, fallback to parsed_rules if NULL

-- Add canonical_rules column to store normalized execution format
ALTER TABLE public.strategies 
ADD COLUMN IF NOT EXISTS canonical_rules JSONB;

-- Add format_version to track which format is being used
ALTER TABLE public.strategies 
ADD COLUMN IF NOT EXISTS format_version TEXT CHECK (format_version IN ('legacy', 'canonical_v1'));

-- Add comment explaining the transition period
COMMENT ON COLUMN public.strategies.canonical_rules IS 
'Canonical execution format (discriminated union with pattern-specific schemas). Generated from parsed_rules by claudeToCanonical normalizer. Execution engine prioritizes this format.';

COMMENT ON COLUMN public.strategies.format_version IS 
'Format version indicator: "legacy" = parsed_rules only, "canonical_v1" = canonical_rules available. NULL = pre-migration strategy (use parsed_rules).';

-- Note: No data migration needed yet
-- Existing strategies will have canonical_rules = NULL, which is fine
-- Save route will populate canonical_rules for new strategies
-- Future batch migration (Q2 2026) will normalize all existing strategies
