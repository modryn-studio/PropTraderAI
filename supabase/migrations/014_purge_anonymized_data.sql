-- ============================================
-- PURGE ANONYMIZED DATA
-- ============================================
-- WARNING: This deletes ALL anonymized data from your database
-- This is THE MOAT for PATH 2 - only run this if absolutely necessary
-- Consider age-based purging instead (see bottom of file)
--
-- Created: January 13, 2026
-- ============================================

-- ============================================
-- OPTION 1: Nuclear - Delete ALL anonymized data
-- ============================================

-- Uncomment to execute:
-- DELETE FROM public.behavioral_data WHERE user_id IS NULL;
-- DELETE FROM public.trades WHERE user_id IS NULL;
-- DELETE FROM public.strategies WHERE user_id IS NULL;
-- DELETE FROM public.challenges WHERE user_id IS NULL;
-- DELETE FROM public.feedback WHERE user_id IS NULL;
-- DELETE FROM public.strategy_conversations WHERE user_id IS NULL;

-- ============================================
-- OPTION 2: Function - Scheduled purging
-- ============================================

CREATE OR REPLACE FUNCTION public.purge_anonymized_data(older_than_days INTEGER DEFAULT NULL)
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  behavioral_deleted BIGINT;
  trades_deleted BIGINT;
  strategies_deleted BIGINT;
  challenges_deleted BIGINT;
  feedback_deleted BIGINT;
  conversations_deleted BIGINT;
BEGIN
  -- If older_than_days provided, only delete old anonymized data
  -- Otherwise delete ALL anonymized data
  IF older_than_days IS NOT NULL THEN
    cutoff_date := NOW() - (older_than_days || ' days')::INTERVAL;
  END IF;

  -- Behavioral data
  IF older_than_days IS NOT NULL THEN
    DELETE FROM public.behavioral_data 
    WHERE user_id IS NULL AND timestamp < cutoff_date;
  ELSE
    DELETE FROM public.behavioral_data WHERE user_id IS NULL;
  END IF;
  GET DIAGNOSTICS behavioral_deleted = ROW_COUNT;

  -- Trades
  IF older_than_days IS NOT NULL THEN
    DELETE FROM public.trades 
    WHERE user_id IS NULL AND created_at < cutoff_date;
  ELSE
    DELETE FROM public.trades WHERE user_id IS NULL;
  END IF;
  GET DIAGNOSTICS trades_deleted = ROW_COUNT;

  -- Strategies
  IF older_than_days IS NOT NULL THEN
    DELETE FROM public.strategies 
    WHERE user_id IS NULL AND created_at < cutoff_date;
  ELSE
    DELETE FROM public.strategies WHERE user_id IS NULL;
  END IF;
  GET DIAGNOSTICS strategies_deleted = ROW_COUNT;

  -- Challenges
  IF older_than_days IS NOT NULL THEN
    DELETE FROM public.challenges 
    WHERE user_id IS NULL AND created_at < cutoff_date;
  ELSE
    DELETE FROM public.challenges WHERE user_id IS NULL;
  END IF;
  GET DIAGNOSTICS challenges_deleted = ROW_COUNT;

  -- Feedback
  IF older_than_days IS NOT NULL THEN
    DELETE FROM public.feedback 
    WHERE user_id IS NULL AND created_at < cutoff_date;
  ELSE
    DELETE FROM public.feedback WHERE user_id IS NULL;
  END IF;
  GET DIAGNOSTICS feedback_deleted = ROW_COUNT;

  -- Conversations
  IF older_than_days IS NOT NULL THEN
    DELETE FROM public.strategy_conversations 
    WHERE user_id IS NULL AND created_at < cutoff_date;
  ELSE
    DELETE FROM public.strategy_conversations WHERE user_id IS NULL;
  END IF;
  GET DIAGNOSTICS conversations_deleted = ROW_COUNT;

  -- Return summary
  RETURN QUERY
  SELECT 'behavioral_data'::TEXT, behavioral_deleted
  UNION ALL
  SELECT 'trades'::TEXT, trades_deleted
  UNION ALL
  SELECT 'strategies'::TEXT, strategies_deleted
  UNION ALL
  SELECT 'challenges'::TEXT, challenges_deleted
  UNION ALL
  SELECT 'feedback'::TEXT, feedback_deleted
  UNION ALL
  SELECT 'conversations'::TEXT, conversations_deleted;
END;
$$;

-- Restrict to service_role only (admin/SQL Editor)
REVOKE ALL ON FUNCTION public.purge_anonymized_data(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_anonymized_data(INTEGER) TO service_role;

COMMENT ON FUNCTION public.purge_anonymized_data IS 
'Deletes anonymized data. Pass older_than_days to only delete old data, or NULL to delete all. Service role only.';

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Delete ALL anonymized data (nuclear option):
-- SELECT * FROM purge_anonymized_data(NULL);

-- Delete anonymized data older than 365 days:
-- SELECT * FROM purge_anonymized_data(365);

-- Delete anonymized data older than 90 days:
-- SELECT * FROM purge_anonymized_data(90);

-- Preview what would be deleted (older than 365 days):
-- SELECT 
--   'behavioral_data' as table_name,
--   COUNT(*) as would_delete
-- FROM behavioral_data 
-- WHERE user_id IS NULL AND timestamp < NOW() - INTERVAL '365 days'
-- UNION ALL
-- SELECT 'trades', COUNT(*) FROM trades 
-- WHERE user_id IS NULL AND created_at < NOW() - INTERVAL '365 days'
-- UNION ALL
-- SELECT 'strategies', COUNT(*) FROM strategies 
-- WHERE user_id IS NULL AND created_at < NOW() - INTERVAL '365 days'
-- UNION ALL
-- SELECT 'challenges', COUNT(*) FROM challenges 
-- WHERE user_id IS NULL AND created_at < NOW() - INTERVAL '365 days'
-- UNION ALL
-- SELECT 'feedback', COUNT(*) FROM feedback 
-- WHERE user_id IS NULL AND created_at < NOW() - INTERVAL '365 days'
-- UNION ALL
-- SELECT 'conversations', COUNT(*) FROM strategy_conversations 
-- WHERE user_id IS NULL AND created_at < NOW() - INTERVAL '365 days';

-- ============================================
-- RECOMMENDED APPROACH
-- ============================================
-- 1. Keep anonymized data for 1-2 years minimum (ML training needs time series)
-- 2. Set up scheduled purge via pg_cron or external job:
--    - Run monthly: SELECT * FROM purge_anonymized_data(730); -- Delete 2+ year old data
-- 3. Only use nuclear option (NULL) in development/testing
