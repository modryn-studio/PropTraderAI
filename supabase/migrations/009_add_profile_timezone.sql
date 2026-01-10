-- Migration: Add timezone preference to user profiles
-- Created: January 10, 2026
-- Purpose: Allow users to set their timezone preference for strategy time conversions

-- Add timezone column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add comment
COMMENT ON COLUMN profiles.timezone IS 'User preferred timezone for strategy time conversions (IANA format, e.g., America/Los_Angeles)';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON profiles(timezone);

-- Note: No default value - NULL means timezone should be auto-detected from conversation
