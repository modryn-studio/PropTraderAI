/**
 * RULE EXTRACTOR V3 - SIMPLIFIED
 * 
 * Claude now uses the update_rule tool to stream rules in real-time.
 * This file is simplified to only handle:
 * 1. Instant instrument detection from user messages (before Claude responds)
 * 2. Rule accumulation (merging rules without duplicates)
 * 3. Final mapping of parsedRules to StrategyRule format
 * 
 * All regex-based extraction from Claude responses has been removed.
 * Claude's update_rule tool is now the source of truth for rule confirmations.
 */

// ============================================================================
// DEBUG LOGGING (Conditional)
// ============================================================================

const DEBUG_EXTRACTION = process.env.NODE_ENV === 'development' || 
                         process.env.NEXT_PUBLIC_DEBUG_RULES === 'true';

function debugLog(message: string, data?: unknown) {
  if (DEBUG_EXTRACTION) {
    console.log(`[RuleExtractor] ${message}`, data || '');
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyRule {
  label: string;
  value: string;
  category: 'setup' | 'entry' | 'exit' | 'risk' | 'timeframe' | 'filters';
}

// ============================================================================
// SMART ACCUMULATION
// ============================================================================

/**
 * Normalize label for consistent matching
 * - Lowercase
 * - Remove punctuation (Stop-Loss → stop loss)
 * - Collapse whitespace
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[-_]/g, ' ')  // Hyphens/underscores to spaces
    .replace(/[^a-z0-9\s]/g, '')  // Remove other punctuation
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .trim();
}

/**
 * Check if a label represents a profit target (handles various notations)
 */
function isTargetLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  return normalized.includes('target') || 
         normalized.includes('profit') || 
         normalized.includes('r r') ||  // "R:R" after normalization
         normalized.includes('risk reward') ||
         normalized.includes('reward');
}

/**
 * Accumulate rules intelligently:
 * - Merge new rules with existing
 * - Update existing rules (same category + normalized label) with new value
 * - Special handling for target/profit rules (treat all variants as same)
 * - No duplicates
 */
export function accumulateRules(
  existingRules: StrategyRule[],
  newRules: StrategyRule[]
): StrategyRule[] {
  if (newRules.length === 0) return existingRules;
  if (existingRules.length === 0) return newRules;
  
  // Create map of existing rules by normalized category:label
  const ruleMap = new Map<string, StrategyRule>();
  
  existingRules.forEach(rule => {
    // Special case: all target-related labels map to same key
    const labelKey = isTargetLabel(rule.label) ? 'target' : normalizeLabel(rule.label);
    const key = `${rule.category}:${labelKey}`;
    ruleMap.set(key, rule);
  });
  
  // Add/update with new rules (overwrites if exists = update behavior)
  newRules.forEach(rule => {
    const labelKey = isTargetLabel(rule.label) ? 'target' : normalizeLabel(rule.label);
    const key = `${rule.category}:${labelKey}`;
    ruleMap.set(key, rule);
  });
  
  const result = Array.from(ruleMap.values());
  
  debugLog(
    `Accumulated: ${existingRules.length} existing + ${newRules.length} new = ${result.length} total`,
    { existingRules, newRules, result }
  );
  
  return result;
}

// ============================================================================
// INSTANT USER MESSAGE EXTRACTION (Instrument Only)
// ============================================================================

/**
 * Extract rules from a message based on role and content
 * 
 * V3 SIMPLIFIED:
 * - For USER messages: Only extract instrument (instant feedback before Claude responds)
 * - For ASSISTANT messages: No extraction (Claude uses update_rule tool instead)
 * 
 * @param message - Message content
 * @param role - 'user' or 'assistant'
 * @param existingRules - Current accumulated rules
 * @returns Updated rules array
 */
export function extractFromMessage(
  message: string,
  role: 'user' | 'assistant',
  existingRules: StrategyRule[]
): StrategyRule[] {
  // Only extract from user messages (instant instrument detection)
  if (role === 'user') {
    const rules: StrategyRule[] = [];
    
    // Instrument detection (simple regex - just the instrument symbol)
    const instrumentMatch = message.match(/\b(NQ|ES|MNQ|MES|YM|RTY|CL|GC)\b/i);
    if (instrumentMatch) {
      rules.push({
        category: 'setup',
        label: 'Instrument',
        value: instrumentMatch[1].toUpperCase()
      });
      debugLog('Extracted instrument from user message:', instrumentMatch[1].toUpperCase());
    }
    
    // Let Claude handle everything else via update_rule tool
    return accumulateRules(existingRules, rules);
  }
  
  // Claude messages handled by update_rule tool - no extraction needed
  return existingRules;
}

// ============================================================================
// FINAL MAPPING (for mapParsedRulesToStrategyRules)
// ============================================================================

interface ParsedRules {
  entry_conditions?: Array<{
    indicator?: string;
    condition?: string;
    value?: number | string;
    period?: number;
    direction?: string;
  }>;
  exit_conditions?: Array<{
    type?: string;
    value?: number | string;
    unit?: string;
  }>;
  filters?: Array<{
    type?: string;
    indicator?: string;
    condition?: string;
    value?: number | string;
    start?: string;
    end?: string;
    period?: number;
  }>;
  position_sizing?: {
    method?: string;
    value?: number;
    max_contracts?: number;
  };
  time_restrictions?: {
    trading_hours?: {
      start?: string;
      end?: string;
    };
    session?: string;
    days?: string[];
  };
  direction?: 'long' | 'short' | 'both';
  strategy_type?: string;
}

/**
 * Map parsed rules from API to StrategyRule format
 * Used for final state after strategy is complete
 */
export function mapParsedRulesToStrategyRules(
  parsedRules: ParsedRules,
  strategyName?: string,
  instrument?: string
): StrategyRule[] {
  const rules: StrategyRule[] = [];

  if (strategyName) {
    rules.push({
      label: 'Strategy',
      value: strategyName,
      category: 'setup',
    });
  }

  if (instrument) {
    rules.push({
      label: 'Instrument',
      value: instrument.toUpperCase(),
      category: 'setup',
    });
  }

  if (parsedRules.direction) {
    rules.push({
      label: 'Direction',
      value: parsedRules.direction === 'both' 
        ? 'Long and Short' 
        : parsedRules.direction.charAt(0).toUpperCase() + parsedRules.direction.slice(1) + ' only',
      category: 'setup',
    });
  }

  if (parsedRules.strategy_type) {
    rules.push({
      label: 'Pattern',
      value: parsedRules.strategy_type,
      category: 'setup',
    });
  }

  parsedRules.entry_conditions?.forEach((entry, index) => {
    let value = '';
    if (entry.indicator && entry.condition) {
      value = `${entry.indicator}${entry.period ? ` (${entry.period})` : ''} ${entry.condition} ${entry.value ?? ''}`.trim();
    } else if (entry.direction) {
      value = `Break ${entry.direction}`;
    }
    
    if (value) {
      rules.push({
        label: index === 0 ? 'Entry Trigger' : 'Entry Condition',
        value,
        category: 'entry',
      });
    }
  });

  parsedRules.exit_conditions?.forEach((exit) => {
    if (exit.type === 'stop_loss') {
      rules.push({
        label: 'Stop Loss',
        value: `${exit.value}${exit.unit ? ` ${exit.unit}` : ''}`,
        category: 'risk',
      });
    } else if (exit.type === 'take_profit' || exit.type === 'target') {
      rules.push({
        label: 'Target',
        value: `${exit.value}${exit.unit ? ` ${exit.unit}` : ''}`,
        category: 'exit',
      });
    } else if (exit.type === 'risk_reward') {
      rules.push({
        label: 'Risk:Reward',
        value: `${exit.value}`,
        category: 'risk',
      });
    }
  });

  parsedRules.filters?.forEach((filter) => {
    if (filter.type === 'indicator' && filter.indicator) {
      rules.push({
        label: `${filter.indicator} Filter`,
        value: `${filter.condition || ''} ${filter.value ?? ''}`.trim(),
        category: 'filters',
      });
    } else if (filter.type === 'time_window') {
      rules.push({
        label: 'Time Filter',
        value: `${filter.start} - ${filter.end}`,
        category: 'timeframe',
      });
    }
  });

  if (parsedRules.position_sizing) {
    const ps = parsedRules.position_sizing;
    if (ps.method === 'risk_percent' && ps.value) {
      rules.push({
        label: 'Position Size',
        value: `${ps.value}% risk per trade`,
        category: 'risk',
      });
    } else if (ps.method === 'fixed' && ps.max_contracts) {
      rules.push({
        label: 'Position Size',
        value: `${ps.max_contracts} contract${ps.max_contracts > 1 ? 's' : ''}`,
        category: 'risk',
      });
    }
  }

  if (parsedRules.time_restrictions) {
    const tr = parsedRules.time_restrictions;
    if (tr.session) {
      rules.push({
        label: 'Session',
        value: tr.session === 'RTH' ? 'RTH (9:30 AM - 4:00 PM ET)' : tr.session,
        category: 'timeframe',
      });
    }
    if (tr.trading_hours?.start && tr.trading_hours?.end) {
      rules.push({
        label: 'Trading Hours',
        value: `${tr.trading_hours.start} - ${tr.trading_hours.end}`,
        category: 'timeframe',
      });
    }
  }

  return rules;
}
