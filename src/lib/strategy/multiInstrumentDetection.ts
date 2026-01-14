/**
 * MULTI-INSTRUMENT DETECTION & HANDLING
 * 
 * Detects when users mention multiple instruments and handles appropriately:
 * - "I trade this setup on both ES and NQ"
 * - "Works on NQ, ES, and MNQ"
 * 
 * Prevents strategy corruption by prompting for clarification or
 * offering to create separate strategies.
 * 
 * Part of: Rapid Strategy Builder Edge Case Handling
 */

import { INSTRUMENT_PATTERNS } from './completenessDetection';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MultiInstrumentResult {
  hasMultipleInstruments: boolean;
  instruments: string[];
  suggestedAction: 'create_multiple' | 'pick_one' | 'proceed_single';
  clarificationMessage?: string;
}

export interface InstrumentComparison {
  instrument: string;
  tickValue: number;
  description: string;
  volatility: 'low' | 'medium' | 'high';
  recommendedFor: string;
}

// ============================================================================
// INSTRUMENT DATA
// ============================================================================

const INSTRUMENT_INFO: Record<string, InstrumentComparison> = {
  ES: {
    instrument: 'ES',
    tickValue: 12.50,
    description: 'E-mini S&P 500 - $12.50/tick',
    volatility: 'medium',
    recommendedFor: 'Steadier moves, more forgiving for learning',
  },
  NQ: {
    instrument: 'NQ',
    tickValue: 5.00,
    description: 'E-mini Nasdaq - $5.00/tick',
    volatility: 'high',
    recommendedFor: 'More volatility, faster moves, more opportunities',
  },
  MES: {
    instrument: 'MES',
    tickValue: 1.25,
    description: 'Micro E-mini S&P - $1.25/tick',
    volatility: 'medium',
    recommendedFor: 'Same as ES but 1/10 size, great for learning',
  },
  MNQ: {
    instrument: 'MNQ',
    tickValue: 0.50,
    description: 'Micro E-mini Nasdaq - $0.50/tick',
    volatility: 'high',
    recommendedFor: 'Same as NQ but 1/10 size, lower risk per contract',
  },
  CL: {
    instrument: 'CL',
    tickValue: 10.00,
    description: 'Crude Oil - $10.00/tick',
    volatility: 'high',
    recommendedFor: 'Oil traders, news-driven moves',
  },
  GC: {
    instrument: 'GC',
    tickValue: 10.00,
    description: 'Gold Futures - $10.00/tick',
    volatility: 'medium',
    recommendedFor: 'Safe-haven plays, inflation hedging',
  },
};

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Extract all instruments mentioned in a message
 */
export function extractAllInstruments(message: string): string[] {
  const instruments: string[] = [];
  const normalizedMessage = message.toUpperCase();
  
  for (const [instrument, pattern] of Object.entries(INSTRUMENT_PATTERNS)) {
    if (pattern.test(message)) {
      instruments.push(instrument);
    }
  }
  
  // Also check for explicit mentions
  const explicitPatterns: Record<string, RegExp> = {
    ES: /\bES\b/,
    NQ: /\bNQ\b/,
    MES: /\bMES\b/,
    MNQ: /\bMNQ\b/,
    CL: /\bCL\b/,
    GC: /\bGC\b/,
  };
  
  for (const [instrument, pattern] of Object.entries(explicitPatterns)) {
    if (pattern.test(normalizedMessage) && !instruments.includes(instrument)) {
      instruments.push(instrument);
    }
  }
  
  return Array.from(new Set(instruments)); // Remove duplicates
}

/**
 * Detect if message contains multiple instruments and determine action
 */
export function detectMultiInstrument(message: string): MultiInstrumentResult {
  const instruments = extractAllInstruments(message);
  
  if (instruments.length <= 1) {
    return {
      hasMultipleInstruments: false,
      instruments: instruments,
      suggestedAction: 'proceed_single',
    };
  }
  
  // Multiple instruments detected
  const clarificationMessage = generateMultiInstrumentClarification(instruments);
  
  return {
    hasMultipleInstruments: true,
    instruments,
    suggestedAction: instruments.length === 2 ? 'pick_one' : 'pick_one',
    clarificationMessage,
  };
}

/**
 * Generate clarification message for multi-instrument detection
 */
function generateMultiInstrumentClarification(instruments: string[]): string {
  const comparison = instruments
    .filter(i => INSTRUMENT_INFO[i])
    .map(i => `• **${i}**: ${INSTRUMENT_INFO[i].recommendedFor}`)
    .join('\n');
  
  return `I see you want to trade this on ${instruments.join(' and ')}.

Most traders create separate strategies for each since they have different characteristics:

${comparison}

Which should we focus on first?
${instruments.map((inst, i) => `${String.fromCharCode(97 + i)}) ${inst}`).join('\n')}
${String.fromCharCode(97 + instruments.length)}) Create separate strategies for each (recommended)`;
}

/**
 * Adjust stop loss for different instruments based on tick value
 * Used when creating multiple strategies from one template
 */
export function adjustStopForInstrument(
  stopValue: string,
  sourceInstrument: string,
  targetInstrument: string
): string {
  if (sourceInstrument === targetInstrument) return stopValue;
  
  // Parse stop value
  const tickMatch = stopValue.match(/(\d+)\s*(tick|pt|point)/i);
  if (!tickMatch) return stopValue; // Return as-is if not tick-based
  
  const ticks = parseInt(tickMatch[1]);
  const sourceInfo = INSTRUMENT_INFO[sourceInstrument];
  const targetInfo = INSTRUMENT_INFO[targetInstrument];
  
  if (!sourceInfo || !targetInfo) return stopValue;
  
  // Calculate equivalent dollar risk
  const dollarRisk = ticks * sourceInfo.tickValue;
  
  // Calculate equivalent ticks for target instrument
  const adjustedTicks = Math.round(dollarRisk / targetInfo.tickValue);
  
  return `${adjustedTicks} ticks`;
}

/**
 * Parse user's multi-instrument choice from response
 */
export function parseMultiInstrumentChoice(
  response: string,
  instruments: string[]
): { choice: 'single' | 'multiple'; selectedInstruments: string[] } {
  const normalized = response.toLowerCase().trim();
  
  // Check for letter choice (a, b, c, etc.)
  const letterMatch = normalized.match(/^([a-z])[\.\)\s]?$/);
  if (letterMatch) {
    const index = letterMatch[1].charCodeAt(0) - 97;
    
    // Last option is always "create multiple"
    if (index === instruments.length) {
      return { choice: 'multiple', selectedInstruments: instruments };
    }
    
    if (index >= 0 && index < instruments.length) {
      return { choice: 'single', selectedInstruments: [instruments[index]] };
    }
  }
  
  // Check for explicit instrument mention
  for (const instrument of instruments) {
    if (normalized.includes(instrument.toLowerCase())) {
      return { choice: 'single', selectedInstruments: [instrument] };
    }
  }
  
  // Check for "both", "all", "separate", "multiple"
  if (/\b(both|all|separate|multiple|each)\b/i.test(normalized)) {
    return { choice: 'multiple', selectedInstruments: instruments };
  }
  
  // Default to first instrument if unclear
  return { choice: 'single', selectedInstruments: [instruments[0]] };
}

const multiInstrumentExports = {
  extractAllInstruments,
  detectMultiInstrument,
  adjustStopForInstrument,
  parseMultiInstrumentChoice,
};

export default multiInstrumentExports;
