import { AnimationConfig } from './taxonomy';

/**
 * ANIMATION CONFIG PARSER
 * 
 * Extracts and validates animation configs from Claude's responses.
 * Includes streaming-safe detection for mid-stream extraction.
 */

const START_MARKER = '[ANIMATION_START]';
const END_MARKER = '[ANIMATION_END]';

/**
 * Extracts animation config from Claude's response
 * 
 * Looks for configs wrapped in [ANIMATION_START] ... [ANIMATION_END] markers
 */
export function extractAnimationConfig(messageContent: string): AnimationConfig | null {
  const startIndex = messageContent.indexOf(START_MARKER);
  const endIndex = messageContent.indexOf(END_MARKER);
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }
  
  const jsonString = messageContent.substring(
    startIndex + START_MARKER.length,
    endIndex
  ).trim();
  
  try {
    const config = JSON.parse(jsonString) as AnimationConfig;
    
    // Validate required fields
    if (!validateAnimationConfig(config)) {
      console.error('[Animation] Invalid config structure:', config);
      return null;
    }
    
    return config;
  } catch (error) {
    console.error('[Animation] Failed to parse config JSON:', error);
    return null;
  }
}

/**
 * Validates an animation config has all required fields
 */
export function validateAnimationConfig(config: unknown): config is AnimationConfig {
  if (!config || typeof config !== 'object') return false;
  
  const c = config as Record<string, unknown>;
  
  // Required fields
  if (!c.type || typeof c.type !== 'string') return false;
  if (!c.direction || !['long', 'short'].includes(c.direction as string)) return false;
  
  // Entry validation
  if (!c.entry || typeof c.entry !== 'object') return false;
  const entry = c.entry as Record<string, unknown>;
  if (!entry.type || !entry.label) return false;
  
  // Stop loss validation
  if (!c.stopLoss || typeof c.stopLoss !== 'object') return false;
  const stopLoss = c.stopLoss as Record<string, unknown>;
  if (!stopLoss.placement || !stopLoss.label) return false;
  
  // Display validation
  if (!c.display || typeof c.display !== 'object') return false;
  const display = c.display as Record<string, unknown>;
  if (!display.chartType) return false;
  
  return true;
}

/**
 * Removes animation config from message content
 * (for displaying clean text to user)
 */
export function removeAnimationConfig(messageContent: string): string {
  const startIndex = messageContent.indexOf(START_MARKER);
  const endIndex = messageContent.indexOf(END_MARKER);
  
  if (startIndex === -1 || endIndex === -1) {
    return messageContent;
  }
  
  return (
    messageContent.substring(0, startIndex) +
    messageContent.substring(endIndex + END_MARKER.length)
  ).trim();
}

/**
 * Checks if message contains animation config
 */
export function hasAnimationConfig(messageContent: string): boolean {
  return (
    messageContent.includes(START_MARKER) &&
    messageContent.includes(END_MARKER)
  );
}

/**
 * Check if buffer contains complete animation config
 * Used for mid-stream extraction during SSE
 */
export function hasCompleteAnimationConfig(buffer: string): boolean {
  return (
    buffer.includes(START_MARKER) &&
    buffer.includes(END_MARKER)
  );
}

/**
 * Extract from incomplete buffer (streaming context)
 * Returns null if config not yet complete
 * 
 * This enables mid-stream animation extraction for magical UX
 * IMPORTANT: Hides partial animation markers during streaming to prevent visual flashing
 */
export function tryExtractFromStream(buffer: string): {
  config: AnimationConfig | null;
  cleanText: string;
  extractedSuccessfully: boolean;
} {
  // If animation markers are incomplete, hide them from display
  if (!hasCompleteAnimationConfig(buffer)) {
    // Check if we have a partial animation block being streamed
    const startIndex = buffer.indexOf(START_MARKER);
    if (startIndex !== -1) {
      // Hide everything from [ANIMATION_START] onwards (incomplete block)
      const cleanText = buffer.substring(0, startIndex).trimEnd();
      return { 
        config: null, 
        cleanText,
        extractedSuccessfully: false 
      };
    }
    
    // No animation markers at all - return full buffer
    return { 
      config: null, 
      cleanText: buffer,
      extractedSuccessfully: false 
    };
  }

  // Complete animation block - extract and clean
  const config = extractAnimationConfig(buffer);
  const cleanText = removeAnimationConfig(buffer);

  return { 
    config, 
    cleanText,
    extractedSuccessfully: config !== null
  };
}

/**
 * Merges new config with existing config
 * (for when Claude updates the animation as conversation progresses)
 */
export function mergeAnimationConfigs(
  existing: AnimationConfig,
  updates: Partial<AnimationConfig>
): AnimationConfig {
  return {
    ...existing,
    ...updates,
    priceAction: {
      ...existing.priceAction,
      ...updates.priceAction,
    },
    indicators: {
      ...existing.indicators,
      ...updates.indicators,
    },
    display: {
      ...existing.display,
      ...updates.display,
    },
    context: {
      ...existing.context,
      ...updates.context,
    },
    entry: updates.entry || existing.entry,
    stopLoss: updates.stopLoss || existing.stopLoss,
    target: updates.target || existing.target,
  };
}

/**
 * Get error type for Sentry logging
 */
export function getAnimationErrorType(error: unknown): string {
  if (error instanceof SyntaxError) return 'animation_config_parse_error';
  if (error instanceof TypeError) return 'animation_config_invalid';
  return 'animation_render_crash';
}
