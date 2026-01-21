/**
 * TOOL-CHOICE STRUCTURED EXTRACTION
 * 
 * Issue #49: Replace stateless regex detection with Claude tool-choice.
 * 
 * Problem: Regex-based gap detection is stateless. When user says "20 ticks" 
 * in message 2, the system forgets "ES" from message 1.
 * 
 * Solution: Use Anthropic's tool_choice: required for guaranteed structured extraction.
 * Claude preserves context across the conversation natively.
 * 
 * Benefits:
 * - Stateful: Claude remembers context across messages
 * - Single source of truth: One tool schema, not 1000+ lines of regex
 * - Self-correcting: Claude understands intent, not just keywords
 * 
 * @see Issue #49 comment 3778079702 - Architecture proposal
 */

import { createAnthropicClient } from '@/lib/claude/client';
import type Anthropic from '@anthropic-ai/sdk';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extracted strategy components from Claude tool-choice
 */
export interface ExtractedComponents {
  /** Detected instrument (ES, NQ, MES, MNQ, etc.) */
  instrument: string | null;
  /** Detected pattern type */
  pattern: 'opening_range_breakout' | 'ema_pullback' | 'breakout' | null;
  /** Stop loss value (e.g., "20 ticks", "below range low", "1 ATR") */
  stopLoss: string | null;
  /** Trade direction */
  direction: 'long' | 'short' | 'both' | null;
  /** Profit target value */
  profitTarget: string | null;
  /** Position sizing (e.g., "1 contract", "1% risk") */
  positionSizing: string | null;
  /** Trading session (e.g., "NY session", "9:30-11:30 ET") */
  session: string | null;
  /** Entry trigger description */
  entryTrigger: string | null;
}

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Result of extraction
 */
export interface ExtractionResult {
  components: ExtractedComponents;
  missingCritical: Array<keyof ExtractedComponents>;
  isComplete: boolean;
  conversationalResponse?: string;
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

const EXTRACT_STRATEGY_TOOL: Anthropic.Tool = {
  name: 'extract_strategy_components',
  description: `Extract trading strategy components from the conversation. 
Always call this tool to report what you've extracted so far.
Use null for any component that hasn't been explicitly mentioned or confirmed.
Preserve context from earlier messages - if instrument was mentioned before, include it.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      instrument: {
        type: ['string', 'null'],
        description: 'Trading instrument: ES, NQ, MES, MNQ, YM, RTY, CL, GC, etc. null if not mentioned.',
      },
      pattern: {
        type: ['string', 'null'],
        enum: ['opening_range_breakout', 'ema_pullback', 'breakout', null],
        description: 'Detected strategy pattern. null if unclear or not a supported pattern.',
      },
      stopLoss: {
        type: ['string', 'null'],
        description: 'Stop loss value as stated: "20 ticks", "below range low", "1 ATR", etc. null if not mentioned.',
      },
      direction: {
        type: ['string', 'null'],
        enum: ['long', 'short', 'both', null],
        description: 'Trade direction. null if not specified (defaults to both).',
      },
      profitTarget: {
        type: ['string', 'null'],
        description: 'Profit target value: "2R", "40 ticks", "1.5x range", etc. null if not mentioned.',
      },
      positionSizing: {
        type: ['string', 'null'],
        description: 'Position size: "1 contract", "2%", "1% risk per trade", etc. null if not mentioned.',
      },
      session: {
        type: ['string', 'null'],
        description: 'Trading session: "NY session", "9:30 AM - 11:30 AM ET", "first hour", etc. null if not mentioned.',
      },
      entryTrigger: {
        type: ['string', 'null'],
        description: 'Specific entry trigger: "break above range high", "pullback to 20 EMA", etc. null if not mentioned.',
      },
    },
    required: ['instrument', 'pattern', 'stopLoss', 'direction', 'profitTarget', 'positionSizing', 'session', 'entryTrigger'],
  },
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are extracting trading strategy components from a conversation.

CRITICAL RULES:
1. PRESERVE CONTEXT: If the user mentioned "ES" in message 1, include it even if message 2 is just "20 ticks"
2. EXTRACT LITERALLY: Use the user's exact phrasing for values, don't reinterpret
3. USE NULL: Only use null when something was NEVER mentioned in the entire conversation
4. NO DEFAULTS: Don't fill in reasonable defaults - only what's explicitly stated

CONTEXT PRESERVATION EXAMPLES:

Message 1: "ES opening range breakout"
Message 2: "20 ticks"
→ instrument: "ES" (from message 1, preserved)
→ pattern: "opening_range_breakout" (from message 1, preserved)  
→ stopLoss: "20 ticks" (from message 2)

Message 1: "I trade pullbacks to the 20 EMA on NQ"  
Message 2: "Below the swing low"
→ instrument: "NQ" (preserved from message 1)
→ pattern: "ema_pullback" (from message 1)
→ stopLoss: "Below the swing low" (from message 2)
→ entryTrigger: "pullback to 20 EMA" (from message 1)

PATTERN MAPPING:
- "opening range", "ORB", "range breakout" → "opening_range_breakout"
- "pullback", "EMA pullback", "retracement" → "ema_pullback"  
- "breakout", "break above/below" → "breakout"

Always call the extract_strategy_components tool with your analysis.`;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Extract strategy components using Claude tool-choice
 * 
 * Uses conversation history for context preservation.
 * Replaces stateless regex detection for follow-up messages.
 */
export async function extractWithToolChoice(
  conversationHistory: ConversationMessage[]
): Promise<ExtractionResult> {
  const anthropic = createAnthropicClient();
  
  try {
    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Add extraction request
    messages.push({
      role: 'user',
      content: 'Please extract the strategy components from our conversation so far.',
    });
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM_PROMPT,
      tools: [EXTRACT_STRATEGY_TOOL],
      tool_choice: { type: 'tool', name: 'extract_strategy_components' },
      messages,
    });
    
    // Find tool use block
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );
    
    if (!toolUse || toolUse.name !== 'extract_strategy_components') {
      console.error('[ToolChoiceExtraction] No tool use in response');
      return {
        components: createEmptyComponents(),
        missingCritical: ['instrument', 'stopLoss'],
        isComplete: false,
      };
    }
    
    const components = toolUse.input as ExtractedComponents;
    
    // Determine missing critical components
    const missingCritical: Array<keyof ExtractedComponents> = [];
    
    // Stop loss is always critical
    if (!components.stopLoss) {
      missingCritical.push('stopLoss');
    }
    
    // Instrument is critical
    if (!components.instrument) {
      missingCritical.push('instrument');
    }
    
    // Check if complete (has all critical components)
    const isComplete = missingCritical.length === 0;
    
    return {
      components,
      missingCritical,
      isComplete,
    };
    
  } catch (error) {
    console.error('[ToolChoiceExtraction] Error:', error);
    return {
      components: createEmptyComponents(),
      missingCritical: ['instrument', 'stopLoss'],
      isComplete: false,
    };
  }
}

/**
 * Create empty components object
 */
function createEmptyComponents(): ExtractedComponents {
  return {
    instrument: null,
    pattern: null,
    stopLoss: null,
    direction: null,
    profitTarget: null,
    positionSizing: null,
    session: null,
    entryTrigger: null,
  };
}

/**
 * Convert extracted components to StrategyRule array
 * 
 * Uses literal types for category to match StrategyRule interface
 */
export function componentsToRules(components: ExtractedComponents): StrategyRule[] {
  const rules: StrategyRule[] = [];
  
  if (components.instrument) {
    rules.push({
      category: 'setup',
      label: 'Instrument',
      value: components.instrument.toUpperCase(),
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.pattern) {
    const patternNames: Record<string, string> = {
      'opening_range_breakout': 'Opening Range Breakout',
      'ema_pullback': 'EMA Pullback',
      'breakout': 'Breakout',
    };
    rules.push({
      category: 'entry',
      label: 'Pattern',
      value: patternNames[components.pattern] || components.pattern,
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.entryTrigger) {
    rules.push({
      category: 'entry',
      label: 'Entry Trigger',
      value: components.entryTrigger,
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.stopLoss) {
    rules.push({
      category: 'exit',
      label: 'Stop Loss',
      value: components.stopLoss,
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.profitTarget) {
    rules.push({
      category: 'exit',
      label: 'Profit Target',
      value: components.profitTarget,
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.direction) {
    rules.push({
      category: 'entry',
      label: 'Direction',
      value: components.direction === 'long' ? 'Long' :
             components.direction === 'short' ? 'Short' : 'Both',
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.positionSizing) {
    rules.push({
      category: 'risk',
      label: 'Position Sizing',
      value: components.positionSizing,
      isDefaulted: false,
      source: 'user',
    });
  }
  
  if (components.session) {
    rules.push({
      category: 'timeframe',
      label: 'Session',
      value: components.session,
      isDefaulted: false,
      source: 'user',
    });
  }
  
  return rules;
}

/**
 * Determine which critical question to ask based on missing components
 */
export function getNextCriticalQuestion(
  missingCritical: Array<keyof ExtractedComponents>,
  pattern?: string | null
): {
  questionType: 'stopLoss' | 'instrument';
  question: string;
  options: Array<{ value: string; label: string; default?: boolean }>;
} | null {
  // Priority: stopLoss > instrument (most critical for risk management)
  
  if (missingCritical.includes('stopLoss')) {
    // Pattern-specific stop loss options
    if (pattern === 'opening_range_breakout') {
      return {
        questionType: 'stopLoss',
        question: 'How do you set your stop loss?',
        options: [
          { value: 'below_range', label: 'Below opening range low', default: true },
          { value: 'range_50', label: 'Middle of range (50%)' },
          { value: 'fixed_15', label: '15 ticks' },
          { value: 'fixed_20', label: '20 ticks' },
        ],
      };
    }
    
    if (pattern === 'ema_pullback') {
      return {
        questionType: 'stopLoss',
        question: 'How do you set your stop loss?',
        options: [
          { value: 'structure', label: 'Below recent swing low', default: true },
          { value: 'fixed_15', label: '15 ticks' },
          { value: 'atr_1', label: '1 ATR from entry' },
        ],
      };
    }
    
    // Generic options
    return {
      questionType: 'stopLoss',
      question: 'How do you set your stop loss?',
      options: [
        { value: 'structure', label: 'Below recent structure', default: true },
        { value: 'fixed_10', label: '10 ticks' },
        { value: 'fixed_20', label: '20 ticks' },
        { value: 'atr_1', label: '1 ATR from entry' },
      ],
    };
  }
  
  if (missingCritical.includes('instrument')) {
    return {
      questionType: 'instrument',
      question: 'Which instrument do you trade?',
      options: [
        { value: 'ES', label: 'ES (E-mini S&P 500)', default: true },
        { value: 'NQ', label: 'NQ (E-mini Nasdaq)' },
        { value: 'MES', label: 'MES (Micro E-mini S&P)' },
        { value: 'MNQ', label: 'MNQ (Micro E-mini Nasdaq)' },
      ],
    };
  }
  
  return null;
}
