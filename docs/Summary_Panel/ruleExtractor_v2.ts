/**
 * ENHANCED RULE EXTRACTOR V2
 * 
 * Implements Scenario B: Extract from User Messages + Claude Confirmations
 * 
 * Key improvements:
 * 1. Detects confirmation vs question in Claude's responses
 * 2. Accumulates rules progressively (merge, not replace)
 * 3. Updates existing rules when user changes mind
 * 4. Focuses ONLY on core strategy parameters (no commentary)
 * 5. Reduces cognitive load
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// CONFIRMATION DETECTION
// ============================================================================

/**
 * Detect if Claude's message is a CONFIRMATION (extract rules)
 * vs a QUESTION (skip extraction)
 */
export function isConfirmation(text: string): boolean {
  const lower = text.toLowerCase();
  
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
    return false;
  }
  
  // Check for confirmations
  return confirmationPatterns.some(p => p.test(text));
}

// ============================================================================
// ENHANCED PATTERN MATCHING (Core Parameters Only)
// ============================================================================

interface ExtractionPattern {
  regex: RegExp;
  category: StrategyRule['category'];
  label: string;
  valueTransform?: (match: RegExpMatchArray) => string | null;
  confidenceScore?: number; // 0-1, higher = more confident
}

/**
 * Enhanced patterns - more conversational, handles "im trading NQ" style
 */
const ENHANCED_EXTRACTION_PATTERNS: ExtractionPattern[] = [
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
    confidenceScore: 0.8 // Lower because might be in a question
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
    regex: /(?:trade|trading|on)\s+(NQ|ES|MNQ|MES|YM|RTY|CL|GC)/gi, 
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
    confidenceScore: 0.7 // Lower confidence (might be mentioned in passing)
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
  
  // Entry triggers
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
  
  // Profit targets
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
  
  // Stop loss
  { 
    regex: /stop(?:\s+loss)?(?:\s+(?:is|at|goes|placement))?\s*[:\-]?\s*(.+?)(?:\n|$|,|\.(?=\s))/gi, 
    category: 'risk', 
    label: 'Stop Loss',
    valueTransform: (m) => {
      const value = m[1]?.trim();
      // Filter out non-stop-loss content
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
  
  // Range periods (handles "first 15 min", "first 15min", "15 minutes")
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
  
  // EMA/MA filters
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
  
  // VWAP filter
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
 * Only extracts CORE STRATEGY PARAMETERS (no commentary)
 */
export function extractRulesEnhanced(
  text: string,
  isUserMessage: boolean
): StrategyRule[] {
  const rules: StrategyRule[] = [];
  const seen = new Set<string>();
  
  // Confidence threshold - higher for non-user messages
  const confidenceThreshold = isUserMessage ? 0.7 : 0.85;
  
  for (const pattern of ENHANCED_EXTRACTION_PATTERNS) {
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
  
  return rules;
}

// ============================================================================
// SMART ACCUMULATION
// ============================================================================

/**
 * Accumulate rules intelligently:
 * - Merge new rules with existing
 * - Update existing rules (same category + label)
 * - No duplicates
 * - Keep most recent value when conflict
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
  
  // Add/update with new rules
  newRules.forEach(rule => {
    const key = `${rule.category}:${rule.label}`.toLowerCase();
    ruleMap.set(key, rule); // Overwrites if exists (update behavior)
  });
  
  // Convert back to array
  return Array.from(ruleMap.values());
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
  // ALWAYS extract from user messages
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
