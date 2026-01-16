/**
 * PARSE USER INTENT (Rapid Flow)
 * 
 * Simplified Claude parsing for Phase 1 generate-first flow.
 * Returns structured strategy components WITHOUT full rule extraction.
 * 
 * This is lighter-weight than parse-stream's two-pass architecture.
 * We just need enough to:
 * 1. Detect pattern
 * 2. Detect instrument
 * 3. Extract stop loss (if mentioned)
 * 4. Extract entry/exit mentions
 */

import { createAnthropicClient } from '@/lib/claude/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedIntent {
  /** Detected pattern (opening_range_breakout, pullback, scalp, etc) */
  pattern: string | null;
  
  /** Detected instrument (ES, NQ, YM, etc) */
  instrument: string | null;
  
  /** Entry description if mentioned */
  entry: string | null;
  
  /** Direction (long, short, both) */
  direction: 'long' | 'short' | 'both' | null;
  
  /** Stop loss if explicitly mentioned */
  stopLoss: string | null;
  
  /** Target/exit if mentioned */
  target: string | null;
  
  /** Session/time if mentioned */
  session: string | null;
  
  /** Raw rules array (minimal) */
  rules: Array<{
    type: string;
    value: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

// ============================================================================
// PROMPT
// ============================================================================

const RAPID_PARSE_PROMPT = `You are a trading strategy parser. Extract key components from the user's strategy description.

Return ONLY valid JSON with this EXACT structure (no markdown, no code blocks):

{
  "pattern": "opening_range_breakout" | "pullback" | "scalping" | "breakout" | "reversal" | null,
  "instrument": "ES" | "NQ" | "YM" | "RTY" | null,
  "entry": "description of entry condition" | null,
  "direction": "long" | "short" | "both" | null,
  "stopLoss": "description of stop loss" | null,
  "target": "description of target/exit" | null,
  "session": "description of time/session" | null,
  "rules": [
    {"type": "entry", "value": "...", "confidence": "high"},
    {"type": "exit", "value": "...", "confidence": "medium"}
  ]
}

PATTERN DETECTION RULES:
- "opening range", "orb", "first 15 min" → opening_range_breakout
- "pullback", "retracement", "ema" → pullback
- "scalp", "quick", "1-2 points" → scalping
- "breakout" (not opening range) → breakout
- "reversal", "fade", "counter" → reversal

EXAMPLES:

User: "ES opening range breakout"
{
  "pattern": "opening_range_breakout",
  "instrument": "ES",
  "entry": "opening range breakout",
  "direction": null,
  "stopLoss": null,
  "target": null,
  "session": null,
  "rules": [
    {"type": "entry", "value": "opening range breakout", "confidence": "high"}
  ]
}

User: "NQ pullback to 20 EMA with 10 tick stop"
{
  "pattern": "pullback",
  "instrument": "NQ",
  "entry": "pullback to 20 EMA",
  "direction": null,
  "stopLoss": "10 ticks",
  "target": null,
  "session": null,
  "rules": [
    {"type": "entry", "value": "pullback to 20 EMA", "confidence": "high"},
    {"type": "stop_loss", "value": "10 ticks", "confidence": "high"}
  ]
}

User: "I trade breakouts during NY session"
{
  "pattern": "breakout",
  "instrument": null,
  "entry": "breakouts",
  "direction": null,
  "stopLoss": null,
  "target": null,
  "session": "NY session",
  "rules": [
    {"type": "entry", "value": "breakouts", "confidence": "medium"},
    {"type": "session", "value": "NY session", "confidence": "high"}
  ]
}

IMPORTANT:
- Only extract what's explicitly mentioned
- Don't infer or add defaults
- Use null for missing components
- Keep "value" fields as natural language (we parse separately)
- Pattern names must match the enum exactly`;

// ============================================================================
// MAIN PARSER
// ============================================================================

export async function parseUserIntent(message: string): Promise<ParsedIntent> {
  try {
    const client = createAnthropicClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0, // Deterministic parsing
      messages: [
        {
          role: 'user',
          content: `${RAPID_PARSE_PROMPT}

User message: "${message}"

Return ONLY the JSON object (no markdown, no code blocks).`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Parse Claude's response
    const text = content.text.trim();
    
    // Remove markdown code blocks if present
    const jsonText = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    
    const parsed = JSON.parse(jsonText) as ParsedIntent;

    return parsed;
  } catch (error) {
    console.error('Error parsing user intent:', error);
    
    // Fallback: Return minimal structure
    return {
      pattern: null,
      instrument: null,
      entry: message, // Preserve original message
      direction: null,
      stopLoss: null,
      target: null,
      session: null,
      rules: [
        {
          type: 'entry',
          value: message,
          confidence: 'low',
        },
      ],
    };
  }
}

// ============================================================================
// HELPER: Detect Pattern from Text (Fallback)
// ============================================================================

/**
 * Fallback pattern detection if Claude doesn't identify it
 */
export function detectPatternFromText(text: string): string | null {
  const message = text.toLowerCase();

  // Opening Range Breakout
  if (
    message.includes('opening range') ||
    message.includes('orb') ||
    message.includes('first 15') ||
    message.includes('first fifteen')
  ) {
    return 'opening_range_breakout';
  }

  // Pullback
  if (
    message.includes('pullback') ||
    message.includes('retracement') ||
    message.includes('pull back') ||
    (message.includes('ema') && (message.includes('back') || message.includes('bounce')))
  ) {
    return 'pullback';
  }

  // Scalping
  if (
    message.includes('scalp') ||
    message.includes('quick') ||
    message.includes('1-2 point') ||
    message.includes('tick scalp')
  ) {
    return 'scalping';
  }

  // Breakout (general)
  if (message.includes('breakout') && !message.includes('opening range')) {
    return 'breakout';
  }

  // Reversal
  if (
    message.includes('reversal') ||
    message.includes('fade') ||
    message.includes('counter')
  ) {
    return 'reversal';
  }

  return null;
}
