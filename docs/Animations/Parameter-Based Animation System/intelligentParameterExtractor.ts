/**
 * INTELLIGENT ANIMATION PARAMETER EXTRACTOR
 * 
 * Extracts EXACT numerical parameters from strategy rules to generate
 * accurate, user-specific animations (not templates).
 * 
 * Problem: Current system uses templates ("ORB" → fixed animation)
 * Solution: Extract actual values and calculate positions dynamically
 */

import { StrategyRule } from '@/components/strategy/StrategySummaryPanel';

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyParameters {
  // Strategy Type
  strategyType: 'orb' | 'pullback' | 'breakout' | 'reversal' | 'continuation';
  
  // Entry Parameters
  entry: {
    trigger: 'breakout_above' | 'breakout_below' | 'pullback_to' | 'bounce_off' | 'cross_above' | 'cross_below';
    level?: 'range_high' | 'range_low' | 'ema' | 'vwap' | 'structure';
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
  
  const params: Partial<StrategyParameters> = {};
  
  // Detect strategy type
  params.strategyType = detectStrategyType(rules);
  
  // Extract entry parameters
  params.entry = extractEntryParameters(rules);
  
  // Extract stop loss (CRITICAL - most precise extraction)
  params.stopLoss = extractStopLossParameters(rules);
  if (!params.stopLoss) return null; // Can't animate without stop
  
  // Extract profit target
  params.profitTarget = extractProfitTargetParameters(rules);
  if (!params.profitTarget) return null; // Can't animate without target
  
  // Extract direction
  params.direction = extractDirection(rules);
  
  // Extract range info if ORB
  if (params.strategyType === 'orb') {
    params.range = extractRangeParameters(rules);
  }
  
  return params as StrategyParameters;
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

function detectStrategyType(rules: StrategyRule[]): StrategyParameters['strategyType'] {
  const text = rules.map(r => r.value.toLowerCase()).join(' ');
  
  if (text.includes('opening range') || text.includes('orb')) return 'orb';
  if (text.includes('pullback') || text.includes('retest')) return 'pullback';
  if (text.includes('breakout')) return 'breakout';
  if (text.includes('reversal')) return 'reversal';
  if (text.includes('continuation')) return 'continuation';
  
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
  
  let level: StrategyParameters['entry']['level'] = undefined;
  if (text.includes('high') || text.includes('top')) level = 'range_high';
  else if (text.includes('low') || text.includes('bottom')) level = 'range_low';
  else if (text.includes('ema')) level = 'ema';
  else if (text.includes('vwap')) level = 'vwap';
  
  return {
    trigger,
    level,
    confirmationRequired: text.includes('confirm') || text.includes('close above'),
  };
}

/**
 * CRITICAL: Extract exact stop loss placement
 * This is where precision matters most
 */
function extractStopLossParameters(rules: StrategyRule[]): StrategyParameters['stopLoss'] | null {
  const stopRule = rules.find(r => 
    r.label.toLowerCase().includes('stop') && 
    !r.label.toLowerCase().includes('time')
  );
  
  if (!stopRule) return null;
  
  const text = stopRule.value.toLowerCase();
  
  // Pattern 1: "50% of range" or "middle of range"
  if (text.includes('middle') || text.includes('50%') || text.includes('half')) {
    return {
      placement: 'percentage',
      value: 0.5,
      relativeTo: 'range_low',
      unit: 'percentage',
    };
  }
  
  // Pattern 2: "bottom of range" or "opposite side"
  if (text.includes('bottom') || text.includes('range low') || text.includes('opposite')) {
    return {
      placement: 'opposite_side',
      value: 0,
      relativeTo: 'range_low',
    };
  }
  
  // Pattern 3: "top of range" (for shorts)
  if (text.includes('top') || text.includes('range high')) {
    return {
      placement: 'opposite_side',
      value: 0,
      relativeTo: 'range_high',
    };
  }
  
  // Pattern 4: "X% of range" (extract number)
  const percentMatch = text.match(/(\d+)%\s*(?:of\s*)?(?:the\s*)?range/);
  if (percentMatch) {
    return {
      placement: 'percentage',
      value: parseInt(percentMatch[1]) / 100,
      relativeTo: 'range_low',
      unit: 'percentage',
    };
  }
  
  // Pattern 5: "2 ticks below entry"
  const tickMatch = text.match(/(\d+)\s*ticks?\s*(?:below|above)/);
  if (tickMatch) {
    return {
      placement: 'fixed_distance',
      value: parseInt(tickMatch[1]),
      relativeTo: 'entry',
      unit: 'ticks',
    };
  }
  
  // Pattern 6: "2x ATR"
  const atrMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x\s*)?atr/);
  if (atrMatch) {
    return {
      placement: 'atr_multiple',
      value: parseFloat(atrMatch[1]),
      relativeTo: 'entry',
      unit: 'atr',
    };
  }
  
  // Pattern 7: "swing low" or "structure"
  if (text.includes('swing') || text.includes('structure') || text.includes('support') || text.includes('resistance')) {
    return {
      placement: 'structure',
      value: 2, // Default 2 ticks beyond
      relativeTo: 'swing_point',
      unit: 'ticks',
    };
  }
  
  // Default: Below entry (conservative)
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
    r.label.toLowerCase().includes('risk:reward')
  );
  
  if (!targetRule) return null;
  
  const text = targetRule.value.toLowerCase();
  
  // Pattern 1: "1:2 R:R" or "2R"
  const rrMatch = text.match(/(?:^|\s)(?:1\s*:\s*)?(\d+(?:\.\d+)?)\s*(?:r|rr|r:r)?/);
  if (rrMatch || text.includes('r:r') || text.includes('risk:reward')) {
    const multiplier = rrMatch ? parseFloat(rrMatch[1]) : 2; // Default 2R
    return {
      method: 'r_multiple',
      value: multiplier,
      relativeTo: 'stop_distance',
      unit: 'r',
    };
  }
  
  // Pattern 2: "2x range" or "twice the range"
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x|times?)\s*(?:the\s*)?range/);
  if (rangeMatch || text.includes('twice') || text.includes('double')) {
    const multiplier = rangeMatch ? parseFloat(rangeMatch[1]) : (text.includes('twice') || text.includes('double') ? 2 : 1);
    return {
      method: 'extension',
      value: multiplier,
      relativeTo: 'range_size',
    };
  }
  
  // Pattern 3: "100% extension"
  const extensionMatch = text.match(/(\d+)%\s*extension/);
  if (extensionMatch) {
    return {
      method: 'extension',
      value: parseInt(extensionMatch[1]) / 100,
      relativeTo: 'range_size',
      unit: 'percentage',
    };
  }
  
  // Pattern 4: "X ticks" or "X points"
  const distanceMatch = text.match(/(\d+)\s*(ticks?|points?)/);
  if (distanceMatch) {
    return {
      method: 'fixed_distance',
      value: parseInt(distanceMatch[1]),
      relativeTo: 'entry',
      unit: distanceMatch[2].includes('tick') ? 'ticks' : 'points',
    };
  }
  
  // Default: 2R
  return {
    method: 'r_multiple',
    value: 2,
    relativeTo: 'stop_distance',
    unit: 'r',
  };
}

function extractDirection(rules: StrategyRule[]): 'long' | 'short' {
  const text = rules.map(r => r.value.toLowerCase()).join(' ');
  
  if (text.includes('short') || text.includes('sell') || text.includes('below')) {
    return 'short';
  }
  
  return 'long'; // default
}

function extractRangeParameters(rules: StrategyRule[]): StrategyParameters['range'] | undefined {
  const rangeRule = rules.find(r => 
    r.label.toLowerCase().includes('range') ||
    r.label.toLowerCase().includes('period')
  );
  
  if (!rangeRule) return undefined;
  
  const text = rangeRule.value.toLowerCase();
  const minuteMatch = text.match(/(\d+)\s*(?:min|minute)/);
  
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
 */
export function calculateVisualCoordinates(params: StrategyParameters): VisualCoordinates {
  // Assume a standard range for visualization (can be adjusted)
  const priceRange = 100; // Arbitrary units for visualization
  const chartMin = 0;
  const chartMax = 100;
  
  // For ORB: Define range
  let rangeLow = 40; // 40% from top
  let rangeHigh = 60; // 60% from top
  const rangeSize = rangeHigh - rangeLow;
  
  let entry: number;
  let stop: number;
  let target: number;
  
  // Calculate entry position
  if (params.entry.trigger === 'breakout_above') {
    entry = rangeHigh; // Enter at range high
  } else if (params.entry.trigger === 'breakout_below') {
    entry = rangeLow; // Enter at range low
  } else {
    entry = (rangeLow + rangeHigh) / 2; // Default middle
  }
  
  // Calculate stop position (CRITICAL - this is where precision matters)
  if (params.stopLoss.placement === 'percentage') {
    // e.g., "50% of range" → stop at rangeLow + (rangeSize * 0.5)
    stop = rangeLow + (rangeSize * params.stopLoss.value);
  } else if (params.stopLoss.placement === 'opposite_side') {
    // e.g., "bottom of range" → stop at rangeLow
    if (params.stopLoss.relativeTo === 'range_low') {
      stop = rangeLow;
    } else {
      stop = rangeHigh;
    }
  } else if (params.stopLoss.placement === 'fixed_distance') {
    // e.g., "2 ticks below entry"
    const tickSize = 0.25; // Assume 0.25 points per tick for ES
    const distance = params.stopLoss.value * tickSize;
    stop = params.direction === 'long' ? entry - distance : entry + distance;
  } else if (params.stopLoss.placement === 'atr_multiple') {
    // e.g., "2x ATR" - assume ATR = 10% of range for visualization
    const atr = rangeSize * 0.5; // Approximate ATR
    const distance = params.stopLoss.value * atr;
    stop = params.direction === 'long' ? entry - distance : entry + distance;
  } else {
    // Structure-based: assume beyond range
    stop = params.direction === 'long' ? rangeLow - 2 : rangeHigh + 2;
  }
  
  // Calculate target position
  const riskDistance = Math.abs(entry - stop);
  
  if (params.profitTarget.method === 'r_multiple') {
    // e.g., "2R" → target = entry + (riskDistance * 2)
    const rewardDistance = riskDistance * params.profitTarget.value;
    target = params.direction === 'long' ? entry + rewardDistance : entry - rewardDistance;
  } else if (params.profitTarget.method === 'extension') {
    // e.g., "2x range" → target = entry + (rangeSize * 2)
    const rewardDistance = rangeSize * params.profitTarget.value;
    target = params.direction === 'long' ? entry + rewardDistance : entry - rewardDistance;
  } else if (params.profitTarget.method === 'fixed_distance') {
    const tickSize = 0.25;
    const distance = params.profitTarget.value * tickSize;
    target = params.direction === 'long' ? entry + distance : entry - distance;
  } else {
    // Default: 2R
    const rewardDistance = riskDistance * 2;
    target = params.direction === 'long' ? entry + rewardDistance : entry - rewardDistance;
  }
  
  // Ensure values are within chart bounds
  entry = Math.max(chartMin, Math.min(chartMax, entry));
  stop = Math.max(chartMin, Math.min(chartMax, stop));
  target = Math.max(chartMin, Math.min(chartMax, target));
  
  // Calculate R:R ratio
  const rewardDistance = Math.abs(target - entry);
  const rrRatio = riskDistance > 0 ? (rewardDistance / riskDistance).toFixed(1) : '0';
  
  return {
    entry,
    stop,
    target,
    rangeLow,
    rangeHigh,
    entryLabel: `Entry: ${entry.toFixed(1)}`,
    stopLabel: `Stop: ${stop.toFixed(1)}`,
    targetLabel: `Target: ${target.toFixed(1)} (${rrRatio}R)`,
    riskDistance,
    rewardDistance,
    riskRewardRatio: `1:${rrRatio}`,
  };
}

// ============================================================================
// DEBUGGING / TESTING
// ============================================================================

export function debugParameters(rules: StrategyRule[]): void {
  console.group('🔍 Strategy Parameter Extraction');
  
  const params = extractStrategyParameters(rules);
  if (!params) {
    console.log('❌ Could not extract parameters (missing stop or target)');
    console.groupEnd();
    return;
  }
  
  console.log('Strategy Type:', params.strategyType);
  console.log('Direction:', params.direction);
  console.log('\n📍 Entry:', params.entry);
  console.log('\n🛑 Stop Loss:', params.stopLoss);
  console.log('  Placement:', params.stopLoss.placement);
  console.log('  Value:', params.stopLoss.value);
  console.log('  Relative to:', params.stopLoss.relativeTo);
  
  console.log('\n🎯 Profit Target:', params.profitTarget);
  console.log('  Method:', params.profitTarget.method);
  console.log('  Value:', params.profitTarget.value);
  console.log('  Relative to:', params.profitTarget.relativeTo);
  
  if (params.range) {
    console.log('\n📏 Range:', params.range);
  }
  
  const coords = calculateVisualCoordinates(params);
  console.log('\n📊 Visual Coordinates:');
  console.log('  Entry Y:', coords.entry);
  console.log('  Stop Y:', coords.stop);
  console.log('  Target Y:', coords.target);
  console.log('  R:R Ratio:', coords.riskRewardRatio);
  
  console.groupEnd();
}
