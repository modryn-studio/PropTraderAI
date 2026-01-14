/**
 * STRATEGY QUALITY METRICS
 * 
 * Validates that rapidly-built strategies are actually executable.
 * Tracks quality metrics for the behavioral data moat.
 * 
 * Checks:
 * 1. All required components present
 * 2. Logical consistency (stop < target)
 * 3. Backtestability (can we simulate this?)
 * 4. Default usage tracking
 * 
 * Part of: Rapid Strategy Builder Edge Case Handling
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StrategyQualityMetrics {
  strategyId: string;
  isBacktestable: boolean;
  isExecutable: boolean;
  completeness: number; // 0.0 to 1.0
  errors: QualityError[];
  warnings: QualityWarning[];
  defaultsUsed: string[];
  defaultsCount: number;
  specifiedCount: number;
  qualityScore: number; // 0-100
  timestamp: string;
}

export interface QualityError {
  code: string;
  component: string;
  message: string;
  severity: 'critical' | 'error';
}

export interface QualityWarning {
  code: string;
  component: string;
  message: string;
  suggestion?: string;
}

interface ParsedValue {
  numericValue: number | null;
  unit: string | null;
  isValid: boolean;
}

// ============================================================================
// REQUIRED COMPONENTS
// ============================================================================

const REQUIRED_COMPONENTS = [
  { label: 'instrument', category: 'setup', aliases: ['symbol', 'contract', 'market'] },
  { label: 'entry', category: 'entry', aliases: ['entry condition', 'entry signal', 'entry trigger'] },
  { label: 'stop loss', category: 'exit', aliases: ['stop', 'stoploss', 'sl'] },
  { label: 'target', category: 'exit', aliases: ['profit target', 'tp', 'take profit'] },
  { label: 'position size', category: 'risk', aliases: ['sizing', 'risk per trade', 'lot size'] },
];

// Optional components tracked for future expansion:
// session, direction, confirmation
// Not currently used in validation

// ============================================================================
// PARSING UTILITIES
// ============================================================================

/**
 * Parse numeric value from strategy component
 */
function parseValue(value: string): ParsedValue {
  // Try to extract number and unit
  const tickMatch = value.match(/(\d+\.?\d*)\s*(tick|pt|point)/i);
  if (tickMatch) {
    return { numericValue: parseFloat(tickMatch[1]), unit: 'ticks', isValid: true };
  }
  
  const dollarMatch = value.match(/\$?\s*(\d+\.?\d*)/);
  if (dollarMatch) {
    return { numericValue: parseFloat(dollarMatch[1]), unit: 'dollars', isValid: true };
  }
  
  const percentMatch = value.match(/(\d+\.?\d*)\s*%/);
  if (percentMatch) {
    return { numericValue: parseFloat(percentMatch[1]), unit: 'percent', isValid: true };
  }
  
  const rrMatch = value.match(/1\s*:\s*(\d+\.?\d*)|(\d+\.?\d*)\s*R/i);
  if (rrMatch) {
    const rrValue = parseFloat(rrMatch[1] || rrMatch[2]);
    return { numericValue: rrValue, unit: 'rr', isValid: true };
  }
  
  return { numericValue: null, unit: null, isValid: false };
}

/**
 * Find a component in rules by label or aliases
 */
function findComponent(
  rules: StrategyRule[],
  component: { label: string; aliases: string[] }
): StrategyRule | undefined {
  const searchTerms = [component.label, ...component.aliases];
  
  return rules.find(rule => 
    searchTerms.some(term => 
      rule.label.toLowerCase().includes(term.toLowerCase())
    )
  );
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check for missing required components
 */
function checkRequiredComponents(rules: StrategyRule[]): QualityError[] {
  const errors: QualityError[] = [];
  
  for (const required of REQUIRED_COMPONENTS) {
    const found = findComponent(rules, required);
    
    if (!found) {
      errors.push({
        code: 'MISSING_COMPONENT',
        component: required.label,
        message: `Missing required component: ${required.label}`,
        severity: 'critical',
      });
    }
  }
  
  return errors;
}

/**
 * Check logical consistency of strategy
 */
function checkLogicalConsistency(rules: StrategyRule[]): { errors: QualityError[]; warnings: QualityWarning[] } {
  const errors: QualityError[] = [];
  const warnings: QualityWarning[] = [];
  
  // Find stop and target
  const stopRule = findComponent(rules, { label: 'stop loss', aliases: ['stop', 'sl'] });
  const targetRule = findComponent(rules, { label: 'target', aliases: ['profit target', 'tp'] });
  
  if (stopRule && targetRule) {
    const stopValue = parseValue(stopRule.value);
    const targetValue = parseValue(targetRule.value);
    
    // Check if target is R:R ratio
    if (targetValue.unit === 'rr' && targetValue.numericValue !== null) {
      if (targetValue.numericValue < 1) {
        warnings.push({
          code: 'NEGATIVE_RR',
          component: 'target',
          message: `Risk:Reward ratio below 1:1 (${targetValue.numericValue}R)`,
          suggestion: 'Consider at least 1:1 R:R for positive expectancy',
        });
      }
    }
    
    // Check if both are in same unit
    if (stopValue.unit === targetValue.unit && 
        stopValue.numericValue !== null && 
        targetValue.numericValue !== null) {
      if (stopValue.numericValue >= targetValue.numericValue) {
        errors.push({
          code: 'STOP_EXCEEDS_TARGET',
          component: 'risk',
          message: `Stop loss (${stopValue.numericValue}) is >= target (${targetValue.numericValue})`,
          severity: 'error',
        });
      }
    }
  }
  
  // Check position sizing
  const sizingRule = findComponent(rules, { label: 'position size', aliases: ['risk per trade', 'sizing'] });
  if (sizingRule) {
    const sizeValue = parseValue(sizingRule.value);
    if (sizeValue.unit === 'percent' && sizeValue.numericValue !== null) {
      if (sizeValue.numericValue > 3) {
        warnings.push({
          code: 'HIGH_RISK',
          component: 'position size',
          message: `Risk per trade (${sizeValue.numericValue}%) is high`,
          suggestion: 'Most prop firms recommend 0.5-2% risk per trade',
        });
      }
    }
  }
  
  return { errors, warnings };
}

/**
 * Check if strategy is backtestable
 */
function checkBacktestability(rules: StrategyRule[]): { isBacktestable: boolean; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  let isBacktestable = true;
  
  // Need entry, stop, and target at minimum
  const entryRule = findComponent(rules, { label: 'entry', aliases: ['entry condition'] });
  const stopRule = findComponent(rules, { label: 'stop loss', aliases: ['stop'] });
  const targetRule = findComponent(rules, { label: 'target', aliases: ['profit target'] });
  
  if (!entryRule || !stopRule || !targetRule) {
    isBacktestable = false;
  }
  
  // Check for vague entry conditions
  if (entryRule) {
    const vaguePatterns = /\b(feel|intuition|looks like|seems|maybe|might)\b/i;
    if (vaguePatterns.test(entryRule.value)) {
      warnings.push({
        code: 'VAGUE_ENTRY',
        component: 'entry',
        message: 'Entry condition contains subjective terms',
        suggestion: 'Define specific, measurable entry criteria for backtesting',
      });
      isBacktestable = false;
    }
  }
  
  // Check for structure-based stops (harder to backtest)
  if (stopRule && /structure|swing|support|resistance/i.test(stopRule.value)) {
    warnings.push({
      code: 'STRUCTURE_STOP',
      component: 'stop loss',
      message: 'Structure-based stop is harder to backtest automatically',
      suggestion: 'Consider adding a maximum tick value as backup',
    });
  }
  
  return { isBacktestable, warnings };
}

/**
 * Identify which components used defaults
 */
function identifyDefaultsUsed(rules: StrategyRule[]): string[] {
  return rules
    .filter(rule => rule.isDefaulted === true)
    .map(rule => rule.label);
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateQualityScore(
  errors: QualityError[],
  warnings: QualityWarning[],
  defaultsCount: number,
  totalComponents: number,
  isBacktestable: boolean
): number {
  let score = 100;
  
  // Deduct for errors
  score -= errors.filter(e => e.severity === 'critical').length * 25;
  score -= errors.filter(e => e.severity === 'error').length * 15;
  
  // Deduct for warnings
  score -= warnings.length * 5;
  
  // Deduct if not backtestable
  if (!isBacktestable) {
    score -= 20;
  }
  
  // Small deduction for heavy default usage (>60%)
  const defaultRatio = totalComponents > 0 ? defaultsCount / totalComponents : 0;
  if (defaultRatio > 0.6) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate strategy quality and return comprehensive metrics
 * 
 * @param strategyId - ID of the strategy
 * @param rules - Array of strategy rules to validate
 * @returns StrategyQualityMetrics with all quality data
 */
export function validateStrategyQuality(
  strategyId: string,
  rules: StrategyRule[]
): StrategyQualityMetrics {
  // Check required components
  const requiredErrors = checkRequiredComponents(rules);
  
  // Check logical consistency
  const { errors: logicErrors, warnings: logicWarnings } = checkLogicalConsistency(rules);
  
  // Check backtestability
  const { isBacktestable, warnings: backtestWarnings } = checkBacktestability(rules);
  
  // Identify defaults
  const defaultsUsed = identifyDefaultsUsed(rules);
  const specifiedCount = rules.filter(r => !r.isDefaulted).length;
  
  // Combine all errors and warnings
  const allErrors = [...requiredErrors, ...logicErrors];
  const allWarnings = [...logicWarnings, ...backtestWarnings];
  
  // Calculate scores
  const completeness = 1 - (requiredErrors.length / REQUIRED_COMPONENTS.length);
  const isExecutable = requiredErrors.length === 0 && logicErrors.filter(e => e.severity === 'critical').length === 0;
  const qualityScore = calculateQualityScore(
    allErrors,
    allWarnings,
    defaultsUsed.length,
    rules.length,
    isBacktestable
  );
  
  return {
    strategyId,
    isBacktestable,
    isExecutable,
    completeness,
    errors: allErrors,
    warnings: allWarnings,
    defaultsUsed,
    defaultsCount: defaultsUsed.length,
    specifiedCount,
    qualityScore,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick check if strategy meets minimum requirements
 */
export function meetsMinimumRequirements(rules: StrategyRule[]): boolean {
  const errors = checkRequiredComponents(rules);
  return errors.length === 0;
}

/**
 * Get quality summary for UI display
 */
export function getQualitySummary(metrics: StrategyQualityMetrics): {
  status: 'excellent' | 'good' | 'fair' | 'needs_work';
  message: string;
  color: string;
} {
  if (metrics.qualityScore >= 90) {
    return {
      status: 'excellent',
      message: 'Strategy is complete and well-defined',
      color: '#10b981', // green
    };
  }
  
  if (metrics.qualityScore >= 70) {
    return {
      status: 'good',
      message: 'Strategy is tradeable with minor improvements possible',
      color: '#22c55e', // light green
    };
  }
  
  if (metrics.qualityScore >= 50) {
    return {
      status: 'fair',
      message: 'Strategy works but has some issues to address',
      color: '#f59e0b', // amber
    };
  }
  
  return {
    status: 'needs_work',
    message: 'Strategy needs more definition before trading',
    color: '#ef4444', // red
  };
}

const qualityMetricsExports = {
  validateStrategyQuality,
  meetsMinimumRequirements,
  getQualitySummary,
};

export default qualityMetricsExports;
