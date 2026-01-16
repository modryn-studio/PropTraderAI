/**
 * Tests for Critical Gaps Detection
 * 
 * Tests the Phase 1 rapid flow detection of missing critical parameters.
 */

import { 
  detectCriticalGaps, 
  getMostCriticalGap, 
  isReadyForGeneration,
  type CriticalGapsResult 
} from '../criticalGapsDetection';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

describe('detectCriticalGaps', () => {
  describe('Stop Loss Detection', () => {
    it('detects missing stop loss in simple strategy', () => {
      const result = detectCriticalGaps('ES opening range breakout');
      expect(result.gaps.stopLoss).toBe(false);
      expect(result.missing).toContain('stopLoss');
    });

    it('detects stop loss with tick notation', () => {
      const result = detectCriticalGaps('ES ORB with 10 tick stop');
      expect(result.gaps.stopLoss).toBe(true);
      expect(result.missing).not.toContain('stopLoss');
    });

    it('detects stop loss with point notation', () => {
      const result = detectCriticalGaps('NQ breakout with 15 point stop loss');
      expect(result.gaps.stopLoss).toBe(true);
    });

    it('detects structure-based stop loss', () => {
      const result = detectCriticalGaps('ES pullback, stop below swing low');
      expect(result.gaps.stopLoss).toBe(true);
    });

    it('detects range-based stop loss', () => {
      const result = detectCriticalGaps('ORB strategy, exit below the low of the range');
      expect(result.gaps.stopLoss).toBe(true);
    });

    it('detects ATR-based stop loss', () => {
      const result = detectCriticalGaps('ES breakout with 1.5 ATR stop');
      expect(result.gaps.stopLoss).toBe(true);
    });

    it('detects mental stop mentions', () => {
      const result = detectCriticalGaps('ES ORB with mental stop at support');
      expect(result.gaps.stopLoss).toBe(true);
    });

    it('detects stop in parsed rules', () => {
      const rules: StrategyRule[] = [
        { category: 'exit', label: 'Stop Loss', value: '10 ticks' }
      ];
      const result = detectCriticalGaps('ES opening range breakout', rules);
      expect(result.gaps.stopLoss).toBe(true);
    });
  });

  describe('Instrument Detection', () => {
    it('detects ES instrument', () => {
      const result = detectCriticalGaps('ES opening range breakout');
      expect(result.gaps.instrument).toBe(true);
    });

    it('detects NQ instrument', () => {
      const result = detectCriticalGaps('NQ pullback to 20 EMA');
      expect(result.gaps.instrument).toBe(true);
    });

    it('detects MES micro contract', () => {
      const result = detectCriticalGaps('MES scalping strategy');
      expect(result.gaps.instrument).toBe(true);
    });

    it('detects MNQ micro contract', () => {
      const result = detectCriticalGaps('MNQ breakout');
      expect(result.gaps.instrument).toBe(true);
    });

    it('detects missing instrument in generic strategy', () => {
      const result = detectCriticalGaps('opening range breakout');
      expect(result.gaps.instrument).toBe(false);
      expect(result.missing).toContain('instrument');
    });

    it('detects e-mini notation', () => {
      const result = detectCriticalGaps('e-mini S&P breakout');
      expect(result.gaps.instrument).toBe(true);
    });
  });

  describe('Entry Trigger Detection', () => {
    it('detects ORB pattern as entry trigger', () => {
      const result = detectCriticalGaps('ES opening range breakout');
      expect(result.gaps.entryTrigger).toBe(true);
    });

    it('detects pullback as entry trigger', () => {
      const result = detectCriticalGaps('NQ pullback to 20 EMA');
      expect(result.gaps.entryTrigger).toBe(true);
    });

    it('detects VWAP as entry trigger', () => {
      const result = detectCriticalGaps('ES VWAP bounce');
      expect(result.gaps.entryTrigger).toBe(true);
    });

    it('detects missing entry in vague description', () => {
      const result = detectCriticalGaps('I want to trade ES');
      expect(result.gaps.entryTrigger).toBe(false);
    });
  });

  describe('Direction Detection', () => {
    it('detects long direction', () => {
      const result = detectCriticalGaps('ES long breakout above high');
      expect(result.gaps.direction).toBe(true);
    });

    it('detects short direction', () => {
      const result = detectCriticalGaps('NQ short below support');
      expect(result.gaps.direction).toBe(true);
    });

    it('detects bullish bias', () => {
      const result = detectCriticalGaps('ES bullish breakout');
      expect(result.gaps.direction).toBe(true);
    });

    it('detects both directions', () => {
      const result = detectCriticalGaps('ES ORB long and short');
      expect(result.gaps.direction).toBe(true);
    });

    it('detects buy signal', () => {
      const result = detectCriticalGaps('Buy when price breaks above range');
      expect(result.gaps.direction).toBe(true);
    });
  });

  describe('Pattern Detection', () => {
    it('detects ORB pattern', () => {
      const result = detectCriticalGaps('ES opening range breakout');
      expect(result.detectedPattern).toBe('orb');
    });

    it('detects pullback pattern', () => {
      const result = detectCriticalGaps('NQ pullback to 20 EMA');
      expect(result.detectedPattern).toBe('pullback');
    });

    it('detects breakout pattern', () => {
      const result = detectCriticalGaps('ES breakout above resistance');
      expect(result.detectedPattern).toBe('breakout');
    });

    it('detects VWAP pattern', () => {
      const result = detectCriticalGaps('ES VWAP mean reversion');
      expect(result.detectedPattern).toBe('vwap');
    });

    it('returns undefined for unknown pattern', () => {
      const result = detectCriticalGaps('I want to trade ES');
      expect(result.detectedPattern).toBeUndefined();
    });
  });
});

describe('getMostCriticalGap', () => {
  it('returns stopLoss as highest priority', () => {
    const result: CriticalGapsResult = {
      gaps: { stopLoss: false, instrument: false, entryTrigger: true, direction: true },
      missing: ['stopLoss', 'instrument'],
      missingCount: 2,
    };
    expect(getMostCriticalGap(result)).toBe('stopLoss');
  });

  it('returns instrument if stopLoss is present', () => {
    const result: CriticalGapsResult = {
      gaps: { stopLoss: true, instrument: false, entryTrigger: true, direction: true },
      missing: ['instrument'],
      missingCount: 1,
    };
    expect(getMostCriticalGap(result)).toBe('instrument');
  });

  it('returns null if all present', () => {
    const result: CriticalGapsResult = {
      gaps: { stopLoss: true, instrument: true, entryTrigger: true, direction: true },
      missing: [],
      missingCount: 0,
    };
    expect(getMostCriticalGap(result)).toBeNull();
  });
});

describe('isReadyForGeneration', () => {
  it('returns true when stop loss is present', () => {
    const result: CriticalGapsResult = {
      gaps: { stopLoss: true, instrument: false, entryTrigger: false, direction: false },
      missing: ['instrument', 'entryTrigger', 'direction'],
      missingCount: 3,
    };
    expect(isReadyForGeneration(result)).toBe(true);
  });

  it('returns false when stop loss is missing', () => {
    const result: CriticalGapsResult = {
      gaps: { stopLoss: false, instrument: true, entryTrigger: true, direction: true },
      missing: ['stopLoss'],
      missingCount: 1,
    };
    expect(isReadyForGeneration(result)).toBe(false);
  });
});
