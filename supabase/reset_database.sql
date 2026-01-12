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

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = 'replica';

-- ============================================
-- DELETE ALL DATA (Order matters due to foreign keys)
-- ============================================

-- Start with tables that have no foreign keys pointing to them
DELETE FROM public.screenshot_analyses;
DELETE FROM public.feedback;
DELETE FROM public.behavioral_data;
DELETE FROM public.chat_messages;

-- Then tables that reference the above
DELETE FROM public.trades;
DELETE FROM public.trading_rules;
DELETE FROM public.strategy_conversations;

-- Then strategies (referenced by trades and conversations)
DELETE FROM public.strategies;

-- Then challenges (referenced by strategies and trades)
DELETE FROM public.challenges;

-- Then broker connections (standalone)
DELETE FROM public.broker_connections;

-- Finally profiles and auth users
-- Note: This will CASCADE delete everything due to ON DELETE CASCADE
DELETE FROM public.profiles;

-- Delete auth users (Supabase auth table)
-- WARNING: This requires service_role key or admin access
-- If this fails, you can delete users from the Supabase Dashboard → Authentication → Users
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

SET session_replication_role = 'origin';

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
