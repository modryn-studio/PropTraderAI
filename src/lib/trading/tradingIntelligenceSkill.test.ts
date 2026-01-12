/**
 * TRADING INTELLIGENCE SYSTEM - Unit Tests
 * 
 * Tests for the Professional Trading Intelligence System components.
 */

import { describe, expect, it } from 'vitest';
import {
  TradingIntelligenceSkill,
  detectCriticalErrors,
  detectConversationPhase,
  detectCurrentFocus,
  detectMistakes,
} from './tradingIntelligenceSkill';
import { detectEntryType } from './contextualIntelligence';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// PHASE DETECTION TESTS
// ============================================================================

describe('detectConversationPhase', () => {
  it('returns "initial" when no rules defined', () => {
    const phase = detectConversationPhase([]);
    expect(phase).toBe('initial');
  });

  it('returns "entry_definition" when entry is missing', () => {
    const rules: StrategyRule[] = [
      { label: 'Instrument', value: 'ES', category: 'setup' },
    ];
    const phase = detectConversationPhase(rules);
    expect(phase).toBe('entry_definition');
  });

  it('returns "stop_definition" when entry and instrument exist but stop is missing', () => {
    const rules: StrategyRule[] = [
      { label: 'Instrument', value: 'ES', category: 'setup' },
      { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
    ];
    const phase = detectConversationPhase(rules);
    expect(phase).toBe('stop_definition');
  });

  it('returns "target_definition" when entry and stop exist', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
      { label: 'Stop-Loss', value: '50% of range', category: 'exit' },
    ];
    const phase = detectConversationPhase(rules);
    expect(phase).toBe('target_definition');
  });

  it('returns "sizing_definition" when entry, stop, and target exist', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
      { label: 'Stop-Loss', value: '50% of range', category: 'exit' },
      { label: 'Profit Target', value: '2R', category: 'exit' },
    ];
    const phase = detectConversationPhase(rules);
    expect(phase).toBe('sizing_definition');
  });

  it('returns "complete" when all 4 components exist', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
      { label: 'Stop-Loss', value: '50% of range', category: 'exit' },
      { label: 'Profit Target', value: '2R', category: 'exit' },
      { label: 'Position Size', value: '1% risk per trade', category: 'risk' },
    ];
    const phase = detectConversationPhase(rules);
    expect(phase).toBe('complete');
  });
});

// ============================================================================
// FOCUS DETECTION TESTS
// ============================================================================

describe('detectCurrentFocus', () => {
  it('detects entry focus', () => {
    expect(detectCurrentFocus('I want to enter on a breakout')).toBe('entry');
    expect(detectCurrentFocus('What triggers your entry?')).toBe('entry');
  });

  it('detects stop focus', () => {
    expect(detectCurrentFocus('Where is your stop loss?')).toBe('stop');
    expect(detectCurrentFocus('My stop is 10 ticks')).toBe('stop');
  });

  it('detects target focus', () => {
    expect(detectCurrentFocus('What is your profit target?')).toBe('target');
    expect(detectCurrentFocus('I take profit at 2R')).toBe('target');
  });

  it('detects sizing focus', () => {
    expect(detectCurrentFocus('What is your position size?')).toBe('sizing');
    expect(detectCurrentFocus('I risk 1% per trade')).toBe('sizing');
  });

  it('returns general for non-specific messages', () => {
    expect(detectCurrentFocus('Hello')).toBe('general');
    expect(detectCurrentFocus('I trade ES')).toBe('general');
  });
});

// ============================================================================
// ENTRY TYPE DETECTION TESTS
// ============================================================================

describe('detectEntryType', () => {
  it('detects breakout entries', () => {
    expect(detectEntryType('I trade breakouts')).toBe('breakout');
    expect(detectEntryType('Break above the high')).toBe('breakout');
    expect(detectEntryType('Break below support')).toBe('breakout');
  });

  it('detects pullback entries', () => {
    expect(detectEntryType('I trade pullbacks')).toBe('pullback');
    expect(detectEntryType('Retest of support')).toBe('pullback');
    expect(detectEntryType('Fibonacci retracement')).toBe('pullback');
  });

  it('detects reversal entries', () => {
    expect(detectEntryType('Reversal at resistance')).toBe('reversal');
    expect(detectEntryType('Pivot point trading')).toBe('reversal');
  });

  it('detects time-based entries', () => {
    expect(detectEntryType('Opening range breakout')).toBe('timeBased');
    expect(detectEntryType('15-min high break')).toBe('timeBased');
  });

  it('returns null for undetected types', () => {
    expect(detectEntryType('I trade NQ')).toBeNull();
    expect(detectEntryType('Hello')).toBeNull();
  });
});

// ============================================================================
// MISTAKE DETECTION TESTS
// ============================================================================

describe('detectMistakes', () => {
  it('detects vague entry language', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'when it looks good', category: 'entry' },
    ];
    const mistakes = detectMistakes(rules);
    expect(mistakes.length).toBeGreaterThan(0);
    expect(mistakes[0]).toContain('Vague entry');
  });

  it('detects excessive risk percentage', () => {
    const rules: StrategyRule[] = [
      { label: 'Risk', value: '5% per trade', category: 'risk' },
    ];
    const mistakes = detectMistakes(rules);
    expect(mistakes.some(m => m.includes('Excessive risk'))).toBe(true);
  });

  it('detects poor risk:reward ratio', () => {
    const rules: StrategyRule[] = [
      { label: 'Profit Target', value: '1:1 risk reward', category: 'exit' },
    ];
    const mistakes = detectMistakes(rules);
    expect(mistakes.some(m => m.includes('1.5:1'))).toBe(true);
  });

  it('returns empty array for good rules', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
      { label: 'Risk', value: '1% per trade', category: 'risk' },
    ];
    const mistakes = detectMistakes(rules);
    expect(mistakes.length).toBe(0);
  });
});

// ============================================================================
// CRITICAL ERROR DETECTION TESTS
// ============================================================================

describe('detectCriticalErrors', () => {
  it('detects no stop-loss when entry is defined', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'Breakout', category: 'entry' },
      { label: 'Instrument', value: 'ES', category: 'setup' },
      { label: 'Target', value: '2R', category: 'exit' },
      { label: 'Size', value: '1 contract', category: 'risk' },
    ];
    const errors = detectCriticalErrors(rules);
    expect(errors.some(e => e.message.includes('No stop-loss'))).toBe(true);
  });

  it('detects excessive risk', () => {
    const rules: StrategyRule[] = [
      { label: 'Risk', value: '5% per trade', category: 'risk' },
    ];
    const errors = detectCriticalErrors(rules);
    expect(errors.some(e => e.severity === 'critical' && e.message.includes('5%'))).toBe(true);
  });

  it('detects vague entry criteria', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'when it looks good', category: 'entry' },
    ];
    const errors = detectCriticalErrors(rules);
    expect(errors.some(e => e.severity === 'critical' && e.message.includes('Vague entry'))).toBe(true);
  });

  it('warns about 1:1 risk:reward', () => {
    const rules: StrategyRule[] = [
      { label: 'Target', value: '1:1 ratio', category: 'exit' },
    ];
    const errors = detectCriticalErrors(rules);
    expect(errors.some(e => e.severity === 'warning' && e.message.includes('1:1'))).toBe(true);
  });

  it('detects mental stop', () => {
    const rules: StrategyRule[] = [
      { label: 'Stop-Loss', value: 'mental stop', category: 'exit' },
    ];
    const errors = detectCriticalErrors(rules);
    expect(errors.some(e => e.severity === 'critical' && e.message.includes('Mental stop'))).toBe(true);
  });
});

// ============================================================================
// RESPONSE VALIDATION TESTS
// ============================================================================

describe('TradingIntelligenceSkill.validateResponse', () => {
  it('flags too many questions', () => {
    const context = {
      phase: 'entry_definition' as const,
      rules: [],
      lastUserMessage: 'I trade breakouts',
      missingComponents: ['Entry'],
      detectedIssues: [],
    };
    
    const response = 'What timeframe? What confirmation? What volume requirement?';
    const validation = TradingIntelligenceSkill.validateResponse(response, context);
    
    expect(validation.valid).toBe(false);
    expect(validation.issues.some(i => i.includes('questions'))).toBe(true);
  });

  it('passes valid single-question response', () => {
    const context = {
      phase: 'entry_definition' as const,
      rules: [],
      lastUserMessage: 'I trade breakouts',
      missingComponents: ['Entry'],
      detectedIssues: [],
    };
    
    const response = 'Breakout of what specifically? The 15-minute high, a trend line, or a pattern?';
    const validation = TradingIntelligenceSkill.validateResponse(response, context);
    
    // This should pass because it's one focused question
    expect(validation.issues.filter(i => i.includes('multiple questions')).length).toBe(0);
  });
});

// ============================================================================
// PROMPT GENERATION TESTS
// ============================================================================

describe('TradingIntelligenceSkill.generateSystemPrompt', () => {
  it('includes phase information', () => {
    const rules: StrategyRule[] = [
      { label: 'Instrument', value: 'ES', category: 'setup' },
      { label: 'Entry', value: 'Break above high', category: 'entry' },
    ];
    
    const prompt = TradingIntelligenceSkill.generateSystemPrompt(
      rules,
      'Where should my stop be?',
      'You are a trading assistant'
    );
    
    expect(prompt).toContain('Phase:');
    expect(prompt).toContain('stop_definition');
  });

  it('includes detected issues', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'when it looks good', category: 'entry' },
    ];
    
    const prompt = TradingIntelligenceSkill.generateSystemPrompt(
      rules,
      'what next?',
      'You are a trading assistant'
    );
    
    expect(prompt).toContain('DETECTED ISSUES');
    expect(prompt).toContain('Vague');
  });

  it('includes professional standards', () => {
    const prompt = TradingIntelligenceSkill.generateSystemPrompt(
      [],
      'I want to trade ES',
      'You are a trading assistant'
    );
    
    expect(prompt).toContain('Max 2% risk');
    expect(prompt).toContain('1.5:1');
    expect(prompt).toContain('ONE question at a time');
  });
});

// ============================================================================
// INTELLIGENCE METADATA TESTS
// ============================================================================

describe('TradingIntelligenceSkill.getIntelligenceMetadata', () => {
  it('returns correct completion percentage', () => {
    const allFive: StrategyRule[] = [
      { label: 'Entry', value: 'Break above high', category: 'entry' },
      { label: 'Stop-Loss', value: '10 ticks', category: 'exit' },
      { label: 'Profit Target', value: '2R', category: 'exit' },
      { label: 'Position Size', value: '1% risk', category: 'risk' },
      { label: 'Instrument', value: 'ES', category: 'setup' },
    ];
    
    const metadata = TradingIntelligenceSkill.getIntelligenceMetadata(allFive, 'done');
    expect(metadata.completionPercentage).toBe(100);
    expect(metadata.missingComponents.length).toBe(0);
  });

  it('calculates missing components', () => {
    const twoComponents: StrategyRule[] = [
      { label: 'Entry', value: 'Breakout', category: 'entry' },
    ];
    
    const metadata = TradingIntelligenceSkill.getIntelligenceMetadata(twoComponents, 'next');
    expect(metadata.completionPercentage).toBe(20); // 1 of 5
    expect(metadata.missingComponents).toContain('Stop-Loss');
    expect(metadata.missingComponents).toContain('Profit Target');
    expect(metadata.missingComponents).toContain('Position Sizing');
  });
});

// ============================================================================
// NEXT ACTION TESTS
// ============================================================================

describe('TradingIntelligenceSkill.getNextAction', () => {
  it('suggests asking about instrument initially', () => {
    const action = TradingIntelligenceSkill.getNextAction([]);
    expect(action).toContain('instrument');
  });

  it('suggests entry conditions after initial', () => {
    const rules: StrategyRule[] = [
      { label: 'Instrument', value: 'ES', category: 'setup' },
    ];
    const action = TradingIntelligenceSkill.getNextAction(rules);
    expect(action).toContain('entry');
  });

  it('suggests validate and summarize when complete', () => {
    const rules: StrategyRule[] = [
      { label: 'Entry', value: 'Breakout', category: 'entry' },
      { label: 'Stop-Loss', value: '10 ticks', category: 'exit' },
      { label: 'Profit Target', value: '2R', category: 'exit' },
      { label: 'Position Size', value: '1%', category: 'risk' },
    ];
    const action = TradingIntelligenceSkill.getNextAction(rules);
    expect(action).toContain('Validate');
  });
});
