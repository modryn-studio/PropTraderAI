/**
 * Tests for Phase 1 Defaults Application
 * 
 * Tests the conservative defaults applied in the rapid flow.
 */

import { 
  applyPhase1Defaults, 
  detectPattern,
  previewPhase1Defaults,
  stripDefaults,
  replaceDefault
} from '../applyPhase1Defaults';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

describe('detectPattern', () => {
  it('detects opening range breakout', () => {
    expect(detectPattern('ES opening range breakout')).toBe('opening_range_breakout');
    expect(detectPattern('ORB strategy')).toBe('opening_range_breakout');
    expect(detectPattern('open range')).toBe('opening_range_breakout');
  });

  it('detects VWAP pattern', () => {
    expect(detectPattern('VWAP bounce')).toBe('vwap_trade');
    expect(detectPattern('Trade off VWAP')).toBe('vwap_trade');
  });

  it('detects EMA pullback', () => {
    expect(detectPattern('20 EMA pullback')).toBe('ema_pullback');
    expect(detectPattern('9 EMA pullback bounce')).toBe('ema_pullback');
  });

  it('detects generic pullback', () => {
    expect(detectPattern('pullback strategy')).toBe('pullback');
    expect(detectPattern('retrace to support')).toBe('pullback');
  });

  it('detects breakout pattern', () => {
    expect(detectPattern('breakout above resistance')).toBe('breakout');
    expect(detectPattern('break out strategy')).toBe('breakout');
  });

  it('detects momentum pattern', () => {
    expect(detectPattern('momentum play')).toBe('momentum');
    expect(detectPattern('momo trade')).toBe('momentum');
  });

  it('detects scalping pattern', () => {
    expect(detectPattern('scalp strategy')).toBe('scalp');
    expect(detectPattern('scalping ES')).toBe('scalp');
  });

  it('returns undefined for unknown patterns', () => {
    expect(detectPattern('I want to trade')).toBeUndefined();
    expect(detectPattern('random strategy')).toBeUndefined();
  });
});

describe('applyPhase1Defaults', () => {
  describe('Universal Defaults', () => {
    it('applies target default when missing', () => {
      const rules: StrategyRule[] = [
        { category: 'setup', label: 'Instrument', value: 'ES' }
      ];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      const targetRule = result.rules.find(r => r.label === 'Profit Target');
      expect(targetRule).toBeDefined();
      expect(targetRule?.value).toBe('2:1 R:R');
      expect(targetRule?.isDefaulted).toBe(true);
      expect(result.defaultsApplied).toContain('Profit Target');
    });

    it('applies sizing default when missing', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      const sizingRule = result.rules.find(r => r.label === 'Position Sizing');
      expect(sizingRule).toBeDefined();
      expect(sizingRule?.value).toBe('1% risk per trade');
      expect(sizingRule?.isDefaulted).toBe(true);
    });

    it('applies session default when missing', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      const sessionRule = result.rules.find(r => r.label === 'Trading Session');
      expect(sessionRule).toBeDefined();
      expect(sessionRule?.value).toContain('NY Session');
      expect(sessionRule?.isDefaulted).toBe(true);
    });

    it('does not apply target if already present', () => {
      const rules: StrategyRule[] = [
        { category: 'exit', label: 'Target', value: '3:1 R:R' }
      ];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      const targetRules = result.rules.filter(r => 
        r.label.toLowerCase().includes('target') || 
        r.label.toLowerCase().includes('profit')
      );
      expect(targetRules.length).toBe(1);
      expect(targetRules[0].value).toBe('3:1 R:R');
      expect(result.defaultsApplied).not.toContain('Profit Target');
    });

    it('does not apply sizing if already present', () => {
      const rules: StrategyRule[] = [
        { category: 'risk', label: 'Position Size', value: '2 contracts' }
      ];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      expect(result.defaultsApplied).not.toContain('Position Sizing');
    });
  });

  describe('Pattern-Specific Defaults', () => {
    it('applies range period for ORB pattern', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES opening range breakout');
      
      const rangeRule = result.rules.find(r => r.label === 'Range Period');
      expect(rangeRule).toBeDefined();
      expect(rangeRule?.value).toContain('15 minutes');
      expect(rangeRule?.isDefaulted).toBe(true);
      expect(result.pattern).toBe('opening_range_breakout');
    });

    it('applies morning session for VWAP pattern', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES VWAP bounce');
      
      const sessionRule = result.rules.find(r => r.label === 'Trading Session');
      expect(sessionRule).toBeDefined();
      expect(sessionRule?.value).toContain('Morning');
      expect(result.pattern).toBe('vwap_trade');
    });

    it('applies 1:1 R:R for scalp pattern', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES scalping');
      
      const targetRule = result.rules.find(r => r.label === 'Profit Target');
      expect(targetRule).toBeDefined();
      expect(targetRule?.value).toBe('1:1 R:R');
      expect(result.pattern).toBe('scalp');
    });
  });

  describe('NEVER Defaults', () => {
    it('never defaults stop loss', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      const stopRule = result.rules.find(r => 
        r.label.toLowerCase().includes('stop') ||
        r.label.toLowerCase().includes('loss')
      );
      expect(stopRule).toBeUndefined();
      expect(result.defaultsApplied).not.toContain('Stop Loss');
    });
  });

  describe('Result Structure', () => {
    it('preserves original rules', () => {
      const originalRules: StrategyRule[] = [
        { category: 'setup', label: 'Instrument', value: 'ES' },
        { category: 'entry', label: 'Pattern', value: 'ORB' },
      ];
      const result = applyPhase1Defaults(originalRules, 'ES ORB');
      
      expect(result.rules).toContainEqual(
        expect.objectContaining({ label: 'Instrument', value: 'ES' })
      );
      expect(result.rules).toContainEqual(
        expect.objectContaining({ label: 'Pattern', value: 'ORB' })
      );
    });

    it('returns correct defaults applied list', () => {
      const rules: StrategyRule[] = [];
      const result = applyPhase1Defaults(rules, 'ES breakout');
      
      expect(result.defaultsApplied).toContain('Profit Target');
      expect(result.defaultsApplied).toContain('Position Sizing');
      expect(result.defaultsApplied).toContain('Trading Session');
    });

    it('includes pattern in result', () => {
      const result = applyPhase1Defaults([], 'ES opening range breakout');
      expect(result.pattern).toBe('opening_range_breakout');
    });
  });
});

describe('previewPhase1Defaults', () => {
  it('returns defaults that would be applied', () => {
    const rules: StrategyRule[] = [
      { category: 'exit', label: 'Profit Target', value: '2:1' }
    ];
    const preview = previewPhase1Defaults(rules, 'ES breakout');
    
    // Should not include target (already present)
    expect(preview.find(d => d.label === 'Profit Target')).toBeUndefined();
    
    // Should include sizing and session (missing)
    expect(preview.find(d => d.label === 'Position Sizing')).toBeDefined();
    expect(preview.find(d => d.label === 'Trading Session')).toBeDefined();
  });
});

describe('stripDefaults', () => {
  it('removes all defaulted rules', () => {
    const rules: StrategyRule[] = [
      { category: 'setup', label: 'Instrument', value: 'ES', isDefaulted: false },
      { category: 'exit', label: 'Target', value: '2:1', isDefaulted: true },
      { category: 'risk', label: 'Sizing', value: '1%', isDefaulted: true },
    ];
    const stripped = stripDefaults(rules);
    
    expect(stripped.length).toBe(1);
    expect(stripped[0].label).toBe('Instrument');
  });
});

describe('replaceDefault', () => {
  it('replaces default with user value', () => {
    const rules: StrategyRule[] = [
      { category: 'exit', label: 'Profit Target', value: '2:1 R:R', isDefaulted: true, source: 'default' },
    ];
    const updated = replaceDefault(rules, 'Profit Target', '3:1 R:R');
    
    expect(updated[0].value).toBe('3:1 R:R');
    expect(updated[0].isDefaulted).toBe(false);
    expect(updated[0].source).toBe('user');
  });

  it('handles case-insensitive label matching', () => {
    const rules: StrategyRule[] = [
      { category: 'exit', label: 'Profit Target', value: '2:1 R:R', isDefaulted: true },
    ];
    const updated = replaceDefault(rules, 'profit target', '4:1 R:R');
    
    expect(updated[0].value).toBe('4:1 R:R');
  });
});
