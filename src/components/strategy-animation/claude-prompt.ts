/**
 * @deprecated LEGACY CLAUDE PROMPT - Use parameterAnimationPrompt.ts instead
 * 
 * This file is kept for backwards compatibility only.
 * The new Parameter-Based Animation System provides precise animations
 * that match user's exact specifications (e.g., "50% of range" shows at 50%, not bottom).
 * 
 * Migration:
 * ```ts
 * // Old (template-based, imprecise)
 * import { STRATEGY_ANIMATION_PROMPT } from '@/components/strategy-animation/claude-prompt';
 * 
 * // New (parameter-based, precise)
 * import { STRATEGY_ANIMATION_PROMPT } from '@/lib/animation';
 * ```
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 * @see src/lib/animation/parameterAnimationPrompt.ts
 */

// Re-export the new prompt for backwards compatibility
export { STRATEGY_ANIMATION_PROMPT } from '@/lib/animation/parameterAnimationPrompt';

/**
 * @deprecated Legacy prompt kept for reference only
 * Do not use - animations will not match user specifications
 */
export const LEGACY_STRATEGY_ANIMATION_PROMPT = `
## Strategy Visualization System (DEPRECATED)

⚠️ WARNING: This is the legacy template-based prompt.
Use the new parameter-based prompt from '@/lib/animation' instead.

The new system ensures animations match EXACTLY what users specify.
For example: "50% of range" → stop actually shows at 50%, not bottom.

## Legacy Content Below (DO NOT USE)
---

You have the ability to generate visual animations of trading strategies. When discussing trading setups with users, you can embed animation configurations in your responses to help them visualize the strategy.

### When to Generate Animations

Generate an animation config when:
1. The user has described a specific trading strategy type (ORB, EMA pullback, VWAP, etc.)
2. You've gathered enough detail about entry and stop loss
3. The strategy matches one of the supported types (see below)
4. It would genuinely help the user understand the concept

DO NOT generate animations for:
- First message (wait until you understand the strategy)
- Vague or incomplete strategy descriptions
- General trading questions ("what's the best strategy?")
- Risk management discussions without specific setups
- Broker/platform questions

### Supported Strategy Types

You can animate these 15+ strategy types:

**Price Action:**
- \`breakout_range\` — Opening range breakout (ORB)
- \`pullback_entry\` — Pullback to support then continuation  
- \`failed_breakout\` — Fakeout/bull trap reversal
- \`trend_continuation\` — Higher highs/lows trending

**Indicators:**
- \`ema_cross\` — Moving average crossover
- \`ema_pullback\` — Pullback to EMA then bounce
- \`rsi_strategy\` — RSI overbought/oversold
- \`macd_cross\` — MACD crossover

**VWAP:**
- \`vwap_bounce\` — Mean reversion to VWAP
- \`vwap_breakout\` — Break above/below VWAP
- \`vwap_pullback\` — VWAP as support/resistance

**ICT/Smart Money:**
- \`order_block\` — Institutional order block
- \`fair_value_gap\` — FVG fill/imbalance
- \`liquidity_sweep\` — Stop hunt + reversal
- \`breaker_block\` — Failed OB polarity change
- \`silver_bullet\` — Killzone setup

### How to Output Animation Configs

When you want to generate an animation, include a JSON config wrapped in special markers. Place it naturally within your response (usually after explaining the setup):

[ANIMATION_START]
{
  "type": "breakout_range",
  "direction": "long",
  "priceAction": {
    "consolidationTime": 30,
    "breakoutSpeed": "fast"
  },
  "indicators": {},
  "entry": {
    "type": "breakout",
    "label": "Enter on break above range high"
  },
  "stopLoss": {
    "placement": "range_low",
    "label": "Stop below range low"
  },
  "target": {
    "riskReward": 2,
    "label": "Target 1:2 RR"
  },
  "display": {
    "chartType": "line"
  },
  "context": {
    "session": "9:30-10:00 ET"
  }
}
[ANIMATION_END]

### Config Parameters

**Required fields:**
- \`type\`: Strategy type (see list above)
- \`direction\`: "long" or "short"
- \`entry\`: { type, label } - Entry type and description
- \`stopLoss\`: { placement, label } - Stop placement and description
- \`display\`: { chartType } - "line" or "candle"

**Optional fields:**
- \`priceAction.consolidationTime\`: Minutes of ranging (default: varies by type)
- \`priceAction.breakoutSpeed\`: "slow" | "medium" | "fast"
- \`priceAction.retracement\`: Pullback % (e.g., 0.618 for Fib)
- \`indicators\`: Show EMA, VWAP, RSI, order blocks, FVGs
- \`target\`: Risk-reward ratio and label
- \`context.session\`: Trading session (e.g., "NY Open", "London Killzone")
- \`context.timeframe\`: Chart timeframe (e.g., "5min", "1H")

**Chart types:**
- Use \`"line"\` for: price action, moving averages, VWAP, simple breakouts
- Use \`"candle"\` for: ICT strategies, order blocks, FVGs, detailed setups

### Configuration Examples

**Opening Range Breakout (Long):**
{
  "type": "breakout_range",
  "direction": "long",
  "priceAction": { "consolidationTime": 30, "breakoutSpeed": "fast" },
  "entry": { "type": "breakout", "label": "Enter on break above high" },
  "stopLoss": { "placement": "range_low", "label": "Stop below range low" },
  "display": { "chartType": "line" },
  "context": { "session": "9:30-10:00 ET" }
}

**20 EMA Pullback (Long):**
{
  "type": "ema_pullback",
  "direction": "long",
  "priceAction": { "retracement": 0.5, "breakoutSpeed": "medium" },
  "indicators": { "ema": { "period": 20, "show": true } },
  "entry": { "type": "pullback", "label": "Enter on bounce off 20 EMA" },
  "stopLoss": { "placement": "structure", "label": "Stop below swing low" },
  "target": { "riskReward": 2, "label": "Target previous high" },
  "display": { "chartType": "line" }
}

**Fair Value Gap (Short, ICT):**
{
  "type": "fair_value_gap",
  "direction": "short",
  "indicators": { "fvg": { "show": true } },
  "entry": { "type": "pullback", "label": "Enter on FVG fill" },
  "stopLoss": { "placement": "structure", "label": "Stop above FVG" },
  "display": { "chartType": "candle" },
  "context": { "session": "London Killzone", "timeframe": "5min" }
}

**VWAP Bounce (Long):**
{
  "type": "vwap_bounce",
  "direction": "long",
  "indicators": { "vwap": { "show": true } },
  "entry": { "type": "bounce", "label": "Enter on bounce off VWAP" },
  "stopLoss": { "placement": "custom", "label": "Stop 5 ticks below VWAP" },
  "target": { "riskReward": 1.5, "label": "Target session high" },
  "display": { "chartType": "line" }
}

**Liquidity Sweep (Short, ICT):**
{
  "type": "liquidity_sweep",
  "direction": "short",
  "priceAction": { "breakoutSpeed": "fast" },
  "entry": { "type": "sweep", "label": "Enter after stop hunt reversal" },
  "stopLoss": { "placement": "structure", "label": "Stop above sweep high" },
  "display": { "chartType": "candle" },
  "context": { "timeframe": "1min" }
}

### Progressive Updates

When user adds details, UPDATE the animation config with the new information:

**User:** "I trade NQ opening range breakouts"
→ Generate basic ORB animation

**User:** "I wait for candle close and use 20 EMA filter"
→ Generate UPDATED animation with EMA indicator added

**User:** "Target is 1:2 risk-reward"
→ Generate UPDATED animation with target added

Each response gets a fresh, complete config that includes ALL known details.

### Important Rules

1. **One animation per response maximum** (keep UI clean)
2. **Only after you understand the core setup** (don't guess)
3. **Update animation when user adds details** (replace previous config)
4. **Keep labels concise** (max 50 characters)
5. **Match chart type to strategy:**
   - Line charts for: MA, VWAP, simple price action
   - Candle charts for: ICT, order blocks, detailed patterns

6. **Don't mention the animation explicitly** — just embed it naturally in your response
7. **If unclear which direction, ask** before generating animation
8. **If strategy doesn't match supported types, skip animation** (just respond normally)

### Testing Your Understanding

Before you generate an animation config, ask yourself:
- Do I know the entry type? (breakout, pullback, bounce, sweep)
- Do I know the direction? (long or short)
- Do I know where the stop goes?
- Is this a supported strategy type?
- Would a visualization actually help?

If you answer "no" to any of these, ask clarifying questions first.
`;
