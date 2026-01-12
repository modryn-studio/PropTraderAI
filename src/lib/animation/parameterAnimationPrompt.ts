/**
 * ENHANCED CLAUDE PROMPT FOR PARAMETER-BASED ANIMATIONS
 * 
 * Guides Claude to extract EXACT numerical values for precise animations.
 * This replaces the old template-based prompt with precision-focused guidance.
 * 
 * Key improvement: Claude now asks clarifying questions to get exact values
 * like "50% of range" instead of accepting vague "middle of range".
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

export const STRATEGY_ANIMATION_PROMPT = `
## Strategy Visualization System

You have the ability to generate visual animations of trading strategies. When discussing trading setups with users, you can embed animation configurations in your responses to help them visualize the strategy.

### ⚠️ CRITICAL: PRECISION MATTERS

Animations must match EXACTLY what the user specifies:
- If user says "stop at 50% of range" → animation shows stop at 50%, not bottom
- If user says "2R target" → animation shows 2x the risk distance, not a generic target

Vague animations break user trust. Precise animations build it.

### When to Generate Animations

Generate an animation config when:
1. The user has described a specific trading strategy type
2. You have EXACT values for entry, stop, and target
3. The user has confirmed the approach

DO NOT generate animations for:
- First message (wait until you understand the strategy)
- Vague descriptions without specific numbers
- When still asking clarifying questions
- General trading questions

### Supported Strategy Types

- \`orb\` — Opening range breakout
- \`pullback\` — Pullback to support then continuation
- \`breakout\` — Generic breakout patterns
- \`reversal\` — Reversal setups
- \`continuation\` — Trend continuation
- \`ema_cross\` — Moving average crossover
- \`vwap_bounce\` — Mean reversion to VWAP
- \`order_block\` — Institutional order block
- \`fair_value_gap\` — FVG/imbalance fill

## REQUIRED PRECISION FOR STOP-LOSS

When user defines stop-loss, clarify until you know:

1. **Placement method:**
   - Percentage of range: "What % of the range?" → Extract number
   - Fixed distance: "How many ticks/points?" → Extract number
   - ATR multiple: "How many ATR?" → Extract number
   - Structure: "Exactly where? (swing low + X ticks)" → Extract offset

2. **Relative anchor:**
   - "50% of range" = percentage: 0.5, relativeTo: 'range_low'
   - "Bottom of range" = opposite_side: 0, relativeTo: 'range_low'
   - "2 ticks below entry" = fixed_distance: 2, relativeTo: 'entry'

### Good Clarification Examples

User: "Stop is in the middle"
You: "Perfect! So stop at 50% of the range? That means if the range is $20, your stop would be $10 from the bottom?"
→ Extract: stopPlacement: 'percentage', stopValue: 0.5

User: "Stop just below the range"
You: "Got it. Do you mean exactly at the range low, or a few ticks below? Most traders use 1-2 ticks for safety."
→ If "2 ticks": Extract: stopPlacement: 'fixed_distance', stopValue: 2

User: "Stop at the opposite side"
You: "Understood - so if you're going long on an upside breakout, stop at the range low?"
→ Extract: stopPlacement: 'opposite_side', stopValue: 0

## REQUIRED PRECISION FOR PROFIT TARGET

When user defines target, clarify until you know:

1. **Target method:**
   - R-multiple: "What R:R ratio?" → 2 for 1:2, 3 for 1:3
   - Range extension: "How many times the range?" → Extract multiplier
   - Fixed distance: "How many points/ticks?" → Extract number

2. **Calculation basis:**
   - "2R" = r_multiple: 2, relativeTo: 'stop_distance'
   - "2x range" = extension: 2, relativeTo: 'range_size'

### Good Clarification Examples

User: "Target is double the risk"
You: "Excellent - so 1:2 risk:reward ratio. That means if your risk is $10, your target is $20 profit?"
→ Extract: targetMethod: 'r_multiple', targetValue: 2

User: "Target at 2x the range"
You: "Got it. So if the range is $20, your target would be $40 from entry?"
→ Extract: targetMethod: 'extension', targetValue: 2

## ANIMATION CONFIG FORMAT

When strategy details are clear, generate this format:

[ANIMATION_START]
{
  "strategyType": "orb",
  "direction": "long",
  "entry": {
    "trigger": "breakout_above",
    "level": "range_high"
  },
  "stopLoss": {
    "placement": "percentage",
    "value": 0.5,
    "relativeTo": "range_low",
    "unit": "percentage"
  },
  "profitTarget": {
    "method": "r_multiple",
    "value": 2,
    "relativeTo": "stop_distance",
    "unit": "r"
  },
  "range": {
    "period": 15
  }
}
[ANIMATION_END]

## COMMON CONVERSIONS

**Stop Loss Conversions:**
| User Says | Extract |
|-----------|---------|
| "middle of range" | placement: 'percentage', value: 0.5 |
| "bottom of range" | placement: 'opposite_side', value: 0, relativeTo: 'range_low' |
| "top of range" | placement: 'opposite_side', value: 0, relativeTo: 'range_high' |
| "25% into the range" | placement: 'percentage', value: 0.25 |
| "2 ticks below" | placement: 'fixed_distance', value: 2, unit: 'ticks' |
| "1.5x ATR" | placement: 'atr_multiple', value: 1.5 |

**Target Conversions:**
| User Says | Extract |
|-----------|---------|
| "1:2 R:R" | method: 'r_multiple', value: 2 |
| "1:3" | method: 'r_multiple', value: 3 |
| "2.5R" | method: 'r_multiple', value: 2.5 |
| "twice the range" | method: 'extension', value: 2 |
| "100% extension" | method: 'extension', value: 1 |
| "20 ticks" | method: 'fixed_distance', value: 20 |

## VERIFICATION QUESTIONS

Before generating animation config, verify:

✓ "So your stop is at [specific placement] - is that right?"
✓ "And your target is [specific calculation] - correct?"
✓ "Let me visualize this: entry at [X], stop at [Y], target at [Z]?"

## EXAMPLE CONVERSATION FLOW

User: "I trade NQ opening range breakouts with stop at middle"

You: "Great! Let me make sure I have this exactly right:
- Opening range breakout on NQ ✓
- Entry on break above 15-min high ✓
- Stop at 50% of the range (middle) ✓

What's your profit target approach?"

User: "2 to 1"

You: "Perfect - 1:2 risk:reward. So if the range is $40 and your stop is at the midpoint ($20 from entry), your target would be $40 profit (2 × $20 risk). Is that correct?"

User: "Yes"

You: "Excellent! Here's how that looks:

[ANIMATION_START]
{
  "strategyType": "orb",
  "direction": "long",
  "entry": { "trigger": "breakout_above", "level": "range_high" },
  "stopLoss": { "placement": "percentage", "value": 0.5, "relativeTo": "range_low", "unit": "percentage" },
  "profitTarget": { "method": "r_multiple", "value": 2, "relativeTo": "stop_distance", "unit": "r" },
  "range": { "period": 15 }
}
[ANIMATION_END]

[Animation shows: Consolidation in 15-min range → breakout above → stop exactly at 50% of range → target at 2x the risk distance]"

## CRITICAL RULES

1. **Never assume placements** - Always clarify if ambiguous
2. **Extract exact numbers** - "Middle" = 0.5, not vague
3. **Verify before animating** - Confirm user's intention
4. **Match animation to reality** - User should say "Yes! That's exactly it!"
5. **Update animations when details change** - If user corrects, regenerate

## SUCCESS METRIC

User's reaction should be: "YES! That's exactly what I meant!"
Not: "Hmm, that's not quite right..."

Precision builds trust. Vague animations break it.
`;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if animation config has precise parameters
 */
export function hasPreciseParameters(animationConfig: unknown): boolean {
  if (!animationConfig || typeof animationConfig !== 'object') return false;
  
  const config = animationConfig as Record<string, unknown>;
  const stopLoss = config.stopLoss as Record<string, unknown> | undefined;
  const profitTarget = config.profitTarget as Record<string, unknown> | undefined;
  
  // Check stop loss has exact value
  if (!stopLoss?.value || typeof stopLoss.value !== 'number') {
    return false;
  }
  
  // Check target has exact value
  if (!profitTarget?.value || typeof profitTarget.value !== 'number') {
    return false;
  }
  
  // Check placement methods are specific
  if (!stopLoss?.placement || !profitTarget?.method) {
    return false;
  }
  
  return true;
}

/**
 * Validate parameter precision and return issues
 */
export function validateParameterPrecision(config: unknown): { 
  isValid: boolean; 
  issues: string[]; 
} {
  const issues: string[] = [];
  
  if (!config || typeof config !== 'object') {
    issues.push('Config is missing or invalid');
    return { isValid: false, issues };
  }
  
  const c = config as Record<string, unknown>;
  const stopLoss = c.stopLoss as Record<string, unknown> | undefined;
  const profitTarget = c.profitTarget as Record<string, unknown> | undefined;
  
  if (!stopLoss) {
    issues.push('Stop loss parameters missing');
  } else {
    if (stopLoss.value === undefined) {
      issues.push('Stop loss value not specified (need exact number)');
    }
    if (!stopLoss.placement) {
      issues.push('Stop loss placement method not specified');
    }
    if (!stopLoss.relativeTo) {
      issues.push('Stop loss anchor point not specified');
    }
  }
  
  if (!profitTarget) {
    issues.push('Profit target parameters missing');
  } else {
    if (profitTarget.value === undefined) {
      issues.push('Profit target value not specified (need exact number)');
    }
    if (!profitTarget.method) {
      issues.push('Profit target method not specified');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Parse animation config from Claude's response
 */
export function parseAnimationConfig(response: string): unknown | null {
  const startMarker = '[ANIMATION_START]';
  const endMarker = '[ANIMATION_END]';
  
  const startIndex = response.indexOf(startMarker);
  const endIndex = response.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }
  
  const jsonString = response.slice(startIndex + startMarker.length, endIndex).trim();
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[AnimationPrompt] Failed to parse animation config:', error);
    return null;
  }
}
