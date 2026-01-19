/**
 * Canonical Schema for Execution Engine
 * 
 * This is the STRICT contract between input systems and execution compilers.
 * All strategy formats (Claude, UI, API imports) must normalize to this format
 * before execution can compile them.
 * 
 * Key Principles:
 * - Discriminated unions for pattern-specific type safety
 * - Runtime validation via Zod (data crosses runtime boundaries)
 * - camelCase naming (TypeScript convention)
 * - Execution-first design (schema serves compiler needs)
 * 
 * @module lib/execution/canonical-schema
 * @see Issue #42 - Canonical Schema Architecture
 */

import { z } from 'zod';

// ============================================================================
// INSTRUMENT SPECIFICATION
// ============================================================================

export const InstrumentSpecSchema = z.object({
  symbol: z.enum(['ES', 'NQ', 'YM', 'RTY', 'CL', 'GC', 'SI']),
  contractSize: z.number().positive(),
  tickSize: z.number().positive(),
  tickValue: z.number().positive(),
});

export type InstrumentSpec = z.infer<typeof InstrumentSpecSchema>;

// Default instrument specs (can be overridden)
export const INSTRUMENT_DEFAULTS: Record<string, InstrumentSpec> = {
  ES: { symbol: 'ES', contractSize: 50, tickSize: 0.25, tickValue: 12.50 },
  NQ: { symbol: 'NQ', contractSize: 20, tickSize: 0.25, tickValue: 5.00 },
  YM: { symbol: 'YM', contractSize: 5, tickSize: 1, tickValue: 5.00 },
  RTY: { symbol: 'RTY', contractSize: 50, tickSize: 0.10, tickValue: 5.00 },
  CL: { symbol: 'CL', contractSize: 1000, tickSize: 0.01, tickValue: 10.00 },
  GC: { symbol: 'GC', contractSize: 100, tickSize: 0.10, tickValue: 10.00 },
  SI: { symbol: 'SI', contractSize: 5000, tickSize: 0.005, tickValue: 25.00 },
};

// ============================================================================
// SHARED COMPONENTS (All Patterns)
// ============================================================================

/**
 * Stop Loss Configuration
 * 
 * Supported types:
 * - fixed_ticks: Stop N ticks from entry (e.g., 20 ticks)
 * - structure: Stop below recent swing low/high
 * - atr_multiple: Stop N * ATR from entry (e.g., 1.5 ATR)
 * - opposite_range: Stop at opposite side of opening range (ORB-specific)
 */
export const StopLossConfigSchema = z.object({
  type: z.enum(['fixed_ticks', 'structure', 'atr_multiple', 'opposite_range']),
  value: z.number(), // ticks, ATR multiple, or 0 for structure/opposite_range
});

/**
 * Take Profit Configuration
 * 
 * Supported types:
 * - rr_ratio: Target at N:1 reward:risk (e.g., 2 = 2:1)
 * - fixed_ticks: Target N ticks from entry (e.g., 40 ticks)
 * - opposite_range: Target at opposite side of opening range (ORB-specific)
 * - structure: Target at next resistance/support level
 */
export const TakeProfitConfigSchema = z.object({
  type: z.enum(['rr_ratio', 'fixed_ticks', 'opposite_range', 'structure']),
  value: z.number().positive(), // R:R ratio, ticks, or 0 for structure
});

export const ExitConfigSchema = z.object({
  stopLoss: StopLossConfigSchema,
  takeProfit: TakeProfitConfigSchema,
});

export type ExitConfig = z.infer<typeof ExitConfigSchema>;

/**
 * Risk Configuration
 * 
 * Position sizing methods:
 * - risk_percent: Risk N% of account per trade
 * - fixed_contracts: Always trade N contracts
 */
export const RiskConfigSchema = z.object({
  positionSizing: z.enum(['risk_percent', 'fixed_contracts']),
  riskPercent: z.number().min(0.1).max(5).optional(), // 1 = 1%, NOT 0.01
  maxContracts: z.number().int().min(1).max(20),
});

export type RiskConfig = z.infer<typeof RiskConfigSchema>;

/**
 * Time Configuration
 * 
 * Session presets:
 * - ny: New York session (9:30 AM - 4:00 PM ET)
 * - london: London session (3:00 AM - 12:00 PM ET)
 * - asia: Asian session (8:00 PM - 4:00 AM ET)
 * - all: 24 hours
 * - custom: Use customStart/customEnd times
 */
export const TimeConfigSchema = z.object({
  session: z.enum(['ny', 'london', 'asia', 'all', 'custom']),
  customStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "09:30" format
  customEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),   // "16:00" format
  timezone: z.string().default('America/New_York'),
});

export type TimeConfig = z.infer<typeof TimeConfigSchema>;

// ============================================================================
// PATTERN-SPECIFIC RULES (Discriminated Union)
// ============================================================================

/**
 * Opening Range Breakout (ORB) Rules
 * 
 * Entry logic:
 * 1. Calculate high/low of first N minutes (opening range)
 * 2. Wait for price to break above OR high (long) or below OR low (short)
 * 3. Entry triggered on breakout confirmation
 */
export const OpeningRangeBreakoutRulesSchema = z.object({
  pattern: z.literal('opening_range_breakout'),
  direction: z.enum(['long', 'short', 'both']),
  instrument: InstrumentSpecSchema,

  entry: z.object({
    openingRange: z.object({
      periodMinutes: z.number().int().min(5).max(120), // 5-120 min range
      entryOn: z.enum(['break_high', 'break_low', 'both']),
    }),
  }),

  exit: ExitConfigSchema,
  risk: RiskConfigSchema,
  time: TimeConfigSchema,
});

export type OpeningRangeBreakoutRules = z.infer<typeof OpeningRangeBreakoutRulesSchema>;

/**
 * EMA Pullback Rules
 * 
 * Entry logic:
 * 1. Identify trend using EMA
 * 2. Wait for price to pull back to EMA
 * 3. Enter when price bounces off EMA in trend direction
 */
export const EMAPullbackRulesSchema = z.object({
  pattern: z.literal('ema_pullback'),
  direction: z.enum(['long', 'short', 'both']),
  instrument: InstrumentSpecSchema,

  entry: z.object({
    emaPullback: z.object({
      emaPeriod: z.number().int().min(5).max(200), // 5-200 period EMA
      pullbackConfirmation: z.enum(['touch', 'close_above', 'bounce']),
    }),
    // Optional additional indicators
    indicators: z.object({
      rsi: z.object({
        period: z.number().int().min(2).max(50),
        threshold: z.number().min(0).max(100),
        direction: z.enum(['above', 'below']),
      }).optional(),
    }).optional(),
  }),

  exit: ExitConfigSchema,
  risk: RiskConfigSchema,
  time: TimeConfigSchema,
});

export type EMAPullbackRules = z.infer<typeof EMAPullbackRulesSchema>;

/**
 * Generic Breakout Rules
 * 
 * Entry logic:
 * 1. Identify N-period high/low
 * 2. Wait for price to break above high (long) or below low (short)
 * 3. Entry triggered with optional confirmation
 */
export const BreakoutRulesSchema = z.object({
  pattern: z.literal('breakout'),
  direction: z.enum(['long', 'short', 'both']),
  instrument: InstrumentSpecSchema,

  entry: z.object({
    breakout: z.object({
      lookbackPeriod: z.number().int().min(5).max(100).default(20), // Configurable!
      levelType: z.enum(['resistance', 'support', 'both']),
      confirmation: z.enum(['close', 'volume', 'none']),
    }),
  }),

  exit: ExitConfigSchema,
  risk: RiskConfigSchema,
  time: TimeConfigSchema,
});

export type BreakoutRules = z.infer<typeof BreakoutRulesSchema>;

// ============================================================================
// CANONICAL SCHEMA (Discriminated Union)
// ============================================================================

/**
 * Canonical Parsed Rules
 * 
 * This is THE contract for execution. All inputs must normalize to this format.
 * Uses Zod discriminated union for type-safe pattern-specific handling.
 */
export const CanonicalParsedRulesSchema = z.discriminatedUnion('pattern', [
  OpeningRangeBreakoutRulesSchema,
  EMAPullbackRulesSchema,
  BreakoutRulesSchema,
]);

export type CanonicalParsedRules = z.infer<typeof CanonicalParsedRulesSchema>;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate unknown data against canonical schema
 * 
 * @param rules - Unknown data to validate
 * @returns Success with parsed data, or failure with error messages
 */
export function validateCanonical(rules: unknown): {
  success: true;
  data: CanonicalParsedRules;
} | {
  success: false;
  errors: string[];
} {
  const result = CanonicalParsedRulesSchema.safeParse(rules);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.issues.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ),
    };
  }
}

/**
 * Parse and validate canonical rules, throwing on failure
 * Use in contexts where invalid data should throw (e.g., database load)
 */
export function parseCanonical(rules: unknown): CanonicalParsedRules {
  return CanonicalParsedRulesSchema.parse(rules);
}

// ============================================================================
// SUPPORTED PATTERNS
// ============================================================================

export const SUPPORTED_PATTERNS = [
  'opening_range_breakout',
  'ema_pullback',
  'breakout',
] as const;

export type SupportedPattern = typeof SUPPORTED_PATTERNS[number];

/**
 * Check if a pattern string is supported
 */
export function isSupportedPattern(pattern: string): pattern is SupportedPattern {
  return SUPPORTED_PATTERNS.includes(pattern as SupportedPattern);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for Opening Range Breakout rules
 */
export function isORBRules(rules: CanonicalParsedRules): rules is OpeningRangeBreakoutRules {
  return rules.pattern === 'opening_range_breakout';
}

/**
 * Type guard for EMA Pullback rules
 */
export function isEMAPullbackRules(rules: CanonicalParsedRules): rules is EMAPullbackRules {
  return rules.pattern === 'ema_pullback';
}

/**
 * Type guard for Breakout rules
 */
export function isBreakoutRules(rules: CanonicalParsedRules): rules is BreakoutRules {
  return rules.pattern === 'breakout';
}

// ============================================================================
// SESSION TIME UTILITIES
// ============================================================================

/**
 * Get session start/end times in minutes from midnight
 */
export function getSessionTimes(config: TimeConfig): { start: number; end: number } {
  switch (config.session) {
    case 'ny':
      return { start: 9 * 60 + 30, end: 16 * 60 }; // 9:30 AM - 4:00 PM
    case 'london':
      return { start: 3 * 60, end: 12 * 60 }; // 3:00 AM - 12:00 PM ET
    case 'asia':
      return { start: 20 * 60, end: 4 * 60 }; // 8:00 PM - 4:00 AM ET (spans midnight)
    case 'all':
      return { start: 0, end: 24 * 60 }; // All day
    case 'custom':
      return {
        start: parseTimeToMinutes(config.customStart || '09:30'),
        end: parseTimeToMinutes(config.customEnd || '16:00'),
      };
  }
}

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
