/**
 * Event Store Tests
 * 
 * Tests for the event-sourcing system for strategy state management.
 * 
 * @module lib/strategy/__tests__/eventStore.test
 * @see Issue #50 - Strategy Editing System Architecture
 */

import { describe, it, expect } from 'vitest';
import {
  // Event creators
  createStrategyCreatedEvent,
  createParamUpdatedEvent,
  createPatternChangedEvent,
  createDefaultsAppliedEvent,
  // Replay
  replayEvents,
  // Utilities
  getPatternDefaults,
  getCurrentPattern,
  getCurrentInstrument,
  isValidEventStream,
  generateEventsFromCanonical,
  // Types
  type StrategyEvent,
} from '../eventStore';

// ============================================================================
// EVENT CREATOR TESTS
// ============================================================================

describe('Event Creators', () => {
  describe('createStrategyCreatedEvent', () => {
    it('creates a valid STRATEGY_CREATED event', () => {
      const event = createStrategyCreatedEvent(
        'opening_range_breakout',
        'ES',
        'both',
        'I trade 15 min ORB on ES'
      );
      
      expect(event.type).toBe('STRATEGY_CREATED');
      expect(event.pattern).toBe('opening_range_breakout');
      expect(event.instrument).toBe('ES');
      expect(event.direction).toBe('both');
      expect(event.initialMessage).toBe('I trade 15 min ORB on ES');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('createParamUpdatedEvent', () => {
    it('creates a valid PARAM_UPDATED event', () => {
      const event = createParamUpdatedEvent(
        'entry.openingRange.periodMinutes',
        30,
        15,
        true
      );
      
      expect(event.type).toBe('PARAM_UPDATED');
      expect(event.path).toBe('entry.openingRange.periodMinutes');
      expect(event.value).toBe(30);
      expect(event.previousValue).toBe(15);
      expect(event.wasDefaulted).toBe(true);
    });
  });

  describe('createPatternChangedEvent', () => {
    it('creates a valid PATTERN_CHANGED event', () => {
      const event = createPatternChangedEvent(
        'opening_range_breakout',
        'ema_pullback'
      );
      
      expect(event.type).toBe('PATTERN_CHANGED');
      expect(event.fromPattern).toBe('opening_range_breakout');
      expect(event.toPattern).toBe('ema_pullback');
    });
  });

  describe('createDefaultsAppliedEvent', () => {
    it('creates a valid DEFAULTS_APPLIED event', () => {
      const event = createDefaultsAppliedEvent([
        { path: 'exit.stopLoss.value', value: 20, explanation: '20 tick stop' },
        { path: 'exit.takeProfit.value', value: 2, explanation: '2R target' },
      ]);
      
      expect(event.type).toBe('DEFAULTS_APPLIED');
      expect(event.defaults).toHaveLength(2);
      expect(event.defaults[0].path).toBe('exit.stopLoss.value');
    });
  });
});

// ============================================================================
// PATTERN DEFAULTS TESTS
// ============================================================================

describe('getPatternDefaults', () => {
  it('returns ORB defaults', () => {
    const defaults = getPatternDefaults('opening_range_breakout', 'ES');
    
    expect(defaults.pattern).toBe('opening_range_breakout');
    expect(defaults.instrument.symbol).toBe('ES');
    expect(defaults.direction).toBe('both');
    // Type assertion for discriminated union - pattern determines entry structure
    const entry = defaults.entry as { openingRange: { periodMinutes: number; entryOn: string } };
    expect(entry.openingRange).toBeDefined();
    expect(entry.openingRange.periodMinutes).toBe(15);
    expect(entry.openingRange.entryOn).toBe('both');
  });

  it('returns EMA Pullback defaults', () => {
    const defaults = getPatternDefaults('ema_pullback', 'NQ');
    
    expect(defaults.pattern).toBe('ema_pullback');
    expect(defaults.instrument.symbol).toBe('NQ');
    // Type assertion for discriminated union
    const entry = defaults.entry as { emaPullback: { emaPeriod: number; pullbackConfirmation: string } };
    expect(entry.emaPullback).toBeDefined();
    expect(entry.emaPullback.emaPeriod).toBe(20);
    expect(entry.emaPullback.pullbackConfirmation).toBe('touch');
  });

  it('returns Breakout defaults', () => {
    const defaults = getPatternDefaults('breakout', 'YM');
    
    expect(defaults.pattern).toBe('breakout');
    expect(defaults.instrument.symbol).toBe('YM');
    // Type assertion for discriminated union
    const entry = defaults.entry as { breakout: { lookbackPeriod: number; levelType: string; confirmation: string } };
    expect(entry.breakout).toBeDefined();
    expect(entry.breakout.lookbackPeriod).toBe(20);
    expect(entry.breakout.levelType).toBe('both');
    expect(entry.breakout.confirmation).toBe('close');
  });

  it('uses ES as fallback for unknown instruments', () => {
    const defaults = getPatternDefaults('opening_range_breakout', 'UNKNOWN');
    expect(defaults.instrument.symbol).toBe('ES');
  });

  it('respects direction parameter', () => {
    const longDefaults = getPatternDefaults('ema_pullback', 'ES', 'long');
    expect(longDefaults.direction).toBe('long');

    const shortDefaults = getPatternDefaults('ema_pullback', 'ES', 'short');
    expect(shortDefaults.direction).toBe('short');
  });
});

// ============================================================================
// EVENT REPLAY TESTS
// ============================================================================

describe('replayEvents', () => {
  it('returns error for empty events array', () => {
    const result = replayEvents([]);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('No events to replay');
      expect(result.eventCount).toBe(0);
    }
  });

  it('returns error when first event is not STRATEGY_CREATED', () => {
    const events: StrategyEvent[] = [
      createParamUpdatedEvent('entry.openingRange.periodMinutes', 30),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('First event must be STRATEGY_CREATED');
    }
  });

  it('replays single STRATEGY_CREATED event to canonical format', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'ES', 'both', 'Test'),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.pattern).toBe('opening_range_breakout');
      expect(result.canonical.instrument.symbol).toBe('ES');
      expect(result.canonical.direction).toBe('both');
      expect(result.eventCount).toBe(1);
    }
  });

  it('applies PARAM_UPDATED events', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'ES', 'both', 'Test'),
      createParamUpdatedEvent('entry.openingRange.periodMinutes', 30),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const entry = result.canonical.entry as { openingRange: { periodMinutes: number } };
      expect(entry.openingRange.periodMinutes).toBe(30);
      expect(result.eventCount).toBe(2);
    }
  });

  it('handles PATTERN_CHANGED event by resetting to new pattern defaults', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'ES', 'long', 'Test'),
      createPatternChangedEvent('opening_range_breakout', 'ema_pullback'),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.pattern).toBe('ema_pullback');
      // Direction should be preserved
      expect(result.canonical.direction).toBe('long');
      // Instrument should be preserved
      expect(result.canonical.instrument.symbol).toBe('ES');
      // Pattern-specific fields should be reset
      const entry = result.canonical.entry as { emaPullback?: unknown; openingRange?: unknown };
      expect(entry.emaPullback).toBeDefined();
      expect((result.canonical.entry as { openingRange?: unknown }).openingRange).toBeUndefined();
    }
  });

  it('applies DEFAULTS_APPLIED events', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'ES', 'both', 'Test'),
      createDefaultsAppliedEvent([
        { path: 'exit.stopLoss.value', value: 25, explanation: '25 tick stop' },
        { path: 'exit.takeProfit.value', value: 3, explanation: '3R target' },
      ]),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.exit.stopLoss.value).toBe(25);
      expect(result.canonical.exit.takeProfit.value).toBe(3);
    }
  });

  it('applies multiple events in sequence', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'NQ', 'both', 'ORB on NQ'),
      createParamUpdatedEvent('entry.openingRange.periodMinutes', 30),
      createParamUpdatedEvent('exit.stopLoss.value', 15),
      createParamUpdatedEvent('exit.takeProfit.value', 3),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.canonical.pattern).toBe('opening_range_breakout');
      expect(result.canonical.instrument.symbol).toBe('NQ');
      const entry = result.canonical.entry as { openingRange: { periodMinutes: number } };
      expect(entry.openingRange.periodMinutes).toBe(30);
      expect(result.canonical.exit.stopLoss.value).toBe(15);
      expect(result.canonical.exit.takeProfit.value).toBe(3);
      expect(result.eventCount).toBe(4);
    }
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('getCurrentPattern', () => {
  it('returns pattern from STRATEGY_CREATED event', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('ema_pullback', 'ES', 'both', 'Test'),
    ];
    
    expect(getCurrentPattern(events)).toBe('ema_pullback');
  });

  it('returns latest pattern after PATTERN_CHANGED', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'ES', 'both', 'Test'),
      createPatternChangedEvent('opening_range_breakout', 'breakout'),
    ];
    
    expect(getCurrentPattern(events)).toBe('breakout');
  });

  it('returns null for empty events', () => {
    expect(getCurrentPattern([])).toBeNull();
  });
});

describe('getCurrentInstrument', () => {
  it('returns instrument from STRATEGY_CREATED event', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('ema_pullback', 'NQ', 'both', 'Test'),
    ];
    
    expect(getCurrentInstrument(events)).toBe('NQ');
  });

  it('returns null for empty events', () => {
    expect(getCurrentInstrument([])).toBeNull();
  });
});

describe('isValidEventStream', () => {
  it('accepts empty array', () => {
    expect(isValidEventStream([])).toBe(true);
  });

  it('accepts valid event stream', () => {
    const events = [
      createStrategyCreatedEvent('opening_range_breakout', 'ES', 'both', 'Test'),
    ];
    
    expect(isValidEventStream(events)).toBe(true);
  });

  it('rejects non-array', () => {
    expect(isValidEventStream('not an array')).toBe(false);
    expect(isValidEventStream(null)).toBe(false);
    expect(isValidEventStream({})).toBe(false);
  });

  it('rejects stream not starting with STRATEGY_CREATED', () => {
    const events = [
      createParamUpdatedEvent('path', 'value'),
    ];
    
    expect(isValidEventStream(events)).toBe(false);
  });
});

describe('generateEventsFromCanonical', () => {
  it('generates events from canonical ORB rules', () => {
    const canonical = getPatternDefaults('opening_range_breakout', 'ES');
    const events = generateEventsFromCanonical(
      canonical,
      '2026-01-21T10:00:00Z',
      'ES opening range breakout'
    );
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('STRATEGY_CREATED');
    if (events[0].type === 'STRATEGY_CREATED') {
      expect(events[0].pattern).toBe('opening_range_breakout');
      expect(events[0].instrument).toBe('ES');
      expect(events[0].timestamp).toBe('2026-01-21T10:00:00Z');
      expect(events[0].initialMessage).toBe('ES opening range breakout');
    }
  });

  it('generates events from canonical EMA Pullback rules', () => {
    const canonical = getPatternDefaults('ema_pullback', 'NQ', 'long');
    const events = generateEventsFromCanonical(canonical);
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('STRATEGY_CREATED');
    if (events[0].type === 'STRATEGY_CREATED') {
      expect(events[0].pattern).toBe('ema_pullback');
      expect(events[0].instrument).toBe('NQ');
      expect(events[0].direction).toBe('long');
    }
  });
});

// ============================================================================
// INTEGRATION TESTS: Events → Replay → Canonical
// ============================================================================

describe('Integration: Event Round-Trip', () => {
  it('generates events from canonical and replays back to same canonical', () => {
    // Get defaults for a pattern
    const originalCanonical = getPatternDefaults('opening_range_breakout', 'ES');
    
    // Generate events
    const events = generateEventsFromCanonical(originalCanonical);
    
    // Replay events
    const replayResult = replayEvents(events);
    
    expect(replayResult.success).toBe(true);
    if (replayResult.success) {
      // Should match original canonical
      expect(replayResult.canonical.pattern).toBe(originalCanonical.pattern);
      expect(replayResult.canonical.instrument.symbol).toBe(originalCanonical.instrument.symbol);
      expect(replayResult.canonical.direction).toBe(originalCanonical.direction);
      const replayedEntry = replayResult.canonical.entry as { openingRange: { periodMinutes: number } };
      const originalEntry = originalCanonical.entry as { openingRange: { periodMinutes: number } };
      expect(replayedEntry.openingRange.periodMinutes)
        .toBe(originalEntry.openingRange.periodMinutes);
    }
  });

  it('pattern change preserves instrument and direction', () => {
    const events: StrategyEvent[] = [
      createStrategyCreatedEvent('opening_range_breakout', 'NQ', 'long', 'NQ ORB'),
      // Change pattern
      createPatternChangedEvent('opening_range_breakout', 'ema_pullback'),
    ];
    
    const result = replayEvents(events);
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Pattern changed
      expect(result.canonical.pattern).toBe('ema_pullback');
      // But instrument and direction preserved
      expect(result.canonical.instrument.symbol).toBe('NQ');
      expect(result.canonical.direction).toBe('long');
    }
  });
});
