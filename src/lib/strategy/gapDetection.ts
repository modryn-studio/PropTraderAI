/**
 * COMPREHENSIVE GAP DETECTION SYSTEM
 * 
 * Complete gap detection for all 5 professional strategy requirements.
 * Replaces the simpler criticalGapsDetection.ts with a more comprehensive system.
 * 
 * Gap Types:
 * 1. Input Quality (BLOCKER) - Rejects invalid/vague input
 * 2. Stop Loss (BLOCKER) - Most critical risk parameter
 * 3. Instrument (BLOCKER if ambiguous) - Must know what to trade
 * 4. Entry Criteria (CRITICAL) - Validates specificity
 * 5. Profit Target (CRITICAL) - Can be defaulted
 * 6. Position Sizing (CRITICAL) - Can be defaulted, flag if dangerous
 * 7. Risk Parameters (RECOMMENDED) - Phase 2
 * 
 * All detectors are SYNCHRONOUS (regex-based, no Claude API calls).
 */

import { 
  STOP_PATTERNS, 
  INSTRUMENT_PATTERNS,
  PATTERN_TYPES,
  TARGET_PATTERNS,
  SIZING_PATTERNS,
} from './completenessDetection';
import { type StrategyComponent } from './patternRequirements';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES
// ============================================================================

export interface GapAssessment {
  /** Which component this assessment is for */
  component: StrategyComponent | 'input_quality';
  /** Status of this component */
  status: 'present' | 'missing' | 'ambiguous';
  /** How critical is this gap */
  severity: 'blocker' | 'critical' | 'recommended';
  /** Evidence supporting this assessment */
  evidence?: string[];
  /** Suggested questions to ask user */
  suggestedQuestions?: QuestionOption[];
  /** Confidence score for analytics (0-100) */
  confidence?: number;
}

export interface QuestionOption {
  question: string;
  options: Array<{
    value: string;
    label: string;
    default?: boolean;
  }>;
}

export interface GapAction {
  type: 'ask_question' | 'apply_defaults' | 'generate' | 'reject';
  questions?: QuestionOption[];
  reason?: string;
}

export interface GapDetectionResult {
  /** All gap assessments */
  gaps: GapAssessment[];
  /** Overall severity */
  severity: 'blocker' | 'critical' | 'warning' | 'ok';
  /** Action to take */
  action: GapAction;
  /** Detected pattern (if any) */
  pattern?: string;
  /** Detected instrument (if any) */
  instrument?: string;
}

export interface InputQualityResult extends GapAssessment {
  component: 'input_quality';
  issues: string[];
  canProceed: boolean;
}

export interface InstrumentResult extends GapAssessment {
  component: 'instrument';
  detected?: string[];
  isAmbiguous: boolean;
}

export interface EntryResult extends GapAssessment {
  component: 'entry_criteria';
  specificity: 'vague' | 'moderate' | 'specific';
}

// ============================================================================
// EXTENDED PATTERNS
// ============================================================================

/**
 * Extended stop loss patterns (supplements completenessDetection.ts)
 */
const EXTENDED_STOP_PATTERNS = [
  // Structure-based
  /below\s+(the\s+)?(low|range|structure|swing|support)/i,
  /above\s+(the\s+)?(high|range|structure|swing|resistance)/i,
  /break\s+(of\s+)?(the\s+)?(low|high|range)/i,
  
  // Mental stops
  /mental\s*stop/i,
  /exit\s+(when|if|at)/i,
  /get\s+out\s+(at|when|if)/i,
  /close\s+(the\s+)?(trade|position)\s+(when|if|at)/i,
  
  // Tick/point based
  /\d+\s*(tick|pt|point|pip)(s)?\s*(stop|sl|loss)?/i,
  /stop\s*(loss|at|of|:)?\s*\d+/i,
  /(risk|risking)\s*\d+\s*(tick|pt|point|pip)/i,
  
  // ATR based
  /\d+(\.\d+)?\s*(x\s*)?(atr|ATR)/i,
  /atr\s*(of|at|x)?\s*\d+/i,
  
  // Percentage/Dollar
  /\d+(\.\d+)?\s*%\s*(stop|loss|risk)/i,
  /\$\s*\d+\s*(stop|risk|loss)/i,
];

/**
 * Patterns that indicate extremely vague input
 */
const EXTREMELY_VAGUE_PATTERNS = [
  /^(buy|sell|trade|go)(\s+(up|down|long|short))?$/i,
  /^(make|get|earn)\s*(money|profit)$/i,
  /^(when|if)\s*it\s*(goes|moves)$/i,
  /^i\s*trade$/i,
  /^trading$/i,
];

/**
 * Patterns that indicate SPECIFIC entry criteria
 */
const SPECIFIC_ENTRY_PATTERNS = [
  // Level-based entries
  /\b(above|below|break)\s+(high|low|range|level|ema|sma|vwap)\b/i,
  /\b\d+(-|\s)?(min|minute|hour|day)\s+(high|low|range)\b/i,
  /\b(close|open|price)\s+(above|below|over|under)\s+\d+/i,
  
  // Indicator-based
  /\b\d+\s*(ema|sma|ma)\b/i,
  /\b(first|second|third)\s+candle\b/i,
  /\bcross(ing|es)?\s+(above|below)/i,
  
  // Candlestick patterns
  /\b(engulfing|doji|hammer|shooting\s*star|pin\s*bar)\b/i,
  
  // Time-based
  /\b(at|after)\s+\d{1,2}:\d{2}/i,
  /\b(at|after)\s+(market\s+)?open/i,
];

/**
 * Patterns that indicate VAGUE entry criteria
 */
const VAGUE_ENTRY_PATTERNS = [
  /\bwhen\s+it\s+(goes|moves|looks)\b/i,
  /\bif\s+it\s+(goes|moves|looks)\b/i,
  /\b(good|bad|strong|weak)\s+(candle|bar|move)\b/i,
  /\bfeels?\s+(right|good|bullish|bearish)\b/i,
  /\bwhen\s+I\s+(see|feel|think)\b/i,
];

/**
 * Extended instrument patterns
 */
const EXTENDED_INSTRUMENT_PATTERNS = [
  /\b(ES|E-?mini\s*S&P|S&P\s*500)\b/i,
  /\b(NQ|E-?mini\s*Nasdaq|Nasdaq\s*100)\b/i,
  /\b(YM|E-?mini\s*Dow|Dow\s*Jones)\b/i,
  /\b(RTY|E-?mini\s*Russell|Russell\s*2000)\b/i,
  /\b(MES|Micro\s*E-?mini\s*S&P|Micro\s*S&P)\b/i,
  /\b(MNQ|Micro\s*E-?mini\s*Nasdaq|Micro\s*NQ)\b/i,
  /\b(CL|Crude\s*Oil|WTI)\b/i,
  /\b(GC|Gold)\b/i,
  /\b(SI|Silver)\b/i,
  /\b(ZB|Bonds?|Treasury)\b/i,
  /\b(ZN|10-?Year|T-?Note)\b/i,
  /\b(6E|EUR\/USD|Euro\s*FX)\b/i,
  /\b(6J|USD\/JPY|Japanese\s*Yen)\b/i,
  /\b(6B|GBP\/USD|British\s*Pound)\b/i,
];

// ============================================================================
// INPUT QUALITY VALIDATOR
// ============================================================================

/**
 * Validates input quality BEFORE any other processing
 * This should run BEFORE Claude API call to save costs
 */
export function validateInputQuality(
  message: string
): InputQualityResult {
  const issues: string[] = [];
  const trimmed = message.trim();
  
  // Check 1: Empty or too short
  if (trimmed.length < 3) {
    return {
      component: 'input_quality',
      status: 'missing',
      severity: 'blocker',
      issues: ['Please describe your trading strategy'],
      canProceed: false,
      evidence: ['Input too short'],
      confidence: 100,
    };
  }
  
  // Check 2: Only punctuation or symbols
  if (/^[^\w]+$/.test(trimmed)) {
    return {
      component: 'input_quality',
      status: 'missing',
      severity: 'blocker',
      issues: ['Please describe your trading strategy in words'],
      canProceed: false,
      evidence: ['Invalid input: only punctuation'],
      confidence: 100,
    };
  }
  
  // Check 3: Extremely vague patterns
  if (EXTREMELY_VAGUE_PATTERNS.some(p => p.test(trimmed))) {
    return {
      component: 'input_quality',
      status: 'ambiguous',
      severity: 'blocker',
      issues: ['Please describe a specific trading setup'],
      canProceed: false,
      evidence: [trimmed],
      suggestedQuestions: [{
        question: "I need more details. Can you describe a specific setup? For example: 'ES opening range breakout' or 'NQ pullback to 20 EMA'",
        options: [
          { value: 'orb', label: 'Opening range breakout', default: true },
          { value: 'pullback', label: 'Pullback/retracement' },
          { value: 'breakout', label: 'Breakout strategy' },
          { value: 'scalp', label: 'Scalping strategy' },
          { value: 'other', label: 'Let me describe it' },
        ],
      }],
      confidence: 95,
    };
  }
  
  // Check 4: Very short input (less than 3 words) with no rules
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 3) {
    // Still let through if it has clear trading terms
    const hasTradingTerms = Object.values(PATTERN_TYPES).some(p => p.test(trimmed)) ||
                           Object.values(INSTRUMENT_PATTERNS).some(p => p.test(trimmed));
    
    if (!hasTradingTerms) {
      issues.push('Input may be too brief');
    }
  }
  
  // If we have issues but they're not blockers, we can proceed
  if (issues.length > 0) {
    return {
      component: 'input_quality',
      status: 'ambiguous',
      severity: 'critical', // Not a blocker, but flagged
      issues,
      canProceed: true,
      confidence: 70,
    };
  }
  
  // All good
  return {
    component: 'input_quality',
    status: 'present',
    severity: 'recommended',
    issues: [],
    canProceed: true,
    confidence: 90,
  };
}

// ============================================================================
// STOP LOSS DETECTOR
// ============================================================================

/**
 * Detect if stop loss is present in message or rules
 */
export function detectStopLossGap(
  message: string,
  rules: StrategyRule[],
  pattern?: string
): GapAssessment {
  // Check parsed rules first
  const hasInRules = rules.some(r => {
    const label = r.label.toLowerCase();
    const value = r.value.toLowerCase();
    
    return (
      (r.category === 'risk' || r.category === 'exit') &&
      (label.includes('stop') || label.includes('loss') ||
       value.includes('stop') || value.includes('tick') || value.includes('atr'))
    );
  });
  
  if (hasInRules) {
    return {
      component: 'stop_loss',
      status: 'present',
      severity: 'blocker',
      evidence: ['Found in parsed rules'],
      confidence: 95,
    };
  }
  
  // Check message with patterns
  const hasInPatterns = Object.values(STOP_PATTERNS).some(p => p.test(message));
  const hasInExtended = EXTENDED_STOP_PATTERNS.some(p => p.test(message));
  
  if (hasInPatterns || hasInExtended) {
    return {
      component: 'stop_loss',
      status: 'present',
      severity: 'blocker',
      evidence: ['Detected in message'],
      confidence: 85,
    };
  }
  
  // Stop loss is missing - need to ask
  return {
    component: 'stop_loss',
    status: 'missing',
    severity: 'blocker',
    evidence: ['No stop loss mentioned'],
    suggestedQuestions: [getStopLossQuestion(pattern)],
  };
}

/**
 * Get pattern-specific stop loss question
 */
function getStopLossQuestion(pattern?: string): QuestionOption {
  if (pattern === 'opening_range_breakout' || pattern === 'orb') {
    return {
      question: "Where's your stop loss for this opening range breakout?",
      options: [
        { value: 'below_range', label: 'Below opening range low', default: true },
        { value: 'range_50', label: 'Middle of range (50%)' },
        { value: 'fixed_10', label: 'Fixed: 10 ticks' },
        { value: 'fixed_20', label: 'Fixed: 20 ticks' },
        { value: 'custom', label: 'Other (specify)' },
      ],
    };
  }
  
  if (pattern === 'pullback' || pattern === 'ema_pullback') {
    return {
      question: "Where's your stop loss for this pullback strategy?",
      options: [
        { value: 'structure', label: 'Below recent swing low', default: true },
        { value: 'fixed_15', label: 'Fixed: 15 ticks' },
        { value: 'atr_1', label: '1 ATR from entry' },
        { value: 'custom', label: 'Other (specify)' },
      ],
    };
  }
  
  if (pattern === 'scalp' || pattern === 'scalping') {
    return {
      question: "Where's your stop loss for this scalping strategy?",
      options: [
        { value: 'fixed_5', label: 'Fixed: 5 ticks (tight)', default: true },
        { value: 'fixed_10', label: 'Fixed: 10 ticks' },
        { value: 'structure', label: 'Below recent low' },
        { value: 'custom', label: 'Other (specify)' },
      ],
    };
  }
  
  // Generic question
  return {
    question: "Where's your stop loss?",
    options: [
      { value: 'structure', label: 'Below recent structure', default: true },
      { value: 'fixed_10', label: 'Fixed: 10 ticks' },
      { value: 'fixed_20', label: 'Fixed: 20 ticks' },
      { value: 'atr_1', label: '1 ATR from entry' },
      { value: 'custom', label: 'Other (specify)' },
    ],
  };
}

// ============================================================================
// INSTRUMENT DETECTOR
// ============================================================================

/**
 * Detect if instrument is present, missing, or ambiguous
 */
export function detectInstrumentGap(
  message: string,
  rules: StrategyRule[]
): InstrumentResult {
  // Check parsed rules first
  const instrumentRule = rules.find(r => {
    const label = r.label.toLowerCase();
    return (
      label.includes('instrument') ||
      label.includes('symbol') ||
      label.includes('contract') ||
      label.includes('ticker')
    );
  });
  
  if (instrumentRule) {
    return {
      component: 'instrument',
      status: 'present',
      severity: 'blocker',
      detected: [instrumentRule.value],
      isAmbiguous: false,
      confidence: 90,
    };
  }
  
  // Check message for instrument patterns
  const matches: string[] = [];
  
  for (const pattern of EXTENDED_INSTRUMENT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const normalized = normalizeInstrument(match[0]);
      if (!matches.includes(normalized)) {
        matches.push(normalized);
      }
    }
  }
  
  // Also check original INSTRUMENT_PATTERNS
  for (const [name, pattern] of Object.entries(INSTRUMENT_PATTERNS)) {
    if (pattern.test(message) && !matches.includes(name)) {
      matches.push(name);
    }
  }
  
  // No instrument found
  if (matches.length === 0) {
    return {
      component: 'instrument',
      status: 'missing',
      severity: 'blocker',
      detected: [],
      isAmbiguous: true,
      suggestedQuestions: [{
        question: 'Which instrument will you trade?',
        options: [
          { value: 'ES', label: 'ES (E-mini S&P 500)', default: true },
          { value: 'NQ', label: 'NQ (E-mini Nasdaq)' },
          { value: 'MES', label: 'MES (Micro E-mini S&P)' },
          { value: 'MNQ', label: 'MNQ (Micro E-mini Nasdaq)' },
          { value: 'CL', label: 'CL (Crude Oil)' },
          { value: 'other', label: 'Other (specify)' },
        ],
      }],
    };
  }
  
  // Multiple instruments found - ambiguous
  if (matches.length > 1) {
    return {
      component: 'instrument',
      status: 'ambiguous',
      severity: 'blocker',
      detected: matches,
      isAmbiguous: true,
      evidence: [`Multiple instruments mentioned: ${matches.join(', ')}`],
      suggestedQuestions: [{
        question: `You mentioned ${matches.join(' and ')}. Which one will you trade with this strategy?`,
        options: matches.map((inst, i) => ({
          value: inst,
          label: inst,
          default: i === 0,
        })),
      }],
    };
  }
  
  // Single instrument found - good
  return {
    component: 'instrument',
    status: 'present',
    severity: 'blocker',
    detected: matches,
    isAmbiguous: false,
    confidence: 85,
  };
}

/**
 * Normalize instrument name to standard format
 */
function normalizeInstrument(raw: string): string {
  const normalized = raw.toUpperCase().replace(/[\s-]/g, '');
  
  // Map common variations to standard symbols
  const mapping: Record<string, string> = {
    'EMINI': 'ES',
    'EMINISANDP': 'ES',
    'EMINISANDP500': 'ES',
    'SP500': 'ES',
    'EMININASDAQ': 'NQ',
    'NASDAQ100': 'NQ',
    'EMINIRUSSEL': 'RTY',
    'RUSSELL2000': 'RTY',
    'CRUDEOIL': 'CL',
    'WTI': 'CL',
    'MICROES': 'MES',
    'MICROEMINISANDP': 'MES',
    'MICRONQ': 'MNQ',
    'MICROEMININASDAQ': 'MNQ',
  };
  
  return mapping[normalized] || normalized.substring(0, 3); // Take first 3 chars as symbol
}

// ============================================================================
// ENTRY CRITERIA DETECTOR
// ============================================================================

/**
 * Detect if entry criteria is specific, moderate, or vague
 */
export function detectEntryGap(
  message: string,
  rules: StrategyRule[]
): EntryResult {
  // Check parsed rules first
  const entryRule = rules.find(r => {
    const label = r.label.toLowerCase();
    return (
      r.category === 'entry' ||
      label.includes('entry') ||
      label.includes('trigger') ||
      label.includes('signal') ||
      label.includes('setup')
    );
  });
  
  // Determine specificity
  let specificity: 'vague' | 'moderate' | 'specific' = 'vague';
  
  // Check for specific patterns first
  if (SPECIFIC_ENTRY_PATTERNS.some(p => p.test(message))) {
    specificity = 'specific';
  } 
  // Check if there's an entry rule with meaningful content
  else if (entryRule && entryRule.value.length > 10) {
    specificity = 'moderate';
  }
  // Check for trading pattern types (implies some entry logic)
  else if (Object.values(PATTERN_TYPES).some(p => p.test(message))) {
    specificity = 'moderate';
  }
  // Check for vague patterns
  else if (VAGUE_ENTRY_PATTERNS.some(p => p.test(message))) {
    specificity = 'vague';
  }
  
  if (specificity === 'vague') {
    return {
      component: 'entry_criteria',
      status: 'ambiguous',
      severity: 'critical',
      specificity,
      evidence: ['Entry criteria too vague to be actionable'],
      suggestedQuestions: [{
        question: "Can you be more specific about your entry? For example: 'Long when price breaks above 15-min range high'",
        options: [
          { value: 'breakout_high', label: 'Break above high', default: true },
          { value: 'breakout_low', label: 'Break below low' },
          { value: 'pullback_ema', label: 'Pullback to EMA' },
          { value: 'pullback_vwap', label: 'Pullback to VWAP' },
          { value: 'custom', label: 'Let me describe it' },
        ],
      }],
    };
  }
  
  return {
    component: 'entry_criteria',
    status: 'present',
    severity: 'critical',
    specificity,
    confidence: specificity === 'specific' ? 90 : 70,
  };
}

// ============================================================================
// PROFIT TARGET DETECTOR
// ============================================================================

/**
 * Detect if profit target is present
 * Can be defaulted if missing (not a blocker)
 */
export function detectProfitTargetGap(
  message: string,
  rules: StrategyRule[]
): GapAssessment {
  // Check parsed rules
  const targetRule = rules.find(r => {
    const label = r.label.toLowerCase();
    const value = r.value.toLowerCase();
    
    return (
      r.category === 'exit' &&
      (label.includes('target') || label.includes('profit') || label.includes('take') ||
       value.includes('r:r') || value.includes(':1') || value.includes('1:'))
    );
  });
  
  if (targetRule) {
    return {
      component: 'profit_target',
      status: 'present',
      severity: 'critical',
      evidence: ['Found in parsed rules'],
      confidence: 90,
    };
  }
  
  // Check message with patterns
  const hasTarget = Object.values(TARGET_PATTERNS).some(p => p.test(message));
  
  if (hasTarget) {
    return {
      component: 'profit_target',
      status: 'present',
      severity: 'critical',
      evidence: ['Detected in message'],
      confidence: 80,
    };
  }
  
  // Missing but can be defaulted
  return {
    component: 'profit_target',
    status: 'missing',
    severity: 'critical',
    evidence: ['Will default to 2:1 R:R (industry standard)'],
  };
}

// ============================================================================
// POSITION SIZING DETECTOR
// ============================================================================

/**
 * Detect if position sizing is present and validate if reasonable
 */
export function detectSizingGap(
  message: string,
  rules: StrategyRule[]
): GapAssessment {
  // Check parsed rules
  const sizingRule = rules.find(r => {
    const label = r.label.toLowerCase();
    return (
      r.category === 'risk' ||
      label.includes('sizing') ||
      label.includes('size') ||
      label.includes('contract') ||
      label.includes('risk')
    );
  });
  
  if (sizingRule) {
    // Validate if reasonable
    const value = sizingRule.value;
    const percentMatch = value.match(/(\d+)%/);
    
    if (percentMatch) {
      const percent = parseInt(percentMatch[1], 10);
      
      // Flag dangerously high risk
      if (percent > 5) {
        return {
          component: 'position_sizing',
          status: 'ambiguous', // Not 'conflicting' in Phase 1
          severity: 'blocker', // High risk is a blocker
          evidence: [`${percent}% risk per trade exceeds professional maximum (2%)`],
          suggestedQuestions: [{
            question: `${percent}% risk is very high. Industry standard is 1-2%. Would you like to adjust?`,
            options: [
              { value: '1', label: '1% risk (conservative)', default: true },
              { value: '2', label: '2% risk (standard)' },
              { value: 'keep', label: `Keep ${percent}% (not recommended)` },
            ],
          }],
        };
      }
    }
    
    return {
      component: 'position_sizing',
      status: 'present',
      severity: 'critical',
      evidence: ['Found in parsed rules'],
      confidence: 90,
    };
  }
  
  // Check message with patterns
  const hasSizing = Object.values(SIZING_PATTERNS).some(p => p.test(message));
  
  if (hasSizing) {
    return {
      component: 'position_sizing',
      status: 'present',
      severity: 'critical',
      evidence: ['Detected in message'],
      confidence: 80,
    };
  }
  
  // Missing but can be defaulted
  return {
    component: 'position_sizing',
    status: 'missing',
    severity: 'critical',
    evidence: ['Will default to 1% risk per trade'],
  };
}

// ============================================================================
// RISK PARAMETERS DETECTOR (Phase 2 - Minimal for now)
// ============================================================================

/**
 * Detect if risk parameters (daily limits, etc.) are present
 * RECOMMENDED only - not required in Phase 1
 */
export function detectRiskParametersGap(
  message: string
): GapAssessment {
  const RISK_PARAM_PATTERNS = [
    /\b(daily|max|maximum)\s*(loss|drawdown|limit)/i,
    /\b(\d+)%?\s*(daily|max)\s*(loss|limit)/i,
    /\b(stop|quit)\s*(after|at)\s*\$?(\d+)/i,
    /\b(max|maximum)\s*(\d+)\s*trades?\s*(per\s*day)?/i,
  ];
  
  if (RISK_PARAM_PATTERNS.some(p => p.test(message))) {
    return {
      component: 'risk_parameters',
      status: 'present',
      severity: 'recommended',
      confidence: 75,
    };
  }
  
  return {
    component: 'risk_parameters',
    status: 'missing',
    severity: 'recommended',
    evidence: ['Risk parameters (daily limits) are recommended for professional trading'],
  };
}

// ============================================================================
// MAIN GAP DETECTION FUNCTION
// ============================================================================

/**
 * Detect all gaps in strategy description
 * 
 * This is the main entry point for gap detection.
 * All detectors are SYNCHRONOUS (no Claude API calls).
 * 
 * @param userMessage - The user's strategy description
 * @param parsedRules - Rules already parsed by Claude
 * @param options - Optional context (pattern, instrument)
 */
export function detectAllGaps(
  userMessage: string,
  parsedRules: StrategyRule[] = [],
  options?: {
    pattern?: string;
    instrument?: string;
    isFollowUp?: boolean;
  }
): GapDetectionResult {
  const pattern = options?.pattern || detectPatternFromMessage(userMessage);
  
  // Run all detectors (synchronous)
  const stopLoss = detectStopLossGap(userMessage, parsedRules, pattern);
  const instrument = detectInstrumentGap(userMessage, parsedRules);
  const entry = detectEntryGap(userMessage, parsedRules);
  const profitTarget = detectProfitTargetGap(userMessage, parsedRules);
  const sizing = detectSizingGap(userMessage, parsedRules);
  const riskParams = detectRiskParametersGap(userMessage);
  
  // Collect all gaps that aren't 'present'
  const allGaps: GapAssessment[] = [
    stopLoss,
    instrument,
    entry,
    profitTarget,
    sizing,
    riskParams,
  ];
  
  const gapsWithIssues = allGaps.filter(g => g.status !== 'present');
  
  // Get detected instrument from the detector
  const detectedInstrument = (instrument as InstrumentResult).detected?.[0] || options?.instrument;
  
  // Determine action based on gaps
  const result = determineAction(gapsWithIssues);
  
  return {
    ...result,
    pattern,
    instrument: detectedInstrument,
  };
}

/**
 * Detect pattern from message (simplified version)
 */
function detectPatternFromMessage(message: string): string | undefined {
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
    const regex = PATTERN_TYPES[patternType as keyof typeof PATTERN_TYPES];
    if (regex && regex.test(message)) {
      return patternType;
    }
  }
  
  return undefined;
}

/**
 * Determine what action to take based on gaps
 */
function determineAction(
  gaps: GapAssessment[]
): Omit<GapDetectionResult, 'pattern' | 'instrument'> {
  // Get blocker gaps (must ask)
  const blockers = gaps.filter(g => 
    g.severity === 'blocker' && g.status !== 'present'
  );
  
  // Get critical gaps (can default)
  const criticals = gaps.filter(g => 
    g.severity === 'critical' && g.status === 'missing'
  );
  
  // If there are blockers, ask about the highest priority one
  if (blockers.length > 0) {
    const prioritized = prioritizeGaps(blockers);
    const topGap = prioritized[0];
    
    return {
      gaps,
      severity: 'blocker',
      action: {
        type: 'ask_question',
        questions: topGap.suggestedQuestions || [],
      },
    };
  }
  
  // If there are critical gaps, we can apply defaults
  if (criticals.length > 0) {
    return {
      gaps,
      severity: 'critical',
      action: {
        type: 'apply_defaults',
        reason: `Applying defaults for: ${criticals.map(g => g.component).join(', ')}`,
      },
    };
  }
  
  // All good - generate strategy
  return {
    gaps,
    severity: 'ok',
    action: { type: 'generate' },
  };
}

/**
 * Prioritize gaps by importance
 */
function prioritizeGaps(gaps: GapAssessment[]): GapAssessment[] {
  const priority: Array<StrategyComponent | 'input_quality'> = [
    'input_quality', // Reject bad input first
    'instrument',    // Must know what to trade
    'stop_loss',     // Most critical risk parameter
    'entry_criteria',// Must know when to enter
    'profit_target', // Should know when to exit
    'position_sizing',
    'risk_parameters',
  ];
  
  return gaps.sort((a, b) => {
    const aIdx = priority.indexOf(a.component);
    const bIdx = priority.indexOf(b.component);
    return aIdx - bIdx;
  });
}

// All functions are exported inline above
