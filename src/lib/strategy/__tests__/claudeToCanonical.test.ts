/**
 * Claude to Canonical Normalizer Tests
 * 
 * Tests the transformation from Claude's ParsedRules to CanonicalParsedRules
 * 
 * @module lib/strategy/__tests__/claudeToCanonical.test
 */

import { describe, it, expect } from 'vitest';
import {
  claudeToCanonical,
  detectPattern,
  detectDirection,
  normalizeInstrument,
  parseStopLoss,
  parseTakeProfit,
  normalizeRisk,
  normalizeTime,
  extractORBParams,
  extractEMAPullbackParams,
  extractBreakoutParams,
  type ClaudeStrategyOutput,
} from '../claudeToCanonical';

import type { EntryCondition, ExitCondition, Filter, PositionSizing } from '../../claude/client';

// ============================================================================
// PATTERN DETECTION TESTS
// ============================================================================

describe('detectPattern', () => {
  it('detects Opening Range Breakout', () => {
    const entries: EntryCondition[] = [
      { indicator: 'opening range breakout', relation: 'breaks' }
    ];
    expect(detectPattern(entries)).toBe('opening_range_breakout');
  });

  it('detects ORB from description', () => {
    const entries: EntryCondition[] = [
      { indicator: 'price', relation: 'above', description: 'Break above the opening range high' }
    ];
    expect(detectPattern(entries)).toBe('opening_range_breakout');
  });

  it('detects EMA Pullback', () => {
    const entries: EntryCondition[] = [
      { indicator: '20 EMA pullback', relation: 'touches' }
    ];
    expect(detectPattern(entries)).toBe('ema_pullback');
  });

  it('detects EMA Pullback from separate indicators', () => {
    const entries: EntryCondition[] = [
      { indicator: 'EMA', period: 20, relation: 'above' },
      { indicator: 'pullback', relation: 'confirmed', description: 'Pullback to EMA' }
    ];
    expect(detectPattern(entries)).toBe('ema_pullback');
  });

  it('detects Breakout pattern', () => {
    const entries: EntryCondition[] = [
      { indicator: 'breakout', relation: 'above', description: 'Break above resistance level' }
    ];
    expect(detectPattern(entries)).toBe('breakout');
  });

  it('returns unknown for unrecognized patterns', () => {
    const entries: EntryCondition[] = [
      { indicator: 'mystery indicator', relation: 'crosses' }
    ];
    expect(detectPattern(entries)).toBe('unknown');
  });
});

// ============================================================================
// DIRECTION DETECTION TESTS
// ============================================================================

describe('detectDirection', () => {
  it('detects long direction', () => {
    const entries: EntryCondition[] = [
      { indicator: 'price', relation: 'above', description: 'Break above the high' }
    ];
    expect(detectDirection(entries)).toBe('long');
  });

  it('detects short direction', () => {
    const entries: EntryCondition[] = [
      { indicator: 'price', relation: 'below', description: 'Break below the low' }
    ];
    expect(detectDirection(entries)).toBe('short');
  });

  it('detects both directions', () => {
    const entries: EntryCondition[] = [
      { indicator: 'price', relation: 'breaks', description: 'Break above or below range' }
    ];
    expect(detectDirection(entries)).toBe('both');
  });

  it('defaults to both when unclear', () => {
    const entries: EntryCondition[] = [
      { indicator: 'price', relation: 'crosses' }
    ];
    expect(detectDirection(entries)).toBe('both');
  });
});

// ============================================================================
// INSTRUMENT NORMALIZATION TESTS
// ============================================================================

describe('normalizeInstrument', () => {
  it('normalizes ES', () => {
    const spec = normalizeInstrument('ES');
    expect(spec?.symbol).toBe('ES');
    expect(spec?.tickSize).toBe(0.25);
    expect(spec?.tickValue).toBe(12.50);
  });

  it('handles lowercase', () => {
    const spec = normalizeInstrument('es');
    expect(spec?.symbol).toBe('ES');
  });

  it('handles aliases', () => {
    expect(normalizeInstrument('E-MINI')?.symbol).toBe('ES');
    expect(normalizeInstrument('NASDAQ')?.symbol).toBe('NQ');
    expect(normalizeInstrument('GOLD')?.symbol).toBe('GC');
  });

  it('returns null for unknown symbols', () => {
    expect(normalizeInstrument('INVALID')).toBeNull();
  });
});

// ============================================================================
// STOP LOSS PARSING TESTS
// ============================================================================

describe('parseStopLoss', () => {
  it('parses fixed ticks stop', () => {
    const exits: ExitCondition[] = [
      { type: 'stop_loss', value: 20, unit: 'ticks' }
    ];
    const stop = parseStopLoss(exits, []);
    expect(stop.type).toBe('fixed_ticks');
    expect(stop.value).toBe(20);
  });

  it('parses structure-based stop', () => {
    const exits: ExitCondition[] = [
      { type: 'stop_loss', value: 2, unit: 'ticks', description: 'Below swing low' }
    ];
    const stop = parseStopLoss(exits, []);
    expect(stop.type).toBe('structure');
  });

  it('parses ATR stop', () => {
    const exits: ExitCondition[] = [
      { type: 'stop_loss', value: 1.5, unit: 'ticks', description: '1.5 ATR below entry' }
    ];
    const stop = parseStopLoss(exits, []);
    expect(stop.type).toBe('atr_multiple');
    expect(stop.value).toBe(1.5);
  });

  it('parses opposite range stop', () => {
    const exits: ExitCondition[] = [
      { type: 'stop_loss', value: 1, unit: 'ticks', description: 'Opposite side of range' }
    ];
    const stop = parseStopLoss(exits, []);
    expect(stop.type).toBe('opposite_range');
  });

  it('defaults to fixed ticks when no stop defined', () => {
    const stop = parseStopLoss([], []);
    expect(stop.type).toBe('fixed_ticks');
    expect(stop.value).toBe(20);
  });
});

// ============================================================================
// TAKE PROFIT PARSING TESTS
// ============================================================================

describe('parseTakeProfit', () => {
  it('parses R:R ratio target', () => {
    const exits: ExitCondition[] = [
      { type: 'take_profit', value: 2, unit: 'percent', description: '2:1 R:R' }
    ];
    const target = parseTakeProfit(exits);
    expect(target.type).toBe('rr_ratio');
    expect(target.value).toBe(2);
  });

  it('parses fixed ticks target', () => {
    const exits: ExitCondition[] = [
      { type: 'take_profit', value: 40, unit: 'ticks' }
    ];
    const target = parseTakeProfit(exits);
    expect(target.type).toBe('fixed_ticks');
    expect(target.value).toBe(40);
  });

  it('defaults to 2R when no target defined', () => {
    const target = parseTakeProfit([]);
    expect(target.type).toBe('rr_ratio');
    expect(target.value).toBe(2);
  });
});

// ============================================================================
// RISK NORMALIZATION TESTS
// ============================================================================

describe('normalizeRisk', () => {
  it('normalizes risk percent', () => {
    const sizing: PositionSizing = { method: 'risk_percent', value: 1, max_contracts: 5 };
    const risk = normalizeRisk(sizing);
    expect(risk.positionSizing).toBe('risk_percent');
    expect(risk.riskPercent).toBe(1);
    expect(risk.maxContracts).toBe(5);
  });

  it('normalizes fixed contracts', () => {
    const sizing: PositionSizing = { method: 'fixed', value: 2 };
    const risk = normalizeRisk(sizing);
    expect(risk.positionSizing).toBe('fixed_contracts');
    expect(risk.maxContracts).toBe(2); // Fixed contracts uses maxContracts as the fixed count
  });
});

// ============================================================================
// TIME NORMALIZATION TESTS
// ============================================================================

describe('normalizeTime', () => {
  it('defaults to NY session', () => {
    const time = normalizeTime([]);
    expect(time.session).toBe('ny');
  });

  it('parses custom time window', () => {
    const filters: Filter[] = [
      { type: 'time_window', start: '10:00', end: '14:00' }
    ];
    const time = normalizeTime(filters);
    expect(time.session).toBe('custom');
    expect(time.customStart).toBe('10:00');
    expect(time.customEnd).toBe('14:00');
  });

  it('detects NY session from times', () => {
    const filters: Filter[] = [
      { type: 'time_window', start: '09:30', end: '16:00' }
    ];
    const time = normalizeTime(filters);
    expect(time.session).toBe('ny');
  });
});

// ============================================================================
// PATTERN-SPECIFIC EXTRACTION TESTS
// ============================================================================

describe('extractORBParams', () => {
  it('extracts period from description', () => {
    const entries: EntryCondition[] = [
      { indicator: 'opening range', relation: 'breaks', description: '15 minute opening range' }
    ];
    const params = extractORBParams(entries);
    expect(params.periodMinutes).toBe(15);
  });

  it('extracts entry direction', () => {
    const entries: EntryCondition[] = [
      { indicator: 'orb', relation: 'above', description: 'Break above the high only' }
    ];
    const params = extractORBParams(entries);
    expect(params.entryOn).toBe('break_high');
  });

  it('defaults to 15 min and both', () => {
    const entries: EntryCondition[] = [
      { indicator: 'orb', relation: 'breaks' }
    ];
    const params = extractORBParams(entries);
    expect(params.periodMinutes).toBe(15);
    expect(params.entryOn).toBe('both');
  });
});

describe('extractEMAPullbackParams', () => {
  it('extracts EMA period', () => {
    const entries: EntryCondition[] = [
      { indicator: '20 EMA', period: 20, relation: 'pullback' }
    ];
    const params = extractEMAPullbackParams(entries, []);
    expect(params.emaPeriod).toBe(20);
  });

  it('extracts RSI filter', () => {
    const entries: EntryCondition[] = [
      { indicator: 'EMA', period: 20, relation: 'pullback' }
    ];
    const filters: Filter[] = [
      { type: 'indicator', indicator: 'RSI', value: 30, condition: 'below' }
    ];
    const params = extractEMAPullbackParams(entries, filters);
    expect(params.rsiFilter?.threshold).toBe(30);
    expect(params.rsiFilter?.direction).toBe('below');
    expect(params.rsiFilter?.period).toBe(14); // Default period
  });
});

describe('extractBreakoutParams', () => {
  it('extracts lookback period', () => {
    const entries: EntryCondition[] = [
      { indicator: 'breakout', period: 50, relation: 'above', description: '50 period high' }
    ];
    const params = extractBreakoutParams(entries);
    expect(params.lookbackPeriod).toBe(50);
  });

  it('extracts level type', () => {
    const entries: EntryCondition[] = [
      { indicator: 'breakout', relation: 'above', description: 'Break above resistance' }
    ];
    const params = extractBreakoutParams(entries);
    expect(params.levelType).toBe('resistance');
  });

  it('extracts confirmation type', () => {
    const entries: EntryCondition[] = [
      { indicator: 'breakout', relation: 'above', description: 'Close above with volume' }
    ];
    const params = extractBreakoutParams(entries);
    expect(params.confirmation).toBe('volume');
  });
});

// ============================================================================
// FULL NORMALIZATION TESTS
// ============================================================================

describe('claudeToCanonical', () => {
  it('normalizes ORB strategy', () => {
    const input: ClaudeStrategyOutput = {
      strategy_name: 'ES Opening Range Breakout',
      summary: '15 minute ORB on ES with 2R target',
      parsed_rules: {
        entry_conditions: [
          { indicator: 'opening range breakout', relation: 'breaks', description: '15 minute opening range' }
        ],
        exit_conditions: [
          { type: 'stop_loss', value: 1, unit: 'ticks', description: 'Opposite side of range' },
          { type: 'take_profit', value: 2, unit: 'percent', description: '2:1 R:R' }
        ],
        filters: [
          { type: 'time_window', start: '09:30', end: '11:30' }
        ],
        position_sizing: { method: 'risk_percent', value: 1, max_contracts: 5 }
      },
      instrument: 'ES'
    };

    const result = claudeToCanonical(input);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.pattern).toBe('opening_range_breakout');
      expect(result.canonical.instrument.symbol).toBe('ES');
      expect(result.canonical.direction).toBe('both');
      if (result.canonical.pattern === 'opening_range_breakout') {
        expect(result.canonical.entry.openingRange.periodMinutes).toBe(15);
      }
    }
  });

  it('normalizes EMA Pullback strategy', () => {
    const input: ClaudeStrategyOutput = {
      strategy_name: 'NQ 20 EMA Pullback',
      summary: 'Pullback to 20 EMA with RSI filter',
      parsed_rules: {
        entry_conditions: [
          { indicator: 'EMA pullback', period: 20, relation: 'touches', description: 'Pullback to 20 EMA' }
        ],
        exit_conditions: [
          { type: 'stop_loss', value: 2, unit: 'ticks', description: 'Below swing low' },
          { type: 'take_profit', value: 3, unit: 'percent', description: '3R target' }
        ],
        filters: [
          { type: 'indicator', indicator: 'RSI', value: 40, condition: 'below' }
        ],
        position_sizing: { method: 'risk_percent', value: 0.5, max_contracts: 3 }
      },
      instrument: 'NQ'
    };

    const result = claudeToCanonical(input);
    
    // Debug: log errors if not successful
    if (!result.success) {
      console.log('EMA Pullback normalization errors:', result.errors);
    }
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.pattern).toBe('ema_pullback');
      expect(result.canonical.instrument.symbol).toBe('NQ');
      if (result.canonical.pattern === 'ema_pullback') {
        expect(result.canonical.entry.emaPullback.emaPeriod).toBe(20);
        expect(result.canonical.entry.indicators?.rsi?.threshold).toBe(40);
        expect(result.canonical.entry.indicators?.rsi?.direction).toBe('below');
      }
    }
  });

  it('normalizes Breakout strategy', () => {
    const input: ClaudeStrategyOutput = {
      strategy_name: 'ES Breakout',
      summary: 'Break above resistance with volume confirmation',
      parsed_rules: {
        entry_conditions: [
          { indicator: 'breakout', period: 50, relation: 'above', description: 'Break above resistance with volume' }
        ],
        exit_conditions: [
          { type: 'stop_loss', value: 1.5, unit: 'ticks', description: '1.5 ATR stop' },
          { type: 'take_profit', value: 2, unit: 'percent', description: '2R' }
        ],
        filters: [],
        position_sizing: { method: 'risk_percent', value: 1, max_contracts: 10 }
      },
      instrument: 'ES'
    };

    const result = claudeToCanonical(input);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.pattern).toBe('breakout');
      if (result.canonical.pattern === 'breakout') {
        expect(result.canonical.entry.breakout.lookbackPeriod).toBe(50);
        expect(result.canonical.entry.breakout.confirmation).toBe('volume');
      }
    }
  });

  it('returns errors for unknown pattern', () => {
    const input: ClaudeStrategyOutput = {
      strategy_name: 'Mystery Strategy',
      summary: 'Some unknown approach',
      parsed_rules: {
        entry_conditions: [
          { indicator: 'mystery', relation: 'happens' }
        ],
        exit_conditions: [
          { type: 'stop_loss', value: 20, unit: 'ticks' }
        ],
        filters: [],
        position_sizing: { method: 'fixed', value: 1 }
      },
      instrument: 'ES'
    };

    const result = claudeToCanonical(input);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('pattern'))).toBe(true);
    }
  });

  it('returns errors for unknown instrument', () => {
    const input: ClaudeStrategyOutput = {
      strategy_name: 'ORB on Unknown',
      summary: 'ORB on unknown instrument',
      parsed_rules: {
        entry_conditions: [
          { indicator: 'opening range breakout', relation: 'breaks' }
        ],
        exit_conditions: [
          { type: 'stop_loss', value: 20, unit: 'ticks' }
        ],
        filters: [],
        position_sizing: { method: 'fixed', value: 1 }
      },
      instrument: 'UNKNOWN'
    };

    const result = claudeToCanonical(input);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('instrument'))).toBe(true);
    }
  });
});
