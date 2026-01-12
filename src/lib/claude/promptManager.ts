import { STRATEGY_ANIMATION_PROMPT } from '@/lib/animation';
import { REQUIRED_COMPONENTS } from '@/lib/strategy/strategyValidator';
import { 
  TradingIntelligenceSkill, 
  type IntelligenceMetadata 
} from '@/lib/trading';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

/**
 * Prompt Manager for Dynamic Claude Prompts
 * 
 * ENHANCED with Professional Trading Intelligence System.
 * 
 * Handles conditional injection of:
 * 1. Trading intelligence (professional knowledge, phase detection, error catching)
 * 2. Animation prompts (after enough strategy clarity)
 * 3. Validation context (when strategy is incomplete - based on message analysis)
 */

/**
 * Indicators that suggest we have enough strategy clarity
 * to request animation generation
 */
interface StrategyClarity {
  hasDirection: boolean;        // Long, short, or both
  hasEntryCondition: boolean;   // Some form of entry trigger
  hasTimeframe: boolean;        // Scalp, swing, day trade
  hasInstrument: boolean;       // Futures contract mentioned
}

/**
 * Required component detection from conversation
 * Maps to the 5 required professional strategy components
 */
interface RequiredComponentsDetected {
  hasEntry: boolean;
  hasStopLoss: boolean;
  hasProfitTarget: boolean;
  hasPositionSizing: boolean;
  hasInstrument: boolean;
}

/**
 * Analyze messages for the 5 required strategy components
 * Used for validation context injection
 */
export function analyzeRequiredComponents(messages: { role: string; content: string }[]): RequiredComponentsDetected {
  const allContent = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => m.content.toLowerCase())
    .join(' ');

  return {
    hasEntry: /\b(entry|enter|trigger|when\s+.*\s+break|pullback|cross|setup|open\s+position)\b/.test(allContent),
    hasStopLoss: /\b(stop\s*loss|stop|stoploss|sl|risk.*tick|tick.*risk|below\s+.*\s+entry|exit.*loss)\b/.test(allContent),
    hasProfitTarget: /\b(target|take\s*profit|tp|profit\s*target|risk.*reward|r:r|1:2|2:1|exit.*profit)\b/.test(allContent),
    hasPositionSizing: /\b(position\s*size|size|contracts?|risk\s*%|risk\s*percent|1%|2%|risk\s*per\s*trade)\b/.test(allContent),
    hasInstrument: /\b(es|nq|nasdaq|s&p|spx|emini|e-mini|micro|mes|mnq|futures|contract)\b/.test(allContent),
  };
}

/**
 * Detect common mistakes in strategy language
 */
function detectCommonMistakes(messages: { role: string; content: string }[]): string[] {
  const allContent = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');
  
  const warnings: string[] = [];
  
  // Vague entry criteria
  if (/when.*looks good|depends|maybe|probably/.test(allContent)) {
    warnings.push('⚠️ Vague Language Detected: Avoid terms like "looks good", "maybe", "probably". Be specific with measurable criteria.');
  }
  
  return warnings;
}

/**
 * Generate validation context prompt based on missing components
 */
function generateValidationContext(components: RequiredComponentsDetected, messages: { role: string; content: string }[]): string {
  const missing: string[] = [];
  
  if (!components.hasEntry) {
    missing.push(`- ${REQUIRED_COMPONENTS.entry.name}: ${REQUIRED_COMPONENTS.entry.examples.join(', ')}`);
  }
  if (!components.hasStopLoss) {
    missing.push(`- ${REQUIRED_COMPONENTS.stopLoss.name}: ${REQUIRED_COMPONENTS.stopLoss.examples.join(', ')}`);
  }
  if (!components.hasProfitTarget) {
    missing.push(`- ${REQUIRED_COMPONENTS.profitTarget.name}: ${REQUIRED_COMPONENTS.profitTarget.examples.join(', ')}`);
  }
  if (!components.hasPositionSizing) {
    missing.push(`- ${REQUIRED_COMPONENTS.positionSizing.name}: ${REQUIRED_COMPONENTS.positionSizing.examples.join(', ')}`);
  }
  if (!components.hasInstrument) {
    missing.push(`- ${REQUIRED_COMPONENTS.instrument.name}: ${REQUIRED_COMPONENTS.instrument.examples.join(', ')}`);
  }
  
  // Check for common mistakes
  const mistakes = detectCommonMistakes(messages);
  
  if (missing.length === 0 && mistakes.length === 0) {
    return ''; // All components present and no mistakes
  }
  
  const completedCount = 5 - missing.length;
  const completionPercent = Math.round((completedCount / 5) * 100);
  
  let context = '';
  
  if (missing.length > 0) {
    context = `
[VALIDATION CONTEXT - ${completionPercent}% Complete]
The strategy is missing these required components. Guide the user to define them:
${missing.join('\n')}

Focus on the FIRST missing component. Be direct and specific. One question at a time.
`;
  }
  
  if (mistakes.length > 0) {
    context += `\n${mistakes.join('\n')}\n`;
  }
  
  return context;
}

/**
 * Analyze messages to determine if we have enough strategy clarity
 * 
 * This is a heuristic check - we look for keywords that suggest
 * the conversation has covered core strategy elements.
 */
export function analyzeStrategyClarity(messages: { role: string; content: string }[]): StrategyClarity {
  const allContent = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => m.content.toLowerCase())
    .join(' ');

  return {
    hasDirection: /\b(long|short|buy|sell|bullish|bearish)\b/.test(allContent),
    hasEntryCondition: /\b(entry|enter|trigger|when|if|break|cross|pullback|bounce|setup)\b/.test(allContent),
    hasTimeframe: /\b(scalp|swing|day\s*trade|position|1\s*min|5\s*min|15\s*min|1\s*hour|4\s*hour|daily)\b/.test(allContent),
    hasInstrument: /\b(es|nq|nasdaq|s&p|spx|emini|e-mini|micro|mes|mnq|futures|contract)\b/.test(allContent),
  };
}

/**
 * Determine if we should inject animation prompt
 * 
 * Criteria: At least 3 of 4 clarity indicators should be true
 * AND we should have at least 2 back-and-forth exchanges
 */
export function shouldInjectAnimationPrompt(
  messages: { role: string; content: string }[]
): boolean {
  // Need at least 4 messages (2 exchanges)
  if (messages.length < 4) {
    return false;
  }

  const clarity = analyzeStrategyClarity(messages);
  const clarityCount = [
    clarity.hasDirection,
    clarity.hasEntryCondition,
    clarity.hasTimeframe,
    clarity.hasInstrument,
  ].filter(Boolean).length;

  // Require at least 3 of 4 clarity indicators
  return clarityCount >= 3;
}

/**
 * Get the appropriate system prompt based on conversation state
 * 
 * ENHANCED: Now includes Professional Trading Intelligence System
 * 
 * @param basePrompt - The core strategy parsing system prompt
 * @param messages - Conversation history
 * @param rules - Optional accumulated strategy rules (if available from frontend)
 * @returns Combined system prompt with trading intelligence, validation, and animation context
 */
export function getSystemPrompt(
  basePrompt: string,
  messages: { role: string; content: string }[],
  rules?: StrategyRule[]
): string {
  // Get last user message for focus detection
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop()?.content || '';
  
  // Use provided rules or empty array
  const strategyRules = rules || [];
  
  // PHASE 1: Inject Trading Intelligence (enhanced contextual prompt)
  // This replaces our old validation context with professional trading knowledge
  let prompt = TradingIntelligenceSkill.generateSystemPrompt(
    strategyRules,
    lastUserMessage,
    basePrompt
  );
  
  // PHASE 2: Inject legacy validation context if no rules provided
  // (backwards compatibility - will be phased out once rules are passed)
  if (!rules || rules.length === 0) {
    const components = analyzeRequiredComponents(messages);
    const validationContext = generateValidationContext(components, messages);
    
    if (validationContext) {
      prompt = `${prompt}\n\n${validationContext}`;
    }
  }
  
  // PHASE 3: Inject animation prompt after enough clarity
  if (shouldInjectAnimationPrompt(messages)) {
    prompt = `${prompt}\n\n${STRATEGY_ANIMATION_PROMPT}`;
  }
  
  return prompt;
}

/**
 * Get intelligence metadata for behavioral logging
 * 
 * Call this alongside getSystemPrompt to log what intelligence was provided
 */
export function getIntelligenceMetadata(
  messages: { role: string; content: string }[],
  rules?: StrategyRule[]
): IntelligenceMetadata {
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop()?.content || '';
  
  return TradingIntelligenceSkill.getIntelligenceMetadata(
    rules || [],
    lastUserMessage
  );
}

/**
 * Check if the latest message warrants animation generation
 * 
 * Call this before streaming to decide if we should look for
 * animation config in the response.
 */
export function shouldExpectAnimation(
  messages: { role: string; content: string }[]
): boolean {
  return shouldInjectAnimationPrompt(messages);
}
