/**
 * STRATEGY VALIDATION SYSTEM
 * 
 * Enforces professional prop trading standards based on deep research.
 * 
 * Every professional strategy requires:
 * 1. Entry criteria (specific, measurable)
 * 2. TWO exit rules (stop-loss AND profit target)
 * 3. Position sizing (formula-based, not arbitrary)
 * 4. Risk parameters (daily limits, max drawdown)
 * 5. Instrument specification (exact contracts)
 * 
 * Reference: "Architecture of Professional Trading Strategies" research document
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ValidationResult {
  isComplete: boolean;
  isValid: boolean;
  completionScore: number; // 0-100
  requiredMissing: ValidationIssue[];
  recommendedMissing: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: RuleCategory;
  suggestion?: string;
}

export type RuleCategory = 'setup' | 'entry' | 'exit' | 'risk' | 'timeframe' | 'filters';

export interface StrategyComponents {
  // REQUIRED (must have all 5)
  entry?: EntryComponent;
  stopLoss?: ExitComponent;
  profitTarget?: ExitComponent;
  positionSizing?: RiskComponent;
  instrument?: string;
  
  // RECOMMENDED (professional quality)
  timeframe?: string;
  session?: string;
  direction?: 'long' | 'short' | 'both';
  filters?: string[];
  tradeManagement?: string[];
}

interface EntryComponent {
  type: 'breakout' | 'pullback' | 'reversal' | 'continuation' | 'confirmation' | 'time_based';
  trigger: string;
  confirmation?: string;
}

interface ExitComponent {
  type: 'fixed' | 'atr' | 'structure' | 'time' | 'trailing' | 'r_multiple';
  value: string;
  details?: string;
}

interface RiskComponent {
  method: 'percentage' | 'dollar' | 'volatility' | 'kelly' | 'fixed';
  value: string;
  maxRisk?: string;
}

// ============================================================================
// REQUIRED & RECOMMENDED COMPONENT DEFINITIONS
// ============================================================================

export const REQUIRED_COMPONENTS = {
  entry: {
    name: 'Entry Criteria',
    description: 'Specific, measurable conditions for opening positions',
    examples: ['Break above 15-min high', 'Pullback to 20 EMA', 'RSI < 30 + bullish divergence'],
  },
  stopLoss: {
    name: 'Stop-Loss',
    description: 'Maximum acceptable loss per trade (CME: "mental stops don\'t count")',
    examples: ['50% of range', '2x ATR below entry', '2 ticks below swing low'],
  },
  profitTarget: {
    name: 'Profit Target',
    description: 'Gain realization point (industry standard: 1.5R - 3R)',
    examples: ['1:2 R:R', '2x range size', '100% extension of range'],
  },
  positionSizing: {
    name: 'Position Sizing',
    description: 'Formula-based position size (Van Tharp: accounts for 91% of performance)',
    examples: ['1% risk per trade', '2 contracts', '$500 risk per trade'],
  },
  instrument: {
    name: 'Instrument',
    description: 'Exact markets and contracts to trade',
    examples: ['ES', 'NQ', 'MES', 'MNQ'],
  },
} as const;

export const RECOMMENDED_COMPONENTS = {
  timeframe: {
    name: 'Timeframe',
    description: 'Execution and confirmation timeframes',
    examples: ['5-min execution, 15-min confirmation', '1-hour chart', 'Daily'],
  },
  session: {
    name: 'Trading Session',
    description: 'Specific trading hours (RTH, Globex, Asian, etc.)',
    examples: ['RTH only (9:30-16:00 ET)', 'First 2 hours', 'London session'],
  },
  direction: {
    name: 'Direction',
    description: 'Long only, short only, or both',
    examples: ['Long only', 'Short only', 'Both directions'],
  },
  filters: {
    name: 'Filters/Confirmations',
    description: 'Additional conditions to refine entries',
    examples: ['Price above 20 EMA', 'Volume > 1000', 'Trend aligned'],
  },
} as const;

// Professional standards from research
const PROFESSIONAL_STANDARDS = {
  maxRiskPerTrade: 0.02, // 2% max (Van Tharp: >3% is "financial suicide")
  minRiskRewardRatio: 1.5, // Minimum 1.5:1 for viability
  recommendedRR: 2.0, // Industry standard 2:1
  dailyLossLimitMin: 0.02, // 2% minimum (TopStep, Earn2Trade)
  dailyLossLimitMax: 0.05, // 5% maximum (FTMO)
  maxDrawdown: 0.10, // 10% typical max
  minBacktestTrades: 100, // Minimum for statistical validity
};

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Main validation function - validates entire strategy
 */
export function validateStrategy(rules: StrategyRule[]): ValidationResult {
  const components = parseRulesToComponents(rules);
  const requiredMissing: ValidationIssue[] = [];
  const recommendedMissing: ValidationIssue[] = [];
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check REQUIRED components
  if (!components.entry) {
    requiredMissing.push({
      field: 'entry',
      message: 'Entry criteria not defined',
      severity: 'error',
      category: 'entry',
      suggestion: 'Specify your entry trigger (e.g., "Break above 15-min high", "Pullback to 20 EMA")',
    });
  } else {
    // Validate entry quality
    const entryValidation = validateEntry(components.entry);
    errors.push(...entryValidation.filter(v => v.severity === 'error'));
    warnings.push(...entryValidation.filter(v => v.severity === 'warning'));
  }

  if (!components.stopLoss) {
    requiredMissing.push({
      field: 'stopLoss',
      message: 'Stop-loss not defined',
      severity: 'error',
      category: 'risk',
      suggestion: 'Define where you\'ll exit if the trade goes against you (e.g., "2 ticks below entry", "50% of range")',
    });
  }

  if (!components.profitTarget) {
    requiredMissing.push({
      field: 'profitTarget',
      message: 'Profit target not defined',
      severity: 'error',
      category: 'exit',
      suggestion: 'Set your profit target (industry standard: 1.5R - 3R ratio)',
    });
  }

  if (!components.positionSizing) {
    requiredMissing.push({
      field: 'positionSizing',
      message: 'Position sizing not defined',
      severity: 'error',
      category: 'risk',
      suggestion: 'Specify your position size (e.g., "1% risk per trade", "2 contracts")',
    });
  } else {
    // Validate position sizing quality
    const positionValidation = validatePositionSizing(components.positionSizing);
    errors.push(...positionValidation.filter(v => v.severity === 'error'));
    warnings.push(...positionValidation.filter(v => v.severity === 'warning'));
  }

  if (!components.instrument) {
    requiredMissing.push({
      field: 'instrument',
      message: 'Instrument not specified',
      severity: 'error',
      category: 'setup',
      suggestion: 'Specify which instrument you\'re trading (e.g., ES, NQ, MES)',
    });
  }

  // Check RECOMMENDED components (only show after required complete - progressive disclosure)
  if (requiredMissing.length === 0) {
    if (!components.timeframe) {
      recommendedMissing.push({
        field: 'timeframe',
        message: 'Timeframe not specified',
        severity: 'warning',
        category: 'timeframe',
        suggestion: 'Professional strategies specify execution timeframes',
      });
    }

    if (!components.session) {
      recommendedMissing.push({
        field: 'session',
        message: 'Trading session not specified',
        severity: 'warning',
        category: 'timeframe',
        suggestion: 'Consider specifying session (RTH, Globex, specific hours)',
      });
    }

    if (!components.direction) {
      recommendedMissing.push({
        field: 'direction',
        message: 'Direction not specified',
        severity: 'warning',
        category: 'setup',
        suggestion: 'Specify if long only, short only, or both',
      });
    }
  }

  // Validate risk-reward ratio if both stop and target exist
  if (components.stopLoss && components.profitTarget) {
    const rrValidation = validateRiskReward(components.stopLoss, components.profitTarget, rules);
    warnings.push(...rrValidation);
  }

  // Calculate completion score
  const requiredCount = Object.keys(REQUIRED_COMPONENTS).length;
  const requiredMet = requiredCount - requiredMissing.length;
  const recommendedCount = Object.keys(RECOMMENDED_COMPONENTS).length;
  const recommendedMet = recommendedCount - recommendedMissing.length;
  
  // Weight: Required = 70%, Recommended = 30%
  const completionScore = Math.round(
    ((requiredMet / requiredCount) * 70) + ((recommendedMet / recommendedCount) * 30)
  );

  return {
    isComplete: requiredMissing.length === 0,
    isValid: errors.length === 0,
    completionScore,
    requiredMissing,
    recommendedMissing,
    errors,
    warnings,
  };
}

/**
 * Parse strategy rules into structured components
 */
function parseRulesToComponents(rules: StrategyRule[]): StrategyComponents {
  const components: StrategyComponents = {};

  // Parse Entry
  const entryRules = rules.filter(r => 
    r.category === 'entry' || 
    r.label.toLowerCase().includes('entry') ||
    r.label.toLowerCase().includes('trigger') ||
    r.label.toLowerCase().includes('setup')
  );
  
  if (entryRules.length > 0) {
    components.entry = {
      type: detectEntryType(entryRules),
      trigger: entryRules.find(r => r.label.toLowerCase().includes('trigger') || r.label.toLowerCase().includes('entry'))?.value || entryRules[0].value,
      confirmation: entryRules.find(r => r.label.toLowerCase().includes('confirmation'))?.value,
    };
  }

  // Parse Stop-Loss
  const stopRule = rules.find(r => 
    r.label.toLowerCase().includes('stop') && 
    !r.label.toLowerCase().includes('time')
  );
  
  if (stopRule) {
    components.stopLoss = {
      type: detectExitType(stopRule.value),
      value: stopRule.value,
    };
  }

  // Parse Profit Target
  const targetRule = rules.find(r => 
    r.label.toLowerCase().includes('target') ||
    r.label.toLowerCase().includes('profit') ||
    r.label.toLowerCase().includes('r:r') ||
    r.label.toLowerCase().includes('risk:reward')
  );
  
  if (targetRule) {
    components.profitTarget = {
      type: detectExitType(targetRule.value),
      value: targetRule.value,
    };
  }

  // Parse Position Sizing
  const sizeRule = rules.find(r => 
    r.label.toLowerCase().includes('position') ||
    r.label.toLowerCase().includes('size') ||
    r.label.toLowerCase().includes('contracts') ||
    (r.label.toLowerCase().includes('risk') && r.value.toLowerCase().includes('%'))
  );
  
  if (sizeRule) {
    components.positionSizing = {
      method: detectPositionSizingMethod(sizeRule.value),
      value: sizeRule.value,
    };
  }

  // Parse Instrument
  const instrumentRule = rules.find(r => 
    r.label.toLowerCase().includes('instrument') ||
    r.label.toLowerCase().includes('symbol') ||
    r.label.toLowerCase().includes('contract')
  );
  
  components.instrument = instrumentRule?.value;

  // Parse Timeframe
  const timeframeRule = rules.find(r => 
    r.label.toLowerCase().includes('timeframe') ||
    r.label.toLowerCase().includes('period') ||
    r.label.toLowerCase().includes('chart')
  );
  
  components.timeframe = timeframeRule?.value;

  // Parse Session
  const sessionRule = rules.find(r => 
    r.label.toLowerCase().includes('session') ||
    r.label.toLowerCase().includes('hours')
  );
  
  components.session = sessionRule?.value;

  // Parse Direction
  const directionRule = rules.find(r => 
    r.label.toLowerCase().includes('direction') ||
    r.label.toLowerCase().includes('side')
  );
  
  if (directionRule) {
    const value = directionRule.value.toLowerCase();
    if (value.includes('long') && value.includes('short')) {
      components.direction = 'both';
    } else if (value.includes('long') || value.includes('buy')) {
      components.direction = 'long';
    } else if (value.includes('short') || value.includes('sell')) {
      components.direction = 'short';
    }
  }

  // Parse Filters
  const filterRules = rules.filter(r => 
    r.category === 'filters' ||
    r.label.toLowerCase().includes('filter') ||
    r.label.toLowerCase().includes('condition')
  );
  
  if (filterRules.length > 0) {
    components.filters = filterRules.map(r => r.value);
  }

  return components;
}

/**
 * Validate entry criteria quality
 */
function validateEntry(entry: EntryComponent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for vague entries
  const vagueTerms = ['good', 'strong', 'weak', 'feel', 'looks', 'seems', 'maybe', 'probably'];
  const hasVagueTerms = vagueTerms.some(term => entry.trigger.toLowerCase().includes(term));
  
  if (hasVagueTerms) {
    issues.push({
      field: 'entry',
      message: 'Entry criteria contains subjective terms',
      severity: 'warning',
      category: 'entry',
      suggestion: 'Use specific, measurable conditions (e.g., "Price breaks above X" instead of "looks strong")',
    });
  }

  // Check for "I'll decide" patterns
  const indecisiveTerms = ['decide', 'figure out', 'see what', 'depends', 'maybe'];
  const isIndecisive = indecisiveTerms.some(term => entry.trigger.toLowerCase().includes(term));
  
  if (isIndecisive) {
    issues.push({
      field: 'entry',
      message: 'Entry criteria is not specific enough',
      severity: 'error',
      category: 'entry',
      suggestion: 'Professional strategies have clearly defined, non-discretionary entry rules',
    });
  }

  return issues;
}

/**
 * Validate position sizing method
 */
function validatePositionSizing(sizing: RiskComponent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for percentage-based risk
  if (sizing.method === 'percentage') {
    const percentMatch = sizing.value.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      const riskPercent = parseFloat(percentMatch[1]) / 100;
      
      if (riskPercent > PROFESSIONAL_STANDARDS.maxRiskPerTrade) {
        issues.push({
          field: 'positionSizing',
          message: `Risk per trade (${riskPercent * 100}%) exceeds professional maximum (2%)`,
          severity: 'error',
          category: 'risk',
          suggestion: 'Van Tharp research shows risking >3% per trade is "financial suicide". Reduce to 1-2%.',
        });
      }
    }
  }

  // Warn if using fixed contracts without risk context
  if (sizing.method === 'fixed' && !sizing.value.toLowerCase().includes('risk')) {
    issues.push({
      field: 'positionSizing',
      message: 'Fixed contract size without risk percentage',
      severity: 'warning',
      category: 'risk',
      suggestion: 'Professional traders size positions based on risk (e.g., "2 contracts = 1% risk")',
    });
  }

  return issues;
}

/**
 * Validate risk-reward ratio
 */
function validateRiskReward(_stop: ExitComponent, _target: ExitComponent, allRules: StrategyRule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Try to extract R:R ratio
  const rrMatch = [...allRules]
    .map(r => r.value.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/))
    .find(m => m !== null);

  if (rrMatch) {
    const risk = parseFloat(rrMatch[1]);
    const reward = parseFloat(rrMatch[2]);
    const ratio = reward / risk;

    if (ratio < PROFESSIONAL_STANDARDS.minRiskRewardRatio) {
      issues.push({
        field: 'profitTarget',
        message: `Risk:reward ratio (${risk}:${reward}) below professional minimum (1.5:1)`,
        severity: 'warning',
        category: 'exit',
        suggestion: 'Industry standard is 2:1 minimum. Lower ratios require very high win rates.',
      });
    }
  }

  return issues;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectEntryType(rules: StrategyRule[]): EntryComponent['type'] {
  const text = rules.map(r => r.value.toLowerCase()).join(' ');
  
  if (text.includes('break') || text.includes('breakout')) return 'breakout';
  if (text.includes('pullback') || text.includes('retest') || text.includes('retrace')) return 'pullback';
  if (text.includes('reversal') || text.includes('pivot')) return 'reversal';
  if (text.includes('continuation') || text.includes('trend')) return 'continuation';
  if (text.includes('confirm') || text.includes('signal')) return 'confirmation';
  if (text.includes('time') || text.includes('session') || text.includes('opening')) return 'time_based';
  
  return 'breakout'; // default
}

function detectExitType(value: string): ExitComponent['type'] {
  const lower = value.toLowerCase();
  
  if (lower.match(/\d+\s*:\s*\d+/)) return 'r_multiple';
  if (lower.includes('atr')) return 'atr';
  if (lower.includes('swing') || lower.includes('structure') || lower.includes('support') || lower.includes('resistance')) return 'structure';
  if (lower.includes('time') || lower.includes('minutes') || lower.includes('hours')) return 'time';
  if (lower.includes('trail')) return 'trailing';
  
  return 'fixed';
}

function detectPositionSizingMethod(value: string): RiskComponent['method'] {
  const lower = value.toLowerCase();
  
  if (lower.includes('%') || lower.includes('percent')) return 'percentage';
  if (lower.includes('$') || lower.includes('dollar')) return 'dollar';
  if (lower.includes('atr') || lower.includes('volatility')) return 'volatility';
  if (lower.includes('kelly')) return 'kelly';
  
  return 'fixed';
}

/**
 * Get readable summary of validation status
 */
export function getValidationSummary(validation: ValidationResult): string {
  if (validation.isComplete && validation.isValid) {
    return '✓ Strategy is complete and ready for backtesting';
  }
  
  if (validation.isComplete && !validation.isValid) {
    return `⚠ Strategy is complete but has ${validation.errors.length} validation error(s)`;
  }
  
  const missingCount = validation.requiredMissing.length;
  return `${missingCount} required component${missingCount === 1 ? '' : 's'} missing (${validation.completionScore}% complete)`;
}

/**
 * Get next action suggestion based on validation state
 */
export function getNextActionSuggestion(validation: ValidationResult): string {
  if (validation.requiredMissing.length > 0) {
    const first = validation.requiredMissing[0];
    const fieldName = REQUIRED_COMPONENTS[first.field as keyof typeof REQUIRED_COMPONENTS]?.name || first.field;
    return `Define your ${fieldName}`;
  }
  
  if (validation.errors.length > 0) {
    return `Fix: ${validation.errors[0].message}`;
  }
  
  if (validation.recommendedMissing.length > 0) {
    const first = validation.recommendedMissing[0];
    const fieldName = RECOMMENDED_COMPONENTS[first.field as keyof typeof RECOMMENDED_COMPONENTS]?.name || first.field;
    return `Consider adding: ${fieldName}`;
  }
  
  return 'Ready to backtest!';
}

/**
 * Check if strategy can proceed to backtest (hard block)
 */
export function canProceedToBacktest(validation: ValidationResult): boolean {
  return validation.isComplete && validation.errors.length === 0;
}

/**
 * Check if strategy can be saved (soft block - show warning but allow)
 */
export function canSaveStrategy(validation: ValidationResult): { allowed: boolean; showWarning: boolean } {
  // Always allow saving (drafts are okay)
  // But show warning if incomplete
  return {
    allowed: true,
    showWarning: !validation.isComplete || validation.errors.length > 0,
  };
}

/**
 * Get validation context for Claude prompt injection
 */
export function getValidationContextForPrompt(validation: ValidationResult): string {
  if (validation.isComplete) {
    return ''; // No context needed - strategy is complete
  }

  const missing = validation.requiredMissing.map(issue => {
    const component = REQUIRED_COMPONENTS[issue.field as keyof typeof REQUIRED_COMPONENTS];
    return `- ${component?.name || issue.field}: ${issue.suggestion}`;
  }).join('\n');

  return `
[VALIDATION CONTEXT]
The user's strategy is ${validation.completionScore}% complete.
Missing required components:
${missing}

Focus on helping the user define these components. Be direct and specific.
`;
}
