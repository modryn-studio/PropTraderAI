-- ============================================================================
-- Migration: 017_add_feature_flags_to_profiles
-- Purpose: Add feature_flags JSONB column to profiles for A/B testing
-- Date: 2026-01-15
-- ============================================================================

-- Add feature_flags column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

-- Create index for faster feature flag lookups
CREATE INDEX IF NOT EXISTS idx_profiles_feature_flags 
  ON profiles USING GIN (feature_flags);

-- Add comment for documentation
COMMENT ON COLUMN profiles.feature_flags IS 
  'Feature flags for A/B testing (e.g., {"generate_first_flow": true})';

-- For dev/testing: Manually set rapid flow flag for specific users
-- UPDATE profiles SET feature_flags = '{"generate_first_flow": true}' WHERE id = 'your-user-id';
