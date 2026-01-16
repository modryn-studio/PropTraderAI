/**
 * PATTERN REQUIREMENTS LOOKUP TABLE
 * 
 * Defines required and recommended components for each trading pattern.
 * Used by gap detection to determine what questions to ask.
 * 
 * Phase 1: Static lookup table
 * Phase 2: Can be replaced with Claude tool-calling for dynamic requirements
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PatternRequirements {
  /** Components that MUST be provided (will ask if missing) */
  required: StrategyComponent[];
  /** Components that are recommended but can be defaulted */
  recommended: StrategyComponent[];
  /** Default values to apply for this pattern */
  defaults: Partial<Record<StrategyComponent, string>>;
}

export type StrategyComponent =
  | 'stop_loss'
  | 'profit_target'
  | 'entry_criteria'
  | 'position_sizing'
  | 'risk_parameters'
  | 'instrument'
  | 'direction'
  | 'timeframe'
  | 'session'
  | 'range_period';

// ============================================================================
// PATTERN REQUIREMENTS DEFINITIONS
// ============================================================================

export const PATTERN_REQUIREMENTS: Record<string, PatternRequirements> = {
  /**
   * Opening Range Breakout (ORB)
   * Trade breakouts from initial session range
   */
  'opening_range_breakout': {
    required: ['instrument', 'stop_loss', 'direction'],
    recommended: ['profit_target', 'session', 'range_period'],
    defaults: {
      range_period: '15 minutes (9:30-9:45 AM ET)',
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Alias for ORB
   */
  'orb': {
    required: ['instrument', 'stop_loss', 'direction'],
    recommended: ['profit_target', 'session', 'range_period'],
    defaults: {
      range_period: '15 minutes (9:30-9:45 AM ET)',
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Pullback / Retracement
   * Trade retracements back to moving average or level
   */
  'pullback': {
    required: ['instrument', 'stop_loss'],
    recommended: ['profit_target', 'entry_criteria', 'session'],
    defaults: {
      entry_criteria: 'Pullback to 20 EMA',
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * EMA Pullback
   * Specific pullback strategy using EMAs
   */
  'ema_pullback': {
    required: ['instrument', 'stop_loss'],
    recommended: ['profit_target', 'entry_criteria', 'session'],
    defaults: {
      entry_criteria: 'Touch or pullback to EMA',
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Breakout
   * Trade breaks of key levels, ranges, or patterns
   */
  'breakout': {
    required: ['instrument', 'stop_loss', 'entry_criteria'],
    recommended: ['profit_target', 'session', 'direction'],
    defaults: {
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Momentum
   * Trade strong directional moves
   */
  'momentum': {
    required: ['instrument', 'stop_loss', 'direction'],
    recommended: ['profit_target', 'entry_criteria', 'session'],
    defaults: {
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Scalping
   * Quick in-and-out trades with tight stops
   */
  'scalp': {
    required: ['instrument', 'stop_loss', 'entry_criteria'],
    recommended: ['profit_target', 'session'],
    defaults: {
      profit_target: '1:1 R:R', // Scalpers take quick profits
      session: 'NY Session (9:30 AM - 12:00 PM ET)', // Most active hours
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Scalping alias
   */
  'scalping': {
    required: ['instrument', 'stop_loss', 'entry_criteria'],
    recommended: ['profit_target', 'session'],
    defaults: {
      profit_target: '1:1 R:R',
      session: 'NY Session (9:30 AM - 12:00 PM ET)',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * VWAP Trade
   * Trade around Volume Weighted Average Price
   */
  'vwap': {
    required: ['instrument', 'stop_loss', 'direction'],
    recommended: ['profit_target', 'entry_criteria', 'session'],
    defaults: {
      entry_criteria: 'Price at VWAP',
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * VWAP Trade alias
   */
  'vwap_trade': {
    required: ['instrument', 'stop_loss', 'direction'],
    recommended: ['profit_target', 'entry_criteria', 'session'],
    defaults: {
      entry_criteria: 'Price at VWAP',
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Swing Trading
   * Multi-day trades capturing larger moves
   */
  'swing': {
    required: ['instrument', 'stop_loss', 'direction'],
    recommended: ['profit_target', 'entry_criteria', 'timeframe'],
    defaults: {
      timeframe: 'Daily',
      profit_target: '3:1 R:R', // Swing trades target larger moves
      position_sizing: '1% risk per trade',
    },
  },

  /**
   * Generic / Fallback
   * Used when pattern cannot be identified
   */
  'generic': {
    required: ['instrument', 'stop_loss', 'entry_criteria'],
    recommended: ['profit_target', 'session', 'direction'],
    defaults: {
      session: 'NY Session (9:30 AM - 4:00 PM ET)',
      profit_target: '2:1 R:R',
      position_sizing: '1% risk per trade',
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get requirements for a given pattern
 * Falls back to 'generic' if pattern not found
 */
export function getPatternRequirements(pattern?: string): PatternRequirements {
  if (!pattern) {
    return PATTERN_REQUIREMENTS.generic;
  }
  
  // Normalize pattern name (lowercase, underscores)
  const normalizedPattern = pattern.toLowerCase().replace(/[\s-]/g, '_');
  
  return PATTERN_REQUIREMENTS[normalizedPattern] || PATTERN_REQUIREMENTS.generic;
}

/**
 * Check if a component is required for a given pattern
 */
export function isComponentRequired(
  component: StrategyComponent,
  pattern?: string
): boolean {
  const requirements = getPatternRequirements(pattern);
  return requirements.required.includes(component);
}

/**
 * Get default value for a component based on pattern
 */
export function getDefaultValue(
  component: StrategyComponent,
  pattern?: string
): string | undefined {
  const requirements = getPatternRequirements(pattern);
  return requirements.defaults[component];
}

/**
 * Get all supported pattern names
 */
export function getSupportedPatterns(): string[] {
  return Object.keys(PATTERN_REQUIREMENTS).filter(p => p !== 'generic');
}
