/**
 * PHASE 1 DEFAULTS APPLICATION
 * 
 * Conservative defaults for the Rapid Strategy Flow.
 * 
 * KEY PRINCIPLE: When in doubt, DON'T default.
 * 
 * Only default things that:
 * 1. Are non-critical (won't cause account damage)
 * 2. Have industry-standard values (2:1 R:R, 1% risk)
 * 3. Are easily editable (user can tap to change)
 * 
 * NEVER default:
 * - Stop loss (ask user explicitly)
 * - Position size in contracts (use % risk instead)
 * 
 * This is separate from applyDefaults.ts which is more comprehensive.
 * Phase 1 defaults are intentionally minimal and conservative.
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES
// ============================================================================

export interface Phase1DefaultsResult {
  /** Rules with defaults applied */
  rules: StrategyRule[];
  /** Names of defaults that were applied */
  defaultsApplied: string[];
  /** Pattern detected (used for pattern-specific defaults) */
  pattern?: string;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect trading pattern from message for pattern-specific defaults
 */
export function detectPattern(message: string): string | undefined {
  const patterns: Record<string, RegExp> = {
    'opening_range_breakout': /\b(ORB|opening\s?range|open\s?range)\b/i,
    'vwap_trade': /\bVWAP\b/i,
    'ema_pullback': /\b(\d+)\s?EMA\s?(pullback|bounce|retrace)/i,
    'pullback': /\b(pullback|pull\s?back|retrace)/i,
    'breakout': /\b(breakout|break\s?out|level\s?break)/i,
    'momentum': /\b(momentum|momo|thrust)/i,
    'scalp': /\b(scalp|scalping)/i,
  };
  
  for (const [patternName, regex] of Object.entries(patterns)) {
    if (regex.test(message)) {
      return patternName;
    }
  }
  
  return undefined;
}

// ============================================================================
// COMPONENT DETECTION
// ============================================================================

/**
 * Check if rules already contain a component
 * Uses normalized matching to handle variations
 */
function hasComponent(rules: StrategyRule[], componentType: string): boolean {
  const normalized = componentType.toLowerCase();
  
  return rules.some(rule => {
    const label = rule.label.toLowerCase();
    const value = rule.value.toLowerCase();
    const category = rule.category.toLowerCase();
    
    switch (normalized) {
      case 'target':
      case 'profit_target':
        return (
          label.includes('target') ||
          label.includes('profit') ||
          label.includes('r:r') ||
          label.includes('reward') ||
          label.includes('take profit') ||
          // Match R:R ratios like "1:2" or "2:1" but NOT times like "9:30"
          /\b\d+:\d+\s*(r:r|r\/r|ratio|risk|reward)\b/i.test(value) ||
          /\b\d+:\d+\b/.test(value) && !/(am|pm|\d{2}:\d{2})/i.test(value)
        );
        
      case 'sizing':
      case 'position_size':
        return (
          label.includes('size') ||
          label.includes('position') ||
          label.includes('contract') ||
          (label.includes('risk') && (value.includes('%') || value.includes('contract')))
        );
        
      case 'session':
      case 'trading_session':
        return (
          label.includes('session') ||
          label.includes('time') ||
          label.includes('hours') ||
          label.includes('window')
        );
        
      case 'instrument':
        return (
          category === 'setup' &&
          (label.includes('instrument') ||
           label.includes('symbol') ||
           label.includes('contract') ||
           label.includes('ticker'))
        );
        
      case 'range_period':
        return (
          label.includes('range') &&
          (label.includes('period') || label.includes('time') || label.includes('duration'))
        );
        
      case 'stop_loss':
      case 'stop':
        return (
          label.includes('stop') ||
          label.includes('loss') ||
          (category === 'exit' && label.includes('exit'))
        );
        
      default:
        return label.includes(normalized);
    }
  });
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

interface DefaultRule {
  category: StrategyRule['category'];
  label: string;
  value: string;
  explanation: string;
}

/**
 * Safe defaults that apply to ALL strategies
 */
const UNIVERSAL_DEFAULTS: Record<string, DefaultRule> = {
  target: {
    category: 'exit',
    label: 'Profit Target',
    value: '1:2 risk:reward',
    explanation: 'Industry-standard 1:2 risk:reward ratio.',
  },
  sizing: {
    category: 'risk',
    label: 'Position Sizing',
    value: '1% risk per trade',
    explanation: 'Conservative position sizing. Risk no more than 1% of account per trade.',
  },
  direction: {
    category: 'entry',
    label: 'Direction',
    value: 'Both',
    explanation: 'Trade both directions for maximum opportunity.',
  },
  session: {
    category: 'timeframe',
    label: 'Trading Session',
    value: 'NY Session (9:30 AM - 4:00 PM ET)',
    explanation: 'Most liquid trading hours for US futures. Highest volume, tightest spreads.',
  },
};

/**
 * Pattern-specific defaults (only safe ones)
 */
const PATTERN_DEFAULTS: Record<string, Record<string, DefaultRule>> = {
  'opening_range_breakout': {
    range_period: {
      category: 'setup',
      label: 'Range Period',
      value: '15 minutes (9:30-9:45 AM ET)',
      explanation: 'Standard ORB range period. First 15 minutes after market open.',
    },
  },
  'vwap_trade': {
    // VWAP strategies usually have specific session requirements
    session: {
      category: 'timeframe',
      label: 'Trading Session',
      value: 'NY Morning (9:30 AM - 12:00 PM ET)',
      explanation: 'VWAP is most reliable in the morning when volume is highest.',
    },
  },
  'scalp': {
    // Scalping has different R:R expectations
    target: {
      category: 'exit',
      label: 'Profit Target',
      value: '1:1 R:R',
      explanation: 'Scalping typically uses 1:1 R:R with higher win rate.',
    },
  },
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Apply Phase 1 conservative defaults to strategy rules
 * 
 * NEVER defaults:
 * - Stop loss (critical - must ask user)
 * - Instrument (should be specified or asked)
 * 
 * @param rules - Existing rules extracted from user message
 * @param message - Original user message (for pattern detection)
 * @returns Rules with safe defaults applied
 * 
 * @example
 * const result = applyPhase1Defaults(
 *   [{ category: 'setup', label: 'Instrument', value: 'ES' }],
 *   "ES opening range breakout"
 * );
 * // Adds: Target (2:1 R:R), Sizing (1%), Session (NY), Range Period (15 min)
 */
export function applyPhase1Defaults(
  rules: StrategyRule[],
  message: string = ''
): Phase1DefaultsResult {
  const pattern = detectPattern(message);
  const defaultsApplied: string[] = [];
  const newRules: StrategyRule[] = [...rules];
  
  // Get pattern-specific defaults (override universal if they exist)
  const patternSpecificDefaults = pattern ? PATTERN_DEFAULTS[pattern] || {} : {};
  
  // Merge universal defaults with pattern-specific (pattern takes precedence)
  const allDefaults = { ...UNIVERSAL_DEFAULTS, ...patternSpecificDefaults };
  
  // Apply each default if component is missing
  for (const [componentKey, defaultRule] of Object.entries(allDefaults)) {
    // Skip if already has this component
    if (hasComponent(rules, componentKey)) {
      continue;
    }
    
    // Create the default rule
    const rule: StrategyRule = {
      category: defaultRule.category,
      label: defaultRule.label,
      value: defaultRule.value,
      isDefaulted: true,
      explanation: defaultRule.explanation,
      source: 'default',
    };
    
    newRules.push(rule);
    defaultsApplied.push(defaultRule.label);
  }
  
  return {
    rules: newRules,
    defaultsApplied,
    pattern,
  };
}

/**
 * Get list of defaults that would be applied (without applying them)
 * Useful for UI previews
 */
export function previewPhase1Defaults(
  rules: StrategyRule[],
  message: string = ''
): DefaultRule[] {
  const pattern = detectPattern(message);
  const patternSpecificDefaults = pattern ? PATTERN_DEFAULTS[pattern] || {} : {};
  const allDefaults = { ...UNIVERSAL_DEFAULTS, ...patternSpecificDefaults };
  
  const wouldApply: DefaultRule[] = [];
  
  for (const [componentKey, defaultRule] of Object.entries(allDefaults)) {
    if (!hasComponent(rules, componentKey)) {
      wouldApply.push(defaultRule);
    }
  }
  
  return wouldApply;
}

/**
 * Remove all defaults from rules (for when user wants to specify everything)
 */
export function stripDefaults(rules: StrategyRule[]): StrategyRule[] {
  return rules.filter(rule => !rule.isDefaulted);
}

/**
 * Replace a default with user-specified value
 */
export function replaceDefault(
  rules: StrategyRule[],
  label: string,
  newValue: string
): StrategyRule[] {
  return rules.map(rule => {
    if (rule.label.toLowerCase() === label.toLowerCase()) {
      return {
        ...rule,
        value: newValue,
        isDefaulted: false,
        source: 'user' as const,
        explanation: undefined,
      };
    }
    return rule;
  });
}
