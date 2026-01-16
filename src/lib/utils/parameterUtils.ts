/**
 * PARAMETER UTILITIES
 * 
 * Helper functions for mobile swipeable cards flow.
 * Determines which parameters need confirmation and ordering.
 * 
 * From Agent 1 Decision (Issue #7):
 * - Category A (ALWAYS confirm): Stop Loss, Mental Stop, Max Drawdown
 * - Category B (confirm if defaulted): Target, Sizing
 * - Category C (auto-confirm): Session, Filters, Pattern, Instrument
 */

import type { StrategyRule } from './ruleExtractor';

// ============================================================================
// CONFIRMATION LOGIC
// ============================================================================

/**
 * Critical labels that ALWAYS require confirmation
 * These protect against account damage
 */
const CRITICAL_LABELS = [
  'Stop Loss',
  'Stop Placement', 
  'Stop Distance',
  'Mental Stop',
  'Max Drawdown',
  'Daily Loss Limit',
  'Max Risk',
];

/**
 * Labels that need confirmation only if they were defaulted
 * (User-specified values auto-confirm)
 */
const DEFAULT_SENSITIVE_LABELS = [
  'Target',
  'Profit Target',
  'Take Profit',
  'Position Sizing',
  'Risk Per Trade',
  'Lot Size',
];

/**
 * Determines if a parameter needs explicit user confirmation
 * 
 * @param param - The strategy rule to check
 * @returns boolean - true if user must tap to confirm
 */
export function needsConfirmation(param: StrategyRule): boolean {
  const label = param.label;
  
  // Category A: ALWAYS require confirmation (critical risk params)
  if (CRITICAL_LABELS.some(critical => label.includes(critical))) {
    return true;
  }
  
  // Category B: Require confirmation only if defaulted
  if (param.isDefaulted && DEFAULT_SENSITIVE_LABELS.some(sensitive => label.includes(sensitive))) {
    return true;
  }
  
  // Category C: Auto-confirm (session, filters, pattern, instrument)
  return false;
}

// ============================================================================
// PARAMETER ORDERING
// ============================================================================

/**
 * Groups and orders parameters by importance (not category)
 * 
 * Order:
 * 1. Critical (needs confirmation) - shown first
 * 2. User-specified (has their attention)
 * 3. Defaulted (least important)
 * 
 * @param rules - Array of strategy rules
 * @returns Ordered array with indices preserved
 */
export function orderByImportance(rules: StrategyRule[]): { rule: StrategyRule; originalIndex: number }[] {
  const indexed = rules.map((rule, index) => ({ rule, originalIndex: index }));
  
  // Tier 1: Critical (must confirm)
  const critical = indexed.filter(({ rule }) => needsConfirmation(rule));
  
  // Tier 2: User-specified (not defaulted, not critical)
  const userSpecified = indexed.filter(({ rule }) => 
    !rule.isDefaulted && !needsConfirmation(rule)
  );
  
  // Tier 3: Defaulted (auto-confirmed)
  const defaulted = indexed.filter(({ rule }) => 
    rule.isDefaulted && !needsConfirmation(rule)
  );
  
  // Edge case: If ALL params are defaulted (rare), fall back to category order
  // This ensures logical flow: setup → entry → exit → risk → timeframe → filters
  if (critical.length === 0 && userSpecified.length === 0 && defaulted.length > 0) {
    const categoryOrder = ['setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'];
    return defaulted.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.rule.category);
      const bIndex = categoryOrder.indexOf(b.rule.category);
      // Handle unknown categories (put at end)
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }
  
  return [...critical, ...userSpecified, ...defaulted];
}

/**
 * Filters out instrument from parameter list
 * (Instrument is shown in header, not as a card)
 */
export function filterInstrumentParam(rules: StrategyRule[]): StrategyRule[] {
  return rules.filter(rule => !rule.label.toLowerCase().includes('instrument'));
}

// ============================================================================
// CONFIRMATION STATE HELPERS
// ============================================================================

/**
 * Counts how many params still need confirmation
 */
export function countUnconfirmed(
  rules: StrategyRule[], 
  confirmedIndices: Set<number>
): number {
  return rules.filter((rule, index) => 
    needsConfirmation(rule) && !confirmedIndices.has(index)
  ).length;
}

/**
 * Checks if all critical params are confirmed (save can proceed)
 */
export function canSaveStrategy(
  rules: StrategyRule[], 
  confirmedIndices: Set<number>
): boolean {
  return rules.every((rule, index) => 
    !needsConfirmation(rule) || confirmedIndices.has(index)
  );
}

/**
 * Gets list of unconfirmed critical params (for UI feedback)
 */
export function getUnconfirmedCritical(
  rules: StrategyRule[], 
  confirmedIndices: Set<number>
): StrategyRule[] {
  return rules.filter((rule, index) => 
    needsConfirmation(rule) && !confirmedIndices.has(index)
  );
}
