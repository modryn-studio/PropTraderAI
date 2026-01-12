-- ============================================
-- STRATEGY BUILDER TEST - MONITORING QUERIES
-- ============================================
-- Run these queries in Supabase SQL Editor while testing
-- Replace 'YOUR_EMAIL' with your test user email
-- 
-- Purpose: Track what's happening in real-time as you test
-- ============================================

-- ============================================
-- 1. GET YOUR USER ID (Run this first!)
-- ============================================
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';

-- Copy the user_id from above and use it in queries below
-- Or use this variable approach:
-- \set user_id 'PASTE-YOUR-UUID-HERE'

-- ============================================
-- 2. VERIFY NEW USER SETUP
-- ============================================
-- After signup, all 3 should have records:

-- Check auth.users
SELECT * FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';

-- Check auth.identities (should have 1 email identity)
SELECT * FROM auth.identities WHERE email = 'YOUR_EMAIL_HERE';

-- Check public.profiles (auto-created by trigger)
SELECT * FROM public.profiles WHERE email = 'YOUR_EMAIL_HERE';

-- ============================================
-- 3. MONITOR ACTIVE CONVERSATION
-- ============================================
-- Run this repeatedly as you chat

-- See latest conversation
SELECT 
  id as conversation_id,
  status,
  jsonb_array_length(messages) as message_count,
  strategy_id,
  last_activity,
  created_at
FROM strategy_conversations 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY last_activity DESC 
LIMIT 1;

-- ============================================
-- 4. VIEW CONVERSATION MESSAGES (EXPANDED)
-- ============================================
-- See full conversation history

WITH latest_conversation AS (
  SELECT id, messages 
  FROM strategy_conversations 
  WHERE user_id = 'YOUR_USER_ID_HERE'
  ORDER BY last_activity DESC 
  LIMIT 1
)
SELECT 
  (idx + 1) as message_number,
  msg->>'role' as role,
  msg->>'content' as content,
  msg->>'timestamp' as timestamp
FROM latest_conversation,
     jsonb_array_elements(messages) WITH ORDINALITY AS arr(msg, idx)
ORDER BY idx;

-- ============================================
-- 5. CHECK SUMMARY PANEL RULES (Frontend State)
-- ============================================
-- NOTE: Summary Panel rules are NOT in database until strategy is saved
-- This just shows what Claude has confirmed so far
-- Open browser DevTools Console and look for: [RuleExtraction] logs

-- But you CAN see accumulated rules in the conversation messages
-- Look for Claude's confirmation messages

-- ============================================
-- 6. MONITOR BEHAVIORAL EVENTS
-- ============================================
-- See all user actions in real-time

SELECT 
  event_type,
  event_data,
  timestamp
FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY timestamp DESC;

-- Count events by type
SELECT 
  event_type,
  COUNT(*) as count
FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY event_type
ORDER BY count DESC;

-- ============================================
-- 7. CHECK IF ANIMATION WAS GENERATED
-- ============================================
SELECT 
  event_data->>'type' as animation_type,
  event_data->>'direction' as direction,
  event_data->>'conversation_turn' as turn,
  event_data->>'time_to_generate_ms' as generation_time_ms,
  timestamp
FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID_HERE'
AND event_type = 'animation_generated'
ORDER BY timestamp DESC;

-- ============================================
-- 8. VERIFY STRATEGY SAVED
-- ============================================
-- After clicking "Save Strategy"

SELECT 
  id,
  name,
  status,
  autonomy_level,
  parsed_rules,
  natural_language,
  created_at
FROM strategies 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;

-- ============================================
-- 9. CHECK CONVERSATION COMPLETION
-- ============================================
-- After saving, conversation should be marked completed

SELECT 
  id,
  status,
  strategy_id,
  jsonb_array_length(messages) as final_message_count,
  last_activity
FROM strategy_conversations 
WHERE user_id = 'YOUR_USER_ID_HERE'
AND status = 'completed'
ORDER BY last_activity DESC;

-- ============================================
-- 10. VERIFY MESSAGES PROMOTED TO CHAT_MESSAGES
-- ============================================
-- After saving, messages should be in chat_messages table

SELECT 
  COUNT(*) as promoted_message_count
FROM chat_messages 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- See actual messages
SELECT 
  role,
  content,
  created_at
FROM chat_messages 
WHERE user_id = 'YOUR_USER_ID_HERE'
AND session_id = (
  SELECT id FROM strategy_conversations 
  WHERE user_id = 'YOUR_USER_ID_HERE'
  ORDER BY last_activity DESC 
  LIMIT 1
)
ORDER BY created_at;

-- ============================================
-- 11. FULL USER JOURNEY TIMELINE
-- ============================================
-- See everything that happened, in order

WITH user_timeline AS (
  -- Profile creation
  SELECT 
    'profile_created' as event,
    NULL as details,
    created_at as timestamp
  FROM profiles 
  WHERE id = 'YOUR_USER_ID_HERE'
  
  UNION ALL
  
  -- Conversations
  SELECT 
    'conversation_' || status as event,
    'messages: ' || jsonb_array_length(messages)::text as details,
    last_activity as timestamp
  FROM strategy_conversations 
  WHERE user_id = 'YOUR_USER_ID_HERE'
  
  UNION ALL
  
  -- Strategies
  SELECT 
    'strategy_saved' as event,
    name as details,
    created_at as timestamp
  FROM strategies 
  WHERE user_id = 'YOUR_USER_ID_HERE'
  
  UNION ALL
  
  -- Behavioral events
  SELECT 
    'behavioral_' || event_type as event,
    event_data::text as details,
    timestamp
  FROM behavioral_data 
  WHERE user_id = 'YOUR_USER_ID_HERE'
)
SELECT * FROM user_timeline
ORDER BY timestamp;

-- ============================================
-- 12. VALIDATION CHECK (Manual)
-- ============================================
-- Check if strategy has all required fields
-- This mimics frontend validation logic

WITH latest_strategy AS (
  SELECT parsed_rules 
  FROM strategies 
  WHERE user_id = 'YOUR_USER_ID_HERE'
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  CASE 
    WHEN parsed_rules ? 'instrument' THEN '✓ Instrument'
    ELSE '✗ Missing: Instrument'
  END as instrument_check,
  CASE 
    WHEN parsed_rules->'entry' IS NOT NULL THEN '✓ Entry'
    ELSE '✗ Missing: Entry'
  END as entry_check,
  CASE 
    WHEN parsed_rules->'exit'->'stop_loss' IS NOT NULL THEN '✓ Stop Loss'
    ELSE '✗ Missing: Stop Loss'
  END as stop_loss_check,
  CASE 
    WHEN parsed_rules->'exit'->'profit_target' IS NOT NULL THEN '✓ Profit Target'
    ELSE '✗ Missing: Profit Target'
  END as profit_target_check,
  CASE 
    WHEN parsed_rules->'risk'->'position_sizing' IS NOT NULL THEN '✓ Position Sizing'
    ELSE '✗ Missing: Position Sizing'
  END as position_sizing_check
FROM latest_strategy;

-- ============================================
-- 13. CLEANUP - DELETE TEST DATA (USE WITH CAUTION!)
-- ============================================
-- Only run this if you want to start completely fresh

-- Uncomment these lines to delete your test user:

-- DELETE FROM behavioral_data WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM chat_messages WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM strategies WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM strategy_conversations WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM profiles WHERE id = 'YOUR_USER_ID_HERE';
-- DELETE FROM auth.identities WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM auth.sessions WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM auth.refresh_tokens WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM auth.users WHERE id = 'YOUR_USER_ID_HERE';

-- ============================================
-- 14. QUICK HEALTH CHECK
-- ============================================
-- Run this to verify everything is working

SELECT 
  (SELECT COUNT(*) FROM auth.users WHERE email = 'YOUR_EMAIL_HERE') as auth_users,
  (SELECT COUNT(*) FROM auth.identities WHERE email = 'YOUR_EMAIL_HERE') as identities,
  (SELECT COUNT(*) FROM profiles WHERE email = 'YOUR_EMAIL_HERE') as profiles,
  (SELECT COUNT(*) FROM strategy_conversations WHERE user_id = 'YOUR_USER_ID_HERE') as conversations,
  (SELECT COUNT(*) FROM strategies WHERE user_id = 'YOUR_USER_ID_HERE') as strategies,
  (SELECT COUNT(*) FROM chat_messages WHERE user_id = 'YOUR_USER_ID_HERE') as chat_messages,
  (SELECT COUNT(*) FROM behavioral_data WHERE user_id = 'YOUR_USER_ID_HERE') as behavioral_events;

-- Expected after full test:
-- auth_users: 1
-- identities: 1
-- profiles: 1
-- conversations: 1+
-- strategies: 1+
-- chat_messages: multiple (one per conversation message)
-- behavioral_events: multiple

-- ============================================
-- 15. TROUBLESHOOTING QUERIES
-- ============================================

-- Find orphaned identities
SELECT * FROM auth.identities 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Check if handle_new_user trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check RLS policies
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'strategies', 'chat_messages', 'behavioral_data');

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
-- 
-- 1. Replace 'YOUR_EMAIL_HERE' with your test email
-- 2. Run query #1 to get your user_id
-- 3. Replace 'YOUR_USER_ID_HERE' with the UUID from step 2
-- 4. Run queries as you test to see real-time updates
-- 
-- Recommended order while testing:
-- - After signup: Run queries #2, #14
-- - While chatting: Run queries #3, #4, #6
-- - After animation: Run query #7
-- - After saving: Run queries #8, #9, #10
-- - Final verification: Run queries #11, #12, #14
-- 
-- ============================================
