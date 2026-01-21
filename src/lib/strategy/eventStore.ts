/**
 * Event Store for Strategy State Management
 * 
 * Implements event-sourcing pattern for strategies. All state changes are
 * stored as immutable events, and the current state is derived by replaying
 * the event stream.
 * 
 * Key principles:
 * - Events are append-only (immutable)
 * - State is always derived from events (single source of truth)
 * - Replay produces canonical format (validated by Zod)
 * - Pattern changes automatically reset pattern-specific fields
 * 
 * @module lib/strategy/eventStore
 * @see Issue #50 - Strategy Editing System Architecture
 */

import { randomUUID } from 'crypto';
import {
  CanonicalParsedRules,
  validateCanonical,
  INSTRUMENT_DEFAULTS,
  type InstrumentSpec,
} from '../execution/canonical-schema';

// ============================================================================
// SUPPORTED PATTERNS
// ============================================================================

export type SupportedPattern = 'opening_range_breakout' | 'ema_pullback' | 'breakout';

export const SUPPORTED_PATTERNS: SupportedPattern[] = [
  'opening_range_breakout',
  'ema_pullback', 
  'breakout',
];

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Base event structure - all events have these fields
 */
interface StrategyEventBase {
  id: string;           // UUID for deduplication
  timestamp: string;    // ISO timestamp
}

/**
 * Strategy created event - root event for new strategies
 */
export interface StrategyCreatedEvent extends StrategyEventBase {
  type: 'STRATEGY_CREATED';
  pattern: SupportedPattern;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  initialMessage: string;
}

/**
 * Parameter updated event - generic param change
 */
export interface ParamUpdatedEvent extends StrategyEventBase {
  type: 'PARAM_UPDATED';
  path: string;           // e.g., "entry.openingRange.periodMinutes"
  value: unknown;         // New value
  previousValue?: unknown; // Old value (for undo)
  wasDefaulted: boolean;  // Was this overriding a default?
}

/**
 * Pattern changed event - resets pattern-specific fields
 */
export interface PatternChangedEvent extends StrategyEventBase {
  type: 'PATTERN_CHANGED';
  fromPattern: SupportedPattern;
  toPattern: SupportedPattern;
}

/**
 * Defaults applied event - batch apply smart defaults
 */
export interface DefaultsAppliedEvent extends StrategyEventBase {
  type: 'DEFAULTS_APPLIED';
  defaults: Array<{
    path: string;
    value: unknown;
    explanation: string;
  }>;
}

/**
 * All possible strategy events (discriminated union)
 */
export type StrategyEvent =
  | StrategyCreatedEvent
  | ParamUpdatedEvent
  | PatternChangedEvent
  | DefaultsAppliedEvent;

// ============================================================================
// EVENT CREATORS
// ============================================================================

/**
 * Create a STRATEGY_CREATED event
 */
export function createStrategyCreatedEvent(
  pattern: SupportedPattern,
  instrument: string,
  direction: 'long' | 'short' | 'both',
  initialMessage: string
): StrategyCreatedEvent {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'STRATEGY_CREATED',
    pattern,
    instrument,
    direction,
    initialMessage,
  };
}

/**
 * Create a PARAM_UPDATED event
 */
export function createParamUpdatedEvent(
  path: string,
  value: unknown,
  previousValue?: unknown,
  wasDefaulted: boolean = false
): ParamUpdatedEvent {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'PARAM_UPDATED',
    path,
    value,
    previousValue,
    wasDefaulted,
  };
}

/**
 * Create a PATTERN_CHANGED event
 */
export function createPatternChangedEvent(
  fromPattern: SupportedPattern,
  toPattern: SupportedPattern
): PatternChangedEvent {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'PATTERN_CHANGED',
    fromPattern,
    toPattern,
  };
}

/**
 * Create a DEFAULTS_APPLIED event
 */
export function createDefaultsAppliedEvent(
  defaults: Array<{ path: string; value: unknown; explanation: string }>
): DefaultsAppliedEvent {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'DEFAULTS_APPLIED',
    defaults,
  };
}

// ============================================================================
// PATTERN DEFAULTS
// ============================================================================

/**
 * Get default canonical rules for a pattern
 * These are the starting point when a pattern is selected
 */
export function getPatternDefaults(
  pattern: SupportedPattern,
  instrument: string,
  direction: 'long' | 'short' | 'both' = 'both'
): CanonicalParsedRules {
  const instrumentSpec = INSTRUMENT_DEFAULTS[instrument.toUpperCase()] || INSTRUMENT_DEFAULTS.ES;
  
  // Common defaults shared by all patterns
  const commonDefaults = {
    direction,
    instrument: instrumentSpec,
    exit: {
      stopLoss: { type: 'fixed_ticks' as const, value: 20 },
      takeProfit: { type: 'rr_ratio' as const, value: 2 },
    },
    risk: {
      positionSizing: 'risk_percent' as const,
      riskPercent: 1,
      maxContracts: 10,
    },
    time: {
      session: 'ny' as const,
      timezone: 'America/New_York',
    },
  };

  switch (pattern) {
    case 'opening_range_breakout':
      return {
        pattern: 'opening_range_breakout',
        ...commonDefaults,
        entry: {
          openingRange: {
            periodMinutes: 15,
            entryOn: 'both' as const,
          },
        },
      };

    case 'ema_pullback':
      return {
        pattern: 'ema_pullback',
        ...commonDefaults,
        entry: {
          emaPullback: {
            emaPeriod: 20,
            pullbackConfirmation: 'touch' as const,
          },
        },
      };

    case 'breakout':
      return {
        pattern: 'breakout',
        ...commonDefaults,
        entry: {
          breakout: {
            lookbackPeriod: 20,
            levelType: 'both' as const,
            confirmation: 'close' as const,
          },
        },
      };

    default:
      throw new Error(`Unknown pattern: ${pattern}`);
  }
}

// ============================================================================
// EVENT REPLAY
// ============================================================================

/**
 * Set a nested value in an object using dot-path notation
 * e.g., setNestedValue(obj, "entry.openingRange.periodMinutes", 30)
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Apply a single event to the current state
 * Returns a new state object (immutable)
 */
function applyEvent(
  state: Partial<CanonicalParsedRules>,
  event: StrategyEvent
): Partial<CanonicalParsedRules> {
  switch (event.type) {
    case 'STRATEGY_CREATED': {
      // Initialize with pattern defaults
      return getPatternDefaults(event.pattern, event.instrument, event.direction);
    }

    case 'PARAM_UPDATED': {
      // Clone state and update the specific path
      const newState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
      setNestedValue(newState, event.path, event.value);
      return newState as Partial<CanonicalParsedRules>;
    }

    case 'PATTERN_CHANGED': {
      // Get new pattern defaults but preserve instrument
      const currentInstrument = (state.instrument as InstrumentSpec)?.symbol || 'ES';
      return getPatternDefaults(event.toPattern, currentInstrument, state.direction || 'both');
    }

    case 'DEFAULTS_APPLIED': {
      // Clone state and apply all defaults
      const newState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
      for (const def of event.defaults) {
        setNestedValue(newState, def.path, def.value);
      }
      return newState as Partial<CanonicalParsedRules>;
    }

    default:
      // Unknown event type - return state unchanged
      return state;
  }
}

/**
 * Replay result with validation status
 */
export type ReplayResult = {
  success: true;
  canonical: CanonicalParsedRules;
  eventCount: number;
} | {
  success: false;
  errors: string[];
  partial?: Partial<CanonicalParsedRules>;
  eventCount: number;
};

/**
 * Replay events to derive canonical strategy
 * 
 * This is the core function of event-sourcing. It:
 * 1. Applies each event in order
 * 2. Validates the final result against canonical schema
 * 3. Returns validated canonical rules or errors
 * 
 * @param events - Array of strategy events to replay
 * @returns ReplayResult with canonical rules or errors
 */
export function replayEvents(events: StrategyEvent[]): ReplayResult {
  if (events.length === 0) {
    return {
      success: false,
      errors: ['No events to replay'],
      eventCount: 0,
    };
  }

  // Check first event is STRATEGY_CREATED
  if (events[0].type !== 'STRATEGY_CREATED') {
    return {
      success: false,
      errors: ['First event must be STRATEGY_CREATED'],
      eventCount: events.length,
    };
  }

  // Apply events in sequence
  let state: Partial<CanonicalParsedRules> = {};
  
  for (const event of events) {
    try {
      state = applyEvent(state, event);
    } catch (err) {
      return {
        success: false,
        errors: [`Error applying event ${event.type}: ${(err as Error).message}`],
        partial: state,
        eventCount: events.length,
      };
    }
  }

  // Validate final state against canonical schema
  const validation = validateCanonical(state);
  
  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
      partial: state,
      eventCount: events.length,
    };
  }

  return {
    success: true,
    canonical: validation.data,
    eventCount: events.length,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the current pattern from an event stream
 */
export function getCurrentPattern(events: StrategyEvent[]): SupportedPattern | null {
  // Find last PATTERN_CHANGED or STRATEGY_CREATED event
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === 'PATTERN_CHANGED') {
      return event.toPattern;
    }
    if (event.type === 'STRATEGY_CREATED') {
      return event.pattern;
    }
  }
  return null;
}

/**
 * Get the current instrument from an event stream
 */
export function getCurrentInstrument(events: StrategyEvent[]): string | null {
  // Find STRATEGY_CREATED event (instrument can't change after creation)
  const createdEvent = events.find(e => e.type === 'STRATEGY_CREATED') as StrategyCreatedEvent | undefined;
  return createdEvent?.instrument || null;
}

/**
 * Check if events array is valid (has required structure)
 */
export function isValidEventStream(events: unknown): events is StrategyEvent[] {
  if (!Array.isArray(events)) return false;
  if (events.length === 0) return true; // Empty is valid (new strategy)
  
  // Check first event is STRATEGY_CREATED if array is non-empty
  const first = events[0];
  if (typeof first !== 'object' || first === null) return false;
  if ((first as StrategyEvent).type !== 'STRATEGY_CREATED') return false;
  
  return true;
}

/**
 * Generate events from an existing canonical rules object
 * Used for migrating legacy strategies to event-sourced format
 */
export function generateEventsFromCanonical(
  canonical: CanonicalParsedRules,
  createdAt: string = new Date().toISOString(),
  naturalLanguage: string = ''
): StrategyEvent[] {
  // Create single STRATEGY_CREATED event
  // For migrated strategies, we don't need to track individual changes
  const createdEvent: StrategyCreatedEvent = {
    id: randomUUID(),
    timestamp: createdAt,
    type: 'STRATEGY_CREATED',
    pattern: canonical.pattern,
    instrument: canonical.instrument.symbol,
    direction: canonical.direction,
    initialMessage: naturalLanguage,
  };

  // For now, we only need the creation event
  // The canonical rules themselves are the "snapshot"
  // Future edits will append new events
  return [createdEvent];
}
