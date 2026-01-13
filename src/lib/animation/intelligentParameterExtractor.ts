/**
 * INTELLIGENT ANIMATION PARAMETER EXTRACTOR
 * 
 * Extracts EXACT numerical parameters from strategy rules to generate
 * accurate, user-specific animations (not templates).
 * 
 * Problem: Current system uses templates ("ORB" → fixed animation)
 * Solution: Extract actual values and calculate positions dynamically
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyParameters {
  // Strategy Type
  strategyType: 'orb' | 'pullback' | 'breakout' | 'reversal' | 'continuation' | 'ema_cross' | 'vwap_bounce' | 'order_block' | 'fair_value_gap';
  
  // Entry Parameters
  entry: {
    trigger: 'breakout_above' | 'breakout_below' | 'pullback_to' | 'bounce_off' | 'cross_above' | 'cross_below';
    level?: 'range_high' | 'range_low' | 'ema' | 'vwap' | 'structure' | 'order_block';
    confirmationRequired?: boolean;
  };
  
  // Stop Loss Parameters (CRITICAL - must be exact)
  stopLoss: {
    placement: 'structure' | 'percentage' | 'atr_multiple' | 'fixed_distance' | 'opposite_side';
    value: number; // The actual number (0.5 for 50%, 2 for 2x ATR, etc.)
    relativeTo: 'entry' | 'range_low' | 'range_high' | 'swing_point';
    unit?: 'percentage' | 'ticks' | 'points' | 'atr' | 'dollars';
  };
  
  // Profit Target Parameters (CRITICAL - must be exact)
  profitTarget: {
    method: 'r_multiple' | 'percentage' | 'fixed_distance' | 'structure' | 'extension';
    value: number; // e.g., 2 for 2R, 1.0 for 100%, etc.
    relativeTo: 'entry' | 'stop_distance' | 'range_size';
    unit?: 'r' | 'percentage' | 'ticks' | 'points' | 'dollars';
  };
  
  // Range Parameters (for ORB)
  range?: {
    period: number; // minutes
    size?: number; // if known
  };
  
  // Direction
  direction: 'long' | 'short';
}

export interface VisualCoordinates {
  // Normalized Y coordinates (0-100, where 0=top, 100=bottom)
  entry: number;
  stop: number;
  target: number;
  rangeLow?: number;
  rangeHigh?: number;
  
  // Price labels (for display)
  entryLabel: string;
  stopLabel: string;
  targetLabel: string;
  
  // Metadata
  riskDistance: number;
  rewardDistance: number;
  riskRewardRatio: string;
}

// ============================================================================
// PARAMETER EXTRACTION
// ============================================================================

/**
 * Extract precise parameters from strategy rules
 */
export function extractStrategyParameters(rules: StrategyRule[]): StrategyParameters | null {
  if (rules.length === 0) return null;
  
  // Detect strategy type
  const strategyType = detectStrategyType(rules);
  
  // Extract entry parameters
  const entry = extractEntryParameters(rules);
  
  // Extract stop loss (CRITICAL - most precise extraction)
  const stopLoss = extractStopLossParameters(rules);
  if (!stopLoss) {
    console.log('[AnimationExtractor] Missing stop loss parameters');
    return null;
  }
  
  // Extract profit target
  const profitTarget = extractProfitTargetParameters(rules);
  if (!profitTarget) {
    console.log('[AnimationExtractor] Missing profit target parameters');
    return null;
  }
  
  // Extract direction
  const direction = extractDirection(rules);
  
  // Extract range info if ORB
  const range = strategyType === 'orb' ? extractRangeParameters(rules) : undefined;
  
  const params: StrategyParameters = {
    strategyType,
    entry,
    stopLoss,
    profitTarget,
    direction,
    range,
  };
  
  console.log('[AnimationExtractor] Extracted parameters:', {
    type: params.strategyType,
    direction: params.direction,
    stopPlacement: params.stopLoss.placement,
    stopValue: params.stopLoss.value,
    targetMethod: params.profitTarget.method,
    targetValue: params.profitTarget.value,
  });
  
  return params;
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

function detectStrategyType(rules: StrategyRule[]): StrategyParameters['strategyType'] {
  const text = rules.map(r => r.value.toLowerCase()).join(' ');
  
  if (text.includes('opening range') || text.includes('orb')) return 'orb';
  if (text.includes('pullback') || text.includes('retest')) return 'pullback';
  if (text.includes('ema cross') || text.includes('moving average cross')) return 'ema_cross';
  if (text.includes('vwap bounce') || text.includes('vwap reversion')) return 'vwap_bounce';
  if (text.includes('order block') || text.includes('ob entry')) return 'order_block';
  if (text.includes('fvg') || text.includes('fair value gap') || text.includes('imbalance')) return 'fair_value_gap';
  if (text.includes('reversal')) return 'reversal';
  if (text.includes('continuation')) return 'continuation';
  if (text.includes('breakout')) return 'breakout';
  
  return 'breakout'; // default
}

function extractEntryParameters(rules: StrategyRule[]): StrategyParameters['entry'] {
  const entryRules = rules.filter(r => 
    r.category === 'entry' || 
    r.label.toLowerCase().includes('entry') ||
    r.label.toLowerCase().includes('trigger')
  );
  
  const text = entryRules.map(r => r.value.toLowerCase()).join(' ');
  
  let trigger: StrategyParameters['entry']['trigger'] = 'breakout_above';
  if (text.includes('break above') || text.includes('breakout above')) trigger = 'breakout_above';
  else if (text.includes('break below') || text.includes('breakout below')) trigger = 'breakout_below';
  else if (text.includes('pullback')) trigger = 'pullback_to';
  else if (text.includes('bounce')) trigger = 'bounce_off';
  else if (text.includes('cross above')) trigger = 'cross_above';
  else if (text.includes('cross below')) trigger = 'cross_below';
  
  let level: StrategyParameters['entry']['level'] = undefined;
  if (text.includes('high') || text.includes('top')) level = 'range_high';
  else if (text.includes('low') || text.includes('bottom')) level = 'range_low';
  else if (text.includes('ema') || text.includes('moving average')) level = 'ema';
  else if (text.includes('vwap')) level = 'vwap';
  else if (text.includes('order block') || text.includes('ob')) level = 'order_block';
  
  return {
    trigger,
    level,
    confirmationRequired: text.includes('confirm') || text.includes('close above') || text.includes('close below'),
  };
}

/**
 * CRITICAL: Extract exact stop loss placement
 * This is where precision matters most - the core problem we're solving
 */
function extractStopLossParameters(rules: StrategyRule[]): StrategyParameters['stopLoss'] | null {
  const stopRule = rules.find(r => 
    (r.label.toLowerCase().includes('stop') && !r.label.toLowerCase().includes('time')) ||
    r.category === 'risk'
  );
  
  if (!stopRule) return null;
  
  const text = stopRule.value.toLowerCase();
  
  // Pattern 1: "50% of range" or "middle of range" or "half"
  if (text.includes('middle') || text.includes('50%') || text.includes('half') || text.includes('midpoint')) {
    return {
      placement: 'percentage',
      value: 0.5,
      relativeTo: 'range_low',
      unit: 'percentage',
    };
  }
  
  // Pattern 2: "bottom of range" or "range low" or "opposite side"
  if (text.includes('bottom') || text.includes('range low') || text.includes('opposite')) {
    return {
      placement: 'opposite_side',
      value: 0,
      relativeTo: 'range_low',
    };
  }
  
  // Pattern 3: "top of range" or "range high" (for shorts)
  if (text.includes('top') || text.includes('range high')) {
    return {
      placement: 'opposite_side',
      value: 0,
      relativeTo: 'range_high',
    };
  }
  
  // Pattern 4: "X% of range" (extract number) - generic percentage
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s*)?(?:the\s*)?(?:range)?/);
  if (percentMatch) {
    return {
      placement: 'percentage',
      value: parseFloat(percentMatch[1]) / 100,
      relativeTo: 'range_low',
      unit: 'percentage',
    };
  }
  
  // Pattern 4b: Decimal notation "0.75 of range" (without % symbol)
  const decimalMatch = text.match(/(0\.\d+)\s*(?:of\s*)?(?:the\s*)?range/);
  if (decimalMatch) {
    return {
      placement: 'percentage',
      value: parseFloat(decimalMatch[1]),
      relativeTo: 'range_low',
      unit: 'percentage',
    };
  }
  
  // Pattern 5: "X ticks below" or "X ticks above"
  const tickMatch = text.match(/(\d+)\s*ticks?\s*(?:below|above)/);
  if (tickMatch) {
    return {
      placement: 'fixed_distance',
      value: parseInt(tickMatch[1]),
      relativeTo: 'entry',
      unit: 'ticks',
    };
  }
  
  // Pattern 6: "X points below" or "X points"
  const pointMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:point|pts?)s?\s*(?:below|above)?/);
  if (pointMatch) {
    return {
      placement: 'fixed_distance',
      value: parseFloat(pointMatch[1]),
      relativeTo: 'entry',
      unit: 'points',
    };
  }
  
  // Pattern 7: "2x ATR" or "1.5 ATR"
  const atrMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x\s*)?atr/);
  if (atrMatch) {
    return {
      placement: 'atr_multiple',
      value: parseFloat(atrMatch[1]),
      relativeTo: 'entry',
      unit: 'atr',
    };
  }
  
  // Pattern 8: "swing low" or "structure" or "support/resistance"
  if (text.includes('swing') || text.includes('structure') || text.includes('support') || text.includes('resistance')) {
    // Try to extract offset like "2 ticks below swing low"
    const offsetMatch = text.match(/(\d+)\s*ticks?\s*(?:below|beyond)/);
    return {
      placement: 'structure',
      value: offsetMatch ? parseInt(offsetMatch[1]) : 2, // Default 2 ticks beyond
      relativeTo: 'swing_point',
      unit: 'ticks',
    };
  }
  
  // Pattern 9: Dollar-based stops
  const dollarMatch = text.match(/\$(\d+(?:\.\d+)?)/);
  if (dollarMatch) {
    return {
      placement: 'fixed_distance',
      value: parseFloat(dollarMatch[1]),
      relativeTo: 'entry',
      unit: 'dollars',
    };
  }
  
  // Default: Structure-based (conservative fallback)
  console.log('[AnimationExtractor] Using default stop placement for:', text);
  return {
    placement: 'structure',
    value: 0,
    relativeTo: 'entry',
  };
}

/**
 * CRITICAL: Extract exact profit target
 */
function extractProfitTargetParameters(rules: StrategyRule[]): StrategyParameters['profitTarget'] | null {
  const targetRule = rules.find(r => 
    r.label.toLowerCase().includes('target') ||
    r.label.toLowerCase().includes('profit') ||
    r.label.toLowerCase().includes('r:r') ||
    r.label.toLowerCase().includes('risk:reward') ||
    r.label.toLowerCase().includes('take profit') ||
    r.category === 'exit'
  );
  
  if (!targetRule) return null;
  
  const text = targetRule.value.toLowerCase();
  
  // Pattern 1: "1:2" or "1:2 R:R" or "1:3 risk:reward"
  const colonMatch = text.match(/1\s*:\s*(\d+(?:\.\d+)?)/);
  if (colonMatch) {
    return {
      method: 'r_multiple',
      value: parseFloat(colonMatch[1]),
      relativeTo: 'stop_distance',
      unit: 'r',
    };
  }
  
  // Pattern 2: "2R" or "2.5R" or "3 R"
  const rMatch = text.match(/(\d+(?:\.\d+)?)\s*r\b/i);
  if (rMatch) {
    return {
      method: 'r_multiple',
      value: parseFloat(rMatch[1]),
      relativeTo: 'stop_distance',
      unit: 'r',
    };
  }
  
  // Pattern 3: "2x range" or "twice the range" or "double the range"
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x|times?)\s*(?:the\s*)?range/);
  if (rangeMatch) {
    return {
      method: 'extension',
      value: parseFloat(rangeMatch[1]),
      relativeTo: 'range_size',
    };
  }
  if (text.includes('twice') || text.includes('double')) {
    return {
      method: 'extension',
      value: 2,
      relativeTo: 'range_size',
    };
  }
  
  // Pattern 4: "100% extension" or "150% extension"
  const extensionMatch = text.match(/(\d+)\s*%\s*extension/);
  if (extensionMatch) {
    return {
      method: 'extension',
      value: parseInt(extensionMatch[1]) / 100,
      relativeTo: 'range_size',
      unit: 'percentage',
    };
  }
  
  // Pattern 5: "X ticks" or "X points"
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(ticks?|points?|pts?)/);
  if (distanceMatch) {
    return {
      method: 'fixed_distance',
      value: parseFloat(distanceMatch[1]),
      relativeTo: 'entry',
      unit: distanceMatch[2].includes('tick') ? 'ticks' : 'points',
    };
  }
  
  // Pattern 6: Dollar amount
  const dollarMatch = text.match(/\$(\d+(?:\.\d+)?)/);
  if (dollarMatch) {
    return {
      method: 'fixed_distance',
      value: parseFloat(dollarMatch[1]),
      relativeTo: 'entry',
      unit: 'dollars',
    };
  }
  
  // Default: 2R (most common target ratio)
  console.log('[AnimationExtractor] Using default 2R target for:', text);
  return {
    method: 'r_multiple',
    value: 2,
    relativeTo: 'stop_distance',
    unit: 'r',
  };
}

function extractDirection(rules: StrategyRule[]): 'long' | 'short' {
  const text = rules.map(r => r.value.toLowerCase()).join(' ');
  
  // Short indicators
  if (text.includes('short') || text.includes('sell') || text.includes('break below') || text.includes('bearish')) {
    return 'short';
  }
  
  // Long is default
  return 'long';
}

function extractRangeParameters(rules: StrategyRule[]): StrategyParameters['range'] | undefined {
  const rangeRule = rules.find(r => 
    r.label.toLowerCase().includes('range') ||
    r.label.toLowerCase().includes('period') ||
    r.label.toLowerCase().includes('timeframe') ||
    r.value.toLowerCase().includes('opening range') ||
    r.value.toLowerCase().includes('orb')
  );
  
  if (!rangeRule) {
    // Default for ORB
    return { period: 15 };
  }
  
  const text = rangeRule.value.toLowerCase();
  
  // Match "15 min", "30 minute", "15m", etc.
  const minuteMatch = text.match(/(\d+)\s*(?:min|minute|m\b)/);
  
  return {
    period: minuteMatch ? parseInt(minuteMatch[1]) : 15, // default 15 min
  };
}

// ============================================================================
// VISUAL CALCULATION ENGINE
// ============================================================================

/**
 * Calculate exact visual coordinates from parameters
 * Returns Y coordinates normalized to 0-100 (0=top, 100=bottom)
 * 
 * This is "visual algebra" - mathematical positioning based on exact parameters
 */
export function calculateVisualCoordinates(params: StrategyParameters): VisualCoordinates {
  const chartMin = 0;
  const chartMax = 100;
  
  // For ORB: Define range (centered on chart)
  // Range takes up ~20% of chart height, centered
  const rangeLow = 55;  // 55% from top (lower in chart = higher Y value)
  const rangeHigh = 35; // 35% from top
  const rangeSize = rangeLow - rangeHigh; // = 20
  
  let entry: number;
  let stop: number;
  let target: number;
  
  // Calculate entry position based on direction
  if (params.direction === 'long') {
    // Long entry is at range high (break above)
    entry = params.entry.trigger === 'breakout_above' ? rangeHigh : (rangeHigh + rangeLow) / 2;
  } else {
    // Short entry is at range low (break below)
    entry = params.entry.trigger === 'breakout_below' ? rangeLow : (rangeHigh + rangeLow) / 2;
  }
  
  // ========================================================================
  // Calculate stop position (CRITICAL - this is where precision matters)
  // ========================================================================
  if (params.stopLoss.placement === 'percentage') {
    // e.g., "50% of range" → stop at rangeHigh + (rangeSize * 0.5) for longs
    // Stop is INSIDE the range at the specified percentage
    if (params.direction === 'long') {
      // For longs, 0% = rangeHigh (best), 100% = rangeLow (worst)
      // "50% of range" = halfway between entry and bottom
      stop = rangeHigh + (rangeSize * params.stopLoss.value);
    } else {
      // For shorts, inverted
      stop = rangeLow - (rangeSize * params.stopLoss.value);
    }
  } else if (params.stopLoss.placement === 'opposite_side') {
    // e.g., "bottom of range" → stop at rangeLow
    if (params.stopLoss.relativeTo === 'range_low') {
      stop = rangeLow + 2; // Slightly below range low
    } else {
      stop = rangeHigh - 2; // Slightly above range high
    }
  } else if (params.stopLoss.placement === 'fixed_distance') {
    // e.g., "10 ticks below entry"
    // Convert ticks to visual units (approximate)
    const visualDistance = params.stopLoss.value * 0.5; // Scale factor
    stop = params.direction === 'long' ? entry + visualDistance : entry - visualDistance;
  } else if (params.stopLoss.placement === 'atr_multiple') {
    // e.g., "2x ATR" - ATR approximated as ~25% of range
    const atr = rangeSize * 0.5;
    const distance = params.stopLoss.value * atr;
    stop = params.direction === 'long' ? entry + distance : entry - distance;
  } else {
    // Structure-based: default to just beyond range
    stop = params.direction === 'long' ? rangeLow + 3 : rangeHigh - 3;
  }
  
  // ========================================================================
  // Calculate target position
  // ========================================================================
  const riskDistance = Math.abs(stop - entry);
  
  if (params.profitTarget.method === 'r_multiple') {
    // e.g., "2R" → target = entry ± (riskDistance * 2)
    const rewardDistance = riskDistance * params.profitTarget.value;
    target = params.direction === 'long' ? entry - rewardDistance : entry + rewardDistance;
  } else if (params.profitTarget.method === 'extension') {
    // e.g., "2x range" → target = entry ± (rangeSize * 2)
    const rewardDistance = rangeSize * params.profitTarget.value;
    target = params.direction === 'long' ? entry - rewardDistance : entry + rewardDistance;
  } else if (params.profitTarget.method === 'fixed_distance') {
    const visualDistance = params.profitTarget.value * 0.5;
    target = params.direction === 'long' ? entry - visualDistance : entry + visualDistance;
  } else {
    // Default: 2R
    const rewardDistance = riskDistance * 2;
    target = params.direction === 'long' ? entry - rewardDistance : entry + rewardDistance;
  }
  
  // Clamp values to chart bounds
  entry = Math.max(chartMin + 5, Math.min(chartMax - 5, entry));
  stop = Math.max(chartMin + 2, Math.min(chartMax - 2, stop));
  target = Math.max(chartMin + 2, Math.min(chartMax - 2, target));
  
  // Calculate actual R:R for display
  const actualRiskDistance = Math.abs(stop - entry);
  const actualRewardDistance = Math.abs(target - entry);
  const rrRatio = actualRiskDistance > 0 ? (actualRewardDistance / actualRiskDistance).toFixed(1) : '0';
  
  return {
    entry,
    stop,
    target,
    rangeLow,
    rangeHigh,
    entryLabel: `Entry`,
    stopLabel: formatStopLabel(params.stopLoss),
    targetLabel: `Target (${rrRatio}R)`,
    riskDistance: actualRiskDistance,
    rewardDistance: actualRewardDistance,
    riskRewardRatio: `1:${rrRatio}`,
  };
}

function formatStopLabel(stop: StrategyParameters['stopLoss']): string {
  if (stop.placement === 'percentage') {
    return `Stop (${Math.round(stop.value * 100)}% of range)`;
  }
  if (stop.placement === 'opposite_side') {
    return `Stop (range ${stop.relativeTo === 'range_low' ? 'low' : 'high'})`;
  }
  if (stop.placement === 'fixed_distance') {
    return `Stop (${stop.value} ${stop.unit || 'ticks'})`;
  }
  if (stop.placement === 'atr_multiple') {
    return `Stop (${stop.value}x ATR)`;
  }
  return 'Stop';
}

// ============================================================================
// DEBUGGING / TESTING
// ============================================================================

/**
 * Debug output for parameter extraction
 * Logs extraction results to console
 */
export function debugParameters(rules: StrategyRule[]): void {
  console.group('🔍 Strategy Parameter Extraction Debug');
  
  const params = extractStrategyParameters(rules);
  if (!params) {
    console.log('❌ Could not extract parameters (missing stop or target)');
    console.log('Rules provided:', rules);
    console.groupEnd();
    return;
  }
  
  console.log('✅ Strategy Type:', params.strategyType);
  console.log('✅ Direction:', params.direction);
  console.log('\n📍 Entry:', params.entry);
  console.log('\n🛑 Stop Loss:');
  console.log('  Placement:', params.stopLoss.placement);
  console.log('  Value:', params.stopLoss.value);
  console.log('  Relative to:', params.stopLoss.relativeTo);
  console.log('  Unit:', params.stopLoss.unit);
  
  console.log('\n🎯 Profit Target:');
  console.log('  Method:', params.profitTarget.method);
  console.log('  Value:', params.profitTarget.value);
  console.log('  Relative to:', params.profitTarget.relativeTo);
  console.log('  Unit:', params.profitTarget.unit);
  
  if (params.range) {
    console.log('\n📏 Range:', params.range);
  }
  
  const coords = calculateVisualCoordinates(params);
  console.log('\n📊 Visual Coordinates:');
  console.log('  Entry Y:', coords.entry.toFixed(1));
  console.log('  Stop Y:', coords.stop.toFixed(1));
  console.log('  Target Y:', coords.target.toFixed(1));
  console.log('  R:R Ratio:', coords.riskRewardRatio);
  
  console.groupEnd();
}
