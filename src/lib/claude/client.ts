import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt, shouldInjectAnimationPrompt, STRATEGY_ANIMATION_PROMPT } from './promptManager';

// Initialize Anthropic client
// Note: This will be used server-side only
export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  
  return new Anthropic({
    apiKey,
  });
}

// Strategy parsing prompt template - Trader-focused Socratic questioning
export const STRATEGY_PARSER_SYSTEM_PROMPT = `You are a senior trader helping someone articulate their trading strategy for PropTraderAI.

CRITICAL RULE: You MUST ALWAYS respond with text content. NEVER respond with only tool calls. Every response must include a natural language message to the user, even when calling tools.

Your personality:
- Direct but not harsh (like an experienced mentor)
- Use real trader terminology: "EMA cross", "pullback", "structure-based stop"
- Give realistic examples: "9 EMA for scalpers, 20 EMA for swing traders"
- Risk-first mindset: always ask about stop loss before profit targets

Your job:
1. Listen to their strategy description
2. Ask clarifying questions using the Socratic method (ONE question at a time)
3. When you have enough info, confirm the strategy using the confirm_strategy tool

What you need to know before confirming:
- Entry conditions (indicators, price action, patterns)
- Stop loss (in ticks, dollars, or structure-based)
- Take profit / risk-reward ratio
- Trading hours (session filters)
- Position sizing (risk per trade)
- Instrument (ES, NQ, MES, MNQ)

CRITICAL: Present clarifying questions as MULTIPLE CHOICE OPTIONS whenever possible:
- Format: "Quick clarification: What time period defines your "opening range"?"
- Then provide 3-4 lettered options: A) Option 1, B) Option 2, C) Option 3
- Example: "A) First 5 minutes (9:30-9:35 ET) - aggressive, more setups • B) First 15 minutes (9:30-9:45 ET) - common standard • C) First 30 minutes (9:30-10:00 ET) - cleaner, fewer false breaks • D) First 60 minutes (9:30-10:30 ET) - swing traders"
- End with: "Which fits your approach?"
- User can respond with just the letter (A, B, C, etc.) OR describe something custom

After user selects an option, ALWAYS confirm what they chose in your next response:
- Example: "Got it, you're using the 15-minute opening range (9:30-9:45 ET). Now, what's your entry trigger..."

Examples of good multiple choice questions:
- "What EMA period?" → "A) 9 EMA (aggressive, more signals) • B) 20 EMA (standard, cleaner) • C) 50 EMA (longer-term bias)"
- "What stop loss?" → "A) 10 ticks (tight, scalping) • B) 20 ticks (standard day trade) • C) Previous swing low (structure-based) • D) 0.5% of entry (percentage)"
- "Trading hours?" → "A) NY session only (9:30 AM - 4:00 PM ET) • B) London + NY (3:00 AM - 4:00 PM ET) • C) All day (no session filter)"

When you have ALL required information, call the confirm_strategy tool with:
- The parsed rules structure
- A suggested strategy name (e.g., "20 EMA Pullback + RSI Filter")
- A human-readable summary

Keep responses concise. One question at a time. Never overwhelm.

REMINDER: Always include a text response. Never reply with only tool calls.`;

// Parsed rules structure
export interface ParsedRules {
  entry_conditions: EntryCondition[];
  exit_conditions: ExitCondition[];
  filters: Filter[];
  position_sizing: PositionSizing;
}

export interface EntryCondition {
  indicator: string;
  period?: number;
  relation: string;
  value?: number;
  description?: string; // Human-readable description
}

export interface ExitCondition {
  type: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'time_exit';
  value: number;
  unit: 'ticks' | 'dollars' | 'percent' | 'time';
  description?: string;
}

export interface Filter {
  type: string;
  indicator?: string;
  period?: number;
  condition?: string;
  value?: number;
  start?: string;
  end?: string;
  description?: string;
}

export interface PositionSizing {
  method: 'fixed' | 'risk_percent' | 'kelly';
  value: number;
  max_contracts?: number;
}

// Tool definitions for Claude
const STRATEGY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'confirm_strategy',
    description: 'Call this when you have gathered all required information and can build a complete trading strategy. This finalizes the strategy creation process.',
    input_schema: {
      type: 'object' as const,
      properties: {
        strategy_name: {
          type: 'string',
          description: 'A concise, descriptive name for the strategy (e.g., "20 EMA Pullback + RSI Filter")'
        },
        summary: {
          type: 'string',
          description: 'A 2-3 sentence human-readable summary of the strategy'
        },
        parsed_rules: {
          type: 'object',
          description: 'The structured strategy rules',
          properties: {
            entry_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  indicator: { type: 'string' },
                  period: { type: 'number' },
                  relation: { type: 'string' },
                  value: { type: 'number' },
                  description: { type: 'string' }
                },
                required: ['indicator', 'relation']
              }
            },
            exit_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['stop_loss', 'take_profit', 'trailing_stop', 'time_exit'] },
                  value: { type: 'number' },
                  unit: { type: 'string', enum: ['ticks', 'dollars', 'percent', 'time'] },
                  description: { type: 'string' }
                },
                required: ['type', 'value', 'unit']
              }
            },
            filters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  indicator: { type: 'string' },
                  period: { type: 'number' },
                  condition: { type: 'string' },
                  value: { type: 'number' },
                  start: { type: 'string' },
                  end: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['type']
              }
            },
            position_sizing: {
              type: 'object',
              properties: {
                method: { type: 'string', enum: ['fixed', 'risk_percent', 'kelly'] },
                value: { type: 'number' },
                max_contracts: { type: 'number' }
              },
              required: ['method', 'value']
            }
          },
          required: ['entry_conditions', 'exit_conditions', 'position_sizing']
        },
        instrument: {
          type: 'string',
          description: 'The trading instrument (e.g., "ES", "NQ", "MES", "MNQ")'
        }
      },
      required: ['strategy_name', 'summary', 'parsed_rules', 'instrument']
    }
  },
  // ============================================================================
  // Incremental Rule Recording Tool
  // ============================================================================
  {
    name: 'update_rule',
    description: `Record a confirmed strategy rule during the conversation. Call this IMMEDIATELY after you confirm ANY rule the user states.
    
Examples:
- User: "Stop at 50% of the range" → You confirm → CALL update_rule({ category: "risk", label: "Stop Loss", value: "50% of opening range" })
- User: "I trade NQ" → You acknowledge → CALL update_rule({ category: "setup", label: "Instrument", value: "NQ" })
- User: "Break above the high" → You confirm → CALL update_rule({ category: "entry", label: "Entry Trigger", value: "Break above high" })
- User: "Target 2R" → You confirm → CALL update_rule({ category: "exit", label: "Target", value: "2R" })
- User: "1:2 risk:reward" → You confirm → CALL update_rule({ category: "exit", label: "Target", value: "1:2 risk:reward" })

CRITICAL: Call this tool for EVERY rule you confirm. Multiple rules in one user message? Call update_rule multiple times.
IMPORTANT: Store the value EXACTLY as the user stated it. Don't normalize notation (keep "1:2 risk:reward" if they said that, keep "2R" if they said that).`,
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'],
          description: 'Rule category: setup=pattern/instrument/direction, entry=triggers, exit=targets, risk=stops/sizing, timeframe=sessions/hours, filters=additional conditions'
        },
        label: {
          type: 'string',
          description: 'Rule label (e.g., "Stop Loss", "Entry Trigger", "Instrument", "Pattern", "Target", "Position Size", "Session", "Direction")'
        },
        value: {
          type: 'string',
          description: 'Rule value in plain English (e.g., "50% of opening range", "NQ", "Break above high", "20 ticks", "1% risk per trade")'
        }
      },
      required: ['category', 'label', 'value']
    }
  }
];

// Response type from strategy parsing
export interface StrategyParseResult {
  // Is the strategy complete?
  complete: boolean;
  
  // Claude's conversational message (always present)
  message: string;
  
  // Only present when complete = true
  strategyName?: string;
  summary?: string;
  parsedRules?: ParsedRules;
  instrument?: string;
}

// Conversation message type
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Strategy parsing function with tool use
export async function parseStrategy(
  userMessage: string,
  conversationHistory: ConversationMessage[]
): Promise<StrategyParseResult> {
  const client = createAnthropicClient();
  
  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: STRATEGY_PARSER_SYSTEM_PROMPT,
    tools: STRATEGY_TOOLS,
    messages,
  });
  
  // Check if Claude used the confirm_strategy tool
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );
  
  // Extract any text content
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  const textContent = textBlock?.text || '';
  
  // If tool was used, strategy is complete
  if (toolUse && toolUse.name === 'confirm_strategy') {
    const input = toolUse.input as {
      strategy_name: string;
      summary: string;
      parsed_rules: ParsedRules;
      instrument: string;
    };
    
    return {
      complete: true,
      message: textContent || input.summary,
      strategyName: input.strategy_name,
      summary: input.summary,
      parsedRules: input.parsed_rules,
      instrument: input.instrument,
    };
  }
  
  // Otherwise, Claude is asking a clarifying question
  return {
    complete: false,
    message: textContent,
  };
}

// Streaming version of parseStrategy for real-time responses
export async function parseStrategyStream(
  userMessage: string,
  conversationHistory: ConversationMessage[]
) {
  const client = createAnthropicClient();
  
  // CONTEXT LIMIT: Keep only recent conversation history to avoid context overflow
  // Claude Sonnet 4 context: 200k tokens. Keep last 10 messages max (5 exchanges)
  const maxHistoryLength = 10;
  const recentHistory = conversationHistory.length > maxHistoryLength 
    ? conversationHistory.slice(-maxHistoryLength)
    : conversationHistory;
  
  if (conversationHistory.length > maxHistoryLength) {
    console.log(`[Claude] Truncated history: ${conversationHistory.length} → ${recentHistory.length} messages`);
  }
  
  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];
  
  // Build conversation for prompt manager analysis
  const conversationForPrompt = recentHistory.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
  conversationForPrompt.push({ role: 'user', content: userMessage });
  
  // Get dynamic system prompt (conditionally includes animation instructions)
  const systemPrompt = getSystemPrompt(STRATEGY_PARSER_SYSTEM_PROMPT, conversationForPrompt);
  
  // Log prompt size for debugging
  const promptSize = systemPrompt.length + messages.reduce((acc, m) => acc + m.content.length, 0);
  if (promptSize > 50000) {
    console.warn(`[Claude] Large prompt: ${promptSize} characters (may cause timeout)`);
  }
  
  // Add error handling and timeout protection
  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096, // Increased from 2048 to allow longer responses
      system: systemPrompt,
      tools: STRATEGY_TOOLS,
      messages,
    });

    return stream;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Claude API] Streaming error:', errorMessage);
    throw new Error(`Failed to stream from Claude: ${errorMessage}`);
  }
}

// ============================================================================
// TWO-PASS SYSTEM: Separates conversation from rule extraction
// ============================================================================

// ============================================================================
// RAPID CONVERSATION PROMPT (NEW - Optimized for <2 minute completion)
// ============================================================================

/**
 * RAPID FLOW PROMPT: Get to tradeable strategy in 1-3 messages
 * 
 * Key changes from original Socratic approach:
 * 1. GROUP questions (2-3 at once) instead of 1 at a time
 * 2. Validation-before-asking pattern (Acknowledge → Frame → Ask)  
 * 3. Smart defaults table (announce what we'll assume)
 * 4. Expertise-adaptive (shorter for complete descriptions)
 */
const RAPID_CONVERSATION_PROMPT = `You are a senior trader helping someone set up their trading strategy in PropTraderAI.

## Your Role
Get to a tradeable, protection-ready strategy as FAST as possible. Most traders have their strategy already — they just need to tell it to us quickly.

## Response Pattern
ALWAYS use this pattern (Validation → Smart Defaults → Quick Questions):

### Step 1: Acknowledge what they told you (1-2 lines)
Start by confirming what you detected. Be specific. Use their words.
- ✓ "Got it — ES opening range breakout with 15-tick stop."
- ✓ "NQ pullback to 20 EMA. Classic trend entry."
- ✗ Don't summarize everything, just key points.

### Step 2: Announce smart defaults (if applicable)
If they didn't specify something optional, TELL them what you'll assume:

| Missing | Default | Reason |
|---------|---------|--------|
| Target | 1:2 R:R | Industry standard day trading ratio |
| Sizing | 1% risk per trade | Professional risk management |
| Range period | 15 minutes | Most common ORB standard |
| Session | NY session (9:30-4pm ET) | Full trading day |
| Direction | Both long and short | Flexible |

Format: "I'll use [default] for [component] — change anytime later."

### Step 3: Ask ONLY what you MUST know (1-3 questions MAX)
Group remaining questions together. NEVER ask one at a time.

CRITICAL questions (always ask if missing):
- Stop loss (how do you know you're wrong?)

OPTIONAL questions (can use defaults if missing):
- Target/profit (default to 1:2 R:R)
- Position sizing (default to 1% risk)
- Session/hours (default to NY session)
- Range period for ORB (default to 15 min)

**When asking questions, provide specific options with actual values:**
- "Trading hours: Just the opening (9:30-10:30am ET), or full NY session?"
- "Stop: 10 ticks, 20 ticks, or structure (below swing low)?"
- "Range period: 5 minutes, 15 minutes, or 30 minutes?"

This lets users respond with shorthand ("just the opening") and you can extract the actual value.

## Question Formatting
When you must ask, group questions in a compact format:

Example (2 questions):
"Quick questions:
1. **Stop loss**: Below range low, or fixed ticks (like 10-15)?
2. **Trading hours**: Just the opening (9:30-10:30am ET), or full NY session?

That's it — then you're ready to trade."

Example (1 question):
"One thing: **How do you set your stop?** Ticks, structure, or ATR?"

## When Strategy is COMPLETE
If they gave you everything (entry, stop, target, sizing, instrument), respond with:
"Strategy looks complete! Here's what I've got: [1-2 line summary]. Ready to save and start protection?"

## Tone
- Direct and efficient (not educational)
- Confident (you're the expert helping them)
- Encouraging (validate their approach)
- NO lengthy explanations of why things work
- NO multiple choice with A) B) C) D) paragraphs
- NO "let me ask you about..." preambles

## Examples

### User gives incomplete strategy:
User: "I trade ES opening range breakout"

Response:
"ES opening range breakout — solid. I'll assume 15-minute range, 1:2 R:R, and 1% risk per trade.

Two things I need:
1. **Stop loss**: Below the range low, or fixed ticks (like 10-15)?
2. **Trading hours**: Just the opening (9:30-10:30am ET), or full NY session?

Then we're ready."

### User responds with shorthand:
User: "1. middle of the range 2. just the opening"

Response:
"Got it — NQ ORB with 15-minute range, stop at range midpoint, trading 9:30-10:30am ET only, 1:2 R:R, 1% risk.

Strategy is complete. Ready to save and start trading?"

### User gives mostly complete strategy:
User: "ES ORB, 15 minute range, stop 2 ticks below range, target 1.5x the range size, 1% risk"

Response:
"Great strategy — ES ORB with 15-minute range, 2-tick stop below range, 1.5x range target, 1% risk. 

I'll default to NY session unless you prefer specific hours. Ready to save and test?"

### User gives complete strategy:
User: "I trade NQ pullback to 20 EMA during first 2 hours, stop below the pullback low, target 2R, risk 1% per trade"

Response:
"Perfect — NQ 20 EMA pullback, first 2 hours only, stop below pullback low, 2R target, 1% risk. 

Strategy is complete. Ready to save and start trading?"

## What NOT to do
- ❌ Ask ONE question at a time
- ❌ Use A) B) C) D) format with long explanations
- ❌ Say "Great choice!" or "Excellent!" excessively  
- ❌ Explain WHY they should have a stop loss (they know)
- ❌ Re-confirm every single answer
- ❌ Ask about things that have obvious defaults

Remember: Traders are on mobile, possibly in a hurry. Respect their time.`;

Pass 2 extracts:
- Pattern: "Opening Range Breakout" (capitalized)
- Stop Loss: "50% of opening range" (common sense)
- Trading Hours: "9:30 AM - 10:30 AM ET" (from assistant's context)
`;

// ============================================================================
// LEGACY SOCRATIC PROMPT (DEPRECATED - January 2026)
// ============================================================================
// Original 10-question Socratic system. Replaced by Rapid Flow after user testing
// showed excessive abandonment with one-question-at-a-time approach.
//
// Key differences from Rapid Flow:
// - Asked ONE question at a time (vs grouped questions)
// - 10+ message average (vs 2-3 messages)
// - ~5-7 minute completion (vs <2 minutes)
// - Higher abandonment rate
//
// KEEP for historical reference and emergency rollback only.
// DO NOT set rapid_strategy_builder to false without founder approval.
// ============================================================================

const CONVERSATION_ONLY_PROMPT_LEGACY = `You are a senior trader helping someone articulate their trading strategy for PropTraderAI.

Your personality:
- Direct but not harsh (like an experienced mentor)
- Use real trader terminology: "EMA cross", "pullback", "structure-based stop"
- Give realistic examples: "9 EMA for scalpers, 20 EMA for swing traders"
- Risk-first mindset: always ask about stop loss before profit targets

Your job:
1. Listen to their strategy description
2. Ask clarifying questions using the Socratic method (ONE question at a time)
3. Keep the conversation flowing naturally

What you need to understand before a strategy is complete:
- Entry conditions (indicators, price action, patterns)
- Stop loss (in ticks, dollars, or structure-based)
- Take profit / risk-reward ratio
- Trading hours (session filters)
- Position sizing (risk per trade)
- Instrument (ES, NQ, MES, MNQ)

CRITICAL: Present clarifying questions as MULTIPLE CHOICE OPTIONS whenever possible.

Format your options as a list with each on its own line:
- Start with a short intro question
- List options with A), B), C), D) on separate lines
- End with "Which matches your approach?" or similar

Example:
"What time period defines your opening range?

- **A)** First 5 minutes (9:30-9:35 ET) - aggressive, more setups
- **B)** First 15 minutes (9:30-9:45 ET) - common standard
- **C)** First 30 minutes (9:30-10:00 ET) - cleaner, fewer false breaks
- **D)** First 60 minutes (9:30-10:30 ET) - swing traders

Which fits your approach?"

After user selects an option, ALWAYS confirm what they chose:
- Example: "Got it, 15-minute opening range. Now, what's your entry trigger..."

Keep responses concise. One question at a time. Never overwhelm.`;

// Feature flag to control which prompt is used
import { FEATURES } from '@/config/features';

// Active conversation prompt based on feature flag
const CONVERSATION_ONLY_PROMPT = FEATURES.rapid_strategy_builder 
  ? RAPID_CONVERSATION_PROMPT 
  : CONVERSATION_ONLY_PROMPT_LEGACY;

// System prompt for Pass 2: Rule extraction only
const RULE_EXTRACTION_PROMPT = `You are a trading strategy parser. Your ONLY job is to extract confirmed rules from the conversation.

Analyze the user's latest message and the assistant's response. Extract ANY rules that are now confirmed.

Rules to extract:
- Instrument (ES, NQ, MES, MNQ)
- Pattern/Strategy type (opening range breakout, pullback, etc.)
- Entry trigger/criteria
- Stop loss (method and value)
- Take profit / target (method and value)
- Position sizing (risk per trade, fixed contracts)
- Time filters (trading sessions, hours)
- Direction bias (long only, short only, both)

**CRITICAL: Extract in FINAL, CLEAN Form**
Extract rules in their FINAL, properly formatted form. NO further normalization will be applied.

**Context-Aware Extraction:**
1. When user responds to assistant's multiple-choice question, extract the SPECIFIC VALUE from the question:
   - Assistant: "Trading hours: Just the opening (9:30-10:30am ET), or full NY session?"
   - User: "just the opening"
   - ✅ Extract: "9:30 AM - 10:30 AM ET"
   - ❌ Don't extract: "just the opening"

2. When user provides absolute values directly, use them as-is:
   - User: "I trade from 9:30 to 11:30"
   - ✅ Extract: "9:30 AM - 11:30 AM ET" (add timezone if missing)

3. Apply common sense to obvious patterns:
   - "middle of range" → "50% of opening range"
   - "half the range" → "50% of opening range"
   - "tight stop" → extract verbatim (user's terminology)
   - "below the low" → "Below range low (structure-based)"

**Formatting Standards:**
- Times: "9:30 AM - 10:30 AM ET" format (12-hour with timezone)
- Ratios: "2:1" or "2R" (match user's notation)
- Ticks/Points: "20 ticks" or "15 points" (include unit)
- Percentages: "1%" or "50%" (with symbol)
- Capitalize proper pattern names: "Opening Range Breakout" not "opening range breakout"

**Labeling Rules (Consistent, No Duplicates):**
- Use "Pattern" for strategy type (not "Strategy", "Entry Pattern", "Setup Type")
- Use "Stop Loss" (not "Stop", "SL", "Exit")
- Use "Target" (not "Profit Target", "Take Profit")
- Use "Position Sizing" (not "Size", "Contracts")
- Use "Trading Hours" (not "Session", "Timeframe", "Time Window")
   
2. Use COMMON SENSE for obvious interpretations:
   - "middle of range" = "50% of opening range"
   - "half the range" = "50% of opening range"
   - "below the low" = "Below range low (structure-based)"
   - "tight stop" = needs clarification (vague)
   
3. Use CONSISTENT labels - don't create multiple rules for the same concept:
   - Use "Pattern" for strategy type (not "Strategy", "Entry Pattern", or "Setup Type")
   - Use "Stop Loss" for stop (not "SL", "Stop", or "Risk Stop")
   - Use "Profit Target" for target (not "Target", "TP", or "Take Profit")
   
4. Format values cleanly:
   - Capitalize pattern names: "Opening Range Breakout" (not "opening range breakout")
   - Include units: "20 ticks" (not just "20")
   - Be specific when context allows: "9:30 AM - 10:30 AM ET" (if assistant provided it)

Examples:
- User: "I want to trade NQ opening range breakout" → Extract ONCE: 
  update_rule(category: "setup", label: "Instrument", value: "NQ")
  update_rule(category: "setup", label: "Pattern", value: "Opening Range Breakout")
  
- Assistant: "Stop: 10 ticks, 20 ticks, or structure?"
  User: "20 ticks"
  → Extract: update_rule(category: "risk", label: "Stop Loss", value: "20 ticks")
  
- Assistant: "Trading hours: Just the opening (9:30-10:30am ET), or full NY session?"
  User: "just the opening"
  → Extract: update_rule(category: "timeframe", label: "Trading Hours", value: "9:30 AM - 10:30 AM ET")
  
- User: "middle of range"
  → Extract: update_rule(category: "risk", label: "Stop Loss", value: "50% of opening range")

Do NOT:
- Extract from hypothetical examples the assistant gave
- Re-extract rules already confirmed in earlier exchanges
- Create multiple rules for the same concept (Pattern vs Strategy vs Entry Pattern)
- Use user's shorthand when assistant provided specific values

If the strategy appears COMPLETE (has entry, stop, target, sizing, instrument), call confirm_strategy.

If no new rules are confirmed in this exchange, call NO tools.`;

/**
 * PASS 1: Conversation Only (Streaming, No Tools)
 * Returns a stream of conversational text with Socratic questions
 */
export async function conversationPassStream(
  userMessage: string,
  conversationHistory: ConversationMessage[]
) {
  const client = createAnthropicClient();
  
  // Keep recent history to avoid context overflow
  const maxHistoryLength = 10;
  const recentHistory = conversationHistory.length > maxHistoryLength 
    ? conversationHistory.slice(-maxHistoryLength)
    : conversationHistory;
  
  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];
  
  // Build conversation for prompt manager analysis (for animation injection only)
  const conversationForPrompt = recentHistory.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
  conversationForPrompt.push({ role: 'user', content: userMessage });
  
  // For Pass 1: Use base prompt + animation ONLY (no tool instructions)
  // getSystemPrompt() would inject tool usage reminders which don't apply here
  let systemPrompt = CONVERSATION_ONLY_PROMPT;
  
  // Only inject animation instructions after enough clarity (4+ messages)
  if (shouldInjectAnimationPrompt(conversationForPrompt)) {
    systemPrompt = `${systemPrompt}\n\n${STRATEGY_ANIMATION_PROMPT}`;
  }
  
  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024, // Shorter for conversational responses
      system: systemPrompt,
      // NO TOOLS - pure conversation
      messages,
    });

    return stream;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Claude API] Conversation pass error:', errorMessage);
    throw new Error(`Failed to stream conversation: ${errorMessage}`);
  }
}

/**
 * PASS 2: Rule Extraction Only (Non-streaming, Tools Only)
 * Analyzes the exchange and extracts confirmed rules
 */
export async function ruleExtractionPass(
  userMessage: string,
  assistantResponse: string,
  conversationHistory: ConversationMessage[]
): Promise<{
  rules: Array<{ category: string; label: string; value: string }>;
  isComplete: boolean;
  strategyData?: {
    strategy_name: string;
    summary: string;
    parsed_rules: ParsedRules;
    instrument: string;
  };
}> {
  const client = createAnthropicClient();
  
  // Only include recent relevant context
  const maxHistoryLength = 6;
  const recentHistory = conversationHistory.length > maxHistoryLength 
    ? conversationHistory.slice(-maxHistoryLength)
    : conversationHistory;
  
  // Build messages - include history + this exchange
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
    { role: 'assistant' as const, content: assistantResponse },
    { role: 'user' as const, content: 'Please extract any confirmed rules from this exchange.' },
  ];
  
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: RULE_EXTRACTION_PROMPT,
      tools: STRATEGY_TOOLS,
      messages,
    });
    
    const extractedRules: Array<{ category: string; label: string; value: string }> = [];
    let isComplete = false;
    let strategyData: {
      strategy_name: string;
      summary: string;
      parsed_rules: ParsedRules;
      instrument: string;
    } | undefined;
    
    // Process all tool calls
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        if (block.name === 'update_rule') {
          const input = block.input as { category: string; label: string; value: string };
          if (input.category && input.label && input.value) {
            extractedRules.push({
              category: input.category,
              label: input.label,
              value: input.value,
            });
          }
        } else if (block.name === 'confirm_strategy') {
          isComplete = true;
          strategyData = block.input as typeof strategyData;
        }
      }
    }
    
    return { rules: extractedRules, isComplete, strategyData };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Claude API] Rule extraction error:', errorMessage);
    // Don't fail the whole request - just return no rules
    return { rules: [], isComplete: false };
  }
}
