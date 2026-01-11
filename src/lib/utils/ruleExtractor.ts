/**
 * ENHANCED RULE EXTRACTOR V2
 * 
 * Implements smarter extraction:
 * 1. Extract from user messages IMMEDIATELY (they're declaring facts)
 * 2. Extract from Claude ONLY on confirmations (not questions)
 * 3. Accumulate progressively (merge, not replace)
 * 4. Update existing rules when user changes mind
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

interface ExtractionPattern {
  regex: RegExp;
  category: StrategyRule['category'];
  label: string;
  valueTransform?: (match: RegExpMatchArray) => string | null;
  confidenceScore?: number; // 0-1, higher = more confident
}

// ============================================================================
// CONFIRMATION DETECTION
// ============================================================================

/**
 * Detect if Claude's message is a CONFIRMATION (extract rules)
 * vs a QUESTION (skip extraction)
 */
export function isConfirmation(text: string): boolean {
  // Confirmation phrases (Claude agreeing/confirming)
  const confirmationPatterns = [
    /^(good|great|perfect|nice|solid|smart|excellent|got it|right)/i,
    /^(ok|okay),?\s/i,
    /(that'?s|this is)\s+(good|great|perfect|solid|smart|aggressive|tight)/i,
    /i'?ve?\s+got\s+(it|everything)/i,
    /(gives you|provides|creates)\s+a\s+/i,
    /^(understood|clear|makes sense)/i,
  ];
  
  // Question phrases (Claude asking - SKIP these)
  const questionPatterns = [
    /^(which|what|how|do you|are you|would you)/i,
    /\?$/,
    /^(first|next|final)\s+question/i,
    /^clarifying/i,
    /or do you/i,
  ];
  
  // Check for questions first (higher priority)
  if (questionPatterns.some(p => p.test(text))) {
    debugLog('isConfirmation: false (question detected)', text.substring(0, 100));
    return false;
  }
  
  // Check for confirmations
  const result = confirmationPatterns.some(p => p.test(text));
  debugLog(`isConfirmation: ${result}`, text.substring(0, 100));
  return result;
}

// ============================================================================
// ENHANCED PATTERN MATCHING
// ============================================================================

/**
 * Enhanced patterns - handles conversational input like "I trade NQ"
 */
const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // ========== SETUP ==========
  
  // Pattern detection
  { 
    regex: /opening\s+range(?:\s+breakout)?|orb/gi, 
    category: 'setup', 
    label: 'Pattern',
    valueTransform: () => 'Opening Range Breakout',
    confidenceScore: 1.0
  },
  { 
    regex: /pullback(?:\s+entry)?/gi, 
    category: 'setup', 
    label: 'Pattern',
    valueTransform: () => 'Pullback Entry',
    confidenceScore: 0.8
  },
  { 
    regex: /ema\s+pullback/gi, 
    category: 'setup', 
    label: 'Pattern',
    valueTransform: () => 'EMA Pullback',
    confidenceScore: 1.0
  },
  
  // Instrument (handles "I trade NQ", "im trading NQ", "on NQ")
  { 
    regex: /(?:i\s+)?(?:trade|trading|on)\s+(NQ|ES|MNQ|MES|YM|RTY|CL|GC)/gi, 
    category: 'setup', 
    label: 'Instrument',
    valueTransform: (m) => m[1].toUpperCase(),
    confidenceScore: 1.0
  },
  { 
    regex: /\b(NQ|ES|MNQ|MES|YM|RTY|CL|GC)\b(?!\s+traders)/gi, 
    category: 'setup', 
    label: 'Instrument',
    valueTransform: (m) => m[1].toUpperCase(),
    confidenceScore: 0.7
  },
  
  // Direction
  { 
    regex: /(?:both\s+directions|long\s+and\s+short|bidirectional)/gi, 
    category: 'setup', 
    label: 'Direction',
    valueTransform: () => 'Long and Short',
    confidenceScore: 1.0
  },
  { 
    regex: /\b(?:only\s+)?longs?\b(?!\s+and)/gi, 
    category: 'setup', 
    label: 'Direction',
    valueTransform: () => 'Long only',
    confidenceScore: 0.8
  },
  { 
    regex: /\b(?:only\s+)?shorts?\b(?!\s+and)/gi, 
    category: 'setup', 
    label: 'Direction',
    valueTransform: () => 'Short only',
    confidenceScore: 0.8
  },
  
  // ========== ENTRY ==========
  
  { 
    regex: /break(?:out)?\s+(?:above|below)\s+(?:the\s+)?(.+?)(?:\n|$|,|\.|range)/gi, 
    category: 'entry', 
    label: 'Entry Trigger',
    valueTransform: (m) => {
      const value = m[1]?.trim();
      if (value && value.length < 30) return `Break ${value}`;
      return null;
    },
    confidenceScore: 0.9
  },
  { 
    regex: /(?:enter|entry)(?:\s+on)?\s+(?:a\s+)?(?:pullback|retest)/gi, 
    category: 'entry', 
    label: 'Entry Trigger',
    valueTransform: () => 'Retest/Pullback',
    confidenceScore: 0.9
  },
  { 
    regex: /(?:wait|enter)\s+(?:for|on)\s+(?:a\s+)?retest/gi, 
    category: 'entry', 
    label: 'Entry Trigger',
    valueTransform: () => 'Wait for retest',
    confidenceScore: 1.0
  },
  
  // ========== EXIT ==========
  
  { 
    regex: /target(?:\s+is)?\s*[:\-]?\s*(.+?)(?:\n|$|,|\.(?=\s))/gi, 
    category: 'exit', 
    label: 'Target',
    valueTransform: (m) => {
      const value = m[1]?.trim();
      if (value && value.length < 40) return value;
      return null;
    },
    confidenceScore: 0.9
  },
  { 
    regex: /(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s+(?:rr|r:r|risk[\s-]?reward)/gi, 
    category: 'exit', 
    label: 'Target',
    valueTransform: (m) => `${m[1]}:${m[2]} risk-reward`,
    confidenceScore: 1.0
  },
  { 
    regex: /(?:take\s+profit|target)(?:\s+at)?\s+(\d+[-\s]?\d*)\s*(?:ticks?|points?|pts?)/gi, 
    category: 'exit', 
    label: 'Target',
    valueTransform: (m) => `${m[1]} ${m[0].includes('tick') ? 'ticks' : 'points'}`,
    confidenceScore: 1.0
  },
  
  // ========== RISK ==========
  
  { 
    regex: /stop(?:\s+loss)?(?:\s+(?:is|at|goes|placement))?\s*[:\-]?\s*(.+?)(?:\n|$|,|\.(?=\s))/gi, 
    category: 'risk', 
    label: 'Stop Loss',
    valueTransform: (m) => {
      const value = m[1]?.trim();
      if (!value || value.length > 50) return null;
      if (value.toLowerCase().includes('question')) return null;
      return value;
    },
    confidenceScore: 0.85
  },
  { 
    regex: /(?:stop\s+at|stop\s+is)\s+(?:the\s+)?(middle|mid(?:point)?|center)\s+(?:of\s+)?(?:the\s+)?(?:range|opening\s+range)/gi, 
    category: 'risk', 
    label: 'Stop Loss',
    valueTransform: () => 'Middle of range',
    confidenceScore: 1.0
  },
  { 
    regex: /(\d+)\s*(?:tick|point|pt)s?\s+(?:stop|below|above)/gi, 
    category: 'risk', 
    label: 'Stop Loss',
    valueTransform: (m) => `${m[1]} ${m[0].includes('tick') ? 'ticks' : 'points'}`,
    confidenceScore: 1.0
  },
  
  // Risk:Reward
  { 
    regex: /(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*(?:rr|r:r|risk[\s-]?reward)?/gi, 
    category: 'risk', 
    label: 'Risk:Reward',
    valueTransform: (m) => `${m[1]}:${m[2]}`,
    confidenceScore: 0.9
  },
  
  // Position sizing
  { 
    regex: /risk(?:ing)?\s+(\d+(?:\.\d+)?%)\s+(?:of\s+)?(?:account|balance)/gi, 
    category: 'risk', 
    label: 'Position Size',
    valueTransform: (m) => `${m[1]} of account`,
    confidenceScore: 1.0
  },
  { 
    regex: /(\d+)\s+contracts?/gi, 
    category: 'risk', 
    label: 'Position Size',
    valueTransform: (m) => {
      const num = parseInt(m[1]);
      return `${num} contract${num > 1 ? 's' : ''}`;
    },
    confidenceScore: 0.8
  },
  
  // ========== TIMEFRAME ==========
  
  { 
    regex: /(?:first|opening)\s+(\d+)[\s-]?min(?:ute)?s?/gi, 
    category: 'timeframe', 
    label: 'Range Period',
    valueTransform: (m) => `${m[1]} minutes`,
    confidenceScore: 1.0
  },
  { 
    regex: /(\d+)[\s-]?min(?:ute)?s?\s+(?:range|window|period)/gi, 
    category: 'timeframe', 
    label: 'Range Period',
    valueTransform: (m) => `${m[1]} minutes`,
    confidenceScore: 1.0
  },
  
  // Session timing
  { 
    regex: /\b(?:rth|regular\s+trading\s+hours)\b/gi, 
    category: 'timeframe', 
    label: 'Session',
    valueTransform: () => 'RTH (9:30 AM - 4:00 PM ET)',
    confidenceScore: 1.0
  },
  { 
    regex: /\bglobex\b/gi, 
    category: 'timeframe', 
    label: 'Session',
    valueTransform: () => 'Globex (6:00 PM ET)',
    confidenceScore: 1.0
  },
  
  // ========== FILTERS ==========
  
  { 
    regex: /(\d+)[\s-]?(?:ema|sma|ma)(?!\s+traders)/gi, 
    category: 'filters', 
    label: 'Moving Average Filter',
    valueTransform: (m) => {
      const period = m[1];
      const type = m[0].toLowerCase().includes('ema') ? 'EMA' : 
                   m[0].toLowerCase().includes('sma') ? 'SMA' : 'MA';
      return `${period} ${type}`;
    },
    confidenceScore: 0.9
  },
  
  { 
    regex: /\bvwap\b(?:\s+(?:confirmation|filter|above|below))?/gi, 
    category: 'filters', 
    label: 'VWAP Filter',
    valueTransform: () => 'VWAP confirmation',
    confidenceScore: 0.9
  },
];

// ============================================================================
// ENHANCED EXTRACTION
// ============================================================================

/**
 * Extract rules from text with confidence scoring
 */
export function extractRulesEnhanced(
  text: string,
  isUserMessage: boolean
): StrategyRule[] {
  const rules: StrategyRule[] = [];
  const seen = new Set<string>();
  
  // Confidence threshold - lower for user messages (they're stating facts)
  const confidenceThreshold = isUserMessage ? 0.7 : 0.85;
  
  for (const pattern of EXTRACTION_PATTERNS) {
    pattern.regex.lastIndex = 0;
    
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      // Apply confidence threshold
      if (pattern.confidenceScore && pattern.confidenceScore < confidenceThreshold) {
        continue;
      }
      
      const value = pattern.valueTransform 
        ? pattern.valueTransform(match)
        : match[1]?.trim();
      
      if (!value) continue;
      
      // Deduplicate
      const key = `${pattern.category}:${pattern.label}:${value}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      
      rules.push({
        label: pattern.label,
        value: value,
        category: pattern.category,
      });
    }
  }
  
  debugLog(`Extracted ${rules.length} rules (user=${isUserMessage})`, rules);
  return rules;
}

// ============================================================================
// SMART ACCUMULATION
// ============================================================================

/**
 * Accumulate rules intelligently:
 * - Merge new rules with existing
 * - Update existing rules (same category + label) with new value
 * - No duplicates
 */
export function accumulateRules(
  existingRules: StrategyRule[],
  newRules: StrategyRule[]
): StrategyRule[] {
  if (newRules.length === 0) return existingRules;
  if (existingRules.length === 0) return newRules;
  
  // Create map of existing rules by category:label
  const ruleMap = new Map<string, StrategyRule>();
  
  existingRules.forEach(rule => {
    const key = `${rule.category}:${rule.label}`.toLowerCase();
    ruleMap.set(key, rule);
  });
  
  // Add/update with new rules (overwrites if exists = update behavior)
  newRules.forEach(rule => {
    const key = `${rule.category}:${rule.label}`.toLowerCase();
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
// CONVERSATION-AWARE EXTRACTION
// ============================================================================

/**
 * Extract rules from a message based on role and content
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
  // ALWAYS extract from user messages (they're declaring facts)
  if (role === 'user') {
    const newRules = extractRulesEnhanced(message, true);
    return accumulateRules(existingRules, newRules);
  }
  
  // For Claude messages: ONLY if it's a confirmation
  if (role === 'assistant' && isConfirmation(message)) {
    const newRules = extractRulesEnhanced(message, false);
    return accumulateRules(existingRules, newRules);
  }
  
  // Skip Claude's questions
  return existingRules;
}

// ============================================================================
// LEGACY EXPORTS (for mapParsedRulesToStrategyRules)
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
