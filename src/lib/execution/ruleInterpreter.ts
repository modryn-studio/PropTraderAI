/**
 * Rule Interpreter - Convert Text Rules to Executable Logic
 * 
 * Transforms natural language strategy rules (from strategy builder)
 * into executable functions that the execution engine can evaluate.
 * 
 * This is the P0 BLOCKING component per Agent 1's Fresh Review.
 * Without this, strategies cannot be executed.
 * 
 * @module lib/execution/ruleInterpreter
 * @see Issue #10 - Component 1: Rule Interpreter
 */

import type {
  ParsedRules,
  EntryCondition,
  ExitCondition,
  StrategyFilter,
  OHLCV,
  Quote,
  OpeningRange,
} from './types';
import { INSTRUMENT_SPECS } from './tradovate';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Compiled strategy with executable functions
 * This is what the execution engine uses to evaluate setups
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
  ema20?: number;
  ema50?: number;
  ema200?: number;
  rsi14?: number;
  atr14?: number;
  vwap?: number;
  [key: string]: number | undefined;
}

/**
 * Result of entry condition evaluation
 */
export interface EntrySignal {
  direction: 'long' | 'short';
  reason: string;
  confidence: number;
  triggerPrice: number;
}

// ============================================================================
// PATTERN COMPILERS
// ============================================================================

/**
 * Compile Opening Range Breakout (ORB) pattern
 * 
 * ORB Logic:
 * 1. Calculate high/low of first 15-30 min of session (opening range)
 * 2. Wait for price to break above OR high (long) or below OR low (short)
 * 3. Stop at opposite side of range (or middle of range)
 * 4. Target at R:R multiple
 */
function compileORBPattern(
  rules: ParsedRules,
  instrument: string,
  direction: 'long' | 'short' | 'both'
): CompiledStrategy {
  const tickSize = INSTRUMENT_SPECS[instrument]?.tickSize || 0.25;
  const pointValue = INSTRUMENT_SPECS[instrument]?.pointValue || 20;
  
  // Parse stop loss rule
  const stopConfig = parseStopLoss(rules.exit_conditions || [], instrument);
  
  // Parse target rule
  const targetConfig = parseTarget(rules.exit_conditions || [], instrument);
  
  // Parse time filters
  const timeFilters = parseTimeFilters(rules.filters || []);
  
  // Parse position sizing
  const riskPercent = parsePositionSizing(rules.position_sizing);
  
  return {
    instrument,
    pattern: 'opening_range_breakout',
    direction,
    riskPercent,
    
    shouldEnter: (context: EvaluationContext): EntrySignal | null => {
      const { candles, quote, openingRange, currentTime } = context;
      
      // Need opening range to be calculated
      if (!openingRange || !openingRange.isComplete) {
        return null;
      }
      
      // Don't enter during opening range period (wait for completion)
      const orEndTimeStr = typeof openingRange.endTime === 'string' 
        ? openingRange.endTime 
        : openingRange.endTime.toTimeString().substring(0, 5);
      const orEndTime = parseTimeToMinutes(orEndTimeStr || '09:45');
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      if (currentMinutes < orEndTime) {
        return null;
      }
      
      const currentPrice = quote.last;
      const prevCandle = candles[candles.length - 2];
      const currentCandle = candles[candles.length - 1];
      
      if (!prevCandle || !currentCandle) return null;
      
      // Check for long entry (break above OR high)
      if (direction === 'long' || direction === 'both') {
        if (prevCandle.close <= openingRange.high && currentPrice > openingRange.high) {
          return {
            direction: 'long',
            reason: `Price broke above opening range high at ${openingRange.high.toFixed(2)}`,
            confidence: 0.85,
            triggerPrice: openingRange.high,
          };
        }
      }
      
      // Check for short entry (break below OR low)
      if (direction === 'short' || direction === 'both') {
        if (prevCandle.close >= openingRange.low && currentPrice < openingRange.low) {
          return {
            direction: 'short',
            reason: `Price broke below opening range low at ${openingRange.low.toFixed(2)}`,
            confidence: 0.85,
            triggerPrice: openingRange.low,
          };
        }
      }
      
      return null;
    },
    
    getEntryPrice: (context: EvaluationContext): number => {
      // For ORB, entry is at the breakout level
      return context.quote.last;
    },
    
    getStopPrice: (entryPrice: number, context: EvaluationContext): number => {
      const { openingRange } = context;
      
      if (!openingRange) {
        // Fallback: fixed tick stop
        return entryPrice - (20 * tickSize);
      }
      
      const rangeSize = openingRange.high - openingRange.low;
      const isLong = entryPrice >= openingRange.high;
      
      switch (stopConfig.type) {
        case 'opposite_range':
          // Stop at opposite side of range
          return isLong ? openingRange.low - tickSize : openingRange.high + tickSize;
          
        case 'range_percent':
          // Stop at percentage of range
          const midPoint = openingRange.low + (rangeSize * stopConfig.value);
          return isLong ? midPoint - tickSize : midPoint + tickSize;
          
        case 'fixed_ticks':
          return isLong 
            ? entryPrice - (stopConfig.value * tickSize)
            : entryPrice + (stopConfig.value * tickSize);
            
        case 'atr_multiple':
          const atr = context.indicators.atr14 || rangeSize;
          return isLong
            ? entryPrice - (stopConfig.value * atr)
            : entryPrice + (stopConfig.value * atr);
            
        default:
          // Default to below/above range
          return isLong ? openingRange.low - tickSize : openingRange.high + tickSize;
      }
    },
    
    getTargetPrice: (entryPrice: number, stopPrice: number, context: EvaluationContext): number => {
      const stopDistance = Math.abs(entryPrice - stopPrice);
      const isLong = entryPrice > stopPrice;
      
      switch (targetConfig.type) {
        case 'rr_ratio':
          // Risk:Reward ratio (e.g., 1:2 means target = 2x stop distance)
          const targetDistance = stopDistance * targetConfig.value;
          return isLong 
            ? entryPrice + targetDistance 
            : entryPrice - targetDistance;
            
        case 'fixed_ticks':
          return isLong
            ? entryPrice + (targetConfig.value * tickSize)
            : entryPrice - (targetConfig.value * tickSize);
            
        case 'opposite_range':
          if (context.openingRange) {
            // Target is opposite extreme plus extension
            return isLong
              ? context.openingRange.high + (context.openingRange.high - context.openingRange.low)
              : context.openingRange.low - (context.openingRange.high - context.openingRange.low);
          }
          // Fallback to 2R
          return isLong ? entryPrice + (2 * stopDistance) : entryPrice - (2 * stopDistance);
          
        default:
          // Default to 2:1 R:R
          return isLong ? entryPrice + (2 * stopDistance) : entryPrice - (2 * stopDistance);
      }
    },
    
    getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number): number => {
      const stopDistancePoints = Math.abs(entryPrice - stopPrice);
      const stopDistanceTicks = stopDistancePoints / tickSize;
      const dollarRiskPerContract = stopDistanceTicks * (tickSize * pointValue);
      
      const dollarRisk = accountBalance * riskPercent;
      const contracts = Math.floor(dollarRisk / dollarRiskPerContract);
      
      return Math.max(1, Math.min(contracts, 10)); // Min 1, max 10 contracts
    },
    
    isTimeValid: (now: Date): boolean => {
      if (timeFilters.length === 0) {
        // Default: RTH only (9:30 AM - 4:00 PM ET)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return currentMinutes >= 570 && currentMinutes <= 960; // 9:30 - 16:00
      }
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return timeFilters.some(filter => 
        currentMinutes >= filter.start && currentMinutes <= filter.end
      );
    },
  };
}

/**
 * Compile EMA Pullback pattern
 * 
 * Pullback Logic:
 * 1. Identify trend using higher timeframe EMA
 * 2. Wait for price to pull back to EMA
 * 3. Enter when price bounces off EMA in trend direction
 * 4. Stop below swing low (long) or above swing high (short)
 */
function compileEMAPullbackPattern(
  rules: ParsedRules,
  instrument: string,
  direction: 'long' | 'short' | 'both'
): CompiledStrategy {
  const tickSize = INSTRUMENT_SPECS[instrument]?.tickSize || 0.25;
  const pointValue = INSTRUMENT_SPECS[instrument]?.pointValue || 20;
  
  // Determine which EMA period to use
  const emaPeriod = parseEMAPeriod(rules.entry_conditions || []);
  const emaKey = `ema${emaPeriod}`;
  
  const stopConfig = parseStopLoss(rules.exit_conditions || [], instrument);
  const targetConfig = parseTarget(rules.exit_conditions || [], instrument);
  const timeFilters = parseTimeFilters(rules.filters || []);
  const riskPercent = parsePositionSizing(rules.position_sizing);
  
  return {
    instrument,
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
      
      // Long entry: bullish trend + price bouncing off EMA
      if ((direction === 'long' || direction === 'both') && isBullish) {
        if (prevCandle.low <= emaValue && currentCandle.close > emaValue) {
          return {
            direction: 'long',
            reason: `EMA ${emaPeriod} pullback buy - price bounced off ${emaValue.toFixed(2)}`,
            confidence: 0.75,
            triggerPrice: emaValue,
          };
        }
      }
      
      // Short entry: bearish trend + price rejected from EMA
      if ((direction === 'short' || direction === 'both') && isBearish) {
        if (prevCandle.high >= emaValue && currentCandle.close < emaValue) {
          return {
            direction: 'short',
            reason: `EMA ${emaPeriod} pullback sell - price rejected from ${emaValue.toFixed(2)}`,
            confidence: 0.75,
            triggerPrice: emaValue,
          };
        }
      }
      
      return null;
    },
    
    getEntryPrice: (context: EvaluationContext): number => {
      return context.quote.last;
    },
    
    getStopPrice: (entryPrice: number, context: EvaluationContext): number => {
      const { candles } = context;
      const isLong = true; // Will be determined by entry
      
      if (stopConfig.type === 'structure') {
        // Find recent swing low (for long) or swing high (for short)
        const recentCandles = candles.slice(-10);
        if (isLong) {
          const swingLow = Math.min(...recentCandles.map(c => c.low));
          return swingLow - tickSize;
        } else {
          const swingHigh = Math.max(...recentCandles.map(c => c.high));
          return swingHigh + tickSize;
        }
      }
      
      if (stopConfig.type === 'fixed_ticks') {
        return entryPrice - (stopConfig.value * tickSize);
      }
      
      if (stopConfig.type === 'atr_multiple') {
        const atr = context.indicators.atr14 || (10 * tickSize);
        return entryPrice - (stopConfig.value * atr);
      }
      
      // Default: 2 ATR stop
      const atr = context.indicators.atr14 || (10 * tickSize);
      return entryPrice - (2 * atr);
    },
    
    getTargetPrice: (entryPrice: number, stopPrice: number, context: EvaluationContext): number => {
      const stopDistance = Math.abs(entryPrice - stopPrice);
      const isLong = entryPrice > stopPrice;
      
      if (targetConfig.type === 'rr_ratio') {
        const targetDistance = stopDistance * targetConfig.value;
        return isLong ? entryPrice + targetDistance : entryPrice - targetDistance;
      }
      
      if (targetConfig.type === 'fixed_ticks') {
        return isLong
          ? entryPrice + (targetConfig.value * tickSize)
          : entryPrice - (targetConfig.value * tickSize);
      }
      
      // Default to 2R
      return isLong ? entryPrice + (2 * stopDistance) : entryPrice - (2 * stopDistance);
    },
    
    getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number): number => {
      const stopDistancePoints = Math.abs(entryPrice - stopPrice);
      const stopDistanceTicks = stopDistancePoints / tickSize;
      const dollarRiskPerContract = stopDistanceTicks * (tickSize * pointValue);
      
      const dollarRisk = accountBalance * riskPercent;
      const contracts = Math.floor(dollarRisk / dollarRiskPerContract);
      
      return Math.max(1, Math.min(contracts, 10));
    },
    
    isTimeValid: (now: Date): boolean => {
      if (timeFilters.length === 0) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return currentMinutes >= 570 && currentMinutes <= 960;
      }
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return timeFilters.some(filter => 
        currentMinutes >= filter.start && currentMinutes <= filter.end
      );
    },
  };
}

/**
 * Compile generic breakout pattern
 */
function compileBreakoutPattern(
  rules: ParsedRules,
  instrument: string,
  direction: 'long' | 'short' | 'both'
): CompiledStrategy {
  const tickSize = INSTRUMENT_SPECS[instrument]?.tickSize || 0.25;
  const pointValue = INSTRUMENT_SPECS[instrument]?.pointValue || 20;
  
  const stopConfig = parseStopLoss(rules.exit_conditions || [], instrument);
  const targetConfig = parseTarget(rules.exit_conditions || [], instrument);
  const timeFilters = parseTimeFilters(rules.filters || []);
  const riskPercent = parsePositionSizing(rules.position_sizing);
  
  return {
    instrument,
    pattern: 'breakout',
    direction,
    riskPercent,
    
    shouldEnter: (context: EvaluationContext): EntrySignal | null => {
      const { candles, quote } = context;
      
      if (candles.length < 20) return null;
      
      const currentPrice = quote.last;
      const recentCandles = candles.slice(-20);
      
      // Calculate 20-period high/low
      const periodHigh = Math.max(...recentCandles.map(c => c.high));
      const periodLow = Math.min(...recentCandles.map(c => c.low));
      
      const prevCandle = candles[candles.length - 2];
      if (!prevCandle) return null;
      
      // Long breakout: price breaks above 20-period high
      if ((direction === 'long' || direction === 'both') && 
          prevCandle.high < periodHigh && currentPrice > periodHigh) {
        return {
          direction: 'long',
          reason: `Breakout above 20-period high at ${periodHigh.toFixed(2)}`,
          confidence: 0.70,
          triggerPrice: periodHigh,
        };
      }
      
      // Short breakout: price breaks below 20-period low
      if ((direction === 'short' || direction === 'both') &&
          prevCandle.low > periodLow && currentPrice < periodLow) {
        return {
          direction: 'short',
          reason: `Breakdown below 20-period low at ${periodLow.toFixed(2)}`,
          confidence: 0.70,
          triggerPrice: periodLow,
        };
      }
      
      return null;
    },
    
    getEntryPrice: (context: EvaluationContext): number => {
      return context.quote.last;
    },
    
    getStopPrice: (entryPrice: number, context: EvaluationContext): number => {
      const { candles } = context;
      
      if (stopConfig.type === 'fixed_ticks') {
        return entryPrice - (stopConfig.value * tickSize);
      }
      
      if (stopConfig.type === 'atr_multiple') {
        const atr = context.indicators.atr14 || (10 * tickSize);
        return entryPrice - (stopConfig.value * atr);
      }
      
      // Default: recent swing (5-bar low for long)
      const recentCandles = candles.slice(-5);
      const swingLow = Math.min(...recentCandles.map(c => c.low));
      return swingLow - tickSize;
    },
    
    getTargetPrice: (entryPrice: number, stopPrice: number, context: EvaluationContext): number => {
      const stopDistance = Math.abs(entryPrice - stopPrice);
      const isLong = entryPrice > stopPrice;
      
      if (targetConfig.type === 'rr_ratio') {
        const targetDistance = stopDistance * targetConfig.value;
        return isLong ? entryPrice + targetDistance : entryPrice - targetDistance;
      }
      
      if (targetConfig.type === 'fixed_ticks') {
        return isLong
          ? entryPrice + (targetConfig.value * tickSize)
          : entryPrice - (targetConfig.value * tickSize);
      }
      
      // Default to 2R
      return isLong ? entryPrice + (2 * stopDistance) : entryPrice - (2 * stopDistance);
    },
    
    getContractQuantity: (accountBalance: number, entryPrice: number, stopPrice: number): number => {
      const stopDistancePoints = Math.abs(entryPrice - stopPrice);
      const stopDistanceTicks = stopDistancePoints / tickSize;
      const dollarRiskPerContract = stopDistanceTicks * (tickSize * pointValue);
      
      const dollarRisk = accountBalance * riskPercent;
      const contracts = Math.floor(dollarRisk / dollarRiskPerContract);
      
      return Math.max(1, Math.min(contracts, 10));
    },
    
    isTimeValid: (now: Date): boolean => {
      if (timeFilters.length === 0) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return currentMinutes >= 570 && currentMinutes <= 960;
      }
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return timeFilters.some(filter => 
        currentMinutes >= filter.start && currentMinutes <= filter.end
      );
    },
  };
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

interface StopConfig {
  type: 'opposite_range' | 'range_percent' | 'fixed_ticks' | 'atr_multiple' | 'structure';
  value: number;
}

interface TargetConfig {
  type: 'rr_ratio' | 'fixed_ticks' | 'opposite_range';
  value: number;
}

interface TimeFilter {
  start: number; // minutes from midnight
  end: number;
}

/**
 * Parse stop loss from exit conditions
 */
function parseStopLoss(exitConditions: ExitCondition[], instrument: string): StopConfig {
  const tickSize = INSTRUMENT_SPECS[instrument]?.tickSize || 0.25;
  
  for (const condition of exitConditions) {
    const type = condition.type?.toLowerCase() || '';
    const value = String(condition.value || '').toLowerCase();
    
    if (!type.includes('stop') && !value.includes('stop')) continue;
    
    // Parse "20 ticks" or "20 tick stop"
    const tickMatch = value.match(/(\d+)\s*tick/i);
    if (tickMatch) {
      return { type: 'fixed_ticks', value: parseInt(tickMatch[1]) };
    }
    
    // Parse "50% of range" or "middle of range"
    const percentMatch = value.match(/(\d+)\s*%/);
    if (percentMatch) {
      return { type: 'range_percent', value: parseInt(percentMatch[1]) / 100 };
    }
    if (value.includes('middle') || value.includes('50%')) {
      return { type: 'range_percent', value: 0.5 };
    }
    
    // Parse "2 ATR" or "1.5 ATR"
    const atrMatch = value.match(/(\d+(?:\.\d+)?)\s*atr/i);
    if (atrMatch) {
      return { type: 'atr_multiple', value: parseFloat(atrMatch[1]) };
    }
    
    // Parse "below range low" or "opposite side"
    if (value.includes('below') && value.includes('range') || 
        value.includes('opposite') || 
        value.includes('range low')) {
      return { type: 'opposite_range', value: 0 };
    }
    
    // Parse "below structure" or "swing low"
    if (value.includes('structure') || value.includes('swing')) {
      return { type: 'structure', value: 0 };
    }
    
    // Parse direct number (assume ticks)
    if (typeof condition.value === 'number') {
      return { type: 'fixed_ticks', value: condition.value };
    }
  }
  
  // Default to 20 ticks
  return { type: 'fixed_ticks', value: 20 };
}

/**
 * Parse target from exit conditions
 */
function parseTarget(exitConditions: ExitCondition[], instrument: string): TargetConfig {
  for (const condition of exitConditions) {
    const type = condition.type?.toLowerCase() || '';
    const value = String(condition.value || '').toLowerCase();
    
    if (!type.includes('target') && !type.includes('profit') && 
        !value.includes('target') && !value.includes('profit') &&
        !value.includes('r:r') && !value.includes('r/r')) continue;
    
    // Parse "1:2 R:R" or "2:1 reward"
    const rrMatch = value.match(/1\s*:\s*(\d+(?:\.\d+)?)/i) || 
                    value.match(/(\d+(?:\.\d+)?)\s*r/i);
    if (rrMatch) {
      return { type: 'rr_ratio', value: parseFloat(rrMatch[1]) };
    }
    
    // Parse "40 ticks"
    const tickMatch = value.match(/(\d+)\s*tick/i);
    if (tickMatch) {
      return { type: 'fixed_ticks', value: parseInt(tickMatch[1]) };
    }
    
    // Parse "2R" or "2 R"
    const rMatch = value.match(/(\d+(?:\.\d+)?)\s*r\b/i);
    if (rMatch) {
      return { type: 'rr_ratio', value: parseFloat(rMatch[1]) };
    }
  }
  
  // Default to 2:1 R:R
  return { type: 'rr_ratio', value: 2 };
}

/**
 * Parse time filters from strategy filters
 */
function parseTimeFilters(filters: StrategyFilter[]): TimeFilter[] {
  const timeFilters: TimeFilter[] = [];
  
  for (const filter of filters) {
    if (filter.type !== 'time_window') continue;
    
    const start = parseTimeToMinutes(filter.start || '09:30');
    const end = parseTimeToMinutes(filter.end || '16:00');
    
    timeFilters.push({ start, end });
  }
  
  return timeFilters;
}

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  // Handle formats: "09:30", "9:30 AM", "0930"
  const cleanTime = timeStr.replace(/\s*(AM|PM)/i, '').trim();
  
  let hours = 0;
  let minutes = 0;
  
  if (cleanTime.includes(':')) {
    const parts = cleanTime.split(':');
    hours = parseInt(parts[0]);
    minutes = parseInt(parts[1]);
  } else if (cleanTime.length === 4) {
    hours = parseInt(cleanTime.substring(0, 2));
    minutes = parseInt(cleanTime.substring(2));
  } else {
    hours = parseInt(cleanTime);
  }
  
  // Handle PM
  if (timeStr.toLowerCase().includes('pm') && hours < 12) {
    hours += 12;
  }
  
  return hours * 60 + minutes;
}

/**
 * Parse EMA period from entry conditions
 */
function parseEMAPeriod(entryConditions: EntryCondition[]): number {
  for (const condition of entryConditions) {
    if (condition.indicator?.toLowerCase() === 'ema' && condition.period) {
      return condition.period;
    }
    
    // Parse from value text
    const value = String(condition.value || '').toLowerCase();
    const emaMatch = value.match(/(\d+)\s*ema/i) || value.match(/ema\s*(\d+)/i);
    if (emaMatch) {
      return parseInt(emaMatch[1]);
    }
  }
  
  // Default to 20 EMA
  return 20;
}

/**
 * Parse position sizing percentage
 */
function parsePositionSizing(positionSizing?: { method?: string; value?: number }): number {
  if (!positionSizing) {
    return 0.01; // Default 1%
  }
  
  if (positionSizing.value) {
    // If value > 1, assume it's a percentage (e.g., 2 = 2%)
    // If value <= 1, use as-is (e.g., 0.01 = 1%)
    return positionSizing.value > 1 ? positionSizing.value / 100 : positionSizing.value;
  }
  
  return 0.01; // Default 1%
}

/**
 * Detect pattern type from rules
 */
function detectPatternFromRules(rules: ParsedRules): string {
  // Check entry conditions for pattern indicators
  for (const condition of rules.entry_conditions || []) {
    const value = String(condition.value || '').toLowerCase();
    const type = condition.type?.toLowerCase() || '';
    
    if (value.includes('opening range') || value.includes('orb') || 
        type.includes('opening_range') || type === 'or_breakout_high' || type === 'or_breakout_low') {
      return 'opening_range_breakout';
    }
    
    if (value.includes('pullback') || value.includes('ema') && value.includes('pull')) {
      return 'ema_pullback';
    }
    
    if (value.includes('breakout') || type.includes('breakout')) {
      return 'breakout';
    }
  }
  
  // Default to breakout
  return 'breakout';
}

/**
 * Detect direction from rules
 */
function detectDirectionFromRules(rules: ParsedRules): 'long' | 'short' | 'both' {
  for (const condition of rules.entry_conditions || []) {
    if (condition.direction) {
      return condition.direction;
    }
    
    const value = String(condition.value || '').toLowerCase();
    if (value.includes('long only') || value.includes('buy only')) {
      return 'long';
    }
    if (value.includes('short only') || value.includes('sell only')) {
      return 'short';
    }
  }
  
  return 'both';
}

// ============================================================================
// MAIN COMPILER
// ============================================================================

/**
 * Compile a strategy from parsed rules into executable functions
 * 
 * @param rules - ParsedRules from strategy builder
 * @param instrument - Trading instrument (ES, NQ, etc.)
 * @param pattern - Override pattern detection (optional)
 * @returns CompiledStrategy with executable functions
 */
export function compileStrategy(
  rules: ParsedRules,
  instrument: string,
  pattern?: string
): CompiledStrategy {
  // Detect or use provided pattern
  const detectedPattern = pattern || detectPatternFromRules(rules);
  const direction = detectDirectionFromRules(rules);
  
  // Compile based on pattern
  switch (detectedPattern) {
    case 'opening_range_breakout':
    case 'orb':
      return compileORBPattern(rules, instrument, direction);
      
    case 'ema_pullback':
    case 'pullback':
      return compileEMAPullbackPattern(rules, instrument, direction);
      
    case 'breakout':
    default:
      return compileBreakoutPattern(rules, instrument, direction);
  }
}

/**
 * Validate that rules can be compiled
 */
export function validateRulesForCompilation(rules: ParsedRules): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for entry conditions
  if (!rules.entry_conditions || rules.entry_conditions.length === 0) {
    warnings.push('No entry conditions defined - will use pattern defaults');
  }
  
  // Check for exit conditions
  if (!rules.exit_conditions || rules.exit_conditions.length === 0) {
    warnings.push('No exit conditions defined - will use default stop/target');
  } else {
    const hasStop = rules.exit_conditions.some(c => 
      c.type?.toLowerCase().includes('stop') || 
      String(c.value || '').toLowerCase().includes('stop')
    );
    if (!hasStop) {
      warnings.push('No stop loss defined - will use 20 tick default');
    }
  }
  
  // Check for position sizing
  if (!rules.position_sizing) {
    warnings.push('No position sizing defined - will use 1% risk');
  }
  
  return {
    valid: true, // We can always compile with defaults
    errors,
    warnings,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  compileORBPattern,
  compileEMAPullbackPattern,
  compileBreakoutPattern,
  parseStopLoss,
  parseTarget,
  parseTimeFilters,
  parsePositionSizing,
  detectPatternFromRules,
  detectDirectionFromRules,
};
