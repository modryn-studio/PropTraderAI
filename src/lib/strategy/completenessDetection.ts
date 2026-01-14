/**
 * COMPLETENESS DETECTION SYSTEM
 * 
 * Core of the Rapid Strategy Builder flow.
 * Detects how complete a user's strategy description is from their first message.
 * 
 * Based on 6 key components:
 * 1. Instrument (ES, NQ, MES, MNQ)
 * 2. Pattern (ORB, pullback, breakout, etc.)
 * 3. Stop Loss (ticks, structure, ATR)
 * 4. Target (R:R, ticks, extensions)
 * 5. Position Sizing (%, contracts)
 * 6. Session (NY, London, times)
 * 
 * Returns completeness percentage and missing components to guide question count.
 */

// ============================================================================
// PATTERN DEFINITIONS - Robust regex matching for trading terminology
// ============================================================================

/**
 * Instrument detection patterns
 * Handles: ES, NQ, MES, MNQ, e-mini, micro, S&P 500, Nasdaq
 */
export const INSTRUMENT_PATTERNS = {
  ES: /\b(e-?mini\s?)?(ES|s&?p\s?500?|s\s?and\s?p|spx)\b/i,
  NQ: /\b(e-?mini\s?)?(NQ|nasdaq|nsdq)\b/i,
  MES: /\b(micro\s?)?(MES|micro\s?s&?p|micro\s?e-?mini\s?s&?p)\b/i,
  MNQ: /\b(micro\s?)?(MNQ|micro\s?nasdaq|micro\s?nq|micro\s?e-?mini\s?nasdaq)\b/i,
};

/**
 * Strategy pattern detection
 * Handles various phrasings of common trading strategies
 */
export const PATTERN_TYPES = {
  orb: /\b(ORB|opening\s?range|open\s?range|opening\s?range\s?breakout|range\s?break)\b/i,
  pullback: /\b(pullback|pull\s?back|retrace|retracement|bounce)\b/i,
  breakout: /\b(breakout|break\s?out|break\s?above|break\s?below|level\s?break)\b/i,
  momentum: /\b(momentum|momo|thrust|impulse|strong\s?move)\b/i,
  vwap: /\b(VWAP|volume\s?weighted)\b/i,
  ema: /\b(EMA|exponential\s?moving|(\d+)\s?ema)\b/i,
  sma: /\b(SMA|simple\s?moving|moving\s?average)\b/i,
  rsi: /\b(RSI|relative\s?strength)\b/i,
  macd: /\b(MACD|moving\s?average\s?convergence)\b/i,
  scalp: /\b(scalp|scalping|quick\s?trade)\b/i,
  swing: /\b(swing|swinger|multi-?day)\b/i,
};

/**
 * Stop loss detection patterns
 */
export const STOP_PATTERNS = {
  fixed_ticks: /\b(\d+)\s?(tick|pt|point)s?\s?(stop|sl)?\b/i,
  fixed_ticks_alt: /\b(stop|sl)\s?(at|of|:)?\s?(\d+)\s?(tick|pt|point)s?\b/i,
  atr: /\b(\d+\.?\d*)\s?x?\s?(ATR|average\s?true\s?range)\b/i,
  structure: /\b(structure|swing\s?(low|high)?|support|resistance|level)\s?(based|stop)?\b/i,
  dollar: /\b\$?\s?(\d+)\s?(dollar|usd)?\s?(stop|risk|sl)?\b/i,
};

/**
 * Target/profit detection patterns  
 */
export const TARGET_PATTERNS = {
  risk_reward: /\b1\s?:\s?(\d+)\b/i,
  reward_risk: /\b(\d+)\s?:\s?1\b/i,
  r_multiple: /\b(\d+)\s?R\b/i,
  ticks: /\b(\d+)\s?(tick|pt|point)s?\s?(target|tp|profit)?\b/i,
  multiple: /\b(\d+\.?\d*)\s?x\s?(range|extension|target|move)\b/i,
  fixed_profit: /\b(target|tp|profit|take\s?profit)\s?(at|of|:)?\s?(\d+)/i,
};

/**
 * Position sizing detection patterns
 */
export const SIZING_PATTERNS = {
  percent_risk: /\b(\d+\.?\d*)\s?%\s?(risk|per\s?trade|of\s?account)?\b/i,
  fixed_contracts: /\b(\d+)\s?(contract|lot)s?\b/i,
  max_contracts: /\b(max|maximum)\s?(\d+)\s?(contract|lot)s?\b/i,
  risk_per_trade: /\brisk\s?(\d+\.?\d*)\s?%?\s?(per\s?trade)?\b/i,
};

/**
 * Session/time filter detection patterns
 */
export const SESSION_PATTERNS = {
  ny_session: /\b(NY|new\s?york|US)\s?(session|hours|market)?\b/i,
  london_session: /\b(london|UK|european)\s?(session|hours)?\b/i,
  asia_session: /\b(asia|asian|tokyo)\s?(session|hours)?\b/i,
  specific_times: /\b(\d{1,2}):?(\d{2})?\s?(am|pm)?\s?(-|to)\s?(\d{1,2}):?(\d{2})?\s?(am|pm)?\b/i,
  market_open: /\b(open|opening|9:30|930)\b/i,
  time_reference: /\b(morning|afternoon|first\s?hour|last\s?hour)\b/i,
  timezone: /\b(ET|EST|EDT|CT|CST|PT|PST|UTC)\b/i,
};

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

export interface CompletionComponent {
  detected: boolean;
  value?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface CompletenessResult {
  percentage: number;
  components: {
    instrument: CompletionComponent;
    pattern: CompletionComponent;
    stop: CompletionComponent;
    target: CompletionComponent;
    sizing: CompletionComponent;
    session: CompletionComponent;
  };
  missing: string[];
  detected: string[];
  expertiseLevel: 'beginner' | 'intermediate-low' | 'intermediate-high' | 'advanced';
}

/**
 * Detect instrument from message
 */
export function detectInstrument(message: string): CompletionComponent {
  for (const [instrument, pattern] of Object.entries(INSTRUMENT_PATTERNS)) {
    if (pattern.test(message)) {
      return { detected: true, value: instrument, confidence: 'high' };
    }
  }
  
  // Check for generic futures mention
  if (/\b(futures|contract)\b/i.test(message)) {
    return { detected: false, value: undefined, confidence: 'low' };
  }
  
  return { detected: false, confidence: 'low' };
}

/**
 * Detect strategy pattern from message
 */
export function detectPattern(message: string): CompletionComponent {
  for (const [patternType, regex] of Object.entries(PATTERN_TYPES)) {
    if (regex.test(message)) {
      return { detected: true, value: patternType, confidence: 'high' };
    }
  }
  
  // Check for generic trading terms
  if (/\b(trade|trading|strategy|setup)\b/i.test(message)) {
    return { detected: false, confidence: 'medium' };
  }
  
  return { detected: false, confidence: 'low' };
}

/**
 * Detect stop loss from message
 */
export function detectStopLoss(message: string): CompletionComponent {
  // Check fixed ticks patterns
  for (const [type, pattern] of Object.entries(STOP_PATTERNS)) {
    const match = message.match(pattern);
    if (match) {
      if (type === 'structure') {
        return { detected: true, value: 'structure-based', confidence: 'high' };
      }
      if (type === 'atr') {
        return { detected: true, value: `${match[1]} ATR`, confidence: 'high' };
      }
      const tickValue = match[1] || match[3];
      if (tickValue) {
        return { detected: true, value: `${tickValue} ticks`, confidence: 'high' };
      }
    }
  }
  
  // Generic stop mention
  if (/\b(stop|sl|stoploss)\b/i.test(message) && !/what|which|how/.test(message.toLowerCase())) {
    return { detected: false, confidence: 'medium' };
  }
  
  return { detected: false, confidence: 'low' };
}

/**
 * Detect target/profit from message
 */
export function detectTarget(message: string): CompletionComponent {
  // Check R:R patterns first (most specific)
  const rrMatch = message.match(TARGET_PATTERNS.risk_reward);
  if (rrMatch) {
    return { detected: true, value: `1:${rrMatch[1]} R:R`, confidence: 'high' };
  }
  
  const rwMatch = message.match(TARGET_PATTERNS.reward_risk);
  if (rwMatch) {
    return { detected: true, value: `1:${rwMatch[1]} R:R`, confidence: 'high' };
  }
  
  const rMultMatch = message.match(TARGET_PATTERNS.r_multiple);
  if (rMultMatch) {
    return { detected: true, value: `${rMultMatch[1]}R`, confidence: 'high' };
  }
  
  // Check for explicit target values
  if (TARGET_PATTERNS.fixed_profit.test(message)) {
    return { detected: true, value: 'fixed target', confidence: 'medium' };
  }
  
  // Check for multiple (1.5x range, 2x extension)
  const multMatch = message.match(TARGET_PATTERNS.multiple);
  if (multMatch) {
    return { detected: true, value: `${multMatch[1]}x ${multMatch[2]}`, confidence: 'high' };
  }
  
  return { detected: false, confidence: 'low' };
}

/**
 * Detect position sizing from message
 */
export function detectSizing(message: string): CompletionComponent {
  const percentMatch = message.match(SIZING_PATTERNS.percent_risk);
  if (percentMatch) {
    return { detected: true, value: `${percentMatch[1]}% risk`, confidence: 'high' };
  }
  
  const riskMatch = message.match(SIZING_PATTERNS.risk_per_trade);
  if (riskMatch) {
    return { detected: true, value: `${riskMatch[1]}% per trade`, confidence: 'high' };
  }
  
  const contractMatch = message.match(SIZING_PATTERNS.fixed_contracts);
  if (contractMatch) {
    return { detected: true, value: `${contractMatch[1]} contracts`, confidence: 'high' };
  }
  
  const maxMatch = message.match(SIZING_PATTERNS.max_contracts);
  if (maxMatch) {
    return { detected: true, value: `max ${maxMatch[2]} contracts`, confidence: 'high' };
  }
  
  return { detected: false, confidence: 'low' };
}

/**
 * Detect session/time filters from message
 */
export function detectSession(message: string): CompletionComponent {
  if (SESSION_PATTERNS.ny_session.test(message)) {
    return { detected: true, value: 'NY session', confidence: 'high' };
  }
  
  if (SESSION_PATTERNS.london_session.test(message)) {
    return { detected: true, value: 'London session', confidence: 'high' };
  }
  
  if (SESSION_PATTERNS.asia_session.test(message)) {
    return { detected: true, value: 'Asia session', confidence: 'high' };
  }
  
  if (SESSION_PATTERNS.specific_times.test(message)) {
    return { detected: true, value: 'specific hours', confidence: 'medium' };
  }
  
  if (SESSION_PATTERNS.market_open.test(message) || SESSION_PATTERNS.time_reference.test(message)) {
    return { detected: true, value: 'time filter', confidence: 'medium' };
  }
  
  return { detected: false, confidence: 'low' };
}

// ============================================================================
// MAIN COMPLETENESS CALCULATION
// ============================================================================

/**
 * Calculate completeness of strategy description
 * 
 * @param message - User's message describing their strategy
 * @returns CompletenessResult with percentage, components, and expertise level
 */
export function calculateCompleteness(message: string): CompletenessResult {
  const components = {
    instrument: detectInstrument(message),
    pattern: detectPattern(message),
    stop: detectStopLoss(message),
    target: detectTarget(message),
    sizing: detectSizing(message),
    session: detectSession(message),
  };
  
  // Calculate detected components
  const detectedComponents = Object.entries(components)
    .filter(([, comp]) => comp.detected)
    .map(([name]) => name);
  
  const missingComponents = Object.entries(components)
    .filter(([, comp]) => !comp.detected)
    .map(([name]) => name);
  
  // Calculate percentage (6 components total)
  const percentage = detectedComponents.length / 6;
  
  // Determine expertise level based on completeness
  let expertiseLevel: CompletenessResult['expertiseLevel'];
  
  if (percentage === 0 || (!components.pattern.detected && !components.instrument.detected)) {
    expertiseLevel = 'beginner';
  } else if (percentage < 0.4) {
    expertiseLevel = 'intermediate-low';
  } else if (percentage < 0.7) {
    expertiseLevel = 'intermediate-high';
  } else {
    expertiseLevel = 'advanced';
  }
  
  return {
    percentage,
    components,
    missing: missingComponents,
    detected: detectedComponents,
    expertiseLevel,
  };
}

// ============================================================================
// EXPERTISE DETECTION (For Prompt Selection)
// ============================================================================

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExpertiseDetectionResult {
  level: ExpertiseLevel;
  questionCount: 0 | 1 | 2 | 3;
  approach: 'structured_options' | 'rapid_completion' | 'parse_and_confirm';
  tone: 'encouraging' | 'confirmatory' | 'professional';
  completeness: CompletenessResult;
}

/**
 * Detect user expertise level and determine question approach
 * 
 * @param message - User's first message
 * @returns ExpertiseDetectionResult with question count and approach
 */
export function detectExpertiseLevel(message: string): ExpertiseDetectionResult {
  const completeness = calculateCompleteness(message);
  
  // Check for very vague beginner indicators
  const isVeryVague = /\b(want|start|learn|new|begin|how\s+do\s+i|teach|help\s+me)\b/i.test(message);
  const hasNoSpecifics = completeness.detected.length === 0;
  
  // Beginner: Very vague with no specifics
  if (isVeryVague && hasNoSpecifics) {
    return {
      level: 'beginner',
      questionCount: 3,
      approach: 'structured_options',
      tone: 'encouraging',
      completeness,
    };
  }
  
  // Advanced: Has most components (70%+)
  if (completeness.percentage >= 0.7) {
    return {
      level: 'advanced',
      questionCount: 0,
      approach: 'parse_and_confirm',
      tone: 'professional',
      completeness,
    };
  }
  
  // Intermediate-high: 50-70% complete, just fill gaps
  if (completeness.percentage >= 0.5) {
    return {
      level: 'intermediate',
      questionCount: 1,
      approach: 'rapid_completion',
      tone: 'confirmatory',
      completeness,
    };
  }
  
  // Intermediate-low: 30-50% complete, need 2 critical questions
  if (completeness.percentage >= 0.3) {
    return {
      level: 'intermediate',
      questionCount: 2,
      approach: 'rapid_completion',
      tone: 'confirmatory',
      completeness,
    };
  }
  
  // Borderline: Has some pattern/instrument but not much else
  if (completeness.components.pattern.detected || completeness.components.instrument.detected) {
    return {
      level: 'intermediate',
      questionCount: 2,
      approach: 'rapid_completion',
      tone: 'confirmatory',
      completeness,
    };
  }
  
  // Default to beginner path
  return {
    level: 'beginner',
    questionCount: 3,
    approach: 'structured_options',
    tone: 'encouraging',
    completeness,
  };
}

// ============================================================================
// SMART DEFAULTS
// ============================================================================

export interface StrategyDefaults {
  target: { value: string; reasoning: string };
  sizing: { value: string; reasoning: string };
  rangePeriod: { value: string; reasoning: string };
  session: { value: string; reasoning: string };
  direction: { value: string; reasoning: string };
}

/**
 * Get smart defaults based on detected strategy pattern
 */
export function getSmartDefaults(patternType?: string): StrategyDefaults {
  const baseDefaults: StrategyDefaults = {
    target: { value: '1:2 R:R', reasoning: 'Industry standard for day trading' },
    sizing: { value: '1% risk per trade', reasoning: 'Professional risk management' },
    rangePeriod: { value: '15 minutes', reasoning: 'Common standard' },
    session: { value: 'NY session (9:30 AM - 4:00 PM ET)', reasoning: 'Full trading day' },
    direction: { value: 'Both long and short', reasoning: 'Flexible trading' },
  };
  
  // Pattern-specific defaults
  if (patternType === 'orb') {
    return {
      ...baseDefaults,
      rangePeriod: { value: '15 minutes', reasoning: 'Most common ORB standard' },
      session: { value: '9:30 AM - 12:00 PM ET', reasoning: 'ORB best in first 2.5 hours' },
      target: { value: '1:2 R:R', reasoning: 'ORB typically extends 1.5-2x range' },
    };
  }
  
  if (patternType === 'pullback' || patternType === 'ema') {
    return {
      ...baseDefaults,
      target: { value: '1:3 R:R', reasoning: 'Trend trades often have higher R:R potential' },
      session: { value: 'NY session (9:30 AM - 4:00 PM ET)', reasoning: 'Pullbacks work all session' },
    };
  }
  
  if (patternType === 'scalp') {
    return {
      ...baseDefaults,
      target: { value: '1:1 R:R', reasoning: 'Scalping prioritizes win rate over R:R' },
      session: { value: '9:30 AM - 11:00 AM ET', reasoning: 'Scalping best in high volatility' },
    };
  }
  
  if (patternType === 'vwap') {
    return {
      ...baseDefaults,
      target: { value: '1:2 R:R', reasoning: 'VWAP reversion to mean' },
      session: { value: 'After 10:00 AM ET', reasoning: 'VWAP more reliable after open volatility' },
    };
  }
  
  return baseDefaults;
}

/**
 * Get list of which components would use defaults
 */
export function identifyDefaultsNeeded(completeness: CompletenessResult): string[] {
  const defaultableComponents = ['target', 'sizing', 'session'];
  
  const needsDefault = completeness.missing.filter(
    component => defaultableComponents.includes(component)
  );
  
  return needsDefault;
}
