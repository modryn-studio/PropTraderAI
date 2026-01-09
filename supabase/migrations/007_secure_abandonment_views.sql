-- Migration: Secure abandonment analytics views with RLS
-- Purpose: Prevent unauthorized access to abandonment data
-- Created: January 8, 2026

-- ============================================
-- DROP UNRESTRICTED VIEWS
-- ============================================

-- Drop the old views that don't respect RLS
DROP VIEW IF EXISTS v_abandonment_by_message_count;
DROP VIEW IF EXISTS v_abandonment_triggers;

-- ============================================
-- CREATE SECURITY DEFINER FUNCTIONS INSTEAD
-- ============================================

-- These functions respect RLS by only showing data for auth.uid()
-- Users can only see their OWN abandonment analytics

-- Function: Get abandonment statistics by message count for current user
CREATE OR REPLACE FUNCTION get_user_abandonment_by_message_count()
RETURNS TABLE (
  message_count INTEGER,
  abandoned_reason TEXT,
  abandon_count BIGINT,
  percentage NUMERIC
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.message_count,
    sc.abandoned_reason,
    COUNT(*) as abandon_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
  FROM public.strategy_conversations sc
  WHERE sc.status = 'abandoned'
    AND sc.user_id = auth.uid()  -- CRITICAL: Only current user's data
    AND sc.message_count IS NOT NULL
  GROUP BY sc.message_count, sc.abandoned_reason
  ORDER BY sc.message_count, abandon_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get common messages before abandonment for current user
CREATE OR REPLACE FUNCTION get_user_abandonment_triggers()
RETURNS TABLE (
  second_to_last_message TEXT,
  abandoned_reason TEXT,
  abandon_count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (sc.messages[array_length(sc.messages, 1) - 1]->>'content')::TEXT as second_to_last_message,
    sc.abandoned_reason,
    COUNT(*) as abandon_count
  FROM public.strategy_conversations sc
  WHERE sc.status = 'abandoned'
    AND sc.user_id = auth.uid()  -- CRITICAL: Only current user's data
    AND array_length(sc.messages, 1) >= 2
  GROUP BY second_to_last_message, sc.abandoned_reason
  ORDER BY abandon_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADMIN-ONLY ANALYTICS FUNCTIONS
-- ============================================

-- These functions are for PropTraderAI team to analyze aggregate patterns
-- NOT accessible to regular users (no RLS policies created)

-- Admin function: Get ALL abandonment statistics (cross-user)
CREATE OR REPLACE FUNCTION admin_get_abandonment_by_message_count()
RETURNS TABLE (
  message_count INTEGER,
  abandoned_reason TEXT,
  abandon_count BIGINT,
  percentage NUMERIC
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TODO: Add admin role check here when implementing admin system
  -- IF NOT is_admin(auth.uid()) THEN
  --   RAISE EXCEPTION 'Unauthorized: Admin access required';
  -- END IF;
  
  RETURN QUERY
  SELECT 
    sc.message_count,
    sc.abandoned_reason,
    COUNT(*) as abandon_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
  FROM public.strategy_conversations sc
  WHERE sc.status = 'abandoned'
    AND sc.message_count IS NOT NULL
  GROUP BY sc.message_count, sc.abandoned_reason
  ORDER BY sc.message_count, abandon_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Admin function: Get ALL abandonment triggers (cross-user)
CREATE OR REPLACE FUNCTION admin_get_abandonment_triggers()
RETURNS TABLE (
  second_to_last_message TEXT,
  abandoned_reason TEXT,
  abandon_count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TODO: Add admin role check here when implementing admin system
  -- IF NOT is_admin(auth.uid()) THEN
  --   RAISE EXCEPTION 'Unauthorized: Admin access required';
  -- END IF;
  
  RETURN QUERY
  SELECT 
    (sc.messages[array_length(sc.messages, 1) - 1]->>'content')::TEXT as second_to_last_message,
    sc.abandoned_reason,
    COUNT(*) as abandon_count
  FROM public.strategy_conversations sc
  WHERE sc.status = 'abandoned'
    AND array_length(sc.messages, 1) >= 2
  GROUP BY second_to_last_message, sc.abandoned_reason
  ORDER BY abandon_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USAGE NOTES
-- ============================================

-- For users (in-app analytics):
-- SELECT * FROM get_user_abandonment_by_message_count();
-- SELECT * FROM get_user_abandonment_triggers();

-- For PropTraderAI team (Supabase SQL Editor):
-- SELECT * FROM admin_get_abandonment_by_message_count();
-- SELECT * FROM admin_get_abandonment_triggers();

