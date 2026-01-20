/**
 * Claude to Canonical Normalizer
 * 
 * Transforms Claude's ParsedRules output into the canonical execution schema.
 * This is the bridge between AI parsing and the execution engine.
 * 
 * Key transformations:
 * - Pattern detection from entry_conditions
 * - snake_case → camelCase
 * - Loose structure → strict discriminated union
 * - Text-based stops/targets → structured config
 * 
 * @module lib/strategy/claudeToCanonical
 * @see Issue #42 - Canonical Schema Architecture
 */

import { 
  CanonicalParsedRules,
  OpeningRangeBreakoutRules,
  EMAPullbackRules,
  BreakoutRules,
  InstrumentSpec,
  ExitConfig,
  RiskConfig,
  TimeConfig,
  validateCanonical,
  INSTRUMENT_DEFAULTS,
} from '../execution/canonical-schema';

import type { ParsedRules, EntryCondition, ExitCondition, Filter, PositionSizing } from '../claude/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ClaudeStrategyOutput {
  strategy_name: string;
  summary: string;
  parsed_rules: ParsedRules;
  instrument: string;
}

export type NormalizationResult = {
  success: true;
  canonical: CanonicalParsedRules;
} | {
  success: false;
  errors: string[];
  partial?: Partial<CanonicalParsedRules>;
};

export type DetectedPattern = 'opening_range_breakout' | 'ema_pullback' | 'breakout' | 'unknown';

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect pattern type from Claude's entry conditions
 * Uses keyword matching on indicators and descriptions
 */
export function detectPattern(entryConditions: EntryCondition[]): DetectedPattern {
  const indicators = entryConditions.map(e => e.indicator.toLowerCase());
  const descriptions = entryConditions
    .map(e => (e.description || '').toLowerCase())
    .join(' ');
  
  // Check for Opening Range Breakout
  const orbKeywords = ['opening range', 'orb', 'range breakout', 'morning range'];
  if (
    indicators.some(i => orbKeywords.some(k => i.includes(k))) ||
    orbKeywords.some(k => descriptions.includes(k))
  ) {
    return 'opening_range_breakout';
  }
  
  // Check for EMA Pullback
  const emaKeywords = ['ema', 'moving average', 'ma pullback', 'bounce off'];
  const pullbackKeywords = ['pullback', 'retracement', 'bounce', 'touch'];
  if (
    indicators.some(i => emaKeywords.some(k => i.includes(k))) &&
    (indicators.some(i => pullbackKeywords.some(k => i.includes(k))) ||
     pullbackKeywords.some(k => descriptions.includes(k)))
  ) {
    return 'ema_pullback';
  }
  
  // Check for generic Breakout
  const breakoutKeywords = ['breakout', 'break above', 'break below', 'resistance', 'support', 'level'];
  if (
    indicators.some(i => breakoutKeywords.some(k => i.includes(k))) ||
    breakoutKeywords.some(k => descriptions.includes(k))
  ) {
    return 'breakout';
  }
  
  return 'unknown';
}

/**
 * Detect trading direction from entry conditions
 */
export function detectDirection(entryConditions: EntryCondition[]): 'long' | 'short' | 'both' {
  const allText = entryConditions
    .map(e => `${e.indicator} ${e.relation} ${e.description || ''}`.toLowerCase())
    .join(' ');
  
  const hasLong = /\b(above|break.*up|long|buy|bullish)\b/.test(allText);
  const hasShort = /\b(below|break.*down|short|sell|bearish)\b/.test(allText);
  
  if (hasLong && hasShort) return 'both';
  if (hasLong) return 'long';
  if (hasShort) return 'short';
  return 'both'; // Default to both if unclear
}

// ============================================================================
// INSTRUMENT NORMALIZATION
// ============================================================================

/**
 * Normalize instrument symbol and get specs
 */
export function normalizeInstrument(symbol: string): InstrumentSpec | null {
  const normalized = symbol.toUpperCase().trim();
  
  // Direct match
  if (normalized in INSTRUMENT_DEFAULTS) {
    return INSTRUMENT_DEFAULTS[normalized as keyof typeof INSTRUMENT_DEFAULTS];
  }
  
  // Common aliases
  const aliases: Record<string, keyof typeof INSTRUMENT_DEFAULTS> = {
    'E-MINI': 'ES',
    'E-MINI S&P': 'ES',
    'S&P 500': 'ES',
    'SP500': 'ES',
    'NASDAQ': 'NQ',
    'NASDAQ 100': 'NQ',
    'DOW': 'YM',
    'DOW JONES': 'YM',
    'RUSSELL': 'RTY',
    'RUSSELL 2000': 'RTY',
    'CRUDE': 'CL',
    'CRUDE OIL': 'CL',
    'OIL': 'CL',
    'GOLD': 'GC',
    'SILVER': 'SI',
  };
  
  if (normalized in aliases) {
    return INSTRUMENT_DEFAULTS[aliases[normalized]];
  }
  
  return null;
}

// ============================================================================
// EXIT CONDITION NORMALIZATION
// ============================================================================

/**
 * Parse stop loss from Claude's exit conditions
 */
export function parseStopLoss(exits: ExitCondition[]): ExitConfig['stopLoss'] {
  const stopLoss = exits.find(e => e.type === 'stop_loss');
  
  if (!stopLoss) {
    // Default: opposite range for ORB, structure for others
    return { type: 'fixed_ticks', value: 20 };
  }
  
  const desc = (stopLoss.description || '').toLowerCase();
  const value = stopLoss.value;
  const unit = stopLoss.unit;
  
  // Check for structure-based stops
  if (desc.includes('swing') || desc.includes('structure') || desc.includes('pullback low')) {
    return { type: 'structure', value: 2 }; // Buffer ticks
  }
  
  // Check for ATR-based stops
  if (desc.includes('atr')) {
    const atrMultiple = value || 1.5;
    return { type: 'atr_multiple', value: atrMultiple };
  }
  
  // Check for opposite range
  if (desc.includes('opposite') || desc.includes('other side') || desc.includes('range')) {
    return { type: 'opposite_range', value: 1 }; // Buffer ticks
  }
  
  // Check for percentage of range
  if (desc.includes('%') || desc.includes('percent') || desc.includes('midpoint')) {
    // For ORB: percentage of range becomes opposite_range with buffer
    return { type: 'opposite_range', value: 1 };
  }
  
  // Default to fixed ticks
  if (unit === 'ticks') {
    return { type: 'fixed_ticks', value };
  }
  
  // If unit is points/dollars, try to convert based on common standards
  // NOTE: This is best-effort without instrument context. Execution compiler
  // should validate stop makes sense for the instrument.
  if (unit === 'dollars' || unit === 'percent') {
    // For dollars, assume reasonable default (20 ticks ~= $250 for ES)
    // For percent, convert to ticks (1% ~= 40 ticks for ES)
    return { type: 'fixed_ticks', value: unit === 'percent' ? value * 40 : 20 };
  }
  
  // Fallback for unknown units
  return { type: 'fixed_ticks', value: 20 };
}

/**
 * Parse take profit from Claude's exit conditions
 */
export function parseTakeProfit(exits: ExitCondition[]): ExitConfig['takeProfit'] {
  const takeProfit = exits.find(e => e.type === 'take_profit');
  
  if (!takeProfit) {
    // Default: 2:1 R:R
    return { type: 'rr_ratio', value: 2 };
  }
  
  const desc = (takeProfit.description || '').toLowerCase();
  const value = takeProfit.value;
  const unit = takeProfit.unit;
  
  // Check for R:R ratio
  if (desc.includes('r:r') || desc.includes('risk:reward') || desc.includes('r ') || unit === 'percent') {
    return { type: 'rr_ratio', value };
  }
  
  // Check for range extension
  if (desc.includes('range') || desc.includes('extension')) {
    return { type: 'opposite_range', value }; // Range multiple
  }
  
  // Check for structure target
  if (desc.includes('resistance') || desc.includes('support') || desc.includes('level')) {
    return { type: 'structure', value: value || 0 };
  }
  
  // Default to fixed ticks
  if (unit === 'ticks') {
    return { type: 'fixed_ticks', value };
  }
  
  return { type: 'rr_ratio', value: value || 2 };
}

// ============================================================================
// RISK NORMALIZATION
// ============================================================================

/**
 * Normalize position sizing configuration
 */
export function normalizeRisk(sizing: PositionSizing): RiskConfig {
  const method = sizing.method;
  const value = sizing.value;
  const maxContracts = sizing.max_contracts || 10;
  
  if (method === 'fixed') {
    return {
      positionSizing: 'fixed_contracts',
      maxContracts: value, // For fixed contracts, this is the fixed count
    } satisfies RiskConfig;
  }
  
  // risk_percent or kelly
  return {
    positionSizing: 'risk_percent',
    riskPercent: value, // Already in 1 = 1% format from Claude
    maxContracts,
  } satisfies RiskConfig;
}

// ============================================================================
// TIME NORMALIZATION
// ============================================================================

/**
 * Normalize time filters to session config
 */
export function normalizeTime(filters: Filter[]): TimeConfig {
  const timeFilter = filters.find(f => f.type === 'time_window');
  const timezone = 'America/New_York'; // Default timezone for all sessions
  
  if (!timeFilter) {
    return { session: 'ny', timezone }; // Default to NY session
  }
  
  const start = timeFilter.start;
  const end = timeFilter.end;
  
  if (!start && !end) {
    return { session: 'ny', timezone };
  }
  
  // Check for known sessions
  const startTime = start || '09:30';
  const endTime = end || '16:00';
  
  // NY session: 9:30 - 16:00
  if (startTime === '09:30' && endTime === '16:00') {
    return { session: 'ny', timezone };
  }
  
  // London session: 03:00 - 11:30 ET
  if (startTime === '03:00' && endTime === '11:30') {
    return { session: 'london', timezone };
  }
  
  // Asia session: 20:00 - 04:00 ET
  if (startTime === '20:00' && endTime === '04:00') {
    return { session: 'asia', timezone };
  }
  
  // Custom session
  return {
    session: 'custom',
    customStart: startTime,
    customEnd: endTime,
    timezone,
  };
}

// ============================================================================
// PATTERN-SPECIFIC EXTRACTION
// ============================================================================

/**
 * Extract ORB-specific parameters
 */
export function extractORBParams(entryConditions: EntryCondition[]): {
  periodMinutes: number;
  entryOn: 'break_high' | 'break_low' | 'both';
} {
  // Look for period in entry conditions
  let periodMinutes = 15; // Default
  let entryOn: 'break_high' | 'break_low' | 'both' = 'both';
  
  for (const entry of entryConditions) {
    const desc = (entry.description || entry.indicator || '').toLowerCase();
    
    // Extract period
    const periodMatch = desc.match(/(\d+)\s*(?:min|minute)/);
    if (periodMatch) {
      periodMinutes = parseInt(periodMatch[1], 10);
    }
    
    // Extract direction
    if (desc.includes('above') || desc.includes('high') || desc.includes('long only')) {
      entryOn = 'break_high';
    } else if (desc.includes('below') || desc.includes('low') || desc.includes('short only')) {
      entryOn = 'break_low';
    }
  }
  
  // Clamp to valid range
  periodMinutes = Math.max(5, Math.min(120, periodMinutes));
  
  return { periodMinutes, entryOn };
}

/**
 * Extract EMA Pullback-specific parameters
 */
export function extractEMAPullbackParams(entryConditions: EntryCondition[], filters: Filter[]): {
  emaPeriod: number;
  pullbackConfirmation: 'touch' | 'close_above' | 'bounce';
  rsiFilter?: { period: number; threshold: number; direction: 'below' | 'above' };
} {
  let emaPeriod = 20; // Default
  let pullbackConfirmation: 'touch' | 'close_above' | 'bounce' = 'touch';
  let rsiFilter: { period: number; threshold: number; direction: 'below' | 'above' } | undefined;
  
  for (const entry of entryConditions) {
    const desc = (entry.description || entry.indicator || '').toLowerCase();
    
    // Extract EMA period
    const periodMatch = desc.match(/(\d+)\s*(?:ema|ma|period)/);
    if (periodMatch) {
      emaPeriod = parseInt(periodMatch[1], 10);
    } else if (entry.period) {
      emaPeriod = entry.period;
    }
    
    // Extract pullback confirmation
    if (desc.includes('close above') || desc.includes('closes above')) {
      pullbackConfirmation = 'close_above';
    } else if (desc.includes('bounce') || desc.includes('rejection')) {
      pullbackConfirmation = 'bounce';
    }
  }
  
  // Check for RSI filter
  const rsiIndicator = filters.find(f => 
    f.indicator?.toLowerCase().includes('rsi') || 
    f.type.toLowerCase().includes('rsi')
  );
  
  if (rsiIndicator) {
    const threshold = rsiIndicator.value || 30;
    const direction: 'above' | 'below' = (rsiIndicator.condition || 'below').includes('above') ? 'above' : 'below';
    const period = rsiIndicator.period || 14; // Default RSI period
    rsiFilter = { period, threshold, direction };
  }
  
  return { emaPeriod, pullbackConfirmation, rsiFilter };
}

/**
 * Extract Breakout-specific parameters
 */
export function extractBreakoutParams(entryConditions: EntryCondition[]): {
  lookbackPeriod: number;
  levelType: 'resistance' | 'support' | 'both';
  confirmation: 'close' | 'volume' | 'none';
} {
  let lookbackPeriod = 20; // Default (was hardcoded in old compiler!)
  let levelType: 'resistance' | 'support' | 'both' = 'both';
  let confirmation: 'close' | 'volume' | 'none' = 'close';
  
  for (const entry of entryConditions) {
    const desc = (entry.description || entry.indicator || '').toLowerCase();
    
    // Extract lookback period
    const periodMatch = desc.match(/(\d+)\s*(?:period|bar|candle|day)/);
    if (periodMatch) {
      lookbackPeriod = parseInt(periodMatch[1], 10);
    } else if (entry.period) {
      lookbackPeriod = entry.period;
    }
    
    // Extract level type
    if (desc.includes('resistance') && !desc.includes('support')) {
      levelType = 'resistance';
    } else if (desc.includes('support') && !desc.includes('resistance')) {
      levelType = 'support';
    }
    
    // Extract confirmation type
    if (desc.includes('volume')) {
      confirmation = 'volume';
    } else if (desc.includes('close')) {
      confirmation = 'close';
    }
  }
  
  return { lookbackPeriod, levelType, confirmation };
}

// ============================================================================
// MAIN NORMALIZER
// ============================================================================

/**
 * Main normalization function
 * Converts Claude's ParsedRules to CanonicalParsedRules
 */
export function claudeToCanonical(input: ClaudeStrategyOutput): NormalizationResult {
  const { parsed_rules, instrument } = input;
  const { entry_conditions, exit_conditions, filters, position_sizing } = parsed_rules;
  
  const errors: string[] = [];
  
  // 1. Normalize instrument
  const instrumentSpec = normalizeInstrument(instrument);
  if (!instrumentSpec) {
    errors.push(`Unknown instrument: ${instrument}. Supported: ES, NQ, YM, RTY, CL, GC, SI`);
  }
  
  // 2. Detect pattern
  const pattern = detectPattern(entry_conditions);
  if (pattern === 'unknown') {
    errors.push('Could not detect strategy pattern. Supported: ORB, EMA Pullback, Breakout');
  }
  
  // 3. Detect direction
  const direction = detectDirection(entry_conditions);
  
  // 4. Normalize exits
  const stopLoss = parseStopLoss(exit_conditions);
  const takeProfit = parseTakeProfit(exit_conditions);
  const exit: ExitConfig = { stopLoss, takeProfit };
  
  // 5. Normalize risk
  const risk = normalizeRisk(position_sizing);
  
  // 6. Normalize time
  const time = normalizeTime(filters);
  
  // If we have errors, return them
  if (errors.length > 0 || !instrumentSpec || pattern === 'unknown') {
    return { success: false, errors };
  }
  
  // 7. Build pattern-specific canonical rules
  let canonical: CanonicalParsedRules;
  
  switch (pattern) {
    case 'opening_range_breakout': {
      const orbParams = extractORBParams(entry_conditions);
      canonical = {
        pattern: 'opening_range_breakout',
        direction,
        instrument: instrumentSpec,
        entry: {
          openingRange: {
            periodMinutes: orbParams.periodMinutes,
            entryOn: orbParams.entryOn,
          },
        },
        exit,
        risk,
        time,
      } satisfies OpeningRangeBreakoutRules;
      break;
    }
    
    case 'ema_pullback': {
      const emaParams = extractEMAPullbackParams(entry_conditions, filters);
      canonical = {
        pattern: 'ema_pullback',
        direction,
        instrument: instrumentSpec,
        entry: {
          emaPullback: {
            emaPeriod: emaParams.emaPeriod,
            pullbackConfirmation: emaParams.pullbackConfirmation,
          },
          ...(emaParams.rsiFilter && {
            indicators: {
              rsi: emaParams.rsiFilter,
            },
          }),
        },
        exit,
        risk,
        time,
      } satisfies EMAPullbackRules;
      break;
    }
    
    case 'breakout': {
      const breakoutParams = extractBreakoutParams(entry_conditions);
      canonical = {
        pattern: 'breakout',
        direction,
        instrument: instrumentSpec,
        entry: {
          breakout: {
            lookbackPeriod: breakoutParams.lookbackPeriod,
            levelType: breakoutParams.levelType,
            confirmation: breakoutParams.confirmation,
          },
        },
        exit,
        risk,
        time,
      } satisfies BreakoutRules;
      break;
    }
    
    default:
      return { success: false, errors: ['Unknown pattern type'] };
  }
  
  // 8. Validate the canonical output
  const validation = validateCanonical(canonical);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
      partial: canonical as Partial<CanonicalParsedRules>,
    };
  }
  
  return { success: true, canonical: validation.data };
}
