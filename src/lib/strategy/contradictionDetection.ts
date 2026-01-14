/**
 * CONTRADICTION DETECTION
 * 
 * Detects conflicting values in user strategy descriptions.
 * Handles three types:
 * 1. Conditional logic (advanced - "20 ticks or structure, whichever smaller")
 * 2. Uncertainty ("20-tick stop... maybe structure-based is better")
 * 3. Direct conflict ("stop at 20 ticks. stop at 30 ticks")
 * 
 * Part of: Rapid Strategy Builder Edge Case Handling
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ContradictionType = 'conditional' | 'uncertain' | 'conflicting';

export interface Contradiction {
  component: string;       // The label/field with conflicts (e.g., "Stop Loss")
  values: string[];        // The conflicting values found
  type: ContradictionType; // Type of contradiction
  category: string;        // Category of the rules (exit, risk, etc.)
}

export interface ContradictionResult {
  hasContradictions: boolean;
  contradictions: Contradiction[];
  needsClarification: boolean;
  suggestedResponse?: string;
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

/**
 * Words that indicate conditional/adaptive logic (advanced traders)
 */
const CONDITIONAL_WORDS = /\b(if|when|whichever|depending|based\s+on|or\s+if|unless|alternatively|either)\b/i;

/**
 * Words that indicate user uncertainty
 */
const UNCERTAINTY_WORDS = /\b(maybe|actually|perhaps|not\s+sure|thinking\s+about|could\s+be|might\s+be|or\s+maybe|idk|i\s+don['']?t\s+know|hmm)\b/i;

/**
 * Labels that should be unique (only one value allowed)
 */
const UNIQUE_LABELS = [
  'stop loss',
  'profit target',
  'target',
  'position size',
  'risk per trade',
  'instrument',
  'direction',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Group rules by normalized label
 */
function groupByLabel(rules: StrategyRule[]): Record<string, StrategyRule[]> {
  const groups: Record<string, StrategyRule[]> = {};
  
  for (const rule of rules) {
    const normalizedLabel = rule.label.toLowerCase().trim();
    if (!groups[normalizedLabel]) {
      groups[normalizedLabel] = [];
    }
    groups[normalizedLabel].push(rule);
  }
  
  return groups;
}

/**
 * Check if a value contains conditional logic
 */
function hasConditionalLogic(value: string): boolean {
  return CONDITIONAL_WORDS.test(value);
}

/**
 * Check if a value expresses uncertainty
 */
function hasUncertainty(value: string): boolean {
  return UNCERTAINTY_WORDS.test(value);
}

/**
 * Check if label should be unique
 */
function isUniqueLabel(label: string): boolean {
  const normalized = label.toLowerCase();
  return UNIQUE_LABELS.some(unique => 
    normalized.includes(unique) || unique.includes(normalized)
  );
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect contradictions in extracted rules
 * 
 * @param rules - Array of strategy rules to check
 * @returns ContradictionResult with detected issues
 */
export function detectContradictions(rules: StrategyRule[]): ContradictionResult {
  const contradictions: Contradiction[] = [];
  const grouped = groupByLabel(rules);
  
  for (const [label, groupedRules] of Object.entries(grouped)) {
    // Skip if only one rule for this label
    if (groupedRules.length <= 1) continue;
    
    // Only check labels that should be unique
    if (!isUniqueLabel(label)) continue;
    
    const values = groupedRules.map(r => r.value);
    const category = groupedRules[0].category;
    
    // Check if any value has conditional logic
    const hasConditional = values.some(hasConditionalLogic);
    
    // Check if any value expresses uncertainty
    const hasUncertain = values.some(hasUncertainty);
    
    // Determine type
    let type: ContradictionType;
    if (hasConditional) {
      type = 'conditional';
    } else if (hasUncertain) {
      type = 'uncertain';
    } else {
      type = 'conflicting';
    }
    
    contradictions.push({
      component: label,
      values,
      type,
      category,
    });
  }
  
  // Determine if clarification needed
  const needsClarification = contradictions.some(
    c => c.type === 'uncertain' || c.type === 'conflicting'
  );
  
  return {
    hasContradictions: contradictions.length > 0,
    contradictions,
    needsClarification,
    suggestedResponse: needsClarification 
      ? generateClarificationResponse(contradictions[0]) 
      : undefined,
  };
}

// ============================================================================
// RESPONSE GENERATION
// ============================================================================

/**
 * Generate a clarification response for a contradiction
 */
function generateClarificationResponse(contradiction: Contradiction): string {
  const { component, values, type } = contradiction;
  const formattedComponent = component.charAt(0).toUpperCase() + component.slice(1);
  
  if (type === 'conditional') {
    // Advanced logic - acknowledge and confirm
    return `I see you have adaptive ${formattedComponent} logic: "${values.join(' / ')}". ` +
           `This is an advanced approach. Should I keep this adaptive system, or would you prefer a single fixed value?`;
  }
  
  if (type === 'uncertain') {
    // Help them decide
    return `You're deciding between options for ${formattedComponent}: ${values.map(v => `"${v}"`).join(' vs ')}. ` +
           `Which would you prefer for this strategy?`;
  }
  
  // Direct conflict
  return `I noticed two values for ${formattedComponent}: ${values.map(v => `"${v}"`).join(' and ')}. ` +
         `Which one should I use?`;
}

/**
 * Detect contradictions in raw text (before rule extraction)
 * 
 * Useful for detecting contradictions in user's initial message
 * before formal rule extraction
 */
export function detectTextContradictions(text: string): ContradictionResult {
  const contradictions: Contradiction[] = [];
  
  // Stop loss patterns
  const stopMatches = text.match(/(\d+)\s*(tick|pt|point)s?\s*(stop|sl)?/gi) || [];
  const structureStops = text.match(/\b(structure|swing|support|resistance)\s*(based|stop)?\b/gi) || [];
  
  if (stopMatches.length > 1 || (stopMatches.length > 0 && structureStops.length > 0)) {
    const allStopValues = [...stopMatches, ...structureStops];
    const hasConditional = CONDITIONAL_WORDS.test(text);
    const hasUncertain = UNCERTAINTY_WORDS.test(text);
    
    contradictions.push({
      component: 'stop loss',
      values: allStopValues,
      type: hasConditional ? 'conditional' : hasUncertain ? 'uncertain' : 'conflicting',
      category: 'exit',
    });
  }
  
  // Target patterns
  const targetMatches = text.match(/\b\d+\s*:\s*\d+\s*(r:?r|reward|ratio)?\b/gi) || [];
  const tickTargets = text.match(/\b(\d+)\s*(tick|pt|point)s?\s*(target|tp|profit)?\b/gi) || [];
  
  if (targetMatches.length > 1 || tickTargets.length > 1) {
    const allTargetValues = [...targetMatches, ...tickTargets];
    const hasConditional = CONDITIONAL_WORDS.test(text);
    const hasUncertain = UNCERTAINTY_WORDS.test(text);
    
    contradictions.push({
      component: 'profit target',
      values: allTargetValues,
      type: hasConditional ? 'conditional' : hasUncertain ? 'uncertain' : 'conflicting',
      category: 'exit',
    });
  }
  
  const needsClarification = contradictions.some(
    c => c.type === 'uncertain' || c.type === 'conflicting'
  );
  
  return {
    hasContradictions: contradictions.length > 0,
    contradictions,
    needsClarification,
    suggestedResponse: needsClarification 
      ? generateClarificationResponse(contradictions[0]) 
      : undefined,
  };
}

/**
 * Resolve a contradiction by keeping the most recent or user-specified value
 */
export function resolveContradiction(
  rules: StrategyRule[],
  component: string,
  preferredValue?: string
): StrategyRule[] {
  const grouped = groupByLabel(rules);
  const conflictRules = grouped[component.toLowerCase()];
  
  if (!conflictRules || conflictRules.length <= 1) {
    return rules; // No contradiction to resolve
  }
  
  // If preferred value specified, keep that one
  if (preferredValue) {
    const preferred = conflictRules.find(r => r.value === preferredValue);
    if (preferred) {
      // Remove all rules for this component except the preferred one
      return rules.filter(r => 
        r.label.toLowerCase() !== component.toLowerCase() || 
        r.value === preferredValue
      );
    }
  }
  
  // Otherwise, keep the most recent (last in array)
  const lastRule = conflictRules[conflictRules.length - 1];
  return rules.filter(r => 
    r.label.toLowerCase() !== component.toLowerCase() || 
    r === lastRule
  );
}
