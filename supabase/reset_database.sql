-- ============================================
-- RESET DATABASE - DELETE ALL DATA
-- ============================================
-- 
-- PURPOSE: Clean slate for testing
-- WARNING: This deletes ALL user data from all tables
-- 
-- HOW TO USE:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" button
-- 4. Confirm you want to delete everything
--
-- WHAT THIS DOES:
-- - Deletes all data from all tables
-- - Preserves table structure (no schema changes)
-- - Resets sequences/auto-increment
-- - Leaves prop_firms data intact (reference data)
-- 
-- Created: January 11, 2026
-- ============================================

-- ============================================
-- DELETE ALL DATA (More aggressive approach)
-- ============================================

-- Option 1: Use TRUNCATE CASCADE (fastest, cleanest)
-- TRUNCATE removes all data and resets sequences
-- CASCADE automatically handles foreign key dependencies

TRUNCATE TABLE 
  public.screenshot_analyses,
  public.feedback,
  public.behavioral_data,
  public.chat_messages,
  public.trades,
  public.trading_rules,
  public.strategy_conversations,
  public.strategies,
  public.challenges,
  public.broker_connections,
  public.profiles
RESTART IDENTITY CASCADE;

-- Delete auth users separately (Supabase auth table)
-- This table is in the 'auth' schema, not 'public'
-- WARNING: This requires service_role key or admin access
-- If this fails, manually delete users from: Supabase Dashboard → Authentication → Users
DELETE FROM auth.users;

-- ============================================
-- RE-SEED PROP FIRMS (Reference Data)
-- ============================================

-- Don't delete prop_firms - it's reference data
-- If you DO want to reset it:
-- DELETE FROM public.prop_firms;
-- Then re-run: supabase/seed_data/01_prop_firms.sql

-- ============================================
-- RE-ENABLE TRIGGERS
-- ============================================

-- Not needed with TRUNCATE approach
-- SET session_replication_role = 'origin';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment these to verify the database is clean:

-- SELECT COUNT(*) as profiles FROM public.profiles;
-- SELECT COUNT(*) as strategies FROM public.strategies;
-- SELECT COUNT(*) as trades FROM public.trades;
-- SELECT COUNT(*) as challenges FROM public.challenges;
-- SELECT COUNT(*) as behavioral_data FROM public.behavioral_data;
-- SELECT COUNT(*) as chat_messages FROM public.chat_messages;
-- SELECT COUNT(*) as conversations FROM public.strategy_conversations;
-- SELECT COUNT(*) as feedback FROM public.feedback;
-- SELECT COUNT(*) as auth_users FROM auth.users;

-- ============================================
-- RESET COMPLETE
-- ============================================

-- You should see:
-- ✓ All tables empty (except prop_firms)
-- ✓ No auth users
-- ✓ Schema intact
-- ✓ Ready for fresh testing

SELECT 'Database reset complete. All data deleted.' as status;
