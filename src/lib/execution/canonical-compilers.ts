/**
 * Canonical Strategy Compilers
 * 
 * These compilers accept ONLY CanonicalParsedRules and produce CompiledStrategy.
 * They replace the text-parsing compilers with strict, type-safe implementations.
 * 
 * Key changes from original ruleInterpreter.ts:
 * - No text parsing - all values from structured canonical schema
 * - No defaults - all required fields must be present
 * - Discriminated union - TypeScript knows exact pattern type
 * - Runtime validation - Zod validates before compilation
 * 
 * @module lib/execution/canonical-compilers
 * @see Issue #42 - Canonical Schema Implementation
 */

import type {
  CanonicalParsedRules,
  OpeningRangeBreakoutRules,
  EMAPullbackRules,
  BreakoutRules,
  ExitConfig,
} from './canonical-schema';
import {
  validateCanonical,
  getSessionTimes,
} from './canonical-schema';
import type { OHLCV, Quote, OpeningRange } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Compiled strategy with executable functions
 * Same interface as original - only the input changes
 */
export interface CompiledStrategy {
  /** Check if entry conditions are met */
  shouldEnter: (context: EvaluationContext) => EntrySignal | null;

  /** Calculate entry price for detected setup */
  getEntryPrice: (context: EvaluationContext) => number;

  /** Calculate stop loss price */
  getStopPrice: (entryPrice: number, context: EvaluationContext) => number;

  /** Calculate target price */
  getTargetPrice: (entryPrice: number, stopPrice: number, context: EvaluationContext) => number;

  /** Calculate position size based on risk */
  getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number) => number;

  /** Check if current time is within trading window */
  isTimeValid: (now: Date) => boolean;

  /** Metadata */
  instrument: string;
  pattern: string;
  direction: 'long' | 'short' | 'both';
  riskPercent: number;
}

/**
 * Context provided to evaluation functions
 */
export interface EvaluationContext {
  candles: OHLCV[];
  quote: Quote;
  indicators: IndicatorValues;
  openingRange: OpeningRange | null;
  currentTime: Date;
}

/**
 * Pre-calculated indicator values
 */
export interface IndicatorValues {
  ema5?: number;
  ema9?: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  rsi14?: number;
  atr14?: number;
  vwap?: number;
  [key: string]: number | undefined;
}

/**
 * Entry signal returned by shouldEnter
 */
export interface EntrySignal {
  direction: 'long' | 'short';
  reason: string;
  confidence: number;
  triggerPrice: number;
}

// ============================================================================
// MAIN COMPILER (Canonical)
// ============================================================================

/**
 * Compile a canonical strategy into executable functions
 * 
 * This is the main entry point. Uses discriminated union to route
 * to pattern-specific compilers with full type safety.
 * 
 * @param canonical - Validated CanonicalParsedRules
 * @returns CompiledStrategy with executable functions
 * @throws Error if validation fails
 */
export function compileCanonicalStrategy(canonical: CanonicalParsedRules): CompiledStrategy {
  // TypeScript discriminated union - each case has full type narrowing
  switch (canonical.pattern) {
    case 'opening_range_breakout':
      return compileCanonicalORB(canonical);

    case 'ema_pullback':
      return compileCanonicalEMAPullback(canonical);

    case 'breakout':
      return compileCanonicalBreakout(canonical);

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = canonical;
      throw new Error(`Unknown pattern: ${(_exhaustive as CanonicalParsedRules).pattern}`);
  }
}

/**
 * Compile from unknown data - validates first
 * Use when loading from database or external sources
 */
export function compileFromUnknown(rules: unknown): CompiledStrategy {
  const validation = validateCanonical(rules);
  
  if (!validation.success) {
    throw new Error(`Invalid canonical rules: ${validation.errors.join(', ')}`);
  }
  
  return compileCanonicalStrategy(validation.data);
}

// ============================================================================
// PATTERN COMPILERS
// ============================================================================

/**
 * Compile Opening Range Breakout pattern
 */
function compileCanonicalORB(rules: OpeningRangeBreakoutRules): CompiledStrategy {
  const { instrument, direction, entry, exit, risk, time } = rules;
  const { tickSize, tickValue } = instrument;
  const { periodMinutes, entryOn } = entry.openingRange;
  
  // Pre-calculate session times
  const sessionTimes = getSessionTimes(time);
  
  // Calculate opening range end time (session start + period)
  const orEndMinutes = sessionTimes.start + periodMinutes;
  
  // Risk percent (canonical uses 1 = 1%, not 0.01)
  const riskPercent = risk.riskPercent !== undefined ? risk.riskPercent / 100 : 0.01;
  
  return {
    instrument: instrument.symbol,
    pattern: 'opening_range_breakout',
    direction,
    riskPercent,

    shouldEnter: (context: EvaluationContext): EntrySignal | null => {
      const { candles, quote, openingRange, currentTime } = context;

      // Need opening range to be calculated
      if (!openingRange || !openingRange.isComplete) {
        return null;
      }

      // Don't enter during opening range period
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      if (currentMinutes < orEndMinutes) {
        return null;
      }

      const currentPrice = quote.last;
      const prevCandle = candles[candles.length - 2];

      if (!prevCandle) return null;

      // Check for long entry (break above OR high)
      if ((direction === 'long' || direction === 'both') &&
          (entryOn === 'break_high' || entryOn === 'both')) {
        if (prevCandle.close <= openingRange.high && currentPrice > openingRange.high) {
          return {
            direction: 'long',
            reason: `ORB: Price broke above opening range high at ${openingRange.high.toFixed(2)}`,
            confidence: 0.85,
            triggerPrice: openingRange.high,
          };
        }
      }

      // Check for short entry (break below OR low)
      if ((direction === 'short' || direction === 'both') &&
          (entryOn === 'break_low' || entryOn === 'both')) {
        if (prevCandle.close >= openingRange.low && currentPrice < openingRange.low) {
          return {
            direction: 'short',
            reason: `ORB: Price broke below opening range low at ${openingRange.low.toFixed(2)}`,
            confidence: 0.85,
            triggerPrice: openingRange.low,
          };
        }
      }

      return null;
    },

    getEntryPrice: (context: EvaluationContext): number => {
      return context.quote.last;
    },

    getStopPrice: (entryPrice: number, context: EvaluationContext): number => {
      const { openingRange, indicators, candles } = context;
      const isLong = context.quote.last > (openingRange?.high ?? entryPrice);

      return calculateStopPrice(
        entryPrice,
        isLong,
        exit.stopLoss,
        tickSize,
        openingRange,
        indicators,
        candles
      );
    },

    getTargetPrice: (entryPrice: number, stopPrice: number, context: EvaluationContext): number => {
      const isLong = entryPrice > stopPrice;

      return calculateTargetPrice(
        entryPrice,
        stopPrice,
        isLong,
        exit.takeProfit,
        tickSize,
        context.openingRange
      );
    },

    getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number): number => {
      return calculatePositionSize(
        accountBalance,
        entryPrice,
        stopPrice,
        riskPercent,
        risk.maxContracts,
        tickSize,
        tickValue
      );
    },

    isTimeValid: (now: Date): boolean => {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return currentMinutes >= sessionTimes.start && currentMinutes <= sessionTimes.end;
    },
  };
}

/**
 * Compile EMA Pullback pattern
 */
function compileCanonicalEMAPullback(rules: EMAPullbackRules): CompiledStrategy {
  const { instrument, direction, entry, exit, risk, time } = rules;
  const { tickSize, tickValue } = instrument;
  const { emaPeriod, pullbackConfirmation } = entry.emaPullback;
  
  // Build indicator key dynamically
  const emaKey = `ema${emaPeriod}` as keyof IndicatorValues;
  
  // Pre-calculate session times
  const sessionTimes = getSessionTimes(time);
  
  // Risk percent
  const riskPercent = risk.riskPercent !== undefined ? risk.riskPercent / 100 : 0.01;
  
  // Optional RSI filter
  const rsiFilter = entry.indicators?.rsi;
  
  return {
    instrument: instrument.symbol,
    pattern: 'ema_pullback',
    direction,
    riskPercent,

    shouldEnter: (context: EvaluationContext): EntrySignal | null => {
      const { candles, quote, indicators } = context;
      const emaValue = indicators[emaKey];

      if (!emaValue || candles.length < 5) return null;

      const currentPrice = quote.last;
      const currentCandle = candles[candles.length - 1];
      const prevCandle = candles[candles.length - 2];

      if (!currentCandle || !prevCandle) return null;

      // Determine trend direction based on price relative to EMA
      const isBullish = currentPrice > emaValue && prevCandle.close > emaValue;
      const isBearish = currentPrice < emaValue && prevCandle.close < emaValue;

      // Check for pullback to EMA (price touched EMA recently)
      const recentCandles = candles.slice(-5);
      const touchedEMA = recentCandles.some(c =>
        c.low <= emaValue && c.high >= emaValue
      );

      if (!touchedEMA) return null;

      // Apply RSI filter if configured
      if (rsiFilter) {
        const rsiValue = indicators[`rsi${rsiFilter.period}`] ?? indicators.rsi14;
        if (rsiValue !== undefined) {
          if (rsiFilter.direction === 'below' && rsiValue >= rsiFilter.threshold) {
            return null;
          }
          if (rsiFilter.direction === 'above' && rsiValue <= rsiFilter.threshold) {
            return null;
          }
        }
      }

      // Check for entry confirmation
      const confirmed = checkPullbackConfirmation(
        pullbackConfirmation,
        prevCandle,
        currentCandle,
        emaValue
      );

      if (!confirmed) return null;

      // Long entry: bullish trend + price bouncing off EMA
      if ((direction === 'long' || direction === 'both') && isBullish) {
        return {
          direction: 'long',
          reason: `EMA ${emaPeriod} pullback buy - price bounced off ${emaValue.toFixed(2)}`,
          confidence: 0.75,
          triggerPrice: emaValue,
        };
      }

      // Short entry: bearish trend + price bouncing off EMA
      if ((direction === 'short' || direction === 'both') && isBearish) {
        return {
          direction: 'short',
          reason: `EMA ${emaPeriod} pullback sell - price rejected at ${emaValue.toFixed(2)}`,
          confidence: 0.75,
          triggerPrice: emaValue,
        };
      }

      return null;
    },

    getEntryPrice: (context: EvaluationContext): number => {
      return context.quote.last;
    },

    getStopPrice: (entryPrice: number, context: EvaluationContext): number => {
      const emaValue = context.indicators[emaKey];
      const isLong = context.quote.last > (emaValue ?? entryPrice);

      return calculateStopPrice(
        entryPrice,
        isLong,
        exit.stopLoss,
        tickSize,
        null, // No opening range for EMA
        context.indicators,
        context.candles
      );
    },

    getTargetPrice: (entryPrice: number, stopPrice: number): number => {
      const isLong = entryPrice > stopPrice;

      return calculateTargetPrice(
        entryPrice,
        stopPrice,
        isLong,
        exit.takeProfit,
        tickSize,
        null
      );
    },

    getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number): number => {
      return calculatePositionSize(
        accountBalance,
        entryPrice,
        stopPrice,
        riskPercent,
        risk.maxContracts,
        tickSize,
        tickValue
      );
    },

    isTimeValid: (now: Date): boolean => {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return currentMinutes >= sessionTimes.start && currentMinutes <= sessionTimes.end;
    },
  };
}

/**
 * Compile Generic Breakout pattern
 */
function compileCanonicalBreakout(rules: BreakoutRules): CompiledStrategy {
  const { instrument, direction, entry, exit, risk, time } = rules;
  const { tickSize, tickValue } = instrument;
  const { lookbackPeriod, levelType, confirmation } = entry.breakout;
  
  // Pre-calculate session times
  const sessionTimes = getSessionTimes(time);
  
  // Risk percent
  const riskPercent = risk.riskPercent !== undefined ? risk.riskPercent / 100 : 0.01;
  
  return {
    instrument: instrument.symbol,
    pattern: 'breakout',
    direction,
    riskPercent,

    shouldEnter: (context: EvaluationContext): EntrySignal | null => {
      const { candles, quote } = context;

      if (candles.length < lookbackPeriod) return null;

      const currentPrice = quote.last;
      const recentCandles = candles.slice(-lookbackPeriod);

      // Calculate N-period high/low (uses canonical lookbackPeriod, NOT hardcoded 20!)
      const periodHigh = Math.max(...recentCandles.map(c => c.high));
      const periodLow = Math.min(...recentCandles.map(c => c.low));

      const prevCandle = candles[candles.length - 2];
      if (!prevCandle) return null;

      // Check for long breakout
      if ((direction === 'long' || direction === 'both') &&
          (levelType === 'resistance' || levelType === 'both')) {
        
        const breakoutConfirmed = checkBreakoutConfirmation(
          confirmation,
          'long',
          prevCandle,
          candles[candles.length - 1],
          periodHigh,
          context
        );

        if (prevCandle.high < periodHigh && currentPrice > periodHigh && breakoutConfirmed) {
          return {
            direction: 'long',
            reason: `Breakout above ${lookbackPeriod}-period high at ${periodHigh.toFixed(2)}`,
            confidence: 0.70,
            triggerPrice: periodHigh,
          };
        }
      }

      // Check for short breakout
      if ((direction === 'short' || direction === 'both') &&
          (levelType === 'support' || levelType === 'both')) {
        
        const breakoutConfirmed = checkBreakoutConfirmation(
          confirmation,
          'short',
          prevCandle,
          candles[candles.length - 1],
          periodLow,
          context
        );

        if (prevCandle.low > periodLow && currentPrice < periodLow && breakoutConfirmed) {
          return {
            direction: 'short',
            reason: `Breakdown below ${lookbackPeriod}-period low at ${periodLow.toFixed(2)}`,
            confidence: 0.70,
            triggerPrice: periodLow,
          };
        }
      }

      return null;
    },

    getEntryPrice: (context: EvaluationContext): number => {
      return context.quote.last;
    },

    getStopPrice: (entryPrice: number, context: EvaluationContext): number => {
      const isLong = context.quote.last > entryPrice || exit.stopLoss.value > 0;

      return calculateStopPrice(
        entryPrice,
        isLong,
        exit.stopLoss,
        tickSize,
        null,
        context.indicators,
        context.candles
      );
    },

    getTargetPrice: (entryPrice: number, stopPrice: number): number => {
      const isLong = entryPrice > stopPrice;

      return calculateTargetPrice(
        entryPrice,
        stopPrice,
        isLong,
        exit.takeProfit,
        tickSize,
        null
      );
    },

    getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number): number => {
      return calculatePositionSize(
        accountBalance,
        entryPrice,
        stopPrice,
        riskPercent,
        risk.maxContracts,
        tickSize,
        tickValue
      );
    },

    isTimeValid: (now: Date): boolean => {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return currentMinutes >= sessionTimes.start && currentMinutes <= sessionTimes.end;
    },
  };
}

// ============================================================================
// SHARED HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate stop price based on exit config
 * No text parsing - uses structured config directly
 */
function calculateStopPrice(
  entryPrice: number,
  isLong: boolean,
  stopConfig: ExitConfig['stopLoss'],
  tickSize: number,
  openingRange: OpeningRange | null,
  indicators: IndicatorValues,
  candles: OHLCV[]
): number {
  switch (stopConfig.type) {
    case 'fixed_ticks':
      return isLong
        ? entryPrice - (stopConfig.value * tickSize)
        : entryPrice + (stopConfig.value * tickSize);

    case 'atr_multiple':
      const atr = indicators.atr14 || (10 * tickSize);
      return isLong
        ? entryPrice - (stopConfig.value * atr)
        : entryPrice + (stopConfig.value * atr);

    case 'structure':
      // Find recent swing low (for long) or swing high (for short)
      const recentCandles = candles.slice(-10);
      if (isLong) {
        const swingLow = Math.min(...recentCandles.map(c => c.low));
        return swingLow - tickSize;
      } else {
        const swingHigh = Math.max(...recentCandles.map(c => c.high));
        return swingHigh + tickSize;
      }

    case 'opposite_range':
      if (openingRange) {
        return isLong
          ? openingRange.low - tickSize
          : openingRange.high + tickSize;
      }
      // Fallback to fixed ticks
      return isLong
        ? entryPrice - (20 * tickSize)
        : entryPrice + (20 * tickSize);

    default:
      // TypeScript exhaustiveness
      const _exhaustive: never = stopConfig.type;
      throw new Error(`Unknown stop type: ${_exhaustive}`);
  }
}

/**
 * Calculate target price based on exit config
 * No text parsing - uses structured config directly
 */
function calculateTargetPrice(
  entryPrice: number,
  stopPrice: number,
  isLong: boolean,
  targetConfig: ExitConfig['takeProfit'],
  tickSize: number,
  openingRange: OpeningRange | null
): number {
  const stopDistance = Math.abs(entryPrice - stopPrice);

  switch (targetConfig.type) {
    case 'rr_ratio':
      const targetDistance = stopDistance * targetConfig.value;
      return isLong
        ? entryPrice + targetDistance
        : entryPrice - targetDistance;

    case 'fixed_ticks':
      return isLong
        ? entryPrice + (targetConfig.value * tickSize)
        : entryPrice - (targetConfig.value * tickSize);

    case 'opposite_range':
      if (openingRange) {
        // Target is opposite extreme plus extension
        const rangeSize = openingRange.high - openingRange.low;
        return isLong
          ? openingRange.high + rangeSize
          : openingRange.low - rangeSize;
      }
      // Fallback to 2R
      return isLong
        ? entryPrice + (2 * stopDistance)
        : entryPrice - (2 * stopDistance);

    case 'structure':
      // For structure targets, use 2R as default
      // (Could be enhanced with actual S/R detection)
      return isLong
        ? entryPrice + (2 * stopDistance)
        : entryPrice - (2 * stopDistance);

    default:
      const _exhaustive: never = targetConfig.type;
      throw new Error(`Unknown target type: ${_exhaustive}`);
  }
}

/**
 * Calculate position size based on risk config
 * No ambiguity - riskPercent is always a percentage (1 = 1%)
 */
function calculatePositionSize(
  accountBalance: number,
  entryPrice: number,
  stopPrice: number,
  riskPercent: number, // Already divided by 100
  maxContracts: number,
  tickSize: number,
  tickValue: number
): number {
  const stopDistancePoints = Math.abs(entryPrice - stopPrice);
  const stopDistanceTicks = stopDistancePoints / tickSize;
  const dollarRiskPerContract = stopDistanceTicks * tickValue;

  const dollarRisk = accountBalance * riskPercent;
  const contracts = Math.floor(dollarRisk / dollarRiskPerContract);

  // Respect max contracts from canonical config
  return Math.max(1, Math.min(contracts, maxContracts));
}

/**
 * Check pullback confirmation for EMA pattern
 */
function checkPullbackConfirmation(
  confirmation: 'touch' | 'close_above' | 'bounce',
  prevCandle: OHLCV,
  currentCandle: OHLCV,
  emaValue: number
): boolean {
  switch (confirmation) {
    case 'touch':
      // Any touch of EMA counts
      return true;

    case 'close_above':
      // Previous candle touched, current closed above
      return prevCandle.low <= emaValue && currentCandle.close > emaValue;

    case 'bounce':
      // Price touched and bounced with momentum
      return prevCandle.low <= emaValue &&
             currentCandle.close > emaValue &&
             currentCandle.close > prevCandle.close;

    default:
      return true;
  }
}

/**
 * Check breakout confirmation
 */
function checkBreakoutConfirmation(
  confirmation: 'close' | 'volume' | 'none',
  breakDirection: 'long' | 'short',
  prevCandle: OHLCV,
  currentCandle: OHLCV | undefined,
  level: number,
  context: EvaluationContext
): boolean {
  if (!currentCandle) return false;

  switch (confirmation) {
    case 'none':
      return true;

    case 'close':
      // Wait for close above/below level
      if (breakDirection === 'long') {
        return currentCandle.close > level;
      } else {
        return currentCandle.close < level;
      }

    case 'volume':
      // Check if volume is above average (simple implementation)
      const avgVolume = context.candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
      return currentCandle.volume > avgVolume * 1.5;

    default:
      return true;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  compileCanonicalORB,
  compileCanonicalEMAPullback,
  compileCanonicalBreakout,
};
