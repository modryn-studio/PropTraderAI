/**
 * CONTEXTUAL TRADING INTELLIGENCE SYSTEM
 * 
 * Dynamically generates Claude prompts based on conversation context.
 * Uses the knowledge base to provide exactly the right information at the right time.
 * 
 * This ENHANCES the existing promptManager.ts, not replaces it.
 */

import { 
  ENTRY_TAXONOMY, 
  EXIT_TAXONOMY, 
  POSITION_SIZING_METHODS,
  COMMON_MISTAKES,
  PROP_FIRM_STANDARDS,
  type EntryType,
} from './tradingKnowledgeBase';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// CONVERSATION STATE DETECTION
// ============================================================================

export type ConversationPhase = 
  | 'initial'           // Just started
  | 'strategy_type'     // Identifying strategy approach
  | 'entry_definition'  // Defining entry criteria
  | 'stop_definition'   // Defining stop loss
  | 'target_definition' // Defining profit target
  | 'sizing_definition' // Defining position size
  | 'refinement'        // Adding filters, timeframes, etc.
  | 'validation'        // Checking completeness
  | 'complete';         // Strategy ready

export interface ConversationContext {
  phase: ConversationPhase;
  rules: StrategyRule[];
  lastUserMessage: string;
  missingComponents: string[];
  detectedIssues: string[];
}

/**
 * Detect what phase of strategy building we're in
 * 
 * ENHANCED: Merges with existing analyzeRequiredComponents logic from promptManager.ts
 */
export function detectConversationPhase(rules: StrategyRule[]): ConversationPhase {
  const hasEntry = rules.some(r => 
    r.category === 'entry' || 
    r.label.toLowerCase().includes('entry') ||
    r.label.toLowerCase().includes('trigger')
  );
  const hasStop = rules.some(r => 
    (r.label.toLowerCase().includes('stop') && !r.label.toLowerCase().includes('time')) ||
    r.label.toLowerCase().includes('sl')
  );
  const hasTarget = rules.some(r => 
    r.label.toLowerCase().includes('target') || 
    r.label.toLowerCase().includes('profit') ||
    r.label.toLowerCase().includes('tp')
  );
  const hasSize = rules.some(r => 
    r.label.toLowerCase().includes('position') || 
    r.label.toLowerCase().includes('size') ||
    r.label.toLowerCase().includes('risk') && r.value.includes('%')
  );
  const hasInstrument = rules.some(r =>
    r.label.toLowerCase().includes('instrument') ||
    r.label.toLowerCase().includes('symbol') ||
    /\b(es|nq|mes|mnq)\b/i.test(r.value)
  );
  
  if (rules.length === 0) return 'initial';
  if (!hasInstrument && rules.length < 2) return 'initial';
  if (!hasEntry) return 'entry_definition';
  if (!hasStop) return 'stop_definition';
  if (!hasTarget) return 'target_definition';
  if (!hasSize) return 'sizing_definition';
  if (hasEntry && hasStop && hasTarget && hasSize) return 'complete';
  
  return 'refinement';
}

/**
 * Detect what the user is currently trying to define
 */
export function detectCurrentFocus(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('entry') || lower.includes('trigger') || lower.includes('signal') || lower.includes('enter')) return 'entry';
  if ((lower.includes('stop') && !lower.includes('time')) || lower.includes('sl')) return 'stop';
  if (lower.includes('target') || lower.includes('profit') || lower.includes('take profit') || lower.includes('tp')) return 'target';
  if (lower.includes('size') || lower.includes('position') || lower.includes('contracts') || lower.includes('risk')) return 'sizing';
  if (lower.includes('timeframe') || lower.includes('chart') || lower.includes('min')) return 'timeframe';
  if (lower.includes('session') || lower.includes('hours') || lower.includes('rth')) return 'session';
  if (lower.includes('filter') || lower.includes('condition') || lower.includes('only')) return 'filters';
  
  return 'general';
}

/**
 * Detect entry type from text
 */
export function detectEntryType(text: string): EntryType | null {
  const lower = text.toLowerCase();
  
  // Check time-based FIRST (more specific - "opening range breakout" is time-based, not just breakout)
  if (lower.includes('opening range') || lower.includes('orb') || lower.includes('first ') || /\d+-min (high|low|range|break)/.test(lower)) {
    return 'timeBased';
  }
  if (lower.includes('breakout') || lower.includes('break above') || lower.includes('break below')) {
    return 'breakout';
  }
  if (lower.includes('pullback') || lower.includes('retest') || lower.includes('retrace') || lower.includes('retracement')) {
    return 'pullback';
  }
  if (lower.includes('reversal') || lower.includes('pivot') || lower.includes('exhaustion')) {
    return 'reversal';
  }
  if (lower.includes('continuation') || lower.includes('flag') || lower.includes('pennant')) {
    return 'continuation';
  }
  if (lower.includes('confirm') || lower.includes('signal') || lower.includes('indicator')) {
    return 'confirmation';
  }
  
  return null;
}

/**
 * Detect common mistakes in rules
 * 
 * ENHANCED: More sophisticated detection than existing promptManager version
 */
export function detectMistakes(rules: StrategyRule[]): string[] {
  const issues: string[] = [];
  
  // Check for vague entries
  const entryRules = rules.filter(r => r.category === 'entry');
  for (const rule of entryRules) {
    const text = rule.value.toLowerCase();
    if (COMMON_MISTAKES.vagueEntries.bad.some(bad => text.includes(bad.toLowerCase()))) {
      issues.push(`Vague entry: "${rule.value}". ${COMMON_MISTAKES.vagueEntries.fix}`);
    }
    // Additional vague patterns
    if (/when.*looks|feels|seems|probably|maybe/.test(text)) {
      issues.push(`Vague entry language: "${rule.value}". Get specific: what EXACTLY triggers entry?`);
    }
  }
  
  // Check for missing stop loss after entry is defined
  const hasEntry = rules.some(r => r.category === 'entry');
  const hasStop = rules.some(r => r.label.toLowerCase().includes('stop'));
  if (hasEntry && !hasStop && rules.length > 2) {
    issues.push(`No stop-loss defined. ${COMMON_MISTAKES.noStopLoss.professionalQuote}`);
  }
  
  // Check for excessive risk
  const riskRules = rules.filter(r => r.value.includes('%'));
  for (const rule of riskRules) {
    const match = rule.value.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match && parseFloat(match[1]) > 3) {
      issues.push(`Excessive risk: ${rule.value}. ${COMMON_MISTAKES.excessiveRisk.fix}`);
    }
  }
  
  // Check for poor risk:reward
  const targetRules = rules.filter(r => 
    r.label.toLowerCase().includes('target') || 
    r.label.toLowerCase().includes('profit')
  );
  for (const rule of targetRules) {
    if (/1:1|1 to 1|one to one/.test(rule.value.toLowerCase())) {
      issues.push(`${COMMON_MISTAKES.poorRiskReward.fix}. ${COMMON_MISTAKES.poorRiskReward.math}`);
    }
  }
  
  // Check for "mental stops"
  const stopRules = rules.filter(r => r.label.toLowerCase().includes('stop'));
  for (const rule of stopRules) {
    if (/mental|depends|figure it out|decide later/.test(rule.value.toLowerCase())) {
      issues.push(`"Mental stops don't count" - CME Group. Define exact placement.`);
    }
  }
  
  return issues;
}

// ============================================================================
// CONTEXTUAL PROMPT GENERATION
// ============================================================================

/**
 * Generate phase-specific guidance for Claude
 */
export function generateContextualPrompt(context: ConversationContext): string {
  const { phase, lastUserMessage, missingComponents, rules } = context;
  
  switch (phase) {
    case 'initial':
      return generateInitialPrompt();
      
    case 'entry_definition':
      return generateEntryPrompt(lastUserMessage);
      
    case 'stop_definition':
      return generateStopPrompt(rules);
      
    case 'target_definition':
      return generateTargetPrompt(rules);
      
    case 'sizing_definition':
      return generateSizingPrompt();
      
    case 'refinement':
      return generateRefinementPrompt(missingComponents);
      
    case 'complete':
      return generateCompletionPrompt(rules);
      
    default:
      return generateGeneralPrompt();
  }
}

// ============================================================================
// PHASE-SPECIFIC PROMPTS
// ============================================================================

function generateInitialPrompt(): string {
  return `
# STRATEGY DISCOVERY PHASE

You're at the beginning of building a professional trading strategy. Your goal: understand the user's trading approach through Socratic questioning.

## Opening Questions (Choose ONE based on user's message):

If user is vague:
"What instrument are you interested in trading? ES, NQ, or something else?"

If user mentioned instrument but not strategy:
"What kind of setups do you look for? For example:
• Breakouts (price exceeding key levels)
• Pullbacks (retracements in a trend)
• Reversals (trend change anticipation)
• Opening range setups"

If user described a pattern:
"Great! Let's build this properly. Help me understand: what tells you it's time to enter?"

## Critical Rules:
- Ask ONE question at a time
- Don't assume anything about their approach
- Listen for their natural terminology, then translate to professional standards
- Get them talking about what they actually DO, not what they think they should say

## Entry Type Detection:
${JSON.stringify(Object.keys(ENTRY_TAXONOMY), null, 2)}

Once you detect their entry type, reference the specific taxonomy to guide questions.
  `.trim();
}

function generateEntryPrompt(lastMessage: string): string {
  const entryType = detectEntryType(lastMessage);
  
  const taxonomy = entryType ? ENTRY_TAXONOMY[entryType] : null;
  
  return `
# ENTRY CRITERIA DEFINITION PHASE

User is defining their entry rules. Your job: get SPECIFIC, MEASURABLE conditions.

${taxonomy ? `
## Detected Entry Type: ${taxonomy.name}

${taxonomy.description}

**Subtypes:**
${JSON.stringify('subtypes' in taxonomy ? taxonomy.subtypes : {}, null, 2)}

${'commonMistakes' in taxonomy && taxonomy.commonMistakes ? `**Common Mistakes:**
${(taxonomy.commonMistakes as readonly string[]).map((m: string) => `• ${m}`).join('\n')}` : ''}

**What to clarify:**
${entryType === 'breakout' ? `
1. Immediate breakout or wait for confirmation?
2. Volume requirement?
3. Which timeframe are they watching?
4. Is there a retest opportunity they consider?
` : entryType === 'pullback' ? `
1. What defines the "pullback" level? (Fib, MA, structure)
2. Do they wait for price to touch or just approach?
3. What confirms the bounce?
4. Trend filter on higher timeframe?
` : entryType === 'timeBased' ? `
1. Which range period? (5-min, 15-min, 30-min, first hour)
2. Break above AND below, or directional bias?
3. Entry on break or confirmation close?
4. What time do they stop taking ORB trades?
` : ''}
` : ''}

## Questions to Ask (ONE at a time):

If they said "breakout":
"Breakout of what specifically? The 15-minute high, a trend line, a chart pattern?"

If they said "pullback":
"Pullback to what level? A moving average, a Fibonacci retracement, previous structure?"

If they're vague ("when it looks good"):
"I want to help you make this precise. What does 'looks good' mean? Is it a specific price level, an indicator reading, a candle pattern?"

## What You're Building Toward:

${COMMON_MISTAKES.vagueEntries.fix}

## Example of Complete Entry:
"Enter long on break above 15-minute high, confirmed by close above with volume >1.5x average, during RTH session only"

That's SPECIFIC, MEASURABLE, ACTIONABLE.
  `.trim();
}

function generateStopPrompt(rules: StrategyRule[]): string {
  const entryRules = rules.filter(r => r.category === 'entry');
  const entryType = entryRules.length > 0 ? detectEntryType(entryRules[0].value) : null;
  
  return `
# STOP-LOSS DEFINITION PHASE

CRITICAL: This is where most traders fail. No vagueness allowed.

## Professional Stop-Loss Taxonomy:

${JSON.stringify(EXIT_TAXONOMY.stopLoss.types, null, 2)}

## Based on Their Entry (${entryType || 'unknown'}):

${entryType === 'breakout' || entryType === 'timeBased' ? `
**Most Common for Breakouts/ORB:**
• Opposite side of range (conservative)
• 50% of range (moderate)
• 2 ticks below range low (tight)

**Question to ask:**
"Where will your stop loss be? Most ORB traders use either the range low, or 50% of the range. What's your approach?"
` : entryType === 'pullback' ? `
**Most Common for Pullbacks:**
• Below swing low (structure-based)
• 1.5-2x ATR (volatility-based)
• Fixed distance (5-10 ticks)

**Question to ask:**
"Where will you place your stop? Below the swing low, or a fixed distance like 2x ATR?"
` : `
**Common Approaches:**
• Fixed: "10 ticks" or "8 points"
• ATR: "2x ATR" (adapts to volatility)
• Structure: "below swing low + 2 ticks"

**Question to ask:**
"Where will your stop loss be? Below a specific level, or a fixed distance from entry?"
`}

## CRITICAL RULES:

${EXIT_TAXONOMY.stopLoss.criticalRule}

## Red Flags to Challenge:

${COMMON_MISTAKES.noStopLoss.bad.map(b => `❌ "${b}"`).join('\n')}

If user says any of these, respond:
"I understand the flexibility, but professional traders define their stops before entry. Even if it varies, what's the RULE? For example: '2 ticks below entry' or '50% of the range' or '1.5x ATR'."

## Example of Complete Stop:

"Stop loss at 50% of the opening range. If range is 20 ticks, stop is 10 ticks from entry."

That's SPECIFIC. User and system both know EXACTLY where stop goes.
  `.trim();
}

function generateTargetPrompt(rules: StrategyRule[]): string {
  const stopRule = rules.find(r => r.label.toLowerCase().includes('stop'));
  
  return `
# PROFIT TARGET DEFINITION PHASE

Professional standard: EVERY strategy needs a defined target.

## Professional Target Taxonomy:

${JSON.stringify(EXIT_TAXONOMY.profitTarget.types, null, 2)}

## Industry Standard: R-Multiple (Recommended)

**What is R?**
R = Your initial risk (distance from entry to stop)

**Standard Targets:**
• 1.5R - Minimum viable (requires 40% win rate)
• 2R - Industry standard (requires 33.3% win rate) ⭐
• 3R - Aggressive (requires 25% win rate)

**Breakeven Win Rates:**
${Object.entries(EXIT_TAXONOMY.profitTarget.types.rMultiple.breakeven).map(([rr, wr]) => 
  `• ${rr}: ${wr}`
).join('\n')}

${stopRule ? `
## Based on Their Stop:

Stop defined: "${stopRule.value}"

**Suggested question:**
"What's your profit target? Many traders use a 1:2 risk-reward ratio, meaning if your stop is ${stopRule.value}, your target would be twice that distance. What's your approach?"
` : ''}

## Questions to Ask (ONE at a time):

If they say "2:1" or "1:2":
"Perfect! Just to confirm: you're targeting 2x your risk distance. So if your risk is 10 ticks, your target is 20 ticks?"

If they say "fixed target":
"What's the target in points/ticks? And how does that compare to your stop distance?"

If they say "I let it run":
"I understand wanting to catch big moves. But we need a rule for when to exit. Do you trail a stop, use a time-based exit, or have a specific target level?"

## Red Flag:

${COMMON_MISTAKES.poorRiskReward.bad.map(b => `❌ "${b}"`).join('\n')}

If 1:1, explain:
"${COMMON_MISTAKES.poorRiskReward.fix}. ${COMMON_MISTAKES.poorRiskReward.math}"

## Example of Complete Target:

"Target at 2R. If my stop is 10 points, my target is 20 points profit."

Or:

"Exit 50% at 1.5R, trail remaining 50% with 2x ATR trailing stop."
  `.trim();
}

function generateSizingPrompt(): string {
  return `
# POSITION SIZING DEFINITION PHASE

This is where 91% of performance variability comes from (Van Tharp research).

## Professional Position Sizing Taxonomy:

${JSON.stringify(POSITION_SIZING_METHODS, null, 2)}

## CRITICAL: Risk Percentage Method (Standard)

**Formula:**
\`\`\`
Position Size = (Account × Risk%) / (Stop Distance × Point Value)
\`\`\`

**Example:**
Account: $50,000
Risk: 1% ($500)
Stop: 10 ES points (10 × $50 = $500 per contract)
Size: $500 / $500 = 1 contract

## Industry Standards:

• **Standard risk:** 1-2% per trade
• **Maximum safe:** 2% per trade
• **Danger zone:** 3%+ per trade
• **"Financial suicide":** >3% (Van Tharp)

${COMMON_MISTAKES.excessiveRisk.fix}

## Questions to Ask (ONE at a time):

If they say "2 contracts":
"Got it. And what percentage of your account does that represent in risk? For example, if your stop is hit, what % of your account do you lose?"

If they say "1%":
"Perfect! So 1% risk per trade. That means if you have a $50K account, you're risking $500 per trade. Based on your stop distance, we can calculate exact contract size. What's your account size?"

If they say "depends on the setup":
"I understand high-conviction trades feel different. But we need a RULE. Even if it's '1% normally, 1.5% on high confidence' - what's the framework?"

## Red Flags:

${COMMON_MISTAKES.fixedSizingWithoutRisk.bad.map(b => `❌ "${b}"`).join('\n')}

## Example of Complete Sizing:

"Position sizing: 1% risk per trade. On a $50K account, risking $500. With a 10-point stop on ES ($50/point), that's $500 risk per contract = 1 contract."

Or simpler:

"Risk 1% per trade, calculated from stop distance."
  `.trim();
}

function generateRefinementPrompt(missingComponents: string[]): string {
  return `
# STRATEGY REFINEMENT PHASE

Core components defined. Now adding professional polish.

## Recommended (but not required) Components:

${missingComponents.length > 0 ? `
### Still Missing:
${missingComponents.map(c => `• ${c}`).join('\n')}
` : ''}

### Professional Additions:

**Timeframe Specification:**
• Execution timeframe (where you place orders)
• Confirmation timeframe (higher TF validation)
• Example: "5-min for entry, 15-min for trend confirmation"

**Trading Session:**
• RTH (Regular Trading Hours: 9:30 AM - 4:00 PM ET)
• Globex (overnight session)
• Specific hours ("first 2 hours only")
• Example: "Trade during RTH only, avoid first 15 minutes"

**Filters:**
• Trend alignment (only trade with higher TF trend)
• Volume requirements
• Indicator confirmations
• Example: "Only take longs when price is above 200 SMA on daily"

**Trade Management:**
• Breakeven rules ("move stop to BE at 1R")
• Scaling out ("exit 50% at 1R, trail rest")
• Adding to winners ("add 1 contract at 1R if trending")

## Questions for Refinement:

"Your strategy is complete and ready to backtest. Want to add any filters or conditions? For example:
• Specific trading hours?
• Trend filter on higher timeframe?
• Volume requirements?"

Keep it optional. Don't force.
  `.trim();
}

function generateCompletionPrompt(rules: StrategyRule[]): string {
  return `
# STRATEGY COMPLETE! 🎉

The user has defined all 5 required components. Time to validate and summarize.

## Validation Checklist:

✅ Entry criteria: Specific and measurable
✅ Stop-loss: Exact placement defined
✅ Profit target: Clear methodology
✅ Position sizing: Risk-based formula
✅ Instrument: Specified

## What to Do Now:

1. **Summarize the strategy** in professional format
2. **Confirm understanding**: "Does this accurately capture your approach?"
3. **Validate against prop firm standards**:
   ${Object.entries(PROP_FIRM_STANDARDS).map(([firm, firmRules]) => 
     `• ${firm}: Daily loss ${firmRules.dailyLoss || 'none'}, Drawdown: ${firmRules.drawdownType}`
   ).join('\n   ')}
4. **Suggest next steps**: Backtesting, paper trading, etc.

## Professional Summary Template:

\`\`\`
STRATEGY: [Name based on user's description]
TYPE: [Breakout/Pullback/Reversal/etc.]
INSTRUMENT: [ES/NQ/etc.]

ENTRY:
• [Specific trigger]
• [Timeframe]
• [Confirmation if any]

EXIT:
• Stop-Loss: [Exact placement]
• Profit Target: [Method and level]

POSITION SIZING:
• [Method]
• [Risk %]

RULES CAPTURED: ${rules.length}

STATUS: ✅ Complete and ready for backtesting
\`\`\`

## Offer to Generate:

1. Backtest parameters
2. Trading plan document
3. Risk management checklist
4. Next steps guidance
  `.trim();
}

function generateGeneralPrompt(): string {
  return `
# GENERAL STRATEGY BUILDING GUIDANCE

Use Socratic method. ONE question at a time. Guide, don't lecture.

When user is vague → Ask for specifics
When user is specific → Confirm understanding
When complete → Validate and summarize
  `.trim();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get relevant examples based on what user is defining
 */
export function getRelevantExamples(focus: string, entryType?: string): string[] {
  if (focus === 'entry' && entryType) {
    const taxonomy = ENTRY_TAXONOMY[entryType as keyof typeof ENTRY_TAXONOMY];
    if (taxonomy && 'example' in taxonomy) {
      return [taxonomy.example as string];
    }
    if (taxonomy && 'subtypes' in taxonomy) {
      const subtypes = taxonomy.subtypes as Record<string, { example?: string }>;
      return Object.values(subtypes)
        .map((st) => st.example)
        .filter((ex): ex is string => Boolean(ex));
    }
  }
  
  if (focus === 'stop') {
    const examples: string[] = [];
    for (const stopType of Object.values(EXIT_TAXONOMY.stopLoss.types)) {
      if (stopType.example) {
        examples.push(stopType.example);
      }
    }
    return examples;
  }
  
  if (focus === 'target') {
    const examples: string[] = [];
    for (const targetType of Object.values(EXIT_TAXONOMY.profitTarget.types)) {
      if ('example' in targetType && typeof targetType.example === 'string') {
        examples.push(targetType.example);
      }
    }
    return examples;
  }
  
  return [];
}

/**
 * Get calculation help based on what user is defining
 */
export function getCalculationHelp(rules: StrategyRule[]): string {
  const stopRule = rules.find(r => r.label.toLowerCase().includes('stop'));
  const sizeRule = rules.find(r => 
    r.label.toLowerCase().includes('size') || 
    (r.label.toLowerCase().includes('risk') && r.value.includes('%'))
  );
  
  if (stopRule && sizeRule) {
    return `
## Quick Calculation:

If account = $50,000
Risk = 1% = $500
Stop = 10 points on ES ($50/point = $500 per contract)

Position Size = $500 / $500 = 1 contract
    `.trim();
  }
  
  if (stopRule) {
    return `
## Stop Distance to Risk:

Your stop: ${stopRule.value}

For ES: 1 point = $50
For NQ: 1 point = $20
For MES: 1 point = $5
    `.trim();
  }
  
  return '';
}
