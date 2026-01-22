/**
 * Verify Migration 024 Applied
 * 
 * Run this to check if the activation columns exist in the database.
 * 
 * Usage:
 *   node --env-file=.env.local scripts/verify-migration-024.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Checking if migration 024 columns exist...\n');

  try {
    // Try to select the new columns
    const { data, error } = await supabase
      .from('strategies')
      .select('id, is_active, activated_at, deactivated_at, execution_server_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Migration 024 NOT applied');
        console.log('\nMissing columns detected. Error:', error.message);
        console.log('\n📝 To fix, run:');
        console.log('   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/ryxohicxjdcdnjhwgvgp/sql');
        console.log('   2. Copy/paste the contents of: supabase/migrations/024_add_activation_fields.sql');
        console.log('   3. Click "Run"');
        return false;
      } else {
        console.error('❌ Unexpected error:', error);
        return false;
      }
    }

    console.log('✅ Migration 024 successfully applied!');
    console.log('\nColumns found:');
    console.log('   - is_active');
    console.log('   - activated_at');
    console.log('   - deactivated_at');
    console.log('   - execution_server_id');
    
    if (data && data.length > 0) {
      console.log('\nSample row:');
      console.log(JSON.stringify(data[0], null, 2));
    }

    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
