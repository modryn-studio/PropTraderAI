/**
 * CROSS-MESSAGE COMPONENT HISTORY TRACKER
 * 
 * Tracks component changes across multiple messages.
 * Detects indecision patterns when users change mind repeatedly:
 * - Message 1: "I trade NQ"
 * - Message 2: "Actually ES is better"
 * - Message 3: "What about MNQ?"
 * 
 * Provides decision support when indecision is detected.
 * 
 * Part of: Rapid Strategy Builder Edge Case Handling
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ComponentChange {
  value: string;
  timestamp: Date;
  messageIndex: number;
  source: 'user' | 'system' | 'default';
}

export interface ComponentHistory {
  component: string;
  category: string;
  changes: ComponentChange[];
  currentValue: string | null;
  isIndecisive: boolean;
}

export interface IndecisionResult {
  hasIndecision: boolean;
  component: string;
  changeCount: number;
  values: string[];
  decisionHelpMessage?: string;
  suggestedValue?: string;
}

export interface ConversationComponentState {
  conversationId: string;
  components: Map<string, ComponentHistory>;
  totalChanges: number;
  indecisiveComponents: string[];
}

// ============================================================================
// INDECISION THRESHOLDS
// ============================================================================

const INDECISION_THRESHOLD = 3; // 3+ changes = indecision
const COMPONENTS_TO_TRACK = [
  'instrument',
  'stop loss',
  'target',
  'position size',
  'entry',
  'pattern',
  'direction',
  'session',
  'timeframe',
];

// ============================================================================
// COMPONENT COMPARISONS FOR DECISION HELP
// ============================================================================

const COMPONENT_COMPARISONS: Record<string, Record<string, string>> = {
  instrument: {
    ES: 'Steadier moves, $12.50/tick, more forgiving',
    NQ: 'More volatile, $5.00/tick, faster moves',
    MES: 'Same as ES but 1/10 size ($1.25/tick)',
    MNQ: 'Same as NQ but 1/10 size ($0.50/tick)',
  },
  'stop loss': {
    '10 ticks': 'Very tight - more stop-outs but smaller losses',
    '15 ticks': 'Tight - good for high R:R strategies',
    '20 ticks': 'Standard - balanced approach',
    '25 ticks': 'Medium - gives room to breathe',
    '30 ticks': 'Wide - fewer stop-outs, larger losses',
    'structure': 'Adaptive - varies by volatility',
  },
  target: {
    '1:1 R:R': 'Conservative - 50% win rate breakeven',
    '1:1.5 R:R': 'Moderate - good balance',
    '1:2 R:R': 'Standard - 33% win rate profitable',
    '1:3 R:R': 'Aggressive - needs good entries',
  },
};

// ============================================================================
// STATE STORAGE (in-memory, keyed by conversationId)
// ============================================================================

const conversationStates: Map<string, ConversationComponentState> = new Map();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Initialize or get component state for a conversation
 */
export function getOrCreateState(conversationId: string): ConversationComponentState {
  if (!conversationStates.has(conversationId)) {
    conversationStates.set(conversationId, {
      conversationId,
      components: new Map(),
      totalChanges: 0,
      indecisiveComponents: [],
    });
  }
  return conversationStates.get(conversationId)!;
}

/**
 * Track a component change
 */
export function trackComponentChange(
  conversationId: string,
  component: string,
  value: string,
  messageIndex: number,
  category: string = 'general',
  source: 'user' | 'system' | 'default' = 'user'
): IndecisionResult | null {
  // Only track specific components
  const normalizedComponent = component.toLowerCase();
  if (!COMPONENTS_TO_TRACK.some(c => normalizedComponent.includes(c))) {
    return null;
  }
  
  const state = getOrCreateState(conversationId);
  
  // Get or create component history
  if (!state.components.has(normalizedComponent)) {
    state.components.set(normalizedComponent, {
      component: normalizedComponent,
      category,
      changes: [],
      currentValue: null,
      isIndecisive: false,
    });
  }
  
  const history = state.components.get(normalizedComponent)!;
  
  // Get last change source for comparison
  const lastChange = history.changes[history.changes.length - 1];
  const lastSource = lastChange?.source;
  
  // Don't track if same value AND same source
  // BUT track if source changed (e.g., default -> user confirms same value)
  if (history.currentValue === value && lastSource === source) {
    return null;
  }
  
  // Track if value changed OR if source changed (user explicitly confirmed a default)
  const isConfirmation = history.currentValue === value && lastSource !== source;
  
  // Add change
  history.changes.push({
    value,
    timestamp: new Date(),
    messageIndex,
    source,
  });
  
  // Only update current value if value actually changed
  if (history.currentValue !== value) {
    history.currentValue = value;
    state.totalChanges++;
  }
  
  // Don't count source-only changes toward indecision
  if (isConfirmation) {
    return null;
  }
  
  // Check for indecision (3+ changes)
  if (history.changes.length >= INDECISION_THRESHOLD) {
    history.isIndecisive = true;
    
    if (!state.indecisiveComponents.includes(normalizedComponent)) {
      state.indecisiveComponents.push(normalizedComponent);
    }
    
    return generateIndecisionHelp(history);
  }
  
  return null;
}

/**
 * Generate help message for indecisive component
 */
function generateIndecisionHelp(history: ComponentHistory): IndecisionResult {
  const values = history.changes.map(c => c.value);
  const uniqueValues = Array.from(new Set(values));
  
  // Get comparison data if available
  const comparisons = COMPONENT_COMPARISONS[history.component];
  let decisionHelpMessage = `You've mentioned several options for ${history.component}: ${uniqueValues.join(', ')}.`;
  
  if (comparisons) {
    const relevantComparisons = uniqueValues
      .filter(v => {
        // Try to match value to comparison keys
        return Object.keys(comparisons).some(key => 
          v.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(v.toLowerCase())
        );
      })
      .map(v => {
        const matchedKey = Object.keys(comparisons).find(key =>
          v.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(v.toLowerCase())
        );
        return matchedKey ? `• **${v}**: ${comparisons[matchedKey]}` : `• ${v}`;
      });
    
    if (relevantComparisons.length > 0) {
      decisionHelpMessage += `\n\nQuick comparison:\n${relevantComparisons.join('\n')}`;
    }
  }
  
  decisionHelpMessage += `\n\nWhich would you like to use?`;
  
  // Suggest most recent value
  const suggestedValue = history.currentValue || uniqueValues[uniqueValues.length - 1];
  
  return {
    hasIndecision: true,
    component: history.component,
    changeCount: history.changes.length,
    values: uniqueValues,
    decisionHelpMessage,
    suggestedValue,
  };
}

/**
 * Check if any component has indecision
 */
export function checkForIndecision(conversationId: string): IndecisionResult | null {
  const state = conversationStates.get(conversationId);
  
  if (!state || state.indecisiveComponents.length === 0) {
    return null;
  }
  
  // Return the most recent indecisive component
  const componentName = state.indecisiveComponents[state.indecisiveComponents.length - 1];
  const history = state.components.get(componentName);
  
  if (!history) return null;
  
  return generateIndecisionHelp(history);
}

/**
 * Get all component histories for a conversation
 */
export function getComponentHistories(conversationId: string): ComponentHistory[] {
  const state = conversationStates.get(conversationId);
  
  if (!state) return [];
  
  return Array.from(state.components.values());
}

/**
 * Get current values for all tracked components
 */
export function getCurrentComponentValues(
  conversationId: string
): Record<string, string | null> {
  const state = conversationStates.get(conversationId);
  
  if (!state) return {};
  
  const values: Record<string, string | null> = {};
  for (const [component, history] of Array.from(state.components.entries())) {
    values[component] = history.currentValue;
  }
  
  return values;
}

/**
 * Clear indecision flag for a component (user made final decision)
 */
export function clearIndecision(conversationId: string, component: string): void {
  const state = conversationStates.get(conversationId);
  if (!state) return;
  
  const normalizedComponent = component.toLowerCase();
  const history = state.components.get(normalizedComponent);
  
  if (history) {
    history.isIndecisive = false;
  }
  
  state.indecisiveComponents = state.indecisiveComponents.filter(
    c => c !== normalizedComponent
  );
}

/**
 * Clear all state for a conversation (on save/completion)
 */
export function clearConversationState(conversationId: string): void {
  conversationStates.delete(conversationId);
}

/**
 * Get summary of changes for behavioral logging
 */
export function getChangesSummary(conversationId: string): {
  totalChanges: number;
  indecisiveComponents: string[];
  componentChangeCounts: Record<string, number>;
} {
  const state = conversationStates.get(conversationId);
  
  if (!state) {
    return {
      totalChanges: 0,
      indecisiveComponents: [],
      componentChangeCounts: {},
    };
  }
  
  const componentChangeCounts: Record<string, number> = {};
  for (const [component, history] of Array.from(state.components.entries())) {
    componentChangeCounts[component] = history.changes.length;
  }
  
  return {
    totalChanges: state.totalChanges,
    indecisiveComponents: [...state.indecisiveComponents],
    componentChangeCounts,
  };
}

const componentHistoryExports = {
  trackComponentChange,
  checkForIndecision,
  getComponentHistories,
  getCurrentComponentValues,
  clearIndecision,
  clearConversationState,
  getChangesSummary,
  getOrCreateState,
};

export default componentHistoryExports;
