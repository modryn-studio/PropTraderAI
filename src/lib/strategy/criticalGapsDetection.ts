/**
 * CRITICAL GAPS DETECTION
 * 
 * Part of the Rapid Strategy Flow (Phase 1).
 * Detects which CRITICAL parameters are missing from user's strategy description.
 * 
 * Critical params (MUST ask, NEVER default):
 * - Stop loss (most critical - account protection)
 * 
 * Important params (ask if ambiguous):
 * - Instrument (if multi-instrument or unclear)
 * - Entry trigger (if pattern unclear)
 * - Direction (if bias unclear)
 * 
 * This is different from completenessDetection.ts which calculates a % score.
 * Here we return binary flags: "has/doesn't have" for CRITICAL params only.
 */

import { 
  STOP_PATTERNS, 
  INSTRUMENT_PATTERNS,
  PATTERN_TYPES,
} from './completenessDetection';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Binary flags for critical parameters
 * true = HAS the parameter
 * false = MISSING the parameter (needs to be asked)
 */
export interface CriticalGaps {
  /** Stop loss - MOST critical. Never default, always ask if missing. */
  stopLoss: boolean;
  /** Instrument - Critical if user mentions multiple or is unclear */
  instrument: boolean;
  /** Entry trigger - Critical if pattern is unclear */
  entryTrigger: boolean;
  /** Direction - Critical if long/short/both is unclear */
  direction: boolean;
}

export interface CriticalGapsResult {
  gaps: CriticalGaps;
  /** Which parameters are missing (for easy iteration) */
  missing: (keyof CriticalGaps)[];
  /** Count of missing critical params */
  missingCount: number;
  /** Pattern detected (for context-specific questions) */
  detectedPattern?: string;
}

// ============================================================================
// ADDITIONAL STOP LOSS PATTERNS
// ============================================================================

/**
 * Extended stop loss patterns that catch natural language variations
 * Supplements the patterns from completenessDetection.ts
 */
const EXTENDED_STOP_PATTERNS = [
  // Structure-based (natural language)
  /below\s+(the\s+)?(low|range|structure|swing|support)/i,
  /above\s+(the\s+)?(high|range|structure|swing|resistance)/i,
  /break\s+(of\s+)?(the\s+)?(low|high|range)/i,
  
  // Mental stops / exit conditions
  /mental\s*stop/i,
  /exit\s+(when|if|at)/i,
  /get\s+out\s+(at|when|if)/i,
  /close\s+(the\s+)?(trade|position)\s+(when|if|at)/i,
  
  // Tick/point based (various phrasings)
  /\d+\s*(tick|pt|point|pip)(s)?\s*(stop|sl|loss)?/i,
  /stop\s*(loss|at|of|:)?\s*\d+/i,
  /(risk|risking)\s*\d+\s*(tick|pt|point|pip)/i,
  
  // ATR based
  /\d+(\.\d+)?\s*(x\s*)?(atr|ATR)/i,
  /atr\s*(of|at|x)?\s*\d+/i,
  
  // Percentage based
  /\d+(\.\d+)?\s*%\s*(stop|loss|risk)/i,
  
  // Dollar based
  /\$\s*\d+\s*(stop|risk|loss)/i,
  /risk\s*\$\s*\d+/i,
  
  // Range-based
  /(half|middle|50%)\s*(of\s*)?(the\s+)?range/i,
  /range\s+(low|high|middle)/i,
];

// ============================================================================
// DIRECTION PATTERNS
// ============================================================================

const DIRECTION_PATTERNS = {
  long: [
    /\blong(s)?\b/i,
    /\bbuy(s|ing)?\b/i,
    /\bbullish\b/i,
    /\bupside\b/i,
    /break\s*(out)?\s*above/i,
    /bounce\s*(off|from)/i,
  ],
  short: [
    /\bshort(s|ing)?\b/i,
    /\bsell(s|ing)?\b/i,
    /\bbearish\b/i,
    /\bdownside\b/i,
    /break\s*(out)?\s*below/i,
    /fade\b/i,
  ],
  both: [
    /\b(long|short)\s*(and|or|&)\s*(long|short)\b/i,
    /\bboth\s*(directions?|ways?|sides?)\b/i,
    /\beither\s*direction\b/i,
    /\blong\s*and\s*short\b/i,
  ],
};

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if message contains stop loss information
 */
function hasStopLoss(message: string, rules: StrategyRule[]): boolean {
  // First check parsed rules
  const hasInRules = rules.some(r => {
    const label = r.label.toLowerCase();
    const value = r.value.toLowerCase();
    
    return (
      r.category === 'risk' || r.category === 'exit'
    ) && (
      label.includes('stop') ||
      label.includes('loss') ||
      label.includes('exit') ||
      value.includes('stop') ||
      value.includes('tick') ||
      value.includes('atr')
    );
  });
  
  if (hasInRules) return true;
  
  // Check message with existing STOP_PATTERNS from completenessDetection
  const hasInPatterns = Object.values(STOP_PATTERNS).some(pattern => 
    pattern.test(message)
  );
  
  if (hasInPatterns) return true;
  
  // Check with extended patterns
  return EXTENDED_STOP_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check if message contains instrument information
 */
function hasInstrument(message: string, rules: StrategyRule[]): boolean {
  // Check parsed rules
  const hasInRules = rules.some(r => {
    const label = r.label.toLowerCase();
    return (
      label.includes('instrument') ||
      label.includes('symbol') ||
      label.includes('contract') ||
      label.includes('ticker')
    );
  });
  
  if (hasInRules) return true;
  
  // Check message for instrument patterns
  return Object.values(INSTRUMENT_PATTERNS).some(pattern => 
    pattern.test(message)
  );
}

/**
 * Check if message contains entry trigger information
 */
function hasEntryTrigger(message: string, rules: StrategyRule[]): boolean {
  // Check parsed rules
  const hasInRules = rules.some(r => {
    const label = r.label.toLowerCase();
    return (
      r.category === 'entry' ||
      label.includes('entry') ||
      label.includes('trigger') ||
      label.includes('signal') ||
      label.includes('setup')
    );
  });
  
  if (hasInRules) return true;
  
  // Check message for pattern types (implies entry trigger)
  return Object.values(PATTERN_TYPES).some(pattern => 
    pattern.test(message)
  );
}

/**
 * Check if message contains direction information
 */
function hasDirection(message: string, rules: StrategyRule[]): boolean {
  // Check parsed rules
  const hasInRules = rules.some(r => {
    const label = r.label.toLowerCase();
    const value = r.value.toLowerCase();
    
    return (
      label.includes('direction') ||
      label.includes('bias') ||
      value.includes('long') ||
      value.includes('short') ||
      value.includes('buy') ||
      value.includes('sell')
    );
  });
  
  if (hasInRules) return true;
  
  // Check message for direction patterns
  const hasLong = DIRECTION_PATTERNS.long.some(p => p.test(message));
  const hasShort = DIRECTION_PATTERNS.short.some(p => p.test(message));
  const hasBoth = DIRECTION_PATTERNS.both.some(p => p.test(message));
  
  // Has direction if any direction is specified
  return hasLong || hasShort || hasBoth;
}

/**
 * Detect pattern from message (for context-specific questions)
 */
function detectPatternType(message: string): string | undefined {
  // Priority order: most specific patterns first
  const prioritizedPatterns = [
    'orb',
    'vwap',
    'ema',
    'sma',
    'pullback',
    'momentum',
    'scalp',
    'swing',
    'breakout',
  ] as const;
  
  for (const patternType of prioritizedPatterns) {
    const regex = PATTERN_TYPES[patternType];
    if (regex && regex.test(message)) {
      return patternType;
    }
  }
  
  return undefined;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Detect which critical parameters are missing from the strategy
 * 
 * @param userMessage - The user's strategy description
 * @param parsedRules - Rules already parsed from the message (optional)
 * @returns Object with boolean flags for each critical parameter
 * 
 * @example
 * const result = detectCriticalGaps("ES opening range breakout");
 * // result.gaps.stopLoss = false (MISSING - need to ask)
 * // result.gaps.instrument = true (HAS - ES detected)
 * // result.missing = ['stopLoss']
 */
export function detectCriticalGaps(
  userMessage: string,
  parsedRules: StrategyRule[] = []
): CriticalGapsResult {
  const gaps: CriticalGaps = {
    stopLoss: hasStopLoss(userMessage, parsedRules),
    instrument: hasInstrument(userMessage, parsedRules),
    entryTrigger: hasEntryTrigger(userMessage, parsedRules),
    direction: hasDirection(userMessage, parsedRules),
  };
  
  // Determine which are missing
  const missing = (Object.keys(gaps) as (keyof CriticalGaps)[])
    .filter(key => !gaps[key]);
  
  // Detect pattern for context-specific questions
  const detectedPattern = detectPatternType(userMessage);
  
  return {
    gaps,
    missing,
    missingCount: missing.length,
    detectedPattern,
  };
}

/**
 * Get the most critical missing parameter
 * Priority: stopLoss > instrument > entryTrigger > direction
 * 
 * @returns The key of the most critical missing param, or null if none missing
 */
export function getMostCriticalGap(
  result: CriticalGapsResult
): keyof CriticalGaps | null {
  const priority: (keyof CriticalGaps)[] = [
    'stopLoss',     // Most critical - account protection
    'instrument',   // Need to know what we're trading
    'entryTrigger', // Need to know when to enter
    'direction',    // Need to know long/short
  ];
  
  for (const key of priority) {
    if (!result.gaps[key]) {
      return key;
    }
  }
  
  return null;
}

/**
 * Check if strategy has all critical params (ready for generation)
 */
export function isReadyForGeneration(result: CriticalGapsResult): boolean {
  // Only stop loss is truly critical for Phase 1
  // Other params can be inferred or defaulted
  return result.gaps.stopLoss;
}
