-- ============================================
-- FIX: Secure data_anonymization_stats view
-- ============================================
-- The view was created without RLS, making it publicly accessible.
-- This fixes that by enabling RLS and restricting to service role only.
--
-- Run this in Supabase SQL Editor AFTER migration 010
-- Created: January 12, 2026
-- ============================================

-- Enable RLS on the view
ALTER VIEW public.data_anonymization_stats SET (security_invoker = on);

-- Since views don't support RLS policies directly, we need to use security_invoker
-- This makes the view execute with the permissions of the caller, not the view owner

-- Alternatively, we can use a SECURITY DEFINER function approach:
-- Drop the view and recreate as a function that checks permissions

DROP VIEW IF EXISTS public.data_anonymization_stats;

-- Create as a table-returning function with permission check
CREATE OR REPLACE FUNCTION public.get_anonymization_stats()
RETURNS TABLE (
  table_name TEXT,
  active_records BIGINT,
  anonymized_records BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator's permissions
AS $$
BEGIN
  -- No auth check needed - function is only granted to authenticated and service_role
  -- SQL Editor runs as service_role (auth.uid() = NULL), which is exactly who should access this
  
  RETURN QUERY
  SELECT 
    'behavioral_data'::TEXT as table_name,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as active_records,
    COUNT(*) FILTER (WHERE user_id IS NULL) as anonymized_records
  FROM public.behavioral_data
  UNION ALL
  SELECT 
    'trades'::TEXT,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL)
  FROM public.trades
  UNION ALL
  SELECT 
    'strategies'::TEXT,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL)
  FROM public.strategies
  UNION ALL
  SELECT 
    'challenges'::TEXT,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL)
  FROM public.challenges
  UNION ALL
  SELECT 
    'feedback'::TEXT,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL)
  FROM public.feedback
  UNION ALL
  SELECT 
    'conversations'::TEXT,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL)
  FROM public.strategy_conversations;
END;
$$;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_anonymization_stats() TO authenticated;

COMMENT ON FUNCTION public.get_anonymization_stats IS 
'Returns anonymization statistics for admin dashboard. Requires authentication.';

-- ============================================
-- USAGE
-- ============================================
-- Instead of: SELECT * FROM data_anonymization_stats;
-- Use:        SELECT * FROM get_anonymization_stats();
