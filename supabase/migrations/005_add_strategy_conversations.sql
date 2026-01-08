-- Migration: Add strategy_conversations table
-- Purpose: Stage conversations until strategy is complete, enable crash recovery
-- Created: January 8, 2026

-- ============================================
-- STRATEGY CONVERSATIONS (Staging Table)
-- ============================================
-- Conversations are staged here until strategy is confirmed.
-- This enables:
-- 1. Crash recovery (user can resume mid-conversation)
-- 2. Abandonment tracking (behavioral data for PATH 2)
-- 3. Clean chat_messages table (only successful strategies)

CREATE TABLE public.strategy_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Conversation content stored as JSONB array
  -- Each message: { role: 'user'|'assistant', content: string, timestamp: string }
  messages JSONB[] NOT NULL DEFAULT '{}',
  
  -- Link to final strategy (null until saved)
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  
  -- Conversation status
  -- 'in_progress': Active conversation
  -- 'completed': Strategy saved successfully
  -- 'stale': No activity for 7+ days (still recoverable)
  status TEXT NOT NULL DEFAULT 'in_progress' 
    CHECK (status IN ('in_progress', 'completed', 'stale')),
  
  -- Track last activity for stale detection
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Phase 2: Strategy versioning support
  -- When editing an existing strategy, reference the original
  parent_strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  edit_reason TEXT, -- Why user wanted to modify (Phase 2)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Fast lookup by user for "resume conversation" feature
CREATE INDEX idx_strategy_conversations_user 
  ON public.strategy_conversations(user_id, status, last_activity DESC);

-- Find stale conversations for nightly cleanup
CREATE INDEX idx_strategy_conversations_stale 
  ON public.strategy_conversations(status, last_activity) 
  WHERE status = 'in_progress';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.strategy_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations" 
  ON public.strategy_conversations
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations" 
  ON public.strategy_conversations
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations" 
  ON public.strategy_conversations
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations" 
  ON public.strategy_conversations
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE TRIGGER update_strategy_conversations_updated_at 
  BEFORE UPDATE ON public.strategy_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STALE CONVERSATION MARKING (Nightly Job)
-- ============================================

-- Function to mark conversations as stale after 7 days of inactivity
-- Run via Supabase scheduled function or external cron
CREATE OR REPLACE FUNCTION mark_stale_conversations()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.strategy_conversations
  SET status = 'stale',
      updated_at = NOW()
  WHERE status = 'in_progress'
    AND last_activity < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROMOTION TO CHAT_MESSAGES (After Strategy Save)
-- ============================================

-- Function to promote staged messages to permanent chat_messages table
-- Called after strategy is successfully saved
CREATE OR REPLACE FUNCTION promote_conversation_to_chat_messages(
  p_conversation_id UUID,
  p_strategy_id UUID
)
RETURNS void AS $$
DECLARE
  conv_record RECORD;
  msg JSONB;
  msg_role TEXT;
BEGIN
  -- Get the conversation
  SELECT * INTO conv_record 
  FROM public.strategy_conversations 
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found: %', p_conversation_id;
  END IF;
  
  -- Insert each message into chat_messages
  FOREACH msg IN ARRAY conv_record.messages
  LOOP
    -- Map role string to enum
    msg_role := msg->>'role';
    
    INSERT INTO public.chat_messages (
      user_id,
      session_id,
      role,
      content,
      metadata,
      created_at
    ) VALUES (
      conv_record.user_id,
      p_conversation_id, -- Use conversation ID as session ID
      msg_role::message_role,
      msg->>'content',
      jsonb_build_object(
        'strategy_id', p_strategy_id,
        'original_timestamp', msg->>'timestamp'
      ),
      COALESCE((msg->>'timestamp')::timestamptz, NOW())
    );
  END LOOP;
  
  -- Update conversation status
  UPDATE public.strategy_conversations
  SET status = 'completed',
      strategy_id = p_strategy_id,
      updated_at = NOW()
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER: Get Active Conversation for User
-- ============================================

-- Returns the most recent in-progress conversation for a user
-- Used for "resume where you left off" feature
CREATE OR REPLACE FUNCTION get_active_conversation(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  messages JSONB[],
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.messages,
    sc.last_activity,
    sc.created_at
  FROM public.strategy_conversations sc
  WHERE sc.user_id = p_user_id
    AND sc.status = 'in_progress'
  ORDER BY sc.last_activity DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
