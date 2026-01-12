-- ============================================
-- ACCOUNT DELETION SYSTEM
-- ============================================
-- Enables proper account deletion with data anonymization
-- MOAT data (behavioral_data, trades, strategies, challenges) is anonymized (user_id = NULL)
-- PII data is hard deleted
--
-- Created: January 12, 2026
-- ============================================

-- ============================================
-- STEP 1: Make user_id nullable in MOAT tables
-- ============================================
-- These tables preserve anonymized data for ML training

ALTER TABLE public.behavioral_data 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.trades 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.strategies 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.challenges 
ALTER COLUMN user_id DROP NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN public.behavioral_data.user_id IS 
'User ID - NULL indicates anonymized data from deleted accounts (THE MOAT)';

COMMENT ON COLUMN public.trades.user_id IS 
'User ID - NULL indicates anonymized data from deleted accounts';

COMMENT ON COLUMN public.strategies.user_id IS 
'User ID - NULL indicates anonymized data from deleted accounts';

COMMENT ON COLUMN public.challenges.user_id IS 
'User ID - NULL indicates anonymized data from deleted accounts';

-- ============================================
-- STEP 2: Update RLS policies for anonymized data
-- ============================================

-- Behavioral data: Users see their own, NULL is invisible to all
DROP POLICY IF EXISTS "Users can insert own behavioral data" ON public.behavioral_data;
DROP POLICY IF EXISTS "Users can view own behavioral data" ON public.behavioral_data;

CREATE POLICY "Users can insert own behavioral data" 
ON public.behavioral_data FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own behavioral data" 
ON public.behavioral_data FOR SELECT 
USING (auth.uid() = user_id);
-- NULL will never match auth.uid(), so anonymized data is invisible to regular users

-- Trades: Same pattern
DROP POLICY IF EXISTS "Users can CRUD own trades" ON public.trades;

CREATE POLICY "Users can CRUD own trades" 
ON public.trades FOR ALL 
USING (auth.uid() = user_id);

-- Strategies: Same pattern
DROP POLICY IF EXISTS "Users can CRUD own strategies" ON public.strategies;

CREATE POLICY "Users can CRUD own strategies" 
ON public.strategies FOR ALL 
USING (auth.uid() = user_id);

-- Challenges: Same pattern
DROP POLICY IF EXISTS "Users can CRUD own challenges" ON public.challenges;

CREATE POLICY "Users can CRUD own challenges" 
ON public.challenges FOR ALL 
USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: Account deletion function
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- ========================================
  -- STEP A: HARD DELETE (PII and credentials)
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
  
  -- ========================================
  -- STEP C: DELETE auth records
  -- ========================================
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  
  -- Delete profile (this will cascade if needed)
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete auth user last
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting user account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_user_account IS 
'Deletes user account: Hard deletes PII (profile, broker connections, messages). 
Anonymizes MOAT data (behavioral_data, trades, strategies, challenges) by setting user_id=NULL.
This preserves valuable patterns for ML while respecting user privacy.';

-- ============================================
-- STEP 4: Helpful views for analytics
-- ============================================

-- View: Active vs Anonymized data counts
CREATE OR REPLACE VIEW public.data_anonymization_stats AS
SELECT 
  'behavioral_data' as table_name,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as active_records,
  COUNT(*) FILTER (WHERE user_id IS NULL) as anonymized_records
FROM public.behavioral_data
UNION ALL
SELECT 
  'trades',
  COUNT(*) FILTER (WHERE user_id IS NOT NULL),
  COUNT(*) FILTER (WHERE user_id IS NULL)
FROM public.trades
UNION ALL
SELECT 
  'strategies',
  COUNT(*) FILTER (WHERE user_id IS NOT NULL),
  COUNT(*) FILTER (WHERE user_id IS NULL)
FROM public.strategies
UNION ALL
SELECT 
  'challenges',
  COUNT(*) FILTER (WHERE user_id IS NOT NULL),
  COUNT(*) FILTER (WHERE user_id IS NULL)
FROM public.challenges;

-- Grant access to this view (admin use)
-- No RLS needed - this is aggregate counts only
