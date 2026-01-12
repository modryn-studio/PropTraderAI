/**
 * Unit tests for Intelligent Parameter Extractor
 * 
 * Tests the core extraction logic that powers the Parameter-Based Animation System.
 * Run with: npm test -- intelligentParameterExtractor
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

import { describe, it, expect } from 'vitest';
import { 
  extractStrategyParameters,
  calculateVisualCoordinates,
  type StrategyParameters 
} from './intelligentParameterExtractor';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

describe('extractStrategyParameters', () => {
  
  describe('Stop Loss Extraction', () => {
    
    it('extracts "50% of range" as percentage placement with value 0.5', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Break above range', category: 'entry' },
        { label: 'Stop Loss', value: '50% of range', category: 'risk' },
        { label: 'Target', value: '1:2 R:R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params).not.toBeNull();
      expect(params?.stopLoss.placement).toBe('percentage');
      expect(params?.stopLoss.value).toBe(0.5);
      expect(params?.stopLoss.relativeTo).toBe('range_low');
    });
    
    it('extracts "middle of range" as percentage 0.5', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Middle of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('percentage');
      expect(params?.stopLoss.value).toBe(0.5);
    });
    
    it('extracts "bottom of range" as opposite_side with value 0', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Break above', category: 'entry' },
        { label: 'Stop', value: 'Bottom of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('opposite_side');
      expect(params?.stopLoss.value).toBe(0);
      expect(params?.stopLoss.relativeTo).toBe('range_low');
    });
    
    it('extracts "25% of range" as percentage 0.25', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: '25% of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('percentage');
      expect(params?.stopLoss.value).toBe(0.25);
    });
    
    it('extracts "75% of range" as percentage 0.75', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: '75% of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('percentage');
      expect(params?.stopLoss.value).toBe(0.75);
    });
    
    it('extracts "2x ATR" as atr_multiple with value 2', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'EMA pullback', category: 'entry' },
        { label: 'Stop', value: '2x ATR below entry', category: 'risk' },
        { label: 'Target', value: '3R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('atr_multiple');
      expect(params?.stopLoss.value).toBe(2);
      expect(params?.stopLoss.unit).toBe('atr');
    });
    
    it('extracts "1.5 ATR" as atr_multiple with value 1.5', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: '1.5 ATR stop', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('atr_multiple');
      expect(params?.stopLoss.value).toBe(1.5);
    });
    
    it('extracts "10 ticks below" as fixed_distance with value 10', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: '10 ticks below entry', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('fixed_distance');
      expect(params?.stopLoss.value).toBe(10);
      expect(params?.stopLoss.unit).toBe('ticks');
    });
    
    it('extracts "5 points below" as fixed_distance with value 5', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: '5 points below', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.stopLoss.placement).toBe('fixed_distance');
      expect(params?.stopLoss.value).toBe(5);
      expect(params?.stopLoss.unit).toBe('points');
    });
    
  });
  
  describe('Profit Target Extraction', () => {
    
    it('extracts "1:2 R:R" as r_multiple with value 2', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: '1:2 R:R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('r_multiple');
      expect(params?.profitTarget.value).toBe(2);
      expect(params?.profitTarget.unit).toBe('r');
    });
    
    it('extracts "2R" as r_multiple with value 2', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('r_multiple');
      expect(params?.profitTarget.value).toBe(2);
    });
    
    it('extracts "2.5R" as r_multiple with value 2.5', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: '2.5R target', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('r_multiple');
      expect(params?.profitTarget.value).toBe(2.5);
    });
    
    it('extracts "1:3" as r_multiple with value 3', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: '1:3 risk reward', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('r_multiple');
      expect(params?.profitTarget.value).toBe(3);
    });
    
    it('extracts "2x range" as extension with value 2', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: '2x range extension', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('extension');
      expect(params?.profitTarget.value).toBe(2);
    });
    
    it('extracts "twice the range" as extension with value 2', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: 'Twice the range', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('extension');
      expect(params?.profitTarget.value).toBe(2);
    });
    
    it('extracts "20 ticks" as fixed_distance with value 20', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range low', category: 'risk' },
        { label: 'Target', value: '20 ticks profit', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      
      expect(params?.profitTarget.method).toBe('fixed_distance');
      expect(params?.profitTarget.value).toBe(20);
      expect(params?.profitTarget.unit).toBe('ticks');
    });
    
  });
  
  describe('Strategy Type Detection', () => {
    
    it('detects "Opening Range Breakout" as orb', () => {
      const rules: StrategyRule[] = [
        { label: 'Pattern', value: 'Opening Range Breakout', category: 'setup' },
        { label: 'Entry', value: 'Break above', category: 'entry' },
        { label: 'Stop', value: '50% of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.strategyType).toBe('orb');
    });
    
    it('detects "ORB" as orb', () => {
      const rules: StrategyRule[] = [
        { label: 'Pattern', value: 'ORB long', category: 'setup' },
        { label: 'Entry', value: 'Break above', category: 'entry' },
        { label: 'Stop', value: '50% of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.strategyType).toBe('orb');
    });
    
    it('detects "pullback to EMA" as pullback', () => {
      const rules: StrategyRule[] = [
        { label: 'Pattern', value: 'EMA pullback entry', category: 'setup' },
        { label: 'Entry', value: 'Pullback to 20 EMA', category: 'entry' },
        { label: 'Stop', value: 'Below swing low', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.strategyType).toBe('pullback');
    });
    
    it('detects "VWAP bounce" as vwap_bounce', () => {
      const rules: StrategyRule[] = [
        { label: 'Pattern', value: 'VWAP bounce trade', category: 'setup' },
        { label: 'Entry', value: 'Bounce off VWAP', category: 'entry' },
        { label: 'Stop', value: 'Below VWAP', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.strategyType).toBe('vwap_bounce');
    });
    
  });
  
  describe('Direction Detection', () => {
    
    it('detects long direction from "break above"', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Break above range high', category: 'entry' },
        { label: 'Stop', value: '50% of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.direction).toBe('long');
    });
    
    it('detects short direction from "break below"', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Break below range low', category: 'entry' },
        { label: 'Stop', value: 'Top of range', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.direction).toBe('short');
    });
    
    it('detects short direction from "short" keyword', () => {
      const rules: StrategyRule[] = [
        { label: 'Pattern', value: 'ORB short', category: 'setup' },
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: 'Range high', category: 'risk' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params?.direction).toBe('short');
    });
    
  });
  
  describe('Edge Cases', () => {
    
    it('returns null for empty rules', () => {
      const params = extractStrategyParameters([]);
      expect(params).toBeNull();
    });
    
    it('returns null when stop is missing', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Target', value: '2R', category: 'exit' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params).toBeNull();
    });
    
    it('returns null when target is missing', () => {
      const rules: StrategyRule[] = [
        { label: 'Entry', value: 'Breakout', category: 'entry' },
        { label: 'Stop', value: '50% of range', category: 'risk' },
      ];
      
      const params = extractStrategyParameters(rules);
      expect(params).toBeNull();
    });
    
  });
  
});

describe('calculateVisualCoordinates', () => {
  
  it('calculates stop at 50% of range for percentage placement', () => {
    const params: StrategyParameters = {
      strategyType: 'orb',
      direction: 'long',
      entry: { trigger: 'breakout_above', level: 'range_high' },
      stopLoss: { placement: 'percentage', value: 0.5, relativeTo: 'range_low', unit: 'percentage' },
      profitTarget: { method: 'r_multiple', value: 2, relativeTo: 'stop_distance', unit: 'r' },
    };
    
    const coords = calculateVisualCoordinates(params);
    
    // Stop should be at 45 (rangeHigh=35, rangeLow=55, 50% = 35 + (20 * 0.5) = 45)
    expect(coords.stop).toBe(45);
  });
  
  it('calculates stop at range low for opposite_side placement', () => {
    const params: StrategyParameters = {
      strategyType: 'orb',
      direction: 'long',
      entry: { trigger: 'breakout_above', level: 'range_high' },
      stopLoss: { placement: 'opposite_side', value: 0, relativeTo: 'range_low' },
      profitTarget: { method: 'r_multiple', value: 2, relativeTo: 'stop_distance', unit: 'r' },
    };
    
    const coords = calculateVisualCoordinates(params);
    
    // Stop should be just below range low (55 + 2 = 57)
    expect(coords.stop).toBe(57);
  });
  
  it('calculates correct R:R ratio', () => {
    const params: StrategyParameters = {
      strategyType: 'orb',
      direction: 'long',
      entry: { trigger: 'breakout_above', level: 'range_high' },
      stopLoss: { placement: 'opposite_side', value: 0, relativeTo: 'range_low' },
      profitTarget: { method: 'r_multiple', value: 2, relativeTo: 'stop_distance', unit: 'r' },
    };
    
    const coords = calculateVisualCoordinates(params);
    
    expect(coords.riskRewardRatio).toBe('1:2.0');
  });
  
  it('positions target correctly for 2R', () => {
    const params: StrategyParameters = {
      strategyType: 'orb',
      direction: 'long',
      entry: { trigger: 'breakout_above', level: 'range_high' },
      stopLoss: { placement: 'opposite_side', value: 0, relativeTo: 'range_low' },
      profitTarget: { method: 'r_multiple', value: 2, relativeTo: 'stop_distance', unit: 'r' },
    };
    
    const coords = calculateVisualCoordinates(params);
    
    // Entry at 35, stop at 57, risk = 22
    // Target should be at entry - (risk * 2) = 35 - 44 = -9 (clamped to 2)
    expect(coords.target).toBeLessThan(coords.entry);
  });
  
});
