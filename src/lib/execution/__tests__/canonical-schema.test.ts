/**
 * Canonical Schema Tests
 * 
 * Tests for:
 * 1. Schema validation (Zod)
 * 2. Compiler integration with canonical format
 * 3. Type safety verification
 * 
 * @module lib/execution/__tests__/canonical-schema.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateCanonical,
  parseCanonical,
  isSupportedPattern,
  isORBRules,
  isEMAPullbackRules,
  isBreakoutRules,
  getSessionTimes,
  isSupportedPattern,
  type CanonicalParsedRules,
} from '../canonical-schema';

import {
  compileCanonicalStrategy,
  compileFromUnknown,
  type CompiledStrategy,
  type EvaluationContext,
} from '../canonical-compilers';

// Import test strategies
import orbStrategy from './canonical-strategies/orb-es-15min.json';
import emaPullbackStrategy from './canonical-strategies/ema-pullback-nq-20.json';
import breakoutStrategy from './canonical-strategies/breakout-es-50period.json';

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('Canonical Schema Validation', () => {
  describe('validateCanonical', () => {
    it('should validate ORB strategy', () => {
      const result = validateCanonical(orbStrategy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pattern).toBe('opening_range_breakout');
      }
    });

    it('should validate EMA Pullback strategy', () => {
      const result = validateCanonical(emaPullbackStrategy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pattern).toBe('ema_pullback');
      }
    });

    it('should validate Breakout strategy', () => {
      const result = validateCanonical(breakoutStrategy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pattern).toBe('breakout');
      }
    });

    it('should reject invalid pattern', () => {
      const invalid = { ...orbStrategy, pattern: 'invalid_pattern' };
      const result = validateCanonical(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.includes('pattern'))).toBe(true);
      }
    });

    it('should reject missing required fields', () => {
      const invalid = { pattern: 'opening_range_breakout' };
      const result = validateCanonical(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid instrument symbol', () => {
      const invalid = {
        ...orbStrategy,
        instrument: { ...orbStrategy.instrument, symbol: 'INVALID' }
      };
      const result = validateCanonical(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid risk percent (too high)', () => {
      const invalid = {
        ...orbStrategy,
        risk: { ...orbStrategy.risk, riskPercent: 10 } // Max is 5%
      };
      const result = validateCanonical(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid period minutes (too low)', () => {
      const invalid = {
        ...orbStrategy,
        entry: {
          openingRange: {
            periodMinutes: 1, // Min is 5
            entryOn: 'both'
          }
        }
      };
      const result = validateCanonical(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('parseCanonical', () => {
    it('should parse valid strategy', () => {
      const parsed = parseCanonical(orbStrategy);
      expect(parsed.pattern).toBe('opening_range_breakout');
    });

    it('should throw on invalid strategy', () => {
      expect(() => parseCanonical({ pattern: 'invalid' })).toThrow();
    });
  });
});

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

describe('Type Guards', () => {
  let orb: CanonicalParsedRules;
  let ema: CanonicalParsedRules;
  let breakout: CanonicalParsedRules;

  beforeEach(() => {
    orb = parseCanonical(orbStrategy);
    ema = parseCanonical(emaPullbackStrategy);
    breakout = parseCanonical(breakoutStrategy);
  });

  it('isORBRules correctly identifies ORB', () => {
    expect(isORBRules(orb)).toBe(true);
    expect(isORBRules(ema)).toBe(false);
    expect(isORBRules(breakout)).toBe(false);
  });

  it('isEMAPullbackRules correctly identifies EMA Pullback', () => {
    expect(isEMAPullbackRules(orb)).toBe(false);
    expect(isEMAPullbackRules(ema)).toBe(true);
    expect(isEMAPullbackRules(breakout)).toBe(false);
  });

  it('isBreakoutRules correctly identifies Breakout', () => {
    expect(isBreakoutRules(orb)).toBe(false);
    expect(isBreakoutRules(ema)).toBe(false);
    expect(isBreakoutRules(breakout)).toBe(true);
  });

  it('isSupportedPattern validates pattern strings', () => {
    expect(isSupportedPattern('opening_range_breakout')).toBe(true);
    expect(isSupportedPattern('ema_pullback')).toBe(true);
    expect(isSupportedPattern('breakout')).toBe(true);
    expect(isSupportedPattern('invalid')).toBe(false);
  });
});

// ============================================================================
// SESSION TIMES TESTS
// ============================================================================

describe('Session Times', () => {
  it('returns correct NY session times', () => {
    const times = getSessionTimes({ session: 'ny', timezone: 'America/New_York' });
    expect(times.start).toBe(9 * 60 + 30); // 9:30 AM = 570 min
    expect(times.end).toBe(16 * 60); // 4:00 PM = 960 min
  });

  it('returns correct custom session times', () => {
    const times = getSessionTimes({
      session: 'custom',
      customStart: '10:00',
      customEnd: '14:00',
      timezone: 'America/New_York'
    });
    expect(times.start).toBe(10 * 60); // 600 min
    expect(times.end).toBe(14 * 60); // 840 min
  });

  it('returns all-day for "all" session', () => {
    const times = getSessionTimes({ session: 'all', timezone: 'America/New_York' });
    expect(times.start).toBe(0);
    expect(times.end).toBe(24 * 60);
  });
});

// ============================================================================
// COMPILER TESTS
// ============================================================================

describe('Canonical Compilers', () => {
  describe('compileCanonicalStrategy', () => {
    it('compiles ORB strategy successfully', () => {
      const canonical = parseCanonical(orbStrategy);
      const compiled = compileCanonicalStrategy(canonical);
      
      expect(compiled.pattern).toBe('opening_range_breakout');
      expect(compiled.instrument).toBe('ES');
      expect(compiled.direction).toBe('both');
      expect(typeof compiled.shouldEnter).toBe('function');
      expect(typeof compiled.getEntryPrice).toBe('function');
      expect(typeof compiled.getStopPrice).toBe('function');
      expect(typeof compiled.getTargetPrice).toBe('function');
      expect(typeof compiled.getContractQuantity).toBe('function');
      expect(typeof compiled.isTimeValid).toBe('function');
    });

    it('compiles EMA Pullback strategy successfully', () => {
      const canonical = parseCanonical(emaPullbackStrategy);
      const compiled = compileCanonicalStrategy(canonical);
      
      expect(compiled.pattern).toBe('ema_pullback');
      expect(compiled.instrument).toBe('NQ');
      expect(compiled.direction).toBe('long');
    });

    it('compiles Breakout strategy successfully', () => {
      const canonical = parseCanonical(breakoutStrategy);
      const compiled = compileCanonicalStrategy(canonical);
      
      expect(compiled.pattern).toBe('breakout');
      expect(compiled.instrument).toBe('ES');
      expect(compiled.direction).toBe('both');
    });
  });

  describe('compileFromUnknown', () => {
    it('validates and compiles valid JSON', () => {
      const compiled = compileFromUnknown(orbStrategy);
      expect(compiled.pattern).toBe('opening_range_breakout');
    });

    it('throws on invalid JSON', () => {
      expect(() => compileFromUnknown({ invalid: true })).toThrow();
    });
  });
});

// ============================================================================
// COMPILED STRATEGY FUNCTION TESTS
// ============================================================================

describe('Compiled Strategy Functions', () => {
  let orbCompiled: CompiledStrategy;
  let mockContext: EvaluationContext;

  beforeEach(() => {
    const canonical = parseCanonical(orbStrategy);
    orbCompiled = compileCanonicalStrategy(canonical);

    // Create mock context for testing
    mockContext = {
      candles: [
        { timestamp: new Date(), open: 5000, high: 5010, low: 4990, close: 5005, volume: 1000 },
        { timestamp: new Date(), open: 5005, high: 5015, low: 5000, close: 5010, volume: 1100 },
      ],
      quote: { symbol: 'ES', bid: 5009, ask: 5010, last: 5010, volume: 100, timestamp: new Date() },
      indicators: { ema20: 5000, rsi14: 55, atr14: 10 },
      openingRange: { high: 5015, low: 4990, startTime: new Date(), endTime: new Date(), isComplete: true },
      currentTime: new Date(2026, 0, 19, 10, 30), // 10:30 AM
    };
  });

  describe('isTimeValid', () => {
    it('returns true during NY session', () => {
      const noonET = new Date(2026, 0, 19, 12, 0); // 12:00 PM ET
      expect(orbCompiled.isTimeValid(noonET)).toBe(true);
    });

    it('returns false outside NY session', () => {
      const earlyMorning = new Date(2026, 0, 19, 6, 0); // 6:00 AM ET
      expect(orbCompiled.isTimeValid(earlyMorning)).toBe(false);
    });
  });

  describe('getContractQuantity', () => {
    it('calculates correct position size', () => {
      const accountBalance = 50000;
      const entryPrice = 5010;
      const stopPrice = 4990; // 20 points = 80 ticks = $1000 risk per contract
      
      // With 1% risk on $50k = $500 risk
      // $500 / $1000 per contract = 0.5 contracts → rounds to 1
      const contracts = orbCompiled.getContractQuantity(accountBalance, entryPrice, stopPrice);
      expect(contracts).toBeGreaterThanOrEqual(1);
      expect(contracts).toBeLessThanOrEqual(5); // Max from strategy
    });

    it('respects max contracts limit', () => {
      const accountBalance = 500000; // Large account
      const entryPrice = 5010;
      const stopPrice = 5008; // Tiny stop = many contracts theoretically
      
      const contracts = orbCompiled.getContractQuantity(accountBalance, entryPrice, stopPrice);
      expect(contracts).toBeLessThanOrEqual(5); // Max from strategy config
    });
  });

  describe('getTargetPrice', () => {
    it('calculates 2R target correctly for long', () => {
      const entryPrice = 5015;
      const stopPrice = 4990; // 25 points stop
      
      // 2R target = 25 * 2 = 50 points above entry
      const target = orbCompiled.getTargetPrice(entryPrice, stopPrice, mockContext);
      expect(target).toBe(5015 + (25 * 2)); // 5065
    });
  });

  describe('getStopPrice', () => {
    it('uses opposite range for ORB stop', () => {
      const entryPrice = 5016; // Above OR high (5015)
      
      // Update context to reflect long position (quote.last above OR high)
      const longContext: EvaluationContext = {
        ...mockContext,
        quote: { ...mockContext.quote, last: 5016 }, // Above OR high = long
      };
      
      // ORB stop should be at opposite side = OR low - 1 tick
      const stop = orbCompiled.getStopPrice(entryPrice, longContext);
      expect(stop).toBe(4990 - 0.25); // OR low minus 1 tick
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('handles missing optional RSI filter in EMA strategy', () => {
    const strategyWithoutRSI = {
      ...emaPullbackStrategy,
      entry: {
        emaPullback: {
          emaPeriod: 20,
          pullbackConfirmation: 'bounce'
        }
        // No indicators.rsi
      }
    };
    
    const result = validateCanonical(strategyWithoutRSI);
    expect(result.success).toBe(true);
  });

  it('handles default lookback period for breakout', () => {
    const strategyWithDefault = {
      ...breakoutStrategy,
      entry: {
        breakout: {
          levelType: 'both',
          confirmation: 'none'
          // No lookbackPeriod - should default to 20
        }
      }
    };
    
    const result = validateCanonical(strategyWithDefault);
    expect(result.success).toBe(true);
    if (result.success && result.data.pattern === 'breakout') {
      expect(result.data.entry.breakout.lookbackPeriod).toBe(20);
    }
  });
});
