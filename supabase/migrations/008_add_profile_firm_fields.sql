-- Migration: Add firm-related fields to profiles table
-- Purpose: Store user's selected prop firm and account type for the new onboarding flow
-- Date: January 10, 2026

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('prop_firm', 'personal')),
ADD COLUMN IF NOT EXISTS firm_name TEXT,
ADD COLUMN IF NOT EXISTS account_size DECIMAL,
ADD COLUMN IF NOT EXISTS broker_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS broker_connected_at TIMESTAMPTZ;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_firm_name ON public.profiles(firm_name) WHERE firm_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_broker_connected ON public.profiles(broker_connected) WHERE broker_connected = TRUE;

-- Comment on columns for documentation
COMMENT ON COLUMN public.profiles.account_type IS 'Whether user is trading prop firm challenge or personal account';
COMMENT ON COLUMN public.profiles.firm_name IS 'Selected prop firm (topstep, tradeify, myfundedfutures, alpha-futures, ftmo, fundednext)';
COMMENT ON COLUMN public.profiles.account_size IS 'Account size for the selected prop firm challenge';
COMMENT ON COLUMN public.profiles.broker_connected IS 'Whether Tradovate OAuth is complete';
COMMENT ON COLUMN public.profiles.broker_connected_at IS 'Timestamp of successful broker connection';
