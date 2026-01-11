import { STRATEGY_ANIMATION_PROMPT } from '@/components/strategy-animation/claude-prompt';

/**
 * Prompt Manager for Dynamic Claude Prompts
 * 
 * Handles conditional injection of animation prompts based on conversation state.
 * Per user decision: Only inject animation prompt AFTER enough strategy clarity.
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
 * @param basePrompt - The core strategy parsing system prompt
 * @param messages - Conversation history
 * @returns Combined system prompt (possibly with animation instructions)
 */
export function getSystemPrompt(
  basePrompt: string,
  messages: { role: string; content: string }[]
): string {
  if (shouldInjectAnimationPrompt(messages)) {
    return `${basePrompt}\n\n${STRATEGY_ANIMATION_PROMPT}`;
  }
  return basePrompt;
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
