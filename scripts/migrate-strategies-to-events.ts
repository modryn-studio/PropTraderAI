/**
 * Migration Script: Convert Legacy Strategies to Event-Sourced Format
 * 
 * This script migrates existing strategies from `parsed_rules` JSONB to the
 * event-sourced format with `events` + `canonical_rules` columns.
 * 
 * Usage:
 *   npx tsx scripts/migrate-strategies-to-events.ts
 * 
 * Prerequisites:
 *   - Run migration 012_add_event_sourcing.sql first
 *   - .env.local file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 
 * @module scripts/migrate-strategies-to-events
 * @see Issue #50 - Strategy Editing System Architecture
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { claudeToCanonical, type ClaudeStrategyOutput } from '../src/lib/strategy/claudeToCanonical';
import { generateEventsFromCanonical, type StrategyEvent } from '../src/lib/strategy/eventStore';
import type { CanonicalParsedRules } from '../src/lib/execution/canonical-schema';

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
// TYPES
// ============================================================================

interface LegacyStrategy {
  id: string;
  user_id: string;
  name: string;
  natural_language: string;
  parsed_rules: Record<string, unknown>;
  format_version: string | null;
  created_at: string;
  updated_at: string;
}

interface MigrationResult {
  id: string;
  name: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  pattern?: string;
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

/**
 * Extract instrument from legacy parsed_rules
 */
function extractInstrument(parsedRules: Record<string, unknown>): string {
  // Check various possible locations
  if (typeof parsedRules.instrument === 'string') {
    return parsedRules.instrument;
  }
  
  // Check if it's in a nested rules array
  if (Array.isArray(parsedRules.rules)) {
    const instrumentRule = parsedRules.rules.find(
      (r: { category?: string; label?: string; value?: string }) => 
        r.category === 'setup' && r.label?.toLowerCase() === 'instrument'
    );
    if (instrumentRule?.value) {
      return instrumentRule.value;
    }
  }
  
  // Default to ES
  return 'ES';
}

/**
 * Migrate a single strategy to event-sourced format
 */
async function migrateStrategy(strategy: LegacyStrategy): Promise<MigrationResult> {
  const { id, name, natural_language, parsed_rules, format_version, created_at } = strategy;
  
  // Skip if already migrated
  if (format_version === 'events_v1') {
    return { id, name, status: 'skipped', reason: 'Already migrated to events_v1' };
  }

  // Skip if already in canonical format (just needs events added)
  if (format_version === 'canonical_v1') {
    // Canonical rules are in parsed_rules (old save route behavior)
    const canonicalRules = parsed_rules as unknown as CanonicalParsedRules;
    
    try {
      const events = generateEventsFromCanonical(
        canonicalRules,
        created_at,
        natural_language
      );
      
      const { error } = await supabase
        .from('strategies')
        .update({
          events,
          canonical_rules: canonicalRules,
          format_version: 'events_v1',
          event_version: 1,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return { 
        id, 
        name, 
        status: 'success', 
        pattern: canonicalRules.pattern,
        reason: 'Migrated from canonical_v1' 
      };
    } catch (err) {
      return { 
        id, 
        name, 
        status: 'failed', 
        reason: `Error migrating canonical: ${(err as Error).message}` 
      };
    }
  }

  // Legacy format - needs full normalization
  try {
    const instrument = extractInstrument(parsed_rules);
    
    // Build Claude output format for normalizer
    const claudeOutput: ClaudeStrategyOutput = {
      strategy_name: name,
      summary: natural_language,
      parsed_rules: {
        entry_conditions: parsed_rules.entry_conditions as never[] || [],
        exit_conditions: parsed_rules.exit_conditions as never[] || [],
        filters: parsed_rules.filters as never[] || [],
        position_sizing: parsed_rules.position_sizing as never || { method: 'risk_percent', value: 1 },
      },
      instrument,
    };
    
    // Try to normalize to canonical
    const normResult = claudeToCanonical(claudeOutput);
    
    if (!normResult.success) {
      return { 
        id, 
        name, 
        status: 'failed', 
        reason: `Normalization failed: ${normResult.errors.join(', ')}` 
      };
    }
    
    // Generate events from canonical
    const events = generateEventsFromCanonical(
      normResult.canonical,
      created_at,
      natural_language
    );
    
    // Update strategy with event-sourced format
    const { error } = await supabase
      .from('strategies')
      .update({
        events,
        canonical_rules: normResult.canonical,
        format_version: 'events_v1',
        event_version: 1,
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return { 
      id, 
      name, 
      status: 'success', 
      pattern: normResult.canonical.pattern,
      reason: 'Migrated from legacy format' 
    };
    
  } catch (err) {
    return { 
      id, 
      name, 
      status: 'failed', 
      reason: `Error: ${(err as Error).message}` 
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Strategy Migration: Legacy → Event-Sourced');
  console.log('=============================================\n');
  
  // Fetch all strategies that need migration
  const { data: strategies, error } = await supabase
    .from('strategies')
    .select('id, user_id, name, natural_language, parsed_rules, format_version, created_at, updated_at')
    .or('format_version.is.null,format_version.neq.events_v1')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Failed to fetch strategies:', error.message);
    process.exit(1);
  }
  
  if (!strategies || strategies.length === 0) {
    console.log('✅ No strategies need migration.');
    return;
  }
  
  console.log(`📊 Found ${strategies.length} strategies to process\n`);
  
  const results: MigrationResult[] = [];
  
  for (const strategy of strategies) {
    console.log(`Processing: ${strategy.name} (${strategy.id})`);
    const result = await migrateStrategy(strategy as LegacyStrategy);
    results.push(result);
    
    const statusEmoji = {
      success: '✅',
      skipped: '⏭️',
      failed: '❌',
    }[result.status];
    
    console.log(`  ${statusEmoji} ${result.status}: ${result.reason || ''}`);
    if (result.pattern) {
      console.log(`     Pattern: ${result.pattern}`);
    }
  }
  
  // Summary
  console.log('\n=============================================');
  console.log('📊 Migration Summary');
  console.log('=============================================');
  
  const success = results.filter(r => r.status === 'success').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  console.log(`✅ Success: ${success}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`❌ Failed:  ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed strategies:');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`   - ${r.name}: ${r.reason}`));
  }
  
  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
