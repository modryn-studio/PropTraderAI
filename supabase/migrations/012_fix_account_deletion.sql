-- ============================================
-- FIX: Separate auth deletion from data anonymization
-- ============================================
-- The original delete_user_account() function tried to delete from auth.*
-- tables but lacked permissions. This migration fixes that by:
-- 1. Renaming function to anonymize_user_data (only handles MOAT data)
-- 2. Auth deletion is handled by API route using service_role client
--
-- Run this in Supabase SQL Editor AFTER migration 010
-- Created: January 12, 2026
-- ============================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.delete_user_account(UUID);

-- Create new function that ONLY handles data anonymization
-- Auth deletion is handled by the API route using auth.admin.deleteUser()
CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is anonymizing their own data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- ========================================
  -- STEP A: HARD DELETE (PII - except profile which CASCADE handles)
  -- ========================================
  DELETE FROM public.broker_connections WHERE user_id = target_user_id;
  DELETE FROM public.screenshot_analyses WHERE user_id = target_user_id;
  DELETE FROM public.feedback WHERE user_id = target_user_id;
  DELETE FROM public.chat_messages WHERE user_id = target_user_id;
  DELETE FROM public.strategy_conversations WHERE user_id = target_user_id;
  DELETE FROM public.trading_rules WHERE user_id = target_user_id;
  
  -- ========================================
  -- STEP B: ANONYMIZE (preserve patterns, remove identity)
  -- This is THE MOAT - keep for ML training
  -- ========================================
  
  -- Behavioral data: Just null the user_id
  UPDATE public.behavioral_data 
  SET user_id = NULL 
  WHERE user_id = target_user_id;
  
  -- Trades: Remove identifying info but keep patterns
  UPDATE public.trades 
  SET 
    user_id = NULL,
    tradovate_order_id = NULL,
    metadata = COALESCE(metadata, '{}'::jsonb) - 'account_id' - 'broker_data'
  WHERE user_id = target_user_id;
  
  -- Strategies: Redact personal writing style but keep parsed rules
  UPDATE public.strategies
  SET 
    user_id = NULL,
    natural_language = '[REDACTED]',
    name = 'Anonymous Strategy'
  WHERE user_id = target_user_id;
  
  -- Challenges: Remove firm name (could be identifying if small firm)
  UPDATE public.challenges
  SET 
    user_id = NULL,
    firm_name = '[REDACTED]'
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error anonymizing user data: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.anonymize_user_data(UUID) TO authenticated;

-- Also grant to service_role for API route
GRANT EXECUTE ON FUNCTION public.anonymize_user_data(UUID) TO service_role;

COMMENT ON FUNCTION public.anonymize_user_data IS 
'Anonymizes user data: Hard deletes PII (except profile). 
Anonymizes MOAT data (behavioral_data, trades, strategies, challenges) by setting user_id=NULL.
Auth deletion is handled separately by API route using auth.admin.deleteUser().';

-- ============================================
-- IMPORTANT
-- ============================================
-- After running this migration:
-- 1. The API route will call anonymize_user_data() first
-- 2. Then call auth.admin.deleteUser() which will CASCADE delete profile
-- 3. This ensures proper cleanup of both data and auth records
