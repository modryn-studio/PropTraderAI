/**
 * Cleanup Test Data Script
 * 
 * Deletes all test data from the database while preserving user accounts.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-test-data.ts
 * 
 * What gets deleted:
 *   - All strategies
 *   - All strategy conversations
 *   - All feedback
 *   - All user profiles (but keeps auth.users)
 * 
 * What's preserved:
 *   - User accounts (auth.users)
 * 
 * @module scripts/cleanup-test-data
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================================

try {
  const envPath = join(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
} catch (error) {
  console.warn('⚠️  Could not load .env.local file, using existing env vars');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

async function deleteStrategies() {
  console.log('\n📦 Deleting strategies...');
  const { error, count } = await supabase
    .from('strategies')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)
  
  if (error) {
    console.error('❌ Error deleting strategies:', error.message);
    return 0;
  }
  
  console.log(`✅ Deleted ${count || 'all'} strategies`);
  return count || 0;
}

async function deleteStrategyConversations() {
  console.log('\n💬 Deleting strategy conversations...');
  const { error, count } = await supabase
    .from('strategy_conversations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('❌ Error deleting conversations:', error.message);
    return 0;
  }
  
  console.log(`✅ Deleted ${count || 'all'} conversations`);
  return count || 0;
}

async function deleteFeedback() {
  console.log('\n💭 Deleting feedback...');
  const { error, count } = await supabase
    .from('feedback')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('❌ Error deleting feedback:', error.message);
    return 0;
  }
  
  console.log(`✅ Deleted ${count || 'all'} feedback entries`);
  return count || 0;
}

async function deleteProfiles() {
  console.log('\n👤 Deleting user profiles...');
  const { error, count } = await supabase
    .from('profiles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('❌ Error deleting profiles:', error.message);
    return 0;
  }
  
  console.log(`✅ Deleted ${count || 'all'} profiles`);
  return count || 0;
}

async function getUserCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Error counting users:', error.message);
    return 0;
  }
  
  return count || 0;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🧹 PropTraderAI Test Data Cleanup');
  console.log('=====================================\n');
  
  // Get initial counts
  const userCount = await getUserCount();
  console.log(`📊 Current users: ${userCount}`);
  
  // Confirm
  console.log('\n⚠️  This will delete ALL test data (strategies, conversations, feedback)');
  console.log('⚠️  User accounts will be PRESERVED');
  console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Delete data
  const strategiesDeleted = await deleteStrategies();
  const conversationsDeleted = await deleteStrategyConversations();
  const feedbackDeleted = await deleteFeedback();
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 Cleanup Summary');
  console.log('=====================================');
  console.log(`Strategies deleted:      ${strategiesDeleted}`);
  console.log(`Conversations deleted:   ${conversationsDeleted}`);
  console.log(`Feedback deleted:        ${feedbackDeleted}`);
  console.log(`Users preserved:         ${userCount}`);
  console.log('=====================================');
  console.log('✨ Cleanup complete!\n');
}

main().catch(console.error);
