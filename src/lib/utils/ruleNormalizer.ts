/**
 * RULE VALUE NORMALIZER
 * 
 * Normalizes raw user input into clean, properly formatted display values.
 * Fixes Issue #1: Raw user text appearing in summary panel.
 * 
 * Example:
 * - Input: "opening range breakout" → Output: "Opening Range Breakout"
 * - Input: "ema pullback" → Output: "EMA Pullback"
 * - Input: "middle of range" → Output: "50% of opening range" (context-aware)
 */

// ============================================================================
// PATTERN NAME NORMALIZATIONS
// ============================================================================

const PATTERN_NORMALIZATIONS: Record<string, string> = {
  // ORB variations
  'orb': 'Opening Range Breakout',
  'opening range breakout': 'Opening Range Breakout',
  'opening range': 'Opening Range Breakout',
  'range breakout': 'Opening Range Breakout',
  'open range breakout': 'Opening Range Breakout',
  
  // EMA variations
  'ema pullback': 'EMA Pullback',
  'ema': 'EMA Strategy',
  'moving average': 'Moving Average Strategy',
  'ma': 'Moving Average Strategy',
  
  // VWAP variations
  'vwap': 'VWAP Bounce',
  'vwap bounce': 'VWAP Bounce',
  'vwap reversion': 'VWAP Mean Reversion',
  
  // Breakout variations
  'breakout': 'Breakout Strategy',
  'break out': 'Breakout Strategy',
  'level break': 'Level Breakout',
  
  // Pullback variations
  'pullback': 'Pullback Strategy',
  'pull back': 'Pullback Strategy',
  'retrace': 'Retracement Strategy',
  'retracement': 'Retracement Strategy',
  
  // Momentum variations
  'momentum': 'Momentum Strategy',
  'momo': 'Momentum Strategy',
  'trend following': 'Trend Following',
  
  // Scalping variations
  'scalp': 'Scalping Strategy',
  'scalping': 'Scalping Strategy',
  'quick trade': 'Scalping Strategy',
};

// ============================================================================
// STOP LOSS NORMALIZATIONS (Common Sense Only)
// ============================================================================

const STOP_NORMALIZATIONS: Record<string, string> = {
  // These are OBVIOUS, not assumptions
  'middle of range': '50% of opening range',
  'middle of the range': '50% of opening range',
  'half the range': '50% of opening range',
  'half of range': '50% of opening range',
  'midpoint': '50% of opening range',
  'range midpoint': '50% of opening range',
  
  // Structure references (just cleaning up phrasing)
  'below swing low': 'Structure-based (below swing low)',
  'above swing high': 'Structure-based (above swing high)',
  'swing low': 'Structure-based (swing low)',
  'swing high': 'Structure-based (swing high)',
  'structure': 'Structure-based',
  'structure based': 'Structure-based',
};

// ============================================================================
// TIME/SESSION NORMALIZATIONS (REMOVED - Claude provides specifics)
// ============================================================================

// NOTE: Removed time period normalizations. Claude asks with specific times:
// "Just the opening (9:30-10:30am ET), or full NY session?"
// User responds: "just the opening"
// Pass 2 extracts: "9:30 AM - 10:30 AM ET" (from Claude's question context)
//
// We don't normalize user shorthand - Pass 2 handles context-aware extraction.

// ============================================================================
// INSTRUMENT NORMALIZATIONS
// ============================================================================

const INSTRUMENT_NORMALIZATIONS: Record<string, string> = {
  'nq': 'NQ (E-mini Nasdaq)',
  'nasdaq': 'NQ (E-mini Nasdaq)',
  'mnq': 'MNQ (Micro Nasdaq)',
  'micro nq': 'MNQ (Micro Nasdaq)',
  'micro nasdaq': 'MNQ (Micro Nasdaq)',
  
  'es': 'ES (E-mini S&P 500)',
  's&p': 'ES (E-mini S&P 500)',
  'sp500': 'ES (E-mini S&P 500)',
  'mes': 'MES (Micro S&P 500)',
  'micro es': 'MES (Micro S&P 500)',
};

// ============================================================================
// MAIN NORMALIZATION FUNCTION
// ============================================================================

export interface NormalizationContext {
  label: string;
  category: string;
  detectedPattern?: string; // For context-aware normalizations
}

/**
 * Normalize a rule value based on its label and category
 * 
 * @param rawValue - The raw value from user input or Claude response
 * @param context - Label and category for context-aware normalization
 * @returns Normalized, properly formatted value
 */
export function normalizeRuleValue(
  rawValue: string,
  context: NormalizationContext
): string {
  const normalized = rawValue.toLowerCase().trim();
  const { label, category } = context;
  
  // Pattern normalization
  if (label.toLowerCase().includes('pattern') || 
      label.toLowerCase().includes('strategy') && category === 'setup') {
    return PATTERN_NORMALIZATIONS[normalized] || capitalizeWords(rawValue);
  }
  
  // Stop loss normalization (common sense only)
  if (label.toLowerCase().includes('stop')) {
    const stopNorm = STOP_NORMALIZATIONS[normalized];
    if (stopNorm) {
      return stopNorm;
    }
    
    // Tick normalization: "20 tick" → "20 ticks ($100)"
    const tickMatch = normalized.match(/(\d+)\s*ticks?/);
    if (tickMatch) {
      const ticks = parseInt(tickMatch[1]);
      const dollarValue = ticks * 5; // NQ: $5/tick, ES: $12.50/tick (use NQ default)
      return `${ticks} ticks ($${dollarValue})`;
    }
    
    return rawValue;
  }
  
  // Session/timeframe: Trust what Pass 2 extracted (it's context-aware)
  // No normalization needed - Claude provides specific times in questions
  if (category === 'timeframe' || 
      label.toLowerCase().includes('session') || 
      label.toLowerCase().includes('hours') ||
      label.toLowerCase().includes('time')) {
    return rawValue; // Pass through as-is
  }
  
  // Instrument normalization
  if (label.toLowerCase().includes('instrument') || 
      label.toLowerCase() === 'contract') {
    return INSTRUMENT_NORMALIZATIONS[normalized] || rawValue.toUpperCase();
  }
  
  // Default: capitalize first letter of each word
  return capitalizeWords(rawValue);
}

/**
 * Capitalize first letter of each word
 * "opening range breakout" → "Opening Range Breakout"
 */
function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a value has already been normalized
 * (to avoid double-normalization)
 */
export function isNormalized(value: string): boolean {
  // Check if value is already properly capitalized or contains formatting
  const hasCapitalization = /[A-Z]/.test(value);
  const hasFormatting = value.includes('(') || value.includes('$') || value.includes('%');
  
  return hasCapitalization || hasFormatting;
}

/**
 * Normalize all rules in an array
 */
export function normalizeRules(
  rules: Array<{ label: string; value: string; category: string; isDefaulted?: boolean }>,
  detectedPattern?: string
): Array<{ label: string; value: string; category: string; isDefaulted?: boolean }> {
  return rules.map(rule => {
    // Skip if already normalized or if it's a default (already formatted)
    if (rule.isDefaulted || isNormalized(rule.value)) {
      return rule;
    }
    
    const normalizedValue = normalizeRuleValue(rule.value, {
      label: rule.label,
      category: rule.category,
      detectedPattern,
    });
    
    return {
      ...rule,
      value: normalizedValue,
    };
  });
}
