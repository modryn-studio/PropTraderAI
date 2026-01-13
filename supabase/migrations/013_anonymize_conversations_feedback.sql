-- ============================================
-- ANONYMIZE CONVERSATIONS & FEEDBACK
-- ============================================
-- Preserves product intelligence data for ML training
-- Previously these were hard deleted - now anonymized
--
-- Created: January 13, 2026
-- ============================================

-- ============================================
-- STEP 1: Make user_id nullable
-- ============================================

ALTER TABLE public.feedback 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.strategy_conversations 
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.feedback.user_id IS 
'User ID - NULL indicates anonymized feedback from deleted accounts (product intelligence)';

COMMENT ON COLUMN public.strategy_conversations.user_id IS 
'User ID - NULL indicates anonymized conversations from deleted accounts (training data for Claude)';

-- ============================================
-- STEP 2: Update RLS policies
-- ============================================

-- Feedback: Users can only see their own
DROP POLICY IF EXISTS "Users can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;

CREATE POLICY "Users can create feedback" 
ON public.feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" 
ON public.feedback FOR SELECT 
USING (auth.uid() = user_id);

-- Strategy conversations: Same pattern  
DROP POLICY IF EXISTS "Users can CRUD own conversations" ON public.strategy_conversations;

CREATE POLICY "Users can CRUD own conversations" 
ON public.strategy_conversations FOR ALL 
USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: Update delete_user_account function
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
  -- STEP A: HARD DELETE (PII and credentials only)
  -- ========================================
  DELETE FROM public.broker_connections WHERE user_id = target_user_id;
  DELETE FROM public.screenshot_analyses WHERE user_id = target_user_id;
  DELETE FROM public.chat_messages WHERE user_id = target_user_id;
  DELETE FROM public.trading_rules WHERE user_id = target_user_id;
  
  -- ========================================
  -- STEP B: ANONYMIZE (preserve ALL product intelligence)
  -- This is THE MOAT - keep everything for ML training
  -- ========================================
  
  -- Behavioral data
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
  
  -- NEW: Feedback anonymization (product intelligence)
  UPDATE public.feedback
  SET user_id = NULL
  WHERE user_id = target_user_id;
  
  -- NEW: Strategy conversations anonymization (training data)
  UPDATE public.strategy_conversations
  SET user_id = NULL
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
