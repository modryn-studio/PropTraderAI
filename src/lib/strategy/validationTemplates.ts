/**
 * VALIDATION TEMPLATES
 * 
 * "I heard you" acknowledgment patterns for rapid flow.
 * These validate user input BEFORE asking follow-up questions,
 * making users feel heard and reducing friction.
 * 
 * Pattern: Acknowledge → Frame → Ask
 * 
 * From STRATEGY_BUILDER_UNIFIED_GUIDE.md:
 * - Validate input BEFORE asking for more
 * - Frame questions as "quick confirmation"
 * - Make user feel heard
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type PatternType = 'orb' | 'pullback' | 'breakout' | 'ema' | 'vwap' | 'scalp' | 'momentum' | 'unknown';

export interface ValidationContext {
  pattern?: PatternType;
  instrument?: string;
  detectedComponents: string[];
  missingCritical: string[];
}

export interface ValidationResponse {
  acknowledgment: string;
  framing: string;
  question?: string;
  fullResponse: string;
}

// ============================================================================
// PATTERN ACKNOWLEDGMENT TEMPLATES
// ============================================================================

/**
 * Pattern-specific acknowledgment messages
 * These validate the user's strategy choice with trader-appropriate language
 */
export const PATTERN_ACKNOWLEDGMENTS: Record<PatternType, string> = {
  orb: "Opening range breakout — solid choice for momentum.",
  pullback: "Pullback strategy — reliable trend entry pattern.",
  breakout: "Breakout trading — momentum-based, clear triggers.",
  ema: "EMA strategy — trend following approach.",
  vwap: "VWAP trading — mean reversion, institutional levels.",
  scalp: "Scalping — quick entries, tight risk.",
  momentum: "Momentum strategy — riding the move.",
  unknown: "Got your strategy concept.",
};

/**
 * Instrument-specific validation
 */
export const INSTRUMENT_ACKNOWLEDGMENTS: Record<string, string> = {
  es: "ES (S&P futures)",
  nq: "NQ (Nasdaq futures)",
  mes: "MES (Micro S&P)",
  mnq: "MNQ (Micro Nasdaq)",
  cl: "CL (Crude Oil)",
  gc: "GC (Gold)",
};

// ============================================================================
// FRAMING TEMPLATES
// ============================================================================

/**
 * Framing phrases that set up the question without lecturing
 */
export const FRAMING_TEMPLATES = {
  // When we need 1 thing
  one_thing: "One thing I need:",
  quick_confirm: "Quick confirmation:",
  just_checking: "Just checking —",
  
  // When we need 2-3 things
  two_things: "Two quick things:",
  to_complete: "To complete this:",
  almost_there: "Almost ready —",
  
  // When strategy is mostly complete
  looks_good: "Looks complete.",
  ready_to_save: "Ready to save?",
} as const;

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

/**
 * Concise question templates for missing components
 * These replace the verbose multi-choice A) B) C) D) format
 */
export const QUESTION_TEMPLATES: Record<string, string> = {
  stop: "**Stop loss**: Ticks (like 10-20), structure (below swing low), or ATR-based?",
  target: "**Target**: Fixed R:R (like 1:2) or structure-based?",
  sizing: "**Position size**: What % risk per trade?",
  instrument: "**Instrument**: ES, NQ, or micros (MES/MNQ)?",
  session: "**Session**: Full NY session or specific hours?",
  direction: "**Direction**: Long only, short only, or both?",
  rangePeriod: "**Range period**: 5, 15, or 30 minute opening range?",
};

// ============================================================================
// MAIN FUNCTION: Generate Validating Response
// ============================================================================

/**
 * Generate a validating response that acknowledges user input before asking
 * 
 * @param context - What was detected from user's message
 * @returns ValidationResponse with acknowledgment, framing, and optional question
 * 
 * @example
 * // User says: "I trade NQ ORB"
 * const response = generateValidatingResponse({
 *   pattern: 'orb',
 *   instrument: 'nq',
 *   detectedComponents: ['pattern', 'instrument'],
 *   missingCritical: ['stop']
 * });
 * // Returns: "NQ opening range breakout — solid. Quick confirmation: **Stop loss**: Ticks or structure-based?"
 */
export function generateValidatingResponse(context: ValidationContext): ValidationResponse {
  const parts: string[] = [];
  
  // Step 1: Acknowledge what they said
  let acknowledgment = "";
  
  // Add instrument if detected
  if (context.instrument) {
    const instrumentLabel = INSTRUMENT_ACKNOWLEDGMENTS[context.instrument.toLowerCase()] || context.instrument.toUpperCase();
    acknowledgment += instrumentLabel + " ";
  }
  
  // Add pattern acknowledgment
  const patternKey = context.pattern || 'unknown';
  acknowledgment += PATTERN_ACKNOWLEDGMENTS[patternKey];
  
  parts.push(acknowledgment.trim());
  
  // Step 2: Choose framing based on what's missing
  let framing = "";
  let question = "";
  
  const missingCount = context.missingCritical.length;
  
  if (missingCount === 0) {
    // Nothing critical missing - ready to save
    framing = FRAMING_TEMPLATES.looks_good;
    question = "Ready to save and start protection?";
  } else if (missingCount === 1) {
    // Just one thing needed
    framing = FRAMING_TEMPLATES.one_thing;
    question = QUESTION_TEMPLATES[context.missingCritical[0]] || "";
  } else if (missingCount === 2) {
    // Two things needed - group them
    framing = FRAMING_TEMPLATES.two_things;
    question = context.missingCritical
      .slice(0, 2)
      .map((comp, i) => `${i + 1}. ${QUESTION_TEMPLATES[comp] || comp}`)
      .join("\n");
  } else {
    // 3+ things - still group, but use different framing
    framing = FRAMING_TEMPLATES.to_complete;
    question = context.missingCritical
      .slice(0, 3)
      .map((comp, i) => `${i + 1}. ${QUESTION_TEMPLATES[comp] || comp}`)
      .join("\n");
  }
  
  if (framing) {
    parts.push(framing);
  }
  
  // Construct full response
  const fullResponse = question 
    ? `${acknowledgment.trim()}\n\n${framing}\n${question}`
    : `${acknowledgment.trim()} ${framing}`;
  
  return {
    acknowledgment: acknowledgment.trim(),
    framing,
    question: question || undefined,
    fullResponse,
  };
}

// ============================================================================
// HELPER: Detect Pattern Type from String
// ============================================================================

/**
 * Convert detected pattern string to PatternType
 */
export function toPatternType(pattern?: string): PatternType {
  if (!pattern) return 'unknown';
  
  const normalized = pattern.toLowerCase();
  
  if (normalized.includes('orb') || normalized.includes('opening range')) return 'orb';
  if (normalized.includes('pullback')) return 'pullback';
  if (normalized.includes('breakout')) return 'breakout';
  if (normalized.includes('ema') || normalized.includes('moving average')) return 'ema';
  if (normalized.includes('vwap')) return 'vwap';
  if (normalized.includes('scalp')) return 'scalp';
  if (normalized.includes('momentum')) return 'momentum';
  
  return 'unknown';
}

// ============================================================================
// HELPER: Build Context from Completeness Result
// ============================================================================

/**
 * Build ValidationContext from completeness detection results
 * 
 * @param completeness - Result from calculateCompleteness()
 * @returns ValidationContext ready for generateValidatingResponse()
 */
export function buildValidationContext(
  completeness: {
    detected: string[];
    missing: string[];
    components: Record<string, { detected: boolean; value?: string }>;
  }
): ValidationContext {
  // Extract pattern and instrument from components
  const pattern = completeness.components.pattern?.value;
  const instrument = completeness.components.instrument?.value;
  
  // Critical components that should be asked about (not defaulted)
  const CRITICAL_COMPONENTS = ['stop', 'instrument'];
  const missingCritical = completeness.missing.filter(c => CRITICAL_COMPONENTS.includes(c));
  
  return {
    pattern: toPatternType(pattern),
    instrument: instrument?.toLowerCase(),
    detectedComponents: completeness.detected,
    missingCritical,
  };
}

// ============================================================================
// SMART DEFAULTS ANNOUNCEMENT
// ============================================================================

/**
 * Generate announcement of defaults being applied
 * 
 * @param defaultsApplied - Array of component names using defaults
 * @returns String announcing what defaults are being used
 */
export function announceDefaults(defaultsApplied: string[]): string {
  if (defaultsApplied.length === 0) return "";
  
  const defaultDescriptions: Record<string, string> = {
    target: "1:2 R:R for target",
    sizing: "1% risk per trade",
    session: "NY session hours",
    rangePeriod: "15-minute opening range",
    direction: "both long and short",
  };
  
  const descriptions = defaultsApplied
    .map(d => defaultDescriptions[d] || d)
    .filter(Boolean);
  
  if (descriptions.length === 1) {
    return `I'll use ${descriptions[0]} — change anytime later.`;
  }
  
  const last = descriptions.pop();
  return `I'll use ${descriptions.join(", ")}, and ${last} — change anytime later.`;
}
