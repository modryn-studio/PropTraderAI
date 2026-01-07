-- Migration: Simplify prop_firms table to only name and website
-- Phase 0: We don't need detailed rules yet, will add back in Phase 1B

-- Drop all extra columns, keep only basic info
ALTER TABLE prop_firms
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS account_sizes,
  DROP COLUMN IF EXISTS daily_loss_limit_percent,
  DROP COLUMN IF EXISTS max_drawdown_percent,
  DROP COLUMN IF EXISTS profit_target_percent,
  DROP COLUMN IF EXISTS profit_split,
  DROP COLUMN IF EXISTS trading_days_required,
  DROP COLUMN IF EXISTS allowed_instruments,
  DROP COLUMN IF EXISTS trading_hours,
  DROP COLUMN IF EXISTS rules,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS is_active;

-- Keep: id, name, website_url, created_at, updated_at
