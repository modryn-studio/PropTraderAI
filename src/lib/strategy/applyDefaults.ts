/**
 * SMART DEFAULTS APPLICATION
 * 
 * Applies smart defaults for missing strategy components after Pass 2 extraction.
 * This is the critical integration piece that connects completeness detection
 * to actual rule generation.
 * 
 * Flow:
 * 1. Pass 2 extracts rules from conversation
 * 2. This function checks which components are missing
 * 3. For missing target, sizing, session → apply pattern-specific defaults
 * 4. Mark applied rules with isDefaulted: true
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { 
  calculateCompleteness, 
  getSmartDefaults, 
  identifyDefaultsNeeded,
  type CompletenessResult 
} from './completenessDetection';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extracted rule from Claude (less strict typing)
 */
export interface ExtractedRule {
  category: string;
  label: string;
  value: string;
}

// ============================================================================
// COMPONENT TO CATEGORY MAPPING
// ============================================================================

const COMPONENT_CATEGORY_MAP: Record<string, StrategyRule['category']> = {
  target: 'exit',
  sizing: 'risk',
  session: 'filters',
  stop: 'exit',
  instrument: 'setup',
  pattern: 'entry',
};

const COMPONENT_LABEL_MAP: Record<string, string> = {
  target: 'Profit Target',
  sizing: 'Position Size',
  session: 'Trading Session',
  stop: 'Stop Loss',
  instrument: 'Instrument',
  pattern: 'Pattern',
};

// ============================================================================
// CHECK IF COMPONENT EXISTS IN RULES
// ============================================================================

/**
 * Check if a label represents a profit target (handles various notations)
 */
function hasComponent(rules: ExtractedRule[], component: string): boolean {
  const normalizedComponent = component.toLowerCase();
  
  return rules.some(rule => {
    const label = rule.label.toLowerCase();
    const value = rule.value.toLowerCase();
    
    switch (normalizedComponent) {
      case 'target':
        return label.includes('target') || 
               label.includes('profit') || 
               label.includes('r:r') ||
               label.includes('reward') ||
               value.includes(':') && /\d:\d/.test(value); // R:R notation
               
      case 'sizing':
        return label.includes('size') || 
               label.includes('position') || 
               label.includes('contract') ||
               label.includes('risk') && (value.includes('%') || value.includes('contract'));
               
      case 'session':
        return label.includes('session') || 
               label.includes('time') || 
               label.includes('hours') ||
               label.includes('window');
               
      case 'stop':
        return label.includes('stop') || 
               label.includes('sl') ||
               (label.includes('loss') && !label.includes('profit'));
               
      default:
        return label.includes(normalizedComponent);
    }
  });
}

// ============================================================================
// MAIN FUNCTION: APPLY SMART DEFAULTS
// ============================================================================

export interface ApplyDefaultsResult {
  rules: StrategyRule[];
  defaultsApplied: string[];
  completeness: CompletenessResult;
}

/**
 * Apply smart defaults for missing strategy components
 * 
 * @param extractedRules - Rules extracted from Pass 2 (generic category strings)
 * @param firstMessage - User's initial message (for pattern detection)
 * @returns Rules with defaults applied for missing components (properly typed)
 */
export function applySmartDefaults(
  extractedRules: ExtractedRule[],
  firstMessage: string
): ApplyDefaultsResult {
  // Calculate completeness from first message
  const completeness = calculateCompleteness(firstMessage);
  
  // Get pattern-specific defaults
  const patternValue = completeness.components.pattern.value;
  const defaults = getSmartDefaults(patternValue);
  
  // Identify which components need defaults
  const needsDefault = identifyDefaultsNeeded(completeness);
  
  // Track what we actually apply
  const defaultsApplied: string[] = [];
  
  // Convert extracted rules to StrategyRule type with proper typing
  const rulesWithDefaults: StrategyRule[] = extractedRules.map(rule => ({
    category: normalizeCategory(rule.category),
    label: rule.label,
    value: rule.value,
    isDefaulted: false,
    source: 'user' as const,
  }));
  
  // Apply defaults only for components not already in extracted rules
  for (const component of needsDefault) {
    // Skip if rules already contain this component
    if (hasComponent(extractedRules, component)) {
      continue;
    }
    
    // Get the default value for this component
    const defaultData = defaults[component as keyof typeof defaults];
    if (!defaultData) {
      continue;
    }
    
    // Create the default rule
    const defaultRule: StrategyRule = {
      category: COMPONENT_CATEGORY_MAP[component] || 'filters',
      label: COMPONENT_LABEL_MAP[component] || component,
      value: defaultData.value,
      isDefaulted: true,
      explanation: defaultData.reasoning,
      source: 'default',
    };
    
    rulesWithDefaults.push(defaultRule);
    defaultsApplied.push(component);
  }
  
  return {
    rules: rulesWithDefaults,
    defaultsApplied,
    completeness,
  };
}

/**
 * Normalize category string to valid StrategyRule category
 */
function normalizeCategory(category: string): StrategyRule['category'] {
  const validCategories: StrategyRule['category'][] = [
    'setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'
  ];
  
  const normalized = category.toLowerCase() as StrategyRule['category'];
  
  if (validCategories.includes(normalized)) {
    return normalized;
  }
  
  // Map common variations
  const categoryMap: Record<string, StrategyRule['category']> = {
    'position': 'risk',
    'sizing': 'risk',
    'stop': 'exit',
    'target': 'exit',
    'profit': 'exit',
    'session': 'filters',
    'time': 'timeframe',
    'instrument': 'setup',
    'pattern': 'entry',
  };
  
  return categoryMap[category.toLowerCase()] || 'filters';
}

/**
 * Mark a rule as user-specified (not defaulted)
 * Call this when user explicitly provides a value that overrides a default
 */
export function markAsUserSpecified(rule: StrategyRule): StrategyRule {
  return {
    ...rule,
    isDefaulted: false,
    source: 'user',
    explanation: undefined,
  };
}

/**
 * Merge rules, preferring user-specified over defaults
 * If user provides a value for a component that has a default,
 * the user value wins and removes the default.
 */
export function mergeRulesPreferUser(
  existingRules: StrategyRule[],
  newRules: StrategyRule[]
): StrategyRule[] {
  const merged = [...existingRules];
  
  for (const newRule of newRules) {
    const existingIndex = merged.findIndex(r => 
      r.category === newRule.category && 
      normalizeLabel(r.label) === normalizeLabel(newRule.label)
    );
    
    if (existingIndex >= 0) {
      // Existing rule found - prefer user over default
      const existingRule = merged[existingIndex];
      
      if (existingRule.isDefaulted && !newRule.isDefaulted) {
        // User value replacing default - use new
        merged[existingIndex] = markAsUserSpecified(newRule);
      } else if (!existingRule.isDefaulted && newRule.isDefaulted) {
        // Keep existing user value, skip default
        continue;
      } else {
        // Both same source - update with newer
        merged[existingIndex] = newRule;
      }
    } else {
      // New rule - add it
      merged.push(newRule);
    }
  }
  
  return merged;
}

/**
 * Helper to normalize labels for comparison
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
